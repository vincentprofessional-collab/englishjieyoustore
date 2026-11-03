#!/usr/bin/env python3
"""Build local IELTS listening-answer and source-frequency study books."""

import json
import re
import unicodedata
from collections import Counter, OrderedDict
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
VOCAB_DIR = ROOT / "src/data/vocabulary"
ANSWER_DIR = Path("/Volumes/My HDD3/词汇音频/剑雅听力词汇答案词音频")
ANSWER_BOOK = ANSWER_DIR / "剑雅4-21听力答案词-683/剑雅4-21听力答案词-683词-完整汇总.xlsx"
NUMERIC_ANSWER_BOOK = ANSWER_DIR / "剑雅4-20听力答案词-数字与拼写特辑/剑雅4-20听力答案词-数字与拼写特辑-完整汇总.xlsx"
IELTS_FREQUENCY_BOOK = Path("/Users/shidianjin/Desktop/雅思听力与阅读_场景学科词汇频次表.xlsx")
READING_TOPIC_BOOK = VOCAB_DIR / "ielts-reading-topic-wordbook.json"
ANSWER_TEXT_FILES = [
    ANSWER_DIR / f"剑雅听力答案词-section{section}.txt"
    for section in range(1, 5)
]
OUTPUT = VOCAB_DIR / "ielts-special-learning-books.json"
COUNT_OUTPUT = VOCAB_DIR / "supplemental-learning-book-counts.json"
WORD_PATTERN = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’ .-]{0,98}$")
NUMERIC_ANSWER_PATTERN = re.compile(r"^[A-Za-z0-9£$€%.,:/()'’ +\-–]{1,110}$")
POS_PATTERN = re.compile(r"^(n\.|v\.|vt\.|vi\.|adj\.|adv\.|prep\.|conj\.|phr\.)", re.I)


def text(value):
    return value.strip() if isinstance(value, str) else ""


def normalize(value):
    decomposed = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", decomposed.lower())).strip()


def clean_topic_sheet(value):
    return re.sub(r"^\s*\d+[_ .-]*", "", text(value)).strip() or "阅读综合"


def parse_source_distribution(value):
    counts = Counter()
    for fragment in re.split(r"[；;]+", text(value)):
        match = re.fullmatch(r"\s*(.+?)\s+(\d+)\s*", fragment)
        if match:
            counts[match.group(1).strip()] += int(match.group(2))
    return counts


def read_frequency_entries():
    if not IELTS_FREQUENCY_BOOK.is_file():
        raise SystemExit(f"IELTS frequency workbook not found: {IELTS_FREQUENCY_BOOK}")
    workbook = load_workbook(IELTS_FREQUENCY_BOOK, read_only=True, data_only=True)
    entries = {}
    for sheet in workbook.worksheets:
        iterator = sheet.iter_rows(values_only=True)
        header = None
        for _ in range(5):
            row = next(iterator, None)
            if row and text(row[0]) == "排名":
                header = {text(value): index for index, value in enumerate(row) if value is not None}
                break
        if not header or "词汇 / 短语" not in header or "来源词频分布" not in header:
            continue
        for row in iterator:
            word = text(row[header["词汇 / 短语"]])
            if text(row[header.get("类型", -1)]) != "单词" or not WORD_PATTERN.fullmatch(word):
                continue
            key = normalize(word)
            if not key:
                continue
            distribution = parse_source_distribution(row[header["来源词频分布"]])
            record = entries.setdefault(key, {
                "definitionCn": "", "englishDefinition": "", "partOfSpeech": "", "phonetic": "", "word": word,
                "listening": 0, "reading": 0, "readingCategories": [],
            })
            for source, count in distribution.items():
                if source == "阅读":
                    record["reading"] += count
                    category = clean_topic_sheet(sheet.title)
                    if category not in record["readingCategories"]:
                        record["readingCategories"].append(category)
                else:
                    record["listening"] += count
            for field, column in [
                ("definitionCn", "中文释义"),
                ("englishDefinition", "英文释义"),
                ("phonetic", "音标"),
            ]:
                if not record[field] and column in header:
                    record[field] = text(row[header[column]])
            if not record["partOfSpeech"] and record["definitionCn"]:
                match = POS_PATTERN.match(record["definitionCn"])
                if match:
                    record["partOfSpeech"] = match.group(1)
    workbook.close()
    return entries


