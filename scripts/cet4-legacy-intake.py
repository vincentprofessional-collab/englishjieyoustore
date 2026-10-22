"""Cache historical/practice source text without changing originals or publishing it."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--cache", type=Path, required=True)
args = parser.parse_args()
root = Path("/Volumes/My HDD3/备课/四级")
destination = args.cache / "text"
destination.mkdir(exist_ok=True)
files = sorted(p for folder in ["真题90-2020", "题型"] for p in (root / folder).rglob("*")
               if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in [".doc", ".docx", ".pdf", ".htm", ".html"])
manifest = []
for index, path in enumerate(files, 1):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    output = destination / f"{digest}.json"
    if not output.exists():
        command = ["/opt/homebrew/bin/pdftotext", "-layout", str(path), "-"] if path.suffix.lower() == ".pdf" else ["/usr/bin/textutil", "-convert", "txt", "-stdout", str(path)]
        result = subprocess.run(command, capture_output=True, timeout=180)
        text = result.stdout.decode("utf-8", errors="replace").replace("\x00", "")
        data = {"source": str(path.relative_to(root)), "sha256": digest,
                "method": "pdf-text" if path.suffix.lower() == ".pdf" else "docx-text" if path.suffix.lower() == ".docx" else "doc-html",
                "text": text, "status": "extracted" if result.returncode == 0 and len(text.strip()) > 100 else "review_required"}
        output.write_text(json.dumps(data, ensure_ascii=False) + "\n")
    else:
        data = json.loads(output.read_text())
    dates = re.findall(r"((?:19|20)\d{2})\s*[年.\-_]?\s*(1[012]|0?[1-9])(?!\d)\s*(?:月)?", str(path.relative_to(root)))
    manifest.append({"source": str(path.relative_to(root)), "sha256": digest,
                     "characters": len(data["text"]), "status": data["status"],
                     "dates": [f"{year}{int(month):02d}" for year, month in dates]})
    if index % 25 == 0:
        checkpoint = args.cache / "legacy-source-inventory.json"
        checkpoint.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        print(f"Legacy text checkpoint: {index}/{len(files)} documents", flush=True)
(args.cache / "legacy-source-inventory.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"documents": len(files), "usableText": sum(item["status"] == "extracted" for item in manifest), "reviewRequired": sum(item["status"] != "extracted" for item in manifest)}, ensure_ascii=False), flush=True)
