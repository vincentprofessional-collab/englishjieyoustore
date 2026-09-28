#!/usr/bin/env python3
"""Apply manually written BBC 2026 phrase annotations after desktop-tool verification."""

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/data/bbc/2026-syntax.json"
TOOL = Path("/Users/shidianjin/Desktop/词性句法标注工具/build.py")


def load_tool():
    if not TOOL.exists():
        raise FileNotFoundError(f"Annotation verifier not found: {TOOL}")
    spec = importlib.util.spec_from_file_location("bbc_annotation_tool", TOOL)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


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
            if sentence.get("status") != "draft" or sentence.get("level1") or sentence.get("level2"):
                raise ValueError(f"Refusing to overwrite an existing annotation: {article_id} #{sentence_no}")

            l1, l2, errors, notes, coverage = tool.verify(sentence, item)
            checked += 1
            if errors:
                raise ValueError(f"{article_id} #{sentence_no}: {'; '.join(errors)}")
            if notes:
                raise ValueError(f"{article_id} #{sentence_no}: {'; '.join(notes)}")
            sentence["level1"] = l1
            sentence["level2"] = l2
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
