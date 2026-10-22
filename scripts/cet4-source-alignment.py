"""Compare paper/solution content within each sitting to detect swapped variants."""
import argparse
import collections
import json
import math
import re
import subprocess
from functools import lru_cache
from pathlib import Path

from cet4_source_common import SOURCE_ROOT, digest, layout_segments, text_segments

parser = argparse.ArgumentParser()
parser.add_argument('--cache', required=True, type=Path)
args = parser.parse_args()
papers = [paper for name in ['inventory.json', 'legacy-modern-inventory.json']
          for paper in json.loads((args.cache / name).read_text())['papers']]
hashes = {paper['answer']: paper['answerHash'] for paper in papers}
hashes.update({paper['pdf']: paper['paperHash'] for paper in papers if paper['pdf'] == paper['paper']})
STOP = set('the and for that with this from are was were has have had will would could should you your their they them can into than more most some any all not but its our who what which when where why how each one two three been being there these those about also other only very much such well part writing listening reading comprehension translation section directions minutes words least allowed write essay must answer sheet following based given following marked choose choices questions question according new study studies'.split())


def words(text):
    return {word[:-1] if word.endswith('s') and len(word) > 4 else word
            for word in re.findall(r'[a-z]{3,}', text.lower()) if word not in STOP}


def chinese(text):
    text = ''.join(re.findall(r'[\u4e00-\u9fff]', text))
    return {text[i:i+2] for i in range(len(text)-1)}


@lru_cache(maxsize=None)
def sections(relative):
    if not relative.endswith('.pdf'):
        raw = subprocess.run(['/usr/bin/textutil', '-convert', 'txt', '-stdout', str(SOURCE_ROOT / relative)], check=True, capture_output=True, text=True).stdout
        return text_segments(raw)
    sha = hashes.get(relative) or digest(SOURCE_ROOT / relative)
    doc = json.loads((args.cache / 'ocr' / f'{sha}.json').read_text())
    result = {}
    for kind, segment in layout_segments(doc).items():
        result[kind] = '\n'.join(line['text'] for page in doc['pages'] for line in page['lines']
                                 if (segment['start']['page'], segment['start']['y']) <= (page['number'], line['y'])
                                 < (segment['end']['page'], segment['end']['y']))
    return result


report = []
for paper in papers:
    sitting = paper['id'][:-1]
    alternatives = [candidate for candidate in papers if candidate['id'][:-1] == sitting]
    source = sections(paper['pdf'] or paper['paper'])
    for kind, text in source.items():
        if kind not in ['writing', 'translation', 'reading-a', 'reading-b', 'reading-c', 'listening-a', 'listening-b', 'listening-c']:
            continue
        tokens = chinese(text) if kind == 'translation' else words(text)
        if len(tokens) < 12:
            continue
        selected = {'cet4-paper-2026061': 'cet4-paper-2026063', 'cet4-paper-2026062': 'cet4-paper-2026061', 'cet4-paper-2026063': 'cet4-paper-2026062'}.get(paper['id'], paper['id']) if kind == 'writing' else paper['id']
        alternatives_tokens = {candidate['id']: (chinese(sections(candidate['answer']).get(kind, '')) if kind == 'translation' else words(sections(candidate['answer']).get(kind, ''))) for candidate in alternatives}
        frequency = collections.Counter(token for value in alternatives_tokens.values() for token in value)
        weights = {token: 1 + math.log((len(alternatives) + 1) / (frequency[token] + 1)) for token in tokens}
        scores = {pid: round(sum(weights[token] for token in tokens & value) / sum(weights.values()), 3) for pid, value in alternatives_tokens.items()}
        best = max(scores, key=scores.get)
        suspect = best != selected and scores[best] > scores[selected] + .15 and scores[best] > .2
        report.append({'id': paper['id'], 'section': kind, 'selected': selected, 'scores': scores, 'needsReview': suspect})
        if suspect:
            print('ALIGNMENT REVIEW', paper['id'], kind, scores, flush=True)
(args.cache / 'source-alignment-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(f'CHECKPOINT: {len(report)} part comparisons; {sum(item["needsReview"] for item in report)} possible variant swaps', flush=True)
