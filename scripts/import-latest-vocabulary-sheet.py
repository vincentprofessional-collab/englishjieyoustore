#!/usr/bin/env python3
"""Refresh the website's word, level, frequency, and morphology metadata from 总24555."""

import argparse
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKBOOK = Path(
    "/Users/shidianjin/outputs/official-vocabulary-integration-2026-11-02/"
    "总词汇表_官方大纲等级与词频整理_2026-11-02.xlsx"
)
OUTPUT_DIR = ROOT / "src/data/vocabulary"
WORD_SHAPE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’ .-]{0,78}$")
IELTS_SOURCE_SHAPE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’& .-]{0,110}$")
DEFINITION_PREFIX = re.compile(r"^\s*释义\s*[：:]\s*", re.I)
GCIDE_SOURCE = re.compile(r"\bgcide\b", re.I)
DISCARDED_MORPHOLOGY = re.compile(r"gcide|iferror|历史词形|历史来源形式|同源形式|非构词拆分", re.I)
HISTORICAL_SOURCE_FORM = re.compile(r"^(?:Old(?: English| Saxon| Norse| French| High German)?|Middle(?: English| High German| Dutch)?|Proto-[A-Za-z-]+|Anglo-Saxon)\s+\S+(?:\s+(.*))?$", re.I)
MORPHOLOGY_CORRECTIONS = {
    "about": ["ab-（离开、远离）", 'PIE root *ambhi- "around"；周围'],
    "unaware": ["un-；不、非；反向、取消", "aware（知道；意识到；同族词推断）"],
    "self-awareness": ['Proto-Germanic *selbaz- "self,"；自身、自己', "aware（知道；意识到；同族词推断）", "-ness（性质/状态名词后缀）"],
    "public-awareness": ["Latin populus-a people, nation; body of citizens; a multitude, crowd, throng；人民、民族、公民群体、人群", "aware（知道；意识到；同族词推断）", "-ness（性质/状态名词后缀）"],
    "never-ending": ['PIE root *ne- "not"；不、非', 'PIE root *aiw- "life, long life, eternity"；永恒', "end（结束）", "-ing（进行式/动名词后缀）"],
    "slow-burning": ['PIE root *sleg- "be slack, be languid"；松弛、倦怠', "burn（燃烧）", "-ing（进行式/动名词后缀）"],
    "coal-burning": ['PIE root *g(e)u-lo- "live coal"；煤、炭', "burn（燃烧）", "-ing（进行式/动名词后缀）"],
    "groundskeeper": ["ground（地面、土地）", "Proto-Germanic *kap-（照看；看管）", "-s（复合词连接形式）", "-er（从事者后缀）"],
    "water-storage": ['PIE *wed- (1) "water; wet"；水、湿', "store（储存）", "-age（名词后缀）"],
    "endearment": ["en-（使成为）", "dear（亲爱的）", "-ment（动作、结果或状态名词后缀）"],
    "gon": ["Greek gōnia（角、角度）", "-gon（构成多边形名称的后缀）"],
}
LEVEL_ORDER = [
    "小学", "初中", "高中", "高考必修", "高中必修词汇", "高中选修词汇",
    "四级", "四级核心词汇", "四级派生词", "六级", "六级核心词汇", "六级派生词",
    "考研", "托雅", "SAT", "GMAT", "GRE", "雅思", "其他词汇",
]
LEVEL_ALIASES = {"sat": "SAT", "其他": "其他", "其它": "其他", "未分级": "其他"}
STAGE_FREQUENCY_COLUMN = {
    "小学": "中考（未释义词）",
    "初中": "中考（未释义词）",
    "高中": "高考",
    "四级": "四级",
    "六级": "六级",
    "考研": "考研（1980–2026）",
    "托雅": "雅思",
    "SAT": "SAT",
    "GMAT": "GMAT（整理版）",
    "GRE": "GRE（整理版）",
    "高中必修词汇": "高考",
    "高中选修词汇": "高考",
    "高考必修": "高考",
    "四级核心词汇": "四级",
    "四级派生词": "四级",
    "六级核心词汇": "六级",
    "六级派生词": "六级",
    "雅思": "雅思",
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
    "高中必修词汇": "高考",
    "高中选修词汇": "高考",
    "高考必修": "高考",
    "四级核心词汇": "四级",
    "四级派生词": "四级",
    "六级核心词汇": "六级",
    "六级派生词": "六级",
    "雅思": "雅思",
}
GROUPED_STUDY_BOOKS = [
    "小学", "初中", "高中", "高考必修", "高中必修词汇", "高中选修词汇", "四级", "四级核心词汇", "四级派生词",
    "六级", "六级核心词汇", "六级派生词", "考研", "GRE", "GMAT", "SAT", "托雅", "雅思", "其他词汇",
]
STUDY_BOOK_MAX_WORDS = {
    "小学": 1000,
    "初中": 2000,
    "高中": 4200,
    "四级": 5000,
    "六级": 6500,
    "考研": 5500,
    "托雅": 10000,
    "SAT": 12000,
    "GMAT": 15000,
    "GRE": 18000,
    "雅思": 8000,
}


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


