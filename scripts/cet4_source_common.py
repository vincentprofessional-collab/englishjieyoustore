"""Shared, offline source-to-block utilities. Originals are never web assets."""
import hashlib
import io
import json
import re
import subprocess
import shutil
from pathlib import Path

import fitz
from PIL import Image, ImageDraw

SOURCE_ROOT = Path('/Volumes/My HDD3/备课/四级')
PROMOTION = re.compile(r'配套译文|(?:联系|添加|加)\s*(?:VX|V信|微信|wx)\s*[:：]?\s*[A-Za-z0-9_-]{3,}|VX\s*[:：]\s*[A-Za-z0-9_-]{3,}|新东方|公众号|公众[号號]|淘宝|淘寶|店[铺鋪]\s*[:：]|店[铺鋪].{0,6}(?:链接|咨询|购买资料)|taobao|天猫|tianmao|水印|扫码|掃碼|二维码|二維碼|微信号|微信群|添加微信|关注.{0,12}微信|关注.{0,12}获取|QQ群|加群|进群|资料下载|下载资料|课程咨询|联系客服|练习方式|练习方法|使用说明|新东方在线|考虫|星火英语|华研外语|巨微英语|有道精品课|沪江|文都教育|bilibili|资料仅供|严禁转载|侵权必究|翻印必究|大家网|大家论坛|大家学习网|topsage|CET[46]V|鼎力帮助考生|英语四级考试网|尊重劳动尊重版权|文档发布|https?://|www\.|[a-z0-9-]+\.(?:com|cn|net)\b', re.I)
# These are part of the examined passage/translation, verified against the source.
# An examination's mention of a QR code or a company is not a promotional insertion.
ASSESSMENT_LITERALS = ['lunchbox.com', '通过扫描二维码', 'careerbuilder.com',
                       'prevention.com', 'www.tnc.org', 'provider.com', 'smithsonian.com', 'lynda.com']
CLEANUP_LOG = []
CLEANUP_EDITS = []


def has_promotion(text):
    text = re.sub(r'lunchbox\s*[.．]\s*com', '', text, flags=re.I)
    for literal in ASSESSMENT_LITERALS:
        text = re.sub(re.escape(literal), '', text, flags=re.I)
    return bool(PROMOTION.search(text))


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def plain_word_fields(text):
    text = re.sub(r'HYPERLINK\s+"[^"]+"(?:\s+\\[lot]\s+"[^"]*")*', '', text, flags=re.I)
    # A few Word exports omit the HYPERLINK keyword but retain the field target.
    return re.sub(r'https?://[^\s"]+"\s*\\o\s*"[^"]*"', '', text, flags=re.I)


def clean_text(text):
    lines = []
    for line in text.replace('\x00', '').replace('\r', '').replace('\x07', ' ').splitlines():
        line = plain_word_fields(line)
        line = re.sub(r'INCLUDEPICTURE[^\n]*|EQ\s+\\X\\BO\([^)]*\)', '', line)
        line = line.replace('\u200b', '').replace('\xa0', ' ').strip()
        if not line:
            continue
        original = line
        # Some old Word files insert repeating branding inside assessed sentences.
        # Remove those exact insertions while retaining the surrounding sentence.
        line = re.sub(r'加入大家网[，,\s]*学习成绩更理想', '', line)
        line = re.sub(r'(?:大\s*家\s*(?:学习)?网(?:出品)?|大家(?=[.．]))+', '', line)
        if line != original:
            CLEANUP_EDITS.append({'before': original, 'after': line})
        if has_promotion(line):
            if len(re.findall(r'[A-Za-z]{2,}', line)) > 8:
                raise ValueError(f'Promotional insertion needs contextual review: {line[:180]}')
            CLEANUP_LOG.append(line)
            continue
        if re.fullmatch(r'\d+|第\s*\d+\s*页(?:.{0,15})?', line):
            continue
        if re.search(r'^.{0,8}(?:19|20)\d{2}\s*年.{0,20}四\s*级.{0,20}(?:真题|试题|第.{1,4}套)', line):
            continue
        lines.append(line)
    return '\n'.join(lines)


def paragraphs(text):
    return [{'type': 'paragraph', 'runs': [{'type': 'text', 'text': line}]} for line in clean_text(text).splitlines() if line.strip()]


def source_ref(title, sha256, page=None, method='manual-review'):
    return {'sourceDocumentId': sha256, 'relativePath': title,
            'sha256': sha256, 'locator': {'page': page} if page else {},
            'extractionMethod': method, 'confidence': 1}


