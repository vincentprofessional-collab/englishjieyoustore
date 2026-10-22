"""Build modern papers from exact, cleaned source regions and explicit answer evidence."""
import argparse
import copy
import datetime
import json
import re
import subprocess
from pathlib import Path

from cet4_source_common import (EvidenceRenderer, SOURCE_ROOT, choice_question, clean_text,
                                digest, option, paragraphs, source_ref, text_segments)

parser = argparse.ArgumentParser()
parser.add_argument('--cache', type=Path, required=True)
parser.add_argument('--only', default='')
parser.add_argument('--finalize', action='store_true')
parser.add_argument('--legacy-modern', action='store_true')
args = parser.parse_args()
inventory = json.loads((args.cache / ('legacy-modern-inventory.json' if args.legacy_modern else 'inventory.json')).read_text())
answer_audit = {item['id']: item for item in json.loads((args.cache / ('legacy-modern-answer-audit.json' if args.legacy_modern else 'answer-audit.json')).read_text())}
renderer = EvidenceRenderer(args.cache)
reviewed = args.cache / ('reviewed-legacy-papers' if args.legacy_modern else 'reviewed-papers')
reviewed.mkdir(exist_ok=True)
pending = []
image_records = {path.stem[:24]: path for path in (args.cache / 'cleaned-images').glob('*.json') if not path.name.startswith('.')}
text_review = json.loads(Path('src/data/cet4/source-text-review.json').read_text())

PARTS = [
    ('listening-a', '短篇新闻', range(1, 8), False),
    ('listening-b', '长对话', range(8, 16), False),
    ('listening-c', '听力篇章', range(16, 26), False),
    ('reading-a', '选词填空', range(26, 36), True),
    ('reading-b', '长篇阅读', range(36, 46), True),
    ('reading-c', '仔细阅读', range(46, 56), False),
]


