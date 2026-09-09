from __future__ import annotations

import json
import re
from pathlib import Path

from docx import Document


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path("/Volumes/My HDD3/BBC take away english")
SOURCE_DOCX = SOURCE_ROOT / "2026年" / "BBC-2026总.docx"
OUTPUT_DIR = REPO_ROOT / "src" / "data" / "bbc" / "2026"
HEADING_RE = re.compile(r"^(\d{6})-(.+)$")
VOCAB_RE = re.compile(r"^\s*(\d+)\.\s+(.+?)\s+/([^/]+)/\s+(.+)$")
POS_RE = re.compile(
    r"^(phr\.\s*v\.|modal\s+v\.|phr\.|adj\.|adv\.|prep\.|conj\.|pron\.|det\.|num\.|abbr\.|n\.|v\.)\s*(.*)$",
    re.IGNORECASE,
)


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def split_title(value: str) -> tuple[str, str | None]:
    chinese_start = re.search(r"[\u3400-\u9fff]", value)
    if not chinese_start:
        return clean(value), None
    english = clean(value[: chinese_start.start()])
    chinese = clean(value[chinese_start.start() :])
    return english, chinese or None


def source_title(article_id: str) -> tuple[str, str | None]:
    candidates = sorted((SOURCE_ROOT / "2026年").glob(f"{article_id}-*.pdf"))
    if not candidates:
        candidates = sorted((SOURCE_ROOT / "2026年").glob(f"{article_id}-*.mp3"))
    if not candidates:
        return article_id, None
    return split_title(candidates[0].stem[len(article_id) + 1 :])


def next_nonempty(paragraphs: list[str], start: int, end: int) -> tuple[int, str] | None:
    for index in range(start, end):
        value = clean(paragraphs[index])
        if value:
            return index, value
    return None


def parse_vocabulary(paragraphs: list[str], start: int, end: int) -> list[dict[str, object]]:
    vocabulary: list[dict[str, object]] = []
    index = start
    while index < end:
        value = clean(paragraphs[index])
        match = VOCAB_RE.match(value)
        if not match:
            index += 1
            continue

        number = int(match.group(1))
        term = clean(match.group(2))
        phonetic = clean(match.group(3))
        tail = clean(match.group(4))
        pos_match = POS_RE.match(tail)
        part_of_speech = pos_match.group(1) if pos_match else ""
        definition = clean(pos_match.group(2)) if pos_match else tail
        example = ""
        translation = ""
        cursor = index + 1
        while cursor < end:
            next_value = clean(paragraphs[cursor])
            if VOCAB_RE.match(next_value):
                break
            example_match = re.match(r"^例句\s*[:：]\s*(.*)$", next_value)
            translation_match = re.match(r"^翻译\s*[:：]?\s*(.*)$", next_value)
            if example_match:
                example = clean(example_match.group(1))
            elif translation_match:
                translation = clean(translation_match.group(1))
            cursor += 1

        entry = clean(f"{term} /{phonetic}/ {part_of_speech} {definition}")
        vocabulary.append(
            {
                "definition": definition,
                "entry": entry,
                "example": example,
                "highlight": True,
                "lemma": term,
                "number": number,
                "partOfSpeech": part_of_speech,
                "phonetic": phonetic,
                "sourceLevel": "四级",
                "term": term,
                "translation": translation or definition,
            }
        )
        index = cursor
    return vocabulary


def main() -> None:
    if not SOURCE_DOCX.exists():
        raise SystemExit(f"Missing source document: {SOURCE_DOCX}")

    document = Document(SOURCE_DOCX)
    paragraphs = [paragraph.text for paragraph in document.paragraphs]
    headings = [
        (index, match.group(1))
        for index, value in enumerate(paragraphs)
        if (match := HEADING_RE.match(clean(value)))
    ]
    articles: list[dict[str, object]] = []

    for heading_number, (heading_index, article_id) in enumerate(headings):
        end = headings[heading_number + 1][0] if heading_number + 1 < len(headings) else len(paragraphs)
        title, title_chinese = source_title(article_id)
        if title == article_id:
            title, title_chinese = split_title(HEADING_RE.match(clean(paragraphs[heading_index])).group(2))

        body: list[str] = []
        chinese_paragraphs: list[str] = []
        cursor = heading_index + 1
        while cursor < end:
            current = next_nonempty(paragraphs, cursor, end)
            if not current:
                break
            current_index, english = current
            if VOCAB_RE.match(english):
                vocab_start = current_index
                break
            if english in {"词汇表", "Vocabulary"}:
                vocab_start = current_index + 1
                break
            translation = next_nonempty(paragraphs, current_index + 1, end)
            if translation and not VOCAB_RE.match(translation[1]) and re.search(r"[\u3400-\u9fff]", translation[1]):
                body.append(english)
                chinese_paragraphs.append(translation[1])
                cursor = translation[0] + 1
            else:
                body.append(english)
                chinese_paragraphs.append("")
                cursor = current_index + 1
        else:
            vocab_start = end

        if "vocab_start" not in locals():
            vocab_start = end
        vocabulary = parse_vocabulary(paragraphs, vocab_start, end)
        date = f"20{article_id[:2]}-{article_id[2:4]}-{article_id[4:6]}"
        audio_candidates = sorted((SOURCE_ROOT / "2026年").glob(f"{article_id}-*.mp3"))
        pdf_candidates = sorted((SOURCE_ROOT / "2026年").glob(f"{article_id}-*.pdf"))
        if not audio_candidates or not pdf_candidates:
            raise SystemExit(f"Missing 2026 media for {article_id}")

        articles.append(
            {
                "id": article_id,
                "year": 2026,
                "date": date,
                "title": title,
                **({"titleChinese": title_chinese} if title_chinese else {}),
                "paragraphs": body,
                "chineseParagraphs": chinese_paragraphs,
                "vocabulary": vocabulary,
                "sentences": [],
                "fullAudioFile": "full-content.mp3",
                "source": {
                    "audio": str(audio_candidates[0].relative_to(SOURCE_ROOT)),
                    "document": str(SOURCE_DOCX.relative_to(SOURCE_ROOT)),
                    "pdf": str(pdf_candidates[0].relative_to(SOURCE_ROOT)),
                    "documentParagraphStart": heading_index,
                    "documentParagraphEnd": end - 1,
                },
            }
        )
        if "vocab_start" in locals():
            del vocab_start

    if len(articles) != 29:
        raise SystemExit(f"Expected 29 articles, found {len(articles)}")
    if any(not article["paragraphs"] or len(article["paragraphs"]) != len(article["chineseParagraphs"]) for article in articles):
        raise SystemExit("A 2026 article has missing bilingual paragraph alignment")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "index.json").write_text(json.dumps(articles, ensure_ascii=False, indent=2) + "\n")
    for article in articles:
        (OUTPUT_DIR / f"{article['id']}.json").write_text(json.dumps(article, ensure_ascii=False, indent=2) + "\n")
    print(f"BBC 2026 data: {len(articles)} articles; vocabulary={sum(len(article['vocabulary']) for article in articles)}")


if __name__ == "__main__":
    main()