def grade_memberships(value):
    lookup_levels = []
    book_levels = []

    def add(level, book=None):
        if level not in lookup_levels:
            lookup_levels.append(level)
        target = book or level
        if target not in book_levels:
            book_levels.append(target)

    for label in re.split(r"[;；]+", cell_text(value)):
        label = label.strip()
        if label.startswith("小学大纲星标词汇"):
            add("小学")
        elif label.startswith("初中大纲词汇"):
            add("初中")
        elif label.startswith("高中必修大纲词汇"):
            add("高中")
            add("高中必修词汇")
        elif label.startswith("高中选择性必修大纲词汇"):
            add("高中")
            add("高中选修词汇")
        elif label.startswith("四级大纲词汇"):
            add("四级")
            add("四级核心词汇")
        elif label.startswith("四级大纲派生词"):
            add("四级")
            add("四级派生词")
        elif label.startswith("六级大纲词汇"):
            add("六级")
            add("六级核心词汇")
        elif label.startswith("六级大纲派生词"):
            add("六级")
            add("六级派生词")
        elif label.startswith("考研英语一、二大纲词汇"):
            add("考研")
        elif label.startswith("考研英语一大纲词汇"):
            add("考研")
            add("考研英语一")
        elif label.startswith("考研英语二大纲词汇"):
            add("考研")
            add("考研英语二")
        elif label.startswith("中考真题词汇"):
            add("中考", "初中")
        elif label.startswith("高考真题词汇"):
            add("高考", "高中")
        elif label.startswith("四级真题词汇"):
            add("四级")
        elif label.startswith("六级真题词汇"):
            add("六级")
        elif label.startswith("考研真题词汇"):
            add("考研")
        elif label.startswith("GRE真题词汇"):
            add("GRE")
        elif label.startswith("GMAT真题词汇"):
            add("GMAT")
        elif label.startswith("SAT真题词汇"):
            add("SAT")
        elif label.startswith("雅思真题词汇"):
            add("雅思")
        elif label == "其它":
            add("其他词汇")

    if not book_levels:
        add("其他词汇")
    lookup_levels.sort(key=lambda item: LEVEL_ORDER.index(item) if item in LEVEL_ORDER else 99)
    book_levels.sort(key=lambda item: LEVEL_ORDER.index(item) if item in LEVEL_ORDER else 99)
    return lookup_levels, book_levels


def direct_book_memberships(book_levels):
    return sorted(
        set(book_levels),
        key=lambda item: LEVEL_ORDER.index(item) if item in LEVEL_ORDER else 99,
    )