def main(paper):
    pid = paper['id']
    answer = answer_audit.get(pid)
    if not answer:
        raise ValueError('Answer OCR checkpoint not ready')
    if paper['pdf']:
        doc = renderer.load(paper['pdf'])
        segments = doc['segments']
        def question_blocks(kind):
            return renderer.segment(paper['pdf'], kind, f'{paper["title"]} · {kind}')
        def question_text(kind):
            return renderer.segment_text(doc, kind)
        ref = source_ref(paper['title'], doc['sha256'], method='pdf-ocr')
    else:
        raw = subprocess.run(['/usr/bin/textutil', '-convert', 'txt', '-stdout', str(SOURCE_ROOT / paper['paper'])], check=True, capture_output=True, text=True).stdout
        segments = text_segments(raw)
        for edit in text_review['textCorrections']:
            if edit['id'] != pid:
                continue
            if edit['sourceHash'] != paper['paperHash'] or segments[edit['section']].count(edit['before']) != 1:
                raise ValueError('Reviewed text correction no longer matches')
            segments[edit['section']] = segments[edit['section']].replace(edit['before'],edit['after'])
        def question_blocks(kind):
            return paragraphs(segments[kind])
        def question_text(kind):
            return segments.get(kind, '')
        ref = source_ref(paper['title'], paper['paperHash'], method='docx-text')

    provided = []
    for kind, label, numbers, matching in PARTS:
        if pid == 'cet4-paper-2020071':
            # The source explicitly identifies the remaining content as a
            # reconstruction from other sittings, not this sitting's full paper.
            continue
        if paper.get('omitListening') and kind.startswith('listening'):
            continue
        if kind not in segments:
            continue
        text = question_text(kind)
        if re.search(r'【精析】|【解析】|答案详解|答案解析|语法判断|语义判断|参考译文|范文评注', text):
            raise ValueError(f'Answer content in question source: {kind}')
        if kind.startswith('listening') and not re.search(r'Questions?\s+\d', text, re.I):
            continue
        provided.append((kind, label, numbers, matching))
    missing = [number + (paper.get('answerNumberOffset', 0) if kind.startswith('reading') else 0) for kind, _, numbers, _ in provided for number in numbers if str(number + (paper.get('answerNumberOffset', 0) if kind.startswith('reading') else 0)) not in answer['keys']]
    if missing:
        raise ValueError(f'Missing/conflicting explicit keys: {missing}')
    if not all(kind in segments for kind in ['writing', 'translation']):
        raise ValueError(f'Writing/translation boundary unresolved: {list(segments)}')

    sections = []
    answer_doc = renderer.load(paper['answer'])
    # The supplied 2026 answer book numbers its writing prompts differently from its paper files.
    writing_source_id = {'cet4-paper-2026061': 'cet4-paper-2026063',
                         'cet4-paper-2026062': 'cet4-paper-2026061',
                         'cet4-paper-2026063': 'cet4-paper-2026062'}.get(pid, pid)
    writing_paper = next(item for item in inventory['papers'] if item['id'] == writing_source_id)
    writing_reference = renderer.segment(writing_paper['answer'], 'writing', f'{paper["title"]} · 写作解析')
    for kind, label, number in [('writing', '写作', 0), ('translation', '翻译', 56)]:
        reference = writing_reference if kind == 'writing' else renderer.segment(paper['answer'], kind, f'{paper["title"]} · 翻译解析')
        qid = f'{pid}-{kind}-response'
        question = {'id': qid, 'displayNumber': number, 'displayLabel': label,
                    'type': 'essay' if kind == 'writing' else 'translation', 'typeLabel': label,
                    'promptBlocks': question_blocks(kind), 'placement': {'kind': 'standalone'},
                    'options': [], 'blanks': [],
                    'answerSpec': {'availability': 'answered', 'gradingMode': 'manual', 'kind': 'reference', 'referenceAnswer': reference},
                    'explanationBlocks': [], 'sourceRefs': [ref], 'reviewStatus': 'approved'}
        sections.append({'id': f'{pid}-{kind}', 'title': f'{"Part I" if kind == "writing" else "Part IV"} · {label}',
                         'layout': 'flow', 'instructions': [], 'groups': [{'id': f'{pid}-{kind}-group',
                         'title': label, 'presentation': 'writing', 'instructions': [], 'stimulusBlocks': [],
                         'sharedOptions': [], 'questions': [question]}]})

    objective_sections = []
    for kind, label, numbers, matching in provided:
        group_id = f'{pid}-{kind}-group'
        stimulus = question_blocks(kind)
        if kind == 'reading-c' and 'reading-c2' in segments:
            stimulus.extend(question_blocks('reading-c2'))
        solution_kind = kind
        if solution_kind not in answer_doc['segments']:
            raise ValueError(f'Explanation section not located: {kind}')
        explanation = renderer.segment(paper['answer'], solution_kind, f'{paper["title"]} · {label}解析')
        if kind == 'reading-c' and 'reading-c2' in answer_doc['segments']:
            explanation.extend(renderer.segment(paper['answer'], 'reading-c2', f'{paper["title"]} · 仔细阅读解析'))
        offset = paper.get('answerNumberOffset', 0) if kind.startswith('reading') else 0
        questions = [choice_question(pid, n, answer['keys'][str(n + offset)]['answer'], ref, label, matching) for n in numbers]
        for question in questions:
            if offset:
                question['sourceQuestionLabel'] = f'{question["sourceQuestionNumber"]}（原考试 {question["sourceQuestionNumber"] + offset}）'
            number = str(question['sourceQuestionNumber'] + offset)
            evidence = answer['keys'][number]['evidence'][0]
            question['sourceRefs'].append(source_ref(paper['title'] + '解析', answer_doc['sha256'], evidence.get('page'), 'source-answer-review'))
        shared = []
        if kind == 'reading-a':
            shared = [option(c) for c in 'ABCDEFGHIJKLMNO']
        elif kind == 'reading-b':
            text = question_text(kind)
            labels = re.findall(r'^\s*[\[（(]?\s*([A-Z])\s*[\]）).．]', text, re.M)
            if paper['pdf']:
                native_text = renderer.native_segment_text(paper['pdf'], kind)
                labels += re.findall(r'^\s*[\[（(]?\s*([A-Z])\s*[\]）).．]', native_text, re.M)
            reviewed_bank = next((item for item in text_review['paragraphBanks'] if item['id']==pid and item['section']==kind),None)
            if reviewed_bank:
                if reviewed_bank['sourceHash'] != ref['sha256']:
                    raise ValueError('Reviewed paragraph bank source changed')
                labels = list(reviewed_bank['labels'])
            if not labels or set(labels) != {chr(n) for n in range(ord('A'), ord(max(labels)) + 1)}:
                raise ValueError(f'Paragraph labels unresolved: {labels}')
            shared = [option(chr(n), f'{chr(n)} 段') for n in range(ord('A'), ord(max(labels)) + 1)]
        if shared and any(q['answerSpec']['acceptedAnswers'][0] not in {item['id']for item in shared}for q in questions):
            raise ValueError('Answer outside verified option bank')
        objective_sections.append({'id': f'{pid}-{kind}', 'title': label, 'layout': 'split' if kind.startswith('reading') else 'flow',
                                   'instructions': [], 'groups': [{'id': group_id, 'title': label,
                                   'presentation': 'reading', 'instructions': [], 'stimulusBlocks': stimulus,
                                   'sharedOptions': shared, 'sharedOptionsReusable': kind == 'reading-b',
                                   'questions': questions, 'explanationBlocks': explanation}]})
    inherited_from = {'cet4-paper-2022063': 'cet4-paper-2022062',
                      'cet4-paper-2022092': 'cet4-paper-2022091',
                      'cet4-paper-2022093': 'cet4-paper-2022091'}.get(pid)
    if inherited_from and not objective_sections:
        base_path = reviewed / f'{inherited_from}.json'
        base = json.loads(base_path.read_text()) if base_path.exists() else main(next(item for item in inventory['papers'] if item['id'] == inherited_from))
        for asset in base['assetRefs']:
            shared_asset = copy.deepcopy(asset)
            shared_asset['assetId'] = shared_asset['assetId'].replace(inherited_from, pid)
            renderer.assets[shared_asset['assetId']] = shared_asset
        for section in base['sections']:
            if 'listening-' in section['id'] or 'reading-' in section['id']:
                objective_sections.append(json.loads(json.dumps(section, ensure_ascii=False).replace(inherited_from, pid)))
    sections[1:1] = objective_sections
    if paper['audioUrl']:
        aid = f'{pid}-audio'
        renderer.assets[aid] = {'assetId': aid, 'kind': 'audio', 'url': paper['audioUrl'], 'mimeType': 'audio/mpeg', 'sha256': '', 'sourceRefs': [ref]}
        listening = next((s for s in sections if 'listening' in s['id']), None)
        if listening:
            listening['instructions'].append({'type': 'audio', 'assetId': aid, 'label': '听力音频'})
    if any('listening-' in section['id'] for section in objective_sections) and not any(asset['kind'] == 'audio' for asset in renderer.assets.values() if asset['assetId'].startswith(pid)) and not inherited_from:
        raise ValueError('Listening source has no confirmed audio')
    omitted = []
    if not any('listening-' in section['id'] for section in objective_sections):
        omitted.append('原资料未提供听力题目')
    if not any('reading-' in section['id'] for section in objective_sections):
        omitted.append('原资料未提供阅读题目')
    count = sum(len(g['questions']) for s in sections for g in s['groups'])
    if count not in [2, 32, 57]:
        raise ValueError(f'Unexpected source coverage: {count} questions')
    # Only assets actually referenced by this paper enter its public payload.
    used = set()
    def find_assets(value):
        if isinstance(value, dict):
            if 'assetId' in value:
                used.add(value['assetId'])
            for child in value.values():
                find_assets(child)
        elif isinstance(value, list):
            for child in value:
                find_assets(child)
    find_assets(sections)
    result = {'schemaVersion': 2, 'id': pid, 'kind': 'paper', 'title': paper['title'],
              'year': pid[-7:-3], 'region': '全国', 'variant': f'第{pid[-1]}套',
              'submissionMode': 'whole-paper', 'timeLimit': {2:60,32:100,57:125}[count],
              'instructions': [{'type': 'notice', 'tone': 'info', 'text': '完成作答后提交整卷，查看答案与解析。写作和翻译请对照参考内容自行评阅。'}],
              'sections': sections, 'assetRefs': [renderer.assets[aid] for aid in sorted(used)],
              'sourceRefs': [ref, source_ref(f'{paper["title"]}解析', answer_doc['sha256'], method='pdf-ocr')],
              'sourceReviewVersion': 4,
              'quality': {'structureStatus': 'approved', 'structureConfidence': 1, 'issueCount': 0, 'issues': []}}
    if omitted:
        result['coverageNote'] = '；'.join(omitted)
        result['instructions'].append({'type': 'notice', 'tone': 'info', 'text': '；'.join(omitted) + '，本页按所提供部分练习。'})
    if inherited_from:
        note = f'客观题按原资料说明沿用同场第{inherited_from[-1]}套对应部分'
        result['coverageNote'] = '；'.join([*omitted, note])
        result['instructions'].append({'type': 'notice', 'tone': 'info', 'text': note + '。'})
    if pid == 'cet4-paper-2020071':
        result['title'] = '2020年7月大学英语四级真题（写作与翻译）'
        result['coverageNote'] = '源文件含拼接练习，按来源说明仅保留当场写作与翻译'
        result['instructions'] = [{'type': 'notice', 'tone': 'info', 'text': result['coverageNote'] + '。'}]
    if paper.get('omitListening'):
        result['coverageNote'] = '来源听力为后期改编；本页保留与原解析匹配的阅读、写作及翻译，沿用来源中的重排题号'
        result['instructions'] = [{'type': 'notice', 'tone': 'info', 'text': result['coverageNote'] + '。'}]
    return result


