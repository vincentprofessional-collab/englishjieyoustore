#!/usr/bin/env python3
"""Build the text-only Kaoyan V2 library from the supplied local source archive."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import unicodedata
from pathlib import Path
from typing import Any

from docx import Document
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.table import Table
from docx.text.paragraph import Paragraph
import fitz


TYPE_NAMES = {
    "vocabulary": "词汇与语法",
    "cloze": "完形填空",
    "reading": "阅读理解",
    "new-type": "新题型",
    "translation": "翻译",
    "writing": "写作",
}
TYPE_LABELS = {
    "vocabulary": "词汇与语法",
    "cloze": "完形填空",
    "reading": "阅读理解",
    "new-type": "新题型",
    "translation": "翻译",
    "writing": "写作",
}
WRITING_FIGURE_TEXT = {
    1997: (36, "四幅图表展示世界烟草总产量（1994 年 143.64 亿磅、1996 年 142 亿磅）、吸烟者约占世界人口的 20%（约 11 亿人），以及烟草造成的年度经济损失（2000 亿美元）和死亡人数（300 万人）。"),
    1998: (36, "漫画中，一只鸡伏在写有多行文字的纸张旁，脚边有草窝和鸡蛋；右侧另列数行文字。"),
    1999: (36, "两幅折线图分别展示美国人口增长（约 1800—2000 年）和物种灭绝数量（约 1600—1900 年）的变化，两条曲线均持续上升。"),
    2000: (36, "题为“A Brief History of World Commercial Fishing”的两幅海洋剖面图对比商业捕捞前后的鱼群数量：上图鱼群较少，下图鱼群密集，画面还标出捕捞船只。"),
    2001: (46, "图中一盏小油灯位于弧形排列的文字下方，画面以灯光和文字构成象征性图案；题目要求说明其象征意义。"),
    2002: (46, "照片是一位身穿中国传统服装的美国女孩，原图说明为“An American girl in traditional Chinese costume”。"),
    2003: (46, "上下两格展示一盆幼苗遇雨的情形：上格幼苗处在弧形遮挡物下，下格幼苗直接暴露在雨中。"),
    2004: (46, "图中一人站在带有起点、终点标记的路线/小船上，画面下方写着“终点又是新起点”。"),
    2005: (52, "漫画把养老画成一场足球赛：老父亲在画面中央，三个儿子和小女儿分别站在球门前；图注为“养老‘足球赛’”。"),
    2006: (52, "两张照片分别呈现：一名男孩把“BECKHAM”写在脸上；一名顾客在理发店做发型。图注分别为“把崇拜写在脸上”和“花300元做‘小贝头’”，并注明 Beckham 是英国足球明星。"),
    2007: (52, "足球场上一名球员带球，脑海中浮现球门的画面，其中一个球门被装饰成花环状。"),
    2008: (52, "图中人物翻越一道横向障碍，旁边架着梯子；图下注为“你一条腿，我一条腿；你我一起，走南闯北。”"),
    2009: (52, "蜘蛛网状图案分成多个区域，区域里画着人们使用电脑、屏幕等设备；图注为“网络的‘近’与‘远’”。"),
    2010: (52, "一只冒着热气的火锅周围围着写有不同文化元素的卡片；图注为“文化‘火锅’，既美味又营养”。"),
    2011: (52, "一艘载着乘客的船行驶在漂浮着大量垃圾的水面上；图注为“旅程之‘余’”。"),
    2012: (52, "两个人看到地上的空瓶和洒出的液体：一人说“全完了！”，另一人说“幸好还剩点儿。”"),
    2013: (52, "一群毕业生站在岔路口，路牌指向考研、出国、创业和就业等去向；图注为“选择”。"),
    2014: (52, "左右两格对比三十年前与现在：左格一位年轻母亲牵着小女孩，右格成年女儿搀扶年长母亲；图注为“相携”。"),
    2015: (52, "四位年轻人围坐餐桌聚会，桌上摆着食物，但每个人都低头看手机；图注为“手机时代的聚会”。"),
    2016: (52, "左右两格对比两种家庭学习场景：左格母亲躺着看电视、孩子在桌前学习，母亲说“儿子，你给我好好学习！”；右格大人与孩子都坐在桌前学习。图注为“与其只提要求，不如做个榜样”。"),
    2017: (52, "左右两格对比“有书”与“读书”：左格的人坐在满是书的书架前说“我有这么多书！”；右格的人坐在书桌前读书，并说“我争取今年读完20本书。”"),
    2018: (52, "一名学生在笔记本电脑前选课，屏幕标有“选课系统”；一侧文字为“知识新、重创新、有难度”，另一侧为“给分高、易通过、作业少”；图注为“选课进行时”。"),
    2019: (52, "两名登山者在途中休息：一人递水并说“别呀，休息一下再接着爬”，另一人坐下说“累了，我不爬了”；图注为“途中”。"),
}

RECENT_NEW_TYPE_SOURCE_OVERRIDES = {
    # The supplied 2026 English I paper is image-only. These paragraphs were
    # transcribed from pages 9–10 so the original A–H choices remain selectable.
    "2026-e1": """Part B Directions: The following paragraphs are given in a wrong order. For questions 41–45, reorganize them into a coherent text by choosing from A–H. Paragraphs A, C, and H have been correctly placed. (10 points)

A. And just read a single poem. In his Oxford lectures, Seamus Heaney argued that a poem draws a picture of reality, a “glimpsed alternative” that sets up a contradiction with your own, in ways little and large. The negotiation, between you and it, is the heart of the matter. What does the poet see that you don’t? What does the difference mean? It could be one of the best conversations you ever have. Forget self-help books; reading is self-help in action.

B. But for the most part, this isn’t what the business community does. I have yet to meet a chief executive who reads regularly. Many skip newspapers, and magazines are a stretch. They don’t have time, they say. It’s inefficient: they can get the information they need from those around them. At a pinch, they might pick up a business book before a long flight, in the hope that, like a cookbook, it will provide a foolproof recipe. Some are drawn to what I think of as “business car crash” books — the stories of Theranos, Purdue, or WeWork. But outside those narrow pools of interest, a vast ocean awaits, bountiful with simmering ideas, mental adventure and imaginative refreshment.

C. Neuroscientists have been at pains to demonstrate that the pleasure a book provides isn’t indulgence: it’s good for you. Reading will keep you better informed about the world but it can also improve our tech-shattered ability to concentrate. Standing in the shoes of others fine tunes our social understanding, useful as we struggle to understand friends, neighbours, customers and co-workers. Different parts of our brain engage as we simulate scenes, characters and mental states. Our imagination — remember that? — is rekindled.

D. It is undoubtedly true that all work and no play really does make Jack, or Jill, dull. The cure is right at hand, reading is cheap, easy and, most important, it’s fun. Liberate your imagination this year.

E. We are living through a golden age of science writing. So lucid and accessible that even lay readers can relish the unpredictability of discovery. Daunted by uncertainty? Stand in the shoes of scientists and witness the degree to which breakthroughs emerge from accidents, conflict and sheer mental stamina. “We are never sure of anything,” says the physicist (and writer) Carlo Rovelli.

F. You don’t need to get out more. If, like most business people, you spend your life dashing from office to plane, train to home, boardroom to washroom, what you really need to do is stay in more. Sit down — and read a book.

G. Reading has also been found to make us more helpful, to reduce bias, and even to increase longevity — something we will enjoy all the more if we have a good book in our hands. (And yes, all these benefits are more closely associated with physical books than digital ones.)

