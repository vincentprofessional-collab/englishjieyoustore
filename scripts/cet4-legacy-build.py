"""Classify historical CET-4 questions while preserving their actual response format."""
import argparse
import collections
import copy
import hashlib
import json
import re
import shutil
import subprocess
import unicodedata
from functools import lru_cache
from pathlib import Path

from cet4_source_common import CLEANUP_EDITS, CLEANUP_LOG, NORMALIZATION, SOURCE_ROOT, clean_text, option, paragraphs, plain_word_fields, source_ref

parser = argparse.ArgumentParser()
parser.add_argument('--cache', type=Path, required=True)
args = parser.parse_args()
inventory = json.loads((args.cache / 'legacy-source-inventory.json').read_text())
documents = {}
for item in inventory:
    document = {**item, **json.loads((args.cache / 'text' / f'{item["sha256"]}.json').read_text())}
    ocr_path = args.cache / 'ocr' / f'{item["sha256"]}.json'
    if ocr_path.exists():
        ocr = json.loads(ocr_path.read_text())
        # Geometry-only native caches are for PDF clipping. They must not
        # replace the layout-preserving text used to pair printed questions.
        if ocr.get('method') != 'pdf-native-text':
            document['text'] = '\n'.join(line['text'] for page in ocr['pages'] for line in page['lines'])
            document['method'] = 'pdf-ocr'
    document['text'] = plain_word_fields(unicodedata.normalize('NFKC', re.sub(r'[\x0c\u2028\u2029]', '\n', document['text']).replace('\r', '')))
    documents[item['source']] = document

DATE = re.compile(r'((?:19|20)\d{2})\s*[年.\-_]?\s*(1[012]|0?[1-9])(?!\d)\s*(?:月)?')
PART = re.compile(r'^\s*Part\s*([IVXⅠⅡⅢⅣⅤⅥ]+)\s*[:：.]?\s*((?:Listening|Listing|Reading|Vocabulary|Cloze|Close|Short\s+Answer|Writing|Translation|Error\s+Correction)[^\n]*)', re.I | re.M)
ANSWER = re.compile(r'^\s*(?:(?:(?:19|20)\d{2})[^\n]{0,110})?(?:四级)?\s*(?:参考范文|参考答案(?:及解析|与解析)?|答案完整版|答案及解析|答案解析|答案详解|答案与解析|参考答案和听力原文|Keys?\s*(?:to\s+.*)?|Answer\s+Keys?)\s*[:：]?[^\n]*$', re.I | re.M)
RECORD = re.compile(r'^\s*(S?\d{1,3})\s*[.．、)）]\s*([^\n]*)', re.I | re.M)
OPT = re.compile(r'(?<!\S)(?:[\[（(]\s*([A-O])\s*[\]）)]|([A-O])\s*[)）．.])\s*')
pending = []
selected = {}
extra_ocr = []
audio_assets = {}
audio_cleaning_path = args.cache/'audio-cleaning.json'
audio_cleaning = json.loads(audio_cleaning_path.read_text()) if audio_cleaning_path.exists() else {}
audio_files = [path for path in SOURCE_ROOT.rglob('*') if path.is_file() and not path.name.startswith('.') and path.suffix.lower() == '.mp3']


def canonical_date(source):
    matches = list(DATE.finditer(source))
    if not matches:
        return None
    # The closest dated filename is authoritative; dated parent folders are fallback.
    match = matches[-1]
    year, month = int(match[1]), int(match[2])
    if not 1990 <= year <= 2019:
        return None
    base = source.rsplit('/', 1)[-1]
    variant = re.search(r'(?:第\s*|[（(]?卷\s*)([123一二三])\s*(?:套|[）)])?', base)
    if not variant:
        variant = re.search(r'[（(]\s*(?:第\s*)?([123一二三])\s*(?:套)?\s*[）)]', base)
    number = {'一': 1, '二': 2, '三': 3}.get(variant[1], int(variant[1]) if variant and variant[1].isdigit() else 1) if variant else 1
    suffix = '-new' if re.search(r'新四级|新题型', source) else '-b' if re.search(r'B卷|试题B', source, re.I) else ''
    return f'{year}{month:02d}-{number}{suffix}'


def split_answers(text):
    text = re.sub(r'[\x0c\u2028\u2029]', '\n', text).replace('\r', '').replace('\x07', ' ')
    markers = [m for m in ANSWER.finditer(text) if m.start() > 500]
    markers.extend(m for m in re.finditer(r'^\s*(?:(?:19|20)\d{2}[^\n]{0,90})?答案\s*[:：]?\s*$', text, re.M) if m.start() > 500)
    # Co-document quick-reference tables can start without an answer heading.
    # Require several bare keys; an option followed by its English text is not a key.
    for line in re.finditer(r'^.*$', text, re.M):
        bare = re.findall(r'(?<!\w)(\d{1,3})\s*[.、:]\s*([A-O])(?=\s*(?:$|\d{1,3}\s*[.、:]))', line[0])
        if line.start() > 500 and len(bare) >= 4:
            markers.append(line)
            break
        selected_words = re.findall(r'\b\d{1,3}\s*[.]\s*[A-O][)）]\s*[A-Za-z]+', line[0])
        if line.start() > 500 and len(selected_words) >= 3:
            markers.append(line)
            break
    markers.sort(key=lambda match: match.start())
    if markers:
        marker = markers[0]
        return text[:marker.start()], text[marker.start():]
    return text, ''


