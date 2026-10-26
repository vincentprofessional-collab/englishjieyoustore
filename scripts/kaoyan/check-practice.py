#!/usr/bin/env python3
"""Source-backed structural checks for the historical Kaoyan practice sets."""

from __future__ import annotations

import argparse
import importlib.util
import re
from pathlib import Path
from typing import Any


def load_builder(path: Path) -> Any:
    spec = importlib.util.spec_from_file_location("kaoyan_builder", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load corpus builder: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def question_text(question: dict[str, Any]) -> str:
    return "\n".join(
        run.get("text", "")
        for block in question.get("promptBlocks", [])
        for run in block.get("runs", [])
        if run.get("type") == "text"
    ).strip()


def block_text(blocks: list[dict[str, Any]]) -> str:
    return " ".join(
        run.get("text", "")
        for block in blocks
        for run in block.get("runs", [])
        if run.get("type") == "text"
    ).strip()


def questions(set_data: dict[str, Any]) -> list[dict[str, Any]]:
    return [q for section in set_data["sections"] for group in section["groups"] for q in group["questions"]]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, default=Path("/Volumes/My HDD3/备课/考研"))
    args = parser.parse_args()
    source_root = args.source_root.expanduser().resolve()
    builder = load_builder(Path(__file__).with_name("build-corpus.py"))
    records, _audit = builder.old_practice_sets(source_root, source_root / "真题/历年资料库")
    sets = {item["set"]["id"].removeprefix("kaoyan-practice-"): item for item in records}

    expected = {
        "vocabulary": (6, 261),
        "cloze": (33, 536),
        "reading": (38, 640),
        "new-type": (15, 75),
        "translation": (40, 217),
        "writing": (29, 44),
    }
    for category, (paper_count, question_count) in expected.items():
        record = sets[category]
        set_data = record["set"]
        qs = questions(set_data)
        assert record["papers"] == paper_count, (category, record["papers"])
        assert len(qs) == question_count, (category, len(qs))
        assert len({q["id"] for q in qs}) == len(qs), f"{category}: duplicate question IDs"
        assert not set_data.get("assetRefs"), f"{category}: image assets remain"
        for section in set_data["sections"]:
            for group in section["groups"]:
                assert not any(block.get("type") == "image" for block in group.get("stimulusBlocks", [])), f"{category}: image stimulus remains"
                for question in group["questions"]:
                    assert all(block.get("type") != "image" for block in question.get("promptBlocks", [])), f"{category}: image prompt remains"

    for category in ("vocabulary", "cloze", "reading"):
        for question in questions(sets[category]["set"]):
            if question["type"] != "single_choice":
                continue
            assert len(question["options"]) in (4, 5), (category, question["id"])
            assert all(block_text(option.get("blocks", [])) for option in question["options"]), (category, question["id"])

    for section in sets["new-type"]["set"]["sections"]:
        for group in section["groups"]:
            assert len(group["sharedOptions"]) >= 5, section["id"]
            assert all(q["type"] == "shared_option_matching" and len(q["blanks"]) == 1 for q in group["questions"])

    translation = sets["translation"]["set"]
    expected_translation = {1980: list(range(50, 57)), 1988: list(range(61, 69)), 1992: list(range(31, 36)), 2000: list(range(31, 36)), 2001: list(range(41, 46)), 2008: list(range(46, 51)), 2018: list(range(46, 51))}
    for year, numbers in expected_translation.items():
        section = next(s for s in translation["sections"] if s["sourceYear"] == str(year))
        actual = [q["displayNumber"] for group in section["groups"] for q in group["questions"]]
        assert actual == numbers, ("translation", year, actual)
    for question in questions(translation):
        prompt = question_text(question)
        assert prompt and "原题与选项见上方" not in prompt, ("translation", question["id"], prompt[:80])

    writing = sets["writing"]["set"]
    expected_writing = {2001: [46], 2004: [46], 2005: [51, 52], 2008: [51, 52], 2010: [51, 52], 2019: [51, 52]}
    for year, numbers in expected_writing.items():
        section = next(s for s in writing["sections"] if s["sourceYear"] == str(year))
        actual = [q["displayNumber"] for group in section["groups"] for q in group["questions"]]
        assert actual == numbers, ("writing", year, actual)
    for question in questions(writing):
        prompt = question_text(question)
        assert len(prompt) > 100 and not re.search(r"第\s*\d+\s*题写作任务", prompt), ("writing", question["id"], prompt[:80])
    for year, (number, _description) in builder.WRITING_FIGURE_TEXT.items():
        section = next(s for s in writing["sections"] if s["sourceYear"] == str(year))
        question = next(q for group in section["groups"] for q in group["questions"] if q["displayNumber"] == number)
        assert "原卷图示文字版：" in question_text(question), ("writing figure", year)
        assert question.get("sourceRefs"), ("writing figure source", year)

    print("Historical practice structural checks passed: 6 types, 161 papers, 1,773 questions; 23 visual writing prompts converted to source-linked text; all image-free with complete choice structures.")


if __name__ == "__main__":
    main()
