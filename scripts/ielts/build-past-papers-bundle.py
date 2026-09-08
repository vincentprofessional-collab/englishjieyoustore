#!/usr/bin/env python3
"""Build the source-faithful IELTS past-paper transcript bundle.

The source DOCX contains bilingual transcript blocks.  The question pages in
the individual DOCX files are deliberately not read here: this page family is
transcript-and-audio only.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from docx import Document


HEADER_RE = re.compile(
    r"^\*{0,2}(?:##\s*)?文本\s+(\d+)\s*[（(]([^）)]+)[）)]\s*—+\s*(.+?)\*{0,2}$"
)
MP3_RE = re.compile(r"^Section([1-4]) - (.+)\.mp3$")


def normalise_title(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower().replace("enquiry", "inquiry"))


def normalise_audio_id(value: str) -> str:
    return value.upper().replace("新", "")


def make_slug(source_number: int, title: str) -> str:
    readable_title = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"{source_number:03d}-{readable_title}"


def infer_section_no(source_number: int) -> int:
    # The master DOCX is ordered by the four listening sections: Section 1
    # appears in two source batches, followed by Sections 3, 4, and 2.
    if source_number <= 13 or 42 <= source_number <= 68:
        return 1
    if 14 <= source_number <= 28:
        return 3
    if 29 <= source_number <= 41:
        return 4
    if 69 <= source_number <= 88:
        return 2
    raise ValueError(f"No section mapping for source number {source_number}")


def parse_source(source_docx: Path) -> list[dict]:
    lines = [paragraph.text.strip() for paragraph in Document(source_docx).paragraphs]
    lines = [line for line in lines if line]
    headers = []
    for index, line in enumerate(lines):
        match = HEADER_RE.match(line)
        if match:
            headers.append((index, match.group(1), match.group(2), match.group(3)))

    if not headers:
        raise ValueError(f"No transcript headers found in {source_docx}")

    records = []
    for header_index, (line_index, source_number, source_id, title) in enumerate(headers):
        end_index = headers[header_index + 1][0] if header_index + 1 < len(headers) else len(lines)
        segment = lines[line_index + 1 : end_index]
        vocabulary_index = next(
            (index for index, line in enumerate(segment) if "词汇条目" in line),
            len(segment),
        )
        transcript_lines = [line for line in segment[:vocabulary_index] if line != "---"]
        if len(transcript_lines) % 2:
            raise ValueError(f"Uneven bilingual transcript blocks for {source_id}")

        blocks = [
            {
                "blockNo": block_index + 1,
                "english": transcript_lines[block_index * 2],
                "chinese": transcript_lines[block_index * 2 + 1],
            }
            for block_index in range(len(transcript_lines) // 2)
        ]
        if any(not block["english"] or not block["chinese"] for block in blocks):
            raise ValueError(f"Empty bilingual transcript block for {source_id}")

        records.append(
            {
                "sourceNumber": int(source_number),
                "sourceId": source_id,
                "slug": make_slug(int(source_number), title),
                "title": title,
                "transcriptBlocks": blocks,
            }
        )

    return records


def attach_audio(records: list[dict], source_root: Path) -> list[dict]:
    m4a_files = {
        normalise_audio_id(path.stem): path
        for path in source_root.glob("*.m4a")
        if not path.name.startswith(".")
    }
    mp3_files = []
    for path in source_root.glob("Section*.mp3"):
        if path.name.startswith("."):
            continue
        match = MP3_RE.match(path.name)
        if match:
            mp3_files.append(
                {
                    "path": path,
                    "sectionNo": int(match.group(1)),
                    "title": match.group(2),
                    "normalisedTitle": normalise_title(match.group(2)),
                }
            )

    used_mp3 = set()
    for record in records:
        source_id = normalise_audio_id(record["sourceId"])
        audio_path = m4a_files.get(source_id)
        section_no = infer_section_no(record["sourceNumber"])
        if audio_path:
            extension = ".m4a"
            mime_type = "audio/mp4"
            audio_kind = "m4a"
        else:
            candidates = [
                item
                for item in mp3_files
                if item["normalisedTitle"] == normalise_title(record["title"])
                and item["path"] not in used_mp3
            ]
            if not candidates and record["title"] == "Theatre Club Membership Inquiry":
                candidates = [
                    item
                    for item in mp3_files
                    if item["title"] == "Theatre Club Membership" and item["path"] not in used_mp3
                ]
            if candidates:
                item = candidates[0]
                used_mp3.add(item["path"])
                audio_path = item["path"]
                if item["sectionNo"] != section_no:
                    raise ValueError(
                        f"Section mismatch for {record['sourceId']}: "
                        f"source={section_no}, audio={item['sectionNo']}"
                    )
                extension = ".mp3"
                mime_type = "audio/mpeg"
                audio_kind = "mp3"
            else:
                extension = None
                mime_type = None
                audio_kind = None

        record["sectionNo"] = section_no
        record["audioStatus"] = "available" if audio_path else "missing"
        record["audioSourceFile"] = audio_path.name if audio_path else None
        record["audioKind"] = audio_kind
        record["audioMimeType"] = mime_type
        record["audioPath"] = (
            f"listening/past-papers/{source_id.lower()}/full{extension}"
            if extension
            else None
        )

    return records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    source_root = args.source_root.expanduser().resolve()
    source_docx = source_root / "雅思听力历年真题中英文本.docx"
    if not source_docx.is_file():
        raise FileNotFoundError(source_docx)

    all_records = attach_audio(parse_source(source_docx), source_root)
    missing_audio = [
        {
            "sourceId": record["sourceId"],
            "sourceNumber": record["sourceNumber"],
            "title": record["title"],
        }
        for record in all_records
        if record["audioStatus"] != "available"
    ]
    records = [record for record in all_records if record["audioStatus"] == "available"]
    bundle = {
        "source": {
            "file": source_docx.name,
            "sectionCount": 4,
            "recordCount": len(records),
            "totalSourceRecordCount": len(all_records),
            "audioAvailableCount": len(records),
            "missingAudio": missing_audio,
        },
        "records": records,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "records": len(records),
                "audioAvailable": len(records),
                "missingAudio": missing_audio,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
