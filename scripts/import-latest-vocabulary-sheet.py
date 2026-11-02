#!/usr/bin/env python3
"""Refresh the website's word, level, frequency, and morphology metadata from 总24555."""

import argparse
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKBOOK = Path(
    "/Users/shidianjin/outputs/vocab-frequency-tier-classification-2026-11-01/"
    "总词汇表_查词等级与背词书等级_词形归并_2026-11-01.xlsx"
)
OUTPUT_DIR = ROOT / "src/data/vocabulary"
WORD_SHAPE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’ .-]{0,78}$")
DEFINITION_PREFIX = re.compile(r"^\s*释义\s*[：:]\s*", re.I)
LEVEL_ORDER = ["小学", "初中", "高中", "四级", "六级", "考研", "托雅", "SAT", "GMAT", "GRE", "其他词汇"]
LEVEL_ALIASES = {"sat": "SAT", "其他": "其他", "其它": "其他", "未分级": "其他"}
STAGE_FREQUENCY_COLUMN = {
    "初中": "中考（未释义词）",
    "高中": "高考",
    "四级": "四级",
    "六级": "六级",
    "考研": "考研（1980–2026）",
    "托雅": "雅思",
    "SAT": "SAT",
    "GMAT": "GMAT（整理版）",
    "GRE": "GRE（整理版）",
}
STAGE_FREQUENCY_COLUMNS = {
    "初中": "中考（未释义词）",
    "高中": "高考",
    "四级": "四级",
    "六级": "六级",
    "考研": "考研（1980–2026）",
    "托雅": "雅思",
    "SAT": "SAT",
    "GMAT": "GMAT（整理版）",
    "GRE": "GRE（整理版）",
}
GROUPED_STUDY_BOOKS = ["初中", "高中", "四级", "六级", "考研", "GRE", "GMAT", "SAT", "托雅"]


def cell_text(value):
    return value.strip() if isinstance(value, str) else ""


def normalize_word(value):
    ascii_word = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"^[^a-z]+|[^a-z]+$", "", ascii_word.lower())


def clean_display_word(value):
    cleaned = "".join(char for char in cell_text(value) if not (0xE000 <= ord(char) <= 0xF8FF))
    cleaned = cleaned.strip()
    if len(cleaned) >= 2 and cleaned[0] in "'\"“‘" and cleaned[-1] in "'\"”’":
        cleaned = cleaned[1:-1]
    return cleaned.strip(" ,;\t\r\n")


def number(value):
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    cleaned = str(value).replace(",", "").strip()
    try:
        return int(float(cleaned))
    except ValueError:
        return None


def canonical_level(value):
    level = cell_text(value)
    return LEVEL_ALIASES.get(level.lower(), level)


def split_levels(value):
    return [canonical_level(part) for part in re.split(r"[、,，;/|]+", cell_text(value)) if part.strip()]