def option(letter, text=''):
    # A numeral in an answer option is assessed content, not a page footer.
    blocks = [{'type':'paragraph','runs':[{'type':'text','text':text.strip()}]}] if re.fullmatch(r'\d+',text.strip()) else paragraphs(text)
    return {'id': letter, 'label': letter, 'blocks': blocks}


NORMALIZATION = {'unicodeNfkc': True, 'trim': True, 'collapseSpaces': True, 'caseSensitive': False}


def choice_question(prefix, number, letter, ref, label='单项选择', matching=False):
    qid = f'{prefix}-q-{number}'
    blank = f'{qid}-blank'
    return {'id': qid, 'displayNumber': number, 'sourceQuestionNumber': number,
            'type': 'shared_option_matching' if matching else 'single_choice', 'typeLabel': label,
            'promptBlocks': [{'type': 'paragraph', 'runs': [{'type': 'blank', 'blankId': blank}]}] if matching else [],
            'placement': {'kind': 'inline', 'blankIds': [blank]} if matching else {'kind': 'standalone'},
            'options': [] if matching else [option(c) for c in 'ABCD'],
            'blanks': [{'blankId': blank, 'label': f'第 {number} 题'}] if matching else [],
            'answerSpec': {'availability': 'answered', 'gradingMode': 'auto', 'kind': 'choice',
                           'acceptedAnswers': [letter], 'normalization': NORMALIZATION},
            'explanationBlocks': [], 'sourceRefs': [ref], 'reviewStatus': 'approved'}


def layout_segments(doc):
    points = []
    main = None
    subsection = 0
    for page in doc['pages']:
        for line in sorted(page['lines'], key=lambda line: (round(line['y'], 3), line['x'])):
            text = line['text'].strip()
            kind = None
            if re.search(r'Listening\s*Comprehension', text, re.I):
                main, kind = 'listening', 'listening-a'
                subsection = 0
            elif re.search(r'Reading\s*Comprehension', text, re.I) or (text.lower() == 'reading' and any(other['text'].strip().lower() == 'comprehension' and abs(other['y'] - line['y']) < .025 for other in page['lines'])):
                main, kind = 'reading', 'reading-a'
                subsection = 0
            elif re.fullmatch(r'(?:Part\s*[IVXl1ⅠⅡⅢⅣ]+\s*)?(?:[O0§©®•◎>›]\s*)?Writing(?:\s*\(.*\))?', text, re.I):
                main, kind = 'writing', 'writing'
            elif re.fullmatch(r'(?:Part\s*[IVXl1ⅠⅡⅢⅣ]+\s*)?(?:[O0§©®•◎>]\s*)?Translation(?:\s*\(.*\))?', text, re.I):
                main, kind = 'translation', 'translation'
            else:
                # Boxed subsection letters frequently OCR as f, /, (C or (l.
                # A short standalone Section heading still has an unambiguous
                # position in the three-section sequence.
                match = re.fullmatch(r'Section\s*.{0,4}', text, re.I)
                if match and main in ['reading', 'listening']:
                    subsection += 1
                    # A boxed A is frequently read as C. Use sequence unless
                    # the actual directions establish that the first heading
                    # visible in the source is B or C (some files omit A).
                    nearby = ' '.join(other['text'] for other in page['lines']
                                      if line['y'] < other['y'] < line['y'] + .15)
                    if main == 'reading' and re.search(r'ten\s+statements|Each\s+statement\s+contains', nearby, re.I):
                        subsection = 2
                    elif main == 'reading' and re.search(r'(?:2|two)\s+passages\s+in\s+this\s+section', nearby, re.I):
                        subsection = 3
                    if subsection > 3:
                        raise ValueError('Repeated section boundary requires source review')
                    if subsection > 1:
                        kind = f'{main}-{chr(ord("a") + subsection - 1)}'
                elif main in ['reading', 'listening'] and re.fullmatch(r'Passage\s+One', text, re.I):
                    kind = f'{main}-c'
                elif main == 'reading' and re.fullmatch(r'Passage\s+Two', text, re.I):
                    kind = 'reading-c2'
            if kind and (not points or points[-1]['kind'] != kind):
                points.append({'kind': kind, 'page': page['number'], 'y': max(.035, line['y'] - .012)})
    segments = {}
    for i, point in enumerate(points):
        end = points[i + 1] if i + 1 < len(points) else {'page': len(doc['pages']), 'y': .945}
        if point['kind'] not in segments:
            segments[point['kind']] = {'start': point, 'end': end}
    return segments


