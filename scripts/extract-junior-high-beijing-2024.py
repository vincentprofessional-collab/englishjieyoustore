import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ORIGINAL = Path(sys.argv[1])
ANALYSIS = Path(sys.argv[2])
OUTPUT = Path(sys.argv[3])
ASSET_DIR = Path(sys.argv[4]) if len(sys.argv) > 4 else None

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def paragraphs(path: Path):
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    return [
        "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()
        for paragraph in root.findall(".//w:p", NS)
        if "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()
    ]


def extract_assets(path: Path, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    asset_names = {
        "image2.png": "bean-taco.png",
        "image3.png": "arlen-gun.png",
        "image4.png": "edward-xlibri.png",
        "image5.png": "gardening.png",
        "image6.png": "japanese-paper.png",
        "image7.png": "exoskeleton.png",
        "image8.png": "happy-reading-day.png",
    }
    with zipfile.ZipFile(path) as archive:
        for source_name, target_name in asset_names.items():
            source_path = f"word/media/{source_name}"
            target_path = output_dir / target_name
            target_path.write_bytes(archive.read(source_path))


def options(lines):
    text = " ".join(lines)
    matches = list(re.finditer(r"([A-D])[．.]", text))
    result = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        result.append(f"{match.group(1)}．{text[match.end():end].strip()}")
    return result


def question_number(text):
    match = re.match(r"^(\d+)．", text)
    return int(match.group(1)) if match else None


def context_between(lines, start, end):
    start_index = next(index for index, line in enumerate(lines) if start in line)
    end_index = next(index for index in range(start_index + 1, len(lines)) if end in lines[index])
    return "\n".join(lines[start_index:end_index]).strip()


def extract_questions(lines):
    starts = [(index, question_number(line)) for index, line in enumerate(lines)]
    starts = [(index, number) for index, number in starts if number is not None and 1 <= number <= 37]
    last_question = next(index for index, (_, number) in enumerate(starts) if number == 37)
    starts = starts[: last_question + 1]
    answer_map = {
        1: "C", 2: "D", 3: "D", 4: "D", 5: "D", 6: "B", 7: "B", 8: "C", 9: "B", 10: "D", 11: "A", 12: "D",
        13: "C", 14: "B", 15: "A", 16: "B", 17: "D", 18: "C", 19: "A", 20: "C",
        21: "C", 22: "A", 23: "A", 24: "C", 25: "D", 26: "A", 27: "C", 28: "C", 29: "A",
        30: "A", 31: "D", 32: "D", 33: "B",
        34: "It is the protective or supporting structure covering the outside of the body.",
        35: "She went hiking.",
        36: "Because they need to be charged regularly.",
        37: "Open response. The reference answer supports using an exoskeleton for tiring or dangerous work and for people with movement-related injuries or illnesses.",
    }
    contexts = {
        "cloze": context_between(lines, "“Mama,", "13．"),
        "reading-a": context_between(lines, "Arlen’s Gun", "21．"),
        "reading-b": context_between(lines, "Working in Hoh Xil", "24．"),
        "reading-c": context_between(lines, "While the pandemic", "27．"),
        "reading-d": context_between(lines, "Nowadays our life", "30．"),
        "reading-response": context_between(lines, "When you talk about", "34．"),
    }
    questions = []
    for position, (start, number) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        segment = lines[start:end]
        option_lines = [line for line in segment if re.search(r"[A-D][．.]", line)]
        option_index = next((index for index, line in enumerate(segment) if re.search(r"[A-D][．.]", line)), len(segment))
        prompt_lines = [line for line in segment[:option_index] if not line.startswith("【")]
        if 13 <= number <= 20:
            prompt_lines = []
        if number >= 34:
            prompt_lines = [line for line in prompt_lines if not line.startswith("五、")]
        if not prompt_lines and segment and not 13 <= number <= 20:
            prompt_lines = [segment[0]]
        prompt = "\n".join(prompt_lines).strip()
        if number <= 12:
            question_type = "grammar"
            context = ""
        elif number <= 20:
            question_type = "cloze"
            context = contexts["cloze"]
        elif number <= 33:
            question_type = "reading"
            context = contexts[{21: "reading-a", 24: "reading-b", 27: "reading-c", 30: "reading-d"}.get(number - (number % 3), "reading-a")]
        else:
            question_type = "reading-response"
            context = contexts["reading-response"]
        if 21 <= number <= 23:
            context = contexts["reading-a"]
        elif 24 <= number <= 26:
            context = contexts["reading-b"]
        elif 27 <= number <= 29:
            context = contexts["reading-c"]
        elif 30 <= number <= 33:
            context = contexts["reading-d"]
        questions.append({
            "id": f"beijing-2024-simulation-{number}",
            "number": number,
            "type": question_type,
            "prompt": prompt,
            "context": context,
            "options": [] if number >= 34 else options(option_lines),
            "answer": answer_map[number],
        })
    return questions


def extract_analysis(lines):
    pattern = re.compile(r"^(\d+)．(句意|细节理解题|推理判断题|最佳标题题|根据原文|本题为主观题)")
    result = {}
    current = None
    for line in lines:
        match = pattern.match(line)
        if match:
            current = int(match.group(1))
            result[current] = [line]
        elif current is not None and not line.startswith("【"):
            result[current].append(line)
    return {number: "\n".join(parts).strip()[:700] for number, parts in result.items()}


original_lines = paragraphs(ORIGINAL)
questions = extract_questions(original_lines)
analysis_by_question = extract_analysis(paragraphs(ANALYSIS))
for question in questions:
    question["analysis"] = analysis_by_question.get(question["number"], "解析内容见对应解析版文件。")
output = {
    "year": 2024,
    "region": "北京",
    "label": "北京模拟卷",
    "durationMinutes": 90,
    "fileName": ORIGINAL.name,
    "analysisFileName": ANALYSIS.name,
    "sourceDirectory": str(ORIGINAL.parent),
    "questions": questions,
    "readingA": {
        "instructions": "(一) 阅读下列课程介绍, 请根据人物喜好和需求匹配最适合的课程, 并将课程所对应的A、B、C、D选项填在相应位置上。选项中有一项为多余选项。",
        "books": [
            {
                "letter": "A",
                "title": "Arlen’s Gun",
                "author": "Edgar Doleman",
                "site": "www.authorhouse.com",
                "format": "Hardback | Paperback | E-book",
                "price": "$34.99 | $20.99 | $5.99",
                "description": "A young airman, soldier on an AC-47 gunship, lands in a country. Overcoming difficulties together with his rescuer(营救者) through many battles that follow, he discovers true brotherhood and inner courage.",
                "image": "/junior-high/beijing-2024/arlen-gun.png",
            },
            {
                "letter": "B",
                "title": "Edward’s Xlibris Best",
                "author": "Edward R. Levenson, Editor",
                "site": "www.xlibris.com",
                "format": "Hardback | Paperback | E-book",
                "price": "$28.99 | $16.99 | $3.99",
                "description": "This book includes 58 of Edward Levenson’s favorite pieces from among his seven previous Xlibris books. They cover the styles of “Humor”, “Word Play”, “Poetry”, “Stories”, “Memoirs”, “Translation” and “Reviews”.",
                "image": "/junior-high/beijing-2024/edward-xlibri.png",
            },
            {
                "letter": "C",
                "title": "Gardening: A Growing Addiction",
                "author": "Jo Ann Wiblin",
                "site": "www.iuniverse.com",
                "format": "Paperback | E-book",
                "price": "$17.99 | $3.99",
                "description": "Jo Ann Wiblin, Master Gardener, shares wisdom(智慧) and interesting personal stories in this collection of writings. Gardening can be funny and you will learn a lot in this book.",
                "image": "/junior-high/beijing-2024/gardening.png",
            },
            {
                "letter": "D",
                "title": "Using Japanese Paper for Digital Printing of Photographs",
                "author": "Carl-Evert Jonsson",
                "site": "www.authorhouse.co.uk",
                "format": "Paperback | E-book",
                "price": "$17.22 | $4.99",
                "description": "Find out how to use a method that will give new life to photos with the suggestions in Using Japanese Paper for Digital Printing of Photographs.",
                "image": "/junior-high/beijing-2024/japanese-paper.png",
            },
        ],
    },
    "writing": {
        "title": "五、文段表达",
        "promptA": "回首抗击新冠疫情的这三年，每个人都在自己的岗位发光发热。每个人的心中都有一位“英雄”。请你结合自身经历，根据下表谈谈疫情防控期间你的所见所闻，所思所感。",
        "tableA": [
            ["What you did", "stayed at home, wore masks, volunteered to do... , had online class..."],
            ["What you saw", "environment around you..."],
            ["Your hero and why", "doctors/nurses/teachers/police..."],
            ["Your feeling", "..."],
        ],
        "openingA": "The unforgettable three years\nHow time flies! The COVID-19 attacked people three years ago.",
        "requirementsA": "短文应包括提示中所有的写作要点，条理清楚，行文连贯，可适当发挥；不得出现真实人名和地名；词数80—120，短文开头已给出，不计入总词数。",
        "promptB": "假定你是李华，四月你校组织了以“快乐阅读”为主题的读书节。请你结合以下图示用英语给笔友Peter写一封信。词数80左右。",
        "requirementsB": "必须包含所有提示信息，可适当发挥；请勿在文中使用真实姓名和校名；开头和结尾已给出，不计入总词数。",
        "contentPointsB": "1. 介绍本次读书节；\n2. 谈谈自己接下来的暑假阅读计划（至少两点）。",
        "openingB": "Dear Peter,\nHow is everything going?",
        "closingB": "Yours,\nLi Hua",
        "diagram": "/junior-high/beijing-2024/happy-reading-day.png",
    },
    "assets": {
        "beanTaco": "/junior-high/beijing-2024/bean-taco.png",
        "bookCovers": {
            "arlenGun": "/junior-high/beijing-2024/arlen-gun.png",
            "edwardXlibris": "/junior-high/beijing-2024/edward-xlibri.png",
            "gardening": "/junior-high/beijing-2024/gardening.png",
            "japanesePaper": "/junior-high/beijing-2024/japanese-paper.png",
        },
        "exoskeleton": "/junior-high/beijing-2024/exoskeleton.png",
        "happyReadingDay": "/junior-high/beijing-2024/happy-reading-day.png",
    },
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
if ASSET_DIR:
    extract_assets(ORIGINAL, ASSET_DIR)
print(f"wrote {len(questions)} questions to {OUTPUT}")
