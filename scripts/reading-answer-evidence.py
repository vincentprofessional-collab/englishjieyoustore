"""Extract answer candidates with their exact printed line and source coordinates."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import re


def normal(value):
    value = re.sub(r"[^A-Za-z0-9 /()&'-]", "", value).strip()
    value = re.sub(r"\bNOT\s*GIVEN\b", "NOT GIVEN", value, flags=re.I)
    binary = re.match(r"^(TRUE|FALSE|YES|NO|NOT GIVEN)\b", value, re.I)
    if binary:
        return binary[1].upper()
    if re.fullmatch(r"[A-Z]{2,3}", value) and len(set(value)) == 1:
        return value[0]
    return re.sub(r"\s+", " ", value)


def lines_for(data, geometry=False):
    if geometry:
        rows = []
        for column in [0, 1]:
            words = sorted([w for w in data['words'] if (w['x'] < data['width'] * data.get('splitRatio', .48)) == (column == 0)], key=lambda w: w['y'] + w['h'] / 2)
            current = []
            center = 0
            for word in words:
                y = word['y'] + word['h'] / 2
                if current and abs(y - center) > max(7, word['h'] * .6):
                    current.sort(key=lambda w:w['x'])
                    rows.append({'column':column,'y':min(w['y'] for w in current),'text':' '.join(w['text'] for w in current),'confidence':sum(w['confidence'] for w in current)/len(current)})
                    current = []
                current.append(word)
                center = sum(w['y'] + w['h']/2 for w in current)/len(current)
            if current:
                current.sort(key=lambda w:w['x'])
                rows.append({'column':column,'y':min(w['y'] for w in current),'text':' '.join(w['text'] for w in current),'confidence':sum(w['confidence'] for w in current)/len(current)})
        return rows
    groups = defaultdict(list)
    for word in data["words"]:
        column = word["line"][0]
        if column == 0 and word["x"] > data["width"] * data.get('splitRatio',.48):
            continue
        groups[tuple(word["line"])].append(word)
    result = []
    for key, words in groups.items():
        words.sort(key=lambda w: w["x"])
        result.append({"column": key[0], "y": min(w["y"] for w in words),
                       "text": " ".join(w["text"] for w in words),
                       "confidence": sum(w["confidence"] for w in words) / len(words)})
    return sorted(result, key=lambda line: (line["column"], line["y"]))


def parse_page(data, geometry=False):
    answers = {}
    pending = None
    evidence = []
    groups = []
    all_lines = lines_for(data, geometry)
    cutoff = min((line["y"] for line in all_lines if re.search(r"If\s+you\s+score", line["text"], re.I)), default=data["height"])

    def flush():
        nonlocal pending
        if pending is None:
            return
        text = " ".join(pending["values"])
        numbers = pending["numbers"]
        ordered = bool(re.search(r"IN\s*(?:ANY|EITHER)\s*ORDER", text, re.I))
        both = bool(re.search(r"BOTH\s*REQUIRED", text, re.I))
        cleaned = re.sub(r"IN\s*(?:ANY|EITHER)\s*ORDER|BOTH\s*REQUIRED|FOR\s*ONE\s*MARK", "", text, flags=re.I)
        cleaned = normal(cleaned)
        if cleaned:
            if ordered:
                values = [normal(v) for v in pending["values"] if not re.search(r"ORDER|REQUIRED|FOR ONE MARK", v, re.I)]
                values = [v for v in values if v]
                if len(values) == 1 and re.fullmatch(r"[A-Z](?:\s+[A-Z])+", values[0]):
                    values = values[0].split()
                answer = {"values": values, "mode": "all" if both and len(numbers) == 1 else "unordered"}
            else:
                answer = {"values": [cleaned], "mode": "any"}
            answer["evidence"] = pending["lines"]
            for number in numbers:
                answers[number] = answer
            if len(numbers) > 1:
                groups.append({"numbers": numbers, "values": answer["values"], "mode": answer["mode"]})
        evidence.append(pending)
        pending = None

    column = None
    for line in all_lines:
        value = line["text"].strip()
        if line["y"] >= cutoff:
            continue
        if column is not None and column != line["column"]:
            flush()
        column = line["column"]
        if re.search(r"Reading Passage|Questions?\s+\d+\s*[-–]|ACADEMIC|READING|Answer|CORRECT SPELLING|Each question", value, re.I):
            flush()
            continue
        value = re.sub(r'^[|:;*]+\s*', '', value)
        value = re.sub(r'^[Il](?=\d)', '1', value)
        value = re.sub(r'^[Il]\s+(?=[A-Za-z])', '1 ', value)
        match = re.match(r"^(\d{1,2})(?:\s*([&–—-])\s*(\d{1,2}))?[).,:=°;_]*\s*(?=[A-Za-z(/£~])(.+)$", value) or re.match(r"^(\d{1,2})(?:\s*([&–—-])\s*(\d{1,2}))?\s*[).,:=°;_]*\s+(.+)$", value)
        if match and 1 <= int(match[1]) <= 41:
            flush()
            first = int(match[1])
            second = int(match[3]) if match[3] else first
            numbers = list(range(first, second + 1)) if match[2] in {"-", "–", "—"} else list(dict.fromkeys([first, second]))
            pending = {"numbers": numbers, "values": [match[4]], "lines": [line]}
        elif pending and value and not re.search(r"you are|examination|recommend|institutions|scores acceptable", value, re.I):
            pending["values"].append(value)
            pending["lines"].append(line)
    flush()
    return answers, groups, all_lines


def legacy_map(test):
    result = {}
    for part in test["parts"]:
        for block in part["questionBlocks"]:
            if block["type"] == "headings":
                for number, answer in block.get("answers", {}).items():
                    result[int(number)] = answer
            else:
                for q in block["questions"]:
                    answer = q.get("answer")
                    if answer is None:
                        continue
                    if block["type"] == "fill":
                        result[q["number"]] = answer
                    else:
                        for number in q["questionNumbers"]:
                            result[number] = answer
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--legacy", required=True)
    args = parser.parse_args()
    root = Path(args.root)
    tests = json.loads((root / "reading-page-map.json").read_text())
    legacy = {t["id"]: legacy_map(t) for t in json.loads(Path(args.legacy).read_text())}
    reports = []
    for test in tests:
        page_no = test["answerPages"][0]
        data = json.loads((root / "key-columns-v2" / f"ci{test['book']}" / f"{page_no:03}.json").read_text())
        answers, groups, lines = parse_page(data)
        full_path = root / 'ocr' / f"ci{test['book']}" / f"{page_no:03}.json"
        full_data = json.loads(full_path.read_text())
        full_data['splitRatio'] = data['splitRatio']
        alternate, alternate_groups, _ = parse_page(full_data, geometry=True)
        conflicts = []
        for number, answer in alternate.items():
            if number not in answers:
                answers[number] = answer
            elif answers[number]['values'] != answer['values'] and normal(' '.join(answers[number]['values'])) != normal(' '.join(answer['values'])):
                conflicts.append({'number':number,'columns':answers[number]['values'],'full':answer['values']})
        expected = {q for part in test["parts"] for q in range(part["firstQuestion"], part["lastQuestion"] + 1)}
        missing = sorted(expected - answers.keys())
        suspicious = []
        for number, answer in answers.items():
            value = " ".join(answer["values"])
            if len(value) > 90 or len(value) == 0 or re.search(r"required|order|score|question|reading|marks|needed", value, re.I):
                suspicious.append(number)
        reports.append({"id": test["id"], "book": test["book"], "test": test["test"], "page": page_no,
                        "questionCount": len(expected), "answers": answers, "groups": groups,
                        "missing": missing, "suspicious": suspicious, "lines": lines,
                        "conflicts": conflicts,
                        "legacyCandidates": legacy.get(test["id"], {})})
    (root / "answer-evidence.json").write_text(json.dumps(reports, ensure_ascii=False, indent=2))
    print('TESTS',len(reports),'MISSING',sum(len(r['missing']) for r in reports),'SUSPICIOUS',sum(len(r['suspicious']) for r in reports))
    for row in reports:
        if row['missing'] or row['suspicious']:
            print(row['id'], 'missing',row['missing'],'review',row['suspicious'])


if __name__ == "__main__":
    main()
