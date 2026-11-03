#!/usr/bin/env python3
"""Generate missing UK and US MP3 pronunciations for the site's wordbooks."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import random
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "data" / "vocabulary"
DEFAULT_OUTPUT = Path("/Volumes/My HDD3/网站/英文解忧杂货铺/04_媒体素材/词汇发音/word-audio")
VOICES = {"uk": "en-GB-SoniaNeural", "us": "en-US-JennyNeural"}
VALID_KEY = re.compile(r"^[a-z0-9][a-z0-9'-]*[a-z0-9]$|^[a-z0-9]$")


def audio_key(value: str) -> str:
    normalized = unicodedata.normalize("NFC", value.strip()).lower()
    if normalized == "café":
        return "cafe-accent"
    normalized = unicodedata.normalize("NFKD", normalized)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.replace("’", "'").replace("‘", "'")
    normalized = re.sub(r"[^a-z0-9'-]+", "-", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized.strip("-'")


def read_json(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def collect_words() -> tuple[dict[str, str], Counter[str], list[tuple[str, str]]]:
    words: dict[str, str] = {}
    source_counts: Counter[str] = Counter()
    rejected: list[tuple[str, str]] = []

    def add(raw: object, source: str) -> None:
        if not isinstance(raw, str):
            return
        text = raw.strip()
        key = audio_key(text)
        if not key or len(key) > 120 or not VALID_KEY.fullmatch(key):
            if text:
                rejected.append((source, text[:200]))
            return
        source_counts[source] += 1
        words.setdefault(key, text)

    for row in read_json("flat-vocabulary.json"):
        add(row.get("word"), "main_flat")
    for row in read_json("primary-school-vocabulary.json"):
        add(row.get("word"), "primary_school")
    for key, row in read_json("workbook-vocabulary-details.json").items():
        add(row.get("displayWord") or key, "workbook")
    for word in read_json("primary-school-vocabulary-word-set.json"):
        add(word, "primary_word_set")

    for book, rows in read_json("graded-phrases.json").items():
        for row in rows:
            add(row.get("word"), f"phrases_{book}")
    for row in read_json("idiomatic-expressions.json"):
        add(row.get("word"), "idiomatic_expressions")
    for row in read_json("slang-proverbs.json"):
        add(row.get("word"), "slang_proverbs")
    for book, rows in read_json("exam-source-wordbooks.json").items():
        for row in rows:
            add(row.get("word"), f"exam_{book}")
    for book, rows in read_json("ielts-special-learning-books.json").items():
        for row in rows:
            add(row.get("word"), book)
    for row in read_json("ielts-reading-topic-wordbook.json").get("items", []):
        add(row.get("word"), "ielts_reading_topics")
    for deck in read_json("ielts-listening-answer-words.json").get("decks", []):
        for row in deck.get("words", []):
            add(row.get("answer"), f"answer_deck_{deck.get('id', '')}")

    return words, source_counts, rejected


def existing_keys(folder: Path) -> set[str]:
    if not folder.is_dir():
        return set()
    result: set[str] = set()
    for path in folder.iterdir():
        # macOS may create AppleDouble resource-fork sidecars on external
        # volumes. They are not playable audio and must not satisfy coverage.
        if path.is_file() and not path.name.startswith("._") and path.suffix.lower() == ".mp3":
            try:
                if path.stat().st_size >= 1024:
                    key = audio_key(path.stem)
                    if key:
                        result.add(key)
            except OSError:
                continue
    return result


async def generate_one(text: str, key: str, accent: str, output: Path, retries: int) -> tuple[bool, str]:
    target = output / accent / f"{key}.mp3"
    if target.is_file() and target.stat().st_size >= 1024:
        return True, "existing"
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(f".{target.name}.{os.getpid()}.tmp")
    last_error = "unknown error"
    for attempt in range(1, retries + 1):
        try:
            await edge_tts.Communicate(text, VOICES[accent], rate="+0%").save(str(temporary))
            if not temporary.is_file() or temporary.stat().st_size < 1024:
                raise RuntimeError("audio output is empty or too small")
            os.replace(temporary, target)
            return True, "generated"
        except Exception as error:  # Network errors and individual TTS failures are resumable.
            last_error = f"{type(error).__name__}: {error}"[:240]
            temporary.unlink(missing_ok=True)
            if attempt < retries:
                await asyncio.sleep(min(20, attempt * 3) + random.uniform(0.2, 1.0))
    return False, last_error


async def run(args: argparse.Namespace) -> int:
    output: Path = args.output.expanduser()
    words, source_counts, rejected = collect_words()
    existing = {accent: existing_keys(output / accent) for accent in VOICES}
    missing_by_accent = {
        accent: [(key, text) for key, text in words.items() if key not in existing[accent]]
        for accent in VOICES
    }
    print(json.dumps({
        "output": str(output),
        "unique_audio_keys": len(words),
        "existing_uk": sum(key in existing["uk"] for key in words),
        "existing_us": sum(key in existing["us"] for key in words),
        "missing_uk": len(missing_by_accent["uk"]),
        "missing_us": len(missing_by_accent["us"]),
        "rejected_items": len(rejected),
        "sources": dict(source_counts),
    }, ensure_ascii=False, indent=2))
    if rejected:
        rejected_path = output / "audio-generation-rejected.jsonl"
        if not args.dry_run and not args.smoke:
            output.mkdir(parents=True, exist_ok=True)
            with rejected_path.open("w", encoding="utf-8") as stream:
                for source, value in rejected:
                    stream.write(json.dumps({"source": source, "value": value}, ensure_ascii=False) + "\n")
    if args.dry_run:
        return 0

    if args.smoke:
        smoke_dir = args.smoke_dir.expanduser()
        smoke_dir.mkdir(parents=True, exist_ok=True)
        for accent in VOICES:
            sample_key = audio_key(args.sample_word)
            ok, detail = await generate_one(args.sample_word, sample_key, accent, smoke_dir, 2)
            print(f"smoke {accent}: {'ok' if ok else 'failed'} ({detail})")
            if not ok:
                return 1
        print(f"sample files: {smoke_dir / 'uk' / (sample_key + '.mp3')} and {smoke_dir / 'us' / (sample_key + '.mp3')}")
        return 0

    tasks = [(accent, key, text) for accent in VOICES for key, text in missing_by_accent[accent]]
    if not tasks:
        print("All required UK and US audio files already exist.")
        return 0
    output.mkdir(parents=True, exist_ok=True)
    checkpoint = output / "audio-generation-progress.jsonl"
    failures = output / "audio-generation-failures.jsonl"
    queue: asyncio.Queue[tuple[str, str, str] | None] = asyncio.Queue()
    for task in tasks:
        queue.put_nowait(task)

    completed = generated = failed = 0
    failure_streak = 0
    circuit_open = asyncio.Event()
    lock = asyncio.Lock()

    async def worker() -> None:
        nonlocal completed, generated, failed, failure_streak
        while not circuit_open.is_set():
            try:
                accent, key, text = queue.get_nowait()
            except asyncio.QueueEmpty:
                return
            ok, detail = await generate_one(text, key, accent, output, args.retries)
            completed += 1
            if ok and detail == "generated":
                generated += 1
                checkpoint_record = {"accent": accent, "key": key, "bytes": (output / accent / f"{key}.mp3").stat().st_size,
                                     "voice": VOICES[accent], "generatedAt": datetime.now(timezone.utc).isoformat()}
                with checkpoint.open("a", encoding="utf-8") as stream:
                    stream.write(json.dumps(checkpoint_record) + "\n")
                async with lock:
                    failure_streak = 0
            elif not ok:
                failed += 1
                async with lock:
                    failure_streak += 1
                    with failures.open("a", encoding="utf-8") as stream:
                        stream.write(json.dumps({"accent": accent, "key": key, "text": text, "error": detail}, ensure_ascii=False) + "\n")
                    if failure_streak >= 40:
                        circuit_open.set()
            if completed % 100 == 0 or completed == len(tasks):
                print(f"progress {completed}/{len(tasks)}; generated {generated}; failed {failed}; waiting {queue.qsize()}", flush=True)
            queue.task_done()
            await asyncio.sleep(random.uniform(0.05, 0.2))

    await asyncio.gather(*(worker() for _ in range(args.concurrency)))
    remaining = queue.qsize()
    print(f"finished batch: generated={generated}, failed={failed}, remaining={remaining}; resume by rerunning the same command", flush=True)
    return 1 if remaining or failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument("--retries", type=int, default=4)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--smoke", action="store_true")
    parser.add_argument("--smoke-dir", type=Path, default=Path("/private/tmp/vocabulary-audio-smoke"))
    parser.add_argument("--sample-word", default="schedule")
    args = parser.parse_args()
    if not 1 <= args.concurrency <= 6 or not 1 <= args.retries <= 6:
        parser.error("--concurrency and --retries must be between 1 and 6")
    return asyncio.run(run(args))


if __name__ == "__main__":
    raise SystemExit(main())
