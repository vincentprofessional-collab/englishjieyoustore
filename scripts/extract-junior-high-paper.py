from __future__ import annotations

import argparse
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
SECTION_HEADING = re.compile(r"^[一二三四五六七八九十]+、")
QUESTION = re.compile(r"^\s*(\d{1,3})\s*[．.、)]\s*(.*)$")
OPTION_MARKER = re.compile(r"([A-D])[．.、)]\s*")
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".mp4", ".flac", ".aac", ".ogg"}


def read_docx(path: Path) -> tuple[list[str], list[str]]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    paragraphs = []
    for paragraph in root.findall(".//w:body/w:p", NS):
        text = "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()
        if text:
            paragraphs.append(text)
    tables = []
    for table in root.findall(".//w:tbl", NS):
        for row in table.findall("./w:tr", NS):
            cells = []
            for cell in row.findall("./w:tc", NS):
                cells.append("".join(node.text or "" for node in cell.findall(".//w:t", NS)).strip())
            if any(cells):
                tables.append(" | ".join(cells))
    return paragraphs, tables


def split_options(text: str) -> tuple[str, list[str]]:
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


def parse_questions(lines: list[str]) -> list[dict]:
    starts = [(index, int(match.group(1))) for index, line in enumerate(lines) if (match := QUESTION.match(line))]
    questions = []
    for position, (start, number) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        block = lines[start:end]
        text = " ".join(block).strip()
        prompt, options = split_options(text)
        looks_like_instruction = any(
            token in block[0]
            for token in ("注意事项", "答题卡", "考试结束", "监考教师", "准考证", "本试卷共", "满分", "考试时间")
        )
        if looks_like_instruction:
            continue
        if len(re.findall(r"\d{1,3}\s*[．.、)]", text)) > 1 and not options and not re.search(r"[A-Za-z]{3,}", prompt):
            continue
        looks_like_open_question = any(token in text for token in ("?", "？", "____", "请", "What ", "Which ", "How ", "Why "))
        if len(options) < 2 and not looks_like_open_question:
            continue
        if not prompt:
            prompt = f"第 {number} 题"
        questions.append({
            "number": number,
            "prompt": prompt,
            "options": options,
        })
    return questions


def answer_map(lines: list[str]) -> dict[int, str]:
    answers: dict[int, str] = {}
    single_answers = []
    for index, line in enumerate(lines):
        if "【答案】" not in line:
            continue
        value = line.split("【答案】", 1)[1].strip()
        if not value and index + 1 < len(lines):
            value = lines[index + 1].strip()
        pairs = re.findall(r"(?<!\d)(\d{1,3})\s*[．.、)]?\s*([A-D])", value)
        for number, answer in pairs:
            answers[int(number)] = answer
        if not pairs and re.fullmatch(r"[A-D]", value):
            single_answers.append(value)
    for number, answer in enumerate(single_answers, 1):
        answers.setdefault(number, answer)
    return answers


def analysis_for(lines: list[str], number: int) -> str:
    marker = f"【{number}题详解】"
    try:
        start = next(index for index, line in enumerate(lines) if line == marker)
    except StopIteration:
        return "解析内容见对应解析版文件。"
    end = len(lines)
    for index in range(start + 1, len(lines)):
        if re.match(r"^【\d+题详解】$", lines[index]) or SECTION_HEADING.match(lines[index]):
            end = index
            break
    text = "\n".join(lines[start + 1 : end]).strip()
    return text or "解析内容见对应解析版文件。"


def copy_media(original: Path, assets_dir: Path, slug: str) -> list[str]:
    assets_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    with zipfile.ZipFile(original) as archive:
        for name in archive.namelist():
            if not name.startswith("word/media/"):
                continue
            suffix = Path(name).suffix.lower()
            if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
                continue
            target = assets_dir / Path(name).name
            target.write_bytes(archive.read(name))
            paths.append(f"/junior-high/{slug}/{target.name}")
    return paths


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
    analysis_lines, _ = read_docx(args.analysis)
    questions = parse_questions(original_lines)
    answers = answer_map(analysis_lines)
    for index, question in enumerate(questions, 1):
        number = question["number"]
        question.update(
            {
                "id": f"{args.slug}-{index}-{number}",
                "type": "generic",
                "context": "",
                "answer": answers.get(number, ""),
                "analysis": analysis_for(analysis_lines, number),
            }
        )

    source_text = "\n".join(original_lines + (["表格内容："] + original_tables if original_tables else []))
    writing_start = next(
        (index for index, line in enumerate(original_lines) if any(keyword in line for keyword in ("文段表达", "书面表达", "写作", "作文"))),
        None,
    )
    writing_text = "\n".join(original_lines[writing_start:]) if writing_start is not None else "请根据原卷要求完成写作。"
    is_simulation = "模拟" in args.original.name or "模拟" in str(args.original.parent)
    kind_label = "模拟卷" if is_simulation else "真题"
    asset_paths = copy_media(args.original, args.assets, args.slug)
    audio_paths = copy_audio(args.original, args.assets, args.slug)
    duration_match = re.search(r"(\d+)\s*分钟", source_text)
    duration = int(duration_match.group(1)) if duration_match else 90

    paper = {
        "year": args.year,
        "region": args.region,
        "label": f"{args.region}{kind_label}",
        "layout": "generic",
        "displayTitle": f"中考英语 {args.region}{args.year}年{kind_label}",
        "durationMinutes": duration,
        "fileName": args.original.name,
        "analysisFileName": args.analysis.name,
        "sourceDirectory": str(args.original.parent),
        "sourceText": source_text,
        "questions": questions,
        "readingA": {"instructions": "原卷阅读材料与题目如下。", "books": []},
        "assets": {"all": asset_paths, "audio": audio_paths},
        "writing": {
            "title": "写作",
            "promptA": writing_text,
            "requirementsA": "请按照原卷写作要求完成作文。",
            "promptB": "请根据原卷写作部分的另一项要求完成作文。",
            "requirementsB": "词数和内容要求以原卷为准。",
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(paper, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.output} with {len(questions)} questions and {len(asset_paths)} images")


if __name__ == "__main__":
    main()
