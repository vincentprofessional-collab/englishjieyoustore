"""Read-only CET-4 source inventory and resumable, local macOS OCR cache.

The cache is an offline audit artifact, never an implicit publication approval.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

import fitz

parser = argparse.ArgumentParser()
parser.add_argument("--cache", type=Path, required=True)
parser.add_argument("--vision", type=Path, default=Path("/private/tmp/cet4-vision-ocr"))
parser.add_argument("--only", default="")
parser.add_argument("--extra", type=Path)
parser.add_argument("--extras-only", action="store_true")
args = parser.parse_args()
root = Path("/Volumes/My HDD3/备课/四级")
recent = root / "真题2020-2026"
args.cache.mkdir(parents=True, exist_ok=True)
ocr_root = args.cache / "ocr"
ocr_root.mkdir(exist_ok=True)
library = json.loads(Path("src/data/cet4/library.json").read_text())["entries"]
old_report = json.loads(Path("data/cet4/2020-2026-import-report.json").read_text())
files = [] if args.extras_only else sorted(p for p in root.rglob("*") if p.is_file() and not p.name.startswith("."))


def fingerprint(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def save(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def date_and_set(name):
    match = re.search(r"(20\d\d)\s*[年.]?\s*(0?[3679]|1[02])\s*(?:月)?", name)
    sets = re.search(r"第\s*([123一二三])\s*套", name)
    if not match:
        return None
    number = {"一": 1, "二": 2, "三": 3}.get(sets[1], int(sets[1]) if sets[1].isdigit() else 0) if sets else 1
    return f"{match[1]}{int(match[2]):02d}{number}"


inventory = []
for entry in [] if args.extras_only else library:
    key = entry["id"].removeprefix("cet4-paper-")
    old = next(r for r in old_report["selected"] if r["key"].replace("-", "") == key)
    paper = next((recent / n for n in [old["selected"], *old["alternatives"]]
                  if (recent / n).exists()), None)
    if paper is None:
        raise RuntimeError(f"Missing all paper sources: {entry['id']}")
    pdf = next((recent / n for n in [old["selected"], *old["alternatives"]]
                if n.lower().endswith(".pdf") and (recent / n).exists()), None)
    answer_candidates = [p for p in files if p.suffix.lower() == ".pdf"
                         and date_and_set(p.name) == key
                         and re.search("解析|详解|答案", p.name)
                         and not re.search("长篇|仔细|选词|阅读解析|翻译|写作|六级", p.name)]
    answer_candidates.sort(key=lambda p: (p.parent != recent, str(p)))
    if not answer_candidates:
        raise RuntimeError(f"Full answer source is ambiguous for {key}: {answer_candidates}")
    answers = answer_candidates[0]
    inventory.append({"id": entry["id"], "title": entry["title"],
                      "paper": str(paper.relative_to(root)), "paperHash": fingerprint(paper),
                      "pdf": str(pdf.relative_to(root)) if pdf else None,
                      "answer": str(answers.relative_to(root)), "answerHash": fingerprint(answers),
                      "answerAlternatives": [str(p.relative_to(root)) for p in answer_candidates[1:]],
                      "audioUrl": entry["audioUrl"], "audioSource": old["audio"]})

if args.extras_only:
    inventory = json.loads((args.cache / 'inventory.json').read_text())['papers']
else:
    save(args.cache / "inventory.json", {
        "sourceRoot": str(root), "fileCount": len(files),
        "files": [{"path": str(p.relative_to(root)), "bytes": p.stat().st_size} for p in files],
        "papers": inventory,
    })

jobs = []
for entry in [] if args.extras_only else inventory:
    if args.only and args.only not in entry["id"]:
        continue
    for kind in ["answer", "pdf"]:
        if entry[kind]:
            jobs.append((entry["id"], kind, root / entry[kind]))
if args.extra:
    for item in json.loads(args.extra.read_text()):
        jobs.append((item['id'], 'extra', root / item['path']))

for job_index, (entry_id, kind, path) in enumerate(jobs, 1):
    digest = fingerprint(path)
    output = ocr_root / f"{digest}.json"
    if output.exists():
        continue
    doc = fitz.open(path)
    pages = []
    for page_index, page in enumerate(doc):
        # 216 dpi keeps fine print legible; original page images remain authoritative.
        image = args.cache / f"ocr-input-{digest[:12]}.jpg"
        page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False).save(image, jpg_quality=93)
        result = subprocess.run([str(args.vision), str(image)], check=True, capture_output=True, text=True, timeout=90)
        parsed = json.loads(result.stdout)
        pages.append({"number": page_index + 1, "width": page.rect.width,
                      "height": page.rect.height, "pdfText": page.get_text(), "lines": parsed["lines"]})
        image.unlink()
    save(output, {"source": str(path.relative_to(root)), "sha256": digest, "pages": pages})
    print(f"{job_index}/{len(jobs)} {entry_id} {kind}: {len(pages)} pages cached", flush=True)

print(f"CHECKPOINT: {len(inventory)} paper/answer pairs; {len([p for p in ocr_root.glob('*.json') if not p.name.startswith('.')])} documents cached", flush=True)
