#!/usr/bin/env python3
"""Build clean, text-only local GRE/GMAT practice banks from OCR checkpoints."""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path.cwd()
OUT = ROOT / "public" / "exam-prep"
GRE_SOURCE = Path("/private/tmp/gre_corpus_pdf.jsonl")
GMAT_SOURCE = Path("/private/tmp/gmat_question_pages.jsonl")
PROMO = re.compile(r"(?:公众号|微信号|微信ID|淘宝|二维码|扫码|添加老师|免费资料|课程咨询|GRE All in One|blog\.sina|https?://|www\.)", re.I)
WATERMARK = re.compile(r"(?:file://|C:/Users/|VitalSource|eBook Converter|\[\[PAGE:\d+\]\]|\b\d{1,2}/\d{1,2}/20\d{2},\s*\d{1,2}:\d{2}\b|第\s*!?\s*\d+\s*页)", re.I)


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").split("\n") if line.strip()]


def clean(text):
    lines = []
    for raw in str(text or "").replace("\x00", "").replace("\r", "").splitlines():
        line = re.sub(r"[\t\u00a0 ]+", " ", raw).strip()
        if not line or PROMO.search(line) or WATERMARK.search(line):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def canonical(text):
    return re.sub(r"[^a-z0-9]+", "", unicodedata.normalize("NFKD", text).lower())


def options_from(block, labels="A-I"):
    plain = list(labels.replace("-", ""))
    circled_all = "ⒶⒷⒸⒹⒺⒻⒼⒽⒾ"
    circled = circled_all[:len(plain)]
    marker = rf"(?:[{labels}]\.|[{circled}])"
    pattern = re.compile(rf"(?ms)^[ \t]*({marker})[ \t]*(.*?)(?=^[ \t]*{marker}[ \t]*|\Z)")
    circled_map = dict(zip(circled_all, "ABCDEFGHI"))
    return [{"label": circled_map.get(m.group(1)[0], m.group(1)[0]), "text": clean(m.group(2))} for m in pattern.finditer(block)]


def first_option_start(block, labels="A-I"):
    plain = list(labels.replace("-", ""))
    circled = "ⒶⒷⒸⒹⒺⒻⒼⒽⒾ"[:len(plain)]
    return re.search(rf"(?m)^[ \t]*(?:[{labels}]\.|[{circled}])[ \t]*", block)


def split_questions(text, first, last):
    matches = []
    pattern = re.compile(r"(?m)^[ \t]*(\d{1,3})\.(?!\d)[ \t]*(?=\S|(?:\r?\n[ \t]*)+[A-E]\.)")
    for m in pattern.finditer(text):
        number = int(m.group(1))
        if first <= number <= last and (not matches or number > matches[-1][0]):
            matches.append((number, m.start(), m.end()))
    result = []
    for index, (number, start, body_start) in enumerate(matches):
        end = matches[index + 1][1] if index + 1 < len(matches) else len(text)
        block = text[body_start:end]
        next_passage = re.search(r"(?m)^\s*Line\s+", block)
        if next_passage:
            block = block[:next_passage.start()]
        result.append((number, clean(block), start))
    return result, matches


def split_explanations(text, first, last):
    blocks, _ = split_questions(text, first, last)
    return {number: body for number, body, _ in blocks if body}


def explanations_by_prompt(text, questions):
    tokens = list(re.finditer(r"[A-Za-z0-9]+", text.lower()))
    output = {}
    cursor = 0
    for question in questions:
        words = re.findall(r"[A-Za-z0-9]+", question.get("prompt", "").lower())
        if len(words) < 5:
            continue
        phrase = words[:10]
        found = None
        for i in range(cursor, len(tokens) - len(phrase) + 1):
            if [token.group(0) for token in tokens[i:i + len(phrase)]] == phrase:
                found = i
                break
        if found is not None:
            output[question["id"]] = tokens[found].start()
            cursor = found + len(phrase)
    ordered = sorted((start, question_id) for question_id, start in output.items())
    return {question_id: clean(text[start:(ordered[i + 1][0] if i + 1 < len(ordered) else len(text))])
            for i, (start, question_id) in enumerate(ordered)}


def page_at(text, position):
    found = list(re.finditer(r"\[\[PAGE:(\d+)\]\]", text[:position]))
    return int(found[-1].group(1)) if found else None