H. Read fiction. Any fiction. Free yourself from algorithms and choose anything. You don’t need technology for an immersive experience; just surrender to narratives across time and place. Modern (Sebastian Barry or Olga Tokarczuk), classic (Virginia Woolf or James Baldwin) or genre (Stephen King, Margaret Atwood, Georges Simenon) — it doesn’t matter. Fiction invites you to loiter unseen in the lives of others. We are living through a golden age of translation too, so you can go anywhere in time or place.""",
}
CLOZE_SOURCE_FIXES = {
    "2020-e1": [
        (r"\bcan\s+L\s+it\b", "can 2 it"),
        (r"_l_l\s*_", "11"),
        (r"\b1\s+3\b", "13"),
        (r"_{2,}l[±+]\s*_", "14"),
        (r"_{2,}li_", "15"),
        (r"-\ufffd1\ufffd6'---", "16"),
        (r"_l1\._", "17"),
    ],
    "2021-e1": [
        (r"\bIt\s+m\s+adulthood", "It 1 in young adulthood"),
        (r"But\s*~\s*-\s*is inevitable", "But 3 aging is inevitable"),
        (r"_1___(?=\s+that lifestyle)", "5"),
        (r"and\s+--~-", "and 8"),
        (r"middle-aged people\s+___2____", "middle-aged people 9"),
        (r"as the years\s+__\s*_lJ_", "as the years 11"),
        (r"association may be\s+__J1___", "association may be 12"),
        (r"could\s+__\s*J_4\s*_", "could 14"),
        (r"\n\s*steps you can", "\n16 there are steps you can"),
        (r"_1_7__", "17"),
        (r"mental\s+-\s*-\s*~\s*\.", "mental 18."),
    ],
    "2020-e2": [
        (r"a_\]_\s+and composed", "a 7 and composed"),
        (r"benefit9om", "benefit 9 from"),
        (r"eaiy", "easy"),
        (r"noboȧy", "nobody"),
        (r"to4\s*:", "to 4:"),
        (r"could11\s+the clock", "could 11 the clock"),
        (r"mamtam", "maintain"),
        (r"emot10nal", "emotional"),
        (r"stresshl", "stressful"),
        (r"1s one of", "is one of"),
        (r"and20\s+9om", "and 20 from"),
    ],
    "2024-e2": [(r"(?<!\w)l0(?!\w)", "10")],
}
WRITING_TASK_OVERRIDES = {
    "2020-e1": {
        52: "52. Directions: Write an essay of 160–200 words based on the picture below. In your essay, you should (1) describe the picture briefly, (2) interpret the implied meaning, and (3) give your comments. You should write neatly on the ANSWER SHEET. (20 points)\n\n图片文字说明：漫画题为“习惯”。左图是一位学生伏案学习，桌上堆着资料，旁边写着“早早完成才放心”；右图是一位学生坐着休息，桌前的事情尚未开始，旁边写着“不到最后不动手”。",
    },
    "2020-e2": {
        48: "48. Directions: Write an essay based on the chart below. In your writing, you should (1) interpret the chart, and (2) give your comments. You should write about 150 words on the ANSWER SHEET. (15 points)\n\n图表文字数据：某高校学生手机阅读目的调查。学习知识 59.5%；消磨时间 21.3%；获取信息 17.0%；其他 2.2%。",
    },
    "2021-e1": {
        51: "51. Directions: A foreign friend of yours has recently graduated from college and intends to find a job in China. Write him/her an email to make some suggestions. Write about 100 words on the ANSWER SHEET. Do not sign your own name at the end. Use “Li Ming” instead. Do not write the address. (10 points)",
        52: "52. Directions: Write an essay of 160–200 words based on the picture below. In your essay, you should (1) describe the picture briefly, (2) interpret its intended meaning, and (3) give your comments. You should write neatly on the ANSWER SHEET. (20 points)\n\n图片文字说明：漫画中，女儿对父亲说，很多同学觉得学戏剧不好玩；父亲回答：“你自己不是喜欢吗？那就足够了。”",
    },
    "2021-e2": {
        48: "48. Directions: Write an essay based on the chart below. In your writing, you should (1) interpret the chart, and (2) give your comments. You should write about 150 words on the ANSWER SHEET. (15 points)\n\n图表文字数据：某市居民锻炼方式调查。独自锻炼 54.3%；和朋友一起锻炼 47.7%；和家人一起锻炼 23.9%；参加团体活动 15.8%。",
    },
    "2022-e1": {
        52: "52. Directions: Write an essay of 160–200 words based on the picture below. In your essay, you should (1) describe the picture briefly, (2) explain its intended meaning, and (3) give your comments. You should write neatly on the ANSWER SHEET. (20 points)\n\n图片文字说明：校园公告栏上张贴着“校园讲座”的通知。两位学生正在讨论是否参加：一位认为讲座不是自己专业的，听了也没有用；另一位认为去听听肯定有好处。",
    },
    "2022-e2": {
        47: "47. Directions: Suppose you are planning a campus food festival. Write an email to the international students in your university to (1) introduce the food festival, and (2) invite them to participate. You should write about 100 words on the ANSWER SHEET. Do not use your own name. Use “Li Ming” instead. (10 points)",
        48: "48. Directions: Write an essay based on the following chart. In your writing, you should (1) interpret the chart, and (2) give your comments. You should write about 150 words on the ANSWER SHEET. (15 points)\n\n图表文字数据：2018—2020年我国快递业务量（单位：十亿件）。全国快递业务量：2018年 51，2019年 64，2020年 83；农村快递业务量：2018年 12，2019年 15，2020年 30。",
    },
    "2023-e1": {
        52: "52. Directions: Write an essay of 160–200 words based on the picture below. In your essay, you should (1) describe the picture briefly, (2) interpret the implied meaning, and (3) give your comments. You should write neatly on the ANSWER SHEET. (20 points)\n\n图片文字说明：一场龙舟比赛正在河面上进行，桥上的人们和岸边的一对老年夫妇驻足观看。老人手持拐杖，正与身边的老伴交谈；画面表现了大家观看乡村体育活动的情景。",
    },
    "2023-e2": {
        48: "48. Directions: Write an essay based on the chart below. In your writing, you should (1) interpret the chart, and (2) give your comments. You should write about 150 words on the ANSWER SHEET. (15 points)\n\n图表文字数据：2012—2021年我国居民健康素养水平：2012年 8.80%，2013年 9.48%，2014年 9.79%，2015年 10.25%，2016年 11.58%，2017年 14.18%，2018年 17.06%，2019年 19.17%，2020年 23.15%，2021年 25.40%。健康素养是个人获取、理解并运用基本健康信息和服务，以维护和促进自身健康的能力；图中比例指具备基本健康素养的人在15—69岁城乡居民总人群中所占的比例。",
    },
    "2024-e1": {
        52: "52. Directions: Write an essay based on the picture below. In your essay, you should (1) describe the picture and the chart briefly, (2) interpret the implied meaning, and (3) give your comments. Write 160–200 words on the ANSWER SHEET. (20 points)\n\n图片文字说明：一名年轻人在公园健身区跑步，旁边的标牌写着“公园健身区”，他感叹：“家门口新修的公园真不错！”\n图表文字数据：某市近三年公园数量（单位：座）：2020年 406，2021年 532，2022年 670。",
    },
    "2024-e2": {
        47: "47. Directions: Suppose you and Jack are going to do a survey on the protection of old houses in an ancient town. Write him an email to (1) put forward your plan, and (2) ask for his opinion. You should write about 100 words on the ANSWER SHEET. Do not use your own name. Use “Li Ming” instead. (10 points)",
        48: "48. Directions: Write an essay based on the chart below. In your writing, you should (1) describe and interpret the chart, and (2) give your comments. You should write about 150 words on the ANSWER SHEET. (15 points)\n\n图表文字数据：某高校劳动实践课学生主要收获调查。学习了相关知识 91.3%；提升了动手能力 84.8%；感觉到心情舒畅 54.4%；增强了合作能力 32.6%。",
    },
    "2025-e1": {
        52: "52. Directions: Write an essay of 160–200 words based on the following table. In your essay, you should (1) describe the table briefly, (2) explain its intended meaning, and (3) give your comments. You should write neatly on the ANSWER SHEET. (20 points)\n\n表格文字数据：近年来全国居民平均每百户年末主要耐用消费品拥有量（台）。年份｜空调｜洗衣机｜电冰箱；2014｜75.2｜83.7｜85.5；2017｜96.1｜91.7｜95.3；2020｜117.7｜96.7｜101.8；2023｜145.9｜98.2｜103.4。",
    },
    "2025-e2": {
        47: "47. Directions: Suppose you are planning a short play based on a classic Chinese novel. Write your friend John an email to (1) introduce the play, and (2) invite him to take part in it. You should write about 100 words on the ANSWER SHEET. Do not use your own name. Use “Li Ming” instead. (10 points)",
        48: "48. Directions: Write an essay based on the chart below. In your writing, you should (1) interpret the chart, and (2) give your comments. You should write about 150 words on the ANSWER SHEET. (15 points)\n\n图表文字数据：某社区老年人主要日常休闲活动调查。看电视 90.8%；散步 68.3%；养花 34.7%；阅读 31.8%；下棋 18.4%。",
    },
    "2026-e1": {
        52: "52. Directions:\nWrite an essay based on the charts below. In your writing, you should (1) describe the charts briefly, (2) interpret the charts, and (3) give your comments. Write 160–200 words. (20 points)\n\n图表主题：消费者对养老机器人的接受度和首要关注点。\n消费者接受度：完全接受 39.3%，部分接受 32.8%，不接受 27.9%。\n首要关注点：安全 46.3%，价格 24.9%，便利 10.7%。",
    },
    "2026-e2": {
        47: "47. Directions: Suppose your friend Jack has shared with you a video of his family’s travel in China. Write an email to tell him (1) how you feel about the video, and (2) your wish to learn more about their travel. Write your answer in about 100 words on the ANSWER SHEET. Do not use your own name in your email. Use “Li Ming” instead. (10 points)",
        48: "48. Directions: Write an essay based on the chart below. In your essay, you should (1) describe and interpret the chart, and (2) give your comments. Write about 150 words on the ANSWER SHEET. (15 points)\n\n图表文字数据：一项关于儿童户外活动看法的调查。认为户外活动能满足好奇心 54.6%；促进观察力 54.5%；强身健体 37.2%；增强亲子互动 33.2%。",
    },
}
CLOZE_OPTION_OVERRIDES = {
    "2020-e2": {
        3: {"B": "Occasionally"},
        11: {"A": "turn back"},
        17: {"C": "confused", "D": "confronted"},
        18: {"A": "terrible", "B": "hard", "C": "strange", "D": "wrong"},
        20: {"D": "escape"},
    },
    "2025-e2": {
        1: {"D": "question"},
        3: {"A": "attention", "B": "talent", "C": "courage", "D": "patience"},
        5: {"A": "unrealistic", "B": "deceptive", "C": "tiresome", "D": "uncomfortable"},
        7: {"A": "Once", "B": "Unless", "C": "Although", "D": "Before"},
        9: {"D": "inconveniencing"},
        10: {"D": "look back"},
        13: {"A": "explain", "B": "identify", "C": "predict", "D": "overcome"},
        16: {"A": "read", "B": "classify", "C": "analyse", "D": "compare"},
        20: {"C": "busy", "D": "lazy"},
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_ref(path: Path, root: Path, method: str, confidence: float) -> dict[str, Any]:
    return {
        "sourceDocumentId": path.stem,
        "relativePath": path.relative_to(root).as_posix(),
        "sha256": sha256(path),
        "locator": {},
        "extractionMethod": method,
        "confidence": confidence,
    }


def text_block(text: str, block_type: str = "paragraph") -> dict[str, Any]:
    return {"type": block_type, "runs": [{"type": "text", "text": text}]} if block_type == "paragraph" else {"type": "heading", "level": 3, "text": text}


def answer_none() -> dict[str, Any]:
    return {"availability": "none", "gradingMode": "none", "kind": "none"}


def question(
    question_id: str,
    number: int,
    label: str,
    question_type: str,
    prompt: str,
    options: list[dict[str, Any]] | None = None,
    source_refs: list[dict[str, Any]] | None = None,
    placement: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": question_id,
        "displayNumber": number,
        "typeLabel": label,
        "type": question_type,
        "promptBlocks": [text_block(prompt)] if prompt else [],
        "placement": placement or {"kind": "standalone"},
        "options": options or [],
        "blanks": [],
        "answerSpec": {"availability": "none", "gradingMode": "manual", "kind": "text"} if question_type in ("short_answer", "translation", "essay") else answer_none(),
        "explanationBlocks": [],
        "sourceRefs": source_refs or [],
        "reviewStatus": "review_required",
    }


def options(items: list[dict[str, str]], prefix: str) -> list[dict[str, Any]]:
    return [
        {"id": f"{prefix}-{item['label']}", "label": item["label"], "blocks": [text_block(item["text"])]}
        for item in items if item.get("label") and item.get("text")
    ]


def cloze_options(exam_id: str, number: int, items: list[dict[str, str]], prefix: str) -> list[dict[str, Any]]:
    overrides = CLOZE_OPTION_OVERRIDES.get(exam_id, {}).get(number, {})
    by_label: dict[str, str] = {}
    for item in items:
        label = item.get("label", "")
        if label in "ABCD" and label not in by_label:
            by_label[label] = item.get("text", "")
    by_label.update(overrides)
    cleaned = []
    for label in "ABCD":
        text = by_label.get(label, "")
        text = re.sub(r"\s*(?:考|创)\s*\d{1,2}[.．、]?\s*$", "", text)
        if text.strip():
            cleaned.append({"label": label, "text": clean_source(text)})
    return options(cleaned, prefix)


def recent_source_refs(exam: dict[str, Any], manifest: dict[str, Any], source_dir: Path, source_root: Path) -> list[dict[str, Any]]:
    record = manifest[exam["id"]]
    refs = []
    for role, file_record in record["files"].items():
        relative = Path("真题/2020-2026英语一二离线练习") / file_record["packagePath"]
        path = source_root / relative
        if path.exists():
            refs.append(source_ref(path, source_root, "pdf-text", 0.95))
    return refs


def clean_source(text: str) -> str:
    text = re.sub(r"(?im)^\s*(?:PartA|PartB|PartC)\s*$", lambda m: m.group(0).replace("Part", "Part "), text)
    text = re.sub(r"(?i)\bDirections?\s*:\s*Directions?\s*:", "Directions:", text)
    text = re.sub(r"(?is)\s*(?:(?:20\s*\d\s*\d\s*年)\s*)?英\s*语\s*[（(]?\s*[一二]\s*[）)]?\s*试\s*题.{0,100}?(?:共|Mr)\s*(?:\d\s*)+页\s*[）)]?", " ", text)
    text = re.sub(r"(?is)\s*英\s*语\s*[（(]?\s*[一二]\s*[）)]?\s*试\s*题\s*[.﹒]\s*\d+\s*[.﹒]?\s*[（(]\s*(?:共|Mr)\s*(?:\d\s*)+页\s*[）)]?", " ", text)
    text = re.sub(r"(?im)^\s*(?:注意\s*[:：]|注\s*意\s*[:：]).*(?:答题卡|答题).*$", "", text)
    text = re.sub(r"(?im)^\s*原资料未提供听力题目\s*$", "", text)
    # Older OCR exports split the question number inside this watermark
    # (for example, ``EQ \\X\\BO(大1家7)``), so remove the complete tag.
    text = re.sub(r"(?i)\bEQ\s*\\X\\BO\s*\([^)]{0,30}\)", "", text)
    text = re.sub(r"(?im)^\s*@?聚创考研\s*$", "", text)
    text = text.replace("@聚创考研", "")
    text = re.sub(r"\bIwas\b", "I was", text)
    text = re.sub(r"\b(\d)points\b", r"\1 points", text, flags=re.I)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def split_directions(text: str) -> tuple[str, str]:
    text = clean_source(text)
    direction = re.search(r"(?is)\bDirections?\s*[:：].{0,1800}?\(\s*(?:\d\s*){1,3}points?\s*\)", text)
    if direction:
        return clean_source(direction.group(0)), clean_source(text[direction.end():])
    first_paragraph = re.split(r"\n\s*\n", text, maxsplit=1)
    if first_paragraph and re.match(r"(?i)^\s*(?:Part\s*[A-Z]\s*)?Directions?\b", first_paragraph[0]):
        return clean_source(first_paragraph[0]), clean_source(first_paragraph[1] if len(first_paragraph) > 1 else "")
    return "", text


def translation_items(text: str) -> list[tuple[int, str]]:
    """Extract the numbered source sentences/segments that candidates translate."""
    text = unicodedata.normalize("NFKC", text)
    line_markers = list(re.finditer(r"(?m)^[ \t]*(\d{1,3})\s*[.．、)]\s*(?=\S)", text))
    if len(line_markers) >= 2:
        numbers = [int(match.group(1)) for match in line_markers]
        if numbers == list(range(numbers[0], numbers[0] + len(numbers))):
            items = []
            for index, (number, match) in enumerate(zip(numbers, line_markers)):
                end = line_markers[index + 1].start() if index + 1 < len(line_markers) else len(text)
                segment = text[match.end():end].strip()
                sentence_end = re.search(r"[.!?。！？](?:[\"’”')\]]*)?(?=\s+(?:[A-Z“‘(]|$)|$)", segment)
                if sentence_end:
                    segment = segment[:sentence_end.end()].strip()
                segment = clean_source(segment)
                if segment:
                    items.append((number, segment))
            return items

    inline_markers = list(re.finditer(r"(?<!\d)(\d{2})\s*\)", text))
    inline_markers = [match for match in inline_markers if 21 <= int(match.group(1)) <= 80]
    if not inline_markers:
        return []
    runs: list[list[re.Match[str]]] = []
    for marker in inline_markers:
        number = int(marker.group(1))
        if not runs or number != int(runs[-1][-1].group(1)) + 1:
            runs.append([marker])
        else:
            runs[-1].append(marker)
    run = max(runs, key=lambda items: (len(items), int(items[-1].group(1))))
    if len(run) < 2 and int(run[0].group(1)) not in (46, 50):
        return []

    items = []
    for index, marker in enumerate(run):
        number = int(marker.group(1))
        end = run[index + 1].start() if index + 1 < len(run) else len(text)
        segment = text[marker.end():end].strip()
        sentence_end = re.search(r"[.!?。！？](?:[\"’”')\]]*)?(?=\s+[A-Z“‘(]|$)", segment)
        if sentence_end:
            segment = segment[:sentence_end.end()].strip()
        if segment:
            items.append((number, clean_source(segment)))
    return items


def is_translation_instruction(text: str) -> bool:
    return bool(re.search(
        r"(?is)\bDirections?\s*[:：].{0,500}?\btranslate\b.{0,200}?\b(?:into\s+(?:Chinese|English)|the\s+underlined\s+(?:sentences|segments))\b",
        text,
    ))


def choice_sequence(text: str, last_label: str = "G") -> list[re.Match[str]]:
    marker = re.compile(r"(?<![A-Za-z0-9])(?:\[\s*(?P<bracket>[A-H])\s*[\]J)]|(?P<plain>[A-H])\s*[.)])\s*", re.I)
    matches = list(marker.finditer(text))
    expected = "ABCDEFGH"[:"ABCDEFGH".index(last_label) + 1]
    candidates = []
    for start, match in enumerate(matches):
        if (match.group("bracket") or match.group("plain") or "").upper() != "A":
            continue
        sequence = [match]
        for candidate in matches[start + 1:]:
            if candidate.start() - sequence[-1].end() > 5000:
                break
            label = (candidate.group("bracket") or candidate.group("plain") or "").upper()
            if label == expected[len(sequence)]:
                sequence.append(candidate)
                if len(sequence) == len(expected):
                    candidates.append(sequence)
                    break
        if candidates and candidates[-1][0].start() == match.start():
            continue
    return min(candidates, key=lambda sequence: (sequence[-1].end() - sequence[0].start(), -sequence[0].start())) if candidates else []


def matching_names(text: str, directions: str) -> dict[int, str]:
    if not re.search(r"numbered\s+name|left\s+column", directions, re.I):
        return {}
    names = {}
    for match in re.finditer(r"(?<!\w)(4[1-5])\.\s*([A-Z][A-Za-z’'-]+)(?:\s+([A-Z][A-Za-z’'-]+))?", text):
        number = int(match.group(1))
        name = match.group(2)
        if re.search(r"left\s+column", directions, re.I) and match.group(3):
            name += " " + match.group(3)
        name = re.sub(r"(?i)Rextord\b", "Rexford", name)
        names[number] = name
    return names if len(names) == 5 else {}


def cloze_answer_lines(text: str, question_numbers: list[int]) -> str:
    # Some legacy OCR splits a two-digit blank label across whitespace while
    # retaining its underscore rule (for example ``__ 18 _``).
    text = re.sub(
        r"(?P<left>[_＿]+)\s*(\d)\s+(\d)\s*(?P<right>[_＿]+)",
        lambda match: f"{match.group('left')}{match.group(2)}{match.group(3)}{match.group('right')}",
        text,
    )
    marked = {
        int(match.group(1)) for match in re.finditer(r"(?<!\w)(\d+)\s+┄┄┄┄", text)
    }
    if 1 not in marked:
        for match in reversed(list(re.finditer(r"[_＿]+\s*[lI]\s*[_＿]+", text))):
            text = text[:match.start()] + "1 ┄┄┄┄" + text[match.end():]
            marked.add(1)
    orphaned = list(re.finditer(r"(?<!\w)\](?!\w)", text))
    if 1 not in marked and len(orphaned) == 1:
        match = orphaned[0]
        text = text[:match.start()] + "1 ┄┄┄┄" + text[match.end():]
        marked.add(1)
    for number in question_numbers:
        if number in marked:
            continue
        for match in re.finditer(rf"[_＿]+\s*{number}\s*[_＿]*", text):
            before_space = "" if match.start() == 0 or text[match.start() - 1].isspace() else " "
            after_space = "" if match.end() == len(text) or text[match.end()].isspace() else " "
            text = text[:match.start()] + f"{before_space}{number} ┄┄┄┄{after_space}" + text[match.end():]
            marked.add(number)
            break
    for number in question_numbers:
        if number in marked:
            continue
        for match in re.finditer(rf"(?<![A-Za-z0-9])(?P<left>[_＿]*){number}(?P<right>[_＿]*)(?P<punct>[.,]?)(?![A-Za-z0-9])", text):
            before = text[:match.start()]
            after = text[match.end():]
            left_gap = re.search(r"(?:[ \t]{2,}|[ \t]*\n[ \t]*)$", before)
            right_gap = re.match(r"(?:[ \t]{2,}|[ \t]*\n[ \t]*)", after)
            if not (match.group("left") or match.group("right") or left_gap and right_gap or match.group("punct") and left_gap):
                continue
            text = text[:match.start()] + f"{number} ┄┄┄┄{match.group('punct')}" + text[match.end():]
            marked.add(number)
            break

    # OCR often removes the original blank's horizontal rule and leaves only
    # its question number. Recover those bare markers in reading order, using
    # already identified question numbers as boundaries so ordinary numbers
    # such as "13 feet" are not mistaken for blanks.
    selected: dict[int, re.Match[str]] = {}
    labels = list(re.finditer(r"(?<!\w)(\d+) ┄┄┄┄", text))
    for number in question_numbers:
        if number in marked:
            continue
        label_positions = {
            int(match.group(1)): match.start() for match in labels
            if int(match.group(1)) in question_numbers
        }
        lower = max((value for key, value in label_positions.items() if key < number), default=-1)
        upper = min((value for key, value in label_positions.items() if key > number), default=len(text))
        lower = max(lower, max((match.start() for key, match in selected.items() if key < number), default=-1))
        candidates = []
        for match in re.finditer(rf"(?<!\d){number}(?!\d)(?!\s*(?:st|nd|rd|th)\b)(?:[ \t]*[.,])?", text, re.I):
            if text[match.end():].startswith(" ┄┄┄┄"):
                continue
            if lower < match.start() < upper:
                candidates.append(match)
        if len(candidates) == 1:
            selected[number] = candidates[0]

    for number, match in sorted(selected.items(), key=lambda item: item[1].start(), reverse=True):
        before_space = " " if match.start() and text[match.start() - 1].isalnum() else ""
        after_space = " " if match.end() < len(text) and text[match.end()].isalnum() else ""
        text = text[:match.start()] + f"{before_space}{number} ┄┄┄┄{after_space}" + text[match.end():]
    return text


OLD_CLOZE_BLANK_ANCHORS = {
    1981: [
        (1, "will be", "popular"), (2, "made possible", "the discovery"),
        (3, "pictures on", "a screen"), (4, "three meters", "."),
        (5, "television sets", "."), (6, "more ‘real’", "it will have"),
        (7, "programmes already", "on tapes"), (8, "the tapes", "are used"),
        (9, "play them", "later"), (10, "will make", "possible"),
    ],
    1982: [
        (31, "", "before man learned"), (32, "he", "natural shelters"),
        (33, "could", "himself"), (34, "crouching", "the overhanging edges"),
        (35, "crawling into", "."), (36, "building", ", he used"),
        (37, "find easily", "him: rocks"), (38, "It was", ", however"),
        (39, "build", "shelters because"), (40, "because", "man learned to farm"),
        (41, "he lived by", "."),
    ],
    1983: [
        (31, "make", "of new compounds"), (32, "never existed", ". Many of them"),
        (33, "new uses", "old, well-known"), (34, "well-known", "such as mercury"),
        (35, "or", "purpose, many of them"), (36, "In some", "people have been killed"),
        (37, "killed or", "by them"), (38, "mercury;", "others were crippled"),
        (39, "crippled", "life."), (40, "present", "the problem"),
    ],
    1984: [
        (31, "might", "huge ventilation"), (32, "coal-burning", ", trains"),
        (33, "air", "the tunnels"), (34, "problem", "a giant fan-driven"),
        (35, "severe", "when a truck"), (36, "truck", "with chemical substances"),
        (37, "persons were", "by the strong"), (38, "remained", "after the explosion"),
        (39, "explosion.", "the ruin"), (40, "traffic", "after only fifty-six hours"),
    ],
    1985: [
        (16, "passion", "writing poetry"), (17, "such as", "stamps"),
        (18, "all my", "time reading poetry"), (19, "possible", "soon got me"),
        (20, "very", ", but it was not long"), (21, "not", "attention"),
        (22, "with a", "not to waste time"), (23, "first", ". Everyone at school"),
        (24, "who", "me more carefully"), (25, "quite", "that I was"),
    ],
    2009: [
        (1, "humans are.", "the fruit-fly experiments"),
        (2, "average fruit fly", "to live shorter lives."),
        (3, "This suggests that", "bulbs burn longer"),
        (4, "there is an", "in not being too bright."),
        (5, "Intelligence, it", ", is a high-priced option."),
        (6, "is slow", "the starting line"),
        (7, "learning — a(n)", "process — instead of instinct."),
        (8, "learned is when to", "."),
        (9, "an adaptive value to", "intelligence?"),
        (10, "wistful glance", "at all the species"),
        (11, "the real", "of our own intelligence"),
        (12, "This is", "the mind of every animal"),
        (13, "animals would", "on humans"),
        (14, "Every cat with an owner,", ", is running a small-scale study"),
        (15, "We believe that", "animals ran the labs"),
        (16, "test us to", "the limits of our patience"),
        (17, "is really", ", not merely how much"),
        (18, "there is.", ", they would hope to study"),
        (19, "study a", "question:"),
        (20, "they live in?", "the results are inconclusive."),
    ],
}


OLD_CLOZE_EXTRA_BLANK_ANCHORS = {
    2004: [
        (14, "or two working parents;", ",children are likely"),
        (17, "Other", "causes of offensive acts"),
        (18, "the increased", "of drugs and alcohol"),
    ],
    2006: [(3, "To help homeless people", "independence")],
}


OLD_CLOZE_2019_OPTIONS = {
    1: {"A": "Some", "B": "Most", "C": "Few", "D": "All"},
    2: {"A": "put", "B": "take", "C": "run", "D": "come"},
    3: {"A": "Since", "B": "If", "C": "Though", "D": "Until"},
    4: {"A": "formally", "B": "relatively", "C": "gradually", "D": "literally"},
}


def insert_cloze_anchors(text: str, anchors: list[tuple[int, str, str]], year: int) -> tuple[str, list[str]]:
    issues = []
    for number, left, right in anchors:
        left_pattern = re.escape(left)
        right_pattern = re.escape(right)
        existing_blank = rf"(?:[_＿]*\s*{number}\s*[_＿]*\s*)?"
        if left:
            pattern = re.compile(rf"(?P<left>{left_pattern})\s*{existing_blank}(?P<right>{right_pattern})", re.I)
        else:
            pattern = re.compile(rf"^\s*{existing_blank}(?P<right>{right_pattern})", re.I)
        matches = list(pattern.finditer(text))
        if len(matches) != 1:
            issues.append(f"{year} cloze blank {number}: source anchor matched {len(matches)} times")
            continue
        match = matches[0]
        left_text = match.groupdict().get("left", "")
        right_text = match.group("right")
        suffix = "" if right_text[:1] in ",.;:!?)]}" else " "
        replacement = f"{left_text} {number} ┄┄┄┄{suffix}{right_text}"
        text = text[:match.start()] + replacement + text[match.end():]
    return text, issues


def insert_old_cloze_blanks(text: str, year: int) -> tuple[str, list[str]]:
    return insert_cloze_anchors(text, OLD_CLOZE_BLANK_ANCHORS.get(year, []), year)


def parse_old_cloze(text: str, year: int, subject: str, source_refs: list[dict[str, Any]], prefix: str) -> tuple[str, dict[str, Any], list[str]]:
    """Split a historic cloze source into editable passage text and selectable answer options."""
    text = unicodedata.normalize("NFKC", visible_historical_text(text))
    points = re.search(r"\(\s*(\d{1,2})\s*points?\s*\)", text, re.I)
    if points:
        directions = clean_source(text[:points.end()])
        remaining = clean_source(text[points.end():])
        expected_count = int(points.group(1))
    else:
        directions, remaining = split_directions(text)
        expected_count = 0

    if year == 2009:
        # The source PDF shows these phrases clearly; the Word/OCR export
        # misread the blank as surrounding prose in both places.
        remaining = re.sub(
            r"learning\s*[—–-]\s*a\s+gradual\s*[—–-]\s*instead of instinct",
            "learning — a(n) process — instead of instinct",
            remaining,
            count=1,
            flags=re.I,
        )
        remaining = re.sub(
            r"Intelligence, it\s+out,\s+is a high-priced option",
            "Intelligence, it, is a high-priced option",
            remaining,
            count=1,
            flags=re.I,
        )
        remaining = re.sub(r"too\s+terrifically\s+bright", "too bright", remaining, count=1, flags=re.I)

    # Early papers include a worked example before the article; answer lines may
    # already have been removed, so use the first source-verified passage cue.
    early_passage_cues = {
        1982: r"before man learned how to build houses",
        1983: r"In the 20th century chemists",
        1984: r"Ventilation, as we know",
        1985: r"When I was about twelve",
    }
    example = re.search(r"(?i)\bEXAMPLE\s*:", remaining)
    cue = re.search(early_passage_cues[year], remaining, re.I) if year in early_passage_cues else None
    if example and cue and cue.start() > example.start():
        remaining = clean_source(remaining[:example.start()] + "\n" + remaining[cue.start():])

    issues: list[str] = []
    if year in OLD_CLOZE_BLANK_ANCHORS:
        numbers = [number for number, _left, _right in OLD_CLOZE_BLANK_ANCHORS[year]]
        if year == 1981:
            passage, anchor_issues = insert_old_cloze_blanks(remaining, year)
            issues.extend(anchor_issues)
            questions = [question(f"{prefix}-{number}", number, "完形填空", "short_answer", f"第 {number} 空", source_refs=source_refs) for number in numbers]
            return directions, {"id": f"{prefix}-passage", "title": "完形填空", "presentation": "reading", "instructions": [], "stimulusBlocks": [text_block(passage)], "sharedOptions": [], "questions": questions}, issues
        first_number = numbers[0]
        option_tail = re.search(rf"(?m)^\s*{first_number}\s*[.．、)]\s*\[\s*A\s*[\]J)]", remaining)
        if option_tail:
            passage = remaining[:option_tail.start()].rstrip()
            passage, anchor_issues = insert_old_cloze_blanks(passage, year)
            issues.extend(anchor_issues)
        else:
            passage, anchor_issues = insert_old_cloze_blanks(remaining, year)
            issues.extend(anchor_issues)
        option_text = remaining[option_tail.start():] if option_tail else ""
        options_by_number, parse_issues = old_cloze_option_blocks(option_text, numbers)
        issues.extend(parse_issues)
        if expected_count and year < 2001 and len(numbers) != expected_count:
            issues.append(f"{year} cloze has {len(numbers)} numbered blanks; directions specify {expected_count}")
    else:
        normalized = remaining
        grid = re.search(
            r"(?is)\[\s*A\s*\]\s*Some\s+\[\s*A\s*\]\s*put\s+\[\s*A\s*\]\s*Since\s+\[\s*A\s*\]\s*formally\s+"
            r"\[\s*B\s*\]\s*Most\s+\[\s*B\s*\]\s*take\s+\[\s*B\s*\]\s*If\s+\[\s*B\s*\]\s*relatively\s+"
            r"\[\s*C\s*\]\s*Few\s+\[\s*C\s*\]\s*run\s+\[\s*C\s*\]\s*Though\s+\[\s*C\s*\]\s*gradually\s+"
            r"\[\s*D\s*\]\s*All\s+\[\s*D\s*\]\s*come\s+\[\s*D\s*\]\s*Until\s+\[\s*D\s*\]\s*literally",
            normalized,
        ) if year == 2019 else None
        if grid:
            normalized = normalized[:grid.start()] + normalized[grid.end():]
        starts = list(re.finditer(r"(?<!\w)(\d{1,2})\s*[.．、)]\s*(?=\[\s*A\s*[\]J)])", normalized, re.I))
        blocks = []
        for index, marker in enumerate(starts):
            number = int(marker.group(1))
            end = starts[index + 1].start() if index + 1 < len(starts) else len(normalized)
            labels = list(re.finditer(r"\[\s*([A-D])\s*[\]J)]", normalized[marker.end():end], re.I))
            if len(labels) < 4 or [item.group(1).upper() for item in labels[:4]] != list("ABCD"):
                continue
            block_options = []
            body_start = marker.end()
            for choice_index, label_match in enumerate(labels[:4]):
                option_end = labels[choice_index + 1].start() if choice_index + 1 < 4 else end - marker.end()
                choice_text = normalized[marker.end() + label_match.end():marker.end() + option_end].strip(" \t\r\n,;")
                if not choice_text:
                    block_options = []
                    break
                block_options.append({"label": label_match.group(1).upper(), "text": clean_source(choice_text)})
            if len(block_options) == 4:
                blocks.append((number, marker.start(), marker.end(), block_options))

        runs: list[list[tuple[int, int, int, list[dict[str, str]]]]] = []
        for block in blocks:
            if not runs or block[0] != runs[-1][-1][0] + 1:
                runs.append([block])
            else:
                runs[-1].append(block)
        main_run = max(runs, key=lambda run: (len(run), run[-1][1])) if runs else []
        if not main_run:
            passage = normalized
            options_by_number = {}
            issues.append(f"{year} {subject} cloze: no complete A-D option sequence found")
        else:
            passage = normalized[:main_run[0][1]].rstrip()
            options_by_number = {number: items for number, _start, _end, items in main_run}

        if year == 2019:
            options_by_number.update({
                number: [{"label": letter, "text": value} for letter, value in choices.items()]
                for number, choices in OLD_CLOZE_2019_OPTIONS.items()
            })
            if not grid:
                issues.append("2019 cloze q1-4 option matrix not found")
        numbers = sorted(options_by_number)
        if expected_count and year < 2001 and len(numbers) != expected_count:
            issues.append(f"{year} cloze has {len(numbers)} parsed questions; directions specify {expected_count}")

    passage = clean_source(passage)
    if year not in OLD_CLOZE_BLANK_ANCHORS:
        passage, extra_anchor_issues = insert_cloze_anchors(passage, OLD_CLOZE_EXTRA_BLANK_ANCHORS.get(year, []), year)
        issues.extend(extra_anchor_issues)
        passage = cloze_answer_lines(passage, numbers)
    questions = []
    for number in numbers:
        if year == 1981:
            continue
        items = options_by_number.get(number, [])
        if len(items) != 4:
            issues.append(f"{year} cloze q{number}: expected four options, found {len(items)}")
        questions.append(question(f"{prefix}-{number}", number, "完形填空", "single_choice", f"第 {number} 空", options(items, f"{prefix}-{number}"), source_refs))
    if year != 1981 and not questions:
        questions = [question(f"{prefix}-1", 1, "完形填空", "short_answer", "第 1 空", source_refs=source_refs)]
    group = {"id": f"{prefix}-passage", "title": "完形填空", "presentation": "reading", "instructions": [], "stimulusBlocks": [text_block(passage)], "sharedOptions": [], "questions": questions}
    return directions, group, issues


def old_cloze_option_blocks(text: str, expected_numbers: list[int]) -> tuple[dict[int, list[dict[str, str]]], list[str]]:
    starts = list(re.finditer(r"(?m)^\s*(\d{1,2})\s*[.．、)]\s*(?=\[\s*A\s*[\]J)])", text, re.I))
    candidates = []
    for index, marker in enumerate(starts):
        number = int(marker.group(1))
        end = starts[index + 1].start() if index + 1 < len(starts) else len(text)
        segment = text[marker.end():end]
        labels = list(re.finditer(r"\[\s*([A-D])\s*[\]J)]", segment, re.I))
        if len(labels) < 4 or [item.group(1).upper() for item in labels[:4]] != list("ABCD"):
            continue
        parsed = []
        for choice_index, label_match in enumerate(labels[:4]):
            end_pos = labels[choice_index + 1].start() if choice_index + 1 < 4 else len(segment)
            text_value = segment[label_match.end():end_pos].strip(" \t\r\n,;")
            if not text_value:
                parsed = []
                break
            parsed.append({"label": label_match.group(1).upper(), "text": clean_source(text_value)})
        if len(parsed) == 4:
            candidates.append((number, parsed))
    runs: list[list[tuple[int, list[dict[str, str]]]]] = []
    for candidate in candidates:
        if not runs or candidate[0] != runs[-1][-1][0] + 1:
            runs.append([candidate])
        else:
            runs[-1].append(candidate)
    main_run = max(runs, key=lambda run: (len(run), run[-1][0])) if runs else []
    found = {number: items for number, items in main_run}
    issues = [f"cloze q{number}: no complete A-D options found" for number in expected_numbers if number not in found]
    return found, issues


def correct_cloze_source(exam_id: str, text: str) -> str:
    for pattern, replacement in CLOZE_SOURCE_FIXES.get(exam_id, []):
        text = re.sub(pattern, replacement, text, flags=re.I)
    return text


def split_matching_source(text: str, section: dict[str, Any]) -> tuple[str, str, list[dict[str, str]], dict[int, str]]:
    directions, remainder = split_directions(text)
    lower = directions.lower()
    wrong_order = "wrong order" in lower
    sequence = choice_sequence(remainder, "H") or choice_sequence(remainder, "G")
    names = matching_names(remainder, directions)
    if not sequence:
        return directions, clean_source(remainder), [], names

    shared = []
    trailing_context = ""
    options_at_start = sequence[0].start() < 160
    for index, match in enumerate(sequence):
        end = sequence[index + 1].start() if index + 1 < len(sequence) else len(remainder)
        body = remainder[match.end():end]
        body = re.split(r"(?im)\b(?:Section\s+(?:III|IV|V)|Part\s+C)\b", body, maxsplit=1)[0]
        if index == len(sequence) - 1:
            if wrong_order:
                order = re.search(r"(?m)(?:\b[A-H]\s*(?:→|->)\s*4[1-5]\s*[.．]|\b4[1-5]\s*[.．]\s*[_＿]{2,})", body)
                if order:
                    trailing_context = body[order.start():]
                    body = body[:order.start()]
            elif options_at_start:
                line_break = body.find("\n")
                if line_break >= 0:
                    trailing_context = body[line_break + 1:]
                    body = body[:line_break]
        for number, name in names.items():
            body = re.sub(rf"(?<!\w){number}\.\s*{re.escape(name)}\b", " ", body)
        body = re.sub(r"\s+", " ", clean_source(body)).strip(" .\t\n")
        if body:
            label = match.group("bracket") or match.group("plain")
            shared.append({"label": label.upper(), "text": body})

    if wrong_order:
        return directions, clean_source(trailing_context), shared, names

    before = remainder[:sequence[0].start()]
    after = trailing_context if options_at_start else remainder[sequence[-1].end():]
    if options_at_start:
        passage = after
    else:
        passage = before
    if names and re.search(r"left\s+column", directions, re.I):
        question_rows = list(re.finditer(r"(?<!\w)4[1-5]\.\s*[A-Z][A-Za-z’'-]+", passage))
        if len(question_rows) == 5 and question_rows[0].start() > 250:
            passage = passage[:question_rows[0].start()]
    return directions, clean_source(passage), shared, names


def translation_tasks(section: dict[str, Any], subject: str) -> tuple[str, list[tuple[int, str]]]:
    source = section.get("source", "")
    numbers = list(range(46, 51)) if subject == "英语一" else [46]
    markers = list(re.finditer(r"(?:\((4[6-9]|50)\)|（(4[6-9]|50)）|\b(4[6-9]|50)\))\s*", source))
    by_number = {}
    for index, marker in enumerate(markers):
        number = int(next(group for group in marker.groups() if group))
        end = markers[index + 1].start() if index + 1 < len(markers) else len(source)
        by_number[number] = clean_source(source[marker.end():end])
    return clean_source(source), [(number, by_number.get(number) or f"第 {number} 段") for number in numbers]


def writing_tasks(section: dict[str, Any]) -> list[tuple[int, str]]:
    source = clean_source(section.get("source", ""))
    source = re.split(r"(?im)^\s*\d{4}年考研英语.*?真题答案速查表\s*$", source, maxsplit=1)[0].strip()
    questions = [item for item in section.get("questions", []) if isinstance(item.get("number"), int)]
    if not questions:
        return [(1, source)]
    part_markers = list(re.finditer(r"(?im)^\s*P\s*art\s*([AB])\s*$", source))
    number_markers = [re.search(rf"(?m)^\s*{item['number']}\s*[.．、)]\s*Directions?\b", source, re.I) for item in questions]
    boundaries = [match.start() for match in number_markers if match]
    if len(boundaries) == len(questions):
        result = []
        for index, question_record in enumerate(questions):
            end = boundaries[index + 1] if index + 1 < len(boundaries) else len(source)
            result.append((question_record["number"], source[boundaries[index]:end].strip()))
        return result
    if len(part_markers) >= len(questions):
        return [(item["number"], source[part_markers[index].start():(part_markers[index + 1].start() if index + 1 < len(part_markers) else len(source))].strip()) for index, item in enumerate(questions)]
    return [(item["number"], f"第 {item['number']} 题写作任务") for item in questions]


def recent_paper(exam: dict[str, Any], manifest: dict[str, Any], source_root: Path) -> dict[str, Any]:
    set_id = f"kaoyan-{exam['id']}"
    refs = recent_source_refs(exam, manifest, source_root / "真题/2020-2026英语一二离线练习", source_root)
    paper_refs = refs[:1]
    sections_out = []
    raw_sections = exam["sections"]

    cloze = raw_sections[0]
    cloze_directions, _ = split_directions(cloze.get("directions", ""))
    cloze_passage_directions, cloze_passage = split_directions(cloze.get("passage", ""))
    if not cloze_directions:
        cloze_directions = cloze_passage_directions
    if not cloze_passage:
        cloze_passage = cloze.get("passage", "")
    cloze_passage = re.sub(r"(?is)^\s*Read\s+(?:the\s+)?following\s+text.*?\(\s*(?:\d\s*){1,3}points?\s*\)\s*", "", cloze_passage)
    cloze_passage = correct_cloze_source(exam["id"], cloze_passage)
    cloze_questions = []
    for item in cloze.get("questions", []):
        number = int(item["number"])
        choices = cloze_options(exam["id"], number, item.get("options", []), f"{set_id}-cloze-{number}")
        cloze_questions.append(question(f"{set_id}-cloze-{number}", number, "完形填空", "single_choice", item.get("stem") or f"第 {number} 题", choices, paper_refs))
    sections_out.append({
        "id": "cloze", "title": "完形填空", "sourceYear": str(exam["year"]),
        "instructions": [text_block(cloze_directions)] if cloze_directions else [], "layout": "split",
        "groups": [{"id": "cloze-passage", "title": "完形填空", "presentation": "reading", "instructions": [], "stimulusBlocks": [text_block(cloze_answer_lines(clean_source(cloze_passage), [int(item["number"]) for item in cloze.get("questions", [])]))], "sharedOptions": [], "questions": cloze_questions}],
    })

    reading = raw_sections[1]
    reading_groups = []
    for passage_index, passage in enumerate(reading.get("passages", []), start=1):
        qs = []
        for item in passage.get("questions", []):
            number = int(item["number"])
            qs.append(question(f"{set_id}-reading-{number}", number, "阅读理解", "single_choice", item.get("stem", ""), options(item.get("options", []), f"{set_id}-reading-{number}"), paper_refs))
        reading_groups.append({"id": f"reading-text-{passage_index}", "title": passage.get("title") or f"Text {passage_index}", "presentation": "reading", "instructions": [], "stimulusBlocks": [text_block(clean_source(passage.get("passage", "")))], "sharedOptions": [], "questions": qs})
    sections_out.append({"id": "reading-a", "title": "阅读理解 · Part A", "sourceYear": str(exam["year"]), "instructions": [text_block(clean_source(reading.get("directions", "")))], "layout": "split", "groups": reading_groups})

    part_b = raw_sections[2]
    matching_source = RECENT_NEW_TYPE_SOURCE_OVERRIDES.get(exam["id"], part_b.get("source", ""))
    matching_directions, matching_passage, shared_choices, names = split_matching_source(matching_source, part_b)
    lower_matching_directions = matching_directions.lower()
    if "wrong order" in lower_matching_directions:
        matching_prompt = "选择放入第 {number} 空的段落（A–H）。"
    elif "sentences have been removed" in lower_matching_directions:
        matching_prompt = "选择填入第 {number} 空的句子（A–G）。"
    elif "subheading" in lower_matching_directions:
        matching_prompt = "为第 {number} 段选择最合适的小标题。"
    elif "statement" in lower_matching_directions or "opinion" in lower_matching_directions:
        matching_prompt = "为第 {number} 题选择最合适的观点。"
    else:
        matching_prompt = "为第 {number} 题选择最合适的选项。"
    matching_questions = []
    for item in part_b.get("questions", []):
        number = int(item["number"])
        if number in names:
            prompt = names[number]
        elif "wrong order" in lower_matching_directions:
            prompt = "选择放入此空的段落"
        elif "sentences have been removed" in lower_matching_directions:
            prompt = "选择填入此空的句子"
        elif "subheading" in lower_matching_directions:
            prompt = "选择最合适的小标题"
        elif "statement" in lower_matching_directions or "opinion" in lower_matching_directions:
            prompt = "选择对应的观点"
        else:
            prompt = "选择最合适的选项"
        matching_question = question(f"{set_id}-new-type-{number}", number, "新题型", "shared_option_matching", prompt, source_refs=paper_refs)
        blank_id = f"{matching_question['id']}-blank"
        matching_question["blanks"] = [{"blankId": blank_id, "answerShape": "word"}]
        matching_question["promptBlocks"] = [{
            "type": "paragraph",
            "runs": [{"type": "text", "text": f"{prompt} "}, {"type": "blank", "blankId": blank_id}],
        }]
        matching_questions.append(matching_question)
    sections_out.append({
        "id": "new-type", "title": "新题型", "sourceYear": str(exam["year"]), "instructions": [], "layout": "split",
        "groups": [{"id": "new-type-matching", "title": "阅读理解 · Part B", "presentation": "reading", "instructions": [text_block(matching_directions)] if matching_directions else [], "stimulusBlocks": [text_block(matching_passage)] if matching_passage else [], "sharedOptions": options(shared_choices, f"{set_id}-new-type"), "sharedOptionsReusable": False, "questions": matching_questions}],
    })

    translation = raw_sections[3]
    translation_source, translation_labels = translation_tasks(translation, exam["subject"])
    extracted_translation = translation_items(translation_source)
    task_by_number = dict(extracted_translation or translation_labels)
    translation_direction, translation_body = split_directions(translation_source)
    trans_questions = [question(
        f"{set_id}-translation-{number}", number, "翻译", "translation",
        task_by_number.get(number, "请将上方英文短文翻译成中文。") if exam["subject"] == "英语一" else "请将下方英文短文翻译成中文。",
        source_refs=paper_refs,
    ) for number, _task in translation_labels]
    translation_stimulus = "" if len(extracted_translation) == len(translation_labels) else translation_body or translation_source
    sections_out.append({"id": "translation", "title": "翻译", "sourceYear": str(exam["year"]), "instructions": [], "layout": "split", "groups": [{"id": "translation-task", "title": "翻译", "presentation": "reading", "instructions": [text_block(translation_direction)] if translation_direction else [], "stimulusBlocks": [text_block(translation_stimulus)] if translation_stimulus else [], "sharedOptions": [], "questions": trans_questions}]})

    writing = raw_sections[4]
    tasks = writing_tasks(writing)
    overrides = WRITING_TASK_OVERRIDES.get(exam["id"], {})
    tasks = [(number, overrides.get(number, task)) for number, task in tasks]
    editable_visual_directions = (
        (r"\bbased on the picture below\b", "based on the following picture description"),
        (r"\bbased on the following picture below\b", "based on the following picture description"),
        (r"\bbased on the chart below\b", "based on the following chart data"),
        (r"\bbased on the following chart(?! data)\b", "based on the following chart data"),
        (r"\bbased on the charts below\b", "based on the following chart data"),
        (r"\bbased on the following table(?! data)\b", "based on the following table data"),
    )
    processed_tasks = []
    for number, task in tasks:
        task = re.sub(r"(?im)^\s*Part\s*[AB]\s*$", "", task).strip()
        for pattern, replacement in editable_visual_directions:
            task = re.sub(pattern, replacement, task, flags=re.I)
        processed_tasks.append((number, task))
    tasks = processed_tasks
    writing_questions = [question(f"{set_id}-writing-{number}", number, "写作", "essay", task, source_refs=paper_refs) for number, task in tasks]
    sections_out.append({"id": "writing", "title": "写作", "sourceYear": str(exam["year"]), "instructions": [], "layout": "split", "groups": [{"id": "writing-tasks", "title": "写作", "presentation": "reading", "instructions": [], "stimulusBlocks": [], "sharedOptions": [], "questions": writing_questions}]})

    warnings = exam.get("warnings", [])
    issues = ["答案与解析文件已登记来源，但尚未结构化到题目。"]
    expected_choices = 8 if "wrong order" in lower_matching_directions else 7
    if len(shared_choices) != expected_choices:
        issues.append(f"Part B 选项识别为 {len(shared_choices)} 项，应有 {expected_choices} 项；需复核原卷。")
    if warnings:
        issues.extend(["原始抽取存在需校对项。"])
    confidence = 0.78 if warnings else 0.88
    return {
        "schemaVersion": 2, "id": set_id, "kind": "paper", "title": f"{exam['year']}年考研{exam['subject']}真题",
        "year": str(exam["year"]), "region": exam["subject"], "variant": exam["subject"], "instructions": [],
        "sections": sections_out, "assetRefs": [], "sourceRefs": refs,
        "submissionMode": "whole-paper",
        "quality": {"structureStatus": "review_required", "structureConfidence": confidence, "issueCount": len(issues), "issues": issues},
    }


def docx_text(path: Path) -> str:
    document = Document(path)
    chunks = []
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            value = Paragraph(child, document).text.strip()
            if value:
                chunks.append(value)
        elif isinstance(child, CT_Tbl):
            table = Table(child, document)
            for row in table.rows:
                cells = [re.sub(r"\s+", " ", cell.text).strip() for cell in row.cells]
                line = "\t".join(value for value in cells if value)
                if line:
                    chunks.append(line)
    return "\n".join(chunks)


def file_text(path: Path) -> tuple[str, str, float]:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        return docx_text(path), "docx-xml", 0.95
    if suffix == ".doc":
        result = subprocess.run(["textutil", "-convert", "txt", "-stdout", str(path)], capture_output=True, text=True, check=True)
        return result.stdout, "docx-text", 0.82
    if suffix == ".pdf":
        doc = fitz.open(path)
        return "\n\n".join(page.get_text("text") for page in doc), "pdf-text", 0.9
    raise ValueError(f"Unsupported source: {path}")


YEAR_HEADING = re.compile(r"(?m)^\s*((?:19|20)\d{2})\s*年?[^\n]*(?:真题|试题|考试)[^\n]*$")


def split_papers(text: str, path: Path) -> list[tuple[int, str]]:
    matches = list(YEAR_HEADING.finditer(text))
    unique = []
    for match in matches:
        if not unique or match.group(1) != unique[-1][1]:
            unique.append((match.start(), match.group(1)))
    if len(unique) > 1:
        papers = []
        for index, (start, year) in enumerate(unique):
            end = unique[index + 1][0] if index + 1 < len(unique) else len(text)
            papers.append((int(year), text[start:end].strip()))
        return papers
    fallback = re.search(r"(?:19|20)\d{2}", path.name)
    return [(int(unique[0][1] if unique else fallback.group(0)), text)] if unique or fallback else []


def detect_category(line: str, current: str | None) -> str | None:
    value = re.sub(r"\s+", " ", line).strip().lower()
    if not value:
        return None
    section_heading = value.startswith("section") or value.startswith("part")
    standalone_heading = bool(re.fullmatch(r"(?:structure and vocabulary|vocabulary and structure|use of english|use of prepositions?|verb tenses?|verb forms?|sentence making|cloze(?: test)?|reading comprehension|english[-–— ]chinese translation|chinese[-–— ]english translation|translation|writing|error[- ]?(?:detection|correction))(?:\s*\([^)]*\))?", value))
    if not section_heading and not standalone_heading:
        return None
    if any(name in value for name in ("structure and vocabulary", "vocabulary and structure", "use of prepositions", "verb tenses", "verb forms", "sentence making")) or re.search(r"error[- ]?(?:detection|correction)", value):
        return "vocabulary"
    if "use of english" in value or "cloze test" in value or "cloze" in value or "完形填空" in value:
        return "cloze"
    if "reading comprehension" in value or "阅读理解" in value:
        return "reading"
    if "translation" in value or "翻译" in value or "英汉翻译" in value or "汉译英" in value:
        return "translation"
    if "writing" in value or "写作" in value:
        return "writing"
    if re.fullmatch(r"(?:part\s*)?b(?:\s*directions\s*[:：]?)?", value) or re.match(r"part\s*b\s*directions", value):
        if current == "reading":
            return "new-type"
    if re.fullmatch(r"(?:part\s*)?c(?:\s*directions\s*[:：]?)?", value) or re.match(r"part\s*c\s*directions", value):
        if current in ("reading", "new-type"):
            return "translation"
    return None


def paper_categories(text: str) -> dict[str, str]:
    lines = text.splitlines()
    active = None
    markers = []
    for index, line in enumerate(lines):
        category = detect_category(line, active)
        if category:
            active = category
            markers.append((index, category))
    result: dict[str, list[str]] = {}
    for marker_index, (start, category) in enumerate(markers):
        end = markers[marker_index + 1][0] if marker_index + 1 < len(markers) else len(lines)
        piece = "\n".join(lines[start:end]).strip()
        if category == "new-type" and is_translation_instruction(piece):
            category = "translation"
        if piece:
            result.setdefault(category, []).append(piece)
    return {category: "\n\n".join(pieces) for category, pieces in result.items()}


def strip_answer_key(text: str) -> str:
    """Keep the exam prompt and questions, never append the answer-key pages."""
    explicit = re.search(r"(?im)^\s*(?:参考答案|答案解析|试题答案|答案速查|answer\s*key|suggested\s*answers)\s*[:：]?\s*$", text)
    cut_at = explicit.start() if explicit else len(text)
    section_answer_heading = re.compile(r"(?im)^\s*section\s+(?:[ivxlcdm]+|\d+)\s*:\s*[^\n]*")
    for heading in section_answer_heading.finditer(text[:cut_at]):
        following = text[heading.end():cut_at]
        answer_rows = []
        expected = 1
        for row in following.splitlines()[:35]:
            match = re.match(r"^\s*(\d{1,3})\s*[.．、)]\s*(.*?)\s*$", row)
            if not match:
                if row.strip() and not answer_rows:
                    break
                continue
            if int(match.group(1)) != expected or len(match.group(2)) > 48 or len(match.group(2).split()) > 7:
                break
            answer_rows.append(match.group(2))
            expected += 1
            if len(answer_rows) >= 5:
                return text[:heading.start()]
    return text[:cut_at]


def visible_historical_text(text: str) -> str:
    text = re.sub(r"(?im)^\s*ANSWER\s*[:：].*$", "", text)
    text = re.sub(r"(?im)^\s*(?:参考答案|答案解析|试题答案|答案速查)\s*[:：]?.*$", "", text)
    text = re.sub(r"(?im)^\s*(?:考生注意事项|考生須知|考生须知).*$", "", text)
    return clean_source(text)


def question_numbers(category: str, text: str, year: int, subject: str) -> list[int]:
    numbers = []
    for match in re.finditer(r"(?m)^\s*(\d{1,3})\s*[.．、)]\s*(?=\S)", text):
        number = int(match.group(1))
        if number not in numbers:
            numbers.append(number)
    if category == "vocabulary":
        selected = [int(match.group(1)) for match in re.finditer(r"(?m)^\s*(\d{1,3})\s*[.．、)]\s+(?=\S)", text) if 1 <= int(match.group(1)) <= 60]
        return selected or list(range(1, 21))
    if category == "cloze":
        return list(range(1, 21))
    elif category == "reading":
        return [number for number in numbers if 11 <= number <= 50]
    elif category == "new-type":
        return list(range(41, 46))
    elif category == "translation":
        extracted = translation_items(text)
        if extracted:
            return [number for number, _item in extracted]
        return [46] if year >= 2010 and subject == "英语二" else list(range(46, 51))
    elif category == "writing":
        if year >= 2010 and subject == "英语二":
            return [47, 48]
        if year >= 2005:
            return [51, 52]
        if year >= 2001:
            return [46]
        if year >= 1998:
            return [36]
        selected = [number for number in numbers if 36 <= number <= 99]
        return selected[:1] or [36]
    else:
        selected = []
    if selected:
        return selected
    return selected


def numbered_choice_questions(text: str, numbers: list[int], source_ref: dict[str, Any], prefix: str, label: str) -> tuple[str, list[dict[str, Any]]]:
    """Move numbered A–E multiple-choice items out of the shared text into selectable question records."""
    text = unicodedata.normalize("NFKC", text)
    markers = list(re.finditer(r"(?m)^\s*(\d{1,3})\s*[.．、)]\s*(?=\S)", text))
    markers = [match for match in markers if int(match.group(1)) in numbers]
    if not markers:
        return "", []
    prelude = text[:markers[0].start()]
    prelude = re.sub(r"(?is)\bEXAMPLE\s*:.*$", "", prelude).strip()
    questions = []
    duplicate_counts: dict[int, int] = {}
    for index, marker in enumerate(markers):
        number = int(marker.group(1))
        duplicate_counts[number] = duplicate_counts.get(number, 0) + 1
        unique_id = f"{prefix}-{number}" if duplicate_counts[number] == 1 else f"{prefix}-{number}-part{duplicate_counts[number]}"
        end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
        block = clean_source(text[marker.end():end])
        formula_options = list(re.finditer(r"eq\s*\\o\((.*?),\s*\\s\\do14\(([A-E])\)\)", block, re.I))
        formula_labels = {match.group(2).upper() for match in formula_options}
        if (len(formula_options) == 4 and formula_labels == set("ABCD")) or (len(formula_options) == 5 and formula_labels == set("ABCDE")):
            stem = block
            option_items = []
            for option in formula_options:
                label_letter = option.group(2).upper()
                option_items.append({"label": label_letter, "text": clean_source(option.group(1))})
                stem = stem.replace(option.group(0), f"[{label_letter}]", 1)
            stem = clean_source(stem)
            questions.append(question(
                unique_id, number, label, "single_choice", stem,
                options(sorted(option_items, key=lambda item: item["label"]), unique_id), [source_ref],
            ))
            continue
        choice_markers = list(re.finditer(r"\[\s*([A-E])\s*(?:[\]J1Il)]|(?=\s))\s*", block))
        if not choice_markers:
            choice_markers = list(re.finditer(r"(?<![A-Za-z0-9])([A-E])\s*[.,)]\s+", block))
        if choice_markers:
            stem = clean_source(block[:choice_markers[0].start()])
            option_items = []
            for choice_index, option_marker in enumerate(choice_markers):
                choice_end = choice_markers[choice_index + 1].start() if choice_index + 1 < len(choice_markers) else len(block)
                option_text = clean_source(block[option_marker.end():choice_end])
                if option_text:
                    option_items.append({"label": option_marker.group(1), "text": option_text})
            labels = [item["label"] for item in option_items]
            expected_labels = set("ABCD") if len(option_items) == 4 else set("ABCDE")
            if len(option_items) in (4, 5) and set(labels) == expected_labels and stem:
                questions.append(question(
                    unique_id, number, label, "single_choice", stem,
                    options(sorted(option_items, key=lambda item: item["label"]), unique_id), [source_ref],
                ))
                continue
        stem = clean_source(block)
        if not stem:
            continue
        questions.append(question(
            unique_id, number, label, "short_answer", stem,
            source_refs=[source_ref],
        ))
    return prelude, questions


def unlabelled_2019_new_type_choices(text: str) -> tuple[str, list[dict[str, str]]]:
    """Recover A–G labels omitted by the 2019 DOCX export; the source PDF confirms their order."""
    directions, body = split_directions(text)
    lines = [clean_source(line) for line in body.splitlines()]
    lines = [line for line in lines if line and not re.fullmatch(r"[\s→\-–>_]+", line)]
    # The Word export splits paragraph D across a page break; the source PDF shows it as one paragraph.
    if len(lines) != 8:
        raise ValueError(f"2019 new-type DOCX should contain seven paragraphs plus a split paragraph D, found {len(lines)} lines")
    paragraphs = lines[:3] + [f"{lines[3]} {lines[4]}"] + lines[5:]
    if len(paragraphs) != 7:
        raise ValueError("2019 new-type paragraph reconstruction did not produce A–G")
    return directions, [{"label": letter, "text": paragraph} for letter, paragraph in zip("ABCDEFG", paragraphs)]


def unlabelled_reading_groups_2019(text: str, source_ref: dict[str, Any], prefix: str, label: str) -> list[dict[str, Any]]:
    """Restore 2019 Reading Part A's unnumbered question blocks from the source DOCX."""
    text = unicodedata.normalize("NFKC", text)
    headings = list(re.finditer(r"(?im)^\s*Text\s+([1-4])\s*$", text))
    if len(headings) != 4:
        raise ValueError(f"2019 reading should contain four Text passages, found {len(headings)}")

    groups = []
    for passage_index, heading in enumerate(headings):
        end = headings[passage_index + 1].start() if passage_index + 1 < len(headings) else len(text)
        lines = [clean_source(line) for line in text[heading.end():end].splitlines()]
        lines = [line for line in lines if line]
        if len(lines) < 25 or (len(lines) - 25) < 1:
            raise ValueError(f"2019 Text {heading.group(1)} does not contain a passage and five question/choice blocks")
        passage_lines, question_lines = lines[:-25], lines[-25:]
        questions = []
        base_number = 21 + (int(heading.group(1)) - 1) * 5
        for offset in range(5):
            block = question_lines[offset * 5:(offset + 1) * 5]
            if len(block) != 5 or len({item for item in block[1:] if item}) != 4:
                raise ValueError(f"2019 Text {heading.group(1)} question {base_number + offset} has an incomplete option block")
            number = base_number + offset
            question_id = f"{prefix}-{number}"
            questions.append(question(
                question_id, number, label, "single_choice", block[0],
                options([{"label": letter, "text": choice} for letter, choice in zip("ABCD", block[1:])], question_id),
                [source_ref],
            ))
        if any(len(item["options"]) != 4 for item in questions):
            raise ValueError(f"2019 Text {heading.group(1)} is missing one or more A–D options")
        groups.append({
            "id": f"{prefix}-text-{heading.group(1)}",
            "title": f"Text {heading.group(1)}",
            "presentation": "reading",
            "instructions": [],
            "stimulusBlocks": [text_block("\n\n".join(passage_lines))],
            "sharedOptions": [],
            "questions": questions,
        })
    return groups


