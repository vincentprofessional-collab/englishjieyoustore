#!/usr/bin/env python3
"""Create BBC-style sentence clips and sentence metadata for BBC 2026."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from nltk.tokenize import sent_tokenize

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "listening-align"))

from align_listening_section import (
    align_reference_sentences_bbc,
    bbc_alignment_diagnostics,
    transcribe,
)


DATA_DIR = REPO_ROOT / "src" / "data" / "bbc" / "2026"
AUDIO_DIR = REPO_ROOT / "public" / "audio" / "bbc" / "2026"
STANDALONE_QUOTE_RE = re.compile(r'^[\s"“”‘’\']+$')


def split_chinese_sentences(text: str) -> list[str]:
    parts = [part.strip() for part in re.split(r"(?<=[。！？])\s*", text) if part.strip()]
    return [part for part in parts if not STANDALONE_QUOTE_RE.fullmatch(part)]


def sentence_pairs(article: dict) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for paragraph_index, (english, chinese) in enumerate(
        zip(article["paragraphs"], article["chineseParagraphs"]), start=1
    ):
        english_sentences = sent_tokenize(english, language="english")
        chinese_sentences = split_chinese_sentences(chinese)
        if len(english_sentences) != len(chinese_sentences):
            raise ValueError(
                f"{article['id']} paragraph {paragraph_index}: "
                f"English sentences={len(english_sentences)}, Chinese sentences={len(chinese_sentences)}"
            )
        pairs.extend(zip(english_sentences, chinese_sentences))
    return pairs


def cut_clip(audio_path: Path, output_path: Path, start: float, end: float) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-ss",
            str(start),
            "-i",
            str(audio_path),
            "-t",
            str(max(0.2, end - start)),
            "-vn",
            "-c:a",
            "libmp3lame",
            "-q:a",
            "2",
            str(output_path),
        ],
        check=True,
    )


def underlined_terms(english: str, article: dict) -> list[str]:
    lowered = english.lower()
    terms: list[str] = []
    for item in article.get("vocabulary", []):
        term = re.sub(r"\*", "", str(item.get("term", ""))).strip()
        if term and term.lower() in lowered and term not in terms:
            terms.append(term)
    return terms


def build_article(article_id: str, model_name: str, write_files: bool) -> dict:
    article_path = DATA_DIR / f"{article_id}.json"
    article = json.loads(article_path.read_text(encoding="utf-8"))
    pairs = sentence_pairs(article)
    audio_path = AUDIO_DIR / article_id / article["fullAudioFile"]
    if not audio_path.exists():
        raise FileNotFoundError(audio_path)

    print(f"Transcribing {article_id}: {len(pairs)} sentences, model={model_name}", flush=True)
    asr = transcribe(str(audio_path), model_name)
    duration = max((float(segment["end"]) for segment in asr.get("segments", [])), default=0.0)
    words = [word for segment in asr.get("segments", []) for word in segment.get("words", [])]
    english = [english for english, _ in pairs]
    aligned = align_reference_sentences_bbc(english, words, duration)
    diagnostics = bbc_alignment_diagnostics(english, words)
    missing = [
        index
        for index, item in enumerate(aligned, start=1)
        if item["start"] is None or item["end"] is None or item["matchedWordCount"] == 0
    ]
    if diagnostics["sequenceRatio"] < 0.88 or missing:
        raise ValueError(f"{article_id} alignment needs review: {diagnostics}; missing={missing}")

    sentence_dir = AUDIO_DIR / article_id / "sentences"
    if write_files:
        sentence_dir.mkdir(parents=True, exist_ok=True)

    sentences = []
    for index, ((english_text, chinese_text), item) in enumerate(zip(pairs, aligned), start=1):
        audio_file = f"sentences/{article_id}-{index:03d}.mp3"
        if write_files:
            cut_clip(audio_path, sentence_dir / f"{article_id}-{index:03d}.mp3", item["start"], item["end"])
        sentences.append(
            {
                "sentenceNo": index,
                "english": english_text,
                "chinese": chinese_text,
                "start": item["start"],
                "end": item["end"],
                "startMs": round(item["start"] * 1000),
                "endMs": round(item["end"] * 1000),
                "speechStart": item["speechStart"],
                "speechEnd": item["speechEnd"],
                "audioFile": audio_file,
                "underlinedTerms": underlined_terms(english_text, article),
                "chineseUnderlinedTerms": [],
            }
        )

    article["diagnostics"] = diagnostics
    article["sentences"] = sentences
    if write_files:
        article_path.write_text(json.dumps(article, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"articleId": article_id, "sentenceCount": len(sentences), "diagnostics": diagnostics}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--article", action="append", dest="article_ids")
    parser.add_argument("--model", default="base")
    parser.add_argument("--check-only", action="store_true")
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()

    article_ids = args.article_ids or sorted(path.stem for path in DATA_DIR.glob("*.json") if path.stem != "index")
    if args.skip_existing:
        article_ids = [
            article_id
            for article_id in article_ids
            if not json.loads((DATA_DIR / f"{article_id}.json").read_text(encoding="utf-8")).get("sentences")
        ]
    results = [build_article(article_id, args.model, not args.check_only) for article_id in article_ids]
    if not args.check_only:
        articles = [
            json.loads(path.read_text(encoding="utf-8"))
            for path in sorted(DATA_DIR.glob("*.json"))
            if path.stem != "index"
        ]
        (DATA_DIR / "index.json").write_text(json.dumps(articles, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