@lru_cache(maxsize=128)
def answer_map(text):
    text = plain_word_fields(unicodedata.normalize('NFKC', text))
    result = {}
    conflicts = set()
    explicit_keys = set()
    def add(key, value, explicit=False):
        key = key.upper()
        value = value.strip()
        if explicit and key in result and key in explicit_keys and result[key] != value:
            conflicts.add(key)
        if not explicit and key in explicit_keys:
            return
        result[key] = value
        if explicit:
            explicit_keys.add(key)
    for line in text.splitlines():
        for match in re.finditer(r'(?<![A-Za-z0-9:：.])(S?\d{1,3})\s*[.．、:：)）]\s*([A-O])(?=\s*(?:$|(?:S?\d{1,3})\s*[.．、:]|[)）]?\s*[【\[]|[)）]\s*[\u4e00-\u9fff]))', line, re.I):
            add(match[1], match[2].upper(), True)
        for match in re.finditer(r'(\d{1,3})\s*[~～—–－-]\s*(\d{1,3})\s*[:：.]?\s*([A-O](?:\s*[A-O]){1,29})', line):
            first, last = int(match[1]), int(match[2]); letters = re.sub(r'\s+', '', match[3])
            if len(letters) == last - first + 1:
                for n, letter in zip(range(first, last+1), letters):
                    add(str(n), letter, True)
        match = re.match(r'^\s*(S?\d{1,3})\s*[.．、:：)）]\s*(.+?)\s*$', line, re.I)
        if match and match[1].upper() not in result:
            value = re.split(r'\s*。?\s*[【\[]',match[2].strip(),maxsplit=1)[0].rstrip('。').strip()
            if value and not re.search(r'【定位】|【解析】|【精析】|[_＿]{2,}|[?？]|^[A-O][)）]', value) and len(value) < 500:
                add(match[1], value)
    for number, content in records(text):
        key_content = re.split(r'【干扰项分析】',content,maxsplit=1)[0]
        explicit = re.findall(r'(?:[【\[](?:答案|精析|解析|详解)[】\]]|(?:正确)?答案\s*[为是:：])\s*([A-O])(?=[.、)）。\s\u4e00-\u9fff]|$)', key_content)
        explicit += re.findall(r'(?:^|\n)\s*([A-O])\s*[)）.。]*\s*[【\[](?:精析|详解|解析|译文|定位|解题)',key_content)
        correct_analysis=re.search(r'【正确项分析】([\s\S]*)',key_content)
        if correct_analysis:
            explicit += re.findall(r'(?<!不)(?:故(?:应)?|所以(?:应)?|因此(?:应)?|应(?:当|该)?|可(?:以)?)(?:选择|选)\s*([A-D])',correct_analysis[1])
        if explicit:
            for value in set(explicit):
                add(number, value, True)
            continue
        # Selected-answer lists commonly print "11. C) He ...". Exclude a
        # complete four-option question before interpreting that leading letter.
        option_labels={match[1]or match[2]for match in OPT.finditer(content)}
        contains_options=set('ABCD')<=option_labels
        selected_key = re.match(r'^\s*([A-O])(?:[.)）]\s*|\s+)(?=[A-Za-z])', content)
        if selected_key and not contains_options:
            add(number, selected_key[1], True)
        truth = re.fullmatch(r'\s*(Y|YES|N|NO|NG|NOT\s+GIVEN)\s*(?:[（(][^\n]*[）)])?\s*', content, re.I)
        if truth:
            value = re.sub(r'\s+', '', truth[1].upper())
            add(number, {'YES':'Y','NO':'N','NOTGIVEN':'NG'}.get(value,value), True)
    for key in conflicts:
        result.pop(key, None)
    return result, conflicts


def parts(text):
    matches = list(PART.finditer(text))
    result = []
    for i, match in enumerate(matches):
        title = match[2].strip()
        body = text[match.end():matches[i+1].start() if i+1 < len(matches) else len(text)]
        sections = list(re.finditer(r'^\s*Section\s+([ABC])\b[^\n]*$', body, re.I | re.M)) if re.search('Reading|Listening|Listing', title, re.I) else []
        if sections:
            for j, section in enumerate(sections):
                result.append((match[1]+section[1], title+' · Section '+section[1], body[section.end():sections[j+1].start() if j+1<len(sections) else len(body)]))
        else:
            result.append((match[1], title, body))
    return result


@lru_cache(maxsize=128)
def records(text):
    matches = list(RECORD.finditer(text))
    return [(m[1].upper(), text[m.start()+len(m[0])-len(m[2]):matches[i+1].start() if i+1<len(matches) else len(text)].strip()) for i,m in enumerate(matches)]


def explanation_for(number, answer, answer_text):
    for candidate_number, content in records(answer_text):
        if candidate_number != number:
            continue
        explicit = re.match(r'^\s*(?:【答案】\s*)?(?:[\[（(]\s*([A-O])\s*[\]）)]|([A-O])\s*[)）])', content)
        if explicit and (explicit[1] or explicit[2]) == answer and len(re.findall(r'[\u4e00-\u9fff]', content)) > 20:
            return paragraphs(content)
    return [{'type':'notice','tone':'info','text':'原资料提供标准答案，未附本题的详细解析。'}]