def text_segments(text):
    names = {'writing': 'writing', 'listening comprehension': 'listening',
             'reading comprehension': 'reading', 'translation': 'translation'}
    pattern = re.compile(r'^\s*Part[^\n]{0,16}?\s*(Writing|Listening\s+Comprehension|Reading\s+Comprehension|Translation)\b[^\n]*$', re.I | re.M)
    starts = list(pattern.finditer(text))
    result = {}
    for i, start in enumerate(starts):
        kind = names[re.sub(r'\s+', ' ', start[1].lower())]
        chunk = text[start.end():starts[i+1].start() if i+1 < len(starts) else len(text)]
        if kind in ['reading', 'listening']:
            subsections = list(re.finditer(r'^\s*Section\s+([ABC])\b[^\n]*$', chunk, re.M | re.I))
            if not subsections:
                result[f'{kind}-omitted'] = chunk
            for j, sub in enumerate(subsections):
                result[f'{kind}-{sub[1].lower()}'] = chunk[sub.end():subsections[j+1].start() if j+1 < len(subsections) else len(chunk)]
        else:
            result[kind] = chunk
    if 'reading-c' in result:
        split = re.search(r'^\s*Passage\s+Two\b[^\n]*$', result['reading-c'], re.I | re.M)
        if split:
            result['reading-c2'] = result['reading-c'][split.end():]
            result['reading-c'] = result['reading-c'][:split.start()]
    return result


