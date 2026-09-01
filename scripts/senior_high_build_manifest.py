#!/usr/bin/env python3
"""Build conservative, source-traceable senior-high content manifests.

The parser only publishes structurally complete items.  Ambiguous material is
kept in the audit report and never silently promoted into a practice bank.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_AUDIT = Path("/Users/shidianjin/ielts-platform/data/senior-high/audit")
DEFAULT_TEXT = Path("/Users/shidianjin/ielts-platform/data/senior-high/source-text")
DEFAULT_OUT = Path("/Users/shidianjin/ielts-platform/data/senior-high")
DEFAULT_WEB_OUT = Path("/Users/shidianjin/ielts-platform/public/senior-high")

QUESTION_RE = re.compile(r"^\s*(\d{1,3})\s*[.．、)]\s*(.*)$")
OPTION_RE = re.compile(r"(?:^|\s)([A-D])[.．、)]\s*(.*?)(?=\s+[A-D][.．、)]\s+|$)")
ANSWER_MARK_RE = re.compile(r"(?m)^\s*(?:【答案】|答案\s*(?:[：:]|是)?)(?=\s*(?:\d{1,3}[.．、:]?|[A-Za-z/]|$))", re.I)
ANALYSIS_MARK_RE = re.compile(r"(?:【解析】|解析\s*[：:])", re.I)
HEADING_RE = re.compile(r"(?:第一|第二|第三|第四|第五|第六|第七|第八|第九|第十|第[一二三四五六七八九十]+)部分|听力|阅读|完形填空|语法填空|短文改错|书面表达|写作|读后续写|概要写作|七选五")
WRITING_RE = re.compile(r"(?m)^\s*(?:Writing|写作)\s*(\d+)\s*$", re.I)
REGIONS = ["北京", "天津", "上海", "重庆", "广东", "山东", "江苏", "浙江", "福建", "湖北", "湖南", "河北", "河南", "安徽", "江西", "山西", "陕西", "辽宁", "吉林", "黑龙江", "四川", "云南", "贵州", "甘肃", "青海", "海南", "广西", "西藏", "新疆", "宁夏", "内蒙古", "全国", "新高考"]


def public_item(item: dict[str, Any]) -> dict[str, Any]:
    """Keep provenance useful without publishing the workstation path."""
    result = dict(item)
    result["source_file"] = item["source_relpath"]
    return result


def public_paper(paper: dict[str, Any]) -> dict[str, Any]:
    result = dict(paper)
    result["source_file"] = paper["source_relpath"]
    result["source_alternates"] = [Path(path).name for path in paper.get("source_alternates", [])]
    result["questions"] = [public_item(item) for item in paper.get("questions", [])]
    return result


def clean_text(value: str) -> str:
    value = value.replace("\r", "\n").replace("\u00a0", " ").replace("\u3000", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def fingerprint(*parts: str) -> str:
    normalized = "\n".join(re.sub(r"\s+", " ", part or "").strip().lower() for part in parts)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def year_for(path: str, text: str) -> str:
    for candidate in [Path(path).name, Path(path).parent.name, path]:
        match = re.search(r"(?:19|20)\d{2}", candidate)
        if match:
            return match.group(0)
    match = re.search(r"(?:19|20)\d{2}", text[:1500])
    return match.group(0) if match else ""


def region_for(path: str) -> str:
    for region in REGIONS:
        if region in path:
            return region
    return ""


def paper_title_for(path: str) -> str:
    title = Path(path).stem
    title = re.sub(r"[（(](?:解析|空白|原卷|答案|试题|听力|无听力|机考)[^）)]*[）)]", "", title)
    title = re.sub(r"(?:解析版|解析卷|空白卷|原卷版|答案卷|含答案|答案及解析|及答案|试题及答案)", "", title)
    title = re.sub(r"[_\-\s]+$", "", title)
    return title.strip() or Path(path).parent.name


def category_for(path: str, context: str = "") -> str:
    path_haystack = path.lower()
    haystack = f"{path} {context}".lower()
    if "听说" in path_haystack or re.search(r"\btest\s*[a-e]\b", path_haystack, re.I):
        return "speaking_listening"
    if "听力" in path_haystack:
        return "listening"
    if "语音" in path_haystack:
        return "pronunciation"
    if any(token in path_haystack for token in ["阅读", "细节理解", "推理判断", "主旨要义", "推测词义"]):
        return "reading"
    if "七选五" in haystack or "阅读补全" in haystack:
        return "seven_choice"
    if "完形" in haystack:
        return "cloze"
    if "语法填空" in haystack or "语言运用" in haystack or "语法" in haystack:
        return "grammar_fill"
    if "短文改错" in haystack:
        return "error_correction"
    if "读后续写" in haystack:
        return "continuation_writing"
    if "概要写作" in haystack:
        return "summary_writing"
    if "书面表达" in haystack or "应用文" in haystack or "写作" in haystack:
        return "writing"
    if "阅读" in haystack:
        return "reading"
    return "other"


KNOWLEDGE_TOPIC_RULES = [
    ("名词性从句", "名词性从句"),
    ("名词", r"名词(?!性)"),
    ("数词", "数词"),
    ("形容词和副词", "形容词|副词"),
    ("代词", "代词"),
    ("冠词", "冠词"),
    ("介词", "介词"),
    ("构词法", "构词法"),
    ("动词时态和语态", "动词时态|时态和语态|语态"),
    ("非谓语动词", "非谓语"),
    ("情态动词和虚拟语气", "情态动词|虚拟语气"),
    ("定语从句", "定语从句"),
    ("状语从句和并列句", "状语从句|并列句"),
    ("特殊句式", "特殊句式"),
    ("主谓一致", "主谓一致"),
    ("词汇与短语", "词汇|短语"),
]


def knowledge_topic_for(path: str, category: str) -> str:
    """Derive a stable teaching topic from the source title, not the stem."""
    haystack = Path(path).stem
    matched = [label for label, pattern in KNOWLEDGE_TOPIC_RULES if re.search(pattern, haystack)]
    if matched:
        # Preserve a combined source lesson as one coherent group, while
        # keeping common standalone topics together across source files.
        return "、".join(dict.fromkeys(matched))
    if category == "speaking_listening":
        return "听说表达"
    if category == "writing":
        return "写作表达"
    return "综合语法"


def section_knowledge_topic(lines: list[str], start: int) -> str:
    """Use a nearby explicit 考点 heading when a source combines topics."""
    for line in reversed(lines[max(0, start - 100):start]):
        match = re.match(r"^\s*考点\s*[一二三四五六七八九十\d]+\s*[、.．:]?\s*(.+?)\s*$", line)
        if not match:
            continue
        heading = match.group(1)
        for label, pattern in KNOWLEDGE_TOPIC_RULES:
            if re.search(pattern, heading):
                return label
    return ""


def scope_for_practice(path: str, default_scope: str) -> str:
    haystack = path.lower()
    if default_scope not in {"knowledge_only_candidate", "type_practice_only_candidate"}:
        return "review_required"
    if any(token in haystack for token in ["试题word", "考点集训", "方法集训", "专题资料包"]):
        return "type_practice_only"
    if any(token in haystack for token in ["高考短语", "高考长难句", "高考精讲精练", "高中短语", "高中词汇", "词汇1-20", "专题电子书", "讲解ppt", "考点清单"]):
        return "knowledge_only"
    return "review_required"


def answer_maps(text: str) -> list[dict[str, Any]]:
    markers = list(ANSWER_MARK_RE.finditer(text))
    result: list[dict[str, Any]] = []
    for index, marker in enumerate(markers):
        end = min(len(text), markers[index + 1].start() if index + 1 < len(markers) else marker.end() + 1800)
        analysis_start = ANALYSIS_MARK_RE.search(text, marker.end(), end)
        if analysis_start:
            end = min(end, analysis_start.start())
        block = text[marker.end():end]
        matches = list(re.finditer(r"(?<!\d)(\d{1,3})\s*[.．、:：]?\s*([A-D])\b", block, re.I))
        if matches:
            answers: list[dict[str, Any]] = []
            for match in matches:
                answers.append({"question_number": int(match.group(1)), "answer": match.group(2).upper(), "inline_analysis": ""})
            result.append({"start": marker.start(), "end": marker.end(), "answers": answers})
        else:
            # A single non-choice answer can still be a valid grammar/writing
            # item.  The caller assigns it only when exactly one question is in
            # the local block.
            value = re.sub(r"\s+", " ", block).strip(" \n\t")
            # A plain "答案 ..." line is sometimes followed immediately by
            # the next numbered prompt when text extraction lost a newline.
            value = re.split(r"\s+\d{1,3}[.．、)]\s*", value, maxsplit=1)[0].strip()
            if value and len(value) <= 240:
                english = re.match(r"([A-Za-z][A-Za-z0-9 /.'-]{0,80}?)(?=\s*[\u3400-\u9fff]|\s*$)", value)
                answer = english.group(1).strip() if english else value
                inline_analysis = value[len(answer):].strip(" ;；，,。") if english else ""
                repeated = re.match(r"^([A-Za-z]+)\s+\1\b\s*(.*)$", answer, re.I)
                if repeated:
                    answer = repeated.group(1)
                    inline_analysis = (repeated.group(2) + " " + inline_analysis).strip()
                result.append({"start": marker.start(), "end": marker.end(), "answers": [{"question_number": None, "answer": answer, "inline_analysis": inline_analysis}]})
    return result


def parse_question_blocks(text: str, source_path: str, source_sha: str, default_category: str, allow_answer_only: bool = False) -> list[dict[str, Any]]:
    text = clean_text(text)
    lines = text.splitlines()
    line_offsets: list[int] = []
    offset = 0
    for line in lines:
        line_offsets.append(offset)
        offset += len(line) + 1
    starts: list[tuple[int, int, str, int]] = []
    for index, line in enumerate(lines):
        match = QUESTION_RE.match(line)
        if not match:
            continue
        number = int(match.group(1))
        if number > 200:
            continue
        lookahead = "\n".join(lines[index:index + 10])
        if len(OPTION_RE.findall(lookahead)) < 2 and not re.search(r"(?:填入|填空|改错|续写|写作|翻译)", lookahead, re.I):
            if not allow_answer_only or not ANSWER_MARK_RE.search("\n".join(lines[index:index + 8])):
                continue
        if re.match(r"^\s*(?:答案|【答案】)", line, re.I):
            continue
        starts.append((index, number, match.group(2), line_offsets[index]))
    answer_entries = answer_maps(text)
    questions: list[dict[str, Any]] = []
    for position, (start, number, first_line, char_start) in enumerate(starts):
        stop = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        chunk = lines[start:stop]
        question_line_end = 1
        while question_line_end < len(chunk) and not OPTION_RE.search(chunk[question_line_end]) and not ANSWER_MARK_RE.match(chunk[question_line_end]):
            question_line_end += 1
        stem = " ".join(part.strip() for part in chunk[:question_line_end] if part.strip())
        options: list[dict[str, str]] = []
        option_text = " ".join(part.strip() for part in chunk[question_line_end:] if part.strip())
        for option in OPTION_RE.finditer(option_text):
            options.append({"letter": option.group(1).upper(), "text": clean_text(option.group(2))})
        if len(options) < 2 and not (allow_answer_only or re.search(r"(?:填入|填空|改错|续写|写作|翻译)", stem, re.I)):
            continue
        if allow_answer_only and len(options) < 2 and not re.search(r"_{2,}|\([A-Za-z][A-Za-z ]*\)|[?？]", stem):
            continue
        next_group = next((group for group in answer_entries if group["start"] >= char_start), None)
        answer = ""
        inline_analysis = ""
        if next_group:
            if allow_answer_only and next_group["start"] - char_start > 900:
                next_group = None
        if next_group:
            group_start = next_group["start"]
            previous_group_end = 0
            for group in answer_entries:
                if group is next_group:
                    break
                previous_group_end = group["end"]
            nearby = [candidate for candidate in starts if previous_group_end <= candidate[3] < group_start]
            exact = [entry for entry in next_group["answers"] if entry.get("question_number") == number]
            if exact and len(exact) == 1:
                answer = exact[0]["answer"]
                inline_analysis = exact[0].get("inline_analysis", "")
            elif len(next_group["answers"]) == 1 and (len(nearby) <= 1 or not next_group["answers"][0].get("question_number")):
                answer = next_group["answers"][0]["answer"]
                inline_analysis = next_group["answers"][0].get("inline_analysis", "")
            elif nearby:
                relative = next((index for index, candidate in enumerate(nearby) if candidate[3] == char_start), 0)
                if relative < len(next_group["answers"]):
                    answer = next_group["answers"][relative]["answer"]
                    inline_analysis = next_group["answers"][relative].get("inline_analysis", "")
        category = category_for(source_path, "\n".join(lines[max(0, start - 50):start]) + "\n" + stem)
        if category == "other":
            category = default_category
        digest = fingerprint(stem, "\n".join(item["text"] for item in options), answer)
        questions.append({
            "question_number": number,
            "stem": clean_text(stem),
            "options": options,
            "answer": answer,
            "analysis": inline_analysis,
            "category": category,
            "source_line_start": start + 1,
            "source_line_end": stop,
            "fingerprint": digest,
            "source_file": source_path,
            "source_sha256": source_sha,
            "knowledge_topic": section_knowledge_topic(lines, start) or knowledge_topic_for(source_path, category),
        })
    # Conservative association: use analysis text between the nearest answer
    # marker and the next answer marker.  It is retained as source evidence;
    # practice/knowledge publication keeps analysis when present, but only a
    # complete stem/answer is required for publication.
    analysis_markers = list(ANALYSIS_MARK_RE.finditer(text))
    answer_markers = list(ANSWER_MARK_RE.finditer(text))
    for position, item in enumerate(questions):
        approx = text.find(item["stem"][:60])
        if allow_answer_only and item["analysis"]:
            # The explanation is part of the extracted answer line (the
            # common format in the grammar teaching notes).
            continue
        if allow_answer_only:
            current_start = line_offsets[item["source_line_start"] - 1] if item["source_line_start"] - 1 < len(line_offsets) else 0
            next_start = questions[position + 1]["source_line_start"] - 1 if position + 1 < len(questions) else len(line_offsets)
            next_char = line_offsets[next_start] if next_start < len(line_offsets) else len(text)
            local_markers = [marker for marker in analysis_markers if current_start <= marker.start() < next_char]
            if local_markers:
                marker = local_markers[0]
                end = min(next_char, len(text))
                item["analysis"] = clean_text(text[marker.end():end])
            continue
        prior = [marker for marker in analysis_markers if marker.start() >= max(0, approx - 10000) and marker.start() <= approx + 10000]
        if prior:
            marker = prior[-1]
            next_answer = next((candidate for candidate in answer_markers if candidate.start() > marker.end()), None)
            end = next_answer.start() if next_answer else min(len(text), marker.end() + 5000)
            item["analysis"] = clean_text(text[marker.end():end])
        elif analysis_markers:
            item["analysis"] = clean_text(text[analysis_markers[0].end():min(len(text), analysis_markers[0].end() + 3000)])
    return questions


def expected_question_count(text: str) -> int:
    counts = [int(value) for value in re.findall(r"共\s*(\d+)\s*小题", text)]
    if not counts:
        return 0
    total = sum(value for value in counts if value <= 100)
    return total if total >= max(counts) * 1.5 else max(counts)


def parse_writing_blocks(text: str, source_path: str, source_sha: str) -> list[dict[str, Any]]:
    text = clean_text(text)
    headings = list(WRITING_RE.finditer(text))
    records: list[dict[str, Any]] = []
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        block = text[heading.end():end].strip()
        answer = ANSWER_MARK_RE.search(block)
        version = re.search(r"(?:One possible version|参考范文)\s*[:：]?", block, re.I)
        if not answer or not version or version.start() <= answer.start():
            continue
        prompt = clean_text(block[:answer.start()])
        explanation = clean_text(block[answer.end():version.start()])
        answer_text = clean_text(block[version.end():])
        answer_text = re.split(r"(?:精彩语句|精美词汇|Writing\s*\d+)", answer_text, maxsplit=1, flags=re.I)[0].strip()
        if len(prompt) < 30 or len(answer_text) < 30:
            continue
        records.append({
            "question_number": int(heading.group(1)),
            "stem": prompt,
            "options": [],
            "answer": answer_text,
            "analysis": explanation,
            "category": "writing",
            "source_line_start": text[:heading.start()].count("\n") + 1,
            "source_line_end": text[:heading.start()].count("\n") + block.count("\n") + 1,
            "fingerprint": fingerprint(prompt, answer_text, explanation),
            "source_file": source_path,
            "source_sha256": source_sha,
        })
    return records


def source_rows(audit: Path, text_dir: Path) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    with (audit / "inventory.csv").open(encoding="utf-8-sig", newline="") as handle:
        inventory = list(csv.DictReader(handle))
    with (audit / "text-manifest.csv").open(encoding="utf-8-sig", newline="") as handle:
        text_rows = {row["sha256"]: row for row in csv.DictReader(handle)}
    return inventory, text_rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", type=Path, default=DEFAULT_AUDIT)
    parser.add_argument("--text", type=Path, default=DEFAULT_TEXT)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--web-out", type=Path, default=DEFAULT_WEB_OUT)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    inventory, text_rows = source_rows(args.audit.resolve(), args.text.resolve())
    by_sha = {row["sha256"]: row for row in inventory if row.get("sha256")}
    paper_candidates: list[dict[str, Any]] = []
    practice_candidates: list[dict[str, Any]] = []
    audit_exclusions: list[dict[str, Any]] = []
    for digest, text_row in sorted(text_rows.items()):
        source = by_sha.get(digest)
        if not source or text_row.get("status") not in {"ok", "ok_archive_listing"}:
            continue
        path = source["source_file"]
        extension = source["extension"]
        if extension not in {".doc", ".docx", ".pdf", ".pptx", ".xlsx"}:
            continue
        if text_row.get("status") == "ok_archive_listing":
            audit_exclusions.append({"source_file": path, "scope": "review_required", "reason": "archive listing only; inner documents were not promoted"})
            continue
        content = Path(text_row["output_file"]).read_text(encoding="utf-8", errors="replace")
        if len(content.strip()) < 80:
            audit_exclusions.append({"source_file": path, "scope": source["candidate_scope"], "reason": "empty or too-short extracted text"})
            continue
        is_practice_source = source["candidate_scope"] in {"knowledge_only_candidate", "type_practice_only_candidate"}
        if source["candidate_scope"] == "paper_only_candidate" and extension in {".doc", ".docx", ".pdf"}:
            mixed_53 = "新高考版高考总复习" in path and "5年高考" in Path(path).name and not any(token in path for token in ["仿真卷", "组合卷"])
            if mixed_53:
                audit_exclusions.append({"source_file": path, "scope": "review_required", "reason": "5年高考/3年模拟 mixed source is not a complete paper"})
                continue
            if not re.search(r"解析|答案|详解|试题及答案|真题解析|解析版|答案卷", Path(path).name + content[:5000]):
                audit_exclusions.append({"source_file": path, "scope": "paper_only", "reason": "paper source has no reliable answer/analysis marker"})
                continue
            paper_candidates.append({"source": source, "content": content, "text_row": text_row})
        elif is_practice_source:
            practice_candidates.append({"source": source, "content": content, "text_row": text_row})

    # A paper identity groups blank/answer copies before publication.  The
    # richest parse wins, while all source paths remain in provenance.
    paper_groups: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in paper_candidates:
        path = candidate["source"]["source_file"]
        year = year_for(path, candidate["content"])
        region = region_for(path)
        key = fingerprint(year, region, paper_title_for(path))[:20]
        candidate["paper_key"] = key
        candidate["questions"] = parse_question_blocks(candidate["content"], path, candidate["source"]["sha256"], "other")
        paper_groups[key].append(candidate)

    papers: list[dict[str, Any]] = []
    paper_items: list[dict[str, Any]] = []
    for key, candidates in sorted(paper_groups.items()):
        chosen = max(candidates, key=lambda item: (sum(bool(q["answer"]) for q in item["questions"]), sum(bool(q["analysis"]) for q in item["questions"]), len(item["questions"])))
        questions = chosen["questions"]
        answered = sum(bool(q["answer"]) for q in questions)
        analyzed = sum(bool(q["analysis"]) for q in questions)
        source_numbers = [q["question_number"] for q in questions]
        number_min = min(source_numbers, default=0)
        number_max = max(source_numbers, default=0)
        number_density = len(set(source_numbers)) / max(1, number_max - number_min + 1)
        raw_expected = expected_question_count(chosen["content"])
        # Some answer documents repeat section headings in their analysis;
        # never let that inflate the expected count beyond the largest source
        # question number.
        expected = min(raw_expected, number_max) if raw_expected else 0
        minimum_expected = max(15, int(expected * 0.75)) if expected else max(20, int(number_max * 0.75))
        complete_enough = (
            len(questions) >= minimum_expected
            and answered / max(1, len(questions)) >= 0.9
            and number_min <= 2
            and number_max >= 40
            # A full paper must not silently lose a numbered question.  A
            # sparse parse belongs in the audit report until its source layout
            # is reviewed, even when the remaining questions look plausible.
            and number_density >= 0.99
        )
        paper_id = f"paper-{key}"
        year = year_for(chosen["source"]["source_file"], chosen["content"])
        region = region_for(chosen["source"]["source_file"])
        paper_title = paper_title_for(chosen["source"]["source_file"])
        normalized_questions: list[dict[str, Any]] = []
        seen_numbers: set[int] = set()
        for item in questions:
            if item["question_number"] in seen_numbers:
                continue
            seen_numbers.add(item["question_number"])
            item = dict(item)
            item.update({
                "id": f"{paper_id}-q{item['question_number']}",
                "paper_id": paper_id,
                "display_number": len(normalized_questions) + 1,
                "source_question_number": item["question_number"],
                "content_scope": "paper_only",
                "review_status": "approved" if complete_enough and item["answer"] else "review_required",
                "active": bool(complete_enough and item["answer"]),
            })
            normalized_questions.append(item)
            if item["active"]:
                paper_items.append(item)
        papers.append({
            "id": paper_id,
            "title": paper_title,
            "year": year,
            "region": region or "其他地区",
            "paper": paper_title,
            "source_file": chosen["source"]["source_file"],
            "source_relpath": chosen["source"]["source_relpath"],
            "source_sha256": chosen["source"]["sha256"],
            "source_alternates": [item["source"]["source_file"] for item in candidates if item is not chosen],
            "question_count": len(normalized_questions),
            "expected_question_count": expected,
            "source_number_min": number_min,
            "source_number_max": number_max,
            "source_number_density": round(number_density, 4),
            "answered_count": answered,
            "analyzed_count": analyzed,
            "review_status": "approved" if complete_enough else "review_required",
            "questions": normalized_questions,
        })

    knowledge: list[dict[str, Any]] = []
    practice: list[dict[str, Any]] = []
    for candidate in practice_candidates:
        source = candidate["source"]
        content = candidate["content"]
        scope = scope_for_practice(source["source_file"], source["candidate_scope"])
        if scope == "review_required":
            audit_exclusions.append({"source_file": source["source_file"], "scope": scope, "reason": "filename does not establish a safe knowledge/practice publication role"})
            continue
        questions = parse_question_blocks(content, source["source_file"], source["sha256"], category_for(source["source_file"]), allow_answer_only=True)
        questions.extend(parse_writing_blocks(content, source["source_file"], source["sha256"]))
        if not questions:
            audit_exclusions.append({"source_file": source["source_file"], "scope": scope, "reason": "no structurally complete question with options or answer structure"})
            continue
        for index, item in enumerate(questions, start=1):
            if not item["answer"] or len(item["stem"]) < 12:
                audit_exclusions.append({"source_file": source["source_file"], "scope": scope, "reason": f"question {item['question_number']} missing answer or complete question structure"})
                continue
            content_fingerprint = item["fingerprint"]
            record = dict(item)
            record.update({
                "id": f"{scope.replace('_only', '')}-{content_fingerprint[:20]}",
                "title": Path(source["source_file"]).stem,
                "content_scope": scope,
                "review_status": "approved",
                "active": True,
                "source_relpath": source["source_relpath"],
                "year": year_for(source["source_file"], content),
                "region": region_for(source["source_file"]),
                "paper": "",
                "source_section": Path(source["source_file"]).parent.name,
                "knowledge_topic": item.get("knowledge_topic", "") if scope == "knowledge_only" else "",
            })
            (knowledge if scope == "knowledge_only" else practice).append(record)

    # Content-level dedupe is intentionally global across the two training
    # scopes: the same exercise can appear in both a grammar lesson and a
    # type-practice booklet, but it must be published only once.
    seen_training_fingerprints: set[str] = set()
    unique_knowledge: list[dict[str, Any]] = []
    for item in knowledge:
        if item["fingerprint"] in seen_training_fingerprints:
            audit_exclusions.append({"source_file": item["source_file"], "scope": item["content_scope"], "reason": "content duplicate of an earlier training item"})
            continue
        seen_training_fingerprints.add(item["fingerprint"])
        unique_knowledge.append(item)
    unique_practice: list[dict[str, Any]] = []
    for item in practice:
        if item["fingerprint"] in seen_training_fingerprints:
            audit_exclusions.append({"source_file": item["source_file"], "scope": item["content_scope"], "reason": "content duplicate of an earlier training item"})
            continue
        seen_training_fingerprints.add(item["fingerprint"])
        unique_practice.append(item)
    knowledge = unique_knowledge
    practice = unique_practice
    paper_fingerprints = {item["fingerprint"] for item in paper_items}
    before_knowledge = len(knowledge)
    before_practice = len(practice)
    knowledge = [item for item in knowledge if item["fingerprint"] not in paper_fingerprints]
    practice = [item for item in practice if item["fingerprint"] not in paper_fingerprints]
    for collection in [knowledge, practice]:
        counters: defaultdict[tuple[str, str], int] = defaultdict(int)
        for item in collection:
            key = (item["source_file"], item["category"])
            counters[key] += 1
            item["source_question_number"] = item["question_number"]
            item["display_number"] = counters[key]
            item["question_number"] = counters[key]
    all_items = paper_items + knowledge + practice
    catalog = {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_root": "/Users/shidianjin/Documents/高考英语",
        "categories": [
            {"id": "knowledge", "label": "知识点", "description": "词汇短语、语法、句法、阅读策略与写作表达"},
            {"id": "practice", "label": "题型训练", "description": "仅收录非完整试卷且答案明确的训练题"},
            {"id": "papers", "label": "历年真题", "description": "完整真题与模拟试卷，题目不拆入其他入口"},
        ],
        "knowledge": knowledge,
        "practice": practice,
        "papers": papers,
        "items": all_items,
    }
    (args.out / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.out / "papers.json").write_text(json.dumps(papers, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.out / "knowledge.json").write_text(json.dumps(knowledge, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.out / "practice.json").write_text(json.dumps(practice, ensure_ascii=False, indent=2), encoding="utf-8")
    web_catalog = {
        "version": 1,
        "generated_at": catalog["generated_at"],
        "source_root": "高考英语源资料（本地审计清单）",
        "categories": catalog["categories"],
        "knowledge": [public_item(item) for item in knowledge],
        "practice": [public_item(item) for item in practice],
        "papers": [public_paper(paper) for paper in papers if paper["review_status"] == "approved"],
        "paper_review_count": sum(paper["review_status"] != "approved" for paper in papers),
    }
    args.web_out.mkdir(parents=True, exist_ok=True)
    (args.web_out / "catalog.json").write_text(json.dumps(web_catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "paper_source_candidates": len(paper_candidates),
        "paper_groups": len(papers),
        "published_papers": sum(paper["review_status"] == "approved" for paper in papers),
        "paper_items_published": len(paper_items),
        "knowledge_items_before_paper_intersection": before_knowledge,
        "knowledge_items_published": len(knowledge),
        "practice_items_before_paper_intersection": before_practice,
        "practice_items_published": len(practice),
        "paper_intersection_removed": (before_knowledge - len(knowledge)) + (before_practice - len(practice)),
        "audit_exclusions": len(audit_exclusions),
        "exclusion_reasons": Counter(row["reason"] for row in audit_exclusions),
        "category_counts": Counter(item["category"] for item in all_items),
        "scope_counts": Counter(item["content_scope"] for item in all_items),
    }
    (args.out / "content-scope-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2, default=dict), encoding="utf-8")
    (args.audit / "content-review-exclusions.json").write_text(json.dumps(audit_exclusions, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = [
        "# 高考英语结构化内容报告",
        "",
        f"- 完整试卷候选源：**{len(paper_candidates)}**；按年份/地区/卷名合并后：**{len(papers)}**",
        f"- 发布完整试卷：**{report['published_papers']}**；发布试卷题目：**{len(paper_items)}**",
        f"- 发布知识点题目：**{len(knowledge)}**；发布题型训练题目：**{len(practice)}**",
        f"- 因与 `paper_only` 指纹相交而拦截：**{report['paper_intersection_removed']}**",
        f"- 进入审核排除报告：**{len(audit_exclusions)}**",
        "",
        "## 互斥规则",
        "",
        "- 完整真题/模考试卷保持 `content_scope=paper_only`。",
        "- 知识点和题型训练只接受非完整试卷源，必须存在答案；解析有则保留，没有解析也可发布。",
        "- `paper_only` 与知识点/题型题库在内容指纹层面交集为 0。",
        "- 原始文件路径、SHA-256、题号、章节和审核状态随题目保留。",
    ]
    (args.out / "content-build-summary.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print(json.dumps({
        "paper_groups": len(papers),
        "published_papers": report["published_papers"],
        "paper_items": len(paper_items),
        "knowledge_items": len(knowledge),
        "practice_items": len(practice),
        "audit_exclusions": len(audit_exclusions),
        "paper_intersection_removed": report["paper_intersection_removed"],
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
