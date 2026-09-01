#!/usr/bin/env python3
"""Rebuild the public senior-high catalog from source-preserving document IR.

The legacy catalog used line-oriented text extraction.  In reading documents
that allowed the last option of one question to absorb the answer section and
the following passage.  This builder accepts only two layouts that can be
checked deterministically against the source document:

* paired grammar prompt / ``答案：`` blocks from the teaching documents;
* ``Passage`` groups with a passage, complete options and a numbered answer map.

Anything else remains in the local audit inventory and is not published.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from senior_high_document_ir import parse_source, source_ref


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path("/Users/shidianjin/Documents/高考英语")
INVENTORY = ROOT / "data" / "senior-high" / "audit" / "inventory.csv"
IR_DIR = ROOT / "data" / "senior-high" / "document-ir"
PUBLIC_CATALOG = ROOT / "public" / "senior-high" / "catalog.json"
AUDIT_REPORT = ROOT / "data" / "senior-high" / "audit" / "clean-catalog-report.json"

QUESTION_RE = re.compile(r"^\s*(\d{1,3})\s*[.．、)]\s*(.+)$")
ANSWER_RE = re.compile(r"^\s*(?:【?答案】?|参考答案)\s*[:：]?\s*(.*)$", re.I)
PASSAGE_RE = re.compile(r"^\s*Passage\s*(\d+)?\s*(.*)$", re.I)
OPTION_RE = re.compile(r"(?:^|\s)([A-F])[.．、)]\s*", re.I)
LEAK_RE = re.compile(r"(?:【?答案】?|参考答案|【?解析】?|语篇解读|Passage\s*\d+)", re.I)
FULL_PAPER_TOKENS = ("仿真卷", "组合卷", "综合检测卷", "综合测评卷", "模拟卷")
READING_TOKENS = ("细节理解", "主旨要义", "推理判断", "推测词义", "猜测词义", "阅读理解")
REGIONS = ("北京", "天津", "上海", "重庆", "广东", "山东", "江苏", "浙江", "福建", "湖北", "湖南", "河北", "河南", "安徽", "江西", "山西", "陕西", "辽宁", "吉林", "黑龙江", "四川", "云南", "贵州", "甘肃", "青海", "海南", "广西", "西藏", "新疆", "宁夏", "内蒙古", "全国", "新高考")


def clean(value: str) -> str:
    value = value.translate(str.maketrans({
        "\U001001b3": "’",
        "\U001001a7": "é",
        "\U00100161": "á",
        "\U001001bf": "®",
        "\U00100cc5": "•",
    }))
    value = value.replace("\r", "\n").replace("\u00a0", " ").replace("\u3000", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def digest(*parts: str) -> str:
    normalized = "\n".join(re.sub(r"\s+", " ", part).strip().lower() for part in parts)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def inventory_rows() -> dict[str, dict[str, str]]:
    with INVENTORY.open(encoding="utf-8-sig", newline="") as handle:
        return {row["source_relpath"]: row for row in csv.DictReader(handle)}


def ensure_ir(row: dict[str, str]) -> dict[str, Any]:
    IR_DIR.mkdir(parents=True, exist_ok=True)
    output = IR_DIR / f"{row['sha256']}.json"
    if output.exists():
        return json.loads(output.read_text(encoding="utf-8"))
    method, content, status = parse_source(Path(row["source_file"]), row["sha256"], False)
    record = {
        "schemaVersion": 1,
        "documentId": row["sha256"],
        "sourceRefs": [source_ref(row)],
        "extension": row["extension"],
        "extractionMethod": method,
        "status": status,
        "extractedAt": datetime.now(timezone.utc).isoformat(),
        "content": content,
    }
    output.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    return record


def document_blocks(record: dict[str, Any]) -> list[str]:
    output: list[str] = []

    def visit(block: dict[str, Any]) -> None:
        if block.get("type") in {"paragraph", "heading"}:
            text = str(block.get("text", "")).strip()
            if text:
                output.append(text)
            return
        if block.get("type") == "table":
            for row in block.get("rows", []):
                for cell in row:
                    for child in cell:
                        visit(child)

    for block in record.get("content", {}).get("blocks", []):
        visit(block)
    return output


def split_answer(raw: str) -> tuple[str, str]:
    raw = raw.strip()
    if not raw:
        return "", ""
    parts = re.split(r"\u3000+|\s{2,}", raw, maxsplit=1)
    if len(parts) == 1:
        parts = re.split(r"\s+(?=(?:句意|根据|此处|由|结合|固定|考查|意为|表示|本题|主语|设空|因为|分析)\s*)", raw, maxsplit=1)
    answer = clean(parts[0]).strip("；;。")
    analysis = clean(parts[1]) if len(parts) > 1 else ""
    if len(answer) > 180 or LEAK_RE.search(answer):
        return "", ""
    return answer, analysis


def topic_from_path(path: str, answer: str, analysis: str) -> str:
    combined = f"{answer} {analysis}"
    direct = [
        ("动词时态和语态", r"动词时态|时态和语态"),
        ("非谓语动词", r"非谓语"),
        ("定语从句", r"定语从句"),
        ("名词性从句", r"名词性从句"),
        ("状语从句和并列句", r"状语从句|并列句"),
        ("特殊句式", r"特殊句式"),
        ("冠词", r"冠词"),
        ("情态动词和虚拟语气", r"情态动词|虚拟语气"),
        ("构词法", r"构词法"),
    ]
    for label, pattern in direct:
        if re.search(pattern, Path(path).name):
            return label
    if "名词数词形容词副词" in path.replace(" ", ""):
        if re.search(r"数词", combined):
            return "数词"
        if re.search(r"形容词|副词|比较级|最高级|作定语|作表语|作状语", combined):
            return "形容词和副词"
        return "名词"
    if "介词和代词" in path.replace(" ", ""):
        if re.search(r"代词|指代|主格|宾格|所有格|反身|关系词", combined):
            return "代词"
        return "介词"
    return "综合语法"


def base_record(row: dict[str, str], stem: str, answer: str, category: str, scope: str, fingerprint: str) -> dict[str, Any]:
    relative = row["source_relpath"]
    return {
        "id": f"{'knowledge' if scope == 'knowledge_only' else 'type_practice'}-{fingerprint[:20]}",
        "title": Path(relative).stem,
        "category": category,
        "content_scope": scope,
        "active": True,
        "review_status": "approved",
        "question_number": 0,
        "display_number": 0,
        "source_question_number": 0,
        "stem": stem,
        "options": [],
        "answer": answer,
        "analysis": "",
        "source_file": relative,
        "source_relpath": relative,
        "source_sha256": row["sha256"],
        "source_section": Path(relative).parent.name,
        "knowledge_topic": "",
        "source_line_start": 0,
        "source_line_end": 0,
        "year": "",
        "region": "",
        "paper": "",
        "fingerprint": fingerprint,
    }


def parse_knowledge(row: dict[str, str], record: dict[str, Any]) -> list[dict[str, Any]]:
    if not row["source_relpath"].startswith("高考精讲精练/") or record.get("status") != "ok":
        return []
    blocks = document_blocks(record)
    items: list[dict[str, Any]] = []
    for index, text in enumerate(blocks):
        question = QUESTION_RE.match(text)
        if not question:
            continue
        answer_index = -1
        answer_match: re.Match[str] | None = None
        for candidate in range(index + 1, min(index + 5, len(blocks))):
            if QUESTION_RE.match(blocks[candidate]):
                break
            match = ANSWER_RE.match(blocks[candidate])
            if match:
                answer_index = candidate
                answer_match = match
                break
        if answer_index < 0 or answer_match is None:
            continue
        extra = [value for value in blocks[index + 1:answer_index] if not re.fullmatch(r"[_＿—\-\s]+", value)]
        stem = clean("\n".join([text, *extra]))
        answer, analysis = split_answer(answer_match.group(1))
        if not answer or not 12 <= len(stem) <= 1200 or LEAK_RE.search(stem):
            continue
        fingerprint = digest(stem, answer)
        item = base_record(row, stem, answer, "grammar_fill", "knowledge_only", fingerprint)
        item.update({
            "analysis": analysis,
            "source_question_number": int(question.group(1)),
            "source_line_start": index + 1,
            "source_line_end": answer_index + 1,
            "knowledge_topic": topic_from_path(row["source_relpath"], answer, analysis),
        })
        items.append(item)
    return items


def region_from(value: str) -> str:
    return next((region for region in REGIONS if region in value), "")


def year_from(value: str) -> str:
    match = re.search(r"(?:19|20)\d{2}", value)
    return match.group(0) if match else ""


def reading_category(path: str) -> str:
    return "reading"


def parse_options(body: str) -> tuple[str, list[dict[str, str]]]:
    markers = list(OPTION_RE.finditer(body))
    if not 2 <= len(markers) <= 6:
        return "", []
    labels = [marker.group(1).upper() for marker in markers]
    if labels != [chr(ord("A") + index) for index in range(len(labels))]:
        return "", []
    stem = clean(body[:markers[0].start()])
    options: list[dict[str, str]] = []
    for index, marker in enumerate(markers):
        end = markers[index + 1].start() if index + 1 < len(markers) else len(body)
        text = clean(body[marker.end():end])
        if not text or len(text) > 500 or LEAK_RE.search(text):
            return "", []
        options.append({"letter": labels[index], "text": text})
    return stem, options


def parse_reading(row: dict[str, str], record: dict[str, Any]) -> list[dict[str, Any]]:
    path = row["source_relpath"]
    if record.get("status") != "ok" or any(token in path for token in FULL_PAPER_TOKENS) or not any(token in path for token in READING_TOKENS):
        return []
    blocks = document_blocks(record)
    passage_starts = [index for index, text in enumerate(blocks) if PASSAGE_RE.match(text) and len(text) <= 160]
    items: list[dict[str, Any]] = []
    for passage_position, start in enumerate(passage_starts):
        stop = passage_starts[passage_position + 1] if passage_position + 1 < len(passage_starts) else len(blocks)
        segment = blocks[start + 1:stop]
        answer_position = next((index for index, text in enumerate(segment) if ANSWER_RE.match(text)), -1)
        if answer_position < 0:
            continue
        question_positions = [index for index, text in enumerate(segment[:answer_position]) if QUESTION_RE.match(text)]
        if not question_positions:
            continue
        passage = clean("\n".join(segment[:question_positions[0]]))
        if not 80 <= len(passage) <= 15000 or LEAK_RE.search(passage):
            continue
        answer_text = " ".join(segment[answer_position:])
        answer_entries = [(int(number), answer.upper()) for number, answer in re.findall(r"(?<!\d)(\d{1,3})\s*[.．、:：]?\s*([A-F])\b", answer_text, re.I)]
        answer_map: dict[int, str] = {}
        for number, answer in answer_entries:
            answer_map.setdefault(int(number), answer.upper())
        question_number_sequence = [int(QUESTION_RE.match(segment[position]).group(1)) for position in question_positions]
        ordered_answers: list[tuple[int, str]] = []
        for candidate in range(max(1, len(answer_entries) - len(question_number_sequence) + 1)):
            window = answer_entries[candidate:candidate + len(question_number_sequence)]
            if [number for number, _answer in window] == question_number_sequence:
                ordered_answers = window
                break
        heading = clean(blocks[start])
        group_fingerprint = digest(row["sha256"], str(start), heading, passage)
        group_id = f"reading-group-{group_fingerprint[:20]}"
        for question_index, question_position in enumerate(question_positions):
            question_stop = question_positions[question_index + 1] if question_index + 1 < len(question_positions) else answer_position
            match = QUESTION_RE.match(segment[question_position])
            if match is None:
                continue
            number = int(match.group(1))
            body = clean(" ".join([match.group(2), *segment[question_position + 1:question_stop]]))
            stem, options = parse_options(body)
            answer = ordered_answers[question_index][1] if ordered_answers else answer_map.get(number, "")
            if not answer or answer not in {option["letter"] for option in options} or not 5 <= len(stem) <= 800 or LEAK_RE.search(stem):
                continue
            fingerprint = digest(passage, stem, "\n".join(option["text"] for option in options), answer)
            item = base_record(row, stem, answer, reading_category(path), "type_practice_only", fingerprint)
            item.update({
                "options": options,
                "source_question_number": number,
                "source_line_start": start + question_position + 2,
                "source_line_end": start + question_stop + 1,
                "passage": passage,
                "group_id": group_id,
                "group_title": heading,
                "year": year_from(heading),
                "region": region_from(heading),
            })
            items.append(item)
    return items


def unique(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for item in items:
        if item["fingerprint"] in seen:
            continue
        seen.add(item["fingerprint"])
        result.append(item)
    return result


def number_items(items: list[dict[str, Any]]) -> None:
    counters: Counter[str] = Counter()
    for item in items:
        key = item["source_relpath"]
        counters[key] += 1
        item["question_number"] = counters[key]
        item["display_number"] = counters[key]


def main() -> int:
    legacy = json.loads(PUBLIC_CATALOG.read_text(encoding="utf-8"))
    rows = inventory_rows()
    knowledge_paths = sorted({item["source_relpath"] for item in legacy.get("knowledge", []) if item["source_relpath"].startswith("高考精讲精练/")})
    practice_paths = sorted({item["source_relpath"] for item in legacy.get("practice", []) if any(token in item["source_relpath"] for token in READING_TOKENS) and not any(token in item["source_relpath"] for token in FULL_PAPER_TOKENS)})
    knowledge: list[dict[str, Any]] = []
    practice: list[dict[str, Any]] = []
    exclusions: list[dict[str, str]] = []
    for scope, paths in (("knowledge", knowledge_paths), ("practice", practice_paths)):
        for path in paths:
            row = rows.get(path)
            if row is None:
                exclusions.append({"source_file": path, "reason": "source missing from inventory"})
                continue
            try:
                record = ensure_ir(row)
                parsed = parse_knowledge(row, record) if scope == "knowledge" else parse_reading(row, record)
            except Exception as error:
                exclusions.append({"source_file": path, "reason": f"IR/parse failure: {type(error).__name__}: {error}"})
                continue
            if not parsed:
                exclusions.append({"source_file": path, "reason": "no complete source-aligned question group"})
                continue
            (knowledge if scope == "knowledge" else practice).extend(parsed)
    knowledge = unique(knowledge)
    practice = unique(practice)
    number_items(knowledge)
    number_items(practice)
    generated_at = datetime.now(timezone.utc).isoformat()
    catalog = {
        "version": 2,
        "generated_at": generated_at,
        "source_root": "高考英语源资料（本地原文件逐块校验）",
        "categories": legacy.get("categories", []),
        "knowledge": knowledge,
        "practice": practice,
        "papers": [],
        "paper_review_count": legacy.get("paper_review_count", 0),
    }
    PUBLIC_CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    AUDIT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_REPORT.write_text(json.dumps({
        "generated_at": generated_at,
        "knowledge_source_count": len(knowledge_paths),
        "practice_source_count": len(practice_paths),
        "knowledge_published": len(knowledge),
        "practice_published": len(practice),
        "practice_groups": len({item["group_id"] for item in practice}),
        "topic_counts": Counter(item["knowledge_topic"] for item in knowledge),
        "category_counts": Counter(item["category"] for item in practice),
        "exclusions": exclusions,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "knowledge": len(knowledge),
        "practice": len(practice),
        "practice_groups": len({item["group_id"] for item in practice}),
        "excluded_sources": len(exclusions),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