def parse_options(record):
    matches = list(OPT.finditer(record))
    if not matches:
        return record.strip(), []
    labels = [m[1] or m[2] for m in matches]
    if labels[:4] != list('ABCD') and set(labels) != set('ABCD'):
        return record.strip(), []
    options = [option(m[1] or m[2], record[m.end():matches[i+1].start() if i+1<len(matches) else len(record)].strip()) for i,m in enumerate(matches)]
    if len(options) != 4 or len(set(o['id'] for o in options)) != 4:
        return record.strip(), []
    return record[:matches[0].start()].strip(), sorted(options, key=lambda opt: opt['id'])


def family(title, text):
    joined = title.lower()
    if 'writ' in joined:
        return '写作'
    if 'translat' in joined:
        return '翻译'
    if 'vocab' in joined or 'correction' in joined:
        return '词汇与语法'
    if 'cloze' in joined or 'close' in joined:
        return '完形填空'
    if 'listen' in joined or 'listing' in joined:
        return '听力理解'
    if 'skimming' in joined or 'scanning' in joined:
        return '长篇阅读'
    return '仔细阅读'


def source_label(key):
    year, month = key[:4], int(key[4:6])
    return f'{year}年{month}月大学英语四级 · 第{key[7]}套' + ('（新题型）' if key.endswith('-new') else '（B卷）' if key.endswith('-b') else '')


def make_reference(prefix, number, prompt, reference, label, ref, kind='short_answer'):
    return {'id': f'{prefix}-q-{number}', 'displayNumber': int(re.sub(r'\D', '', str(number)) or '1'),
            'sourceQuestionNumber': int(re.sub(r'\D', '', str(number)) or '1'), 'sourceQuestionLabel': str(number),
            'type': kind, 'typeLabel': label, 'promptBlocks': paragraphs(prompt), 'placement': {'kind': 'standalone'},
            'options': [], 'blanks': [], 'answerSpec': {'availability': 'answered', 'gradingMode': 'manual', 'kind': 'reference', 'referenceAnswer': reference if isinstance(reference, list) else paragraphs(reference)},
            'explanationBlocks': [], 'sourceRefs': [ref], 'reviewStatus': 'approved'}


def listening_asset(key):
    key = key[:8] + ('-new' if '-new' in key else '-b' if key.endswith('-b') else '')
    if key in audio_assets:
        return audio_assets[key]
    ffprobe = shutil.which('ffprobe')
    if not ffprobe:
        audio_assets[key] = None
        return None
    candidates = [path for path in audio_files if canonical_date(str(path.relative_to(SOURCE_ROOT))) == key and not re.search(r'六级|CET[-_ ]?6', path.name, re.I)]
    for path in sorted(candidates, key=lambda p: p.stat().st_size, reverse=True):
        result = subprocess.run([ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(path)], capture_output=True, text=True)
        if result.returncode or float(result.stdout.strip() or '0') < 600:
            continue
        filename = f'cet4-legacy-{key}.mp3'
        destination = Path('public/cet4/audio') / filename
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        current_sha = hashlib.sha256(destination.read_bytes()).hexdigest() if destination.exists() else ''
        prior = audio_cleaning.get(f'/cet4/audio/{filename}')
        valid_cleaned = bool(prior and prior['sourceSha256']==sha and prior['sha256']==current_sha)
        if not valid_cleaned and current_sha != sha:
            shutil.copyfile(path, destination)
            current_sha=sha
        audio_assets[key] = {'assetId': f'cet4-legacy-{key}-audio', 'kind': 'audio', 'url': f'/cet4/audio/{filename}',
                             'mimeType': 'audio/mpeg', 'sha256': current_sha, 'sourceRefs': [source_ref(source_label(key) + '听力', sha, method='media-manifest')]}
        return audio_assets[key]
    audio_assets[key] = None
    return None


# The compilation has a large table of contents. Only actual body headings are split.
compilation = next(d for p,d in documents.items() if '89-07' in p)
text = '\n'.join(line for line in compilation['text'].splitlines() if 'PAGEREF' not in line)
headings = list(re.finditer(r'^\s*((?:19|20)\d{2})年(\d{1,2})月[^\n]{0,10}大学英语(?:新)?四级[^\n]*真题试卷[^\n]*$', text, re.M))
for i, heading in enumerate(headings):
    if not 1990 <= int(heading[1]) <= 2019:
        continue
    key = f'{heading[1]}{int(heading[2]):02d}-1' + ('-new' if '新四级' in heading[0] else '')
    chunk = text[heading.end():headings[i+1].start() if i+1<len(headings) else len(text)]
    selected[key] = {**compilation, 'text': chunk, 'selectionScore': 100, 'catalogKey': key}

