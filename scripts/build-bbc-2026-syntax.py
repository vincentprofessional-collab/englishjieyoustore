#!/usr/bin/env python3
"""Build local BBC 2026 syntax preview from the existing processor and annotation tool."""

import json
import re
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROCESSOR = Path('/Users/shidianjin/Downloads/bbc_processor/bbc_2026_processor/output/articles')
ANNOTATIONS = Path('/Users/shidianjin/Downloads/bbc_processor/bbc_2026_v2')
TOOL = Path('/Users/shidianjin/Desktop/词性句法标注工具/build.py')
OUTPUT = ROOT / 'src/data/bbc/2026-syntax.json'
HUMAN_FILES = {'001': 'ann_a001_fixed.json', '002': 'ann_a002.json',
               '014': 'ann_a014.json', '020': 'ann_a020.json',
               '029': ROOT / 'scripts/bbc-2026-annotations/029.json'}
LEVEL_KEYS = tuple(f'level{i}' for i in range(1, 6))


def normalize(value):
    return re.sub(r'\s+', '', value.replace('’', "'").replace('‘', "'")
                  .replace('“', '"').replace('”', '"').replace('—', '-')
                  .replace('–', '-'))


def token_view(tokens, offset=0):
    return [{'text': token['text'], 'pos': token['pos'],
             'start': token['start'] - offset, 'end': token['end'] - offset}
            for token in tokens]


def verify_annotation(tool, source, annotation):
    """Normalize old and current verifier return shapes for all 5 levels."""
    result = tool.verify(source, annotation)
    levels = {key: [] for key in LEVEL_KEYS}
    if len(result) == 4:
        nodes, errors, notes, coverage = result
        for node in nodes:
            level = node.get('level')
            if not isinstance(level, int) or not 1 <= level <= len(LEVEL_KEYS):
                raise ValueError(f'Invalid verifier level: {node}')
            levels[f'level{level}'].append({
                'label': node['label'], 'start': node['start'], 'end': node['end']
            })
    elif len(result) == 5:
        level1, level2, errors, notes, coverage = result
        levels['level1'], levels['level2'] = level1, level2
    else:
        raise ValueError(f'Unsupported verifier response with {len(result)} fields')
    return levels, errors, notes, coverage


def load_tool():
    if not TOOL.exists():
        raise FileNotFoundError(f'Annotation verifier not found: {TOOL}')
    module = types.ModuleType('bbc_annotation_tool')
    module.__file__ = str(TOOL)
    exec(compile(TOOL.read_text(encoding='utf-8'), str(TOOL), 'exec'), module.__dict__)
    return module


def preview(source, annotation, tool):
    if annotation:
        levels, errors, _, _ = verify_annotation(tool, source, annotation)
        if errors:
            raise ValueError(f'Invalid reviewed annotation {source["id"]}: {errors}')
        tokens = tool.tokens_of(source)
        token_text = [token['text'] for token in tokens]
        token_pos = [token['pos'] for token in tokens]
        def allowed(span):
            return span['label'] not in tool.RESTRICTED or not tool.check_form(
                token_text, token_pos, span['start'], span['end'], span['label'])
        invalid = [span for key in LEVEL_KEYS for span in levels[key] if not allowed(span)]
        if source['id'].startswith('a001_'):
            # The older a001 sample predates the user's modifier rule.
            kept = {LEVEL_KEYS[0]: [span for span in levels[LEVEL_KEYS[0]] if allowed(span)]}
            for parent_key, child_key in zip(LEVEL_KEYS, LEVEL_KEYS[1:]):
                kept[child_key] = [span for span in levels[child_key] if allowed(span) and any(
                    parent['start'] <= span['start'] and span['end'] <= parent['end']
                    for parent in kept[parent_key])]
            levels = kept
        elif invalid:
            raise ValueError(f'Annotation violates modifier rules: {source["id"]} {invalid}')
        status = 'reviewed'
    else:
        # Drafts must use the same canonical tokenization as reviewed rows;
        # otherwise the editor selection indices can change on first review.
        tokens = tool.tokens_of(source)
        # Old processor spans are unreviewed and often semantically wrong.
        # Show POS while withholding syntax lines until a sentence is checked.
        levels = {key: [] for key in LEVEL_KEYS}
        status = 'draft'
    return {'text': source['text'], 'tokens': token_view(tokens),
            **levels, 'status': status}