def write_json(path, value):
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")
    tmp.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", nargs="?", type=Path, default=DEFAULT_WORKBOOK)
    args = parser.parse_args()
    if not args.workbook.is_file():
        raise SystemExit(f"Workbook not found: {args.workbook}")

    corrections = json.loads((OUTPUT_DIR / "definition-corrections.json").read_text(encoding="utf-8"))
    workbook = load_workbook(args.workbook, read_only=True, data_only=True)
    sheet = workbook["总24555"]
    primary_words = sorted({
        normalize_word(clean_display_word(row[0]))
        for row in workbook["小学"].iter_rows(min_row=2, min_col=3, max_col=3, values_only=True)
        if normalize_word(clean_display_word(row[0]))
    })
    rows = sheet.iter_rows(values_only=True)
    headers = {cell_text(value): index for index, value in enumerate(next(rows)) if value is not None}
    required = ["词汇", "查单词页面词汇等级", "背单词词汇书等级", "音标", "中文释义", "英文释义", "总词频排名", "总频率（各等级题目/文章单元合计）"]
    missing = [name for name in required if name not in headers]
    if missing:
        raise SystemExit(f"Missing 总24555 columns: {', '.join(missing)}")

    records = {}
    level_rows = Counter()
    multi_lookup_rows = 0
    for row in rows:
        raw_word = clean_display_word(row[headers["词汇"]])
        word = normalize_word(raw_word)
        if not WORD_SHAPE.fullmatch(raw_word) or not word:
            continue

        lookup_levels = split_levels(row[headers["查单词页面词汇等级"]]) or ["其他词汇"]
        book_levels = split_levels(row[headers["背单词词汇书等级"]])
        for level in lookup_levels:
            level_rows[level] += 1
        rank = number(row[headers["总词频排名"]])
        total_frequency = number(row[headers["总频率（各等级题目/文章单元合计）"]])
        stage_frequency = max((number(row[headers[STAGE_FREQUENCY_COLUMN[level]]]) or 0 for level in book_levels if level in STAGE_FREQUENCY_COLUMN and STAGE_FREQUENCY_COLUMN[level] in headers), default=0)
        stage_frequencies = {
            stage: number(row[headers[column]]) or 0
            for stage, column in STAGE_FREQUENCY_COLUMNS.items()
            if column in headers
        }
        stage_frequencies["小学"] = total_frequency or 0
        stage_frequencies["其他"] = total_frequency or 0

        parts = []
        for index in range(1, 9):
            value = cell_text(row[headers.get(f"词根/词缀{index}", -1)]) if f"词根/词缀{index}" in headers else ""
            parts.extend(part.strip() for part in re.split(r"\s+\+\s+", value) if part.strip())

        definition_cn = cell_text(row[headers["中文释义"]])
        english_definition = DEFINITION_PREFIX.sub("", cell_text(row[headers["英文释义"]])).strip()
        record = records.setdefault(word, {
            "definitionCn": [], "displayWord": raw_word, "englishDefinitions": [], "formationParts": [],
            "frequencyRank": None, "totalFrequency": 0, "studyFrequency": 0,
            "level": "", "studyBookMemberships": [], "studyBookGroups": {}, "phonetic": "", "stageFrequencies": {},
        })

        for level in lookup_levels:
            if level not in record["level"].split("、"):
                record["level"] = "、".join([*filter(None, record["level"].split("、")), level])
        for level in book_levels:
            if level not in record["studyBookMemberships"]:
                record["studyBookMemberships"].append(level)
        if len(lookup_levels) > 1:
            multi_lookup_rows += 1
        if book_levels:
            record["studyFrequency"] = max(record["studyFrequency"], stage_frequency or 0)
        if definition_cn and definition_cn not in record["definitionCn"]:
            record["definitionCn"].append(definition_cn)
        if english_definition and english_definition not in record["englishDefinitions"]:
            record["englishDefinitions"].append(english_definition)
        if not record["phonetic"]:
            record["phonetic"] = cell_text(row[headers["音标"]])
        if rank and (record["frequencyRank"] is None or rank < record["frequencyRank"]):
            record["frequencyRank"] = rank
        if total_frequency is not None:
            record["totalFrequency"] = max(record["totalFrequency"], total_frequency)
        for stage, frequency in stage_frequencies.items():
            record["stageFrequencies"][stage] = max(record["stageFrequencies"].get(stage, 0), frequency)
        for level in LEVEL_ORDER[:-1]:
            group_header = {"初中": "中考组号", "高中": "高考组号", "四级": "四级组号", "六级": "六级组号", "考研": "考研组号", "GRE": "GRE组号", "GMAT": "GMAT组号", "SAT": "SAT组号", "托雅": "雅思组号"}.get(level)
            if group_header and group_header in headers:
                match = re.fullmatch(r"第\s*(\d+)\s*组", cell_text(row[headers[group_header]]))
                if match:
                    record["studyBookGroups"][level] = min(record["studyBookGroups"].get(level, int(match.group(1))), int(match.group(1)))
        for part in parts:
            if part.casefold() not in {existing.casefold() for existing in record["formationParts"]}:
                record["formationParts"].append(part)

    workbook.close()
    details = {}
    rank_by_word = {}
    level_words = Counter()
    # Merge punctuation/spacing variants first, then pack the unique words into
    # contiguous 20-word groups while preserving the workbook's frequency order.
    for book in GROUPED_STUDY_BOOKS:
        members = [
            (word, record) for word, record in records.items()
            if book in record["studyBookMemberships"]
        ]
        members.sort(key=lambda item: (
            item[1]["studyBookGroups"].get(book, 10**9),
            -(item[1]["stageFrequencies"].get(book, 0)),
            item[1]["frequencyRank"] if item[1]["frequencyRank"] is not None else 10**12,
            item[0],
        ))
        for index, (_, record) in enumerate(members):
            record["studyBookGroups"][book] = index // 20 + 1
    for word, record in records.items():
        correction = corrections.get(word, {})
        level = record["level"] or "其他词汇"
        for lookup_level in split_levels(level):
            level_words[lookup_level] += 1
        record["studyBookMemberships"].sort(key=lambda item: LEVEL_ORDER.index(item) if item in LEVEL_ORDER else 99)
        details[word] = {
            "definitionCn": correction.get("definitionCn", "\n".join(record["definitionCn"])),
            "displayWord": record["displayWord"],
            "englishDefinitions": correction.get("englishDefinitions", record["englishDefinitions"]),
            "level": level,
            "studyBookMemberships": record["studyBookMemberships"],
            "studyBookGroups": record["studyBookGroups"],
            "phonetic": correction.get("phonetic", record["phonetic"]),
            "formation": " + ".join(record["formationParts"]),
            "frequencyRank": record["frequencyRank"],
            "totalFrequency": record["totalFrequency"],
            "studyFrequency": record["studyFrequency"],
            "stageFrequencies": record["stageFrequencies"],
        }
        if record["frequencyRank"]:
            rank_by_word[word] = record["frequencyRank"]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(OUTPUT_DIR / "workbook-vocabulary-details.json", details)
    write_json(OUTPUT_DIR / "primary-school-vocabulary-word-set.json", primary_words)
    write_json(OUTPUT_DIR / "total-frequency-ranks.json", {
        "source": f"{args.workbook.name} / 总24555",
        "rankByWord": rank_by_word,
    })
    print({
        "sheet_rows": sum(level_rows.values()),
        "unique_words": len(details),
        "rows_with_multiple_lookup_levels": multi_lookup_rows,
        "level_rows": dict(level_rows),
        "unique_words_by_level": dict(level_words),
        "ranked_words": len(rank_by_word),
        "detail_bytes": (OUTPUT_DIR / "workbook-vocabulary-details.json").stat().st_size,
    })


if __name__ == "__main__":
    main()