for source, doc in documents.items():
    if not source.startswith('真题90-2020/') or '89-07' in source:
        continue
    key = canonical_date(source)
    if not key or len(doc['text']) < 6000 or not PART.search(doc['text']):
        continue
    base = source.rsplit('/',1)[-1]
    if re.search(r'听力|原文|长篇|仔细|选词填空|写作|翻译|阅读', base) and not re.search(r'真题.*答案|真题与详细解析', base):
        continue
    question_body, _ = split_answers(doc['text'])
    if key[:4] < '2016' and re.search(r'hear\s+three\s+news\s+reports', question_body, re.I):
        pending.append({'source': source, 'reason': '标注年份早于新闻听力启用年份，旧题型/套卷来源需复核'})
        continue
    directions = len(re.findall(r'\bDirections?\s*[:：]', question_body, re.I))
    if directions < 3:
        continue
    score = len(question_body) / 10000 + min(directions, 12) * 25 + min(len(list(RECORD.finditer(question_body))), 100) * 3 + (200 if '真题' in base else 0)
    score += 100 if source.endswith('.docx') else 80 if source.endswith('.doc') else 0
    if key not in selected or score > selected[key]['selectionScore']:
        selected[key] = {**doc, 'selectionScore': score, 'catalogKey': key}

# Separate original listening/reading PDFs are independent source pairs. They
# often preserve material omitted or corrupted in a merged Word document.
piece_keys = set()
for source, doc in documents.items():
    base = source.rsplit('/', 1)[-1]
    key = canonical_date(source)
    if not key or key[:4] >= '2016' or not source.endswith('.pdf') or not source.startswith('真题90-2020/'):
        continue
    if not re.search(r'(?:听力|阅读)真题', base) or re.search(r'答案|解析|全[三3]套', base):
        continue
    channel = 'listening' if '听力' in base else 'reading'
    candidates = [other for path, other in documents.items()
                  if canonical_date(path) == key and path.endswith('.pdf')
                  and ('听力' in path.rsplit('/', 1)[-1] if channel == 'listening' else '阅读' in path.rsplit('/', 1)[-1])
                  and re.search(r'答案|解析', path.rsplit('/', 1)[-1])
                  and not re.search(r'全[三3]套|六级', path)]
    if len(candidates) != 1:
        pending.append({'source':source,'reason':'分项原卷的对应解析不唯一或缺失'})
        continue
    answer_doc = candidates[0]
    body = doc['text']
    if not PART.search(body):
        body = ('Part II Listening Comprehension\n' if channel == 'listening' else 'Part III Reading Comprehension\n') + body
    piece_key = f'{key}-{channel}'
    if piece_key in piece_keys:
        continue
    piece_keys.add(piece_key)
    selected[piece_key] = {**doc, 'body':body, 'answers':answer_doc['text'], 'answerSourceHash':answer_doc['sha256'],
                           'answerSource':answer_doc['source'], 'pairedPiece':True, 'catalogKey':piece_key, 'selectionScore':1000}

# Supplemental answer documents are selected by date/variant, never by extraction length alone.
for key, doc in selected.items():
    if doc.get('pairedPiece'):
        continue
    body, answers = split_answers(doc['text'])
    candidates = [{**doc, 'answerText': answers, 'sameDocument': True}] if answers else []
    for source, other in documents.items():
        base = source.rsplit('/', 1)[-1]
        if canonical_date(source) == key and re.search('答案|解析|详解', base) and not re.search(r'阅读|六级|CET[-_ ]?6', base, re.I) and other['sha256'] != doc['sha256']:
            _, tail = split_answers(other['text'])
            answer_text = tail or other['text']
            # Compare the actual question wording when an alternate file also
            # contains questions. Date and filename alone cannot establish a pair.
            other_body, _ = split_answers(other['text'])
            if len(re.findall(r'\bDirections?\s*[:：]', other_body, re.I)) >= 3:
                words = lambda value: {w.lower() for w in re.findall(r'[A-Za-z]{5,}', value)}
                own_words, other_words = words(body), words(other_body)
                overlap = len(own_words & other_words) / max(1, min(len(own_words), len(other_words)))
                if overlap < .7:
                    pending.append({'source':key,'candidate':source,'reason':'备用答案文档题文与所选试题不匹配'})
                    continue
            candidates.append({**other, 'answerText': answer_text, 'sameDocument': False})
    def answer_quality(candidate):
        candidate_keys, _ = answer_map(candidate['answerText'])
        corruption = len(re.findall(r'[\u0080-\u009f\ue000-\uf8ff\ufffd]', candidate['answerText']))
        return (bool(candidate.get('sameDocument') and len(candidate_keys) >= 30 and not corruption),
                sum(value in set('ABCDEFGHIJKLMNO') | {'Y','N','NG'} for value in candidate_keys.values()) - corruption,
                candidate['answerText'].count('【解析】') + candidate['answerText'].count('【精析】'))
    if candidates:
        answer_doc = max(candidates, key=answer_quality)
        answers = answer_doc['answerText']
        paired_body, paired_tail = split_answers(answer_doc['text'])
        if answer_doc['sha256'] != doc['sha256'] and paired_tail and len(paired_body)>10000 and len(re.findall(r'\bDirections?\s*[:：]',paired_body,re.I))>=3 and not re.search(r'[\u0080-\u009f\ue000-\uf8ff\ufffd]',paired_body):
            # When the best reference is itself a complete question-and-answer
            # document, use that document's own questions as well. This avoids
            # carrying a letter key across independently shuffled options.
            doc.update({name:value for name,value in answer_doc.items()if name not in ['answerText','sameDocument']})
            body,answers = paired_body,paired_tail
        doc['answerSourceHash'] = answer_doc['sha256']
        doc['answerSource'] = answer_doc['source']
    else:
        doc['answerSourceHash'] = doc['sha256']
    doc['body'], doc['answers'] = body, answers
    if doc['source'].endswith('.pdf') and (doc['text'].count('�') > 3 or not answers):
        extra_ocr.append({'id': key, 'path': doc['source']})