def split_source(source, first, second, tool):
    """Split only at a real processor token boundary."""
    target = normalize(first + second)
    if normalize(source['text']) != target:
        raise ValueError(f'Cannot align combined sentence {source["id"]}')
    tokens = tool.tokens_of(source)
    cut = next((i for i in range(1, len(tokens))
                if normalize(''.join(t['text'] for t in tokens[:i])) == normalize(first)), None)
    if cut is None:
        raise ValueError(f'No token boundary for {source["id"]}')
    parts = []
    for start, end, site_text in ((0, cut, first), (cut, len(tokens), second)):
        part_tokens = tokens[start:end]
        if normalize(''.join(t['text'] for t in part_tokens)) != normalize(site_text):
            raise ValueError(f'Split text mismatch: {source["id"]}')
        parts.append({'text': site_text, 'tokens': token_view(part_tokens, part_tokens[0]['start']),
                      **{key: [] for key in LEVEL_KEYS}, 'status': 'draft'})
    return parts


def main():
    tool = load_tool()
    result = {}
    counts = {'articles': 0, 'sentences': 0, 'reviewed': 0, 'draft': 0, 'split': 0}
    for path in sorted(PROCESSOR.glob('*.json')):
        number = path.stem
        source_article = json.loads(path.read_text())
        article_id = source_article['title'][:6]
        site_path = ROOT / 'src/data/bbc/2026' / f'{article_id}.json'
        if not site_path.exists():
            raise ValueError(f'No website article for {path}')
        site = json.loads(site_path.read_text())
        source_sentences = [s for block in source_article['blocks'] for s in block['sentences']]
        site_sentences = site['sentences']
        ann = {}
        if number in HUMAN_FILES:
            ann_path = ANNOTATIONS / HUMAN_FILES[number]
            ann = {item['id']: item for item in json.loads(ann_path.read_text())['items']}
            if len(ann) != len(source_sentences):
                raise ValueError(f'Incomplete reviewed article {number}')
        converted = []
        i = j = 0
        while i < len(source_sentences):
            sentence = source_sentences[i]
            if j >= len(site_sentences):
                raise ValueError(f'Website sentence missing: {article_id}')
            first = site_sentences[j]['english']
            if normalize(sentence['text']) == normalize(first):
                item = preview(sentence, ann.get(sentence['id']), tool)
                item['text'] = first
                converted.append(item)
                j += 1
            elif j + 1 < len(site_sentences):
                converted.extend(split_source(sentence, first, site_sentences[j + 1]['english'], tool))
                counts['split'] += 1
                j += 2
            else:
                raise ValueError(f'Cannot align {sentence["id"]} with {article_id} #{j + 1}')
            i += 1
        if j != len(site_sentences):
            raise ValueError(f'Extra website sentences: {article_id}')
        for index, item in enumerate(converted):
            if normalize(''.join(t['text'] for t in item['tokens'])) != normalize(site_sentences[index]['english']):
                raise ValueError(f'Token text mismatch: {article_id} #{index + 1}')
            counts['sentences'] += 1
            counts[item['status']] += 1
        result[article_id] = converted
        counts['articles'] += 1
    if counts['articles'] != 29 or counts['sentences'] != 600 or counts['split'] != 4:
        raise ValueError(f'Unexpected coverage: {counts}')
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps(counts, ensure_ascii=False))
    print(OUTPUT)


if __name__ == '__main__':
    main()
