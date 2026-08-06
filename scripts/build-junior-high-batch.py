from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path("/Users/shidianjin/ielts-platform")
INVENTORY = ROOT / "src/lib/junior-high/paper-inventory.json"
DATA_DIR = ROOT / "src/lib/junior-high"
PUBLIC_DIR = ROOT / "public/junior-high"


def slug_for(item: dict) -> str:
    # Keep Chinese regions readable in the catalog while retaining a stable ASCII-like key.
    aliases = {
        "江苏苏州": "jiangsu-suzhou",
        "江苏徐州": "jiangsu-xuzhou",
        "江苏无锡": "jiangsu-wuxi",
        "湖南长沙": "hunan-changsha",
        "湖南怀化": "hunan-huaihua",
        "云南昆明": "yunnan-kunming",
        "四川凉山": "sichuan-liangshan",
        "四川宜宾": "sichuan-yibin",
        "四川资阳": "sichuan-ziyang",
        "甘肃平凉": "gansu-pingliang",
        "湖北武汉": "hubei-wuhan",
        "四川成都": "sichuan-chengdu",
        "天津": "tianjin",
        "江苏": "jiangsu",
        "浙江": "zhejiang",
        "广东": "guangdong",
        "山东": "shandong",
        "河北": "hebei",
        "上海": "shanghai",
        "福建": "fujian",
        "重庆": "chongqing",
        "湖南": "hunan",
        "陕西": "shaanxi",
        "广西": "guangxi",
        "河南": "henan",
        "安徽": "anhui",
        "江西": "jiangxi",
        "新疆": "xinjiang",
        "海南": "hainan",
    }
    readable = f"{item['year']}-{item['region']}-{item['label']}".lower()
    for chinese, english in aliases.items():
        readable = readable.replace(chinese, english)
    safe = re.sub(r"[^a-z0-9]+", "-", readable).strip("-")
    return safe or f"junior-high-{item['year']}"


def main() -> None:
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    for item in inventory:
        slug = slug_for(item)
        output = DATA_DIR / f"{slug}.json"
        assets = PUBLIC_DIR / slug
        command = [
            sys.executable,
            str(ROOT / "scripts/extract-junior-high-paper.py"),
            "--original", item["originalPath"],
            "--analysis", item["analysisPath"],
            "--slug", slug,
            "--year", str(item["year"]),
            "--region", item["region"],
            "--output", str(output),
            "--assets", str(assets),
        ]
        subprocess.run(command, check=True)
        item["slug"] = slug
        item["dataPath"] = str(output)
        item["assetDirectory"] = str(assets)
    INVENTORY.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"built {len(inventory)} junior high papers")


if __name__ == "__main__":
    main()
