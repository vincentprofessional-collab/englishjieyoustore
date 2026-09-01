#!/usr/bin/env python3
"""Move only explicitly safe source exclusions to a recoverable quarantine."""

from __future__ import annotations

import argparse
import csv
import hashlib
import shutil
from datetime import datetime
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("/Users/shidianjin/Documents/高考英语"))
    parser.add_argument("--audit", type=Path, default=Path("/Users/shidianjin/ielts-platform/data/senior-high/audit"))
    parser.add_argument("--quarantine", type=Path, default=Path("/Users/shidianjin/.codex/quarantine/senior-high-20260831"))
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    inventory_path = args.audit.resolve() / "inventory.csv"
    with inventory_path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    targets = [row for row in rows if row.get("candidate_scope") == "exclude_candidate"]
    args.quarantine.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().astimezone().isoformat()
    report_rows: list[dict[str, str]] = []
    for row in targets:
        source = Path(row["source_file"]).resolve()
        relative = Path(row["source_relpath"])
        category = row.get("candidate_categories", "")
        if not source.is_file() or source.is_symlink():
            report_rows.append({"source_file": str(source), "quarantine_file": "", "category": category, "status": "skipped_not_regular_file", "before_sha256": row.get("sha256", ""), "after_sha256": "", "timestamp": timestamp})
            continue
        if source.parent != root and root not in source.parents:
            report_rows.append({"source_file": str(source), "quarantine_file": "", "category": category, "status": "skipped_outside_root", "before_sha256": row.get("sha256", ""), "after_sha256": "", "timestamp": timestamp})
            continue
        before = sha256(source)
        if before != row.get("sha256", ""):
            # Metadata files and explicit download markers are independently
            # identified by their path/suffix.  A macOS metadata file may be
            # rewritten between the inventory and this move, so the current
            # hash becomes the value verified after moving it.
            if not ({"resource_fork", "unfinished_download", "empty_file", "non_english_subject"} & set(category.split(","))):
                report_rows.append({"source_file": str(source), "quarantine_file": "", "category": category, "status": "skipped_hash_changed", "before_sha256": before, "after_sha256": "", "timestamp": timestamp})
                continue
        destination = args.quarantine / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            existing = sha256(destination) if destination.is_file() else ""
            if existing == before:
                report_rows.append({"source_file": str(source), "quarantine_file": str(destination), "category": category, "status": "skipped_quarantine_exists_same_hash", "before_sha256": before, "after_sha256": existing, "timestamp": timestamp})
                continue
            destination = destination.with_name(f"{destination.name}.current-{before[:12]}")
            if destination.exists():
                report_rows.append({"source_file": str(source), "quarantine_file": str(destination), "category": category, "status": "skipped_quarantine_exists", "before_sha256": before, "after_sha256": "", "timestamp": timestamp})
                continue
        shutil.move(str(source), str(destination))
        after = sha256(destination)
        status = "moved_verified" if after == before else "moved_hash_mismatch"
        report_rows.append({"source_file": str(source), "quarantine_file": str(destination), "category": category, "status": status, "before_sha256": before, "after_sha256": after, "timestamp": timestamp})

    report = args.report.resolve() if args.report else args.audit.resolve() / "cleanup-execution-20260831.csv"
    report.parent.mkdir(parents=True, exist_ok=True)
    with report.open("w", encoding="utf-8-sig", newline="") as handle:
        fields = ["source_file", "quarantine_file", "category", "status", "before_sha256", "after_sha256", "timestamp"]
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(report_rows)
    moved = sum(row["status"] == "moved_verified" for row in report_rows)
    print({"targets": len(targets), "moved_verified": moved, "report": str(report), "quarantine": str(args.quarantine)})
    return 0 if moved == len(targets) else 1


if __name__ == "__main__":
    raise SystemExit(main())
