"""Build auditable reading/listening page ranges without copying book front matter."""
import argparse
import json
import re
from pathlib import Path

PROMO = re.compile(r"公众号|淘宝|微信|微博|二维码|练习方式|www\.?\s*topsage\.?\s*com|ieltsbro|laokaoya|小站雅思|雅思哥", re.I)
INTRO = re.compile(r"should\s+spend\s+(?:about\s*:?\s*)?20\s+m\s*inutes\s+(?:on|en)\s+Questions?\s+(I|\d{1,2})\s*[-–—~ ]+\s*(\d{1,2})", re.I)
SCANNED_STARTS = {2: [14, 18, 22, 35, 39, 43, 59, 63, 67, 80, 84, 88],
                  3: [19, 24, 28, 43, 47, 52, 65, 69, 74, 89, 93, 97]}


def load_pages(root, book, override_root=None):
    native = json.loads(Path(book["cache"]).read_text())["pages"]
    result = {p["page"]: p["text"] for p in native}
    legacy = root / "legacy-cache" / f"ocr-book-{book['book']}.txt"
    if legacy.exists():
        chunks = re.split(r"=== OCR PAGE (\d+) ===", legacy.read_text())
        result = {int(chunks[i]): chunks[i + 1] for i in range(1, len(chunks) - 1, 2)}
        if max(result) != book["pages"]:
            raise ValueError(f"CI{book['book']}: legacy/source page counts disagree")
    for f in (root / "ocr" / f"ci{book['book']}").glob("[0-9]*.json"):
        page = json.loads(f.read_text())
        result[page["page"]] = page["text"]
    if override_root:
        for f in (Path(override_root)/'ocr'/f"ci{book['book']}").glob('[0-9]*.json'):
            page=json.loads(f.read_text());result[page['page']]=page['text']
    return result