families = collections.defaultdict(list)
counts = collections.Counter()
source_report = []


def add_reference_group(category, key, prefix, title, questions, instructions=None):
    group = {'id': prefix+'-group', 'title': source_label(key)+' · '+title, 'presentation': 'writing',
             'instructions': instructions or [], 'stimulusBlocks': [], 'sharedOptions': [], 'questions': questions}
    families[category].append({'id': prefix+'-section', 'title': group['title'], 'sourceYear': key[:4],
                              'layout': 'flow', 'instructions': [], 'groups': [group]})
    counts[category] += len(questions)
    return len(questions)


def add_matching_group(key, prefix, title, body, keys, refs, media=None):
    body = clean_text(body)
    dictation = bool(media and re.search(r'dictation|fill\s+in\s+the\s+blanks|missing\s+words|(?:heard|read)\s+three\s+times', body, re.I))
    word_bank = bool(not dictation and re.search(r'ten\s+blanks|select\s+one\s+word|word\s+bank', body, re.I))
    paragraph_matching = bool(re.search(r'ten\s+statements|Each\s+statement\s+contains', body, re.I))
    if not any([word_bank, dictation, paragraph_matching]):
        return 0
    category = '选词填空' if word_bank else '听写填空' if dictation else '长篇阅读'
    shared = []
    if word_bank:
        matches = list(OPT.finditer(body))
        bank = None
        for index, match in enumerate(matches):
            window = matches[index:index+15]
            if len(window) == 15 and {m[1] or m[2] for m in window} == set('ABCDEFGHIJKLMNO'):
                bank = window
                break
        if not bank:
            return 0
        removals = []
        for match in bank:
            word = re.match(r"[A-Za-z]+(?:[-’'][A-Za-z]+)*", body[match.end():])
            if not word:
                return 0
            shared.append(option(match[1] or match[2], word[0]))
            removals.append((match.start(),match.end()+word.end()))
        for start,end in reversed(removals):
            body = body[:start]+body[end:]
    if paragraph_matching:
        all_records = records(body)
        if not all_records or any(number not in keys or not re.fullmatch('[A-O]', keys[number]) for number,_ in all_records):
            return 0
        first = RECORD.search(body)
        stimulus = paragraphs(body[:first.start()])
        labels = re.findall(r'^\s*[\[（(]?([A-O])[\]）).．]', body[:first.start()], re.M)
        if not labels or set(labels) != {chr(n) for n in range(ord('A'), ord(max(labels)) + 1)}:
            return 0
        shared = [option(chr(n), chr(n)+' 段') for n in range(ord('A'),ord(max(labels))+1)]
        questions = []
        for number, record in all_records:
            qid = f'{prefix}-q-{number}';blank = qid+'-blank'
            question = make_reference(prefix, number, record, '', category, refs[0])
            question.update({'type': 'shared_option_matching', 'promptBlocks': paragraphs(record)+[{'type':'paragraph','runs':[{'type':'blank','blankId':blank}]}],
                             'placement': {'kind':'inline','blankIds':[blank]}, 'blanks':[{'blankId':blank}],
                             'answerSpec': {'availability':'answered','gradingMode':'auto','kind':'choice','acceptedAnswers':[keys[number]],'normalization':NORMALIZATION},
                             'sourceRefs':refs, 'explanationBlocks':[{'type':'notice','text':'原资料提供标准答案，未附本题的详细解析。'}]})
            questions.append(question)
    else:
        expression = re.compile(r'[_＿]{1,}\s*(S?\d{1,3})\s*[_＿]*|[（(]\s*(S?\d{1,3})\s*[)）]\s*[_＿]{1,}', re.I)
        matches = list(expression.finditer(body))
        if word_bank and len(matches) != 10:
            # Digitally typeset PDFs sometimes lose the underline glyph while
            # preserving its number. Require the complete ordered ten blanks.
            body = re.sub(r'Questions?\s+\d+\s+to\s+\d+[^\n]*\n', '', body, flags=re.I)
            first_number = 36 if key[:6] >= '201312' else 47
            expected = [str(n) for n in range(first_number,first_number+10)]
            candidates = list(re.finditer(r'(?<![A-Za-z0-9])(\d{2})(?![A-Za-z0-9])',body))
            matches = [match for match in candidates if match[1] in expected]
            if [match[1] for match in matches] != expected:
                return 0
        if not matches or any((m[1] or m[2]).upper() not in keys for m in matches):
            return 0
        if word_bank and len(matches) != 10:
            return 0
        runs, questions, cursor = [], [], 0
        for match in matches:
            number = (match[1] or match[2]).upper();answer = keys[number]
            qid = f'{prefix}-q-{number}';blank = qid+'-blank'
            if match.start() > cursor:
                runs.append({'type':'text','text':body[cursor:match.start()]})
            runs.append({'type':'blank','blankId':blank});cursor=match.end()
            if word_bank and not re.fullmatch('[A-O]',answer):
                return 0
            spec = {'availability':'answered','gradingMode':'auto','kind':'choice','acceptedAnswers':[answer],'normalization':NORMALIZATION} if word_bank else {'availability':'answered','gradingMode':'auto','kind':'per_blank','perBlankAnswers':{blank:[answer]},'normalization':NORMALIZATION}
            if not word_bank and len(answer.split()) > 5:
                spec = {'availability':'answered','gradingMode':'manual','kind':'reference','referenceAnswer':paragraphs(answer)}
            if not word_bank and re.search(r'[\u4e00-\u9fff]|【|听力原文', answer):
                return 0
            if not word_bank and (not answer.strip() or re.fullmatch('[A-O]',answer)):
                pending.append({'source':key,'part':title,'number':number,'reason':'听写答案为空或误识为选择题字母，整组待复核'})
                return 0
            questions.append({'id':qid,'displayNumber':int(number.lstrip('S')),'sourceQuestionNumber':int(number.lstrip('S')),
                              'type':'shared_option_matching' if word_bank else 'inline_fill','typeLabel':category,
                              'sourceQuestionLabel': number,
                              'promptBlocks':[],'placement':{'kind':'inline','blankIds':[blank]},'options':[],'blanks':[{'blankId':blank}],
                              'answerSpec':spec,'explanationBlocks':[{'type':'notice','text':'请对照原资料提供的答案复习本空。'}],
                              'sourceRefs':refs,'reviewStatus':'approved'})
        if cursor<len(body):runs.append({'type':'text','text':body[cursor:]})
        stimulus=[{'type':'paragraph','runs':runs}]
    gid=prefix+'-matching'
    group={'id':gid,'title':source_label(key)+' · '+title,'presentation':'reading','instructions':[{'type':'audio','assetId':media['assetId'],'label':'原卷听力音频'}] if media else [],
           'stimulusBlocks':stimulus,'sharedOptions':sorted(shared,key=lambda o:o['id']),'sharedOptionsReusable':paragraph_matching,'questions':questions}
    families[category].append({'id':gid+'-section','title':group['title'],'sourceYear':key[:4],'layout':'split','instructions':[],'groups':[group]})
    counts[category]+=len(questions)
    return len(questions)


