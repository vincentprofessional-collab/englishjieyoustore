#!/usr/bin/env python3
"""Report New Concept lesson blocks that need source-backed translation review.

This is a content QA aid, not a machine translator. It mirrors the page's
sentence/speaker grouping and reports missing Chinese, Latin OCR residue, and
obvious quote/punctuation artifacts before lessons are treated as reviewed.
"""

from __future__ import annotations

import json
import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/data/new-concept"
SPEAKER = re.compile(r"(^|\s)([A-Z][A-Z .'-]{0,25}:)(?=\s|$|[\"'“”‘’])")
SENTENCE_END = re.compile(r"[.!?。！？][\"'’”’」』)\]]*$")
LATIN = re.compile(r"[A-Za-z]+(?:[.'’\-][A-Za-z]+)*")
SOURCE_ARTIFACT_PATTERNS = (
    ("OCR placeholder or scan debris", re.compile(r"[|{}\[\]]")),
    ("doubled punctuation", re.compile(r"(?<!\.)\.{2}(?!\.)|\?:|:\.")),
    (
        "common OCR letter substitutions",
        re.compile(r"\b(?:Tt|Twill|Tve|Thad|Ican|Ithink|Ihad|gota|moming|thar|tong|Hasche|Whars|Lers)\b", re.I),
    ),
    ("contraction split by OCR spacing", re.compile(r"\b[\w]+[’']\s+(?:ve|re|ll|d|t|m)\b", re.I)),
)
OCR_ARTIFACT_LINE_INDEXES = {
    27: [0], 33: [0, 1, 2], 101: [0, 1], 103: [0], 113: [0],
    127: [0], 133: [0], 137: [0, 1, 2], 139: [0], 141: [0, 1, 2, 3],
}


def load_json(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def normalize_english_line(value: str) -> str:
    """Mirror the display-time OCR repairs applied by src/lib/new-concept.ts."""
    value = re.sub(r"\s+[EFJk]\s*$", "", value)
    for source, target in (
        ("Y.H.A.", "YHA"), ("D.N.", "DN"), ("Iam", "I am"),
        ("Tleft", "I left"), ("Ithink", "I think"), ("Tcome", "I come"),
        ("Thave", "I have"), ("Tm", "I'm"), ("Tve", "I've"), ("T'm", "I'm"),
        ("My wife and J", "My wife and I"),
        ("This is the school building. k", "This is the school building."),
    ):
        value = value.replace(source, target)
    for pattern, replacement in (
        (r"^TIM\s+(?=Yes, sir)", "TIM: "),
        (r"^ANN\s+(?=No, thank you)", "ANN: "),
        (r"\bJENNY No\.", "JENNY: No."),
        (r"\bLINDA Please give", "LINDA: Please give"),
        (r"\bKATE I'm sure", "KATE: I'm sure"),
        (r"^SILL:", "JILL:"), (r"^HLL:", "JILL:"),
        (r"\bMR\.?\s*HALL[,.]\s*", "MR. HALL: "),
        (r"\bMR\.?HALL:", "MR. HALL:"),
        (r"\bMR\. HALL (?=David Hall)", "MR. HALL: "),
    ):
        value = re.sub(pattern, replacement, value)
    return value.strip()


def article_english_lines(lesson: dict) -> list[str]:
    lines = lesson["english"] if lesson["kind"] == "dialogue" else lesson.get("exercise", [])
    if lesson["kind"] == "dialogue":
        ignored = set(OCR_ARTIFACT_LINE_INDEXES.get(lesson["lessonNo"], []))
        lines = [line for index, line in enumerate(lines) if index not in ignored]
        return [normalize_english_line(line) for line in lines]
    return lines


def visible_chinese(value: str) -> str:
    """Match current rendering cleanup so the audit can catch silently blanked text."""
    value = re.sub(r"[A-Za-z][A-Za-z.'’\-]*", "", value)
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"^([\u3400-\u9fff·]+)\s*:\s*", r"\1：", value)
    value = re.sub(r"\s*([，。！？；：、])\s*", r"\1", value)
    value = re.sub(r"^[\s'‘’，。！？；：、]+|[\s'‘’，。！？；：、]+$", "", value)
    return value.strip()


def dialogue_turns(lines: list[str]) -> list[str]:
    turns: list[str] = []
    current = ""
    for line in lines:
        matches = list(SPEAKER.finditer(line))
        if not matches:
            current = " ".join(part for part in (current, line.strip()) if part)
            continue
        leading_end = matches[0].start(2) - (1 if matches[0].group(1) else 0)
        leading = line[:leading_end].strip()
        if leading:
            current = " ".join(part for part in (current, leading) if part)
        for index, match in enumerate(matches):
            if current:
                turns.append(current)
            start = match.start(2) - (1 if match.group(1) else 0)
            end = matches[index + 1].start(2) - (1 if matches[index + 1].group(1) else 0) if index + 1 < len(matches) else len(line)
            current = line[start:end].strip()
    if current:
        turns.append(current)
    return turns


