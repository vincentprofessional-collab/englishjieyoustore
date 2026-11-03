#!/usr/bin/env python3
"""Extract and categorize headwords from the scanned 词以类记 IELTS book."""

import json
import re
import subprocess
import unicodedata
from collections import Counter, OrderedDict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VOCAB_DIR = ROOT / "src/data/vocabulary"
SOURCE_PDF = Path("/Volumes/My HDD3/备课/IELTS/雅思词汇/词以类记/ielts词汇词以类记-张红岩.pdf")
OCR_CHECKPOINT = Path("/private/tmp/ielts-topic-ocr-pages.jsonl")
OUTPUT = VOCAB_DIR / "ielts-reading-topic-wordbook.json"

# PDF page numbers are offset by 11 from the printed contents page numbers.
CATEGORY_STARTS = [
    ("气象", 14), ("宗教", 18), ("动物", 20), ("化学", 24), ("教育", 28),
    ("经济", 32), ("军事", 38), ("艺术", 44), ("环境", 48), ("数学", 52),
    ("音乐", 58), ("法律", 62), ("农业", 70), ("人类学", 74), ("自然", 78),
    ("物理", 80), ("社会学", 86), ("语言学", 90), ("文学", 94), ("天文", 98),
    ("植物学", 102), ("动物学", 106), ("人物", 110), ("考古学", 118),
    ("医学", 122), ("政治", 128), ("地质", 134), ("地理", 138),
    ("事物属性", 149), ("人类生活", 179), ("品德品行", 215), ("万事万物", 239),
    ("心理", 257), ("行为", 277), ("状态", 325), ("交流", 349),
]
LAST_WORD_PAGE = 361
COMMON_HEADWORDS = set("""
a an and are as at be been but by can do for from had has have he her his i if in is it its me my
no not of on or our she so than that the their them then there they this to us was we were what when
which who will with you your all basic chapter copyright details form forms grammatical including
introduction materials page property rights terms version vocabulary words www
""".split())
HEADWORD_LINE = re.compile(
    r"^\s*([A-Za-z][A-Za-z0-9'’&./-]*(?:\s+[A-Za-z][A-Za-z0-9'’&./-]*){0,3})\s*"
    r"(?=\[[^\]\n]{1,80}\]|\([^\)\n]{1,80}\)|\{[^\}\n]{1,80}\}|\||/|\s+"
    r"(?:n\.|v\.|vt\.|vi\.|adj\.|adv\.|prep\.|conj\.|pron\.|phr\.|num\.|aux\.?)(?=\s|$|[\u3400-\u9fff]))",
    re.I,
)


def normalize(value):
    value = unicodedata.normalize("NFKD", str(value).strip().casefold())
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def category_for_page(page):
    if 142 <= page <= 148:
        return ""
    for index, (category, start) in enumerate(CATEGORY_STARTS):
        end = CATEGORY_STARTS[index + 1][1] - 1 if index + 1 < len(CATEGORY_STARTS) else LAST_WORD_PAGE
        if start <= page <= end:
            return category
    return ""


def load_ocr_pages():
    if not SOURCE_PDF.is_file():
        raise SystemExit(f"Source PDF not found: {SOURCE_PDF}")
    required_pages = [page for page in range(14, 142) if category_for_page(page)]
    required_pages += [page for page in range(149, LAST_WORD_PAGE + 1) if category_for_page(page)]
    pages = {}
    if OCR_CHECKPOINT.is_file():
        for line in OCR_CHECKPOINT.read_text(encoding="utf-8").splitlines():
            try:
                item = json.loads(line)
                pages[item["page"]] = item["text"]
            except (json.JSONDecodeError, KeyError, TypeError):
                continue

    missing_pages = [page for page in required_pages if page not in pages]
    if missing_pages:
        OCR_CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
        with OCR_CHECKPOINT.open("a", encoding="utf-8") as checkpoint:
            for index, page in enumerate(missing_pages, start=1):
                prefix = Path(f"/private/tmp/ielts-topic-page-{page:03}")
                image = Path(f"{prefix}.png")
                subprocess.run(
                    ["pdftoppm", "-f", str(page), "-l", str(page), "-png", "-r", "120", "-singlefile", str(SOURCE_PDF), str(prefix)],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
                result = subprocess.run(
                    ["tesseract", str(image), "stdout", "-l", "eng", "--psm", "6"],
                    check=True, capture_output=True, text=True,
                )
                pages[page] = result.stdout
                checkpoint.write(json.dumps({"page": page, "text": result.stdout}, ensure_ascii=False) + "\n")
                checkpoint.flush()
                image.unlink(missing_ok=True)
                if index % 10 == 0 or index == len(missing_pages):
                    print(f"OCR checkpoint: {index}/{len(missing_pages)} missing pages", flush=True)
    return pages


def main():
    details_path = VOCAB_DIR / "workbook-vocabulary-details.json"
    details = json.loads(details_path.read_text(encoding="utf-8"))
    known = {normalize(item.get("displayWord", key)): item for key, item in details.items()}
    pages = load_ocr_pages()
    entries = OrderedDict()
    candidate_rows = Counter()
    unmatched_rows = Counter()

    for page in sorted(pages):
        category = category_for_page(page)
        if not category:
            continue
        for line_number, line in enumerate(pages[page].splitlines()):
            match = HEADWORD_LINE.match(line)
            if not match:
                continue
            word = match.group(1).strip().strip(".,;:|")
            key = normalize(word)
            if not key or key in COMMON_HEADWORDS or len(key.replace(" ", "")) < 2:
                continue
            if any(char.isdigit() for char in word) or (word.isupper() and word != "AIDS"):
                continue
            candidate_rows[category] += 1
            source = known.get(key)
            if source is None:
                unmatched_rows[category] += 1
                continue
            entry = entries.setdefault(key, {
                "articleCategory": category,
                "definitionCn": source.get("definitionCn", ""),
                "englishDefinition": (source.get("englishDefinitions") or [""])[0],
                "frequency": source.get("stageFrequencies", {}).get("雅思", 0),
                "page": page,
                "phonetic": source.get("phonetic", ""),
                "sourceOrder": page * 10000 + line_number,
                "word": source.get("displayWord", word),
            })

    output = {"categories": [category for category, _ in CATEGORY_STARTS], "sourceFile": SOURCE_PDF.name, "items": list(entries.values())}
    tmp = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    tmp.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    tmp.replace(OUTPUT)
    print(json.dumps({
        "uniqueHeadwords": len(entries),
        "categoryCounts": {category: sum(item["articleCategory"] == category for item in entries.values()) for category, _ in CATEGORY_STARTS},
        "candidateRows": sum(candidate_rows.values()),
        "unmatchedRows": sum(unmatched_rows.values()),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
