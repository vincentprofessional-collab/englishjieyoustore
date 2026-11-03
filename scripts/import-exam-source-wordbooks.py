#!/usr/bin/env python3
"""Extract headwords from the user's local exam vocabulary collections."""

import json
import re
import subprocess
import unicodedata
from collections import OrderedDict
from pathlib import Path

from docx import Document
from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/data/vocabulary/exam-source-wordbooks.json"
SOURCE_ROOTS = {
    "SAT": Path("/Volumes/My HDD3/备课/词汇/SAT词汇"),
    "GMAT": Path("/Volumes/My HDD3/备课/词汇/GMAT词汇"),
    "GRE": Path("/Volumes/My HDD3/备课/词汇/GRE词汇"),
    "IELTS": Path("/Volumes/My HDD3/备课/IELTS/雅思词汇"),
}
POS_TOKEN = re.compile(r"^(?:n|v|vt|vi|adj|adv|prep|pron|conj|phr|aux|num)(?:\.|$)", re.I)
POS_IN_TEXT = re.compile(r"(?<![A-Za-z])(?:n\.|v\.|vt\.|vi\.|adj\.|adv\.|prep\.|phr\.)(?=\s|$|[\u3400-\u9fff])", re.I)
COMMON_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "can", "do", "for", "from",
    "had", "has", "have", "he", "her", "his", "i", "if", "in", "is", "it", "its", "me", "my",
    "no", "not", "of", "on", "or", "our", "she", "so", "than", "that", "the", "their", "them",
    "then", "there", "they", "this", "to", "us", "was", "we", "were", "what", "when", "which",
    "who", "will", "with", "you", "your",
    "all", "basic", "chapter", "copyright", "details", "form", "forms", "grammatical", "herein",
    "including", "introduction", "materials", "page", "property", "reserved", "rights", "terms",
    "version", "vocabulary", "words", "www",
    "adjective", "adjectives", "countries", "friendly", "intrans", "phrase", "phrases", "presp", "trans",
}


def clean_text(value):
    return value.strip() if isinstance(value, str) else ""


def normalize(value):
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", ascii_value.lower())).strip()


def is_headword(value, *, allow_phrase):
    value = value.strip(" \t\r\n:;,.!?()[]{}\"“”‘’")
    if not value or not re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9'’&. -]{0,68}", value):
        return False
    if re.search(r"(?:www\.|https?://|\.com\b|\.org\b|\.net\b)", value, re.I):
        return False
    key = normalize(value)
    if not key or key in COMMON_WORDS or POS_TOKEN.match(key):
        return False
    if key in {"ii", "iii", "iv", "vi", "vii", "viii", "ix", "xi", "xii"}:
        return False
    for segment in re.split(r"[ -]+", value):
        if segment and any(char.isupper() for char in segment[1:]) and not segment.isupper():
            return False
    if re.match(r"^(?:sat|gmat|gre|ielts)(?:\s|$)", key, re.I):
        return False
    if len(key.replace(" ", "")) < 2 or any(char.isdigit() for char in value):
        return False
    if value.isupper() and value != "AIDS":
        return False
    return allow_phrase or " " not in value


def classify_ielts(path):
    path = Path(path)
    if any("词以类记" in part for part in path.parts):
        return "雅思阅读高频词"
    name = path.name.casefold()
    if "阅读" in name or "reading" in name:
        return "雅思阅读高频词"
    if "听力" in name or "listening" in name:
        return "雅思听力高频词"
    return "雅思"


def add_entry(collections, book, word, phonetic="", definition_cn="", english_definition="", source_file=""):
    word = word.strip(" \t\r\n:;,.!?()[]{}\"“”‘’")
    if not is_headword(word, allow_phrase=book.startswith("雅思")):
        return False
    key = normalize(word)
    record = collections[book].setdefault(key, {
        "definitionCn": "", "englishDefinition": "", "phonetic": "", "word": word,
    })
    if not record["definitionCn"] and definition_cn:
        record["definitionCn"] = definition_cn.strip()
    if not record["englishDefinition"] and english_definition:
        record["englishDefinition"] = english_definition.strip()
    if not record["phonetic"] and phonetic:
        record["phonetic"] = phonetic.strip()
    return True


def read_xlsx(path, base_book, collections):
    workbook = load_workbook(path, read_only=True, data_only=True)
    found = 0
    for sheet in workbook.worksheets:
        sheet_title = sheet.title.casefold()
        if base_book == "SAT" and any(item in sheet.title for item in ("四级", "六级", "托雅", "GMAT", "GRE")):
            continue
        if base_book == "GRE" and "GRE" not in path.name and path.name != "GRE10031词.xlsx":
            continue
        for row in sheet.iter_rows(values_only=True):
            values = [clean_text(value) for value in row]
            nonempty = [value for value in values if value]
            if not nonempty:
                continue
            word = ""
            phonetic = definition_cn = english_definition = ""
            if base_book in {"SAT", "GMAT", "GRE"}:
                if nonempty[0].upper() == base_book and len(nonempty) > 1:
                    word = nonempty[1]
                    if len(nonempty) > 2 and nonempty[2].startswith(("[", "/")):
                        phonetic = nonempty[2]
                    if len(nonempty) > 3:
                        definition_cn = nonempty[3]
                    if len(nonempty) > 4:
                        english_definition = nonempty[4]
                elif base_book == "GRE" and len(nonempty) == 1 and path.name == "GRE10031词.xlsx":
                    word = nonempty[0]
            else:
                word = next((value for value in nonempty if is_headword(value, allow_phrase=True)), "")
                if word:
                    try:
                        pos = values.index(word)
                    except ValueError:
                        pos = -1
                    following = values[pos + 1:] if pos >= 0 else []
                    phonetic = next((value for value in following if value.startswith(("[", "/")) and len(value) < 80), "")
                    definition_cn = next((value for value in following if re.search(r"[\u3400-\u9fff]", value)), "")
            if word and add_entry(collections, base_book if base_book != "IELTS" else classify_ielts(path), word, phonetic, definition_cn, english_definition, path.name):
                found += 1
    workbook.close()
    return found