for key, doc in sorted(selected.items()):
    if int(key[:4]) >= 2016:
        source_report.append({'id': key, 'source': doc['source'], 'sha256': doc['sha256'],
                              'status': 'modern-format-source-channel', 'importedQuestions': 0})
        continue
    label = source_label(key)
    ref = source_ref(label, doc['sha256'], method=doc['method'])
    keys, conflicts = answer_map(doc['answers'])
    doc['answerKeys'] = keys
    doc['answerKeyConflicts'] = sorted(conflicts)
    answer_ref = source_ref(label+'答案', doc['answerSourceHash'], method=doc['method'])
    answer_parts = parts(doc['answers'])
    n_imported = 0
    for part_index, (roman, title, body) in enumerate(parts(doc['body'])):
        category = family(title, body)
        prefix = 'cet4-legacy-' + key + '-part-' + str(part_index+1)
        # No diagram, listening recording, or answer is reconstructed by guesswork.
        media = listening_asset(key) if category == '听力理解' else None
        if category == '听力理解' and not media:
            pending.append({'source': key, 'part': title, 'reason': '原资料未找到可确认对应的完整音频'})
            continue
        if category == '写作':
            reference = next((content for _, heading, content in answer_parts if 'writ' in heading.lower()), '')
            reference = clean_text(reference)
            if re.search(r'\b(?:chart|diagram|picture|illustrat)\w*\b|上图|下图|图表', body, re.I) or len(re.findall(r'[A-Za-z]+', reference)) < 60 or re.search(r'^\s*Directions', reference[:300], re.I) or len(re.findall(r'[\u4e00-\u9fff]', reference)) > 20:
                pending.append({'source': key, 'part': title, 'reason': '写作参考范文或必要图表待核验'})
                continue
            question = make_reference(prefix, 1, body, reference, category, ref, 'essay')
            question['sourceRefs'].append(answer_ref)
            n_imported += add_reference_group(category, key, prefix, title, [question])
            continue
        if category == '翻译':
            recs = records(body)
            if key[:6] < '201312':
                if [number for number, _ in recs] != [str(n) for n in range(87, 92)] or any(len(re.findall(r'[\u4e00-\u9fff]', record)) < 2 for _, record in recs):
                    pending.append({'source': key, 'part': title, 'reason': '旧版五道翻译题边界或题号待核验'})
                    continue
            questions = [make_reference(prefix, number, record, keys[number], category, ref, 'translation') for number, record in recs if number in keys and len(keys[number]) > 1]
            for question in questions:
                question['sourceRefs'].append(answer_ref)
            if recs and len(questions) == len(recs):
                n_imported += add_reference_group(category, key, prefix, title, questions)
            else:
                pending.append({'source': key, 'part': title, 'reason': '翻译参考内容待核验'})
            continue
        matching_count = add_matching_group(key, prefix, title, body, keys, [ref, answer_ref], media)
        if matching_count:
            n_imported += matching_count
            continue
        group_starts = list(re.finditer(r'^\s*(?:Passage\s+(?:One|Two|Three|Four|Five|[1-5])|Questions?\s+\d+\s*(?:to|[-–])\s*\d+)[^\n]*$', body, re.I | re.M))
        segments = [(m[0].strip(), body[m.end():group_starts[i+1].start() if i+1<len(group_starts) else len(body)]) for i,m in enumerate(group_starts)] if group_starts else [(title, body)]
        if group_starts and RECORD.search(body[:group_starts[0].start()]):
            segments.insert(0,(title,body[:group_starts[0].start()]))
        for group_index, (group_title, chunk) in enumerate(segments):
            recs = records(chunk)
            if not recs:
                pending.append({'source': key, 'part': title, 'group': group_title, 'reason': '未确认题号/词库边界'})
                continue
            matches = list(RECORD.finditer(chunk))
            first = matches[0]
            if category == '长篇阅读':
                # Numbered subheadings belong to the passage, not its Y/N/NG
                # questions. The actual ten-question block follows the passage.
                starts = [i for i, (number, _) in enumerate(recs) if number == '1']
                start = starts[-1] if starts else 0
                recs = recs[start:]
                first = matches[start]
                if [number for number, _ in recs] != [str(n) for n in range(1, 11)]:
                    pending.append({'source': key, 'part': title, 'reason': '快速阅读正文与十道题边界待核验'})
                    continue
            if len({number for number, _ in recs}) != len(recs):
                unique = {}
                for number,record in recs:
                    if number in unique and re.sub(r'\s+','',unique[number]) != re.sub(r'\s+','',record):
                        break
                    unique[number] = record
                else:
                    recs = list(unique.items())
            if len({number for number, _ in recs}) != len(recs):
                pending.append({'source': key, 'part': title, 'reason': '原题号重复，整组暂存复核'})
                continue
            stimulus = chunk[:first.start()] if first else ''
            questions = []
            for number, record in recs:
                stem, opts = parse_options(record)
                answer = keys.get(number)
                if not opts and answer in ['Y','N','NG'] and re.search(r'YES|NOT\s+GIVEN|NO\b',chunk,re.I):
                    opts = [option('Y','YES'),option('N','NO'),option('NG','NOT GIVEN')]
                    qid=f'{prefix}-group-{group_index+1}-q-{number}'
                    questions.append({'id':qid,'displayNumber':int(number),'sourceQuestionNumber':int(number),'type':'single_choice','typeLabel':'长篇阅读判断',
                                      'promptBlocks':paragraphs(stem),'placement':{'kind':'standalone'},'options':opts,'blanks':[],
                                      'answerSpec':{'availability':'answered','gradingMode':'auto','kind':'choice','acceptedAnswers':[answer],'normalization':NORMALIZATION},
                                      'explanationBlocks':[{'type':'notice','text':'原资料提供标准答案，未附本题的详细解析。'}],'sourceRefs':[ref,answer_ref],'reviewStatus':'approved'})
                    continue
                if not opts and answer and len(answer) > 1 and ('short answer' in title.lower() or category == '长篇阅读'):
                    question = make_reference(prefix+f'-group-{group_index+1}', number, stem, answer, category, ref)
                    question['sourceRefs'].append(answer_ref)
                    questions.append(question)
                    continue
                if len(opts) != 4 or any(not opt['blocks']for opt in opts) or answer not in list('ABCD'):
                    pending.append({'source': key, 'part': title, 'number': number, 'reason': '选项或标准答案待核对'})
                    continue
                if re.search(r'�|\u200e|待补|缺题|略去|题目缺', stem):
                    pending.append({'source': key, 'part': title, 'number': number, 'reason': '源题文不完整'})
                    continue
                qid = f'{prefix}-group-{group_index+1}-q-{number}'
                question = {'id': qid, 'displayNumber': int(number.lstrip('S')), 'sourceQuestionNumber': int(number.lstrip('S')),
                            'type': 'single_choice', 'typeLabel': category, 'promptBlocks': paragraphs(stem),
                            'placement': {'kind': 'standalone'}, 'options': opts, 'blanks': [],
                            'answerSpec': {'availability': 'answered', 'gradingMode': 'auto', 'kind': 'choice', 'acceptedAnswers': [answer], 'normalization': NORMALIZATION},
                            'explanationBlocks': explanation_for(number, answer, doc['answers']),
                            'sourceRefs': [ref, answer_ref], 'reviewStatus': 'approved'}
                questions.append(question)
            if not questions:
                continue
            # A partial passage is never advertised as an intact reading exercise.
            if len(questions) != len(recs):
                pending.append({'source': key, 'part': title, 'group': group_title, 'reason': f'题组质量门：{len(questions)}/{len(recs)}，整组暂存'})
                continue
            group_id = f'{prefix}-group-{group_index+1}'
            group = {'id': group_id, 'title': f'{label} · {group_title}', 'presentation': 'reading' if stimulus.strip() else 'inline',
                     'instructions': [{'type': 'audio', 'assetId': media['assetId'], 'label': '原卷听力音频'}] if media else [], 'stimulusBlocks': paragraphs(stimulus), 'sharedOptions': [], 'questions': questions}
            families[category].append({'id': f'{group_id}-section', 'title': f'{label} · {title}', 'sourceYear': key[:4],
                                       'layout': 'split' if stimulus.strip() else 'flow', 'instructions': [], 'groups': [group]})
            n_imported += len(questions)
            counts[category] += len(questions)
    source_report.append({'id': key, 'source': doc['source'], 'sha256': doc['sha256'], 'parts': [title for _,title,_ in parts(doc['body'])],
                          'explicitKeys': len(keys), 'conflictingKeys': sorted(conflicts), 'importedQuestions': n_imported})

