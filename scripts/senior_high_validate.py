#!/usr/bin/env python3
"""Deterministic publication checks for the senior-high catalog."""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "senior-high" / "catalog.json"
REPORT = ROOT / "data" / "senior-high" / "audit" / "senior-high-validation.json"
LEAK_RE = re.compile(r"(?:【?答案】?|参考答案|【?解析】?|语篇解读|Passage\s*\d+)", re.I)
FULL_PAPER_TOKENS = ("仿真卷", "组合卷", "综合检测卷", "综合测评卷", "模拟卷")


def main() -> int:
    catalog = json.loads(PUBLIC.read_text(encoding="utf-8"))
    errors: list[str] = []
    knowledge = catalog.get("knowledge", [])
    practice = catalog.get("practice", [])
    practice_groups = {group.get("id"): group for group in catalog.get("practice_groups", [])}
    papers = catalog.get("papers", [])
    paper_items = [question for paper in papers for question in paper.get("questions", []) if question.get("active")]
    published = knowledge + practice + paper_items

    def check(condition: bool, message: str) -> None:
        if not condition:
            errors.append(message)

    ids = [item.get("id") for item in published]
    check(None not in ids, "published item without id")
    check(len(ids) == len(set(ids)), "published item ids are not unique")
    fingerprints = [item.get("fingerprint") for item in published]
    check(None not in fingerprints, "published item without fingerprint")
    check(len(fingerprints) == len(set(fingerprints)), "published content fingerprints are not unique")

    group_passages: defaultdict[str, set[str]] = defaultdict(set)
    group_numbers: defaultdict[str, list[int]] = defaultdict(list)
    for item in knowledge:
        item_id = item.get("id")
        check(item.get("content_scope") == "knowledge_only", f"knowledge item {item_id} has wrong scope")
        check(item.get("review_status") == "approved" and item.get("active") is True, f"knowledge item {item_id} is not approved")
        check(bool(str(item.get("stem", "")).strip()), f"knowledge item {item_id} has no stem")
        check(bool(str(item.get("answer", "")).strip()), f"knowledge item {item_id} has no answer")
        check(not LEAK_RE.search(str(item.get("stem", ""))), f"knowledge item {item_id} leaks answer/navigation text")
        check(item.get("knowledge_topic") not in {"名词、数词、形容词和副词", "代词、介词"}, f"knowledge item {item_id} remains in a combined topic")

    for item in practice:
        item_id = item.get("id")
        options = item.get("options", [])
        labels = [option.get("letter") for option in options]
        check(item.get("content_scope") == "type_practice_only", f"practice item {item_id} has wrong scope")
        check(item.get("review_status") == "approved" and item.get("active") is True, f"practice item {item_id} is not approved")
        check(bool(str(item.get("answer", "")).strip()), f"practice item {item_id} has no answer")
        check(not any(token in str(item.get("source_relpath", "")) for token in FULL_PAPER_TOKENS), f"practice item {item_id} comes from a complete paper")
        check(not LEAK_RE.search(str(item.get("stem", ""))), f"practice item {item_id} leaks answer/navigation text in its stem")
        check(2 <= len(options) <= 6, f"practice item {item_id} has {len(options)} options")
        check(labels == [chr(ord("A") + index) for index in range(len(labels))], f"practice item {item_id} option labels are incomplete")
        check(all(option.get("text") and len(option["text"]) <= 500 and not LEAK_RE.search(option["text"]) for option in options), f"practice item {item_id} has a leaked or oversized option")
        group = practice_groups.get(item.get("group_id"))
        check(group is not None, f"practice item {item_id} has no source-aligned passage group")
        check(bool(group and group.get("passage")), f"practice item {item_id} has no passage")
        check(not LEAK_RE.search(str(group.get("passage", "") if group else "")), f"practice item {item_id} passage leaks answer/navigation text")
        check(item.get("answer") in labels, f"practice item {item_id} answer does not reference an option")
        if item.get("group_id"):
            group_passages[item["group_id"]].add(group.get("passage", "") if group else "")
            group_numbers[item["group_id"]].append(int(item.get("source_question_number", 0)))

    for group_id, passages in group_passages.items():
        check(len(passages) == 1, f"reading group {group_id} contains mismatched passages")
        check(all(number > 0 for number in group_numbers[group_id]), f"reading group {group_id} has an invalid source question number")
        check(practice_groups.get(group_id, {}).get("question_count") == len(group_numbers[group_id]), f"reading group {group_id} has a wrong question count")

    paper_fingerprints = {item.get("fingerprint") for item in paper_items}
    training_fingerprints = {item.get("fingerprint") for item in knowledge + practice}
    check(not paper_fingerprints & training_fingerprints, "paper_only content intersects the training catalog")

    checks = {
        "published_item_count": len(published),
        "knowledge_count": len(knowledge),
        "practice_count": len(practice),
        "practice_group_count": len(group_passages),
        "paper_count": len(papers),
        "topic_counts": dict(Counter(item.get("knowledge_topic", "") for item in knowledge)),
        "category_counts": dict(Counter(item.get("category", "") for item in practice)),
        "answer_leak_count": sum(bool(LEAK_RE.search(" ".join([
            str(item.get("stem", "")),
            " ".join(str(option.get("text", "")) for option in item.get("options", [])),
        ]))) for item in knowledge + practice) + sum(bool(LEAK_RE.search(str(group.get("passage", "")))) for group in practice_groups.values()),
        "paper_training_fingerprint_intersection": len(paper_fingerprints & training_fingerprints),
    }
    result = {"generated_at": datetime.now(timezone.utc).isoformat(), "ok": not errors, "checks": checks, "errors": errors}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": result["ok"], "error_count": len(errors), **checks}, ensure_ascii=False))
    if errors:
        for error in errors[:20]:
            print(error)
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
