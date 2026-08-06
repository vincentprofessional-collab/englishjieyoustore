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
    aliases = {"天津": "tianjin", "江苏": "jiangsu", "浙江": "zhejiang", "广东": "guangdong", "山东": "shandong", "河北": "hebei", "上海": "shanghai", "福建": "fujian"}
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