def language_practice_groups(text: str, source_ref: dict[str, Any], prefix: str, label: str) -> list[dict[str, Any]]:
    """Split vocabulary/grammar sections into source-numbered, editable question groups."""
    heading_pattern = re.compile(r"(?im)^\s*Section\s+([IVXLCDM]+|\d+)\b[^\n]*")
    headings = list(heading_pattern.finditer(text))
    if not headings:
        headings = [re.match(r"", text)]
    pieces = []
    prefix_text = text[:headings[0].start()] if headings[0] else ""
    for index, heading in enumerate(headings):
        start = heading.start() if heading else 0
        end = headings[index + 1].start() if index + 1 < len(headings) and headings[index + 1] else len(text)
        segment = text[start:end].strip()
        if index == 0 and prefix_text.strip():
            segment = f"{prefix_text.strip()}\n\n{segment}"
        pieces.append((heading.group(0).strip() if heading else "", segment))

    groups = []
    marker_pattern = re.compile(r"(?m)^\s*(\d{1,3})\s*[.．、)]\s+(?=\S)")
    formula_pattern = re.compile(r"eq\s*\\o\((.*?),\s*\\s\\do14\(([A-E])\)\)", re.I)
    for section_index, (heading, segment) in enumerate(pieces, 1):
        markers = list(marker_pattern.finditer(segment))
        if not markers:
            continue
        prelude = segment[:markers[0].start()]
        if heading:
            prelude = re.sub(r"(?im)^\s*Section\s+(?:[IVXLCDM]+|\d+)\b[^\n]*\n?", "", prelude, count=1)
        instructions = clean_source(prelude)
        if "error-detection" in heading.lower() and len(markers) >= 12 and [int(item.group(1)) for item in markers[:3]] == [1, 2, 21]:
            examples = []
            for example_index, marker in enumerate(markers[:2]):
                end = markers[example_index + 1].start()
                examples.append(f"{marker.group(1)}. {clean_source(segment[marker.end():end])}")
            instructions = clean_source(f"{instructions}\n\n例题（原卷示例，不计入正式题目）：\n" + "\n".join(examples))
            markers = markers[2:]
        questions = []
        duplicate_numbers: dict[int, int] = {}
        for item_index, marker in enumerate(markers):
            number = int(marker.group(1))
            duplicate_numbers[number] = duplicate_numbers.get(number, 0) + 1
            unique_id = f"{prefix}-s{section_index}-{number}-{duplicate_numbers[number]}"
            end = markers[item_index + 1].start() if item_index + 1 < len(markers) else len(segment)
            block = clean_source(segment[marker.end():end])
            formula_items = list(formula_pattern.finditer(block))
            formula_labels = [item.group(2).upper() for item in formula_items]
            if len(formula_items) in (4, 5) and sorted(formula_labels) == list("ABCDE")[:len(formula_items)]:
                prompt = block
                for item in reversed(formula_items):
                    prompt = prompt[:item.start()] + f"[{item.group(2).upper()}: {clean_source(item.group(1))}]" + prompt[item.end():]
                choices = [{"label": letter, "text": f"第 {letter} 处划线部分"} for letter in "ABCDE"[:len(formula_items)]]
                questions.append(question(unique_id, number, label, "single_choice", clean_source(prompt), options(choices, unique_id), [source_ref]))
                continue

            choice_markers = list(re.finditer(r"\[([A-E])\]\s*", block))
            if choice_markers:
                choice_items = []
                for choice_index, choice_marker in enumerate(choice_markers):
                    choice_end = choice_markers[choice_index + 1].start() if choice_index + 1 < len(choice_markers) else len(block)
                    choice_text = clean_source(block[choice_marker.end():choice_end])
                    if choice_text:
                        choice_items.append({"label": choice_marker.group(1), "text": choice_text})
                labels = [item["label"] for item in choice_items]
                stem = clean_source(block[:choice_markers[0].start()])
                if len(choice_items) in (4, 5) and labels == list("ABCDE")[:len(choice_items)] and stem:
                    questions.append(question(unique_id, number, label, "single_choice", stem, options(choice_items, unique_id), [source_ref]))
                    continue

            prompt = clean_source(block)
            if prompt:
                questions.append(question(unique_id, number, label, "short_answer", prompt, source_refs=[source_ref]))

        if questions:
            section_label = re.sub(r"\s+", " ", heading).strip() if heading else f"Section {section_index}"
            groups.append({
                "id": f"{prefix}-section-{section_index}",
                "title": section_label,
                "presentation": "reading",
                "instructions": [text_block(instructions)] if instructions else [],
                "stimulusBlocks": [],
                "sharedOptions": [],
                "questions": questions,
            })
    return groups