class EvidenceRenderer:
    def __init__(self, cache, vision=Path('/private/tmp/cet4-vision-ocr-v4')):
        self.cache = cache
        self.vision = vision
        self.docs = {}
        self.assets = {}
        self.cleaned = set()
        self.audit = []
        review_path = Path('src/data/cet4/source-text-review.json')
        self.source_corrections = json.loads(review_path.read_text()).get('pdfCorrections', []) if review_path.exists() else []
        (cache / 'cleaned-images').mkdir(exist_ok=True)
        Path('public/cet4/evidence').mkdir(parents=True, exist_ok=True)

    def vision_json(self, *arguments):
        for attempt in range(2):
            result = subprocess.run([str(self.vision), *map(str, arguments)], capture_output=True, text=True, timeout=90)
            if result.returncode == 0:
                return json.loads(result.stdout)
            if attempt:
                raise ValueError(f'Local OCR failed twice: {arguments[-1]}')

    def load(self, relative):
        if relative not in self.docs:
            sha = digest(SOURCE_ROOT / relative)
            path = self.cache / 'ocr' / f'{sha}.json'
            if not path.exists():
                raise ValueError(f'OCR checkpoint not ready: {relative}')
            doc = json.loads(path.read_text())
            doc['segments'] = layout_segments(doc)
            self.docs[relative] = doc
        return self.docs[relative]

    def segment_text(self, doc, kind):
        segment = doc['segments'].get(kind)
        if not segment:
            return ''
        return '\n'.join(line['text'] for page in doc['pages'] for line in page['lines']
                         if (page['number'], line['y']) >= (segment['start']['page'], segment['start']['y'])
                         and (page['number'], line['y']) < (segment['end']['page'], segment['end']['y']))

    def native_segment_text(self, relative, kind):
        doc = self.load(relative)
        segment = doc['segments'][kind]
        pdf = fitz.open(SOURCE_ROOT / relative)
        chunks = []
        for number in range(segment['start']['page'], segment['end']['page'] + 1):
            start = segment['start']['y'] if number == segment['start']['page'] else .035
            end = segment['end']['y'] if number == segment['end']['page'] else .945
            if end <= start:
                continue
            page = pdf[number - 1]
            chunks.append(page.get_text(clip=fitz.Rect(0, start * page.rect.height, page.rect.width, end * page.rect.height)))
        return '\n'.join(chunks)

    def segment(self, relative, kind, title):
        doc = self.load(relative)
        if kind not in doc['segments']:
            raise ValueError(f'Source section {kind} not located: {relative}')
        segment = doc['segments'][kind]
        pdf = fitz.open(SOURCE_ROOT / relative)
        blocks = []
        for page_number in range(segment['start']['page'], segment['end']['page'] + 1):
            start = segment['start']['y'] if page_number == segment['start']['page'] else .035
            end = segment['end']['y'] if page_number == segment['end']['page'] else .945
            if end - start < .018:
                continue
            page = pdf[page_number - 1]
            corrections = [edit for edit in self.source_corrections if edit['sourceHash'] == doc['sha256'] and edit['page'] == page_number]
            for edit in corrections:
                found = False
                for block in page.get_text('rawdict')['blocks']:
                    for line in block.get('lines', []):
                        for span in line['spans']:
                            text = ''.join(char['c'] for char in span['chars'])
                            if text.startswith(edit['prefix']):
                                char = span['chars'][0]
                                if char['c'] != edit['before']:
                                    raise ValueError('Source correction no longer matches')
                                page.add_redact_annot(fitz.Rect(char['bbox']), fill=(1, 1, 1))
                                page.apply_redactions()
                                page.insert_text(char['origin'], edit['after'], fontsize=span['size'], fontname='tiro')
                                found = True
                if not found:
                    raise ValueError('Reviewed source typo not located')
            clip = fitz.Rect(.035 * page.rect.width, start * page.rect.height,
                             .965 * page.rect.width, end * page.rect.height)
            correction_key = json.dumps(corrections, sort_keys=True) if corrections else ''
            identity = hashlib.sha256(f'clean-v1:{doc["sha256"]}:{page_number}:{start:.6f}:{end:.6f}{correction_key}'.encode()).hexdigest()
            record_path = self.cache / 'cleaned-images' / f'{identity}.json'
            cached_image = self.cache / 'cleaned-images' / f'{identity}.webp'
            output = Path('public/cet4/evidence') / f'{identity[:24]}.webp'
            if record_path.exists() and not output.exists() and cached_image.exists():
                record=json.loads(record_path.read_text())
                if digest(cached_image)!=record['sha256']:raise ValueError('Changed cached evidence image')
                shutil.copyfile(cached_image,output)
            if record_path.exists() and output.exists():
                record = json.loads(record_path.read_text())
                if digest(output) != record['sha256']:
                    raise ValueError('Changed evidence image')
            else:
                pix = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), clip=clip, alpha=False)
                im = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
                removed = []
                draw = ImageDraw.Draw(im)
                for line in doc['pages'][page_number - 1]['lines']:
                    if not has_promotion(line['text']):
                        continue
                    left = (line['x'] * page.rect.width - clip.x0) / clip.width * im.width
                    top = (line['y'] * page.rect.height - clip.y0) / clip.height * im.height
                    right = left + line['w'] * page.rect.width / clip.width * im.width
                    bottom = top + line['h'] * page.rect.height / clip.height * im.height
                    draw.rectangle((left - 4, top - 4, right + 4, bottom + 4), fill='white')
                    removed.append(line['text'])
                temporary = self.cache / 'cleaned-images' / f'{identity}.jpg'
                im.save(temporary, quality=95)
                barcodes = self.vision_json('--barcodes', temporary)['boxes']
                if barcodes:
                    for box in barcodes:
                        draw.rectangle((box['x'] * im.width - 12, box['y'] * im.height - 12,
                                        (box['x'] + box['w']) * im.width + 12,
                                        (box['y'] + box['h']) * im.height + 12), fill='white')
                    im.save(temporary, quality=95)
                # The clean image is checked again, independently of the extraction text.
                check = self.vision_json(temporary)
                residue = [line['text'] for line in check['lines'] if has_promotion(line['text'])]
                if residue:
                    for line in check['lines']:
                        if has_promotion(line['text']):
                            draw.rectangle((line['x'] * im.width - 6, line['y'] * im.height - 6,
                                            (line['x'] + line['w']) * im.width + 6,
                                            (line['y'] + line['h']) * im.height + 6), fill='white')
                            removed.append(line['text'])
                    im.save(temporary, quality=95)
                    check = self.vision_json(temporary)
                    residue = [line['text'] for line in check['lines'] if has_promotion(line['text'])]
                if residue:
                    raise ValueError(f'Promotion residue in {relative} page {page_number}: {residue}')
                im.save(output, format='WEBP', quality=86, method=6)
                record = {'sha256': digest(output), 'sourceHash': doc['sha256'], 'page': page_number,
                          'removedText': removed, 'removedCodes': len(barcodes), 'sourceCorrections':corrections, 'passed': True}
                record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
                temporary.unlink()
            if not cached_image.exists():shutil.copyfile(output,cached_image)
            self.cleaned.add(record['sha256'])
            asset_id = f'cet4-evidence-{identity[:24]}'
            ref = source_ref(title, doc['sha256'], page_number, 'pdf-ocr')
            self.assets[asset_id] = {'assetId': asset_id, 'kind': 'image', 'url': '/' + str(output.relative_to('public')),
                                     'mimeType': 'image/webp', 'sha256': record['sha256'], 'sourceRefs': [ref]}
            blocks.append({'type': 'image', 'assetId': asset_id, 'alt': title})
            self.audit.append({'image': str(output), **record})
        return blocks