def read_text_document(path):
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        result = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True, check=False)
        return result.stdout if result.returncode == 0 else ""
    if suffix in {".doc", ".docx", ".rtf"}:
        result = subprocess.run(["textutil", "-convert", "txt", "-stdout", str(path)], capture_output=True, text=True, check=False)
        if result.returncode == 0:
            return result.stdout
        if suffix == ".docx":
            document = Document(path)
            parts = [paragraph.text for paragraph in document.paragraphs]
            for table in document.tables:
                parts.extend(cell.text for row in table.rows for cell in row.cells)
            return "\n".join(parts)
        return ""
    if suffix == ".txt":
        return path.read_text(encoding="utf-8-sig", errors="ignore")
    return ""


def candidates_from_segment(segment):
    segment = segment.strip()
    if not segment:
        return
    segment = re.sub(r"^\s*(?:\d{1,5}[.)、:：-]?\s*)", "", segment)
    stops = []
    for pattern in (r"\[[^\]]{1,64}\]", r"/[^/\s]{1,64}/", r"[\u3400-\u9fff]", POS_IN_TEXT):
        match = pattern.search(segment) if hasattr(pattern, "search") else re.search(pattern, segment, re.I)
        if match:
            stops.append(match.start())
    if stops:
        stop = min(stops)
        head = segment[:stop]
        remainder = segment[stop:]
    elif len(segment.split()) == 1:
        head = segment
        remainder = ""
    else:
        return
    word = head.strip(" .,:;!?()-")
    joined_pos = re.search(r"(?i)(n\.|vt\.|vi\.|adj\.|adv\.|prep\.)", word[2:])
    if joined_pos:
        word = word[:2 + joined_pos.start()].strip(" .,:;!?()-")
    phonetic_match = re.search(r"(?:\[([^\]]{1,48})\]|/([^/]{1,48})/)", remainder)
    phonetic = (phonetic_match.group(1) or phonetic_match.group(2)) if phonetic_match else ""
    definition_cn = re.search(r"[\u3400-\u9fff][^\t]{0,180}", remainder)
    if not is_headword(word, allow_phrase=True):
        return
    return word, phonetic, definition_cn.group(0).strip() if definition_cn else ""


def read_text_words(path, base_book, collections):
    content = read_text_document(path)
    if not content:
        return 0
    book = classify_ielts(path.relative_to(SOURCE_ROOTS["IELTS"])) if base_book == "IELTS" else base_book
    found = 0
    for line in content.splitlines():
        # Layout extraction keeps separate word-list columns apart with long spaces or tabs.
        for segment in re.split(r"\t+|\s{3,}", line):
            candidate = candidates_from_segment(segment)
            if candidate and add_entry(collections, book, *candidate, source_file=path.name):
                found += 1
    return found


def main():
    books = OrderedDict((key, OrderedDict()) for key in ("SAT", "GMAT", "GRE", "雅思", "雅思听力高频词", "雅思阅读高频词"))
    file_counts = {}
    for base_book, root in SOURCE_ROOTS.items():
        if not root.is_dir():
            raise SystemExit(f"Source folder not found: {root}")
        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.name.startswith("._") or path.name == ".DS_Store":
                continue
            suffix = path.suffix.lower()
            if suffix in {".xlsx", ".xlsm"}:
                if base_book == "SAT" and path.name not in {"SAT 6000 中英释义.xlsx", "SAT巴郎3500(已自动还原).xlsx", "SAT巴郎3500.xlsx"}:
                    continue
                if base_book == "GMAT" and path.name != "gmat2536.xlsx":
                    continue
                if base_book == "GRE" and path.name != "GRE10031词.xlsx":
                    continue
                count = read_xlsx(path, base_book, books)
                file_counts[f"{base_book}/{path.relative_to(root)}"] = count
            elif suffix in {".pdf", ".doc", ".docx", ".rtf", ".txt"}:
                # Skip teaching references and non-vocabulary slides exported as documents.
                if base_book == "SAT" and re.search(r"词根|前缀|词缀|同义解析", path.name):
                    continue
                if base_book == "IELTS" and "剑桥雅思45图片" in path.name:
                    continue
                count = read_text_words(path, base_book, books)
                file_counts[f"{base_book}/{path.relative_to(root)}"] = count
    output = {book: list(entries.values()) for book, entries in books.items()}
    tmp = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    tmp.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    tmp.replace(OUTPUT)
    print(json.dumps({
        "unique_terms": {book: len(entries) for book, entries in output.items()},
        "files_scanned": len(file_counts),
        "files_with_terms": sum(count > 0 for count in file_counts.values()),
        "source_rows": sum(file_counts.values()),
        "largest_sources": sorted(file_counts.items(), key=lambda item: -item[1])[:12],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