def clean_corpus(value):
    lines = []
    for line in value.splitlines():
        if PROMO.search(line):
            continue
        # Remove page furniture, answer-location labels and speaker labels, not spoken content.
        if re.fullmatch(r"\s*(?:\d+|Test\s+\d+|(?:Audio|Tape)\s*scripts?|Reading|Listening)\s*[|]?\s*", line, re.I):
            continue
        line = re.sub(r"\bQ\s*\d{1,2}\b", " ", line)
        line = re.sub(r"^\s*[A-Z][A-Z .'-]{0,24}\s*:\s*", "", line)
        lines.append(line)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--output-root")
    parser.add_argument("--ocr-overrides")
    args = parser.parse_args()
    root = Path(args.root)
    output_root=Path(args.output_root) if args.output_root else root
    output_root.mkdir(parents=True,exist_ok=True)
    manifest = json.loads((root / "source-manifest.json").read_text())
    output = []
    corpora = []
    key_plan = {}
    issues = []
    for book in manifest["books"]:
        number = book["book"]
        pages = load_pages(root, book,args.ocr_overrides)
        starts = []
        for no, text in sorted(pages.items()):
            match = INTRO.search(text[:1900])
            if match:
                starts.append((no, 1 if match[1].upper() == "I" else int(match[1]), int(match[2])))
        starts = starts[:12]
        if number in SCANNED_STARTS:
            starts = []
            for index, no in enumerate(SCANNED_STARTS[number]):
                match = re.search(r"Questions?\s+(I|\d{1,2})\s*[-–—~]+\s*(\d{1,2})", pages[no][:450], re.I)
                first = (1 if match[1].upper() == "I" else int(match[1])) if match else (1 if index % 3 == 0 else starts[-1][2] + 1)
                final = int(match[2]) if match else (40 if index % 3 == 2 else 27)
                starts.append((no, first, final))
        if len(starts) != 12:
            issues.append(f"CI{number}: expected 12 passage starts, found {len(starts)}")
            continue
        # Every source must contain four complete and ordered groups, including CI1's historic ranges.
        if any(starts[i][1] != 1 for i in [0, 3, 6, 9]):
            issues.append(f"CI{number}: test boundaries require review")
            continue
        # A scan may read 28 as 18. The next passage's printed first number provides
        # an independent, exact boundary and prevents duplicate or omitted answers.
        for i in range(len(starts)):
            no,first,final=starts[i]
            if i % 3 < 2:
                final=starts[i+1][1]-1
            starts[i]=(no,first,final)
        if any(sum(starts[i+j][2]-starts[i+j][1]+1 for j in range(3)) != (40 if number>1 else [40,41,38,39][i//3]) for i in [0,3,6,9]):
            issues.append(f"CI{number}: complete question ranges require review")
            continue
        last = starts[-1][0]
        key_candidates = []
        for no, text in sorted(pages.items()):
            if no <= last + 3:
                continue
            if re.search(r"^\s*(?:ACADEMIC\s+)?R\s*E\s*A\s*D\s*I\s*N\s*G\s*[:|]?\s*$", text, re.I | re.M):
                if re.search(r"answer\s*k[eov]+ys?|correctly\s+answered|If\s+you\s+score", text, re.I):
                    key_candidates.append(no)
        if number == 5:
            key_candidates = [154, 156, 158, 160]
        key_plan[str(number)] = ([p + delta for p in key_candidates[:4] for delta in range(3)]
                                 if number == 1 else key_candidates[:4])
        # Locate the four transcript starts after the complete test papers, before answer keys.
        key_start = min(key_candidates) if key_candidates else book["pages"]
        scripts = []
        script_start = None
        for no, text in sorted(pages.items()):
            if no <= last + 3 or no >= key_start:
                continue
            if re.search(r"(?:tape|audio)\s*scripts?", text[:600], re.I):
                if script_start is None:
                    script_start = no
            if script_start and re.search(r"\b(?:SECTION|PART)\s*[I1]\b", text, re.I):
                if re.search(r"\bTEST\s*(?:[1-8]|[Iil])\b", text, re.I):
                    scripts.append(no)
        scripts = scripts[:4]
        if not script_start:
            issues.append(f"CI{number}: transcript start requires review")
        for test in range(1, 5):
            parts = []
            for part in range(1, 4):
                index = (test - 1) * 3 + part - 1
                no, first, final = starts[index]
                next_start = starts[index + 1][0] if index + 1 < len(starts) else no + 6
                end = next_start - 1
                for boundary in range(no + 1, next_start):
                    if re.search(r"WRITING\s+TASK\s*[I1]|spend\s+(?:about\s+)?20\s+m\s*inutes\s+on\s+this\s+task", pages.get(boundary, ""), re.I):
                        end = boundary - 1
                        break
                if part < 3:
                    end = next_start - 1
                selected = list(range(no, end + 1))
                parts.append({"number": part, "firstQuestion": first, "lastQuestion": final,
                              "pages": selected, "text": clean_corpus("\n".join(pages.get(p, "") for p in selected))})
            reading = {"id": f"cambridge-{number}-test-{test}", "book": number, "test": test,
                       "source": book["source"], "sourceSha256": book["sha256"], "parts": parts,
                       "answerPages": ([key_candidates[test - 1] + delta for delta in range(3)]
                                       if number == 1 else key_candidates[test - 1:test])}
            output.append(reading)
            corpora.append({"id": reading["id"], "skill": "reading", "book": number, "test": test,
                            "pages": [p for part in parts for p in part["pages"]],
                            "text": "\n".join(part["text"] for part in parts)})
            # Test question pages start at SECTION/PART 1 directly before that test's reading.
            reading_start = starts[(test - 1) * 3][0]
            question_start = None
            for no in range(max(1, reading_start - 12), reading_start):
                text = pages.get(no, "")
                if re.search(r"(?:S?ECTION|P\s*A\s*R\s*T)\s*[I1]\b", text[:2000], re.I) and re.search(r"Questions?\s*(?:[I1]\s*[-–—]|[I1]\s+and)", text[:2200], re.I):
                    question_start = no
            listening_pages = list(range(question_start, reading_start)) if question_start else []
            corpora.append({"id": reading["id"], "skill": "listening", "book": number, "test": test,
                            "pages": listening_pages, "text": clean_corpus("\n".join(pages.get(p, "") for p in listening_pages))})
        if script_start:
            end = key_start - 1
            for no in range(script_start + 1, key_start):
                if re.search(r"answer\s*keys?", pages.get(no, "")[:450], re.I):
                    end = no - 1
                    break
            selected = list(range(script_start, end + 1))
            corpora.append({"id": f"cambridge-{number}-audioscripts", "skill": "listening", "book": number,
                            "test": 0, "pages": selected, "text": clean_corpus("\n".join(pages[p] for p in selected))})
        print(f"CI{number}: 4 tests, answer pages {key_candidates[:4]}, scripts {scripts}", flush=True)
    for name, data in [("reading-page-map.json", output), ("corpus.json", corpora),
                       ("key-page-plan.json", key_plan), ("source-map-issues.json", issues)]:
        (output_root / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"CHECKPOINT: {len(output)} reading tests, {len(corpora)} corpus records, {len(issues)} issues")


if __name__ == "__main__":
    main()
