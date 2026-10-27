#!/usr/bin/env python3
"""Build text-only 1980-2020 postgraduate type collections from local source extracts."""
import json
import re
import subprocess
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path.cwd()
OUT = ROOT / "public/exam-prep/postgraduate"
PAGE_SOURCE = Path("/private/tmp/kaoyan_question_source_pages.jsonl")
OLD_TEXTS = [Path("/private/tmp/kaoyan_1980_1985.txt"), Path("/private/tmp/kaoyan_1986_1997.txt")]
SOURCE_ROOT = Path("/Volumes/My HDD3/备课/考研/真题/历年资料库")
NOISE = re.compile(r"(?:公众号|微信号|微信ID|淘宝|二维码|扫码|添加老师|免费资料|课程咨询|https?://|www\.|file://|C:/Users/|VitalSource|eBook Converter)", re.I)
TYPE_FOLDERS = {
    "语法与词汇": "grammar-vocabulary", "完形填空": "cloze", "阅读理解": "reading",
    "考研新题型": "new-type", "翻译": "translation", "写作": "writing",
}


def clean(text):
    text = re.sub(r"Y\[φ\.=5=[\x15\x13\x14]+", " ", str(text or ""))
    text = text.replace("＂ｙｘ；＂ｋＲ２ｏ１·", " ")
    text = re.sub(r"(?im)^\s*vx[：:]\s*$", " ", text)
    text = re.sub(r"\bKZRZ\s*\d+\b", " ", text, flags=re.I)
    lines = []
    text = re.sub(r"\bv\s*x\s*[:：]\s*KZRZ\s*\d+\b", " ", text, flags=re.I)
    for raw in text.replace("\x00", "").replace("\r", "").splitlines():
        line = re.sub(r"[\t\u00a0 ]+", " ", raw).strip()
        if not line or NOISE.search(line):
            continue
        if re.fullmatch(r"-\s*\d{1,3}\s*-", line):
            continue
        if re.fullmatch(r"英语[（(]二[）)]试题\s*[.．·]?\s*\d{1,3}\s*[.．·]?\s*[（(]共\s*\d+\s*页[）)]", line):
            continue
        if re.search(r"^\d{1,2}\s*/\s*\d{1,2}\s*/\s*20\d{2}", line):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def year_from_page(text):
    candidates = []
    for match in re.finditer(r"(?<!\d)((?:19|20)\d{2})\s*年", text):
        year = int(match.group(1))
        nearby = text[match.start():match.start() + 140]
        if re.search(r"(?:全国硕士研究生|英语\s*[（(]?[一二]|考研英语|英语试题|试题第)", nearby):
            candidates.append((year, match.start()))
    early = [candidate for candidate in candidates if candidate[1] < 500]
    return (early or candidates)[0][0] if candidates else None


def subject_from_source(source, year):
    if "英语二" in source or "英语二" in str(source):
        return "英语二"
    return "英语一" if year >= 2010 else "英语（旧制）"


def load_exam_texts():
    pages = [json.loads(line) for line in PAGE_SOURCE.read_text(encoding="utf-8").split("\n") if line.strip()]
    papers = defaultdict(list)
    by_source = defaultdict(list)
    for row in pages:
        by_source[row["source"]].append(row)
    for source, source_pages in by_source.items():
        current_year = None
        current_subject = "英语（旧制）"
        for page in sorted(source_pages, key=lambda item: int(item["page"])):
            year = year_from_page(page["text"])
            if year:
                current_year = year
                current_subject = subject_from_source(source, year)
            if current_year and 1980 <= current_year <= 2020:
                key = (current_year, current_subject)
                papers[key].append((page["text"], source, int(page["page"])))

    for file in OLD_TEXTS:
        if not file.exists():
            continue
        text = file.read_text(encoding="utf-8", errors="replace")
        headers = list(re.finditer(r"(?m)^(19\d{2})年(?:全国|攻读|硕士)", text))
        for i, header in enumerate(headers):
            year = int(header.group(1))
            if year > 1997:
                continue
            end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
            papers[(year, "英语（旧制）")].append((text[header.start():end], file.name, None))
    return papers


