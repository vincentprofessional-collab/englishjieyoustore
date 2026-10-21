"""Use cleaned source regions when a PDF text layer cannot reproduce the paper."""
import importlib.util
import concurrent.futures
import json
import os
import re
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location("cet6_evidence", Path(__file__).with_name("cet6-solution-evidence.py"))
evidence = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evidence)
CACHE = evidence.CACHE
ROOT = Path.cwd()

files = json.loads((CACHE / "inventory.json").read_text())
selection = {e["id"]: e for e in [json.loads(line) for line in (CACHE / "selection.jsonl").read_text().splitlines()]}
library_path = ROOT / "src/data/cet6/library.json"
library = json.loads(library_path.read_text())
FILTER = set(filter(None, os.environ.get("CET6_ENTRY_IDS", "").split(",")))
matching_cache = CACHE / "question-matching-text.json"
matching_text = json.loads(matching_cache.read_text()) if FILTER and matching_cache.exists() else {}
def prepare_entry(entry):
    if entry["section"] != "试卷" or (FILTER and entry["id"] not in FILTER): return
    selected = selection.get(entry["id"])
    if not selected: return
    source = next((f for f in files if f["kind"] == "question" and f["date"].replace("-", "") == entry["id"][-7:-1] and (f.get("variant") == int(entry["id"][-1]) or re.search(r"第\s*"+entry["id"][-1]+r"\s*套", f["name"]))), None)
    if not source: return
    target = Path(source["cache"].replace(".norm.txt", ".ocr.zh.json"))
    if not target.exists(): return
    pages = json.loads(target.read_text())
    if len(pages) < Path(source["cache"]).read_text().count("\f"): return
    container = {"file": source, "pages": pages}
    views = {}
    assets = []
    active = None
    reading = False
    reading_index = -1
    letters = []
    match_lines = {}
    for page in pages:
        start = 0
        for line in sorted(page["lines"], key=lambda row: (row["y"], row["x"])):
            text = evidence.normalize(line["text"])
            if evidence.AD.search(text): continue
            following = active
            if len(text) < 130:
                heading = evidence.part_heading(text)
                if heading == "writing": following = "写作"; reading = False
                elif heading == "listening": following = "listening"; reading = False
                elif heading == "reading": following = "readingA"; reading = True; reading_index = -1
                elif heading == "translation": following = "翻译"; reading = False
                if evidence.section_heading(text) and reading:
                    reading_index = evidence.section_label(text, reading_index)
                    following = "reading" + "ABC"[min(reading_index, 2)]
                if re.match(r"^(?:参考范文|参考译文|参考答案)\s*[:：]?$", text) and active in ["写作", "翻译"]:
                    following = "reference:" + active
            if following != active:
                end = min(1, line["y"] - .004)
                if active and end - start > .025:
                    asset = evidence.page_asset(container, page["page"], (0, start, 1, end)); assets.append(asset)
                    views.setdefault(active, []).append({"type": "image", "assetId": asset["assetId"], "alt": "六级原题", "caption": ""})
                active = following
                start = max(0, line["y"] - .004)
            if active == "readingB":
                match = re.match(r"^\s*(?:\[([A-Z])\]|([A-Z])\s*[)）.、])", text)
                if match: letters.append(match[1] or match[2])
            if active: match_lines.setdefault(active, []).append(text)
        if active and 1 - start > .025:
            asset = evidence.page_asset(container, page["page"], (0, start, 1, 1)); assets.append(asset)
            views.setdefault(active, []).append({"type": "image", "assetId": asset["assetId"], "alt": "六级原题", "caption": ""})
    review = entry.setdefault("sourceReview", {})
    if "写作" not in views or "翻译" not in views: return
    last = max(letters) if letters else ""
    review["paragraphLabels"] = "".join(chr(i) for i in range(ord("A"), ord(last) + 1)) if last else ""
    review["imagePaper"] = True
    review["sourceImages"] = {kind: blocks for kind, blocks in views.items() if not kind.startswith("reference:")}
    asset_map = {asset["assetId"]: asset for asset in assets}
    review["embeddedExplanations"] = {}
    for kind in ["写作", "翻译"]:
        blocks = views.get("reference:" + kind, [])
        if blocks:
            refs = [source for block in blocks for source in asset_map[block["assetId"]]["sourceRefs"]]
            review["embeddedExplanations"][kind] = {"answer": "", "blocks": [{**block, "alt": "原参考范文与译文", "caption": "原解析第" + str(asset_map[block["assetId"]]["sourceRefs"][0]["locator"]["page"]) + "页"} for block in blocks], "sourceRefs": refs}
    listening_text = "\n".join(match_lines.get("listening", []))
    review["hasListeningQuestions"] = bool(re.search(r"Questions?\s*[1-8]\s*(?:to|[-—–])\s*[2-8]", listening_text, re.I))
    review["questionAssets"] = list({a["assetId"]: a for a in assets}.values())
    matching_text[entry["id"]] = {key: "\n".join(lines) for key, lines in match_lines.items()}
    print(entry["id"], list(views), review["paragraphLabels"], flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for _ in pool.map(prepare_entry, library["entries"]): pass
# This omission is explicit in the original paper; option order is stated to be identical.
entry_map = {entry["id"]: entry for entry in library["entries"]}
for entry in library["entries"]:
    if FILTER and entry["id"] not in FILTER: continue
    review = entry.get("sourceReview", {})
    query = matching_text.get(entry["id"], {}).get("readingA", "")
    identical = re.search(r"与\s*第\s*([123])\s*套内容完全一样", query)
    if not identical or "顺序不同" in query: continue
    target_id = entry["id"][:-1] + identical[1]
    target = entry_map[target_id]["sourceReview"]
    referenced = {block["assetId"] for block in target["sourceImages"]["readingA"]}
    review["sourceImages"]["readingA"] += target["sourceImages"]["readingA"]
    review["questionAssets"] = list({asset["assetId"]: asset for asset in [*review["questionAssets"], *[asset for asset in target["questionAssets"] if asset["assetId"] in referenced]]}.values())
    review["sharedSection"] = {"section": "readingA", "from": target_id, "reason": "原卷注明本套阅读词汇理解与第2套内容完全一样，未重复列出。"}
    matching_text[entry["id"]]["readingA"] += "\n" + matching_text[target_id]["readingA"]
    print("SOURCE-STATED SHARED SECTION", entry["id"], target_id, flush=True)
library_path.write_text(json.dumps(library, ensure_ascii=False, indent=2) + "\n")
(CACHE / "question-matching-text.json").write_text(json.dumps(matching_text, ensure_ascii=False) + "\n")
(ROOT / "data/cet6-review/question-asset-cleaning.json").write_text(json.dumps(evidence.cleaning_log, ensure_ascii=False, indent=2) + "\n")
