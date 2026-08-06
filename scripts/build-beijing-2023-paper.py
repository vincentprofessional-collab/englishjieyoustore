from __future__ import annotations

import json
import re
import shutil
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path("/Users/shidianjin/Downloads/考试-中考/2023年中考英语试卷 121份")
SOURCE_DIR = next(ROOT.glob("*北京市中考英语真题"))
ORIGINAL = next(SOURCE_DIR.glob("*（原卷版）.docx"))
ANALYSIS = next(SOURCE_DIR.glob("*（解析版）.docx"))
OUTPUT = Path("/Users/shidianjin/ielts-platform/src/lib/junior-high/beijing-2023.json")
ASSET_DIR = Path("/Users/shidianjin/ielts-platform/public/junior-high/beijing-2023")

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    result = []
    for paragraph in root.findall(".//w:body/w:p", NS):
        value = "".join(text.text or "" for text in paragraph.findall(".//w:t", NS)).strip()
        if value:
            result.append(value)
    return result


original_lines = paragraphs(ORIGINAL)
analysis_lines = paragraphs(ANALYSIS)


def between(lines: list[str], start: str, end: str) -> str:
    start_index = next(index for index, line in enumerate(lines) if line.startswith(start))
    end_index = next(index for index in range(start_index + 1, len(lines)) if lines[index].startswith(end))
    return "\n".join(lines[start_index:end_index]).strip()


def analysis_for(number: int) -> str:
    marker = f"【{number}题详解】"
    try:
        start = next(index for index, line in enumerate(analysis_lines) if line == marker)
    except StopIteration:
        answer = {1: "B", 2: "C", 3: "A", 4: "B", 5: "A", 6: "D", 7: "C", 8: "B", 9: "C", 10: "D", 11: "A", 12: "B"}.get(number, "")
        return f"本题解析见对应解析版文件。正确选项为 {answer}。"
    end = len(analysis_lines)
    for index in range(start + 1, len(analysis_lines)):
        if re.match(r"^【\d+题详解】$", analysis_lines[index]) or re.match(r"^[一二三四五六七八九十]+、", analysis_lines[index]):
            end = index
            break
    return "\n".join(analysis_lines[start + 1:end]).strip() or "解析内容见对应解析版文件。"


def question(number: int, kind: str, prompt: str, options: list[str], answer: str, context: str = "", image: str | None = None) -> dict:
    return {
        "id": f"beijing-2023-real-{number}",
        "number": number,
        "type": kind,
        "prompt": prompt,
        "context": context,
        "options": options,
        **({"image": image} if image else {}),
        "answer": answer,
        "analysis": analysis_for(number),
    }


grammar = [
    ("1. My sister enjoys singing and ________ favorite subject is music.", ["A. his", "B. her", "C. your", "D. their"], "B"),
    ("2. It’s a good idea to visit Beijing ________ October.", ["A. at", "B. on", "C. in", "D. to"], "C"),
    ("3. —Must I stay here and wait for you?\n—No, you ________. You can go home now.", ["A. needn’t", "B. can’t", "C. mustn’t", "D. shouldn’t"], "A"),
    ("4. —Which do you like ________, swimming or skating?\n—Swimming.", ["A. well", "B. better", "C. best", "D. the best"], "B"),
    ("5. —________ do you tidy your own room?\n—Twice a week.", ["A. How often", "B. How soon", "C. How much", "D. How long"], "A"),
    ("6. It was difficult to climb the mountain, ________ Sam got to the top at last.", ["A. or", "B. so", "C. for", "D. but"], "D"),
    ("7. —Lucy, what are you doing?\n—I ________ a model ship.", ["A. make", "B. made", "C. am making", "D. was making"], "C"),
    ("8. The Shenzhou-15 astronauts ________ to Earth safely on June 4, 2023.", ["A. return", "B. returned", "C. will return", "D. have returned"], "B"),
    ("9. If you go to the concert with us tomorrow, you ________ a great time there.", ["A. have", "B. had", "C. will have", "D. have had"], "C"),
    ("10. Eric ________ many things since he became interested in science.", ["A. is learning", "B. was learning", "C. will learn", "D. has learned"], "D"),
    ("11. The park is getting more and more beautiful because more kinds of flowers ________ every year.", ["A. are planted", "B. were planted", "C. plant", "D. planted"], "A"),
    ("12. —Lily, can you tell me ________ during the Dragon Boat Festival this year?\n—Sure. We ate zongzi and watched a dragon boat race.", ["A. what you will do", "B. what you did", "C. what will you do", "D. what did you do"], "B"),
]