def classify_heading(line, active_type):
    low = line.lower()
    section_prefix = bool(re.match(r"^\s*(?:section|part)(?:\b|[ivxⅰ-ⅻ0-9a-h])", low))
    if section_prefix and re.search(r"structure\s+and\s+vocabulary|词汇与结构|词汇和结构", low):
        return "语法与词汇"
    if section_prefix and re.search(r"cloze\s+test|close\s+test|use\s+of\s+english|完形填空", low):
        return "完形填空"
    if section_prefix and re.search(r"reading\s+comprehension|阅读理解", low):
        return "阅读理解"
    if section_prefix and re.search(r"translation|翻译", low):
        return "翻译"
    if active_type in {"阅读理解", "考研新题型"} and re.match(r"^\s*part\s*[cＣ]\b", low):
        return "翻译"
    # A passage can naturally mention "writing"; only a section/part heading
    # starts a writing group. Essay instructions inside Section IV stay with it.
    if section_prefix and re.search(r"writing|写作", low):
        return "写作"
    if re.match(r"^\s*part\s*[bＢ]\b|^\s*part\s*Ⅱ\b|^\s*(?:新题型|paragraph matching)", low):
        return "考研新题型" if active_type in {"阅读理解", "考研新题型"} else None
    return None


def extract_type_sections(text):
    lines = list(re.finditer(r"(?m)^.*$", text))
    headings = []
    active_type = None
    for match in lines:
        line = match.group(0)
        category = classify_heading(line, active_type)
        if category:
            headings.append((match.start(), category, line.strip()))
            active_type = "阅读理解" if category == "考研新题型" else category
    result = []
    for i, (start, category, heading) in enumerate(headings):
        end = headings[i + 1][0] if i + 1 < len(headings) else len(text)
        body = clean(text[start:end])
        if len(body) >= 120:
            result.append((category, heading, body))
    return result


def pdf_text(path):
    result = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True)
    return result.stdout if result.returncode == 0 else ""


def reference_year_chunks(text):
    lines = list(re.finditer(r"(?m)^.*$", text))
    headers = []
    for match in lines:
        line = match.group(0)
        year_match = re.search(r"((?:19|20)\d{2})\s*年", line)
        if year_match and re.search(r"(?:全国硕士研究生|英语试题|真题答案|答案与解析|英语答案)", line):
            year = int(year_match.group(1))
            if 1980 <= year <= 2021:
                headers.append((match.start(), year))
    chunks = defaultdict(list)
    for i, (start, year) in enumerate(headers):
        end = headers[i + 1][0] if i + 1 < len(headers) else len(text)
        chunk = clean(text[start:end])
        if len(chunk) > 80:
            chunks[year].append(chunk)
    return chunks


def load_answer_references():
    references = defaultdict(list)
    common_tokens = (
        "1980—1985年考研英语真题答案", "1986-1990年考研英语真题答案及解析",
        "1991-1995年考研英语真题答案及解析", "1996年考研英语真题答案及解析",
        "1997年考研英语真题答案及解析", "1998-2009年考研英语真题答案（一键打印）",
    )
    for pdf in SOURCE_ROOT.rglob("*.pdf"):
        full_path = str(pdf)
        stem = pdf.stem
        if any(token in stem for token in common_tokens):
            for year, chunks in reference_year_chunks(pdf_text(pdf)).items():
                references[(year, "common")].extend({"text": chunk, "file": pdf.name} for chunk in chunks)
            continue
        if "2010-2021考研英语一答案（一键打印版）" in stem:
            for year, chunks in reference_year_chunks(pdf_text(pdf)).items():
                references[(year, "e1")].extend({"text": chunk, "file": pdf.name} for chunk in chunks)
            continue
        if "英语二" in full_path and ("答案" in stem or "解析" in stem):
            # Prefer per-year searchable English II explanations; skip combined volumes.
            if re.search(r"\d{4}\s*[-—–]\s*\d{4}", stem):
                continue
            match = re.search(r"(?<!\d)(20\d{2})(?!\d)", stem)
            if match and 2010 <= int(match.group(1)) <= 2020:
                year = int(match.group(1))
                text = clean(pdf_text(pdf))
                if len(text) > 100:
                    references[(year, "e2")].append({"text": text, "file": pdf.name})
            continue
        if "英语一" in full_path and ("答案" in stem or "解析" in stem):
            if re.search(r"\d{4}\s*[-—–]\s*\d{4}", stem):
                continue
            match = re.search(r"(?<!\d)(20\d{2})(?!\d)", stem)
            if match and 2010 <= int(match.group(1)) <= 2020:
                year = int(match.group(1))
                text = clean(pdf_text(pdf))
                if len(text) > 100:
                    references[(year, "e1")].append({"text": text, "file": pdf.name})
            continue
    # Keep the most complete reference where the archive contains alternate copies.
    return {key: max(chunks, key=lambda item: len(item["text"])) for key, chunks in references.items()}


