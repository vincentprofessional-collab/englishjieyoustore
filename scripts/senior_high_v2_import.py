#!/usr/bin/env python3
"""Import real senior-high source samples into the v2 controlled data model.

This importer consumes DocumentIR only.  It never writes to the source tree and
does not publish data; the default output is the private gold directory.
Parsing is intentionally conservative: uncertain structures are marked
review_required instead of inventing answers or HTML.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


REPO = Path(__file__).resolve().parents[1]
ROOT = Path("/Users/shidianjin/Documents/高考英语")
AUDIT = REPO / "data/senior-high/audit"
IR_DIR = REPO / "data/senior-high/document-ir"
GOLD_DIR = REPO / "data/senior-high/v2/gold"
MATRIX = AUDIT / "gold-matrix.json"
INVENTORY = AUDIT / "inventory.csv"
CHECKPOINT = AUDIT / "document-ir.checkpoint.json"

SECTION_RE = re.compile(r"^第[一二三四五六七八九十百]+部分")
QUESTION_RE = re.compile(r"^\s*(\d{1,3})(?:\s*[.．、)]\s*|\s+(?=[A-G][.．、)]))(.*)$")
OPTION_RE = re.compile(r"(?<![A-Za-z0-9])([A-G])[.．、)]\s*")
EXPLANATION_RE = re.compile(r"【\s*(\d{1,3})\s*题详解\s*】")
ANSWER_HEAD_RE = re.compile(r"答案")
AUDIO_PLACEHOLDER_RE = re.compile(r"此处可播放相关音频")
UNDERLINE_RE = re.compile(r"_{2,}\s*(\d{1,3})\s*_{2,}")
# Teacher-book blanks use an ideographic space before their source number.
# Requiring that marker prevents ordinary years, percentages and headings such
# as ``Passage 2`` from becoming answer fields.
IDEOGRAPHIC_BLANK_RE = re.compile(r"\u3000+(\d{1,2})(?=[\u3000 ]+)")
LEADING_ANSWER_RE = re.compile(r"(?:^|\s)(\d{1,3})\s*[.．、]?\s*([A-G])(?=\s|$|[^A-Za-z])")
ANSWER_SHEET_LINE_RE = re.compile(r"^\s*(?:\d{1,3}\s*[.．、]\s*){3,}$")
PAGE_RESIDUE_RE = re.compile(r"^\s*(?:\d{1,3}|[-_·.．…]{2,})\s*$")


def sha_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\u00a0", " ")).strip()


def paragraph(text: str, blank_map: dict[int, str] | None = None) -> dict[str, Any]:
    """Convert source text to controlled runs, retaining explicit blank tokens."""
    value = text.replace("\x00", "")
    blank_map = blank_map or {}
    patterns = [UNDERLINE_RE]
    if blank_map:
        patterns.append(IDEOGRAPHIC_BLANK_RE)
    combined = re.compile("|".join(f"(?:{pattern.pattern})" for pattern in patterns))
    runs: list[dict[str, str]] = []
    cursor = 0
    for match in combined.finditer(value):
        number = next((int(group) for group in match.groups() if group and group.isdigit()), None)
        if number not in blank_map:
            continue
        if match.start() > cursor:
            segment = value[cursor:match.start()]
            if segment.strip():
                runs.append({"type": "text", "text": segment})
        runs.append({"type": "blank", "blankId": blank_map[number]})
        cursor = match.end()
    if cursor < len(value):
        segment = value[cursor:]
        if segment.strip():
            runs.append({"type": "text", "text": segment})
    if not runs and value:
        runs = [{"type": "text", "text": value}]
    return {"type": "paragraph", "runs": runs}


def block_list(raw_blocks: list[dict[str, Any]], blank_map: dict[int, str] | None = None, assets: dict[str, str] | None = None, asset_map: dict[str, str] | None = None) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    assets = asset_map or assets or {}
    for raw in raw_blocks:
        text = raw.get("text", "")
        if raw.get("type") == "table":
            rows = []
            for row in raw.get("rows", []):
                cells = []
                for cell in row:
                    cells.append(block_list(cell, blank_map, assets))
                rows.append({"cells": cells})
            result.append({"type": "table", "rows": rows})
            continue
        if raw.get("type") in {"paragraph", "heading"} and (text.strip() or raw.get("imageTargets")):
            converted = paragraph(text, blank_map)
            if raw.get("type") == "heading" and text:
                converted = {"type": "heading", "level": 2 if raw.get("style") else 3, "text": text}
            result.append(converted)
            for target in raw.get("imageTargets", []):
                asset_id = assets.get(target)
                if asset_id:
                    result.append({"type": "image", "assetId": asset_id, "alt": "source image"})
    return result


def source_ref(relative: str, row: dict[str, str], method: str, paragraph_number: int | None = None) -> dict[str, Any]:
    locator: dict[str, Any] = {}
    if paragraph_number is not None:
        locator["paragraph"] = paragraph_number
    return {
        "sourceDocumentId": row["sha256"],
        "relativePath": relative,
        "sha256": row["sha256"],
        "locator": locator,
        "extractionMethod": method if method in {"docx-xml", "pdf-text", "pptx-xml", "xlsx-cell", "media-manifest", "manual-review"} else "docx-xml",
        "confidence": 0.96 if method == "docx-xml" else 0.9,
    }


class Corpus:
    def __init__(self, root: Path, inventory_path: Path, checkpoint_path: Path):
        self.root = root
        self.inventory = {row["source_relpath"]: row for row in csv.DictReader(inventory_path.open(encoding="utf-8-sig"))}
        checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
        self.records = checkpoint.get("records", {})

    def record(self, relative: str) -> dict[str, Any]:
        row = self.inventory[relative]
        record = self.records[row["sha256"]]
        if record.get("status") != "ok":
            raise ValueError(f"source is not readable: {relative} ({record.get('status')})")
        return record

    def row(self, relative: str) -> dict[str, str]:
        return self.inventory[relative]

    def blocks(self, relative: str) -> list[dict[str, Any]]:
        return self.record(relative).get("content", {}).get("blocks", [])

    def refs(self, relatives: Iterable[str], paragraph_number: int | None = None) -> list[dict[str, Any]]:
        refs = []
        for relative in relatives:
            record = self.record(relative)
            refs.append(source_ref(relative, self.row(relative), record.get("extractionMethod", "docx-xml"), paragraph_number))
        return refs

    def assets(self, relatives: Iterable[str]) -> tuple[list[dict[str, Any]], dict[str, str]]:
        output: list[dict[str, Any]] = []
        target_to_id: dict[str, str] = {}
        for relative in relatives:
            record = self.record(relative)
            content = record.get("content", {})
            for asset in content.get("assets", []):
                asset_id = f"asset-{asset['sha256']}"
                target_to_id[asset.get("packagePath", asset.get("relativePath", ""))] = asset_id
                output.append({
                    "assetId": asset_id,
                    "kind": asset.get("kind", "image"),
                    "url": f"source://{relative}#{asset.get('packagePath', asset.get('relativePath', ''))}",
                    "mimeType": asset.get("mimeType", "application/octet-stream"),
                    "sha256": asset["sha256"],
                    "sourceRefs": self.refs([relative]),
                })
        return unique_by(output, "assetId"), target_to_id

    def media_asset(self, relative: str) -> dict[str, Any]:
        record = self.record(relative)
        asset = record.get("content", {}).get("assets", [{}])[0]
        return {
            "assetId": f"asset-{record['documentId']}",
            "kind": asset.get("kind", "audio"),
            "url": f"source://{relative}",
            "mimeType": asset.get("mimeType", "application/octet-stream"),
            "sha256": record["documentId"],
            "sourceRefs": self.refs([relative]),
        }


def unique_by(values: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result = []
    for value in values:
        if value.get(key) not in seen:
            result.append(value)
            seen.add(value.get(key))
    return result


def text(raw: dict[str, Any]) -> str:
    return raw.get("text", "").replace("\n", " ").strip()


def clean_practice_stimulus(blocks: list[dict[str, Any]], heading_re: re.Pattern[str]) -> list[dict[str, Any]]:
    """Remove duplicated group headings and source answer-sheet/page residue."""
    result = []
    for index, block in enumerate(blocks):
        value = text(block)
        if index == 0 and heading_re.match(value):
            continue
        if ANSWER_SHEET_LINE_RE.match(value) or (PAGE_RESIDUE_RE.match(value) and not IDEOGRAPHIC_BLANK_RE.search(block.get("text", ""))):
            continue
        result.append(block)
    return result


def first_nonempty(blocks: list[dict[str, Any]]) -> str:
    return next((text(block) for block in blocks if text(block)), "")


def paper_title(blocks: list[dict[str, Any]], fallback: str) -> str:
    return next((text(block) for block in blocks[:12] if re.search(r"普通高等学校招生|高考英语", text(block))), first_nonempty(blocks[:5]) or fallback)


def index_of_answer(blocks: list[dict[str, Any]], start: int = 0) -> int | None:
    for index in range(start, len(blocks)):
        if ANSWER_HEAD_RE.search(text(blocks[index])):
            return index
    return None


def parse_options(values: list[str], max_label: str = "G") -> list[dict[str, Any]]:
    options: list[dict[str, Any]] = []
    for value in values:
        matches = list(OPTION_RE.finditer(value))
        # Some source DOCX paragraphs omit the printed ``A.`` marker while
        # retaining the option text immediately before ``B.``.  Recover that
        # visible leading segment as option A instead of silently dropping it.
        if matches and matches[0].group(1) == "B":
            leading = norm(value[:matches[0].start()])
            if leading:
                options.append({"id": "A", "label": "A", "blocks": [paragraph(leading)]})
        for index, match in enumerate(matches):
            label = match.group(1)
            if label > max_label:
                continue
            end = matches[index + 1].start() if index + 1 < len(matches) else len(value)
            option_text = norm(value[match.end():end])
            if option_text:
                options.append({"id": label, "label": label, "blocks": [paragraph(option_text)]})
    return unique_by(options, "id")


def question_starts(blocks: list[dict[str, Any]], allowed: set[int] | None = None) -> list[tuple[int, int, str]]:
    starts = []
    for index, block in enumerate(blocks):
        match = QUESTION_RE.match(text(block))
        if match and (allowed is None or int(match.group(1)) in allowed):
            starts.append((index, int(match.group(1)), match.group(2)))
    return starts


def find_first_by_number(starts: list[tuple[int, int, str]]) -> dict[int, tuple[int, str]]:
    result: dict[int, tuple[int, str]] = {}
    for index, number, remainder in starts:
        result.setdefault(number, (index, remainder))
    return result


def answers_from_blocks(blocks: list[dict[str, Any]], start: int = 0, end: int | None = None) -> dict[int, str]:
    answers: dict[int, str] = {}
    end = end if end is not None else len(blocks)
    # Callers that already scoped ``start`` to the block immediately after an
    # answer heading should begin in answer mode.  Without this, teacher-book
    # passages lost almost every answer even though the source lines were
    # cleanly structured as ``1.C　解析...``.
    answer_mode = start > 0 and bool(ANSWER_HEAD_RE.search(text(blocks[start - 1])))
    for block in blocks[start:end]:
        value = text(block)
        if ANSWER_HEAD_RE.search(value):
            answer_mode = True
            matches = list(LEADING_ANSWER_RE.finditer(value))
            if not matches:
                letter = re.search(r"(?:答案|answer)[】:：]?\s*([A-G])\b", value, re.I)
                if letter:
                    previous = [match for match in (QUESTION_RE.match(text(item)) for item in blocks[start:blocks.index(block)]) if match]
                    if previous:
                        answers[int(previous[-1].group(1))] = letter.group(1).upper()
        if answer_mode:
            for match in re.finditer(r"(?:^|[^\d])?(\d{1,3})\s*[.．、]?\s*([A-G])(?=\s|$|[^A-Za-z])", value):
                answers[int(match.group(1))] = match.group(2).upper()
    return answers


def text_answers_from_blocks(blocks: list[dict[str, Any]], start: int, end: int | None = None) -> dict[int, list[str]]:
    answers: dict[int, list[str]] = {}
    end = end if end is not None else len(blocks)
    for block in blocks[start:end]:
        value = text(block)
        # Teacher editions commonly put one answer and its Chinese explanation
        # on the same line, for example ``1.which　句意:...``.  Capture only
        # the leading Latin answer before the explanation; the older pattern
        # below remains useful for compact multi-answer lines.
        leading = re.match(
            r"^\s*(\d{1,3})\s*[.．、]?\s*([A-Za-z][A-Za-z0-9'’/\-]*(?:[ ]+[A-Za-z][A-Za-z0-9'’/\-]*){0,4})(?=[\u3000\u4e00-\u9fff]|$)",
            value,
        )
        if leading:
            number = int(leading.group(1))
            answer = norm(leading.group(2)).rstrip("。；;，,")
            if answer:
                answers.setdefault(number, []).append(answer)
        for match in re.finditer(r"(?:^|\s)(\d{1,3})\s*[.．、]?\s*([A-Za-z][A-Za-z -]*?)(?=\s+\d{1,3}\s*[.．、]?|$)", value):
            number = int(match.group(1))
            answer = norm(match.group(2)).rstrip("。；;，,")
            if answer and not answer.lower().startswith(("考查", "句意")):
                answers.setdefault(number, []).append(answer)
    return {number: list(dict.fromkeys(values)) for number, values in answers.items()}


def explanation_map(blocks: list[dict[str, Any]]) -> dict[int, list[dict[str, Any]]]:
    markers = [(index, int(match.group(1))) for index, block in enumerate(blocks) for match in [EXPLANATION_RE.search(text(block))] if match]
    result: dict[int, list[dict[str, Any]]] = {}
    for position, (index, number) in enumerate(markers):
        end = markers[position + 1][0] if position + 1 < len(markers) else len(blocks)
        result[number] = block_list(blocks[index + 1:end])
    return result


def blank_ids(numbers: Iterable[int], prefix: str) -> dict[int, str]:
    return {number: f"{prefix}-b{number}" for number in numbers}


def answer_spec_choice(answer: str | None, options: list[dict[str, Any]]) -> dict[str, Any]:
    if answer and answer in {option["id"] for option in options}:
        return {"availability": "answered", "gradingMode": "auto", "kind": "choice", "acceptedAnswers": [answer], "normalization": {"unicodeNfkc": True, "trim": True, "collapseSpaces": True, "caseSensitive": False}}
    return {"availability": "none", "gradingMode": "none", "kind": "none"}


def answer_spec_text(values: list[str] | None) -> dict[str, Any]:
    if values:
        return {"availability": "answered", "gradingMode": "auto", "kind": "per_blank", "perBlankAnswers": {"_": values}, "normalization": {"unicodeNfkc": True, "trim": True, "collapseSpaces": True, "caseSensitive": False}}
    return {"availability": "none", "gradingMode": "none", "kind": "none"}


def question_object(number: int, display_number: int, qtype: str, prompt: list[dict[str, Any]], options: list[dict[str, Any]], blanks: list[dict[str, Any]], placement: dict[str, Any], answer: dict[str, Any], refs: list[dict[str, Any]], explanation: list[dict[str, Any]], fingerprint_seed: str, review: str = "approved") -> dict[str, Any]:
    question = {
        "id": f"q-{display_number}",
        "displayNumber": display_number,
        "sourceQuestionNumber": number,
        "type": qtype,
        "promptBlocks": prompt,
        "placement": placement,
        "options": options,
        "blanks": blanks,
        "answerSpec": answer,
        "explanationBlocks": explanation,
        "sourceRefs": refs,
        "reviewStatus": review,
        "dedupeSignature": {"questionContentFingerprint": sha_text(fingerprint_seed)},
    }
    if answer.get("availability") == "answered":
        question["dedupeSignature"]["answerVariantFingerprint"] = sha_text(f"{fingerprint_seed}|{json.dumps(answer, sort_keys=True)}|{len(explanation)}")
    return question


def group(group_id: str, stimulus: list[dict[str, Any]], questions: list[dict[str, Any]], shared: list[dict[str, Any]] | None = None, title: str | None = None) -> dict[str, Any]:
    value: dict[str, Any] = {"id": group_id, "instructions": [], "stimulusBlocks": stimulus, "sharedOptions": shared or [], "questions": questions}
    if title:
        value["title"] = title
    if shared:
        value["sharedOptionsReusable"] = False
    return value


def section(section_id: str, title_value: str, groups: list[dict[str, Any]], layout: str = "flow", instructions: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    return {"id": section_id, "title": title_value, "instructions": instructions or [], "layout": layout, "groups": groups}


def set_quality(issues: list[str], confidence: float = 0.84) -> dict[str, Any]:
    return {"structureStatus": "review_required" if issues else "approved", "structureConfidence": confidence, "issueCount": len(issues), "issues": issues}


def make_asset_set(corpus: Corpus, relatives: list[str], media: list[str]) -> tuple[list[dict[str, Any]], dict[str, str]]:
    assets, target_map = corpus.assets(relatives)
    for relative in media:
        assets.append(corpus.media_asset(relative))
    return unique_by(assets, "assetId"), target_map


def modern_range_groups(corpus: Corpus, relative: str, all_refs: list[str], asset_map: dict[str, str], answers: dict[int, str], explanations: dict[int, list[dict[str, Any]]], start_number: int, end_number: int, display_offset: int, qtype: str = "single_choice", scope_start: int = 0, scope_end: int | None = None) -> tuple[list[dict[str, Any]], int]:
    blocks = corpus.blocks(relative)[scope_start:scope_end]
    starts = question_starts(blocks, set(range(start_number, end_number + 1)))
    # Exam directions are often numbered 1, 2, 3... before the real questions.
    # Accept a numbered candidate only when its source span contains a genuine
    # option set; otherwise those directions displace the real questions with
    # the same numbers and make the paper impossible to answer.
    first_by_number: dict[int, tuple[int, str]] = {}
    for position, (index, number, remainder) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(blocks)
        marker = index_of_answer(blocks, index + 1)
        if marker is not None and marker < end:
            end = marker
        values = ([remainder] if remainder else []) + [text(block) for block in blocks[index + 1:end] if text(block)]
        if len(parse_options(values, "D")) >= 2:
            first_by_number.setdefault(number, (index, remainder))
    if not first_by_number:
        return [], display_offset
    sorted_starts = sorted(first_by_number.items(), key=lambda item: item[1][0])
    question_records: list[tuple[int, dict[str, Any]]] = []
    for number, (index, remainder) in sorted_starts:
        next_indices = [value[0] for value in first_by_number.values() if value[0] > index]
        end = min(next_indices) if next_indices else len(blocks)
        marker = index_of_answer(blocks, index + 1)
        if marker is not None and marker < end:
            end = marker
        values = []
        if remainder:
            values.append(remainder)
        values.extend(text(block) for block in blocks[index + 1:end] if text(block))
        options = parse_options(values, "D")
        def prompt_before_options(value: str) -> str:
            if AUDIO_PLACEHOLDER_RE.search(value):
                return ""
            option = OPTION_RE.search(value)
            return norm(value[:option.start()] if option else value)

        prompt_text = prompt_before_options(remainder) if remainder else ""
        if not prompt_text:
            prompt_text = next((candidate for value in values for candidate in [prompt_before_options(value)] if candidate), "")
        prompt = [paragraph(prompt_text)] if prompt_text else []
        question_records.append((index, question_object(number, display_offset, qtype, prompt, options, [], {"kind": "standalone"}, answer_spec_choice(answers.get(number), options), corpus.refs(all_refs, index + 1), explanations.get(number, []), f"{relative}|{norm(' '.join(values))}")))
        display_offset += 1
    # Keep every reading passage once and attach only its own questions.  A-D
    # (and Text A-D) headings are reliable boundaries in the source papers;
    # without this split, later articles disappear and unrelated questions are
    # rendered beneath the first passage.
    passage_heading_re = re.compile(r"^(?:(?:Text|Passage|Reading)\s*)?[A-F]$", re.I)
    heading_indices = [index for index, block in enumerate(blocks) if passage_heading_re.match(text(block))]
    grouped_records: dict[int, list[tuple[int, dict[str, Any]]]] = {}
    for index, question in question_records:
        heading = max((value for value in heading_indices if value < index), default=-1)
        grouped_records.setdefault(heading, []).append((index, question))
    groups: list[dict[str, Any]] = []
    for position, (heading, records) in enumerate(sorted(grouped_records.items(), key=lambda item: item[1][0][0]), start=1):
        first_index = records[0][0]
        if heading >= 0:
            stimulus_raw = blocks[heading + 1:first_index]
            title = text(blocks[heading])
        else:
            pre = blocks[:first_index]
            stimulus_raw = [] if any("听力" in text(block) for block in pre) else english_tail(pre)
            title = None
        groups.append(group(f"group-{start_number}-{end_number}-{position}", block_list(stimulus_raw, assets=asset_map), [question for _, question in records], title=title))
    return groups, display_offset


def english_tail(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates = []
    for block in blocks:
        value = text(block)
        if not value:
            continue
        latin = len(re.findall(r"[A-Za-z]", value))
        chinese = len(re.findall(r"[\u4e00-\u9fff]", value))
        if latin >= max(10, chinese * 1.2) or (latin > 0 and len(value) < 50):
            candidates.append(block)
    return candidates


def beijing_paper(corpus: Corpus, sample: dict[str, Any]) -> dict[str, Any]:
    relatives = sample["sources"]
    docs = [value for value in relatives if value.lower().endswith((".docx", ".doc"))]
    primary = next((value for value in docs if "解析卷" in value), docs[0])
    blocks = corpus.blocks(primary)
    assets, asset_map = make_asset_set(corpus, docs, [])
    refs = corpus.refs(relatives)
    reading_start = next((i for i, block in enumerate(blocks) if text(block).startswith("第二部分")), len(blocks))
    writing_start = next((i for i, block in enumerate(blocks) if text(block).startswith("第三部分")), len(blocks))
    first_second = next((i for i in range(0, reading_start) if "第二节" in text(blocks[i])), reading_start)
    reading_second = next((i for i in range(reading_start, writing_start) if "第二节" in text(blocks[i])), writing_start)
    answer_first = answers_from_blocks(blocks, 0, reading_start)
    explanations = explanation_map(blocks)
    issues: list[str] = []
    choice_groups, offset = modern_range_groups(corpus, primary, relatives, asset_map, answer_first, explanation_map(blocks[:reading_start]), 1, 10, 1, scope_start=0, scope_end=first_second)
    if not choice_groups:
        issues.append("Beijing knowledge-use choice questions were not recovered")
    # The three grammar passages use explicit underscores in the original text.
    grammar_raw = blocks[first_second:reading_start]
    grammar_numbers = list(range(11, 21))
    grammar_ids = blank_ids(grammar_numbers, "q-beijing-grammar")
    grammar_answers = text_answers_from_blocks(blocks, first_second, reading_start)
    grammar_questions = []
    for number in grammar_numbers:
        accepted = grammar_answers.get(number, [])
        spec = {"availability": "answered", "gradingMode": "auto", "kind": "per_blank", "perBlankAnswers": {grammar_ids[number]: accepted}, "normalization": {"unicodeNfkc": True, "trim": True, "collapseSpaces": True, "caseSensitive": False}} if accepted else {"availability": "none", "gradingMode": "none", "kind": "none"}
        if not accepted:
            spec = {"availability": "none", "gradingMode": "none", "kind": "per_blank", "perBlankAnswers": {}}
        grammar_questions.append(question_object(number, offset, "inline_fill", [], [], [{"blankId": grammar_ids[number], "answerShape": "word"}], {"kind": "inline", "blankIds": [grammar_ids[number]]}, spec, refs, explanations.get(number, []), f"{primary}|grammar|{number}"))
        offset += 1
    choice_groups.append(group("group-beijing-grammar", block_list(grammar_raw, grammar_ids, asset_map), grammar_questions, title="语法填空"))
    sections = [section("section-knowledge", "第一部分 知识运用", choice_groups, "flow")]
    reading_groups, offset = modern_range_groups(corpus, primary, relatives, asset_map, answers_from_blocks(blocks, reading_start, writing_start), explanation_map(blocks[reading_start:writing_start]), 21, 34, offset, scope_start=reading_start, scope_end=reading_second)
    seven_end = index_of_answer(blocks, reading_second)
    if seven_end is not None:
        seven_raw = blocks[reading_second:seven_end]
        numbers = list(range(35, 40))
        ids = blank_ids(numbers, "q-beijing-seven")
        shared = parse_options([text(block) for block in seven_raw], "G")
        article = [block for block in seven_raw if text(block) and not OPTION_RE.match(text(block))]
        seven_answers = answers_from_blocks(blocks, reading_second, writing_start)
        seven_questions = []
        for number in numbers:
            seven_questions.append(question_object(number, offset, "shared_option_matching", [], [], [{"blankId": ids[number], "answerShape": "sentence"}], {"kind": "inline", "blankIds": [ids[number]]}, answer_spec_choice(seven_answers.get(number), shared), refs, explanations.get(number, []), f"{primary}|seven|{number}"))
            offset += 1
        reading_groups.append(group("group-beijing-seven", block_list(article, ids, asset_map), seven_questions, shared, "七选五"))
    else:
        issues.append("Beijing seven-choice group was not recovered")
    sections.append(section("section-reading", "第二部分 阅读理解", reading_groups, "split"))
    written_starts = [(index + writing_start, number, remainder) for index, number, remainder in question_starts(blocks[writing_start:], set(range(40, 45)))]
    written_by_number = find_first_by_number(written_starts)
    written_questions = []
    written_types = {40: "short_answer", 41: "short_answer", 42: "error_correction", 43: "short_answer", 44: "essay"}
    for number, (index, remainder) in sorted(written_by_number.items(), key=lambda item: item[1][0]):
        next_indexes = [value[0] for value in written_by_number.values() if value[0] > index]
        end = min(next_indexes) if next_indexes else len(blocks)
        answer_at = index_of_answer(blocks, index + 1)
        if answer_at is not None and answer_at < end:
            end = answer_at
        prompt = block_list(blocks[index:end], asset_map=asset_map)
        written_questions.append(question_object(number, offset, written_types[number], prompt, [], [], {"kind": "standalone"}, {"availability": "none", "gradingMode": "none", "kind": "none"}, refs, [], f"{primary}|written|{number}"))
        offset += 1
    sections.append(section("section-writing", "第三部分 书面表达", [group("group-beijing-written", [], written_questions)], "flow"))
    all_refs = corpus.refs(relatives)
    identity = "2025|北京|paper"
    return {"schemaVersion": 2, "id": sample["id"], "kind": "paper", "title": paper_title(blocks, "2025年普通高等学校招生全国统一考试(北京卷)"), "year": "2025", "region": "北京", "variant": "北京卷", "instructions": block_list(blocks[:6], asset_map=asset_map), "timeLimit": 90, "score": 100, "sections": sections, "assetRefs": assets, "sourceRefs": all_refs, "quality": set_quality(issues, 0.84 if not issues else 0.72), "dedupeSignature": {"paperIdentityKey": identity, "answerVariantFingerprint": sha_text("|".join(ref["sha256"] for ref in all_refs))}}


def modern_paper(corpus: Corpus, sample: dict[str, Any]) -> dict[str, Any]:
    relatives = sample["sources"]
    docs = [value for value in relatives if value.lower().endswith((".docx", ".doc"))]
    primary = next((value for value in docs if "解析卷" in value), docs[0])
    if "（北京）" in primary:
        return beijing_paper(corpus, sample)
    media = [value for value in relatives if value.lower().endswith((".mp3", ".mp4"))]
    assets, asset_map = make_asset_set(corpus, docs, media)
    blocks = corpus.blocks(primary)
    is_new_ii = "新高考Ⅱ" in primary
    reading_start = next((i for i, block in enumerate(blocks) if text(block).startswith("第二部分")), 0)
    language_start = next((i for i, block in enumerate(blocks) if text(block).startswith("第三部分")), len(blocks))
    writing_start = next((i for i, block in enumerate(blocks) if text(block).startswith("第四部分")), len(blocks))
    scoped_answers = lambda start, end: answers_from_blocks(blocks, start, end)
    scoped_explanations = lambda start, end: explanation_map(blocks[start:end])
    issues: list[str] = []
    sections: list[dict[str, Any]] = []
    listening_groups, offset = modern_range_groups(corpus, primary, relatives, asset_map, scoped_answers(0, reading_start), scoped_explanations(0, reading_start), 1, 20, 1, scope_start=0, scope_end=reading_start)
    if media and listening_groups:
        listening_groups[0]["stimulusBlocks"].insert(0, {"type": "audio", "assetId": next(asset["assetId"] for asset in assets if asset["kind"] == "audio"), "label": "听力音频"})
    if not listening_groups:
        issues.append("listening questions 1-20 were not structurally recovered")
    sections.append(section("section-listening", "第一部分 听力", listening_groups, "dialogue"))
    reading_end_number = 15 if is_new_ii else 35
    reading_groups, offset = modern_range_groups(corpus, primary, relatives, asset_map, scoped_answers(reading_start, language_start), scoped_explanations(reading_start, language_start), 1 if is_new_ii else 21, reading_end_number, offset, scope_start=reading_start, scope_end=language_start)
    sections.append(section("section-reading", "第二部分 阅读理解", reading_groups, "split"))
    # Seven-choice is a shared-option group with explicit source blank tokens.
    seven_start = next((i for i, block in enumerate(blocks) if "第二节" in text(block) and reading_start <= i < language_start), None)
    seven_end = index_of_answer(blocks, seven_start or 0)
    if seven_start is not None and seven_end is not None:
        seven_raw = blocks[seven_start:seven_end]
        seven_first = 16 if is_new_ii else 36
        numbers = list(range(seven_first, seven_first + 5))
        ids = blank_ids(numbers, "q-seven")
        shared = parse_options([text(block) for block in seven_raw], "G")
        article = [block for block in seven_raw if text(block) and not OPTION_RE.match(text(block))]
        qlist = []
        for number in numbers:
            qlist.append(question_object(number, offset, "shared_option_matching", [], [], [{"blankId": ids[number], "answerShape": "word"}], {"kind": "inline", "blankIds": [ids[number]]}, answer_spec_choice(scoped_answers(seven_start, language_start).get(number), shared), corpus.refs(relatives, seven_start), scoped_explanations(seven_start, language_start).get(number, []), f"{primary}|seven-choice|{number}"))
            offset += 1
        sections[-1]["groups"].append(group("group-seven-choice", block_list(article, ids, asset_map), qlist, shared, "七选五"))
    else:
        issues.append("seven-choice group was not structurally recovered")
    cloze_first, cloze_last = (21, 35) if is_new_ii else (41, 55)
    language_cloze, offset = modern_range_groups(corpus, primary, relatives, asset_map, scoped_answers(language_start, writing_start), scoped_explanations(language_start, writing_start), cloze_first, cloze_last, offset, scope_start=language_start, scope_end=writing_start)
    for item in language_cloze:
        item["title"] = "完形填空"
    language_groups = language_cloze
    grammar_first = 36 if is_new_ii else 56
    grammar_last = 45 if is_new_ii else 65
    grammar_start = next((i for i, block in enumerate(blocks) if UNDERLINE_RE.search(text(block)) and str(grammar_first) in text(block) and language_start <= i < writing_start), None)
    grammar_end = index_of_answer(blocks, grammar_start or 0)
    if grammar_start is not None and grammar_end is not None:
        numbers = list(range(grammar_first, grammar_last + 1))
        ids = blank_ids(numbers, "q-grammar")
        grammar_raw = blocks[grammar_start:grammar_end]
        qlist = []
        text_answers = text_answers_from_blocks(blocks, grammar_end, writing_start)
        for number in numbers:
            accepted = text_answers.get(number) or ([scoped_answers(language_start, writing_start)[number]] if number in scoped_answers(language_start, writing_start) else [])
            spec = {"availability": "answered", "gradingMode": "auto", "kind": "per_blank", "perBlankAnswers": {ids[number]: accepted}, "normalization": {"unicodeNfkc": True, "trim": True, "collapseSpaces": True, "caseSensitive": False}} if accepted else {"availability": "none", "gradingMode": "none", "kind": "none"}
            if not accepted:
                spec = {"availability": "none", "gradingMode": "none", "kind": "per_blank", "perBlankAnswers": {}}
            qlist.append(question_object(number, offset, "inline_fill", [], [], [{"blankId": ids[number], "answerShape": "word"}], {"kind": "inline", "blankIds": [ids[number]]}, spec, corpus.refs(relatives, grammar_start), scoped_explanations(grammar_start, writing_start).get(number, []), f"{primary}|grammar|{number}"))
            offset += 1
        language_groups.append(group("group-grammar-fill", block_list(grammar_raw, ids, asset_map), qlist, title="语法填空"))
    else:
        issues.append("grammar-fill tokens 56-65 were not structurally recovered")
    sections.append(section("section-language", "第三部分 语言运用", language_groups, "flow"))
    writing_numbers = {46, 47} if is_new_ii else {66, 67}
    writing_starts = question_starts(blocks[writing_start:], writing_numbers)
    writing_starts = [(index + writing_start, number, remainder) for index, number, remainder in writing_starts]
    writing_questions = []
    for number, (index, remainder) in sorted(find_first_by_number(writing_starts).items()):
        end_candidates = [value[0] for value in find_first_by_number(writing_starts).values() if value[0] > index]
        end = min(end_candidates) if end_candidates else len(blocks)
        answer_at = index_of_answer(blocks, index + 1)
        if answer_at is not None and answer_at < end:
            end = answer_at
        prompt = block_list(blocks[index:end], asset_map=asset_map)
        reference = block_list(blocks[answer_at + 1:answer_at + 8], asset_map=asset_map) if answer_at is not None else []
        writing_questions.append(question_object(number, offset, "essay", prompt, [], [], {"kind": "standalone"}, {"availability": "answered" if reference else "none", "gradingMode": "manual" if reference else "none", "kind": "reference" if reference else "none", "referenceAnswer": reference} if reference else {"availability": "none", "gradingMode": "none", "kind": "none"}, corpus.refs(relatives, index + 1), [], f"{primary}|writing|{number}"))
        offset += 1
    sections.append(section("section-writing", "第四部分 写作", [group("group-writing", [], writing_questions)], "flow"))
    if len(writing_questions) < 1:
        issues.append("writing prompts were not structurally recovered")
    title = paper_title(blocks, primary.rsplit("/", 1)[-1])
    all_refs = corpus.refs(relatives)
    identity = f"2025|{sample['id']}|paper"
    return {
        "schemaVersion": 2,
        "id": sample["id"],
        "kind": "paper",
        "title": title,
        "year": "2025",
        "region": "北京" if "北京" in primary else "浙江" if "浙江" in primary else "全国",
        "variant": "新高考Ⅰ卷" if "新高考Ⅰ" in primary else "新高考Ⅱ卷" if "新高考Ⅱ" in primary else "1月" if "1月" in primary else "北京卷",
        "instructions": block_list(blocks[1:12], asset_map=asset_map),
        "timeLimit": 120,
        "score": 150,
        "sections": sections,
        "assetRefs": assets,
        "sourceRefs": all_refs,
        "quality": set_quality(issues, 0.9 if not issues else 0.78),
        "dedupeSignature": {"paperIdentityKey": identity, "answerVariantFingerprint": sha_text("|".join(ref["sha256"] for ref in all_refs))},
    }


def practice_inline(corpus: Corpus, sample: dict[str, Any]) -> dict[str, Any]:
    relative = next(value for value in sample["sources"] if value.lower().endswith((".docx", ".doc")))
    blocks = corpus.blocks(relative)
    refs = corpus.refs(sample["sources"])
    assets, asset_map = make_asset_set(corpus, [relative], [value for value in sample["sources"] if value.lower().endswith((".mp3", ".mp4"))])
    is_seven = "十七" in relative or "七选五" in relative
    is_grammar = "十九" in relative or "语法填空" in relative
    if is_seven:
        heading_re = re.compile(r"^(Passage|Reading)\s*\d+", re.I)
        groups: list[dict[str, Any]] = []
        starts = [index for index, block in enumerate(blocks) if heading_re.match(text(block))]
        starts.append(len(blocks))
        display = 1
        for start, stop in zip(starts, starts[1:]):
            passage = blocks[start:stop]
            answer_at = index_of_answer(passage)
            if answer_at is None:
                continue
            body = passage[:answer_at]
            option_at = next((i for i, block in enumerate(body) if OPTION_RE.match(text(block))), len(body))
            article = clean_practice_stimulus(body[:option_at], heading_re)
            shared = parse_options([text(block) for block in body[option_at:]], "G")
            nums = sorted(set(number for block in article if not heading_re.match(text(block)) for number in [int(match.group(1)) for match in IDEOGRAPHIC_BLANK_RE.finditer(block.get("text", ""))]))
            ids = blank_ids(nums, f"{sample['id']}-{start}")
            answer_map = answers_from_blocks(passage, answer_at + 1)
            questions = []
            for number in nums:
                questions.append(question_object(number, display, "shared_option_matching", [], [], [{"blankId": ids[number], "answerShape": "sentence"}], {"kind": "inline", "blankIds": [ids[number]]}, answer_spec_choice(answer_map.get(number), shared), refs, [], f"{relative}|{number}|{norm(' '.join(text(block) for block in article))}"))
                display += 1
            groups.append(group(f"group-{start}", block_list(article, ids, asset_map), questions, shared, text(passage[0])))
        issues = [] if groups else ["seven-choice passages were not structurally recovered"]
        title = "七选五专项训练"
    elif is_grammar:
        groups = []
        starts = [index for index, block in enumerate(blocks) if re.match(r"^Passage\s*\d+", text(block), re.I)]
        starts.append(len(blocks))
        display = 1
        for start, stop in zip(starts, starts[1:]):
            passage = blocks[start:stop]
            answer_at = index_of_answer(passage)
            if answer_at is None:
                continue
            body = clean_practice_stimulus(passage[:answer_at], re.compile(r"^Passage\s*\d+", re.I))
            nums = sorted(set(number for block in body if not re.match(r"^Passage\s*\d+", text(block), re.I) for number in [int(match.group(1)) for match in IDEOGRAPHIC_BLANK_RE.finditer(block.get("text", ""))] if number <= 10))
            ids = blank_ids(nums, f"{sample['id']}-{start}")
            answers = text_answers_from_blocks(passage, answer_at + 1)
            questions = []
            for number in nums:
                accepted = answers.get(number, [])
                spec = {"availability": "answered", "gradingMode": "auto", "kind": "per_blank", "perBlankAnswers": {ids[number]: accepted}, "normalization": {"unicodeNfkc": True, "trim": True, "collapseSpaces": True, "caseSensitive": False}} if accepted else {"availability": "none", "gradingMode": "none", "kind": "per_blank", "perBlankAnswers": {}}
                questions.append(question_object(number, display, "inline_fill", [], [], [{"blankId": ids[number], "answerShape": "word"}], {"kind": "inline", "blankIds": [ids[number]]}, spec, refs, [], f"{relative}|{number}|{norm(' '.join(text(block) for block in body))}"))
                display += 1
            groups.append(group(f"group-{start}", block_list(body, ids, asset_map), questions, title=text(passage[0])))
        issues = [] if groups else ["grammar-fill passages were not structurally recovered"]
        title = "语法填空专项训练"
    else:
        return practice_writing(corpus, sample)
    identity = f"practice|{relative}"
    return {"schemaVersion": 2, "id": sample["id"], "kind": "practice", "title": title, "year": "2025", "region": "全国", "variant": "专项", "instructions": [], "sections": [section("section-practice", title, groups)], "assetRefs": assets, "sourceRefs": refs, "quality": set_quality(issues), "dedupeSignature": {"paperIdentityKey": identity, "answerVariantFingerprint": sha_text(identity)}}


def practice_cloze(corpus: Corpus, sample: dict[str, Any]) -> dict[str, Any]:
    relative = next(value for value in sample["sources"] if value.lower().endswith((".docx", ".doc")))
    blocks = corpus.blocks(relative)
    refs = corpus.refs(sample["sources"])
    assets, asset_map = make_asset_set(corpus, [relative], [])
    starts = [index for index, block in enumerate(blocks) if re.match(r"^Cloze\s*\d+", text(block), re.I)]
    starts.append(len(blocks))
    groups = []
    display = 1
    for start, stop in zip(starts, starts[1:]):
        passage = blocks[start:stop]
        answer_at = index_of_answer(passage)
        body = passage[:answer_at] if answer_at is not None else passage
        option_at = next((i for i, block in enumerate(body) if re.match(r"^\s*\d{1,2}\s*[.．、]", text(block)) and OPTION_RE.search(text(block))), len(body))
        article = clean_practice_stimulus(body[:option_at], re.compile(r"^Cloze\s*\d+", re.I))
        option_values = [text(block) for block in body[option_at:]]
        by_number: dict[int, list[dict[str, Any]]] = {}
        for value in option_values:
            match = re.match(r"^\s*(\d{1,2})\s*[.．、]", value)
            if match:
                by_number[int(match.group(1))] = parse_options([value], "D")
        nums = sorted(by_number)
        ids = blank_ids(nums, f"{sample['id']}-{start}")
        answer_map = answers_from_blocks(passage, answer_at + 1 if answer_at is not None else 0)
        questions = []
        for number in nums:
            options = by_number[number]
            questions.append(question_object(number, display, "single_choice", [], options, [{"blankId": ids[number], "answerShape": "word"}], {"kind": "inline", "blankIds": [ids[number]]}, answer_spec_choice(answer_map.get(number), options), refs, [], f"{relative}|{number}|{norm(' '.join(text(block) for block in article))}"))
            display += 1
        groups.append(group(f"group-{start}", block_list(article, ids, asset_map), questions, title=text(passage[0])))
    issues = [] if groups else ["cloze passages were not structurally recovered"]
    identity = f"practice|{relative}"
    return {"schemaVersion": 2, "id": sample["id"], "kind": "practice", "title": "完形填空专项训练", "year": "2025", "region": "全国", "variant": "专项", "instructions": [], "sections": [section("section-practice", "完形填空专项训练", groups)], "assetRefs": assets, "sourceRefs": refs, "quality": set_quality(issues), "dedupeSignature": {"paperIdentityKey": identity, "answerVariantFingerprint": sha_text(identity)}}


def practice_writing(corpus: Corpus, sample: dict[str, Any]) -> dict[str, Any]:
    relative = next(value for value in sample["sources"] if value.lower().endswith((".docx", ".doc")))
    blocks = corpus.blocks(relative)
    refs = corpus.refs(sample["sources"])
    assets, asset_map = make_asset_set(corpus, [relative], [])
    starts = [index for index, block in enumerate(blocks) if re.match(r"^Writing\s*\d+", text(block), re.I)]
    starts.append(len(blocks))
    questions = []
    display = 1
    for start, stop in zip(starts, starts[1:]):
        passage = blocks[start:stop]
        answer_at = index_of_answer(passage)
        prompt_end = answer_at if answer_at is not None else len(passage)
        reference = block_list(passage[answer_at + 1:answer_at + 8], asset_map=asset_map) if answer_at is not None else []
        questions.append(question_object(display, display, "essay", block_list(passage[:prompt_end], asset_map=asset_map), [], [], {"kind": "standalone"}, {"availability": "answered", "gradingMode": "manual", "kind": "reference", "referenceAnswer": reference} if reference else {"availability": "none", "gradingMode": "none", "kind": "none"}, refs, [], f"{relative}|writing|{display}"))
        display += 1
    title = "概要写作专项训练" if "二十三" in relative else "读后续写专项训练" if "二十二" in relative else "应用文写作专项训练"
    identity = f"practice|{relative}"
    return {"schemaVersion": 2, "id": sample["id"], "kind": "practice", "title": title, "year": "2025", "region": "全国", "variant": "专项", "instructions": [], "sections": [section("section-practice", title, [group("group-writing", [], questions)])], "assetRefs": assets, "sourceRefs": refs, "quality": set_quality([] if questions else ["writing prompts were not structurally recovered"]), "dedupeSignature": {"paperIdentityKey": identity, "answerVariantFingerprint": sha_text(identity)}}


def oral_practice(corpus: Corpus, sample: dict[str, Any]) -> dict[str, Any]:
    relative = next(value for value in sample["sources"] if value.lower().endswith((".docx", ".doc")))
    media = [value for value in sample["sources"] if value.lower().endswith((".mp3", ".mp4"))]
    blocks = corpus.blocks(relative)
    refs = corpus.refs(sample["sources"])
    assets, asset_map = make_asset_set(corpus, [relative], media)
    questions = []
    for number, (title, marker) in enumerate([(text(block), index) for index, block in enumerate(blocks) if re.match(r"^Part\s+[ABC]", text(block), re.I)], start=1):
        end = next((i for i in range(marker + 1, len(blocks)) if re.match(r"^Part\s+[ABC]", text(blocks[i]), re.I)), len(blocks))
        prompt = block_list(blocks[marker:end], asset_map=asset_map)
        questions.append(question_object(number, number, "oral_response", prompt, [], [], {"kind": "standalone"}, {"availability": "none", "gradingMode": "none", "kind": "none"}, refs, [], f"{relative}|{title}"))
    for asset in assets:
        if asset["kind"] in {"audio", "video"}:
            questions[0]["promptBlocks"].insert(0, {"type": asset["kind"], "assetId": asset["assetId"], "label": asset["kind"]})
    identity = f"practice|{relative}"
    return {"schemaVersion": 2, "id": sample["id"], "kind": "practice", "title": "广东听说 Test C", "year": "2020", "region": "广东", "variant": "听说", "instructions": [], "sections": [section("section-oral", "听说及口语", [group("group-oral", [], questions)], "dialogue")], "assetRefs": assets, "sourceRefs": refs, "quality": set_quality([] if questions else ["oral parts were not recovered"]), "dedupeSignature": {"paperIdentityKey": identity, "answerVariantFingerprint": sha_text(identity)}}


def legacy_paper(corpus: Corpus, sample: dict[str, Any]) -> dict[str, Any]:
    relative = sample["sources"][0]
    blocks = corpus.blocks(relative)
    refs = corpus.refs(sample["sources"])
    assets, asset_map = make_asset_set(corpus, [relative], [])
    starts = question_starts(blocks)
    answer_map = answers_from_blocks(blocks)
    explanations = explanation_map(blocks)
    questions = []
    display = 1
    seen: set[int] = set()
    for index, number, remainder in starts:
        if number in seen or number > 200:
            continue
        seen.add(number)
        end = next((other_index for other_index, other_number, _ in starts if other_index > index), len(blocks))
        values = [remainder] + [text(block) for block in blocks[index + 1:end] if text(block)]
        options = parse_options(values, "D")
        if len(options) < 2:
            continue
        questions.append(question_object(number, display, "single_choice", [paragraph(remainder)] if remainder else [], options, [], {"kind": "standalone"}, answer_spec_choice(answer_map.get(number), options), refs, explanations.get(number, []), f"{relative}|{number}|{norm(' '.join(values))}"))
        display += 1
    title = first_nonempty(blocks[:2]) or "2007北京卷"
    identity = f"2007|北京|legacy"
    return {"schemaVersion": 2, "id": sample["id"], "kind": "paper", "title": title, "year": "2007", "region": "北京", "variant": "北京卷（旧题型）", "instructions": block_list(blocks[:5], asset_map=asset_map), "sections": [section("section-legacy", "旧卷综合题型", [group("group-legacy", block_list(english_tail(blocks[:20]), asset_map=asset_map), questions)])], "assetRefs": assets, "sourceRefs": refs, "quality": set_quality([] if questions else ["legacy questions were not structurally recovered"], 0.7), "dedupeSignature": {"paperIdentityKey": identity, "answerVariantFingerprint": sha_text(identity)}}


def import_sample(corpus: Corpus, sample: dict[str, Any]) -> dict[str, Any] | None:
    if sample.get("kind") == "reference":
        return None
    if sample["kind"] == "paper" and sample["id"].startswith("paper-2025"):
        return modern_paper(corpus, sample)
    if sample["id"] == "practice-guangdong-speaking-test-c":
        return oral_practice(corpus, sample)
    if sample["id"] == "paper-2007-beijing-legacy":
        return legacy_paper(corpus, sample)
    if not any(value.lower().endswith((".docx", ".doc")) for value in sample["sources"]):
        return None
    if "十八" in sample["sources"][0] or "完形填空" in sample["sources"][0]:
        return practice_cloze(corpus, sample)
    return practice_inline(corpus, sample)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--matrix", type=Path, default=MATRIX)
    parser.add_argument("--inventory", type=Path, default=INVENTORY)
    parser.add_argument("--checkpoint", type=Path, default=CHECKPOINT)
    parser.add_argument("--out-dir", type=Path, default=GOLD_DIR)
    args = parser.parse_args()
    matrix = json.loads(args.matrix.read_text(encoding="utf-8"))
    corpus = Corpus(ROOT, args.inventory, args.checkpoint)
    args.out_dir = args.out_dir.resolve()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    skipped = []
    for sample in matrix["samples"]:
        try:
            result = import_sample(corpus, sample)
            if result is None:
                skipped.append(sample["id"])
                continue
            target = args.out_dir / f"{result['id']}.json"
            target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
            written.append({"id": result["id"], "path": str(target.relative_to(REPO)), "questionCount": sum(len(g["questions"]) for s in result["sections"] for g in s["groups"]), "structureStatus": result["quality"]["structureStatus"], "issues": result["quality"]["issues"]})
        except Exception as error:
            skipped.append({"id": sample["id"], "reason": f"{type(error).__name__}: {error}"})
    report = {"schemaVersion": 2, "generatedAt": datetime.now(timezone.utc).isoformat(), "matrixStatus": matrix.get("status"), "written": written, "skipped": skipped, "publishable": False}
    report_path = args.out_dir.parent / "gold-import-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"written": len(written), "skipped": len(skipped), "report": str(report_path), "outDir": str(args.out_dir)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