cloze = between(original_lines, "Be What’s Missing", "13. A.")
cloze_options = [
    ["A. restaurant", "B. street", "C. school", "D. office"],
    ["A. agreed", "B. finished", "C. waited", "D. left"],
    ["A. trust", "B. love", "C. patience", "D. confidence"],
    ["A. hope", "B. advice", "C. money", "D. service"],
    ["A. nervously", "B. carefully", "C. coldly", "D. kindly"],
    ["A. disappoint", "B. hurt", "C. trouble", "D. surprise"],
    ["A. nicer", "B. cooler", "C. closer", "D. fairer"],
    ["A. said", "B. worked", "C. read", "D. ended"],
]

reading_b = between(original_lines, "Betty was excited to show her brother David the basket filled with seashells.", "24. What did Betty")
reading_c = between(original_lines, "Do you know that over 1/3 of all food produced in the world goes to waste?", "27. According to the passage")
reading_d = between(original_lines, "When considering the kind of experience that makes life better,", "30. You will most probably")
reading_response = between(original_lines, "My 100 Days Without a Mobile Phone", "34. What made the writer")

questions = [question(number, "grammar", prompt, options, answer) for number, (prompt, options, answer) in enumerate(grammar, 1)]
questions.extend(
    question(number, "cloze", "", options, answer, cloze)
    for number, options, answer in zip(range(13, 21), cloze_options, list("ACBDCDAB"))
)
questions.extend([
    question(21, "reading", "21. ________ I’m interested in designing clothes and want to study it at college.", ["A. Wild Art", "B. Art Matters", "C. Creative Art", "D. Art Magic"], "B", "", "/junior-high/beijing-2023/alice.png"),
    question(22, "reading", "22. ________ I enjoy making wall posters of animals and I’d like to read picture books.", ["A. Wild Art", "B. Art Matters", "C. Creative Art", "D. Art Magic"], "A", "", "/junior-high/beijing-2023/tony.png"),
    question(23, "reading", "23. ________ I like making bags and want to visit art museums to get creative ideas.", ["A. Wild Art", "B. Art Matters", "C. Creative Art", "D. Art Magic"], "C", "", "/junior-high/beijing-2023/harry.png"),
    question(24, "reading", "24. What did Betty think of the seashells?", ["A. Clean.", "B. Useless.", "C. Expensive.", "D. Special."], "D", reading_b),
    question(25, "reading", "25. Betty began to cry when ________.", ["A. she slipped and hurt herself", "B. she knocked over the basket", "C. she saw the broken seashells", "D. she told her dad about the accident"], "C", reading_b),
    question(26, "reading", "26. David glued the seashells to the frame to ________.", ["A. make it up to his sister", "B. develop his painting skill", "C. prepare a gift for his dad", "D. make the picture beautiful"], "A", reading_b),
    question(27, "reading", "27. According to the passage, what is a possible result of food waste?", ["A. The problem of worldwide hunger.", "B. A big increase in food production.", "C. The speed-up of climate change.", "D. A sudden drop in population."], "C", reading_c),
    question(28, "reading", "28. What can we learn from the passage?", ["A. Food recycling has been hugely successful.", "B. Buyers should give up non-top quality food.", "C. Stores should train people to make delicious dishes.", "D. Meal plans in the family are hard to put into practice."], "D", reading_c),
    question(29, "reading", "29. What is the passage mainly about?", ["A. Benefits of reducing food waste.", "B. Solutions to the food waste problem.", "C. The importance of fighting food waste.", "D. The attitude to the food waste problem."], "B", reading_c),
    question(30, "reading", "30. You will most probably experience enjoyment when you ________.", ["A. buy expensive shoes", "B. order a delicious meal", "C. talk with friends for new ideas", "D. sit quietly in front of a television"], "C", reading_d),
    question(31, "reading", "31. What do you know about pleasure and enjoyment from the passage?", ["A. Enjoyment grows out of pleasure.", "B. Pleasure and enjoyment come hand in hand.", "C. Pleasurable experiences are part of enjoyable ones.", "D. Some experiences provide both pleasure and enjoyment."], "D", reading_d),
    question(32, "reading", "32. The words “psychic energy” in Paragraph 4 are closest in meaning to ________.", ["A. attention", "B. interest", "C. ability", "D. knowledge"], "A", reading_d),
    question(33, "reading", "33. The writer probably agrees that ________.", ["A. feeling pleasure stops people from achieving growth", "B. feeling enjoyment comes with achieving growth", "C. a worthy life depends on luck and environment", "D. pleasure is the key to a happy and worthy life"], "B", reading_d),
    question(34, "reading-response", "34. What made the writer check the phone more often than before?", [], "The fear of missing out something important.", reading_response),
    question(35, "reading-response", "35. When did the writer start noticing his changes?", [], "After three weeks.", reading_response),
    question(36, "reading-response", "36. What does the writer plan to do with his phone after the experiment?", [], "Stay away from the phone for as long as possible.", reading_response),
    question(37, "reading-response", "37. Would you like to follow the writer’s example? Why or why not? (Please give two reasons.)", [], "Open response. The reference answer supports either choice with two reasonable reasons.", reading_response),
])

