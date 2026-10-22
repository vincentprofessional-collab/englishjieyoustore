"""Recover tiny printed question numbers from targeted page-margin strips."""
import argparse
import json
import re
import subprocess
from pathlib import Path

import fitz

from cet4_source_common import SOURCE_ROOT

parser = argparse.ArgumentParser()
parser.add_argument('--cache', type=Path, required=True)
parser.add_argument('--legacy-modern', action='store_true')
args = parser.parse_args()
inventory = json.loads((args.cache / ('legacy-modern-inventory.json' if args.legacy_modern else 'inventory.json')).read_text())['papers']
audits = {item['id']: item for item in json.loads((args.cache / ('legacy-modern-answer-audit.json' if args.legacy_modern else 'answer-audit.json')).read_text())}
out = args.cache / 'number-anchors'
out.mkdir(exist_ok=True)
total = 0
for paper in inventory:
    audit = audits.get(paper['id'])
    if not audit:
        continue
    missing = audit['missing']
    # A source intentionally omitting a whole component is not an OCR defect.
    missing = [n for n in missing if not (n <= 25 and all(k in missing for k in range(1, 26)))]
    if not missing or len(audit['keys']) == 0:
        continue
    doc = json.loads((args.cache / 'ocr' / f"{paper['answerHash']}.json").read_text())
    pages = set()
    for n in missing:
        nearby = [ev.get('page') for k, item in audit['keys'].items() if abs(int(k) - n) <= 2
                  for ev in item['evidence'] if ev.get('page')]
        nearby.extend(ev.get('page') for k, items in audit['conflicts'].items() if abs(int(k) - n) <= 1
                      for ev in items if ev.get('page'))
        pages.update(nearby)
    pdf = fitz.open(SOURCE_ROOT / paper['answer'])
    target = out / f"{paper['answerHash']}.json"
    saved = json.loads(target.read_text()) if target.exists() else {'sourceHash': paper['answerHash'], 'pages': {}}
    for number in sorted(pages):
        if str(number) in saved['pages']:
            continue
        page = pdf[number - 1]
        lines = doc['pages'][number - 1]['lines']
        numbered = [line for line in lines if re.match(r'^\s*\d{1,2}\s*[.．]', line['text'])]
        columns = []
        for first, last in [(0, .2), (.48, .65)]:
            positions = [line['x'] for line in numbered if first <= line['x'] < last]
            if positions:
                x0 = max(0, min(positions) - .005)
                columns.append((x0, min(x0 + .043, 1)))
        if not columns:
            columns = [(.04, .083)]
        recovered = []
        for index, (x0, x1) in enumerate(columns):
            clip = fitz.Rect(x0 * page.rect.width, .035 * page.rect.height, x1 * page.rect.width, .945 * page.rect.height)
            temporary = out / f'{paper["id"]}-{number}-{index}.png'
            page.get_pixmap(matrix=fitz.Matrix(5, 5), clip=clip, alpha=False).save(temporary)
            result = json.loads(subprocess.run(['/private/tmp/cet4-vision-ocr-v4', '--numbers', str(temporary)],
                                               check=True, capture_output=True, text=True, timeout=60).stdout)
            temporary.unlink()
            for line in result['lines']:
                match = re.fullmatch(r'\s*(\d{1,2})[.．]?\s*', line['text'])
                if not match or not 1 <= int(match[1]) <= 55 or line['confidence'] < .9:
                    continue
                recovered.append({**line, 'text': match[1] + '.',
                                  'x': x0 + line['x'] * (x1 - x0), 'w': line['w'] * (x1 - x0),
                                  'y': .035 + line['y'] * .91, 'h': line['h'] * .91})
        saved['pages'][str(number)] = recovered
        target.write_text(json.dumps(saved, ensure_ascii=False, indent=2) + '\n')
        total += 1
    print(f'ANCHORS {paper["id"]}: {len(saved["pages"])} targeted pages', flush=True)
print(f'CHECKPOINT: {total} new margin pages', flush=True)
