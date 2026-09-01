#!/usr/bin/env python3
"""Inventory and conservative classification for the senior-high source folder.

The script is deliberately source-only: it never edits or deletes files under
Documents/高考英语.  It writes resumable audit artifacts to the project.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


DEFAULT_ROOT = Path("/Users/shidianjin/Documents/高考英语")
DEFAULT_OUT = Path("/Users/shidianjin/ielts-platform/data/senior-high/audit")
CHECKPOINT_NAME = "inventory.checkpoint.json"
BATCH_SIZE = 100

INVENTORY_FIELDS = [
    "source_file",
    "source_relpath",
    "basename",
    "extension",
    "size_bytes",
    "modified_time",
    "sha256",
    "read_status",
    "symlink",
    "candidate_scope",
    "candidate_categories",
    "review_reason",
]


def normalized(value: str) -> str:
    value = value.replace("\\", "/").strip().lower()
    value = re.sub(r"\s+", "", value)
    value = re.sub(r"[（）()【】\[\]{}<>《》“”‘’'\"、，。:：;；_—–-]+", "", value)
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def classify(relpath: str, basename: str, extension: str, size: int) -> tuple[str, list[str], str]:
    haystack = f"{relpath} {basename}".lower()
    tags: list[str] = []
    reasons: list[str] = []

    if basename.startswith("._") or "/__macosx/" in f"/{haystack}/" or "/.ds_store" in f"/{haystack}/":
        return "exclude_candidate", ["resource_fork"], "macOS resource metadata"
    if extension in {".qkdownloading", ".crdownload", ".part", ".download", ".tmp"} or "qkdownloading" in haystack:
        return "exclude_candidate", ["unfinished_download"], "download marker or temporary suffix"
    if size == 0:
        return "exclude_candidate", ["empty_file"], "zero-byte file"

    non_english = bool(re.search(r"语文|数学|文综|理综|历史|政治|地理|物理|化学|生物|基本能力", haystack))
    if non_english and not re.search(r"英语|听力|听说", basename):
        return "exclude_candidate", ["non_english_subject"], "filename indicates a non-English examination subject"

    is_archive = extension in {".zip", ".rar", ".7z", ".tar", ".gz"}
    is_topic_archive = "专题练习" in haystack or "分类精编" in haystack
    is_full_paper = bool(re.search(r"真题|试卷|模拟|模考|全国卷|\btest\s*[a-e]\b", haystack))
    if is_topic_archive:
        is_full_paper = False
    looks_like_knowledge = bool(re.search(r"词汇|短语|长难句|语法|知识点|精讲|复习|专题知识", haystack))
    looks_like_practice = bool(re.search(r"专题练习|题型|完形|阅读理解|七选五|语法填空|短文改错|书面表达|写作|练习", haystack))
    explicit_practice = bool(re.search(r"试题word|考点集训|方法集训|专题资料包", haystack))
    is_media = extension in {".mp3", ".mp4", ".m4a", ".wav"}

    if is_full_paper:
        tags.append("full_paper_candidate")
        reasons.append("path/name indicates a complete examination paper or mock exam")
    if looks_like_knowledge:
        tags.append("knowledge_candidate")
        reasons.append("path/name suggests explanatory knowledge material")
    if looks_like_practice:
        tags.append("type_practice_candidate")
        reasons.append("path/name suggests topic or question-type practice")
    if is_media:
        tags.append("media_source")
        reasons.append("audio/video source asset; establish mapping only")
    if is_archive:
        tags.append("archive_candidate")
        reasons.append("archive requires manifest inspection before publication")

    if is_topic_archive:
        tags.append("mixed_topic_source")
        reasons.append("topic archive may contain complete true/mock paper questions; inspect contents before publication")

    # Full-paper indicators win.  A document under a mixed folder remains in
    # review instead of being silently placed into the practice bank.
    if is_archive or is_topic_archive:
        scope = "review_required"
    elif is_full_paper:
        scope = "paper_only_candidate"
    elif explicit_practice:
        scope = "type_practice_only_candidate"
    elif looks_like_knowledge and not looks_like_practice:
        scope = "knowledge_only_candidate"
    elif looks_like_practice and not looks_like_knowledge:
        scope = "type_practice_only_candidate"
    else:
        scope = "review_required"

    if not tags:
        reasons.append("no reliable filename classification signal")
    return scope, sorted(set(tags)), "; ".join(reasons)


def iter_files(root: Path) -> Iterable[Path]:
    for directory, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = sorted(dirnames)
        for filename in sorted(filenames):
            yield Path(directory) / filename


def record_for(path: Path, root: Path) -> dict[str, Any]:
    relative = path.relative_to(root).as_posix()
    stat = path.lstat()
    extension = path.suffix.lower() or "[none]"
    scope, categories, reason = classify(relative, path.name, extension, stat.st_size)
    record: dict[str, Any] = {
        "source_file": str(path),
        "source_relpath": relative,
        "basename": path.name,
        "extension": extension,
        "size_bytes": stat.st_size,
        "modified_time": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
        "sha256": "",
        "read_status": "pending",
        "symlink": path.is_symlink(),
        "candidate_scope": scope,
        "candidate_categories": ",".join(categories),
        "review_reason": reason,
    }
    if path.is_symlink():
        record["read_status"] = "symlink_not_hashed"
        return record
    try:
        record["sha256"] = sha256_file(path)
        record["read_status"] = "ok"
    except (OSError, PermissionError) as error:
        record["read_status"] = f"unreadable:{type(error).__name__}"
    return record


def write_csv(path: Path, rows: Iterable[dict[str, Any]], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def load_checkpoint(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("root") != str(DEFAULT_ROOT) and payload.get("root"):
            return {}
        return {row["source_relpath"]: row for row in payload.get("records", []) if row.get("source_relpath")}
    except (OSError, json.JSONDecodeError, TypeError):
        return {}


def save_checkpoint(path: Path, root: Path, records: dict[str, dict[str, Any]], complete: bool) -> None:
    payload = {
        "version": 1,
        "root": str(root),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "complete": complete,
        "record_count": len(records),
        "records": [records[key] for key in sorted(records)],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def record_needs_refresh(path: Path, record: dict[str, Any]) -> bool:
    """Re-hash only files whose checkpointed filesystem metadata changed."""
    try:
        stat = path.lstat()
    except OSError:
        return True
    modified_time = datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
    return (
        record.get("size_bytes") != stat.st_size
        or record.get("modified_time") != modified_time
        or record.get("read_status") == "pending"
    )


def duplicate_rows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_hash: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    by_name: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in records:
        if row["read_status"] == "ok" and row["sha256"]:
            by_hash[row["sha256"]].append(row)
        by_name[normalized(row["basename"])].append(row)

    rows: list[dict[str, Any]] = []
    for digest, group in sorted(by_hash.items()):
        if len(group) < 2:
            continue
        ordered = sorted(group, key=lambda item: ("副本" in item["source_relpath"], len(item["source_relpath"]), item["source_relpath"]))
        keep = ordered[0]["source_file"]
        for row in ordered:
            rows.append({
                "duplicate_type": "byte_exact",
                "fingerprint": digest,
                "source_file": row["source_file"],
                "keep_file": keep,
                "size_bytes": row["size_bytes"],
                "review_status": "safe_duplicate_candidate" if row["source_file"] != keep else "keep_canonical",
                "reason": "same SHA-256 and byte size; canonical selection is heuristic and must be reviewed",
            })

    for name, group in sorted(by_name.items()):
        if len(group) < 2:
            continue
        digests = {row["sha256"] for row in group if row["sha256"]}
        if len(digests) > 1:
            for row in sorted(group, key=lambda item: item["source_relpath"]):
                rows.append({
                    "duplicate_type": "same_name_different_content",
                    "fingerprint": name,
                    "source_file": row["source_file"],
                    "keep_file": "",
                    "size_bytes": row["size_bytes"],
                    "review_status": "review_required",
                    "reason": "normalized basename repeats but file content differs",
                })
    return rows


def cleanup_rows(records: list[dict[str, Any]], duplicates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    duplicate_by_file = {row["source_file"]: row for row in duplicates if row["duplicate_type"] == "byte_exact"}
    for row in records:
        categories = set(filter(None, row["candidate_categories"].split(",")))
        action = "retain"
        reason = "not a conservative cleanup candidate"
        keep_file = ""
        if row["source_file"] in duplicate_by_file and duplicate_by_file[row["source_file"]]["review_status"] == "safe_duplicate_candidate":
            action = "quarantine_after_review"
            reason = "byte-exact duplicate with a proposed canonical file"
            keep_file = duplicate_by_file[row["source_file"]]["keep_file"]
        elif "empty_file" in categories:
            action = "quarantine_after_review"
            reason = "zero-byte file"
        elif "resource_fork" in categories:
            action = "quarantine_after_review"
            reason = "macOS resource fork or metadata file"
        elif "unfinished_download" in categories:
            action = "quarantine_after_review"
            reason = "explicit unfinished-download marker"
        rows.append({
            "source_file": row["source_file"],
            "source_relpath": row["source_relpath"],
            "action": action,
            "keep_file": keep_file,
            "reason": reason,
            "approved_by_user": "no",
        })
    return rows


def review_rows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in records:
        rows.append({
            "source_file": row["source_file"],
            "source_relpath": row["source_relpath"],
            "extension": row["extension"],
            "size_bytes": row["size_bytes"],
            "candidate_scope": row["candidate_scope"],
            "candidate_categories": row["candidate_categories"],
            "review_status": "review_required",
            "review_reason": row["review_reason"],
            "publication_rule": "do_not_publish_until_structured_parse_and_answer_analysis_review",
        })
    return rows


def write_summary(out: Path, root: Path, records: list[dict[str, Any]], duplicates: list[dict[str, Any]], cleanups: list[dict[str, Any]]) -> None:
    extension_counts = Counter(row["extension"] for row in records)
    scope_counts = Counter(row["candidate_scope"] for row in records)
    status_counts = Counter(row["read_status"] for row in records)
    exact_groups = len({row["fingerprint"] for row in duplicates if row["duplicate_type"] == "byte_exact"})
    exact_candidates = sum(row["review_status"] == "safe_duplicate_candidate" for row in duplicates)
    cleanup_counts = Counter(row["action"] for row in cleanups)
    lines = [
        "# 高考英语源资料盘点",
        "",
        f"- 源目录：`{root}`",
        f"- 盘点时间：`{datetime.now().astimezone().isoformat()}`",
        f"- 文件总数：**{len(records)}**",
        f"- 字节级重复组：**{exact_groups}**；候选重复副本：**{exact_candidates}**",
        "- 说明：清单扫描本身只读源目录；任何已执行清理均通过逐文件哈希校验后移动到可恢复隔离区，并有独立执行报告。",
        "",
        "## 可读状态",
        "",
    ]
    lines.extend(f"- `{key}`：{value}" for key, value in sorted(status_counts.items()))
    lines.extend(["", "## 扩展名", ""])
    lines.extend(f"- `{key}`：{value}" for key, value in extension_counts.most_common())
    lines.extend(["", "## 候选范围（必须经过结构化内容审核）", ""])
    lines.extend(f"- `{key}`：{value}" for key, value in scope_counts.most_common())
    lines.extend(["", "## 清理候选", ""])
    lines.extend(f"- `{key}`：{value}" for key, value in sorted(cleanup_counts.items()))
    lines.extend([
        "",
        "## 发布边界",
        "",
        "1. `paper_only_candidate` 仅允许进入完整真题/模拟卷；不进入知识点或题型题库。",
        "2. `knowledge_only_candidate`、`type_practice_only_candidate` 仍需同时确认完整题干、作答结构、答案和对应解析。",
        "3. `review_required`、无解析、解析错位、题干残缺和 OCR 不可靠资料只保留在审核报告。",
        "4. 音频/视频只建立来源映射，不重复复制内容。",
        "5. 清理只允许对 `cleanup-candidates.csv` 中逐文件复核后进入可恢复隔离区。",
    ])
    (out / "inventory-summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    args = parser.parse_args()
    root = args.root.expanduser().resolve()
    out = args.out.expanduser().resolve()
    if not root.is_dir():
        print(f"source directory does not exist: {root}", file=sys.stderr)
        return 2
    out.mkdir(parents=True, exist_ok=True)
    checkpoint = out / CHECKPOINT_NAME
    records_by_path = load_checkpoint(checkpoint)
    paths = list(iter_files(root))
    pending = [
        path
        for path in paths
        if path.relative_to(root).as_posix() not in records_by_path
        or record_needs_refresh(path, records_by_path[path.relative_to(root).as_posix()])
    ]
    for index, path in enumerate(pending, start=1):
        record = record_for(path, root)
        records_by_path[record["source_relpath"]] = record
        if index % max(1, args.batch_size) == 0:
            save_checkpoint(checkpoint, root, records_by_path, complete=False)
            print(f"checkpoint records={len(records_by_path)} pending={len(pending) - index}")
    # Remove checkpoint records for files that no longer exist, but do not treat
    # a vanished source as a cleanup approval.
    # Recompute filename-derived metadata on every run while preserving hashes
    # from the checkpoint.  This lets classification rules improve without
    # re-reading 1,557 source files.
    refreshed: dict[str, dict[str, Any]] = {}
    for path in paths:
        key = path.relative_to(root).as_posix()
        row = records_by_path[key]
        scope, categories, reason = classify(key, path.name, row["extension"], row["size_bytes"])
        row.update({
            "candidate_scope": scope,
            "candidate_categories": ",".join(categories),
            "review_reason": reason,
        })
        refreshed[key] = row
    records_by_path = refreshed
    save_checkpoint(checkpoint, root, records_by_path, complete=True)
    records = [records_by_path[key] for key in sorted(records_by_path)]
    duplicates = duplicate_rows(records)
    cleanups = cleanup_rows(records, duplicates)
    write_csv(out / "inventory.csv", records, INVENTORY_FIELDS)
    write_csv(out / "duplicates.csv", duplicates, ["duplicate_type", "fingerprint", "source_file", "keep_file", "size_bytes", "review_status", "reason"])
    write_csv(out / "cleanup-candidates.csv", cleanups, ["source_file", "source_relpath", "action", "keep_file", "reason", "approved_by_user"])
    write_csv(out / "classification-review.csv", review_rows(records), ["source_file", "source_relpath", "extension", "size_bytes", "candidate_scope", "candidate_categories", "review_status", "review_reason", "publication_rule"])
    write_summary(out, root, records, duplicates, cleanups)
    print(json.dumps({
        "root": str(root),
        "output": str(out),
        "files": len(records),
        "pending_processed": len(pending),
        "exact_duplicate_rows": sum(row["duplicate_type"] == "byte_exact" for row in duplicates),
        "cleanup_candidates": sum(row["action"] == "quarantine_after_review" for row in cleanups),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
