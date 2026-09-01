#!/usr/bin/env python3
"""Move verified byte-identical duplicate files to a recoverable quarantine."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path("/Users/shidianjin/Documents/高考英语")
AUDIT = Path("/Users/shidianjin/ielts-platform/data/senior-high/audit")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def under_root(path: Path, root: Path) -> bool:
    return path != root and root in path.parents


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--report", type=Path, default=AUDIT / "cleanup-duplicates-execution-20260831.csv")
    parser.add_argument("--duplicates", type=Path, default=AUDIT / "duplicates.csv")
    parser.add_argument("--quarantine", type=Path, required=True)
    args = parser.parse_args()

    root = args.root.resolve()
    duplicate_report = args.duplicates.resolve()
    quarantine = args.quarantine.resolve()
    if not root.is_dir():
        raise SystemExit(f"source root is not a directory: {root}")
    if not duplicate_report.is_file():
        raise SystemExit(f"duplicate report is missing: {duplicate_report}")
    if quarantine == root or root in quarantine.parents:
        raise SystemExit(f"quarantine must not be inside source root: {quarantine}")
    quarantine.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)

    with duplicate_report.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))

    targets: dict[str, dict[str, str]] = {}
    for row in rows:
        if row.get("review_status") != "safe_duplicate_candidate":
            continue
        source = row.get("source_file", "")
        if source:
            targets.setdefault(source, row)

    executed_at = datetime.now(timezone.utc).isoformat()
    output: list[dict[str, str]] = []
    for source_text, row in sorted(targets.items()):
        source = Path(source_text).resolve()
        keep = Path(row.get("keep_file", "")).resolve()
        fingerprint = row.get("fingerprint", "")
        destination = quarantine / source.relative_to(root)
        result = {
            "source_file": str(source),
            "keep_file": str(keep),
            "quarantine_file": str(destination),
            "fingerprint": fingerprint,
            "status": "",
            "reason": "",
            "executed_at": executed_at,
        }
        if not under_root(source, root):
            result["status"] = "skipped"
            result["reason"] = "source is outside the configured root"
        elif not source.is_file():
            result["status"] = "skipped"
            result["reason"] = "source is missing or not a regular file"
        elif not keep.is_file():
            result["status"] = "skipped"
            result["reason"] = "canonical keep file is missing"
        elif source == keep:
            result["status"] = "skipped"
            result["reason"] = "source and canonical file are the same path"
        elif sha256(source) != fingerprint or sha256(keep) != fingerprint:
            result["status"] = "skipped"
            result["reason"] = "source or canonical hash no longer matches the duplicate report"
        elif destination.exists():
            result["status"] = "skipped"
            result["reason"] = "quarantine destination already exists"
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source), str(destination))
            if not destination.is_file() or sha256(destination) != fingerprint:
                raise SystemExit(f"post-move verification failed: {destination}")
            result["status"] = "moved_verified"
            result["reason"] = "byte-identical duplicate retained in recoverable quarantine"
        output.append(result)

    fields = [
        "source_file",
        "keep_file",
        "quarantine_file",
        "fingerprint",
        "status",
        "reason",
        "executed_at",
    ]
    with args.report.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(output)

    counts: dict[str, int] = {}
    for row in output:
        counts[row["status"]] = counts.get(row["status"], 0) + 1
    print(json.dumps({"targets": len(output), "status_counts": counts, "report": str(args.report)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
