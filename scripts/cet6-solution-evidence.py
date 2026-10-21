"""Build source-linked, cleaned solution images. Never publish the original PDFs.

Run with the bundled Python (Pillow) after cet6-source-ocr.swift finishes.
OCR is used for locators and answer letters; displayed explanations use original
page pixels so recognition errors cannot become explanation text.
"""
import collections
import concurrent.futures
import threading
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageChops

ROOT = Path.cwd()
CACHE = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/cet6-intake-20261021")
AD = re.compile(r"公众号|公眾號|^老师说|视频解析中.{0,8}老师|(?:淘宝|淘寶).{0,12}(?:[底店]铺|[店底]鋪|工作室|搜|客服|资料)|^淘宝$|非此店铺|(?:微信|微\s*信)(?:号|群|公众|ID|[：:])|添加微信|扫码.{0,12}(?:关注|领取|购买|加群)|(?:快来|请|欢迎).{0,12}(?:扫码|扫描).{0,20}(?:视频|课|关注|观看|收看)|(?:扫描|扫码).{0,15}(?:本页|视频课|二维码).{0,12}(?:观看|收看|领取|关注)|关注.{0,12}(?:资料|公号|领取|我们)|加群|QQ群|群号|资料领取|资料购买|免费领取|练习方式|练习方法|备考建议|刷题建议|备考方法|打印说明|下载说明|下载地址|版权所有|如有侵权.{0,8}(?:联系|删除)|侵权.{0,4}(?:必究|请联系|联系删除)|翻版必究|水印|taobao\.com|weixin\.qq|pan\.baidu|lanzou|qun\.qq|小红书|哔哩哔哩|星火英语|有道考神|大家网|大家论坛|考虫|四级六级资料", re.I)
PARTS = {"writing": "写作", "listening": "listening", "translation": "翻译"}
STOP = set("there their these those about would should could which where what when have with from that this than they them will your some into more only been were were does each part words following section passage answer question questions comprehension directions sheet minutes write essay students university college english based heard choose marked choices least given single letter centre center".split())

def normalize(text):
    return unicodedata.normalize("NFKC", text).strip()

def part_heading(text):
    # Match formal headings, allowing scanned dingbats around the title.
    text = normalize(text)
    if re.fullmatch(r"Part\s*(?:IV|WV|W|N)", text, re.I): return "translation"
    match = re.search(r"Writing|Listening\s*Comprehension|Reading\s*Comprehension|Translation", text, re.I)
    if not match: return None
    prefix, suffix = text[:match.start()].strip(), text[match.end():].strip()
    prefix_ok = not prefix or bool(re.fullmatch(r"Part.{0,12}|[^A-Za-z]{1,5}|[Qo]{1,2}", prefix, re.I))
    suffix_ok = not suffix or bool(re.fullmatch(r"(?:[(（][^()（）]*[)）])?[.:：)）\]】IJl]{0,3}", suffix, re.I))
    if not prefix_ok or not suffix_ok: return None
    return re.sub(r"\s+", "", match[0]).lower().replace("comprehension", "")

def section_heading(text):
    return bool(re.fullmatch(r"Section.{0,12}", normalize(text), re.I))

def section_label(text, previous, lines_since_heading=999):
    labels = re.findall(r"[ABC]", normalize(text)[7:].upper())
    candidate = "ABC".index(labels[-1]) if labels else min(previous + 1, 2)
    # OCR can read the decorative box around the first A as a C.
    return 0 if previous < 0 and candidate > 0 and lines_since_heading < 8 else candidate

def tokens(text):
    return set(re.findall(r"[a-z]{4,}", text.lower())) - STOP

def focus_query(segment, text):
    if segment != "写作": return text
    quoted = re.findall(r'["“”](.{18,}?)["“”]', text, re.S)
    if quoted: return " ".join(quoted)
    text = re.sub(r"Directions?\s*:\s*For this part,?\s*you are allowed 30 minutes to write\s+(?:a|an)\s+(?:short\s+)?essay", "", text, count=1, flags=re.I)
    text = re.sub(r"You can (?:cite|make).*?(?:essay|view|experience|experiences)\s*[.。]", "", text, flags=re.I|re.S)
    text = re.sub(r"You (?:should|are required to) write.*?words\s*[.。]?", "", text, flags=re.I|re.S)
    return text

