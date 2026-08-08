from __future__ import annotations

import argparse
import json
import posixpath
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
RELS_NS = {"pr": "http://schemas.openxmlformats.org/package/2006/relationships"}
SECTION_HEADING = re.compile(r"^\s*(?:[一二三四五六七八九十]+[、.．]|第[一二三四五六七八九十]+部分|第[一二三四五六七八九十\d]+节|[IVX]+[.．、)]|Part\s*\d+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+[.．])")
QUESTION = re.compile(r"^\s*(\d{1,3})\s*(?:[．.、:：)）]\s*|\s+)(.*)$")
OPTION_MARKER = re.compile(r"([A-G])[．.、)]\s*")
OPTION_TAIL_BOUNDARY = re.compile(
    r"\s+(?=(?:[一二三四五六七八九十]+[、.．]|第[一二三四五六七八九十\d]+节|[IVX]+[.．、)]|"
    r"[（(][一二三四五六七八九十\d]+[）)]|[A-GＡ-Ｇ][.．、:：)）]\s*(?:在|听|请|根据|从|阅读|选择|完成|补全|填写|填空|注意|第)|"
    r"[A-GＡ-Ｇ]卷|"
    r"听下面|听下列|请听|听材料|听一段|根据材料|根据短文|阅读下面|请阅读下面|从题中所给|从每小题所给|补全对话|第[一二三四五六七八九十IVX]+卷|注意：|将答案))"
)
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".mp4", ".flac", ".aac", ".ogg"}
DIRECT_MEDIA_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
CONVERTIBLE_MEDIA_EXTENSIONS = {".wmf", ".emf"}


def _relationship_ids(node: ET.Element) -> list[str]:
    ids = []
    for element in node.iter():
        for key, value in element.attrib.items():
            local_name = key.rsplit("}", 1)[-1]
            if local_name in {"embed", "id"} and value.startswith("rId"):
                ids.append(value)
    return list(dict.fromkeys(ids))


def _paragraph_text(paragraph: ET.Element) -> str:
    return "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()


def _table_rows(table: ET.Element) -> list[list[str]]:
    rows = []
    for row in table.findall("./w:tr", NS):
        cells = []
        for cell in row.findall("./w:tc", NS):
            cells.append(" ".join(
                text for text in (_paragraph_text(paragraph) for paragraph in cell.findall(".//w:p", NS)) if text
            ).strip())
        if any(cells):
            rows.append(cells)
    return rows


def read_docx_blocks(path: Path) -> list[dict]:
    """Read the direct children of the DOCX body without losing their order."""
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    body = root.find(".//w:body", NS)
    if body is None:
        return []

    blocks = []
    paragraph_index = 0
    table_index = 0
    for child in list(body):
        if child.tag == f"{{{NS['w']}}}p":
            text = _paragraph_text(child)
            media_refs = _relationship_ids(child)
            if not text and not media_refs:
                continue
            paragraph_index += 1
            if text:
                blocks.append({
                    "id": f"paragraph-{paragraph_index}",
                    "kind": "paragraph",
                    "text": text,
                    "mediaRefs": [],
                })
            for media_index, media_ref in enumerate(media_refs, 1):
                blocks.append({
                    "id": f"image-{paragraph_index}-{media_index}",
                    "kind": "image",
                    "mediaRefs": [media_ref],
                })
        elif child.tag == f"{{{NS['w']}}}tbl":
            rows = _table_rows(child)
            media_refs = _relationship_ids(child)
            if not rows and not media_refs:
                continue
            table_index += 1
            if rows:
                blocks.append({
                    "id": f"table-{table_index}",
                    "kind": "table",
                    "rows": rows,
                    "mediaRefs": [],
                })
            for media_index, media_ref in enumerate(media_refs, 1):
                blocks.append({
                    "id": f"image-table-{table_index}-{media_index}",
                    "kind": "image",
                    "mediaRefs": [media_ref],
                })
    return blocks


def read_docx(path: Path) -> tuple[list[str], list[str]]:
    blocks = read_docx_blocks(path)
    paragraphs = [block["text"] for block in blocks if block["kind"] == "paragraph" and block.get("text")]
    tables = [" | ".join(row) for block in blocks if block["kind"] == "table" for row in block.get("rows", [])]
    return paragraphs, tables


