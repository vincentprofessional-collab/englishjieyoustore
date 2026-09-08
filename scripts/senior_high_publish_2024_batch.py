#!/usr/bin/env python3
"""Build a small, auditable v2 publication batch from paired 2024 papers.

The source tree was reorganized after the original DocumentIR was created.  The
classification manifest maps each original relative path to its current local
file, so this batch keeps the original provenance while materializing assets
from the current files.
"""

from __future__ import annotations

import hashlib
import json
import mimetypes
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path("/Users/shidianjin/Documents/高考英语")
PLAN = Path("/private/tmp/gaokao_english_audit_20260902/classification-plan.json")
AUDIT = ROOT / "data/senior-high/audit"
GOLD = ROOT / "data/senior-high/v2/gold"
PUBLIC = ROOT / "public/senior-high"
PUBLIC_PAPERS = PUBLIC / "papers"
PUBLIC_ASSETS = PUBLIC / "assets"


BATCH = [
    {
        "id": "paper-2024-new-gaokao-i",
        "variant": "新高考Ⅰ卷",
        "region": "全国",
        "sources": [
            "历年真题/【未上传】2024年高考英语试卷（新高考Ⅰ卷）（空白卷）.docx",
            "历年真题/【未上传】2024年高考英语试卷（新高考Ⅰ卷）（解析卷）.docx",
            "历年真题/【未上传】2024年高考英语试卷（新高考Ⅰ卷）听力音频.mp3",
        ],
    },
    {
        "id": "paper-2024-new-gaokao-ii",
        "variant": "新高考Ⅱ卷",
        "region": "全国",
        "sources": [
            "历年真题/【未上传】2024年高考英语试卷（新高考Ⅱ卷）（空白卷）.docx",
            "历年真题/【未上传】2024年高考英语试卷（新高考Ⅱ卷）（解析卷）.docx",
            "历年真题/【未上传】2024年高考英语试卷（新高考Ⅱ卷）听力音频.mp3",
        ],
    },
    {
        "id": "paper-2024-beijing",
        "variant": "北京卷",
        "region": "北京",
        "sources": [
            "历年真题/【未上传】2024年高考英语试卷（北京）（机考 无听力）（空白卷）.docx",
            "历年真题/【未上传】2024年高考英语试卷（北京）（机考 无听力）（解析卷）.docx",
        ],
    },
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_plan() -> dict[str, dict[str, str]]:
    rows = json.loads(PLAN.read_text(encoding="utf-8"))["plan"]
    result = {}
    for row in rows:
        original = Path(row["source_path"])
        if original.is_relative_to(SOURCE_ROOT):
            result[original.relative_to(SOURCE_ROOT).as_posix()] = row
    return result


def current_relative(original: str, plan: dict[str, dict[str, str]]) -> str:
    row = plan[original]
    destination = Path(row["destination"])
    if not destination.exists():
        raise FileNotFoundError(f"current classified file is missing: {destination}")
    return destination.relative_to(SOURCE_ROOT).as_posix()


def annotate_refs(value: object, plan: dict[str, dict[str, str]]) -> None:
    if isinstance(value, list):
        for item in value:
            annotate_refs(item, plan)
    elif isinstance(value, dict):
        original = value.get("relativePath")
        if isinstance(original, str) and original in plan:
            value["currentRelativePath"] = current_relative(original, plan)
        for child in value.values():
            annotate_refs(child, plan)


def asset_source(asset: dict, plan: dict[str, dict[str, str]]) -> tuple[Path, str]:
    raw = asset["url"][len("source://") :]
    original, _, package_path = raw.partition("#")
    current = SOURCE_ROOT / (current_relative(original, plan) if original in plan else original)
    return current, package_path


def materialize_assets(set_value: dict, plan: dict[str, dict[str, str]]) -> set[str]:
    available: set[str] = set()
    for asset in set_value.get("assetRefs", []):
        try:
            source, package_path = asset_source(asset, plan)
            if package_path:
                with zipfile.ZipFile(source) as archive:
                    data = archive.read(package_path)
                    source_name = package_path
            else:
                data = source.read_bytes()
                source_name = source.name
            if not data or sha256(data) != asset["sha256"]:
                continue
            extension = Path(source_name).suffix.lower()
            mime_type = asset.get("mimeType", "")
            if extension == ".wmf":
                with tempfile.TemporaryDirectory(prefix="senior-high-wmf-") as temporary_directory:
                    temporary_directory_path = Path(temporary_directory)
                    temporary_source = temporary_directory_path / f"{asset['sha256']}.wmf"
                    temporary_source.write_bytes(data)
                    subprocess.run(
                        ["soffice", "--headless", "--convert-to", "png", "--outdir", temporary_directory, str(temporary_source)],
                        check=True,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        timeout=60,
                    )
                    data = (temporary_directory_path / f"{asset['sha256']}.png").read_bytes()
                extension = ".png"
                mime_type = "image/png"
            if not extension:
                extension = mimetypes.guess_extension(mime_type) or ""
            target = PUBLIC_ASSETS / f"{asset['sha256']}{extension}"
            target.write_bytes(data)
            asset["mimeType"] = mime_type
            asset["url"] = f"/senior-high/assets/{target.name}"
            available.add(asset["assetId"])
        except (OSError, subprocess.SubprocessError, zipfile.BadZipFile):
            continue
    return available


def rewrite_missing_blocks(blocks: list[dict], available: set[str]) -> list[dict]:
    output = []
    for block in blocks or []:
        if block.get("type") in {"image", "audio", "video"} and block.get("assetId") not in available:
            label = {"image": "图片", "audio": "音频", "video": "视频"}[block["type"]]
            output.append({"type": "notice", "tone": "warning", "text": f"{label}资源暂未发布，题目文字与作答结构仍按原资料保留。"})
        elif block.get("type") == "table":
            block["headers"] = rewrite_missing_blocks(block.get("headers", []), available)
            for row in block.get("rows", []):
                for cell in row.get("cells", []):
                    cell[:] = rewrite_missing_blocks(cell, available)
            output.append(block)
        elif block.get("type") == "dialogue":
            for turn in block.get("turns", []):
                turn["blocks"] = rewrite_missing_blocks(turn.get("blocks", []), available)
            output.append(block)
        else:
            output.append(block)
    return output


def rewrite_set_assets(set_value: dict, available: set[str]) -> None:
    set_value["instructions"] = rewrite_missing_blocks(set_value.get("instructions", []), available)
    for section in set_value["sections"]:
        section["instructions"] = rewrite_missing_blocks(section.get("instructions", []), available)
        for group in section["groups"]:
            group["instructions"] = rewrite_missing_blocks(group.get("instructions", []), available)
            group["stimulusBlocks"] = rewrite_missing_blocks(group.get("stimulusBlocks", []), available)
            for option in group.get("sharedOptions", []):
                option["blocks"] = rewrite_missing_blocks(option.get("blocks", []), available)
            for question in group["questions"]:
                question["promptBlocks"] = rewrite_missing_blocks(question.get("promptBlocks", []), available)
                question["explanationBlocks"] = rewrite_missing_blocks(question.get("explanationBlocks", []), available)
                for option in question.get("options", []):
                    option["blocks"] = rewrite_missing_blocks(option.get("blocks", []), available)
                reference = question.get("answerSpec", {}).get("referenceAnswer")
                if isinstance(reference, list):
                    question["answerSpec"]["referenceAnswer"] = rewrite_missing_blocks(reference, available)


def questions(set_value: dict) -> list[dict]:
    return [q for s in set_value["sections"] for g in s["groups"] for q in g["questions"] if q.get("type") != "instruction_only"]


def library_entry(set_value: dict) -> dict:
    items = questions(set_value)
    states = {q["answerSpec"].get("availability") for q in items}
    if "conflict" in states:
        status = "conflict"
    elif states == {"answered"}:
        status = "answered"
    elif states == {"none"}:
        status = "none"
    else:
        status = "partial"
    return {
        "id": set_value["id"],
        "kind": set_value["kind"],
        "title": set_value["title"],
        "year": set_value["year"],
        "region": set_value["region"],
        "variant": set_value["variant"],
        "questionCount": len(items),
        "answeredCount": sum(q["answerSpec"].get("availability") == "answered" for q in items),
        "explanationCount": sum(bool(q.get("explanationBlocks")) for q in items),
        "answerStatus": status,
        "questionTypes": sorted({q["type"] for q in items}),
        "href": f"/senior-high/papers/{set_value['id']}",
        "quality": {
            "structureStatus": set_value["quality"]["structureStatus"],
            "structureConfidence": set_value["quality"]["structureConfidence"],
            "issueCount": set_value["quality"]["issueCount"],
        },
    }


def main() -> int:
    if not PLAN.exists():
        raise SystemExit(f"missing classification manifest: {PLAN}")
    sys.path.insert(0, str(ROOT / "scripts"))
    import senior_high_v2_import as importer

    plan = load_plan()
    corpus = importer.Corpus(importer.ROOT, importer.INVENTORY, importer.CHECKPOINT)
    for sample in BATCH:
        for original in sample["sources"]:
            if original not in corpus.inventory:
                raise SystemExit(f"current source is missing from inventory: {original}")
    generated = []
    for sample in BATCH:
        result = importer.modern_paper(corpus, {**sample, "kind": "paper"})
        result["id"] = sample["id"]
        result["year"] = "2024"
        result["region"] = sample["region"]
        result["variant"] = sample["variant"]
        result["submissionMode"] = "whole-paper"
        result["dedupeSignature"]["paperIdentityKey"] = f"2024|{sample['region']}|{sample['variant']}"
        annotate_refs(result, plan)
        available = materialize_assets(result, plan)
        result["assetRefs"] = [asset for asset in result.get("assetRefs", []) if asset["assetId"] in available]
        rewrite_set_assets(result, available)
        if result["quality"]["structureStatus"] != "approved":
            raise SystemExit(f"refusing non-approved batch {sample['id']}: {result['quality']['issues']}")
        target = GOLD / f"{sample['id']}.json"
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (PUBLIC_PAPERS / f"{sample['id']}.json").write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        generated.append(library_entry(result))

    index = json.loads((PUBLIC / "index.json").read_text(encoding="utf-8"))
    by_id = {entry["id"]: entry for entry in index["entries"]}
    by_id.update({entry["id"]: entry for entry in generated})
    index["entries"] = sorted(
        by_id.values(),
        key=lambda item: (
            -(int(item["year"]) if str(item["year"]).isdigit() else -1),
            item["region"],
            item["title"],
        ),
    )
    index["generatedAt"] = "2026-09-05T00:00:00.000Z"
    (PUBLIC / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    report = {
        "batch": "2024-high-confidence",
        "generated": generated,
        "sourceCount": sum(len(sample["sources"]) for sample in BATCH),
        "qualityGate": "approved-only",
    }
    (AUDIT / "publish-batch-2024-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"generated": [entry["id"] for entry in generated], "entries": len(index["entries"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