def historical_sources(source_root: Path, archive: Path) -> list[dict[str, Any]]:
    sources = [
        archive / "1980—1985年历年考研英语真题+答案集合(无解析).doc",
        archive / "1986—1997年历年考研英语真题集.doc",
        *sorted((archive / "❤ 1998-2009年考研英语真题/1998-2009考研英语真题（Word版）").glob("*.doc")),
    ]
    english_one = archive / "2010-2021考研英语一真题（Word版）"
    english_two = archive / "考研英语二历年真题"
    sources.extend(sorted(path for path in english_one.glob("*.docx") if re.search(r"(?:201[0-9])", path.name) and "汇总" not in path.name))
    sources.extend(sorted(path for path in english_two.glob("*.docx") if re.search(r"201[0-9]", path.name)))
    gathered = []
    seen = set()
    for path in sources:
        if not path.exists():
            continue
        text, method, confidence = file_text(path)
        for year, paper in split_papers(text, path):
            if year < 1980 or year > 2019:
                continue
            english = "英语一/二通用" if year < 2010 else ("英语一" if path.parent == english_one else "英语二")
            key = (year, english)
            if key in seen:
                continue
            seen.add(key)
            gathered.append({"year": year, "subject": english, "text": paper, "path": path, "method": method, "confidence": confidence})
    return sorted(gathered, key=lambda item: (item["year"], item["subject"]))


