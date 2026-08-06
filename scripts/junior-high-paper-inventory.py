from __future__ import annotations

import json
import os
import re
from pathlib import Path


SOURCE_ROOT = Path("/Users/shidianjin/Downloads/考试-中考")
OUTPUT = Path("/Users/shidianjin/ielts-platform/src/lib/junior-high/paper-inventory.json")
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".mp4", ".flac", ".aac", ".ogg"}

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
    (2024, "重庆", "重庆专用"),
    (2024, "湖南", "湖南省卷专用"),
    (2024, "陕西", "陕西专用"),
    (2024, "湖南长沙", "湖南长沙专用"),
    (2024, "广西", "广西专用"),
    (2024, "河南", "河南专用"),
    (2024, "安徽", "安徽专用"),
    (2024, "江西", "江西专用"),
    (2024, "四川成都", "四川成都专用"),
    (2024, "湖北武汉", "湖北武汉专用"),
    (2022, "新疆", "2022年新疆维吾尔自治区中考英语真题"),
    (2022, "河北", "2022年河北省中考英语真题"),
    (2022, "云南昆明", "2022年云南省昆明市中考英语真题"),
    (2022, "四川凉山", "2022年四川省凉山州中考英语真题"),
    (2022, "四川宜宾", "2022年四川省宜宾市中考英语真题"),
    (2022, "四川资阳", "2022年四川省资阳市中考英语真题"),
    (2022, "海南", "2022年海南省中考英语真题"),
    (2022, "甘肃平凉", "2022年甘肃省平凉市中考英语真题"),
    (2022, "广东", "2022年广东省中考英语真题"),
    (2023, "湖南怀化", "2023年湖南省怀化市中考英语真题"),
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


def matching_analysis(original: Path) -> Path:
    """Prefer the analysis file with the same source stem, never a sibling from another region."""
    expected = original.with_name(original.name.replace("（原卷版）", "（解析版）"))
    if expected.exists():
        return expected
    candidates = list(original.parent.glob("*（解析版）.docx"))
    source_stem = re.sub(r"（原卷版）|原卷版", "", original.stem)
    ranked = sorted(
        candidates,
        key=lambda item: (
            0 if re.sub(r"（解析版）|解析版", "", item.stem) == source_stem else 1,
            -len(os.path.commonprefix((original.stem, item.stem))),
            str(item),
        ),
    )
    if ranked:
        return ranked[0]
    raise FileNotFoundError(f"No matching analysis file found for {original}")


def matching_audio(original: Path) -> list[Path]:
    candidates = sorted(
        path for path in original.parent.rglob("*") if path.is_file() and path.suffix.lower() in AUDIO_EXTENSIONS
    )
    marker = re.search(r"（([^（）]*(?:专用|省卷)[^（）]*)）", original.name)
    if marker:
        scoped = [path for path in candidates if marker.group(1) in path.stem]
        return scoped
    return candidates


def year_from_path(path: Path) -> int:
    years = [int(value) for value in re.findall(r"20\d{2}", str(path))]
    return max(years)


inventory = []
for year, region, hint in PREFERRED:
    original = first_match(year, hint)
    analysis = matching_analysis(original)
    audio = matching_audio(original)
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
            "audioAvailable": bool(audio),
            "audioNames": [path.name for path in audio],
        }
    )

OUTPUT.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {OUTPUT} with {len(inventory)} complete pairs")