def rendered_blocks(lesson: dict) -> tuple[list[str], bool]:
    lines = article_english_lines(lesson)
    has_speakers = lesson["kind"] == "dialogue" and any(SPEAKER.search(line) for line in lines)
    if has_speakers:
        return dialogue_turns(lines), True

    blocks: list[str] = []
    current = ""
    for index, line in enumerate(lines):
        current = " ".join(part for part in (current, line.strip()) if part)
        if SENTENCE_END.search(line.strip()) or index == len(lines) - 1:
            blocks.append(current)
            current = ""
    return blocks, False


def source_translation_for_block(lesson: dict, block_index: int, speaker_mode: bool) -> str:
    source_lines = lesson.get("chinese", [])
    if speaker_mode:
        return source_lines[block_index] if block_index < len(source_lines) else ""
    english_lines = article_english_lines(lesson)
    start = 0
    block_no = 0
    for index, line in enumerate(english_lines):
        if SENTENCE_END.search(line.strip()) or index == len(english_lines) - 1:
            if block_no == block_index:
                return "".join(source_lines[start : index + 1]) if lesson["kind"] == "dialogue" else ""
            block_no += 1
            start = index + 1
    return ""


def missing_speaker_colons(lesson: dict) -> list[tuple[int, str, str]]:
    """Find known speaker names followed by speech without their colon."""
    lines = article_english_lines(lesson)
    names = {
        match.group(2)[:-1].strip()
        for line in lines
        for match in SPEAKER.finditer(line)
    }
    issues = []
    for index, line in enumerate(lines):
        for name in sorted(names, key=len, reverse=True):
            if re.search(rf"(?<![A-Za-z]){re.escape(name)}\s+(?=[A-Z])", line):
                issues.append((index + 1, line, name))
                break
    return issues


def visible_source_artifacts(lesson: dict) -> list[tuple[int, str]]:
    """Catch scan/OCR defects in source lines that make it to the article UI."""
    ignored = set(OCR_ARTIFACT_LINE_INDEXES.get(lesson["lessonNo"], []))
    issues = []
    for index, line in enumerate(lesson.get("english", [])):
        if index in ignored:
            continue
        for label, pattern in SOURCE_ARTIFACT_PATTERNS:
            if pattern.search(line):
                issues.append((index + 1, f"{label}: {line!r}"))
                break
    return issues


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--strict",
        action="store_true",
        help="exit with status 1 when any lesson needs review, suitable for a release gate",
    )
    args = parser.parse_args()
    book = load_json("level-1.json")
    sentence_overrides = load_json("translations-zh.json")
    turn_overrides = load_json("translations-zh-turns.json")
    flagged = []
    total_blocks = 0

    for lesson in book["lessons"]:
        # Written exercises are not bilingual article transcripts.
        if lesson["kind"] != "dialogue":
            continue
        blocks, speaker_mode = rendered_blocks(lesson)
        total_blocks += len(blocks)
        lesson_no = str(lesson["lessonNo"])
        overrides = turn_overrides if speaker_mode else sentence_overrides
        repaired = overrides.get(lesson_no, [])
        issues = []
        if len(repaired) != len(blocks):
            issues.append((0, [f"translation block count {len(repaired)} does not match article block count {len(blocks)}"]))
        for line_no, line, speaker in missing_speaker_colons(lesson):
            issues.append((0, [f"speaker {speaker!r} may be missing a colon on normalized source line {line_no}"]))
        for line_no, reason in visible_source_artifacts(lesson):
            issues.append((0, [f"English source line {line_no}: {reason}"]))
        for index, _english in enumerate(blocks):
            raw = repaired[index] if index < len(repaired) else source_translation_for_block(lesson, index, speaker_mode)
            visible = visible_chinese(raw)
            reasons = []
            if not visible:
                reasons.append("missing/removed by OCR cleanup")
            # A vehicle registration is an identifier, not untranslated OCR text.
            latin_candidate = re.sub(r"\bLFZ312G\b", "", raw)
            if LATIN.search(latin_candidate):
                reasons.append("Latin/OCR residue in Chinese")
            if re.search(r"(^|\s)[‘’'“”\"]\s*$|\s[‘’'“”\"](?=\s|$)", raw):
                reasons.append("stray quotation mark")
            if (
                raw.count("“") != raw.count("”")
                or raw.count("‘") != raw.count("’")
                or raw.count('"') % 2 != 0
                or raw.count("'") % 2 != 0
            ):
                reasons.append("unbalanced quotation marks")
            if reasons:
                issues.append((index + 1, reasons))
        if issues:
            flagged.append((lesson["lessonNo"], lesson["title"], len(blocks), issues))

    dialogue_count = sum(lesson["kind"] == "dialogue" for lesson in book["lessons"])
    print(f"Book 1: {dialogue_count} audio/dialogue lessons, {total_blocks} rendered text blocks")
    print(f"Needs source review: {len(flagged)} lessons")
    for lesson_no, title, block_count, issues in flagged:
        reasons = sorted({reason for _, block_reasons in issues for reason in block_reasons})
        affected_blocks = ", ".join(str(index) for index, _ in issues if index)
        location = f"blocks {affected_blocks}" if affected_blocks else "source checks"
        print(f"Lesson {lesson_no:03} {title} ({block_count} blocks): {location}; {', '.join(reasons)}")
    print("Semantic accuracy and English/Chinese meaning alignment still require comparison with the authoritative lesson source.")
    if args.strict and flagged:
        sys.exit(1)


if __name__ == "__main__":
    main()
