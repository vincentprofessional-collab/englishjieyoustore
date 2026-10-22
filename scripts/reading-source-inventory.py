"""Cache local Cambridge sources by fingerprint; never promote OCR to verified text."""
import argparse
import hashlib
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path

PDF_NAMES = {
    1: "Cambridge.1.pdf", 2: "Cambridge.2.pdf", 3: "Cambridge.3.pdf",
    4: "剑4真题.pdf", 5: "Cambridge 5.pdf", 6: "剑6真题.pdf",
    7: "IELTS 7.pdf", 8: "IELTS 8.pdf", 9: "IELTS 9.pdf",
    10: "剑桥雅思真题10影印完整版.pdf", 11: "剑11真题.pdf",
    12: "【12】剑桥雅思真题12.pdf", 13: "【13】剑桥雅思真题13.pdf",
    14: "【14】剑桥雅思真题14.pdf", 15: "剑桥雅思15.pdf",
    16: "剑16真题.pdf", 17: "剑桥雅思17（A类）.pdf",
    18: "剑桥雅思真题18.pdf", 19: "【19】雅思真题IELTS 19.pdf", 20: "剑20.pdf",
}


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf-root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--book21-pdf")
    args = parser.parse_args()
    output = Path(args.output)
    rows = []
    for book in range(1, 22):
        folder = Path(args.pdf_root) / f"剑桥雅思{book}"
        candidates = sorted(str(p) for p in folder.rglob("*")
                            if p.suffix.lower() == ".pdf" and not p.name.startswith("._"))
        source = folder / PDF_NAMES.get(book, "MISSING.pdf")
        if book == 21 and args.book21_pdf:
            source = Path(args.book21_pdf)
        if not source.exists():
            rows.append({"book": book, "status": "source_missing", "candidates": candidates})
            print(f"CI{book}: source_missing", flush=True)
            continue
        stat = source.stat()
        fingerprint = {"path": str(source), "bytes": stat.st_size, "mtimeNs": stat.st_mtime_ns}
        cache = output / "cache" / f"ci{book}-native.json"
        data = json.loads(cache.read_text()) if cache.exists() else {}
        if data.get("fingerprint") != fingerprint:
            result = subprocess.run(["pdftotext", "-layout", str(source), "-"],
                                    check=True, capture_output=True, text=True)
            pages = result.stdout.replace("\r", "").split("\f")
            if not pages[-1].strip():
                pages.pop()
            digest = hashlib.sha256()
            with source.open("rb") as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(block)
            data = {"fingerprint": fingerprint, "sha256": digest.hexdigest(),
                    "pages": [{"page": index + 1, "text": text} for index, text in enumerate(pages)]}
            save(cache, data)
        markers = [{"page": p["page"], "passage": int(m.group(1))}
                   for p in data["pages"]
                   for m in re.finditer(r"READING\s+PASSAGE\s*([123])", p["text"], re.I)]
        row = {"book": book, "status": "native_extracted" if markers else "ocr_required",
               "source": str(source), "sha256": data["sha256"], "candidates": candidates,
               "pages": len(data["pages"]), "characters": sum(len(p["text"].strip()) for p in data["pages"]),
               "readingMarkers": markers, "cache": str(cache)}
        rows.append(row)
        save(output / "source-manifest.json", {"updatedAt": datetime.now().isoformat(), "books": rows})
        print(f"CI{book}: {row['pages']} pages; {row['characters']} chars; {len(markers)} reading markers", flush=True)
    save(output / "source-manifest.json", {"updatedAt": datetime.now().isoformat(), "books": rows})
    lines = ["# 剑桥雅思1–21阅读：来源清单与检查点", "", "状态：正在校对，尚未部署本批阅读内容。", "",
             "目标网站：https://www.englishjieyou.cn", "",
             "页面沿用中高考的左文右题、题号导航、分篇提交与答后解析逻辑。", "",
             "| 册号 | PDF | 提取状态 |", "|---|---|---|"]
    for row in rows:
        lines.append(f"| CI{row['book']} | {Path(row['source']).name if row.get('source') else '未找到'} | {row['status']} |")
    lines += ["", "## 质量门", "", "- 原始PDF及其页码为权威依据；保留来源SHA256。",
              "- 标题、段落与题面按原页图核对；OCR文字不会自动视为已校对。",
              "- 只有题号完整、40题答案核对、来源页与解析齐全的试卷才能通过发布门。",
              "- 第21册使用用户补充路径的阅读PDF，来源以source-manifest.json为准。" if args.book21_pdf
              else "- 第21册目录目前只发现听力音频，等待补齐阅读来源。",
              "", "## 续作", "", "原生提取结果已缓存于cache/；源文件指纹不变时复用，不重复提取。", ""]
    (output / "来源清单与检查点.md").write_text("\n".join(lines))


if __name__ == "__main__":
    main()