def read_answer_metadata():
    metadata = {}
    books = [
        ANSWER_DIR / "剑雅听力答案词-完整版.xlsx",
        ANSWER_BOOK,
    ]
    for path in books:
        if not path.is_file():
            continue
        workbook = load_workbook(path, read_only=True, data_only=True)
        for sheet in workbook.worksheets:
            for row in sheet.iter_rows(values_only=True):
                values = list(row)
                word = ""
                phonetic = ""
                part_of_speech = ""
                definition_cn = ""
                if path == ANSWER_BOOK:
                    if len(values) >= 5 and text(values[1]).lower() not in {"词汇", "english word"}:
                        word, phonetic, part_of_speech, definition_cn = map(text, values[1:5])
                elif sheet.title == "剑雅听力答案词-完整版":
                    if len(values) >= 5 and text(values[1]).lower() not in {"词汇", "english word"}:
                        word, phonetic, part_of_speech, definition_cn = map(text, values[1:5])
                else:
                    if len(values) >= 4:
                        word, phonetic, definition_cn = map(text, values[1:4])
                if not word or not WORD_PATTERN.fullmatch(word):
                    continue
                key = normalize(word)
                if not key:
                    continue
                record = metadata.setdefault(key, {"word": word, "phonetic": "", "partOfSpeech": "", "definitionCn": ""})
                for field, value in [("phonetic", phonetic), ("partOfSpeech", part_of_speech), ("definitionCn", definition_cn)]:
                    if value and not record[field]:
                        record[field] = value
        workbook.close()
    return metadata


def read_numeric_answer_metadata():
    if not NUMERIC_ANSWER_BOOK.is_file():
        raise SystemExit(f"IELTS numeric-answer workbook not found: {NUMERIC_ANSWER_BOOK}")
    workbook = load_workbook(NUMERIC_ANSWER_BOOK, read_only=True, data_only=True)
    metadata = {}
    for sheet in workbook.worksheets:
        iterator = sheet.iter_rows(values_only=True)
        header_row = next(iterator, None)
        if not header_row:
            continue
        header = {text(value): index for index, value in enumerate(header_row) if value is not None}
        if "内容" not in header:
            continue
        for row in iterator:
            value = row[header["内容"]]
            word = text(value) if isinstance(value, str) else str(value).strip() if isinstance(value, (int, float)) else ""
            category = text(row[header["类别"]]) if "类别" in header else ""
            if not word or not re.search(r"\d", word) or category == "人名/地名":
                continue
            if not NUMERIC_ANSWER_PATTERN.fullmatch(word):
                continue
            key = normalize(word)
            if not key:
                continue
            metadata.setdefault(key, {
                "word": word,
                "phonetic": "",
                "partOfSpeech": "num.",
                "definitionCn": f"听力答案：{category or '数字信息'}",
                "numericAnswerCategory": category,
            })
    workbook.close()
    return metadata


def read_main_details():
    path = VOCAB_DIR / "workbook-vocabulary-details.json"
    if not path.is_file():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    result = {}
    for key, entry in raw.items():
        result[normalize(str(entry.get("displayWord", key)))] = entry
    return result


def make_entry(word, key, frequency, rank, group, answer_metadata, frequency_metadata, main_details, article_category=""):
    answer = answer_metadata.get(key, {})
    freq = frequency_metadata.get(key, {})
    main = main_details.get(key, {})
    main_definitions = main.get("englishDefinitions", [])
    numeric_answer = bool(re.search(r"\d", word))
    return {
        "articleCategory": article_category,
        "definitionCn": answer.get("definitionCn") or freq.get("definitionCn") or main.get("definitionCn", ""),
        "englishDefinition": freq.get("englishDefinition") or (main_definitions[0] if main_definitions else ""),
        "frequency": frequency,
        "frequencyRank": rank,
        "group": group,
        "partOfSpeech": answer.get("partOfSpeech") or ("num." if numeric_answer else freq.get("partOfSpeech") or "n."),
        "phonetic": answer.get("phonetic") or freq.get("phonetic") or main.get("phonetic", ""),
        "word": answer.get("word") or word,
    }