def split_options(text: str) -> tuple[str, list[str]]:
    initial_matches = list(OPTION_MARKER.finditer(text))
    first_boundary = OPTION_TAIL_BOUNDARY.search(text, initial_matches[0].end() if initial_matches else 0)
    if first_boundary:
        text = text[:first_boundary.start()].rstrip()
    matches = list(OPTION_MARKER.finditer(text))
    if len(matches) < 2:
        return text.strip(), []
    first = matches[0]
    prompt = text[: first.start()].strip()
    options = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        value = text[match.end() : end].strip()
        options.append(f"{match.group(1)}. {value}")
    return prompt, options


INSTRUCTION_MARKERS = (
    "注意事项", "答题卡", "考试结束", "监考教师", "准考证", "本试卷共", "本卷共", "满分", "考试时间",
    "答卷前", "作答选择题", "每题选出答案", "请务必", "请根据所听", "从每小题所给",
)
GROUP_KEYWORDS = ("听力", "听说", "单项", "语法", "完形", "阅读", "任务型", "短文", "写作", "作文", "书面表达", "文段表达")
QUESTION_BOUNDARY_PREFIXES = (
    "听下面", "听下列", "请听", "听材料", "每段对话", "每个问题后", "从题中所给", "从每小题所给",
    "从短文后", "根据材料内容", "根据短文内容", "阅读下面", "请阅读下面", "仔细阅读", "从以下各题",
    "听一段", "听对话", "听短文", "回答下面", "补全对话", "注意：", "将答案",
)
BLANK_MARKER = re.compile(r"_{2,}|…{2,}|（\s*）|\(\s*\)|空格|填空|填写|填入|信息转换|首字母")
TABLE_BLANK = re.compile(r"(?<=\s)(\d{1,3})(?=\s{2,})")
INLINE_PLACEHOLDER_PATTERNS = (
    re.compile(r"_{2,}\s*(\d{1,3})\s*_{2,}"),
    re.compile(r"(?<![A-Za-z0-9])([A-Za-z])\s{2,}(\d{1,3})(?!\d)"),
    re.compile(r"(?<=[.!?。！？：:])\s{2,}(\d{1,3})(?!\d)(?=\s|$)"),
    re.compile(r"(?<![A-Za-z0-9])\s{2,}(\d{2,3})\s{2,}(?!\d)"),
)


def _is_section_heading(text: str) -> bool:
    text = text.strip()
    if not text or QUESTION.match(text):
        return False
    if SECTION_HEADING.match(text):
        return True
    if text in {"A．B．C．", "A. B. C.", "A    B    C"} or len(OPTION_MARKER.findall(text)) >= 2:
        return False
    if re.match(r"^[A-G][.．、)]\s*", text) and len(text) > 4:
        heading_text = re.sub(r"^[A-G][.．、)]\s*", "", text, count=1)
        return any(keyword in heading_text for keyword in GROUP_KEYWORDS) or heading_text.lower().startswith(("listen", "reading", "writing", "part"))
    return any(keyword in text for keyword in GROUP_KEYWORDS) and len(text) < 100


def _looks_like_instruction(text: str) -> bool:
    cleaned = text.strip()
    if any(marker in cleaned for marker in INSTRUCTION_MARKERS):
        return True
    if re.search(r"(?:本题|本节|本部分|本大题)共\s*[一二三四五六七八九十\d]+\s*小题", cleaned):
        return True
    if re.search(r"每小题\s*\d*\s*分|选择题，满分|听力（共|听力\(共|在录音中|第[一二三四五六七八九十IVX]+卷", cleaned):
        return True
    return False


def _group_heading(text: str) -> bool:
    text = text.strip()
    if not text or QUESTION.match(text):
        return False
    if _is_section_heading(text):
        return True
    return bool(re.match(r"^[A-G][.．、)]\s+", text))


def _is_passage_label(text: str) -> bool:
    return bool(re.fullmatch(r"[A-GＡ-Ｇ]", text.strip()))


def _is_option_line(text: str) -> bool:
    return bool(re.match(r"^\s*[A-GＡ-Ｇ]\s*[．.、:：)]\s*\S+", text))