def old_practice_sets(source_root: Path, archive: Path) -> list[dict[str, Any]]:
    papers = historical_sources(source_root, archive)
    categories: dict[str, list[dict[str, Any]]] = {key: [] for key in TYPE_NAMES}
    audit = {"papers": len(papers), "years": sorted({item["year"] for item in papers}), "unclassified": []}
    for paper in papers:
        sections = paper_categories(strip_answer_key(paper["text"]))
        if not sections:
            audit["unclassified"].append({"year": paper["year"], "subject": paper["subject"], "file": paper["path"].name})
        for category, raw in sections.items():
            if category not in categories:
                continue
            content = visible_historical_text(raw)
            numbers = question_numbers(category, content, paper["year"], paper["subject"])
            if not content:
                continue
            ref = source_ref(paper["path"], source_root, paper["method"], paper["confidence"])
            source_refs = [ref]
            if category == "translation" and paper["year"] == 2000 and paper["subject"] == "英语一/二通用":
                # The DOC export dropped the printed 33) marker; use the matching exam PDF page for this passage.
                pdf_path = paper["path"].parents[1] / "2000年考研英语真题.pdf"
                if not pdf_path.exists():
                    raise FileNotFoundError(f"2000 translation source PDF not found: {pdf_path}")
                pdf = fitz.open(pdf_path)
                page = next((item for item in pdf if "Under modem conditions" in item.get_text("text") and "Owing to" in item.get_text("text")), None)
                if page is None:
                    raise ValueError(f"2000 translation passage missing from source PDF: {pdf_path}")
                pdf_text = page.get_text("text")
                if not re.search(r"(?<!\d)33\s*\)", pdf_text):
                    raise ValueError(f"2000 translation q33 marker missing from source PDF: {pdf_path}")
                content = content.replace("Owing to the remarkable development", "33) Owing to the remarkable development", 1)
                source_refs.append(source_ref(pdf_path, source_root, "pdf-text", 0.95))
                numbers = question_numbers(category, content, paper["year"], paper["subject"])
            label = TYPE_LABELS[category]
            question_type = "essay" if category == "writing" else "translation" if category == "translation" else "short_answer"
            extracted_translation = translation_items(content) if category == "translation" else []
            translation_prompts = dict(extracted_translation)
            question_prefix = f"kaoyan-practice-{category}-{paper['year']}-{paper['subject'].replace('/', '-')}"
            group_instructions = []
            section_instructions = []
            group_stimulus = [text_block(content)]
            groups = None
            if category == "vocabulary":
                groups = language_practice_groups(content, ref, question_prefix, label)
                questions = [item for group in groups for item in group["questions"]]
            elif category == "cloze":
                directions, cloze_group, _cloze_issues = parse_old_cloze(content, paper["year"], paper["subject"], [ref], question_prefix)
                groups = [cloze_group]
                questions = cloze_group["questions"]
                section_instructions = [text_block(directions)] if directions else []
            elif category == "reading":
                directions, reading_body = split_directions(content)
                section_instructions = [text_block(directions)] if directions else []
                if paper["year"] == 2019 and paper["subject"] == "英语一":
                    groups = unlabelled_reading_groups_2019(reading_body, ref, question_prefix, label)
                else:
                    passage, questions = numbered_choice_questions(reading_body, numbers, ref, question_prefix, label)
                    expected_numbers = numbers
                    actual_numbers = [item["displayNumber"] for item in questions]
                    if not questions or actual_numbers != expected_numbers:
                        raise ValueError(
                            f"Reading parser mismatch for {paper['year']} {paper['subject']}: "
                            f"expected {expected_numbers}, parsed {actual_numbers}"
                        )
                    groups = [{
                        "id": f"{question_prefix}-passage",
                        "title": label,
                        "presentation": "reading",
                        "instructions": [],
                        "stimulusBlocks": [text_block(clean_source(passage))] if passage else [],
                        "sharedOptions": [],
                        "questions": questions,
                    }]
                questions = [item for group in groups for item in group["questions"]]
                if not questions or any(item["type"] != "single_choice" or len(item["options"]) not in (4, 5) for item in questions):
                    raise ValueError(f"Reading contains incomplete or non-selectable questions for {paper['year']} {paper['subject']}")
            elif category == "new-type":
                if paper["year"] == 2019 and paper["subject"] == "英语一":
                    directions, shared_choices = unlabelled_2019_new_type_choices(content)
                    passage = ""
                else:
                    directions, passage, shared_choices, _names = split_matching_source(content, {"source": content})
                if not shared_choices:
                    raise ValueError(f"New-type options were not recovered for {paper['year']} {paper['subject']}")
                fixed = {letter.upper() for letter in re.findall(r"(?i)paragraph\s+([A-G])\s+has\s+been\s+correctly\s+placed", directions)}
                fixed_pair = re.search(r"(?i)paragraphs\s+([A-G])\s+and\s+([A-G])\s+have\s+been\s+correctly\s+placed", directions)
                if fixed_pair:
                    fixed.update(letter.upper() for letter in fixed_pair.groups())
                if passage and re.search(r"wrong\s+order", directions, re.I):
                    fixed.update(re.findall(r"(?<![A-Za-z])([A-G])(?=\s*(?:→|->|$))", passage))
                shared_choices = [item for item in shared_choices if item["label"].upper() not in fixed]
                if len(shared_choices) < 5:
                    raise ValueError(f"New-type has only {len(shared_choices)} available options after fixed paragraphs for {paper['year']} {paper['subject']}")
                lower_directions = directions.lower()
                if "wrong order" in lower_directions:
                    prompt = "选择放入此空的段落"
                elif "subheading" in lower_directions or "headings" in lower_directions:
                    prompt = "选择最合适的小标题"
                elif "sentences have been removed" in lower_directions:
                    prompt = "选择填入此空的句子"
                else:
                    prompt = "选择此空最合适的段落"
                questions = []
                for number in numbers:
                    question_id = f"{question_prefix}-{number}"
                    item = question(question_id, number, label, "shared_option_matching", prompt, source_refs=[ref])
                    blank_id = f"{question_id}-blank"
                    item["blanks"] = [{"blankId": blank_id, "answerShape": "word"}]
                    item["promptBlocks"] = [{"type": "paragraph", "runs": [{"type": "text", "text": f"第 {number} 题　{prompt}："}, {"type": "blank", "blankId": blank_id}]}]
                    questions.append(item)
                group_instructions = [text_block(directions)] if directions else []
                groups = [{
                    "id": f"{question_prefix}-matching",
                    "title": f"{label} · Part B",
                    "presentation": "reading",
                    "instructions": group_instructions,
                    "stimulusBlocks": [text_block(clean_source(passage))] if passage else [],
                    "sharedOptions": options(shared_choices, f"{question_prefix}-options"),
                    "sharedOptionsReusable": False,
                    "questions": questions,
                }]
            elif category == "writing":
                tasks = writing_tasks({"source": content, "questions": [{"number": number} for number in numbers]})
                task_by_number = dict(tasks)
                if len(numbers) == 1 and (not tasks or task_by_number.get(numbers[0], "").startswith("第 ")):
                    task_by_number = {numbers[0]: clean_source(content)}
                figure = WRITING_FIGURE_TEXT.get(paper["year"])
                if figure:
                    figure_number, description = figure
                    task_by_number[figure_number] = f"{task_by_number.get(figure_number, clean_source(content)).rstrip()}\n\n原卷图示文字版：{description}"
                    visual_path = None
                    if paper["year"] == 1997:
                        visual_path = source_root / "真题/历年资料库/考研英语一历年真题/01、1980-2009年考研英语真题及解析(英语一二通用）(年代较久，仅供参考)/01、1998-2009真题部分（英语一二通用）/1980-1997年真题/1997年全国攻读硕士学位研究生入学考试英语试题.docx"
                    elif 1998 <= paper["year"] <= 2009:
                        visual_path = source_root / "真题/历年资料库/❤ 1998-2009年考研英语真题" / f"{paper['year']}年考研英语真题.pdf"
                    if visual_path and visual_path.exists() and visual_path != paper["path"]:
                        source_refs.append(source_ref(visual_path, source_root, "source-figure-review", 0.98))
                questions = [question(
                    f"{question_prefix}-{number}", number, label, "essay",
                    task_by_number.get(number, clean_source(content)), source_refs=source_refs,
                ) for number in numbers]
                section_instructions = []
                groups = [{
                    "id": f"{question_prefix}-writing",
                    "title": label,
                    "presentation": "reading",
                    "instructions": [],
                    "stimulusBlocks": [],
                    "sharedOptions": [],
                    "questions": questions,
                }]
            else:
                questions = [question(
                f"kaoyan-practice-{category}-{paper['year']}-{paper['subject'].replace('/', '-')}-{number}",
                number, label, question_type,
                translation_prompts.get(number, f"第 {number} 题（原题与选项见上方文字材料；客观题请输入选项字母。）"),
                source_refs=source_refs,
                ) for number in numbers]
            if not questions and category not in ("vocabulary", "cloze", "reading", "new-type"):
                questions = [question(f"kaoyan-practice-{category}-{paper['year']}-{paper['subject'].replace('/', '-')}-1", 1, label, question_type, "原题与作答要求见上方文字材料。", source_refs=[ref])]
            group_id = f"{category}-{paper['year']}-{paper['subject'].replace('/', '-')}-{paper['path'].stem}"
            title = f"{paper['year']}年考研{paper['subject']} · {label}"
            has_standalone_translation_items = bool(extracted_translation and re.search(r"(?m)^\s*\d{1,3}\s*[.．、)]\s*\S", content))
            categories[category].append({
                "id": f"{category}-{paper['year']}-{paper['subject'].replace('/', '-')}",
                "title": title,
                "sourceYear": str(paper["year"]), "instructions": section_instructions, "layout": "split",
                "groups": groups if groups is not None else [{"id": group_id, "title": title, "presentation": "reading", "instructions": group_instructions, "stimulusBlocks": group_stimulus if not (category == "translation" and has_standalone_translation_items) else [], "sharedOptions": [], "questions": questions}],
                "refs": source_refs,
            })
    outputs = []
    for category, sections in categories.items():
        if not sections:
            continue
        question_count = sum(len(group["questions"]) for section in sections for group in section["groups"])
        refs = {item["relativePath"]: item for section in sections for item in section["refs"]}
        stripped_sections = [{key: value for key, value in section.items() if key != "refs"} for section in sorted(sections, key=lambda item: (int(item["sourceYear"]), item["id"]), reverse=True)]
        set_id = f"kaoyan-practice-{category}"
        outputs.append({
            "set": {
                "schemaVersion": 2, "id": set_id, "kind": "practice", "title": f"考研英语 {TYPE_NAMES[category]}",
                "year": "1980–2019", "region": "全国", "variant": TYPE_NAMES[category], "instructions": [],
                "sections": stripped_sections, "assetRefs": [], "sourceRefs": list(refs.values()),
                "quality": {"structureStatus": "review_required", "structureConfidence": 0.75, "issueCount": 1, "issues": ["题目已按原卷题型汇总为文本；本批次尚未结构化答案与解析，请管理员校对。"]},
            },
            "questionCount": question_count,
            "papers": len(sections),
        })
    return outputs, audit