def main():
    if not ANSWER_DIR.is_dir():
        raise SystemExit(f"IELTS answer vocabulary folder not found: {ANSWER_DIR}")
    frequency = read_frequency_entries()
    answer_metadata = read_answer_metadata()
    numeric_answer_metadata = read_numeric_answer_metadata()
    answer_metadata.update({key: value for key, value in numeric_answer_metadata.items() if key not in answer_metadata})
    main_details = read_main_details()
    source_path = VOCAB_DIR / "exam-source-wordbooks.json"
    source_books = json.loads(source_path.read_text(encoding="utf-8")) if source_path.exists() else {}
    topic_path = READING_TOPIC_BOOK
    topic_data = json.loads(topic_path.read_text(encoding="utf-8")) if topic_path.exists() else {"categories": [], "items": []}

    for book in ("雅思听力高频词", "雅思阅读高频词"):
        for item in source_books.get(book, []):
            key = normalize(item.get("word", ""))
            if not key:
                continue
            record = frequency.setdefault(key, {
                "definitionCn": "", "englishDefinition": "", "partOfSpeech": "", "phonetic": "", "word": item["word"],
                "listening": 0, "reading": 0, "readingCategories": [],
            })
            for field in ("definitionCn", "englishDefinition", "partOfSpeech", "phonetic"):
                if not record[field] and item.get(field):
                    record[field] = item[field]

    numeric_answer_keys = set(numeric_answer_metadata)
    answer_words = OrderedDict()
    for path in ANSWER_TEXT_FILES:
        if not path.is_file():
            raise SystemExit(f"IELTS answer word list not found: {path}")
        for line in path.read_text(encoding="utf-8-sig", errors="replace").splitlines():
            word = line.strip()
            is_word = bool(WORD_PATTERN.fullmatch(word))
            is_number_answer = bool(re.search(r"\d", word) and NUMERIC_ANSWER_PATTERN.fullmatch(word))
            key = normalize(word)
            if key and (is_word or is_number_answer):
                answer_words.setdefault(key, word)
    for key, item in answer_metadata.items():
        answer_words.setdefault(key, item["word"])

    listening_words = {}
    for key, item in frequency.items():
        if item["listening"] > 0:
            listening_words.setdefault(key, item.get("word", key))
    for item in source_books.get("雅思听力高频词", []):
        key = normalize(item.get("word", ""))
        if key:
            listening_words.setdefault(key, item["word"])
    answer_keys = set(answer_words)
    listening_keys = set(listening_words) - answer_keys

    reading_candidates = OrderedDict()

    def add_reading_candidate(key, word, category="", source_order=10**12):
        if not key or key in answer_keys or key in listening_keys:
            return
        freq_record = frequency.get(key, {})
        main_record = main_details.get(key, {})
        stage_frequency = main_record.get("stageFrequencies", {}).get("雅思", 0)
        category = category or (freq_record.get("readingCategories") or [""])[0] or "阅读综合"
        candidate = reading_candidates.get(key)
        if candidate is None:
            reading_candidates[key] = {
                "word": word or main_record.get("displayWord") or freq_record.get("word") or key,
                "category": category,
                "sourceOrder": source_order,
                "frequency": stage_frequency or freq_record.get("reading", 0),
            }
        else:
            if category and not candidate["category"]:
                candidate["category"] = category
            if source_order < candidate["sourceOrder"]:
                candidate["sourceOrder"] = source_order
            candidate["frequency"] = max(candidate["frequency"], stage_frequency or freq_record.get("reading", 0))

    for item in topic_data.get("items", []):
        key = normalize(item.get("word", ""))
        add_reading_candidate(key, item.get("word", ""), item.get("articleCategory", ""), item.get("sourceOrder", 10**12))
    for source_order, (key, item) in enumerate(frequency.items()):
        if item["reading"] > 0:
            add_reading_candidate(key, item.get("word", key), source_order=source_order)
    for item in source_books.get("雅思阅读高频词", []):
        key = normalize(item.get("word", ""))
        add_reading_candidate(key, item.get("word", ""), item.get("articleCategory", ""), item.get("sourceOrder", 10**12))

    listening_keys = set(listening_keys)
    listening_candidates = []
    for key in listening_keys:
        item = frequency.get(key, {})
        main_record = main_details.get(key, {})
        listening_frequency = item.get("listening", 0) or main_record.get("stageFrequencies", {}).get("雅思", 0)
        listening_candidates.append((key, item.get("word") or listening_words.get(key) or main_record.get("displayWord") or key, listening_frequency))
    reading_candidates = {
        key: item for key, item in reading_candidates.items()
        if key not in answer_keys and key not in listening_keys
    }

    books = {}
    answer_candidates = []
    for key, word in answer_words.items():
        count = 0 if key in numeric_answer_keys else frequency.get(key, {}).get("listening", 0)
        answer_candidates.append((key, word, count))
    answer_candidates.sort(key=lambda item: (-item[2], item[0]))
    books["雅思听力答案词"] = [
        make_entry(word, key, count, index + 1, index // 20 + 1, answer_metadata, frequency, main_details)
        for index, (key, word, count) in enumerate(answer_candidates)
    ]

    listening_candidates.sort(key=lambda item: (-item[2], item[0]))
    books["雅思听力高频词"] = [
        make_entry(word, key, count, index + 1, index // 20 + 1, answer_metadata, frequency, main_details)
        for index, (key, word, count) in enumerate(listening_candidates)
    ]

    category_order = {category: index for index, category in enumerate(topic_data.get("categories", []))}
    for item in frequency.values():
        for category in item.get("readingCategories", []):
            if category not in category_order:
                category_order[category] = len(category_order)
    for item in source_books.get("雅思阅读高频词", []):
        category = item.get("articleCategory", "")
        if category and category not in category_order:
            category_order[category] = len(category_order)
    if "阅读综合" not in category_order:
        category_order["阅读综合"] = len(category_order)
    reading_sorted = sorted(reading_candidates.items(), key=lambda pair: (
        category_order.get(pair[1]["category"], len(category_order)),
        -pair[1]["frequency"], pair[1]["sourceOrder"], pair[0],
    ))
    books["雅思阅读高频词"] = [
        make_entry(item["word"], key, item["frequency"], index + 1, index // 20 + 1,
                   answer_metadata, frequency, main_details, item["category"])
        for index, (key, item) in enumerate(reading_sorted)
    ]

    tmp = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    tmp.write_text(json.dumps(books, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    tmp.replace(OUTPUT)
    counts = json.loads(COUNT_OUTPUT.read_text(encoding="utf-8")) if COUNT_OUTPUT.exists() else {}
    for book, entries in books.items():
        counts[book] = len(entries)
    tmp = COUNT_OUTPUT.with_suffix(COUNT_OUTPUT.suffix + ".tmp")
    tmp.write_text(json.dumps(counts, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    tmp.replace(COUNT_OUTPUT)
    source_word_keys = {
        normalize(entry["word"])
        for entries in books.values()
        for entry in entries
        if not re.search(r"\d", entry["word"])
    }
    all_keys = [normalize(entry["word"]) for entries in books.values() for entry in entries]
    print(json.dumps({
        "books": {book: len(entries) for book, entries in books.items()},
        "uniqueAllBookEntries": len(set(all_keys)),
        "uniqueWordsForTotalVocabulary": len(source_word_keys),
        "numberAnswersKeptOutOfTotal": sum(1 for entry in books["雅思听力答案词"] if re.search(r"\d", entry["word"])),
        "readingCategories": {category: sum(entry["articleCategory"] == category for entry in books["雅思阅读高频词"]) for category in category_order},
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