def _is_question_text_boundary(text: str) -> bool:
    """Return whether a block starts a new instruction, group, or passage.

    Question text is assembled from consecutive DOCX paragraphs.  A paper often
    puts the next group's instructions or a passage label between two numbered
    questions, so those blocks must terminate the current question instead of
    being swallowed into its options.
    """
    cleaned = text.strip()
    if not cleaned:
        return False
    if cleaned.startswith("【此处可播放相关音频"):
        return True
    if _is_passage_label(cleaned) or _is_section_heading(cleaned) or re.match(r"^第[一二三四五六七八九十\d]+节", cleaned):
        return True
    stripped_heading = re.sub(r"^[A-GＡ-Ｇ][.．、:：)）]\s*", "", cleaned, count=1)
    if stripped_heading != cleaned and (
        stripped_heading.startswith(QUESTION_BOUNDARY_PREFIXES)
        or stripped_heading.startswith(("下面", "在下列"))
        or _is_section_heading(stripped_heading)
        or "本题共" in stripped_heading
        or any(keyword in stripped_heading for keyword in GROUP_KEYWORDS)
    ):
        return True
    if _group_heading(cleaned) and not _is_option_line(cleaned):
        return True
    return cleaned.startswith(QUESTION_BOUNDARY_PREFIXES)


def _flatten_blocks(blocks: list[dict]) -> list[dict]:
    entries = []
    for block in blocks:
        if block.get("kind") == "paragraph":
            text = (block.get("text") or "").strip()
            if text:
                entries.append({"text": text, "blockId": block.get("id", ""), "kind": "paragraph"})
        elif block.get("kind") == "table":
            for row_index, row in enumerate(block.get("rows", []), 1):
                text = " ".join(cell.strip() for cell in row if cell and cell.strip()).strip()
                if text:
                    entries.append({
                        "text": text,
                        "blockId": block.get("id", "table"),
                        "rowId": f"{block.get('id', 'table')}-row-{row_index}",
                        "kind": "table",
                    })
    return entries


def _inline_placeholder_matches(text: str) -> list[dict]:
    """Find numbered blanks embedded in dialogue, cloze text, or tables."""
    matches = []
    for pattern in INLINE_PLACEHOLDER_PATTERNS:
        for match in pattern.finditer(text):
            number_text = match.group(1) if len(match.groups()) == 1 else match.group(2)
            matches.append({"number": int(number_text), "start": match.start(), "end": match.end()})
    unique = {}
    for match in matches:
        unique[(match["number"], match["start"], match["end"])] = match
    return sorted(unique.values(), key=lambda item: item["start"])


def _inline_prompt(text: str, match: dict) -> str:
    return f"{text[:match['start']]} ______ {text[match['end']:]}".strip()


def _nearby_options(entries: list[dict], last_entry_index: int, next_entry_index: int | None) -> list[str]:
    """Find a shared option list placed after an inline dialogue/table group."""
    end = next_entry_index if next_entry_index is not None else min(len(entries), last_entry_index + 4)
    for entry in entries[last_entry_index:end]:
        _, options = split_options(entry["text"])
        if len(options) >= 2 and all(
            option.split(".", 1)[1].strip()
            and not _looks_like_instruction(option)
            and not any(keyword in option for keyword in ("听下面", "阅读下面", "选择最佳", "从题中所给", "从以下各题"))
            for option in options
        ):
            return options
    return []


def detect_sections(blocks: list[dict]) -> list[dict]:
    sections = []
    active = None
    for index, block in enumerate(blocks):
        text = (block.get("text") or "").strip()
        if block.get("kind") == "paragraph" and _is_section_heading(text):
            if active is not None:
                sections.append(active)
            active = {
                "id": f"section-{len(sections) + 1}",
                "title": text,
                "instructions": [],
                "blocks": [],
                "questionIds": [],
                "_blockIndexes": [],
                "_blockIds": [],
            }
        if active is None:
            active = {
                "id": "section-1",
                "title": "试卷正文",
                "instructions": [],
                "blocks": [],
                "questionIds": [],
                "_blockIndexes": [],
                "_blockIds": [],
            }
        active["_blockIndexes"].append(index)
        if block.get("id"):
            active["_blockIds"].append(block["id"])
        if text and (_looks_like_instruction(text) or (_group_heading(text) and text != active["title"])):
            active["instructions"].append(text)
    if active is not None:
        sections.append(active)
    return sections