def match_score(query, source):
    english = tokens(query)
    english_score = len(english & tokens(source)) / max(1, len(english))
    def chinese_grams(text):
        han = "".join(re.findall(r"[\u4e00-\u9fff]+", text))
        return {han[i:i+3] for i in range(len(han)-2)}
    chinese = chinese_grams(query)
    if len(chinese) >= 15 and len(re.findall(r"[\u4e00-\u9fff]", query)) >= len(re.findall(r"[A-Za-z]", query)) * .5:
        chinese_score = len(chinese & chinese_grams(source)) / len(chinese)
        return chinese_score * .8 + english_score * .2 if english else chinese_score
    return english_score

def ref(file, page):
    return {"sourceDocumentId": file["sha256"], "relativePath": "试卷/真题/" + file["name"], "sha256": file["sha256"], "locator": {"page": page}, "extractionMethod": "manual-review", "confidence": 1}

def read_solution(file):
    target = Path(file["cache"].replace(".norm.txt", ".ocr.zh.json"))
    if not target.exists(): return None
    pages = json.loads(target.read_text())
    expected = Path(file["cache"]).read_text().count("\f")
    if expected and len(pages) < expected: return None
    rows = []
    part = "writing"
    subsection = "A"
    section_index = -1
    section_line_count = 0
    for page in pages:
        for line in sorted(page["lines"], key=lambda row: (row["y"], row["x"])):
            text = normalize(line["text"])
            if AD.search(text): continue
            heading = part_heading(text)
            if heading:
                part = heading
                section_index = -1
                section_line_count = 0
                subsection = "A"
            if section_heading(text) and part in ["reading", "listening"]:
                section_index = section_label(text, section_index, section_line_count)
                subsection = "ABC"[min(section_index, 2)]
            key = "reading" + subsection if part == "reading" else PARTS.get(part, part)
            rows.append({**line, "text": text, "page": page["page"], "part": key})
            section_line_count += 1
    anchors = collections.defaultdict(list)
    for i, line in enumerate(rows):
        if line["part"] not in ["listening", "readingA", "readingB", "readingC"]: continue
        text = line["text"]
        match = re.match(r"^(\d{1,2})\s*[.、)）:：]?\s*(.*)$", text)
        if not match: continue
        number, tail = int(match[1]), match[2]
        if not (1 <= number <= 25 if line["part"] == "listening" else 26 <= number <= 55): continue
        if not tail and i + 1 < len(rows) and rows[i + 1]["page"] == line["page"]:
            tail = rows[i + 1]["text"]
        letter = re.match(r"^(?:答案(?:为|是)?\s*[:：]?\s*)?[\[【(]?\s*([A-Z01])\s*(?:[).、\]】:]|$|\s)", tail)
        answer = letter[1].translate(str.maketrans({"0": "O", "1": "I"})) if letter else ""
        # A reproduced option such as "1. A) The company..." is not an answer key.
        if letter and tail[letter.end():].strip() and not re.match(r"^(?:答案|[【\[]?(?:解析|考点|定位|详解))", tail[letter.end():].strip()): answer = ""
        heading = bool(answer or re.match(r"^(?:What|Why|How|When|Who|Where|According|Which|The\b|题干|答案|定位)", tail, re.I))
        if heading: anchors[number].append({**line, "index": i, "answer": answer, "strong": bool(answer)})
    # Auto-mark a letter only when a second extraction agrees. Otherwise the
    # original answer page remains available for accurate manual checking.
    corroboration = collections.defaultdict(set)
    second_ocr = Path(file["cache"].replace(".norm.txt", ".ocr.json"))
    second_pages = json.loads(second_ocr.read_text()) if second_ocr.exists() else []
    raw_pages = Path(file["cache"]).read_text().split("\f")
    for page_number in range(1, len(pages) + 1):
        source_lines = raw_pages[page_number-1].splitlines() if page_number <= len(raw_pages) else []
        source_lines += [l["text"] for p in second_pages if p["page"] == page_number for l in p["lines"]]
        for text in source_lines:
            match = re.match(r"^\s*(\d{1,2})\s*[.、)）:：]?\s*[\[【(]?\s*([A-O])\s*(?:[).、\]】:]|$|\s)", normalize(text))
            if match: corroboration[(page_number, int(match[1]))].add(match[2])
    chosen = {}
    all_anchors = collections.defaultdict(list)
    for number, found in anchors.items():
        for anchor in found:
            later = [v["index"] for n, values in anchors.items() if n != number for v in values if v["index"] > anchor["index"]]
            part_end = next((j for j in range(anchor["index"]+1, len(rows)) if rows[j]["part"] != anchor["part"]), len(rows))
            end = min(min(later) if later else len(rows), part_end)
            chunk = rows[anchor["index"]:end]
            text = "\n".join(l["text"] for l in chunk)
            if not anchor["answer"]:
                patterns = [r"答案(?:解析|为|是)?\s*[:：]?\s*([A-Z])(?:[。.)、\s]|$)", r"(?:由此可知|因此|所以|故选|故答案为|本题选|正确答案(?:为|是)?)[,，:：\s]*([A-Z])", r"([A-Z])\s*项(?:为正确|正确|符合题意|与.*相符)"]
                answers = set(a for pattern in patterns for a in re.findall(pattern, text))
                if len(answers) == 1: anchor["answer"] = next(iter(answers))
            anchor["corroborated"] = anchor["answer"] in corroboration[(anchor["page"], number)]
            maximum = chunk[-1]["page"] if chunk else anchor["page"]
            anchor["pages"] = list(range(anchor["page"], maximum + 1))
            all_anchors[number].append(anchor)
        chosen[number] = next((v for v in found if v["strong"]), found[0])
    segments = {key: [l for l in rows if l["part"] == key] for key in ["写作", "listening", "readingA", "readingB", "readingC", "翻译"]}
    chunks = collections.defaultdict(list)
    for index, row in enumerate(rows):
        if index == 0 or rows[index-1]["part"] != row["part"]: chunks[row["part"]].append([])
        chunks[row["part"]][-1].append({**row, "index": index})
    # The printed question ranges disambiguate damaged or omitted Section labels.
    # Some third-set solution booklets start at B and omit A altogether.
    semantic_chunks = collections.defaultdict(list)
    for key, values in chunks.items():
        for chunk in values:
            if not key.startswith("reading"):
                semantic_chunks[key].append(chunk); continue
            numbers = {int(match[1]) for row in chunk if (match := re.match(r"^(\d{2})\s*(?:[.、)）:：]|[【\[])", row["text"]))}
            identified = [name for name, first, last in [("readingA",26,35),("readingB",36,45),("readingC",46,55)] if len(numbers & set(range(first,last+1))) >= 3]
            for name in identified or [key]: semantic_chunks[name].append(chunk)
    chunks = semantic_chunks
    segments = {key: list({row["index"]: row for chunk in chunks.get(key,[]) for row in chunk}.values()) for key in ["写作", "listening", "readingA", "readingB", "readingC", "翻译"]}
    return {"file": file, "pages": pages, "rows": rows, "anchors": chosen, "allAnchors": all_anchors, "segments": segments, "chunks": chunks}