# The dedicated translation source supplies its own reference translation per item.
translation_source = next((d for p,d in documents.items() if '大学英语四级翻译新题型精选60道' in p), None)
if translation_source:
    translation_starts = list(re.finditer(r'^\s*(\d{1,2})\s*[.．]\s*(?=[\u4e00-\u9fff])',translation_source['text'],re.M))
    translation_records = [(m[1],translation_source['text'][m.end():translation_starts[i+1].start() if i+1<len(translation_starts) else len(translation_source['text'])])for i,m in enumerate(translation_starts)]
    for number, content in translation_records:
        if not 1 <= int(number) <= 60:
            continue
        lines = content.splitlines()
        split = next((i for i,line in enumerate(lines) if re.match(r'^\s*[A-Za-z][A-Za-z ,\'’()-]{12,}',line) and not re.search(r'[\u4e00-\u9fff]',line)), None)
        if split is None or split == 0:
            pending.append({'source':'translation-special','number':number,'reason':'中英题文边界待核验'})
            continue
        prompt, reference = '\n'.join(lines[:split]), '\n'.join(lines[split:])
        if len(re.findall(r'[A-Za-z]+',reference)) < 35:
            pending.append({'source':'translation-special','number':number,'reason':'译文不完整'})
            continue
        ref = source_ref('四级翻译专项原题与参考译文',translation_source['sha256'],method=translation_source['method'])
        ref['locator']['paragraph']=number
        prefix=f'cet4-translation-special-{number}'
        question=make_reference(prefix,number,prompt,reference,'翻译',ref,'translation')
        group={'id':prefix+'-group','title':f'翻译专项 · 原题 {number}','presentation':'writing','instructions':[],'stimulusBlocks':[], 'sharedOptions':[],'questions':[question]}
        families['翻译'].append({'id':prefix+'-section','title':group['title'],'sourceYear':'专项','layout':'flow','instructions':[],'groups':[group]})
        counts['翻译']+=1

