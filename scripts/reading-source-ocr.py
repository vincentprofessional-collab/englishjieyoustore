"""Checkpointed local OCR for missing source text or selected source pages."""
import argparse
import concurrent.futures
import csv
import io
import json
import os
import subprocess
import tempfile
from collections import Counter
import statistics
import re
from pathlib import Path

import fitz
from PIL import Image


def tsv_words(value):
    # Tesseract emits literal quotation marks, not CSV-escaped fields.
    return csv.DictReader(io.StringIO(value),delimiter='\t',quoting=csv.QUOTE_NONE)


def ocr_page(job):
    source, page_no, output, dpi, languages, columns, split_ratio = job
    output = Path(output)
    if output.exists():
        cached=json.loads(output.read_text())
        if not any('\n' in w['text'] or '\t' in w['text'] for w in cached.get('words',[])):
            return page_no
    with fitz.open(source) as doc:
        pix = doc[page_no - 1].get_pixmap(matrix=fitz.Matrix(dpi / 72, dpi / 72), alpha=False)
    words = []
    lines = {}
    with tempfile.TemporaryDirectory(prefix="ielts-source-ocr-") as temp:
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        boxes = [(0, 0, int(pix.width * split_ratio), pix.height), (int(pix.width * split_ratio), 0, pix.width, pix.height)] if columns else [(0, 0, pix.width, pix.height)]
        for column, box in enumerate(boxes):
            image_path = Path(temp) / f"page-{column}.png"
            image.crop(box).save(image_path)
            env = {**os.environ, "OMP_THREAD_LIMIT": "1"}
            result = subprocess.run(["tesseract", str(image_path), "stdout", "-l", languages,
                                     "--psm", "6" if columns else "3", "tsv"],
                                    capture_output=True, text=True, check=True, env=env)
            for word in tsv_words(result.stdout):
                value = (word.get("text") or "").strip()
                if not value or word["level"] != "5":
                    continue
                key = (column,) + tuple(int(word[k]) for k in ["block_num", "par_num", "line_num"])
                lines.setdefault(key, []).append(value)
                words.append({"text": value, "x": int(word["left"]) + box[0], "y": int(word["top"]),
                              "w": int(word["width"]), "h": int(word["height"]),
                              "confidence": float(word["conf"]), "line": list(key)})
    payload = {"page": page_no, "dpi": dpi, "parser":"tsv-unquoted-v1", "width": pix.width, "height": pix.height, "splitRatio": split_ratio,
               "text": "\n".join(" ".join(value) for value in lines.values()), "words": words}
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary=output.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(payload, ensure_ascii=False))
    temporary.replace(output)
    return page_no


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--books", default="2,3")
    parser.add_argument("--pages")
    parser.add_argument("--plan")
    parser.add_argument("--key-columns", action="store_true")
    parser.add_argument("--output-folder", default="ocr")
    parser.add_argument("--output-root", help="Keep active OCR checkpoints in an authorized writable workspace")
    parser.add_argument("--dpi", type=int, default=190)
    parser.add_argument("--languages", default="eng")
    parser.add_argument("--workers", type=int, default=3)
    args = parser.parse_args()
    root = Path(args.root)
    output_root=Path(args.output_root) if args.output_root else root
    manifest = json.loads((root / "source-manifest.json").read_text())
    plan = json.loads(Path(args.plan).read_text()) if args.plan else None
    books = {int(n) for n in (plan if plan else args.books.split(","))}
    for book in manifest["books"]:
        if book["book"] not in books:
            continue
        selected = plan[str(book['book'])] if plan else ([int(n) for n in args.pages.split(",")] if args.pages else range(1, book["pages"] + 1))
        jobs = []
        for no in selected:
            split = .49
            full = root / 'ocr' / f"ci{book['book']}" / f"{no:03}.json"
            if args.key_columns and full.exists():
                data = json.loads(full.read_text())
                anchors = [w['x'] / data['width'] for w in data['words']
                           if re.fullmatch(r'2[1-9]|3[0-9]|40',w['text']) and .3 < w['x']/data['width'] < .8
                           and .15 < w['y']/data['height'] < .8]
                if len(anchors) >= 3:
                    peak = Counter(round(x/ .02) for x in anchors).most_common(1)[0][0] * .02
                    split = statistics.median(x for x in anchors if abs(x-peak) < .025) - .012
            jobs.append((book['source'], no, str(output_root/args.output_folder/f"ci{book['book']}"/f"{no:03}.json"), args.dpi,args.languages,args.key_columns,split))
        completed = 0
        with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers) as pool:
            for no in pool.map(ocr_page, jobs):
                completed += 1
                if completed % 25 == 0 or completed == len(jobs):
                    print(f"CI{book['book']}: cached {completed}/{len(jobs)} OCR pages", flush=True)


if __name__ == "__main__":
    main()