asset_map = {
    "image3.png": "art-courses.png",
    "image4.png": "wild-art.png",
    "image5.png": "creative-art.png",
    "image6.png": "art-matters.png",
    "image7.png": "art-magic.png",
    "image11.png": "seashells.png",
    "image12.png": "seashell-frame.png",
    "image8.png": "alice.png",
    "image9.png": "tony.png",
    "image10.png": "harry.png",
}
ASSET_DIR.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(ORIGINAL) as archive:
    for source_name, target_name in asset_map.items():
        (ASSET_DIR / target_name).write_bytes(archive.read(f"word/media/{source_name}"))

paper = {
    "year": 2023,
    "region": "北京",
    "label": "北京真题",
    "displayTitle": "中考英语 北京2023年真题",
    "durationMinutes": 90,
    "fileName": ORIGINAL.name,
    "analysisFileName": ANALYSIS.name,
    "sourceDirectory": str(SOURCE_DIR),
    "questions": questions,
    "readingA": {
        "instructions": "（一）阅读下列课程介绍，请根据人物喜好和需求匹配最适合的课程，并将课程所对应的A、B、C、D选项填在相应位置上。选项中有一项为多余选项。",
        "books": [
            {"letter": "A", "title": "Wild Art", "description": "This course is about drawing and painting. You’ll use your new skills to make a wall poster of animals. And we’ve got lots of picture books to give you ideas.", "image": "/junior-high/beijing-2023/wild-art.png"},
            {"letter": "B", "title": "Art Matters", "description": "This course teaches you different drawing skills. We’ll get you to draw the latest styles of clothes. If you like designing clothes and want to study it at college, join us!", "image": "/junior-high/beijing-2023/art-matters.png"},
            {"letter": "C", "title": "Creative Art", "description": "This course is about making bags to keep your sports clothes in. We provide lots of materials. And you’ll visit art museums to get some creative ideas.", "image": "/junior-high/beijing-2023/creative-art.png"},
            {"letter": "D", "title": "Art Magic", "description": "This course is about telling good stories in pictures. There’ll be cartoon films to watch and instruction in how to draw your favorite characters.", "image": "/junior-high/beijing-2023/art-magic.png"},
        ],
    },
    "assets": {
        "readingA": "/junior-high/beijing-2023/art-courses.png",
        "readingB": ["/junior-high/beijing-2023/seashells.png", "/junior-high/beijing-2023/seashell-frame.png"],
    },
    "writing": {
        "title": "五、文段表达（10分）",
        "promptA": "假设你是李华。你们班想在毕业之前为学校做一件有意义的事，如种植纪念树、去校图书馆整理图书等。你打算邀请交换生Peter参加这次活动。请你用英文给他写一封电子邮件，告诉他活动内容、意义及安排。\n提示词语：invite, plant, meaningful, beautiful, library\n提示问题：What activity do you plan to do? Why do you want to organize this activity? When and where will you have this activity?",
        "requirementsA": "从下面两个题目中任选一题，完成一篇不少于50词的英语文段写作。文中已给出内容不计入总词数。所给提示词语仅供选用。请不要写出你的校名和姓名。",
        "openingA": "Dear Peter,\nHow is everything going?",
        "closingA": "Hope to hear from you soon.\nYours,\nLi Hua",
        "promptB": "同学们参加过各种各样的社团，如篮球队、合唱团等。假设你是李华，请你用英语写一篇短文给学校英文网站投稿，介绍一个你参加过的社团，谈谈这个社团的活动内容以及你的收获。\n提示词语：take part in, practice, skill, benefit, progress\n提示问题：What club did you join? What did you do in the club? What have you learned from the experience?",
        "requirementsB": "完成一篇不少于50词的英语文段写作。文中已给出内容不计入总词数。所给提示词语仅供选用。请不要写出你的校名和姓名。",
    },
}
OUTPUT.write_text(json.dumps(paper, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {OUTPUT} with {len(questions)} questions")