sets = []
slugs = {'仔细阅读': 'reading', '长篇阅读': 'matching', '选词填空': 'word-bank', '完形填空': 'cloze', '词汇与语法': 'grammar', '听力理解': 'listening', '听写填空': 'dictation', '翻译': 'translation', '写作': 'writing'}
for category, sections in families.items():
    seen, deduped = set(), []
    sequence = 0
    for section in sections:
        group = section['groups'][0]
        surface = json.dumps({'stimulus': group['stimulusBlocks'], 'questions': [{'prompt': q['promptBlocks'], 'options': q['options']} for q in group['questions']]}, ensure_ascii=False)
        if re.search(r'【(?:答案|精析|解析)】|参考答案|答案详解|答案解析|语法判断|词义判断|听力原文|录音原文|HYPERLINK|PAGEREF|[\u0080-\u009f\ue000-\uf8ff\ufffd]', surface):
            pending.append({'source': group['title'], 'reason': '题面含答案标记、域代码或乱码，整组暂存'})
            continue
        fingerprint = hashlib.sha256(json.dumps({'stimulus': group['stimulusBlocks'], 'questions': [{'prompt': q['promptBlocks'], 'options': q['options']} for q in group['questions']]}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        for question in group['questions']:
            sequence += 1
            question['displayNumber'] = sequence
        deduped.append(section)
    used_audio = {block['assetId'] for s in deduped for g in s['groups'] for block in g['instructions'] if block['type'] == 'audio'}
    sets.append({'schemaVersion': 2, 'id': f'practice-cet4-{slugs[category]}', 'kind': 'practice', 'title': f'大学英语四级{category}训练',
                 'year': '1990–2019', 'region': '全国', 'variant': '', 'instructions': [], 'sections': deduped, 'assetRefs': [asset for asset in audio_assets.values() if asset and asset['assetId'] in used_audio],
                 'sourceRefs': list({r['sha256']: r for s in deduped for g in s['groups'] for q in g['questions'] for r in q['sourceRefs']}.values()),
                 'quality': {'structureStatus': 'approved', 'structureConfidence': 1, 'issueCount': 0, 'issues': []}})

for name, value in [('legacy-reviewed-sets.json', sets), ('legacy-review-pending.json', pending), ('legacy-selected.json', selected), ('legacy-cleanup-audit.json', sorted(set(CLEANUP_LOG))),
                    ('legacy-cleanup-edits.json', CLEANUP_EDITS), ('legacy-review-report.json', source_report), ('legacy-ocr-jobs.json', extra_ocr)]:
    (args.cache / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'selectedPapers': len(selected), 'categories': dict(counts), 'pendingItems': len(pending), 'extraOcr': len(extra_ocr)}, ensure_ascii=False), flush=True)