for paper in inventory['papers']:
    if args.only and args.only not in paper['id']:
        continue
    output = reviewed / f'{paper["id"]}.json'
    if output.exists():
        cached = json.loads(output.read_text())
        source_id = {'cet4-paper-2022063': 'cet4-paper-2022062', 'cet4-paper-2022092': 'cet4-paper-2022091', 'cet4-paper-2022093': 'cet4-paper-2022091'}.get(paper['id'], paper['id'])
        valid = cached.get('sourceReviewVersion') == 4
        for section in cached['sections']:
            for group in section['groups']:
                for question in group['questions']:
                    offset = paper.get('answerNumberOffset', 0) if 'reading-' in section['id'] else 0
                    if question['answerSpec']['kind'] == 'choice' and question['answerSpec']['acceptedAnswers'][0] != answer_audit[source_id]['keys'].get(str(question['sourceQuestionNumber'] + offset), {}).get('answer'):
                        valid = False
        for asset in cached['assetRefs']:
            if asset['kind'] != 'image':
                continue
            record = image_records.get(asset['assetId'].removeprefix('cet4-evidence-'))
            image = Path('public' + asset['url'])
            if not record or not record.exists() or not image.exists() or digest(image) != asset['sha256']:
                valid = False
        count = sum(len(group['questions']) for section in cached['sections'] for group in section['groups'])
        if paper['id'] == 'cet4-paper-2020071' and count != 2:
            valid = False
        if source_id != paper['id'] and count == 2:
            valid = False
        if valid:
            continue
    try:
        result = main(paper)
        output.write_text(json.dumps(result, ensure_ascii=False) + '\n')
        print(f'REVIEWED {paper["id"]}: {sum(len(g["questions"]) for s in result["sections"] for g in s["groups"])} source questions', flush=True)
    except (ValueError, KeyError) as error:
        pending.append({'id': paper['id'], 'reason': str(error)})
        print(f'PENDING {paper["id"]}: {error}', flush=True)

(args.cache / ('legacy-modern-review-pending.json' if args.legacy_modern else 'modern-review-pending.json')).write_text(json.dumps(pending, ensure_ascii=False, indent=2) + '\n')
if args.finalize:
    subprocess.run(['python3','scripts/cet4-finalize.py','--cache',str(args.cache)],check=True)