def write_bank(exam, bank_id, title, category, source, questions, kind="practice"):
    seen = {}
    unique = []
    duplicates = []
    for q in questions:
        key = canonical(q.get("prompt", "") + " " + " ".join(o.get("text", "") for o in q.get("options", [])))
        if key and key in seen:
            duplicates.append({"id": q.get("id"), "duplicateOf": seen[key], "source": q.get("source")})
            continue
        if key:
            seen[key] = q.get("id")
        unique.append(q)
    answer_count = sum(bool(q.get("answer")) for q in unique)
    review_count = sum(bool(q.get("reviewRequired")) for q in unique)
    type_folders = {
        "填空": "fill-in", "阅读理解": "reading-comprehension", "逻辑推理": "logical-reasoning",
        "定量推理": "quantitative-reasoning", "数据洞察 · 数据充分性": "data-sufficiency",
        "数据洞察 · 两部分分析": "two-part-analysis", "批判性推理": "critical-reasoning",
    }
    folder = type_folders.get(category, canonical(category) or "other")
    root = OUT / exam / "types" / folder
    root.mkdir(parents=True, exist_ok=True)
    data_path = f"types/{folder}/{bank_id}.json"
    data = {
        "id": bank_id, "exam": exam, "title": title, "category": category,
        "kind": kind, "source": source, "questionCount": len(unique),
        "answerCount": answer_count, "reviewCount": review_count,
        "duplicateCount": len(duplicates), "duplicates": duplicates, "questions": unique,
    }
    (root / f"{bank_id}.json").write_text(json.dumps(data, ensure_ascii=False) + "\n", encoding="utf-8")
    return {"id": bank_id, "title": title, "category": category, "kind": kind,
            "questionCount": len(unique), "answerCount": answer_count, "reviewCount": review_count,
            "source": source, "dataPath": data_path, "href": f"/exam-practice/{exam}/{bank_id}"}