def summary(set_data: dict[str, Any], question_count: int) -> dict[str, Any]:
    return {
        "id": set_data["id"], "kind": set_data["kind"], "title": set_data["title"], "year": set_data["year"],
        "region": set_data["region"], "variant": set_data["variant"], "questionCount": question_count,
        "answeredCount": 0, "explanationCount": 0, "answerStatus": "none",
        "questionTypes": sorted({q["type"] for section in set_data["sections"] for group in section["groups"] for q in group["questions"]}),
        "href": f"/kaoyan/{set_data['id']}",
        "quality": {"structureStatus": set_data["quality"]["structureStatus"], "structureConfidence": set_data["quality"]["structureConfidence"], "issueCount": set_data["quality"]["issueCount"]},
    }


def count_questions(set_data: dict[str, Any]) -> int:
    return sum(len(group["questions"]) for section in set_data["sections"] for group in section["groups"])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, default=Path("/Volumes/My HDD3/备课/考研"))
    parser.add_argument("--output-root", type=Path, default=Path("public/kaoyan"))
    args = parser.parse_args()
    source_root = args.source_root.expanduser().resolve()
    offline = source_root / "真题/2020-2026英语一二离线练习"
    manifest_items = json.loads((offline / "source-manifest.json").read_text(encoding="utf-8"))
    manifest = {item["id"]: item for item in manifest_items}
    js = (offline / "questions-data.js").read_text(encoding="utf-8")
    match = re.search(r"window\.EXAM_DATA\s*=\s*(\[.*?\])\s*;?\s*$", js, re.S)
    if not match:
        raise ValueError("Could not find EXAM_DATA array in questions-data.js")
    exams = json.loads(match.group(1))
    output_root = args.output_root
    (output_root / "papers").mkdir(parents=True, exist_ok=True)
    (output_root / "practice").mkdir(parents=True, exist_ok=True)
    entries = []
    for exam in exams:
        data = recent_paper(exam, manifest, source_root)
        target = output_root / "papers" / f"{data['id']}.json"
        target.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        entries.append(summary(data, count_questions(data)))
    practices, audit = old_practice_sets(source_root, source_root / "真题/历年资料库")
    for record in practices:
        data = record["set"]
        target = output_root / "practice" / f"{data['id']}.json"
        target.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        entries.append(summary(data, record["questionCount"]))
    entries.sort(key=lambda item: (0 if item["kind"] == "practice" else 1, item["title"]))
    index = {"schemaVersion": 2, "generatedAt": "2026-10-24", "entries": entries}
    (output_root / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    audit.update({"recentPaperSets": len(exams), "practiceSets": len(practices), "practice": {item["set"]["id"]: {"papers": item["papers"], "questions": item["questionCount"]} for item in practices}})
    audit_path = Path("scripts/kaoyan/import-audit.json")
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paper_sets = [item for item in entries if item["kind"] == "paper"]
    if len(paper_sets) != 14 or {int(item["year"]) for item in paper_sets} != set(range(2020, 2027)):
        raise ValueError("The 2020–2026 English I/II paper coverage is incomplete")
    if audit["years"] != list(range(1980, 2020)) or audit["papers"] != 40 or audit["unclassified"]:
        raise ValueError("The 1980–2019 historical source inventory is incomplete or unclassified")
    for entry in entries:
        file_kind = "papers" if entry["kind"] == "paper" else "practice"
        data = json.loads((output_root / file_kind / f"{entry['id']}.json").read_text(encoding="utf-8"))
        if data["assetRefs"] or any(group.get("type") == "image" for section in data["sections"] for group in section["groups"] for block in group["stimulusBlocks"]):
            raise ValueError(f"Question images must be converted to text before import: {entry['id']}")
        question_ids = [q["id"] for section in data["sections"] for group in section["groups"] for q in group["questions"]]
        if len(question_ids) != len(set(question_ids)):
            raise ValueError(f"Duplicate question IDs in {entry['id']}")
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