def approximate_question_count(text, category):
    numbered = list(re.finditer(r"(?m)^[ \t]*((?:\d[ \t]*){1,2})[.．、][ \t]+", text))
    values = {int(re.sub(r"\s+", "", match.group(1))) for match in numbered}
    if category == "完形填空" and re.search(r"numbered blank|numbered gap|numbered spaces", text, re.I):
        return 20
    if category == "阅读理解":
        return 20
    if category == "考研新题型":
        range_match = re.search(r"questions?\s+(\d{2})\s*[-–—]\s*(\d{2})", text, re.I)
        if range_match:
            return int(range_match.group(2)) - int(range_match.group(1)) + 1
        return 5
    if category == "写作":
        if re.search(r"part\s*a\b", text, re.I) and re.search(r"part\s*b\b", text, re.I):
            return 2
        return max(1, min(2, sum(value >= 40 for value in values)))
    if category == "翻译":
        if re.match(r"\s*part\s*c\b", text, re.I):
            return 5
        return max(1, len(values))
    if values:
        return min(100, max(1, len(values)))
    if category == "完形填空":
        return 20
    return 1


def build_banks():
    papers = load_exam_texts()
    references = load_answer_references()
    grouped = defaultdict(list)
    sources = defaultdict(set)
    for (year, subject), page_rows in sorted(papers.items()):
        text = "\n".join(row[0] for row in page_rows)
        source = page_rows[0][1]
        for category, heading, body in extract_type_sections(text):
            key = (category, year, subject)
            content_key = re.sub(r"[^a-z0-9]+", "", unicodedata.normalize("NFKD", body).lower())
            if not content_key:
                continue
            scope = "e2" if subject == "英语二" else "e1" if subject == "英语一" else "common"
            reference = references.get((year, scope), references.get((year, "common"), {}))
            question = {
                "id": f"{year}-{subject.replace('（', '').replace('）', '').replace('一', 'e1').replace('二', 'e2')}-{TYPE_FOLDERS[category]}",
                "number": year,
                "label": f"{year} 年 {subject} · {category}",
                "group": f"{year} 年 · {subject}",
                "passage": body,
                "prompt": "请按原题题号在答题框中记录本题型答案。提交后可查看该年份的参考答案与解析。",
                "options": [],
                "answer": None,
                "answerMode": "annual-group",
                "explanation": reference.get("text", ""),
                "reviewRequired": not bool(reference),
                "source": {"file": source, "heading": heading, "answerFile": reference.get("file")},
                "sourceQuestionCount": approximate_question_count(body, category),
            }
            grouped[category].append(question)
            sources[category].add(source)

    entries = []
    for category, questions in grouped.items():
        # Drop exact repeated yearly sections while retaining which year/source was merged.
        unique = []
        seen = {}
        duplicates = []
        for question in questions:
            key = re.sub(r"[^a-z0-9]+", "", unicodedata.normalize("NFKD", question["passage"]).lower())
            if key in seen:
                duplicates.append({"id": question["id"], "duplicateOf": seen[key], "source": question["source"]})
                continue
            seen[key] = question["id"]
            unique.append(question)
        used_ids = set()
        for question in unique:
            base_id = question["id"]
            candidate = base_id
            suffix = 1
            while candidate in used_ids:
                suffix += 1
                candidate = f"{base_id}-{suffix}"
            question["id"] = candidate
            used_ids.add(candidate)
        folder = TYPE_FOLDERS[category]
        path = OUT / "types" / folder
        path.mkdir(parents=True, exist_ok=True)
        bank_id = f"kaoyan-1980-2020-{folder}"
        question_count = sum(q["sourceQuestionCount"] for q in unique)
        reference_group_count = sum(bool(q["explanation"]) for q in unique)
        data = {
            "id": bank_id, "exam": "postgraduate", "title": f"{category} · 1980–2020 历年真题",
            "category": category, "kind": "practice", "unitLabel": "年度题组", "questionCount": len(unique),
            "sourceQuestionCount": question_count, "answerCount": 0,
            "reviewCount": sum(q["reviewRequired"] for q in unique), "duplicateCount": len(duplicates),
            "referenceGroupCount": reference_group_count,
            "duplicates": duplicates, "questions": unique,
        }
        data_path = f"types/{folder}/{bank_id}.json"
        (path / f"{bank_id}.json").write_text(json.dumps(data, ensure_ascii=False) + "\n", encoding="utf-8")
        entries.append({
            "id": bank_id, "title": data["title"], "category": category, "kind": "practice",
            "questionCount": question_count, "answerCount": 0,
            "reviewCount": data["reviewCount"], "unitLabel": "年度题组", "groupCount": len(unique),
            "referenceGroupCount": reference_group_count,
            "source": "1980–2020 历年试卷", "dataPath": data_path,
            "href": f"/exam-practice/postgraduate/{bank_id}",
        })
    index_path = OUT / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    papers_only = [item for item in index["entries"] if item.get("kind") == "paper"]
    index["entries"] = papers_only + entries
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for entry in entries:
        print(entry["category"], entry["groupCount"], entry["questionCount"], entry["referenceGroupCount"], entry["reviewCount"])


if __name__ == "__main__":
    build_banks()
