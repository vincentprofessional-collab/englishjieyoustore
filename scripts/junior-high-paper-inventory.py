from __future__ import annotations

import json
import re
from pathlib import Path


SOURCE_ROOT = Path("/Users/shidianjin/Downloads/考试-中考")
OUTPUT = Path("/Users/shidianjin/ielts-platform/src/lib/junior-high/paper-inventory.json")

# These are deliberately explicit: the first batch should contain complete papers,
# not grammar-only exercise books that happen to have an original/analysis pair.
PREFERRED = [
    (2024, "天津", "天津专用"),
    (2024, "江苏", "江苏南京专用"),
    (2024, "浙江", "浙江杭州专用"),
    (2023, "广东", "2023年广东省中考英语真题"),
    (2023, "江苏", "2023年江苏省苏州市中考英语真题"),
    (2023, "浙江", "2023年浙江省杭州市中考英语真题"),
    (2023, "山东", "2023年山东省济南市中考英语真题"),
    (2023, "河北", "2023年河北省中考英语真题"),
    (2022, "上海", "2022年上海市中考英语真题"),
    (2024, "福建", "福建专用"),
]


def first_match(year: int, hint: str) -> Path:
    candidates = []
    for path in SOURCE_ROOT.rglob("*（原卷版）.docx"):
        if path.name.startswith(".~"):
            continue
        if str(year) not in str(path) or hint not in str(path):
            continue
        if not list(path.parent.glob("*（解析版）.docx")):
            continue
        candidates.append(path)
    if not candidates:
        raise FileNotFoundError(f"No complete source pair found for {year} / {hint}")
    return sorted(candidates, key=lambda item: str(item))[0]


def year_from_path(path: Path) -> int:
    years = [int(value) for value in re.findall(r"20\d{2}", str(path))]
    return max(years)


inventory = []
for year, region, hint in PREFERRED:
    original = first_match(year, hint)
    analysis = sorted(original.parent.glob("*（解析版）.docx"), key=lambda item: str(item))[0]
    kind = "simulation" if "模拟" in original.name or "模拟" in str(original.parent) else "real"
    label = f"{region}{'模拟卷' if kind == 'simulation' else '真题'}"
    inventory.append(
        {
            "year": year_from_path(original),
            "region": region,
            "kind": kind,
            "label": label,
            "displayTitle": f"中考英语 {region}{year}年{'模拟卷' if kind == 'simulation' else '真题'}",
            "originalPath": str(original),
            "analysisPath": str(analysis),
            "originalName": original.name,
            "analysisName": analysis.name,
            "sourceDirectory": str(original.parent),
        }
    )

OUTPUT.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {OUTPUT} with {len(inventory)} complete pairs")
