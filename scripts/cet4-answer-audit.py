"""Extract explicit answer evidence; conflicts and omissions require review."""
import argparse
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--cache", type=Path, required=True)
parser.add_argument('--legacy-modern', action='store_true')
args = parser.parse_args()
inventory = json.loads((args.cache / ('legacy-modern-inventory.json' if args.legacy_modern else 'inventory.json')).read_text())


def compact(text):
    return re.sub(r"\s+", "", text).replace("（", "(").replace("）", ")")


def ordered_lines(doc):
    output = []
    for page in doc["pages"]:
        lines = [{**line, "page": page["number"]} for line in page["lines"] if line["y"] < .95]
        headings = [line['y'] for line in lines if re.search(r'答案详解|答案解析|^Questions?\s+\d|^Section\s*\[?[A-C]|^Part\s|^Passage\s+(One|Two)', line['text'], re.I)]
        boundaries = sorted(set([0, 1, *headings]))
        for start, end in zip(boundaries, boundaries[1:]):
            band = [line for line in lines if start - .0001 <= line['y'] < end - .0001]
            output.extend(sorted((line for line in band if line['x'] < .48), key=lambda line: line['y']))
            output.extend(sorted((line for line in band if line['x'] >= .48), key=lambda line: line['y']))
    return output


def extract(doc, reading_start=26, number_limit=55):
    # Margin OCR is an offline suggestion only. Source-specific decisions below
    # must approve an ambiguous numeral before it can affect a published key.
    lines = ordered_lines(doc)
    required_numbers = [*range(1, 26), *range(reading_start, number_limit + 1)]
    candidates = {number: [] for number in required_numbers}
    mode = "writing"
    anchors = []
    for i, line in enumerate(lines):
        text = line["text"]
        if re.search(r"Listening\s*Comprehension", text, re.I):
            mode = "listening"
        elif re.search(r"Reading\s*Comprehension", text, re.I) or text.strip().lower() == 'reading':
            mode = "reading"
        elif re.fullmatch(r"(?:Part\s*[IVXl1]+\s*)?Translation", text.strip(), re.I):
            mode = "translation"
        if mode not in ["listening", "reading"]:
            continue
        match = re.match(r"^\s*([0-9SIlO](?:\s*[0-9SIlO])?)\s*(?:[.．、:]|(?=\s*$))\s*(.*)", text)
        if match:
            normalized = re.sub(r"\s", "", match[1]).translate(str.maketrans({"S": "5", "I": "1", "l": "1", "O": "0"}))
            number = int(normalized)
            if (mode == "listening" and 1 <= number <= 25) or (mode == "reading" and reading_start <= number <= number_limit):
                anchors.append((i, number, line))

    for position, (start, number, anchor) in enumerate(anchors):
        end = anchors[position + 1][0] if position + 1 < len(anchors) else len(lines)
        block = lines[start:end]
        joined = "\n".join(line["text"] for line in block)
        found = []
        # A numbered line followed by "A) He ..." is option A, not an answer key.
        direct = re.match(r"^\s*\d{1,2}\s*[.．、:]\s*(?:【?答案】?[:：]?|答案为)?\s*([A-Z])(?:\s*[)）.．](?!\s*[A-Za-z])|(?=\s*\n|$))", joined)
        if not direct and reading_start <= number < reading_start + 10:
            direct = re.match(r'^\s*\d{1,2}\s*[.．、:]\s*([A-O0])(?:\s*[)）]\s*|\s+)(?=[A-Za-z])', joined)
        if direct:
            found.append(direct[1].replace('0', 'O'))
        flattened = re.sub(r'\s+', '', joined)
        for pattern in [
            r"(?:^|\n)\s*([A-Z])\s*[)）]?\s*[【\[]\s*(?:精析|解析|详解|语法|语义|词性|词义)",
            r"答案\s*(?:[为是:：])\s*([A-Z])(?:\s*[)）项。.]|\b)",
            r"(?:正确答案|故选|应选|本题选)\s*[为是:：]?\s*([A-Z])\s*[)）项。.]?",
            r"选项\s*([A-D])\s*是正确答案",
            r"([A-D])\s*项为正确答案",
            r"([A-D])\s*项(?:为|是)?正确答[案答]?",
            r"选\s*项\s*([A-D])\s*(?:为|是)?正确",
            r"正确答案\s*[为是:：]\s*([A-D])",

            r"([A-Z])[。．]\s*(?:由|该|本|题|此|空)",
            r"答案(?:解析|详解)[】）\]\s:：]*([A-Z])\s*[)）。．]",
            r"答案\s*([A-Z1])\s*[)）项。.]",
            r"答案\s*[力内內沩]\s*([A-Z])\s*[)）项。.]",
            r"(?:^|\n)\s*([A-Z])\s*[)）]?\s*[【（(]?\s*详解",
            r"故([A-D])正确",
            r"确定答案[^。]{0,8}([A-O])\s*[)）]?\s*[a-z]",
            r"(?:与|和)选项([A-D])(?:的)?(?:内容|表述|描述|意思|信息)?(?:完全|基本)?(?:吻合|一致|相符|符合)",
            r"([A-D])项[^。不未无错除]{0,40}(?:故|因此)为正确答案",
            r"选项([A-D])[^。不未无错除]{0,45}(?:一致|相符|符合)[^。不未无错除]{0,20}(?:为|是)正确答案",
            r"([A-D])为正确答案",
            r"(?:选项([A-D])|([A-D])(?:选)?项)[^。不未无错除否]{0,75}(?:故|因此|为)[^。不未无错除否]{0,8}(?:正确(?:答案|选项)?|答案)",
        ]:
            if not direct:
                for source_text in [joined, flattened]:
                    for match in re.finditer(pattern, source_text, re.M):
                        found.extend(value for value in match.groups() if value)
        if found:
            for letter in sorted(set("I" if letter == "1" and 36 <= number <= 45 else letter for letter in found)):
                if not re.fullmatch("[A-Z]", letter):
                    continue
                candidates[number].append({"answer": letter, "page": anchor["page"],
                                           "x": anchor["x"], "y": anchor["y"],
                                           "evidence": joined[:1400]})

    # Answer tables are independent evidence, retained alongside per-question markers.
    for page in doc["pages"]:
        text = "\n".join(line["text"] for line in page["lines"])
        summary = re.findall(r'^\s*(\d{1,2})\s*[.．、:：]\s*([A-P])\s*$', text, re.M)
        if len(summary) >= 15:
            for number, letter in summary:
                if int(number) in candidates:
                    candidates[int(number)].append({'answer': letter, 'page': page['number'], 'evidence': f'{number}. {letter}', 'method': 'printed-answer-table'})
        for match in re.finditer(r"(\d{1,2})\s*[~～—–－-]\s*(\d{1,2})\s*[:：.]?\s*([A-O](?:\s*[A-O]){1,9})", text):
            first, last = int(match[1]), int(match[2])
            letters = re.sub(r"\s", "", match[3])
            if 1 <= first <= last <= number_limit and len(letters) == last - first + 1:
                for number, letter in zip(range(first, last + 1), letters):
                    if number in candidates:
                        candidates[number].append({"answer": letter, "page": page["number"], "evidence": match[0]})

    keys, conflicts = {}, {}
    for number, evidence in candidates.items():
        letters = sorted(set(item["answer"] for item in evidence))
        if len(letters) == 1:
            keys[str(number)] = {"answer": letters[0], "evidence": evidence}
        elif len(letters) > 1:
            conflicts[str(number)] = evidence
    return {"keys": keys, "conflicts": conflicts, 'requiredNumbers': required_numbers, "missing": [n for n in required_numbers if str(n) not in keys]}


