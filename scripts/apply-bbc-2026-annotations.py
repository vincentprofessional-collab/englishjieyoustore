#!/usr/bin/env python3
"""Apply manually written BBC 2026 phrase annotations after desktop-tool verification."""

import json
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/data/bbc/2026-syntax.json"
TOOL = Path("/Users/shidianjin/Desktop/词性句法标注工具/build.py")
LEVEL_KEYS = tuple(f"level{i}" for i in range(1, 6))


def load_tool():
    if not TOOL.exists():
        raise FileNotFoundError(f"Annotation verifier not found: {TOOL}")
    module = types.ModuleType("bbc_annotation_tool")
    module.__file__ = str(TOOL)
    exec(compile(TOOL.read_text(encoding="utf-8"), str(TOOL), "exec"), module.__dict__)
    return module


def verify_annotation(tool, sentence, annotation):
    """Normalize both verifier APIs to level-keyed spans.

    The current verifier returns flat nodes with a `level`; older versions
    returned separate level1/level2 lists. All indices belong to
    `tool.tokens_of(sentence)`, which merges closed-up hyphen compounds.
    """
    result = tool.verify(sentence, annotation)
    levels = {key: [] for key in LEVEL_KEYS}
    if len(result) == 4:
        nodes, errors, notes, coverage = result
        for node in nodes:
            level = node.get("level")
            if not isinstance(level, int) or not 1 <= level <= len(LEVEL_KEYS):
                raise ValueError(f"Verifier returned an invalid annotation level: {node}")
            levels[f"level{level}"].append({
                "label": node["label"], "start": node["start"], "end": node["end"]
            })
    elif len(result) == 5:
        level1, level2, errors, notes, coverage = result
        levels["level1"] = level1
        levels["level2"] = level2
    else:
        raise ValueError(f"Unsupported annotation verifier response with {len(result)} fields")
    return levels, errors, notes, coverage


def main():
    paths = [Path(value) for value in sys.argv[1:]]
    if not paths:
        raise SystemExit("Usage: python3 scripts/apply-bbc-2026-annotations.py <article-annotation.json> [...]")

    data = json.loads(DATA.read_text(encoding="utf-8"))
    tool = load_tool()
    updated = 0
    checked = 0
    for path in paths:
        if not path.is_absolute():
            path = ROOT / path
        document = json.loads(path.read_text(encoding="utf-8"))
        article_id = document["article_id"]
        if article_id not in data:
            raise ValueError(f"Unknown BBC article: {article_id} ({path})")
        seen = set()
        for item in document["items"]:
            sentence_no = item["sentenceNo"]
            if sentence_no in seen:
                raise ValueError(f"Duplicate sentence {article_id} #{sentence_no}")
            seen.add(sentence_no)
            sentences = data[article_id]
            if sentence_no < 1 or sentence_no > len(sentences):
                raise ValueError(f"Sentence out of range: {article_id} #{sentence_no}")
            sentence = sentences[sentence_no - 1]
            if item.get("text") != sentence["text"]:
                raise ValueError(f"Source text mismatch: {article_id} #{sentence_no}")
            if sentence.get("status") != "draft" or any(sentence.get(key) for key in LEVEL_KEYS):
                raise ValueError(f"Refusing to overwrite an existing annotation: {article_id} #{sentence_no}")

            levels, errors, notes, coverage = verify_annotation(tool, sentence, item)
            checked += 1
            if errors:
                raise ValueError(f"{article_id} #{sentence_no}: {'; '.join(errors)}")
            if notes:
                raise ValueError(f"{article_id} #{sentence_no}: {'; '.join(notes)}")
            # Keep website tokens in the same (hyphen-merged) index space the
            # verifier used. Writing merged-token spans onto the older split
            # token array silently shifted every annotation after a hyphen.
            tokens = tool.tokens_of(sentence)
            if tool.norm("".join(token["text"] for token in tokens)) != tool.norm(sentence["text"]):
                raise ValueError(f"Token/source mismatch after normalization: {article_id} #{sentence_no}")
            sentence["tokens"] = tokens
            for key in LEVEL_KEYS:
                sentence[key] = levels[key]
            sentence["status"] = "reviewed"
            updated += 1
            print(f"verified {article_id} #{sentence_no}: {coverage:.0%} core-token coverage")

    DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    totals = {"reviewed": 0, "draft": 0}
    for sentences in data.values():
        for sentence in sentences:
            totals[sentence["status"]] = totals.get(sentence["status"], 0) + 1
    print(json.dumps({"checked": checked, "updated": updated, **totals}, ensure_ascii=False))
    print(DATA)


if __name__ == "__main__":
    main()