def _split_numbered_line(text: str) -> list[tuple[int, str]]:
    matches = list(re.finditer(r"(?<![A-Za-z])(?<!\d)(\d{1,3})\s*[．.、:：)）](?!\s*\d{2}\b)\s*", text))
    if not matches:
        plain = re.match(r"^\s*(\d{1,3})\s+(.+)$", text)
        if plain and 1 <= int(plain.group(1)) <= 200:
            prompt = plain.group(2).strip()
            question_lead = re.match(
                r"(?i)(?:what|who|where|when|why|how|which|whose|whom|is|are|am|do|does|did|can|could|will|would|shall|should|may|might|have|has|had|please|tell|name|describe)\b",
                prompt,
            )
            if question_lead or re.search(r"[?？]", prompt):
                return [(int(plain.group(1)), prompt)]
        return []
    if matches[0].start() > 1:
        return []
    chunks = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        chunks.append((int(match.group(1)), text[match.end() : end].strip()))
    return chunks


def _input_kind(prompt: str, options: list[str], *, table: bool = False) -> str:
    if options:
        return "choice"
    if table or BLANK_MARKER.search(prompt) or re.search(r"\b(?:T|F)\b", prompt):
        return "blank"
    return "text"


def parse_questions(blocks: list[dict], sections: list[dict] | None = None, slug: str = "paper") -> list[dict]:
    entries = _flatten_blocks(blocks)
    block_section = {}
    writing_sections = set()
    if sections:
        for section in sections:
            for block_id in section.get("_blockIds", []):
                block_section[block_id] = section["id"]
            title = section.get("title", "")
            essay_section = re.search(r"作文|书面表达|文段表达", title) or (
                "写作" in title and not re.search(r"共\s*[一二三四五六七八九十\d]+\s*节|单词填空|补全对话|短文填空", title)
            )
            if essay_section:
                writing_sections.add(section["id"])

    starts = []
    active_section = sections[0]["id"] if sections else "section-1"
    group_counter = {}
    current_group = f"{active_section}-group-1"
    for entry_index, entry in enumerate(entries):
        section_id = block_section.get(entry["blockId"], active_section)
        if section_id != active_section:
            active_section = section_id
            group_counter.setdefault(active_section, 0)
            current_group = f"{active_section}-group-{group_counter.get(active_section, 0) + 1}"
        if active_section in writing_sections:
            continue
        text = entry["text"]
        if _group_heading(text) and not QUESTION.match(text):
            group_counter[active_section] = group_counter.get(active_section, 0) + 1
            current_group = f"{active_section}-group-{group_counter[active_section]}"
            continue
        chunks = _split_numbered_line(text)
        if chunks:
            for number, prompt in chunks:
                if _looks_like_instruction(prompt):
                    continue
                starts.append({
                    "entryIndex": entry_index,
                    "number": number,
                    "prompt": prompt,
                    "sectionId": active_section,
                    "groupId": current_group,
                    "blockId": entry["blockId"],
                    "table": entry["kind"] == "table",
                    "position": text.find(prompt),
                    "inline": False,
                })
        inline_matches = _inline_placeholder_matches(text)
        for match in inline_matches:
            if not 1 <= match["number"] <= 200:
                continue
            starts.append({
                "entryIndex": entry_index,
                "number": match["number"],
                "prompt": _inline_prompt(text, match),
                "sectionId": active_section,
                "groupId": current_group,
                "blockId": entry["blockId"],
                "table": entry["kind"] == "table",
                "position": match["start"],
                "inline": True,
                "inlineGroup": f"{active_section}:{entry_index}",
            })
        if entry["kind"] == "table" and not inline_matches:
            for match in TABLE_BLANK.finditer(text):
                number = int(match.group(1))
                if 1 <= number <= 200:
                    starts.append({
                        "entryIndex": entry_index,
                        "number": number,
                        "prompt": text,
                        "sectionId": active_section,
                        "groupId": current_group,
                        "blockId": entry["blockId"],
                        "table": True,
                        "position": match.start(),
                        "inline": False,
                    })

    starts.sort(key=lambda start: (start["entryIndex"], start.get("position", 0)))
    unique_inline = set()
    deduped_starts = []
    for start in starts:
        if start.get("inline"):
            key = (start["sectionId"], start["entryIndex"], start["number"])
            if key in unique_inline:
                continue
            unique_inline.add(key)
        deduped_starts.append(start)
    starts = deduped_starts
    inline_groups = {}
    for start in starts:
        if start.get("inline"):
            inline_groups.setdefault(start["inlineGroup"], []).append(start)
    for group_starts in inline_groups.values():
        last_entry_index = max(start["entryIndex"] for start in group_starts)
        next_start = next(
            (start for start in starts if start["entryIndex"] > last_entry_index),
            None,
        )
        shared_options = _nearby_options(entries, last_entry_index, next_start["entryIndex"] if next_start else None)
        if shared_options:
            for start in group_starts:
                start["options"] = shared_options

    explicit_keys = {(start["sectionId"], start["number"]) for start in starts if not start.get("inline")}
    starts = [start for start in starts if not (start.get("inline") and (start["sectionId"], start["number"]) in explicit_keys)]

    questions = []
    for position, start in enumerate(starts):
        next_start = starts[position + 1] if position + 1 < len(starts) else None
        if start.get("inline"):
            text = start["prompt"]
        elif next_start and next_start["entryIndex"] == start["entryIndex"]:
            text = start["prompt"]
        else:
            section_end = next(
                (
                    entry_index
                    for entry_index in range(start["entryIndex"] + 1, len(entries))
                    if block_section.get(entries[entry_index]["blockId"], start["sectionId"]) != start["sectionId"]
                ),
                len(entries),
            )
            end = min(next_start["entryIndex"] if next_start else len(entries), section_end)
            continuation = []
            for entry in entries[start["entryIndex"] + 1 : end]:
                if _is_question_text_boundary(entry["text"]):
                    break
                continuation.append(entry["text"])
            text = " ".join([start["prompt"]] + continuation).strip()
        prompt, options = split_options(text)
        if start.get("options") and not options:
            options = start["options"]
        if _looks_like_instruction(prompt):
            continue
        if not prompt:
            prompt = f"第 {start['number']} 题"
        index = len(questions) + 1
        question_id = f"{slug}-{start['sectionId']}-{start['groupId']}-{index}"
        questions.append({
            "id": question_id,
            "number": start["number"],
            "displayNumber": str(start["number"]),
            "sectionId": start["sectionId"],
            "groupId": start["groupId"],
            "prompt": prompt,
            "options": options,
            "inputKind": _input_kind(prompt, options, table=start["table"]),
            "sourceBlockIds": [start["blockId"]],
        })
    return questions