supplement = {}
legacy_inventory_path = args.cache / 'legacy-source-inventory.json'
if legacy_inventory_path.exists():
    legacy_inventory = json.loads(legacy_inventory_path.read_text())
    table_source = next((item for item in legacy_inventory if '听力答案速查' in item['source']), None)
    if table_source:
        native_path = args.cache / 'ocr' / f"{table_source['sha256']}.json"
        if native_path.exists():
            table = json.loads(native_path.read_text())
            table_text = '\n'.join(line['text'] for page in table['pages'] for line in page['lines'])
        else:
            table_text = json.loads((args.cache / 'text' / f"{table_source['sha256']}.json").read_text())['text']
        headers = list(re.finditer(r'(20\d{2})\s*年\s*(1[02]|0?[3679])\s*月[^\n]{0,30}第\s*([123])\s*套',table_text))
        for i, header in enumerate(headers):
            pid = f'cet4-paper-{header[1]}{int(header[2]):02d}{header[3]}'
            chunk = table_text[header.end():headers[i+1].start() if i+1<len(headers) else len(table_text)]
            values = {}
            for match in re.finditer(r'(\d{1,2})\s*[-~～–—]\s*(\d{1,2})\s*[:：]?\s*([A-D](?:\s*[A-D]){1,4})',chunk):
                first,last=int(match[1]),int(match[2]);letters=re.sub(r'\s','',match[3])
                if 1<=first<=last<=25 and len(letters)==last-first+1:
                    for number,letter in zip(range(first,last+1),letters):
                        values[str(number)]={'answer':letter,'evidence':[{'sourceHash':table_source['sha256'],'evidence':match[0]}]}
            for match in re.finditer(r'(?<!\d)(\d{1,2})\s*[.．]\s*([A-D])(?:\b|(?=\s|\d))',chunk):
                if 1<=int(match[1])<=25:
                    values[str(int(match[1]))]={'answer':match[2],'evidence':[{'sourceHash':table_source['sha256'],'evidence':match[0]}]}
            supplement[pid]=values
    (args.cache/'listening-answer-supplement.json').write_text(json.dumps(supplement,ensure_ascii=False,indent=2)+'\n')


