#!/usr/bin/env python3
"""Create one independently playable MP3 per ten visible answer words."""

import argparse
import json
import os
import shutil
import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / "src/data/vocabulary/ielts-listening-answer-words.json"
DEFAULT_SOURCE_ROOT = Path("/Volumes/My HDD3/词汇音频/剑雅听力词汇答案词音频")
DEFAULT_OUTPUT_ROOT = PROJECT_ROOT / "tmp/vocabulary-answer-audio"
WORDS_PER_GROUP = 10
SHORT_PAUSE_LIMIT_MS = 500

PART_OFFSETS_MS = {
    "core346": [0, 262075, 521774, 783081, 1045108, 1307399],
    "answers683": [0, 207840, 416640, 623952, 831312, 1038504, 1244592, 1453152, 1660128, 1868208, 2073816, 2282016],
    "numbers208": [0, 186276, 363234],
}
SOURCE_FILES = {
    "core346": ("剑雅4-21听力答案词-超核心高频词346", "剑雅4-21听力答案词-超核心高频词346-文本.mp3", 128000),
    "answers683": ("剑雅4-21听力答案词-683", "剑雅4-20听力答案词-683词-音频.mp3", 160000),
    "numbers208": ("剑雅4-20听力答案词-数字与拼写特辑", "剑雅4-20听力答案词-数字与拼写特辑-音频.mp3", 128000),
}


def absolute_start(deck_id, word):
    part = word["audioPart"]
    if part == "full":
        return word["audioStartMs"]
    if not part.startswith("part") or not part[4:].isdigit():
        raise ValueError(f"Unsupported source segment: {part}")
    part_number = int(part[4:])
    offsets = PART_OFFSETS_MS[deck_id]
    if part_number < 1 or part_number > len(offsets):
        raise ValueError(f"Source segment outside offset map: {deck_id}/{part}")
    return offsets[part_number - 1] + word["audioStartMs"]


def format_seconds(milliseconds):
    return f"{milliseconds / 1000:.6f}"


def probe_duration(ffprobe, path):
    result = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def split_deck(deck, source_root, output_root, ffmpeg, ffprobe):
    deck_id = deck["id"]
    folder, filename, bitrate = SOURCE_FILES[deck_id]
    source = source_root / folder / filename
    if not source.is_file():
        raise FileNotFoundError(f"Missing source recording: {source}")
    source_duration_ms = round(probe_duration(ffprobe, source) * 1000)
    target_dir = output_root / deck_id
    target_dir.mkdir(parents=True, exist_ok=True)
    manifest = []

    for group_start in range(0, len(deck["words"]), WORDS_PER_GROUP):
        group = deck["words"][group_start:group_start + WORDS_PER_GROUP]
        spans = []
        for index, word in enumerate(group):
            start = absolute_start(deck_id, word)
            end = start + word["audioEndMs"] - word["audioStartMs"]
            if index + 1 < len(group):
                next_start = absolute_start(deck_id, group[index + 1])
                gap = next_start - end
                if gap < 0:
                    raise ValueError(f"Overlapping words in {deck_id}, group {group_start // WORDS_PER_GROUP + 1}")
                if gap <= SHORT_PAUSE_LIMIT_MS:
                    end = next_start
            if start < 0 or end > source_duration_ms or end <= start:
                raise ValueError(f"Invalid audio range for {deck_id}:{word['id']} ({start}-{end} ms)")
            spans.append((start, end))

        clip_start = spans[0][0]
        clip_end = spans[-1][1]
        filters = []
        labels = []
        for index, (start, end) in enumerate(spans):
            label = f"word{index}"
            filters.append(
                f"[0:a:0]atrim=start={format_seconds(start - clip_start)}:end={format_seconds(end - clip_start)},asetpts=PTS-STARTPTS[{label}]"
            )
            labels.append(f"[{label}]")
        filters.append(f"{''.join(labels)}concat=n={len(spans)}:v=0:a=1[outa]")
        output = target_dir / f"group-{group_start // WORDS_PER_GROUP + 1:03d}.mp3"
        command = [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-ss", format_seconds(clip_start), "-i", str(source),
            "-t", format_seconds(clip_end - clip_start),
            "-filter_complex", ";".join(filters), "-map", "[outa]", "-vn",
            "-c:a", "libmp3lame", "-b:a", str(bitrate), "-ar", "24000", "-ac", "1", str(output),
        ]
        subprocess.run(command, check=True, capture_output=True, text=True)
        expected_duration = sum(end - start for start, end in spans) / 1000
        actual_duration = probe_duration(ffprobe, output)
        if output.stat().st_size == 0 or abs(actual_duration - expected_duration) > 0.15:
            raise ValueError(f"Clip duration check failed: {output.name}, {actual_duration:.3f}s vs {expected_duration:.3f}s")
        manifest.append({
            "file": f"{deck_id}/{output.name}",
            "group": len(manifest) + 1,
            "wordCount": len(group),
            "firstWord": group[0]["answer"],
            "lastWord": group[-1]["answer"],
            "durationSeconds": round(actual_duration, 3),
            "bytes": output.stat().st_size,
        })

    (target_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(manifest), sum(item["bytes"] for item in manifest)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, default=Path(os.environ.get("VOCABULARY_ANSWER_AUDIO_ROOT", str(DEFAULT_SOURCE_ROOT))))
    parser.add_argument("--output-root", type=Path, default=Path(os.environ.get("VOCABULARY_ANSWER_AUDIO_CHUNKS_ROOT", str(DEFAULT_OUTPUT_ROOT))))
    args = parser.parse_args()
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise SystemExit("ffmpeg and ffprobe must be installed.")
    decks = json.loads(DATA_PATH.read_text(encoding="utf-8"))["decks"]
    totals = 0
    byte_count = 0
    for deck in decks:
        count, size = split_deck(deck, args.source_root, args.output_root, ffmpeg, ffprobe)
        totals += count
        byte_count += size
        print(f"{deck['id']}: {len(deck['words'])} 词，{count} 段，{size / 1_000_000:.1f} MB")
    print(f"完成：{totals} 段十词音频，共 {byte_count / 1_000_000:.1f} MB。输出：{args.output_root}")


if __name__ == "__main__":
    main()