def build_gre(gre_rows):
    sources = {row["path"]: row["text"] for row in gre_rows}
    entries = []

    # 100-section GRE fill-in bank with its matching section answer key and explanation volume.
    fill_name = "GRE填空机经1000题难度分级版%28含答案%29.pdf"
    fill_text = sources[fill_name]
    key_headers = list(re.finditer(r"(?mi)^section\s+(\d+)\s+[^\n]*\n\s*1-5\s+([A-I/]+)\s+6-10\s+([A-I/]+)", fill_text))
    key_map = {}
    for m in key_headers:
        answers = m.group(2).split("/") + m.group(3).split("/")
        if len(answers) == 10:
            key_map[int(m.group(1))] = {i + 1: answer for i, answer in enumerate(answers)}
    exp_text = sources.get("考满分1000填空解析.pdf", "")
    exp_headers = list(re.finditer(r"(?mi)^section\s*(\d+)\s*解析", exp_text))
    explanations = {}
    for i, header in enumerate(exp_headers):
        end = exp_headers[i + 1].start() if i + 1 < len(exp_headers) else len(exp_text)
        section_no = int(header.group(1))
        block = exp_text[header.end():end]
        qs = re.finditer(r"(?ms)^\s*(\d{1,2})\.\s*解析[：:]\s*(.*?)(?=^\s*\d{1,2}\.\s*解析[：:]|\Z)", block)
        for q in qs:
            explanations[(section_no, int(q.group(1)))] = clean(q.group(2))
    fill_questions = []
    first_key = next(m.start() for m in key_headers if int(m.group(1)) == 1)
    second_key = next(m.start() for m in key_headers if int(m.group(1)) == 51)
    second_body = next(m.start() for m in re.finditer(r"(?mi)^section\s+51\s+easy\b", fill_text) if first_key < m.start() < second_key)
    for body_start, body_end in [(4000, first_key), (second_body, second_key)]:
        body = fill_text[body_start:body_end]
        section_headers = list(re.finditer(r"(?mi)^section\s+(\d+)\s+(easy|median|medium|hard)\b", body))
        for i, section in enumerate(section_headers):
            end = section_headers[i + 1].start() if i + 1 < len(section_headers) else len(body)
            section_no = int(section.group(1))
            difficulty = section.group(2).title()
            text = body[section.end():end]
            parsed, _ = split_questions(text, 1, 10)
            answer_section = key_map.get(section_no, {})
            for number, block, offset in parsed:
                opts = options_from(block)
                option_start = first_option_start(block)
                prompt = clean(block[:option_start.start()] if option_start else block)
                answer = answer_section.get(number)
                explanation = explanations.get((section_no, number), "")
                fill_questions.append({
                    "id": f"s{section_no}-q{number}", "number": number,
                    "group": f"第 {section_no} 组", "difficulty": difficulty,
                    "prompt": prompt, "options": opts, "answer": answer,
                    "answerMode": "multi" if answer and len(answer) > 1 else "choice",
                    "explanation": explanation,
                    "reviewRequired": len(opts) < 4 or not answer or not explanation,
                    "source": {"file": fill_name, "section": section_no},
                })
    entries.append(write_bank("gre", "gre-fill-1000", "填空 · 100 组练习", "填空", fill_name, fill_questions))

    # Reading comprehension and critical reasoning from the 101-passage collection.
    read_name = "101篇分类分级解析版.pdf"
    read_text = sources[read_name]
    heads = list(re.finditer(r"(?m)^Passage\s+(\d+)\s*（([^\n]*)", read_text))
    first = next((i for i, h in enumerate(heads) if h.group(1) == "1" and h.start() > 5000), None)
    if first is not None:
        heads = heads[first:]
    reading_questions, logic_questions = [], []
    for i, head in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(read_text)
        passage_block = read_text[head.end():end]
        question_matches = list(re.finditer(r"(?m)^[ \t]*(\d{1,2})\.[ \t]+(?=\S)", passage_block))
        if not question_matches:
            continue
        passage_text = clean(passage_block[:question_matches[0].start()])
        topic = clean(head.group(2)).replace("）", "").strip()
        is_logic = "逻辑单题" in topic
        for j, match in enumerate(question_matches):
            q_end = question_matches[j + 1].start() if j + 1 < len(question_matches) else len(passage_block)
            block = clean(passage_block[match.end():q_end])
            answer_match = re.search(r"(?m)^答案\s*[：:]\s*([A-I]+)\b", block)
            explanation_match = re.search(r"(?m)^解析\s*[：:]\s*(.*)", block, re.S)
            answer = answer_match.group(1) if answer_match else None
            exam_part = block[:answer_match.start()] if answer_match else (block[:explanation_match.start()] if explanation_match else block)
            opts = options_from(exam_part, "A-E")
            option_start = first_option_start(exam_part, "A-E")
            prompt = clean(exam_part[:option_start.start()] if option_start else exam_part)
            explanation = clean(explanation_match.group(1)) if explanation_match else ""
            q = {
                "id": f"p{head.group(1)}-q{match.group(1)}", "number": int(match.group(1)),
                "group": f"Passage {head.group(1)} · {topic}", "passageTitle": f"Passage {head.group(1)}",
                "passage": passage_text, "prompt": prompt, "options": opts, "answer": answer,
                "answerMode": "multi" if answer and len(answer) > 1 else "choice",
                "explanation": explanation, "reviewRequired": len(opts) < 2 or not answer,
                "source": {"file": read_name, "passage": int(head.group(1))},
            }
            (logic_questions if is_logic else reading_questions).append(q)
    entries.append(write_bank("gre", "gre-reading-101", "阅读理解 · 101 篇", "阅读理解", read_name, reading_questions))
    entries.append(write_bank("gre", "gre-logic-101", "逻辑推理 · 101 篇", "逻辑推理", read_name, logic_questions))
    (OUT / "gre" / "index.json").write_text(json.dumps({"exam": "gre", "entries": entries}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_gmat(gmat_rows):
    pages = sorted(gmat_rows, key=lambda row: row["page"])
    text_parts, page_marks, cursor = [], [], 0
    for row in pages:
        marker = f"\n[[PAGE:{row['page']}]]\n"
        page_marks.append((cursor, row["page"]))
        text_parts.extend([marker, row["text"], "\n"])
        cursor += len(marker) + len(row["text"]) + 1
    full = "".join(text_parts)
    def marker_pos(title, after=0):
        return full.rfind(title, after)
    def interval(start_title, end_title):
        start = marker_pos(start_title)
        if start < 0:
            return "", -1, -1
        end = full.find(end_title, start + len(start_title))
        return (full[start:end] if end >= 0 else full[start:]), start, end
    def build_set(bank_id, title, category, q_start, q_end, pstart, pend, kstart, kend, estart, eend, multi=False, reading=False):
        practice, p0, _ = interval(pstart, pend)
        keys, _, _ = interval(kstart, kend)
        explanations, _, _ = interval(estart, eend)
        parsed, matches = split_questions(practice, q_start, q_end)
        key_map = {}
        if multi:
            for m in re.finditer(r"(?m)^\s*(\d{3})\.\s*(.*)$", keys):
                qid = int(m.group(1))
                if q_start <= qid <= q_end:
                    cells = re.split(r"\s{3,}", m.group(2).strip(), maxsplit=1)
                    if len(cells) == 2:
                        key_map[qid] = " / ".join(clean(x) for x in cells)
        else:
            for m in re.finditer(r"(?m)^\s*(\d{1,3})\.\s*([A-E])\s*$", keys):
                qid = int(m.group(1))
                if q_start <= qid <= q_end:
                    key_map[qid] = m.group(2)
        questions = []
        context_markers = list(re.finditer(r"(?m)^\s*Line\s+", practice)) if reading else []
        for number, block, offset in parsed:
            opts = options_from(block, "A-E")
            if bank_id == "gmat-di-sufficiency":
                opts = [
                    {"label": "A", "text": "陈述 (1) 单独足以回答问题，但陈述 (2) 单独不足。"},
                    {"label": "B", "text": "陈述 (2) 单独足以回答问题，但陈述 (1) 单独不足。"},
                    {"label": "C", "text": "两个陈述结合后足以回答问题，但各自单独都不足。"},
                    {"label": "D", "text": "每个陈述单独都足以回答问题。"},
                    {"label": "E", "text": "两个陈述结合后仍不足以回答问题。"},
                ]
            option_start = first_option_start(block, "A-E")
            prompt = clean(block[:option_start.start()] if option_start else block)
            context = ""
            if reading:
                previous = [m for m in context_markers if m.start() < offset]
                if previous:
                    context_start = previous[-1].start()
                    first_q = next((pos for _, pos, _ in matches if pos > context_start), offset)
                    context = clean(practice[context_start:first_q])
            answer = key_map.get(number)
            qpage = page_at(practice, offset)
            source_page = page_at(full, p0 + offset)
            if not prompt:
                prompt = "题面文字或图表未能从原始资料中提取完整，请复核来源页后再作答。"
            flags = bool(re.search(r"\b(?:figure|graph|chart)\s+(?:above|below)|shown\s+(?:above|below)|see\s+(?:the\s+)?figure|graph\s+shows", block, re.I))
            questions.append({
                "id": f"{bank_id}-q{number}", "number": number,
                "group": category, "passage": context,
                "prompt": prompt, "options": opts, "answer": answer,
                "answerMode": "text" if multi or len(opts) != 5 else "choice",
                "explanation": "",
                "reviewRequired": (not answer) or (not multi and len(opts) != 5) or flags
                    or (not multi and any(not option["text"] for option in opts)),
                "source": {"file": "GMAT OG 24-25.pdf", "page": source_page or qpage},
            })
        prompt_explanations = explanations_by_prompt(explanations, questions)
        for question in questions:
            question["explanation"] = prompt_explanations.get(question["id"], "")
            if not question["explanation"]:
                question["reviewRequired"] = True
        return write_bank("gmat", bank_id, title, category, "GMAT OG 24-25.pdf", questions)

    entries = [
        build_set("gmat-quant", "定量推理 · 官方指南", "定量推理", 1, 271,
                  "4.2 Practice Questions", "4.3 Answer Key", "4.3 Answer Key", "4.4 Answer Explanations",
                  "4.4 Answer Explanations", "6.0 Data Insights"),
        build_set("gmat-di-sufficiency", "数据充分性 · 官方指南", "数据洞察 · 数据充分性", 272, 407,
                  "6.4 Practice Questions: Data Sufficiency", "6.5 Answer Key: Data Sufficiency",
                  "6.5 Answer Key: Data Sufficiency", "6.6 Answer Explanations: Data Sufficiency",
                  "6.6 Answer Explanations: Data Sufficiency", "6.7 Practice Questions: Two-Part Analysis"),
        build_set("gmat-di-two-part", "两部分分析 · 官方指南", "数据洞察 · 两部分分析", 408, 455,
                  "6.7 Practice Questions: Two-Part Analysis", "6.8 Answer Key: Two-Part Analysis",
                  "6.8 Answer Key: Two-Part Analysis", "6.9 Answer Explanations: Two-Part Analysis",
                  "6.9 Answer Explanations: Two-Part Analysis", "8.0 Verbal Reasoning", multi=True),
        build_set("gmat-reading", "阅读理解 · 官方指南", "阅读理解", 456, 619,
                  "8.4 Practice Questions: Reading Comprehension", "8.5 Answer Key: Reading Comprehension",
                  "8.5 Answer Key: Reading Comprehension", "8.6 Answer Explanations: Reading Comprehension",
                  "8.6 Answer Explanations: Reading Comprehension", "8.7 Practice Questions: Critical Reasoning", reading=True),
        build_set("gmat-critical-reasoning", "批判性推理 · 官方指南", "批判性推理", 620, 801,
                  "8.7 Practice Questions: Critical Reasoning", "8.8 Answer Key: Critical Reasoning",
                  "8.8 Answer Key: Critical Reasoning", "8.9 Answer Explanations: Critical Reasoning",
                  "8.9 Answer Explanations: Critical Reasoning", "9.0 GMAT™ Official Guide Question Index"),
    ]
    (OUT / "gmat" / "index.json").write_text(json.dumps({"exam": "gmat", "entries": entries}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    gre_rows = read_jsonl(GRE_SOURCE)
    gmat_rows = [row for row in read_jsonl(GMAT_SOURCE) if row.get("source") == "GMAT OG 24-25.pdf"]
    build_gre(gre_rows)
    build_gmat(gmat_rows)
    for exam in ["gre", "gmat"]:
        index = json.loads((OUT / exam / "index.json").read_text(encoding="utf-8"))
        print(exam, [(e["id"], e["questionCount"], e["answerCount"], e["reviewCount"]) for e in index["entries"]])