def add_supplement(result):
    # The quick-reference table has several columns with different set orders.
    # Retain it as audit evidence; it cannot override or fill a book's key until
    # its page coordinates and set heading have been checked.
    result['missing']=[n for n in result['requiredNumbers'] if str(n)not in result['keys']]


report = []
decisions_path = Path('src/data/cet4/answer-review.json')
decisions = json.loads(decisions_path.read_text())['decisions'] if decisions_path.exists() else []


def apply_review(result):
    for decision in decisions:
        if decision['id'] != result['id']:
            continue
        if decision['sourceHash'] != result['sourceHash']:
            raise ValueError(f'Source changed since review: {result["id"]}')
        number = str(decision['questionNumber'])
        result['keys'][number] = {'answer': decision['answer'], 'evidence': [decision],
                                  'supersededCandidates': result['conflicts'].pop(number, [])}
    result['missing'] = [n for n in result['requiredNumbers'] if str(n) not in result['keys']]


for paper in inventory["papers"]:
    cache = args.cache / "ocr" / f"{paper['answerHash']}.json"
    if not cache.exists():
        continue
    doc = json.loads(cache.read_text())
    result = {"id": paper["id"], "sourceHash": doc["sha256"], **extract(doc, 36 if paper.get('answerNumberOffset') else 26, 65 if paper.get('answerNumberOffset') else 55)}
    add_supplement(result)
    apply_review(result)
    report.append(result)
    print(paper["id"], "keys", len(result["keys"]), "conflicts", list(result["conflicts"]), "missing", result["missing"])
path = args.cache / ('legacy-modern-answer-audit.json' if args.legacy_modern else 'answer-audit.json')
path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
selected_path=args.cache/'legacy-selected.json'
if selected_path.exists():
    legacy_report=[]
    for key,paper in json.loads(selected_path.read_text()).items():
        if int(key[:4])<2016:continue
        native_path=args.cache/'ocr'/f"{paper['answerSourceHash']}.json"
        if not native_path.exists():continue
        doc=json.loads(native_path.read_text())
        result={'id':f'cet4-paper-{key[:6]}{key[7]}','sourceHash':doc['sha256'],**extract(doc)}
        add_supplement(result);legacy_report.append(result)
    (args.cache/'legacy-answer-audit.json').write_text(json.dumps(legacy_report,ensure_ascii=False,indent=2)+'\n')