def _clean_answer(value: str) -> str:
    value = re.sub(r"[①②③④⑤⑥⑦⑧⑨⑩]\s*[．.、:：)]?", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip(" .．、:：")


def _answer_entries(lines: list[str]) -> list[tuple[int | None, str]]:
    entries = []
    for index, line in enumerate(lines):
        if "【答案】" not in line:
            continue
        value = line.split("【答案】", 1)[1].strip()
        if not value and index + 1 < len(lines):
            value = lines[index + 1].strip()
        numbered = list(re.finditer(r"(?<!\d)(\d{1,3})\s*[．.、:：)]\s*(.*?)(?=(?:\s+\d{1,3}\s*[．.、:：)]|$))", value))
        if numbered:
            for match in numbered:
                answer = _clean_answer(match.group(2))
                if answer:
                    entries.append((int(match.group(1)), answer))
            continue
        circled = list(re.finditer(r"[①②③④⑤⑥⑦⑧⑨⑩]\s*[．.、:：)]?\s*([^①②③④⑤⑥⑦⑧⑨⑩]+?)(?=\s*[①②③④⑤⑥⑦⑧⑨⑩]|$)", value))
        if circled:
            entries.extend((None, _clean_answer(match.group(1))) for match in circled if _clean_answer(match.group(1)))
            continue
        cleaned = _clean_answer(value)
        if cleaned:
            entries.append((None, cleaned))
    return entries


def answer_map(lines: list[str], questions: list[dict] | None = None) -> dict:
    entries = _answer_entries(lines)
    if questions is None:
        answers = {}
        sequence = 1
        for number, answer in entries:
            if number is None:
                while sequence in answers:
                    sequence += 1
                answers[sequence] = answer
                sequence += 1
            else:
                answers[number] = answer
        return answers

    answers = {}
    assigned = set()
    last_index = -1
    current_section = None
    for number, answer in entries:
        candidates = [
            (index, question)
            for index, question in enumerate(questions)
            if index > last_index and question["id"] not in assigned and (number is None or question["number"] == number)
        ]
        if current_section is not None:
            same_section = [candidate for candidate in candidates if candidate[1]["sectionId"] == current_section]
            if same_section:
                candidates = same_section
            else:
                next_same_section = next(
                    (
                        (index, question)
                        for index, question in enumerate(questions)
                        if index > last_index and question["id"] not in assigned and question["sectionId"] == current_section
                    ),
                    None,
                )
                if next_same_section is not None and number is not None and next_same_section[1]["number"] > number:
                    continue
                if next_same_section is not None and not candidates:
                    candidates = [next_same_section]
        candidate_index, candidate = candidates[0] if candidates else (None, None)
        if candidate is not None:
            answers[candidate["id"]] = answer
            assigned.add(candidate["id"])
            last_index = candidate_index
            current_section = candidate["sectionId"]
    return answers


ANALYSIS_MARKER = re.compile(r"^【\s*(?:第\s*)?(\d+)\s*题详解】$")


def analysis_map(lines: list[str], questions: list[dict] | None = None) -> dict:
    entries = []
    markers = [(index, int(match.group(1))) for index, line in enumerate(lines) if (match := ANALYSIS_MARKER.match(line.strip()))]
    for marker_index, (start, number) in enumerate(markers):
        end = markers[marker_index + 1][0] if marker_index + 1 < len(markers) else len(lines)
        for index in range(start + 1, end):
            if _is_section_heading(lines[index]) and index > start + 1:
                end = index
                break
        text = "\n".join(lines[start + 1 : end]).strip()
        if text:
            entries.append((number, text))
    answer_markers = [index for index, line in enumerate(lines) if "【答案】" in line]
    for marker_index, start in enumerate(answer_markers):
        end = answer_markers[marker_index + 1] if marker_index + 1 < len(answer_markers) else len(lines)
        marker_value = lines[start].split("【答案】", 1)[1].strip()
        if not marker_value and start + 1 < len(lines):
            marker_value = lines[start + 1].strip()
        numbers = [int(match.group(1)) for match in re.finditer(r"(?<!\d)(\d{1,3})\s*[．.、:：)]", marker_value)]
        for boundary in range(start + 1, end):
            if QUESTION.match(lines[boundary].strip()) and boundary > start + 1:
                end = boundary
                break
        text = "\n".join(lines[start + 1 : end]).strip()
        if not text:
            continue
        if numbers:
            entries.extend((number, text) for number in numbers)
        else:
            entries.append((None, text))
    if questions is None:
        return {number: text for number, text in entries}
    result = {}
    assigned = set()
    last_index = -1
    current_section = None
    for number, text in entries:
        candidates = [
            (index, question)
            for index, question in enumerate(questions)
            if index > last_index and question["id"] not in assigned and (number is None or question["number"] == number)
        ]
        if current_section is not None:
            same_section = [candidate for candidate in candidates if candidate[1]["sectionId"] == current_section]
            if same_section:
                candidates = same_section
            else:
                next_same_section = next(
                    (
                        (index, question)
                        for index, question in enumerate(questions)
                        if index > last_index and question["id"] not in assigned and question["sectionId"] == current_section
                    ),
                    None,
                )
                if next_same_section is not None and number is not None and next_same_section[1]["number"] > number:
                    continue
                if next_same_section is not None and not candidates:
                    candidates = [next_same_section]
        candidate_index, candidate = candidates[0] if candidates else (None, None)
        if candidate is not None:
            result[candidate["id"]] = text
            assigned.add(candidate["id"])
            last_index = candidate_index
            current_section = candidate["sectionId"]
    return result


def analysis_for(lines: list[str], number: int) -> str:
    return analysis_map(lines).get(number, "")


def copy_media(original: Path, assets_dir: Path, slug: str) -> list[str]:
    return sorted(extract_media(original, assets_dir, slug).values())


def extract_media(original: Path, assets_dir: Path, slug: str) -> dict[str, str]:
    """Copy image relationships and convert legacy WMF/EMF assets to browser images."""
    assets_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(original) as archive:
        rels = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
        media = {
            name: name
            for name in archive.namelist()
            if name.startswith("word/media/") and not name.endswith("/")
        }
        relationship_map = {}
        for relationship in rels.findall("pr:Relationship", RELS_NS):
            rel_id = relationship.attrib.get("Id", "")
            rel_type = relationship.attrib.get("Type", "")
            target = relationship.attrib.get("Target", "")
            if not rel_id or not rel_type.endswith("/image"):
                continue
            member = posixpath.normpath(posixpath.join("word", target))
            if member in media:
                relationship_map[rel_id] = member

        paths: dict[str, str] = {}
        for rel_id, member in relationship_map.items():
            source_name = Path(member).name
            suffix = Path(source_name).suffix.lower()
            target_name = source_name
            if suffix in CONVERTIBLE_MEDIA_EXTENSIONS:
                soffice = shutil.which("soffice") or "/Users/shidianjin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice"
                with tempfile.TemporaryDirectory(prefix="junior-high-media-") as temp_dir:
                    temp_source = Path(temp_dir) / source_name
                    temp_source.write_bytes(archive.read(member))
                    subprocess.run(
                        [soffice, "--headless", "--convert-to", "png", "--outdir", temp_dir, str(temp_source)],
                        check=True,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                    )
                    converted = Path(temp_dir) / f"{Path(source_name).stem}.png"
                    if not converted.exists():
                        raise RuntimeError(f"Unable to convert DOCX media {source_name}")
                    target_name = converted.name
                    (assets_dir / target_name).write_bytes(converted.read_bytes())
            elif suffix in DIRECT_MEDIA_EXTENSIONS:
                (assets_dir / target_name).write_bytes(archive.read(member))
            else:
                continue
            paths[rel_id] = f"/junior-high/{slug}/{target_name}"
    return paths


DISPLAY_INSTRUCTION_PREFIXES = ("请", "阅读下面", "根据", "从每", "从下", "选择", "填写", "完成", "作答", "注意事项", "第I卷", "第II卷")


def _is_display_instruction(text: str, section_title: str) -> bool:
    cleaned = text.strip()
    if not cleaned or cleaned == section_title.strip():
        return True
    if _looks_like_instruction(cleaned) or _is_section_heading(cleaned) or _group_heading(cleaned):
        return True
    if cleaned.startswith(DISPLAY_INSTRUCTION_PREFIXES) and len(cleaned) < 180:
        return True
    if re.search(r"^(?:答案|解析|参考答案|评分标准|试卷答案)", cleaned):
        return True
    return False


def _is_question_marker(text: str) -> bool:
    return bool(re.match(r"^\s*\d{1,3}\s*[．.、)]", text))


def _is_answer_option_block(text: str) -> bool:
    return _is_option_line(text)


def _is_passage_section(section_title: str) -> bool:
    return bool(re.search(r"阅读|完形|任务型|短文填空|综合填空|选词填空|语篇填空", section_title))


def build_display_blocks(sections: list[dict], questions: list[dict]) -> None:
    """Attach a sanitized source view without removing original extraction blocks."""
    questions_by_section: dict[str, list[dict]] = {}
    for question in questions:
        questions_by_section.setdefault(question["sectionId"], []).append(question)

    for section in sections:
        blocks = section.get("blocks", [])
        section_questions = questions_by_section.get(section["id"], [])
        block_indexes = {block.get("id"): index for index, block in enumerate(blocks) if block.get("id")}
        source_indexes = sorted({
            block_indexes[source_id]
            for question in section_questions
            for source_id in question.get("sourceBlockIds", [])
            if source_id in block_indexes
        })
        hidden_paragraph_indexes = set()
        passage_section = _is_passage_section(section.get("title", ""))
        for source_position, source_index in enumerate(source_indexes):
            if blocks[source_index].get("kind") != "paragraph":
                continue
            hidden_paragraph_indexes.add(source_index)
            next_index = source_index + 1
            next_source_index = source_indexes[source_position + 1] if source_position + 1 < len(source_indexes) else len(blocks)
            saw_option = False
            while next_index < len(blocks):
                block = blocks[next_index]
                if block.get("kind") != "paragraph":
                    next_index += 1
                    continue
                text = (block.get("text") or "").strip()
                if next_index >= next_source_index or _is_question_marker(text):
                    break
                if passage_section:
                    if _is_answer_option_block(text):
                        hidden_paragraph_indexes.add(next_index)
                        saw_option = True
                    elif saw_option:
                        break
                    else:
                        hidden_paragraph_indexes.add(next_index)
                else:
                    hidden_paragraph_indexes.add(next_index)
                next_index += 1

        display_blocks = []
        for index, block in enumerate(blocks):
            if block.get("kind") != "paragraph":
                display_blocks.append(block)
                continue
            text = (block.get("text") or "").strip()
            if index in hidden_paragraph_indexes:
                continue
            if not section_questions:
                continue
            if text == section.get("title", "").strip():
                continue
            display_blocks.append(block)
        section["displayBlocks"] = display_blocks


def copy_audio(original: Path, assets_dir: Path, slug: str) -> list[str]:
    candidates = sorted(
        path for path in original.parent.rglob("*") if path.is_file() and path.suffix.lower() in AUDIO_EXTENSIONS
    )
    marker = re.search(r"（([^（）]*(?:专用|省卷)[^（）]*)）", original.name)
    if marker:
        scoped = [path for path in candidates if marker.group(1) in path.stem]
        candidates = scoped
    audio_dir = assets_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for index, source in enumerate(candidates, 1):
        target = audio_dir / f"audio-{index}{source.suffix.lower()}"
        target.write_bytes(source.read_bytes())
        paths.append(f"/junior-high/{slug}/audio/{target.name}")
    return paths


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--original", required=True, type=Path)
    parser.add_argument("--analysis", required=True, type=Path)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument("--region", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--assets", required=True, type=Path)
    args = parser.parse_args()

    original_lines, original_tables = read_docx(args.original)
    source_blocks = read_docx_blocks(args.original)
    media_map = extract_media(args.original, args.assets, args.slug)
    for block in source_blocks:
        refs = block.pop("mediaRefs", [])
        if block["kind"] == "paragraph" and refs:
            block["kind"] = "image" if not block.get("text") else "paragraph"
        if refs:
            block["src"] = next((media_map[ref] for ref in refs if ref in media_map), None)
            block["alt"] = block.get("text") or "原卷图片"
        if block.get("src") is None:
            block.pop("src", None)
    analysis_lines, _ = read_docx(args.analysis)
    sections = detect_sections(source_blocks)
    questions = parse_questions(source_blocks, sections, args.slug)
    answers = answer_map(analysis_lines, questions)
    analyses = analysis_map(analysis_lines, questions)
    for question in questions:
        question.update(
            {
                "type": question["inputKind"],
                "context": "",
                "answer": answers.get(question["id"], ""),
                "analysis": analyses.get(question["id"], ""),
            }
        )

    for section in sections:
        block_ids = set(section.pop("_blockIds", []))
        section.pop("_blockIndexes", None)
        section["blocks"] = [block for block in source_blocks if block.get("id") in block_ids]
        section["questionIds"] = [question["id"] for question in questions if question["sectionId"] == section["id"]]
    build_display_blocks(sections, questions)

    ordered_source_lines = []
    for block in source_blocks:
        if block["kind"] == "paragraph" and block.get("text"):
            ordered_source_lines.append(block["text"])
        elif block["kind"] == "table":
            ordered_source_lines.extend(" | ".join(row) for row in block.get("rows", []) if row)
        elif block["kind"] == "image":
            ordered_source_lines.append("[原卷图片]")
    source_text = "\n".join(ordered_source_lines)
    writing_start = next(
        (index for index, line in enumerate(original_lines) if any(keyword in line for keyword in ("文段表达", "书面表达", "写作", "作文"))),
        None,
    )
    writing_text = "\n".join(original_lines[writing_start:]).strip() if writing_start is not None else "原卷未提供可识别的写作提示。"
    writing_task = {
        "id": f"{args.slug}-writing-1",
        "label": "写作",
        "prompt": writing_text,
        "requirements": "请按照原卷写作要求完成作文。",
    }
    is_simulation = "模拟" in args.original.name or "模拟" in str(args.original.parent)
    kind_label = "模拟卷" if is_simulation else "真题"
    asset_paths = sorted(set(media_map.values()))
    audio_paths = copy_audio(args.original, args.assets, args.slug)
    duration_match = re.search(r"(\d+)\s*分钟", source_text)
    duration = int(duration_match.group(1)) if duration_match else 90

    paper = {
        "year": args.year,
        "region": args.region,
        "label": f"{args.region}{kind_label}",
        "layout": "structured",
        "displayTitle": f"中考英语 {args.region}{args.year}年{kind_label}",
        "durationMinutes": duration,
        "fileName": args.original.name,
        "analysisFileName": args.analysis.name,
        "sourceDirectory": str(args.original.parent),
        "sourceText": source_text,
        "sourceBlocks": source_blocks,
        "sections": sections,
        "questions": questions,
        "readingA": {"instructions": "原卷阅读材料与题目如下。", "books": []},
        "assets": {"all": asset_paths, "audio": audio_paths},
        "writing": {
            "title": "写作",
            "promptA": writing_text,
            "requirementsA": "请按照原卷写作要求完成作文。",
            "promptB": writing_text,
            "requirementsB": "词数和内容要求以原卷为准。",
        },
        "writingTasks": [writing_task],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(paper, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.output} with {len(questions)} questions and {len(asset_paths)} images")


if __name__ == "__main__":
    main()