def clean_morphology(row, headers, word):
    """Return current workbook morphology without GCIDE-only or historical debris."""
    source = cell_text(row[headers["词根信息来源"]]) if "词根信息来源" in headers else ""
    source_tags = [tag.strip() for tag in re.split(r"[；;|]+", source) if tag.strip()]
    gcide_only = bool(source_tags) and all(GCIDE_SOURCE.search(tag) for tag in source_tags)
    if gcide_only:
        return "", [], ""

    etymology = cell_text(row[headers["词源"]]) if "词源" in headers else ""
    if GCIDE_SOURCE.search(etymology) or re.search(r"历史词形|历史来源形式|同源形式|非构词拆分|同族词推断|组成词：|构词依据：", etymology, re.I):
        etymology = ""

    historical_forms = set()
    for index in range(1, 9):
        header = f"词根/词缀{index}"
        value = cell_text(row[headers[header]]) if header in headers else ""
        if re.search(r"历史词形|历史来源形式|同源形式|非构词拆分", value, re.I):
            forms = re.split(r"[；;、,，]+", re.split(r"[：:]", value, maxsplit=1)[-1])
            historical_forms.update(form.strip().casefold() for form in forms if form.strip())

    parts = []
    for index in range(1, 9):
        header = f"词根/词缀{index}"
        value = cell_text(row[headers[header]]) if header in headers else ""
        for part in re.split(r"\s+\+\s+", value):
            part = part.strip()
            if not part or DISCARDED_MORPHOLOGY.search(part):
                continue
            part = re.sub(r"^单一词根\s*[/：:]\s*", "", part).strip()
            part_form = re.split(r"[；：:]", part, maxsplit=1)[0].strip().casefold()
            if part_form in historical_forms:
                continue
            historical_match = HISTORICAL_SOURCE_FORM.match(part)
            if historical_match and not historical_match.group(1):
                continue
            if part.casefold() == word.casefold():
                continue
            if word.casefold() == "aback" and re.match(r"^Old English bæc\b", part, re.I):
                part = "back（后方；背部）"
            if part.casefold() not in {existing.casefold() for existing in parts}:
                parts.append(part)

    if word.casefold() in MORPHOLOGY_CORRECTIONS:
        parts = MORPHOLOGY_CORRECTIONS[word.casefold()].copy()
        etymology = ""

    source_tags = [tag for tag in source_tags if not GCIDE_SOURCE.search(tag)]
    source_tags = [tag for tag in source_tags if not DISCARDED_MORPHOLOGY.search(tag)]
    return etymology, parts, "；".join(source_tags)