def text_blocks(blocks):
    return " ".join(b.get("text", "") if b["type"] in ["heading", "notice"] else " ".join(r.get("text", "") for r in b.get("runs", [])) for b in blocks)

asset_cache = {}
asset_locks = {}
cleaning_log = []

def page_asset(solution, page_number, bounds=(0, 0, 1, 1)):
    key = (solution["file"]["sha256"], page_number, bounds)
    with asset_locks.setdefault(key, threading.Lock()):
        return _page_asset(solution, page_number, bounds)

def _page_asset(solution, page_number, bounds):
    key = (solution["file"]["sha256"], page_number, bounds)
    if key in asset_cache: return asset_cache[key]
    file = solution["file"]
    asset_id = "page-clean-v5-" + file["sha256"][:16] + "-" + str(page_number) + "-" + "-".join(str(round(v*1000)) for v in bounds)
    output = ROOT / "public/cet6/solutions" / (asset_id + ".webp")
    if not output.exists() and os.environ.get('CET6_REVIEWED_IMAGE_DIR'):
        archived = Path(os.environ['CET6_REVIEWED_IMAGE_DIR']) / (asset_id + '.webp')
        if archived.exists(): output = archived
    page = next(p for p in solution["pages"] if p["page"] == page_number)
    if "barcodes" not in page: raise ValueError(f"Barcode verification pending: {file['name']} page {page_number}")
    excluded = [l for l in page["lines"] if AD.search(normalize(l["text"]))]
    if not output.exists():
        raster_cache = CACHE / "clean-raster" / (file["sha256"] + "-" + str(page_number) + "-v5.png")
        legacy_raster = CACHE / "clean-raster" / (file["sha256"] + "-" + str(page_number) + "-v4.png")
        # These three scans have a lavender watermark crossing printed text.
        # Re-render them so an old rectangular mask cannot erase exam content.
        fresh_watermark_scan = file["date"] == "2018-12" and file["kind"] == "answer"
        if raster_cache.exists():
            image = Image.open(raster_cache).convert("RGB")
        elif legacy_raster.exists() and not fresh_watermark_scan:
            image = Image.open(legacy_raster).convert("RGB")
        else:
            raster = subprocess.run(["/opt/homebrew/bin/pdftoppm", "-f", str(page_number), "-l", str(page_number), "-scale-to", "1900", "-singlefile", "-png", file["path"]], capture_output=True, check=True).stdout
            image = Image.open(io.BytesIO(raster)).convert("RGB")
            red, green, blue = image.split()
            low = ImageChops.darker(ImageChops.darker(red, green), blue)
            high = ImageChops.lighter(ImageChops.lighter(red, green), blue)
            neutral = ImageChops.subtract(high, low).point(lambda value: 255 if value <= 20 else 0)
            light = low.point(lambda value: 255 if value >= 155 else 0)
            image.paste("white", mask=ImageChops.multiply(neutral, light))
            draw = ImageDraw.Draw(image)
            width, height = image.size
            for line in excluded:
                x, y, w, h = [line[k] for k in ("x", "y", "w", "h")]
                if fresh_watermark_scan and re.search(r"光速|光涑|淘宝|店铺", line["text"]): continue
                draw.rectangle((int(x*width)-5, int(y*height)-5, int((x+w)*width)+5, int((y+h)*height)+5), fill="white")
            for code in page.get("barcodes", []):
                x, y, w, h = [code[k] for k in ("x", "y", "w", "h")]
                draw.rectangle((int(x*width)-8, int(y*height)-8, int((x+w)*width)+8, int((y+h)*height)+8), fill="white")
        if not raster_cache.exists():
            red, green, blue = image.split()
            low = ImageChops.darker(ImageChops.darker(red, green), blue)
            lavender = ImageChops.multiply(ImageChops.difference(red, green).point(lambda value: 255 if value <= 12 else 0), ImageChops.subtract(blue, green).point(lambda value: 255 if value >= 12 else 0))
            lavender = ImageChops.multiply(lavender, low.point(lambda value: 255 if value >= 145 else 0))
            image.paste("white", mask=lavender)
            # Publisher video invitations can span several separately detected lines.
            promotional = [l for l in excluded if re.match(r"老师说", normalize(l["text"]))]
            if promotional:
                draw = ImageDraw.Draw(image)
                width, height = image.size
                y = min(l["y"] for l in promotional) - .004
                draw.rectangle((0, int(y*height), width, int(.96*height)), fill="white")
            raster_cache.parent.mkdir(exist_ok=True, parents=True)
            image.save(raster_cache)
        width, height = image.size
        image = image.crop(tuple(int(v * (width if i % 2 == 0 else height)) for i, v in enumerate(bounds)))
        output.parent.mkdir(parents=True, exist_ok=True)
        image.save(output, "WEBP", quality=88, method=6)
    cleaning_log.append({"asset": output.name, "source": file["name"], "page": page_number, "excludedPromotionLines": len(excluded), "excludedBarcodes": len(page.get("barcodes", [])), "sourceHash": file["sha256"]})
    source = ref(file, page_number)
    asset = {"assetId": asset_id, "kind": "image", "url": "/cet6/solutions/" + output.name, "mimeType": "image/webp", "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "sourceRefs": [source]}
    asset_cache[key] = asset
    return asset

def evidence(solution, page_numbers, answer=""):
    assets = [page_asset(solution, n) for n in page_numbers]
    return {"answer": answer, "blocks": [{"type": "image", "assetId": a["assetId"], "alt": "原题答案与解析", "caption": "原解析第" + str(a["sourceRefs"][0]["locator"]["page"]) + "页"} for a in assets], "sourceRefs": [a["sourceRefs"][0] for a in assets]}, assets

def main():
    files = json.loads((CACHE / "inventory.json").read_text())
    solutions = [s for f in files if f["kind"] == "answer" if (s := read_solution(f))]
    term_frequency = collections.Counter(word for solution in solutions for word in tokens(" ".join(row["text"] for row in solution["rows"])))
    by_date = collections.defaultdict(list)
    for s in solutions: by_date[s["file"]["date"]].append(s)
    library_path = ROOT / "src/data/cet6/library.json"
    library = json.loads(library_path.read_text())
    matching_path = CACHE / "question-matching-text.json"
    matching = json.loads(matching_path.read_text()) if matching_path.exists() else {}
    only = set(filter(None, os.environ.get("CET6_ENTRY_IDS", "").split(",")))
    report_path = ROOT / "data/cet6-review/solution-mapping.json"
    report = [row for row in json.loads(report_path.read_text()) if row["id"] not in only] if only and report_path.exists() else []
    override_path = ROOT / "data/cet6-review/pair-overrides.json"
    overrides = json.loads(override_path.read_text()) if override_path.exists() else {}
    def prepare_entry(entry):
        if entry["section"] != "试卷" or (only and entry["id"] not in only): return
        set_path = ROOT / "public/cet6/papers" / (entry["id"] + ".json")
        if not set_path.exists(): return
        paper = json.loads(set_path.read_text())
        date = entry["id"].split("-")[-1][:6]
        date = date[:4] + "-" + date[4:]
        candidates = by_date[date]
        review = entry.setdefault("sourceReview", {})
        review["assets"] = []
        review["explanations"] = {}
        review["issues"] = [issue for issue in review.get("issues", []) if not issue.startswith("解析配对")]
        mappings = []
        if not candidates:
            report.append({"id": entry["id"], "status": "waiting_for_ocr"}); return
        for section in paper["sections"]:
            for group in section["groups"]:
                questions = group["questions"]
                if not questions: continue
                first = "写作" if questions[0]["type"] == "essay" else "翻译" if questions[0]["type"] == "translation" else questions[0]["displayNumber"]
                segment = first if isinstance(first, str) else "listening" if first <= 25 else "readingA" if first <= 35 else "readingB" if first <= 45 else "readingC"
                source_text = text_blocks(group["stimulusBlocks"]) + " " + " ".join(text_blocks(q["promptBlocks"]) + " " + " ".join(text_blocks(o["blocks"]) for o in q["options"]) for q in questions) + " " + " ".join(text_blocks(o["blocks"]) for o in group["sharedOptions"])
                if entry.get("sourceReview", {}).get("imagePaper"):
                    source_text = matching.get(entry["id"], {}).get(segment, source_text)
                source_text = focus_query(segment, source_text)
                embedded = review.get("embeddedExplanations", {}).get(segment)
                if embedded:
                    for question in questions: review["explanations"][str(first)] = embedded
                    mappings.append({"segment": segment, "source": embedded["sourceRefs"][0]["relativePath"].split("/")[-1], "pages": sorted(set(source["locator"]["page"] for source in embedded["sourceRefs"])), "overlap": 1, "secondScore": 0, "nominal": True, "method": "embedded-reference"})
                    continue
                ranked = []
                for solution in candidates:
                    for segment_rows in solution["chunks"].get(segment, []):
                        if not segment_rows: continue
                        overlap = match_score(source_text, " ".join(l["text"] for l in segment_rows))
                        nominal = bool(solution["file"].get("variant") == int(entry["id"][-1]) or re.search(r"第\s*" + entry["id"][-1] + r"\s*套", solution["file"]["name"]))
                        ranked.append((overlap, nominal, solution, segment_rows))
                override = overrides.get(entry["id"], {}).get(segment)
                if override:
                    ranked = [candidate for candidate in ranked if candidate[2]["file"]["name"] == override["source"]]
                    if not ranked: raise ValueError("Reviewed pair source missing: " + entry["id"] + " " + segment)
                if not ranked: continue
                ranked.sort(key=lambda value: (value[0], value[1]), reverse=True)
                score, nominal, selected, selected_rows = ranked[0]
                second = ranked[1][0] if len(ranked) > 1 else 0
                shared_words = tokens(source_text) & tokens(" ".join(row["text"] for row in selected_rows))
                distinctive = sorted(word for word in shared_words if len(word) >= 5 and term_frequency[word] <= 8)
                term_identity = len(distinctive) >= 3 and score > second * 1.5
                mappings.append({"segment": segment, "source": selected["file"]["name"], "pages": sorted(set(l["page"] for l in selected_rows)), "overlap": round(score, 3), "secondScore": round(second, 3), "nominal": nominal, "distinctiveTerms": distinctive, "identityMethod": "manual-source-comparison" if override else "distinctive-source-terms" if term_identity else "text-overlap", "reviewNote": override["reason"] if override else "", "topic": source_text[:200] if segment == "写作" else ""})
                if not override and ((score < .10 and not term_identity) or (score - second < .025 and not nominal)): review["issues"].append(f"解析配对需复核:{segment}")
                for question in questions:
                    number = "写作" if question["type"] == "essay" else "翻译" if question["type"] == "translation" else question["displayNumber"]
                    if isinstance(number, str):
                        page_numbers = sorted(set(l["page"] for l in selected_rows))
                        value, assets = evidence(selected, page_numbers)
                    else:
                        anchors = [a for a in selected["allAnchors"].get(number, []) if selected_rows[0]["index"] <= a["index"] <= selected_rows[-1]["index"]]
                        anchor = next((a for a in anchors if a["strong"]), anchors[0] if anchors else None)
                        answer = anchor["answer"] if anchor and anchor["strong"] and anchor["corroborated"] and nominal else ""
                        page_numbers = anchor["pages"] if anchor and anchor["strong"] and nominal else sorted(set(l["page"] for l in selected_rows))
                        if number <= 25 or number >= 46:
                            if answer not in "ABCD": answer = ""
                        value, assets = evidence(selected, page_numbers, answer)
                    review["explanations"][str(number)] = value
                    review["assets"].extend(assets)
        review["assets"] = list({asset["assetId"]: asset for asset in review["assets"]}.values())
        report.append({"id": entry["id"], "mappings": mappings, "explanations": len(review["explanations"]), "answers": sum(bool(v["answer"]) for v in review["explanations"].values())})
        print(entry["id"], report[-1]["explanations"], report[-1]["answers"], flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for _ in pool.map(prepare_entry, library["entries"]): pass
    report.sort(key=lambda value: value["id"])
    library_path.write_text(json.dumps(library, ensure_ascii=False, indent=2) + "\n")
    report_path = ROOT / "data/cet6-review/solution-mapping.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "data/cet6-review/asset-cleaning.json").write_text(json.dumps(cleaning_log, ensure_ascii=False, indent=2) + "\n")
    print("Complete solution sources:", len(solutions), "cleaned page assets:", len(asset_cache))

if __name__ == "__main__": main()