def source_base_word(value, records):
    word = normalize_word(value)
    if word in records:
        return word
    candidates = []
    if len(word) >= 5 and word.endswith("ies"):
        candidates.append(word[:-3] + "y")
    if len(word) >= 6 and word.endswith("ing"):
        stem = word[:-3]
        candidates.extend([stem[:-1] if len(stem) > 2 and stem[-1] == stem[-2] else stem, stem, stem + "e"])
    if len(word) >= 5 and word.endswith("ied"):
        candidates.append(word[:-3] + "y")
    if len(word) >= 5 and word.endswith("ed"):
        stem = word[:-2]
        candidates.extend([stem[:-1] if len(stem) > 2 and stem[-1] == stem[-2] else stem, stem, stem + "e"])
    if len(word) >= 5 and word.endswith("es"):
        candidates.extend([word[:-2], word[:-2] + "e"])
    if len(word) >= 5 and word.endswith("s"):
        candidates.append(word[:-1])
    if len(word) >= 6 and word.endswith("est"):
        stem = word[:-3]
        candidates.extend([
            stem[:-1] if len(stem) > 2 and stem[-1] == stem[-2] else stem + "e",
            stem,
        ])
    if len(word) >= 5 and word.endswith("er"):
        stem = word[:-2]
        candidates.extend([
            stem[:-1] if len(stem) > 2 and stem[-1] == stem[-2] else stem + "e",
            stem,
        ])
    return next((candidate for candidate in candidates if candidate in records), word)


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
    rows = sheet.iter_rows(values_only=True)
    headers = {cell_text(value): index for index, value in enumerate(next(rows)) if value is not None}
    total_frequency_header = next((name for name in headers if name.startswith("总频率")), None)
    required = ["词汇", "调整后等级", "音标", "中文释义", "英文释义", "总词频排名"]
    missing = [name for name in required if name not in headers]
    if total_frequency_header is None:
        missing.append("总频率")
    if missing:
        raise SystemExit(f"Missing 总24555 columns: {', '.join(missing)}")

    records = {}
    level_rows = Counter()
    multi_lookup_rows = 0
    primary_words = set()
    for row in rows:
        raw_word = clean_display_word(row[headers["词汇"]])
        word = normalize_word(raw_word)
        if not WORD_SHAPE.fullmatch(raw_word) or not word:
            continue

        lookup_levels, book_levels = grade_memberships(row[headers["调整后等级"]])
        if not lookup_levels:
            lookup_levels = ["其他词汇"]
        book_levels = direct_book_memberships(book_levels)
        if "小学" in book_levels:
            primary_words.add(word)
        for level in lookup_levels:
            level_rows[level] += 1
        rank = number(row[headers["总词频排名"]])
        total_frequency = number(row[headers[total_frequency_header]])
        stage_frequency = max((number(row[headers[STAGE_FREQUENCY_COLUMN[level]]]) or 0 for level in book_levels if level in STAGE_FREQUENCY_COLUMN and STAGE_FREQUENCY_COLUMN[level] in headers), default=0)
        stage_frequencies = {
            stage: number(row[headers[column]]) or 0
            for stage, column in STAGE_FREQUENCY_COLUMNS.items()
            if column in headers
        }
        stage_frequencies["小学"] = stage_frequencies.get("初中", 0)
        stage_frequencies["其他"] = total_frequency or 0

        _, parts, _ = clean_morphology(row, headers, word)

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
        for part in parts:
            if part.casefold() not in {existing.casefold() for existing in record["formationParts"]}:
                record["formationParts"].append(part)

    workbook.close()
    source_book_path = OUTPUT_DIR / "exam-source-wordbooks.json"
    source_books = json.loads(source_book_path.read_text(encoding="utf-8")) if source_book_path.exists() else {}
    ielts_special_path = OUTPUT_DIR / "ielts-special-learning-books.json"
    ielts_special_books = json.loads(ielts_special_path.read_text(encoding="utf-8")) if ielts_special_path.exists() else {}
    source_priority = defaultdict(set)
    source_only_words = 0
    for source_book in ("SAT", "GMAT", "GRE", "雅思"):
        for source_entry in source_books.get(source_book, []):
            raw_word = clean_display_word(source_entry.get("word", ""))
            word = source_base_word(raw_word, records)
            if not word or not WORD_SHAPE.fullmatch(raw_word):
                continue
            record = records.get(word)
            if record is None:
                record = {
                    "definitionCn": [], "displayWord": raw_word, "englishDefinitions": [], "formationParts": [],
                    "frequencyRank": None, "totalFrequency": 0, "studyFrequency": 0,
                    "level": "", "studyBookMemberships": [], "studyBookGroups": {}, "phonetic": "", "stageFrequencies": {},
                }
                records[word] = record
                source_only_words += 1
            definition_cn = cell_text(source_entry.get("definitionCn"))
            english_definition = cell_text(source_entry.get("englishDefinition"))
            phonetic = cell_text(source_entry.get("phonetic"))
            if definition_cn and definition_cn not in record["definitionCn"]:
                record["definitionCn"].append(definition_cn)
            if english_definition and english_definition not in record["englishDefinitions"]:
                record["englishDefinitions"].append(english_definition)
            if phonetic and not record["phonetic"]:
                record["phonetic"] = phonetic
            source_memberships = direct_book_memberships([source_book])
            for book in source_memberships:
                if book not in record["studyBookMemberships"]:
                    record["studyBookMemberships"].append(book)
                source_priority[book].add(word)
            if not record["level"]:
                if not any(record["stageFrequencies"].values()):
                    record["studyBookMemberships"].append("其他词汇") if "其他词汇" not in record["studyBookMemberships"] else None
            record["studyFrequency"] = max(
                record["studyFrequency"],
                max((record["stageFrequencies"].get(book, 0) for book in source_memberships), default=0),
            )

    # The three curated IELTS lists are required source words for the IELTS
    # master book. Numeric listening answers stay in their answer book only.
    ielts_required_words = set()
    for book in ("雅思听力答案词", "雅思听力高频词", "雅思阅读高频词"):
        for source_entry in ielts_special_books.get(book, []):
            raw_word = clean_display_word(source_entry.get("word", ""))
            if not raw_word or re.search(r"\d", raw_word) or not IELTS_SOURCE_SHAPE.fullmatch(raw_word):
                continue
            word = raw_word.casefold() if "&" in raw_word else source_base_word(raw_word, records)
            if not word:
                continue
            record = records.get(word)
            if record is None:
                record = {
                    "definitionCn": [], "displayWord": raw_word, "englishDefinitions": [], "formationParts": [],
                    "frequencyRank": None, "totalFrequency": 0, "studyFrequency": 0,
                    "level": "", "studyBookMemberships": [], "studyBookGroups": {}, "phonetic": "", "stageFrequencies": {},
                }
                records[word] = record
                source_only_words += 1
            for field, source_field in (("definitionCn", "definitionCn"), ("englishDefinitions", "englishDefinition")):
                value = cell_text(source_entry.get(source_field))
                target = record[field]
                if value and (value not in target if isinstance(target, list) else False):
                    target.append(value)
            phonetic = cell_text(source_entry.get("phonetic"))
            if phonetic and not record["phonetic"]:
                record["phonetic"] = phonetic
            source_frequency = number(source_entry.get("frequency")) or 0
            record["stageFrequencies"]["雅思"] = max(record["stageFrequencies"].get("雅思", 0), source_frequency)
            record["studyFrequency"] = max(record["studyFrequency"], source_frequency)
            if "雅思" not in record["studyBookMemberships"]:
                record["studyBookMemberships"].append("雅思")
            ielts_required_words.add(word)
    # IELTS candidates are selected from the full exam-frequency corpus, with
    # the three curated lists taking precedence over frequency-only fillers.
    source_priority["雅思"] = ielts_required_words

    details = {}
    rank_by_word = {}
    level_words = Counter()
    high_school_candidates = [
        (word, record) for word, record in records.items()
        if {"高中必修词汇", "高中选修词汇"}.intersection(record["studyBookMemberships"])
    ]
    high_school_candidates.sort(key=lambda item: (
        -item[1]["stageFrequencies"].get("高中", 0),
        item[1]["frequencyRank"] if item[1]["frequencyRank"] is not None else 10**12,
        item[0],
    ))
    for _, record in high_school_candidates[:3000]:
        if "高考必修" not in record["studyBookMemberships"]:
            record["studyBookMemberships"].append("高考必修")
    selected_by_book = {}
    study_book_max_words = dict(STUDY_BOOK_MAX_WORDS)
    study_book_max_words["雅思"] = max(study_book_max_words["雅思"], len(ielts_required_words))
    for book, maximum in study_book_max_words.items():
        members = [
            (word, record) for word, record in records.items()
            if (
                (book in record["studyBookMemberships"] or (book == "雅思" and record["stageFrequencies"].get("雅思", 0) > 0))
                and not (book == "雅思" and re.search(r"\d", word))
            )
        ]
        members.sort(key=lambda item: (
            -item[1]["stageFrequencies"].get(book, 0),
            item[1]["frequencyRank"] if item[1]["frequencyRank"] is not None else 10**12,
            item[0],
        ))
        required = selected_by_book.get("GMAT", set()) if book == "GRE" else set()
        selected = set(required)
        preferred = [(word, record) for word, record in members if word in source_priority.get(book, set())]
        for word, _ in preferred:
            if len(selected) >= maximum:
                break
            selected.add(word)
        for word, _ in members:
            if len(selected) >= maximum:
                break
            selected.add(word)
        for word, record in records.items():
            has_book = book in record["studyBookMemberships"]
            keep_book = word in selected
            if keep_book and not has_book:
                record["studyBookMemberships"].append(book)
            elif has_book and not keep_book:
                record["studyBookMemberships"].remove(book)
        selected_by_book[book] = selected
    # The source now has no group-number columns; derive each book's 20-word
    # groups directly from that exam's frequency, then total rank and spelling.
    for book in GROUPED_STUDY_BOOKS:
        members = [
            (word, record) for word, record in records.items()
            if book in record["studyBookMemberships"]
        ]
        members.sort(key=lambda item: (
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
    write_json(OUTPUT_DIR / "primary-school-vocabulary-word-set.json", sorted(primary_words))
    write_json(OUTPUT_DIR / "total-frequency-ranks.json", {
        "source": f"{args.workbook.name} / 总24555",
        "rankByWord": rank_by_word,
    })
    print({
        "sheet_rows": sum(level_rows.values()),
        "unique_words": len(details),
        "new_words_from_exam_source_lists": source_only_words,
        "ielts_curated_source_words": len(ielts_required_words),
        "ielts_target_words": study_book_max_words["雅思"],
        "rows_with_multiple_lookup_levels": multi_lookup_rows,
        "level_rows": dict(level_rows),
        "unique_words_by_level": dict(level_words),
        "ranked_words": len(rank_by_word),
        "detail_bytes": (OUTPUT_DIR / "workbook-vocabulary-details.json").stat().st_size,
    })


if __name__ == "__main__":
    main()
