#!/usr/bin/env python3
"""Import New Concept English Book 2 from its Word text and lesson audio archive.

The Book 2 scan is the spelling/page authority. The Word file supplies the
printed reference translation and vocabulary; synchronized LRC files provide
sentence timings for locally generated practice clips.
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import shutil
import subprocess
import zipfile
from pathlib import Path


LESSON_COUNT = 96
LESSON_HEADER = re.compile(r"\bLesson\s+(\d+)\b", re.IGNORECASE)
TOKEN = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)*|\d+")
ABBREVIATIONS = {"mr.", "mrs.", "ms.", "dr.", "st.", "prof.", "sr.", "jr.", "etc."}

# Corrections checked against the printed PDF and, where useful, the supplied
# synchronized audio transcript. Each replacement must occur exactly once.
ENGLISH_CORRECTIONS: dict[int, tuple[tuple[str, str], ...]] = {
    4: (("he is fending this trip very exciting", "he is finding this trip very exciting"),),
    18: (("My dog had taken in into the garden.", "My dog had taken it into the garden."),),
    24: (("$50", "£50"),),
    39: (("hosptial", "hospital"),),
    46: (("woolen goods", "woollen goods"), ("$3,500", "£3,500"), ("$2,000", "£2,000")),
    55: (("two feel deep", "two feet deep"),),
    58: ((
        "The vicar has been asked to have the tree cut down, but so far he has refused. "
        "He has pointed out that the tree cut down, but so far he has refused. "
        "He has pointed out that the tree is a useful source",
        "The vicar has been asked to have the tree cut down, but so far he has refused. "
        "He has pointed out that the tree is a useful source",
    ),),
    59: (("sit outside our front gate and dark.", "sit outside our front gate and bark."),),
    63: (("Jeremy Hampden has a large circle of friends and if very popular", "Jeremy Hampden has a large circle of friends and is very popular"), (". he had included a large number", ". He had included a large number")),
    62: (("fighting the forest for nearly", "fighting the forest fire for nearly"),),
    69: (("pressed the brake pedal and we were both thrown forward", "pressed the brake pedal hard and we were both thrown forward"),),
    76: (("April lst", "April 1st"),),
    79: (("traveling", "travelling"),),
    80: (("nineteeth century", "nineteenth century"), ("traveling", "travelling")),
    95: (("Ambassador or Escalopia", "Ambassador of Escalopia"),),
}

CHINESE_CORRECTIONS: dict[int, tuple[tuple[str, str], ...]] = {
    39: (("手术中否成功", "手术是否成功"),),
    26: ((
        "昨天她到我房里来了。",
        "昨天她到我房里来了。“你在干什么？”她问。“我正在把这幅画挂到墙上，”我回答，“这是一幅新画。你喜欢吗？”她仔细地看了一会儿。“还可以，”她说，“不过它是不是挂倒了？”我又看了一遍。她说得对！画的确挂倒了！",
    ),),
    27: ((
        "但过了一阵子。天下起雨来，于是他们扑灭了篝火，钻进了帐篷。",
        "但过了一阵子，天开始下雨了。孩子们感到累了，于是他们扑灭篝火，钻进了帐篷。",
    ),),
    28: (("发生了磨擦", "发生了摩擦"),),
    29: (
        ("本.弗西特", "本·弗西特"),
        ("叫“皮勒特斯.波特“号", "叫“皮勒特斯·波特”号"),
        ("孤岛 -- 罗卡尔岛", "孤岛——罗卡尔岛"),
    ),
    34: (("结果他一再担心了", "现在他不再担心了"),),
    49: (("德黑兰的一个人年轻人由于对睡地板感到厌倦，于是积蓄多年买了一张真正的床。", "德黑兰有一个年轻人，由于厌倦了睡在地板上，积攒多年后买了一张真正的床。"),),
    50: (("最近我作了一次短途旅行", "最近我进行了一次短途旅行"),),
    54: (("当听出是海伦.贝茨的声音时，非常丧气。", "我听出是海伦·贝茨的声音时，顿时感到非常沮丧。"),),
    56: (("罗尔斯--罗伊斯", "罗尔斯·罗伊斯"),),
    58: (("“该诅咒的树”", "“受诅咒的树”"),),
    59: (
        ("由于邻居们对狗叫很有意见", "由于邻居们抱怨狗叫声太吵"),
        ("这之后他就坐下汪汪叫起来", "随后它就坐下来汪汪叫"),
    ),
    60: (("别林斯夫人", "别林斯基夫人"),),
    63: (("杰里米问他为何不喜欢", "杰里米问她为什么不喜欢"),),
    65: (("江泊阻碍了交通", "江伯阻碍了交通"),),
    66: (
        ("在瓦立斯岛毁。那是南太洋中", "在瓦利斯岛坠毁。那是南太平洋中"),
        ("该飞机装装配有4台罗尔斯-罗伊斯的默林发动机", "该飞机装有4台罗尔斯·罗伊斯默林发动机"),
        ("惊奇和兴奋 —— 当他们拆开包装箱时，他们发现第4台发动机就像蜂蜜一样甜 —— 发动机完好无损。", "惊奇和兴奋——他们拆开包装箱后发现，第4台发动机竟然完好无损，就像蜂蜜一样甜。"),
        ("一群蜜蜂把发动机当作了蜂房，发动机在蜂蜡中被完整地保存了下来。", "一群蜜蜂把发动机变成了蜂房，蜂蜡将它完好地保存了下来。"),
    ),
    67: (("活火山和探洞", "活火山和深洞"),),
    68: (("正好见到好。你不忙，是吗？", "直到看见了你。你不忙吧？"),),
    70: (("他踉跄地住旁边一闪", "他笨拙地向旁边一闪"), ("直到他的背影消逝", "直到醉汉走开")),
    71: (("格林尼治天文台的官员们每天两次派人矫正此钟", "格林尼治天文台的官员们每天检查大钟两次"), ("“大本”钟很多出差错", "“大本”钟很少出差错")),
    73: (("船在这段时间已经到了加。", "船在这段时间已经到了加来。"),),
    74: (("“此时，另外两位演员", "此时，另外两位演员"),),
    77: (("医生们从木乃伊身上取下一个切片，送去化验", "医生们从木乃伊身上取下一部分组织，送去化验"),),
    79: (("只是有一次把我吓坏了", "只有一次我感到害怕"),),
    80: (("钢和玻璃建成的", "铁和玻璃建成的"),),
    81: (
        ("来回走看", "来回走动"),
        ("他听得军营里面的喧闹声。", "他听到军营里传来的喧闹声。"),
        ("灯米通明", "灯火通明"),
    ),
    83: (("激进党的强烈反对者", "激进进步党的强烈反对者"), ("这此", "这些")),
    74: (
        ("－－除非你们不识字！", "——免得你们看不懂！"),
        ("我是这里的司法长官", "我是这里的警长"),
        ("司法官", "警长"),
    ),
    76: (("克拉布利亚的", "卡拉布里亚的"), ("克拉布利亚人", "卡拉布里亚人"), ("今天 -- 4月1日，星期四--", "今天——4月1日，星期四——")),
    78: (("一枝香烟", "一支香烟"),),
    86: (("方向盘脱手了", "方向盘竟从他手中脱落了"),),
    91: (("一个停机坪附近着了陆", "一个机场附近着了陆"),),
    95: (("我一定要把那个家伙打发走", "我一定要把那个家伙调走"),),
    43: (("R.E. 伯德", "伯德"), ("美国探险家 伯德", "美国探险家伯德")),
    46: (("看到的情景使吃惊", "他看到的情景使他大为吃惊"),),
    48: (("收藏的米柴盒", "收藏的火柴盒"),),
    61: (("有关行星和远距离星系", "有关恒星和遥远星系"),),
    64: (("英吉利海陕", "英吉利海峡"), ("干蒙", "加蒙")),
    75: (("她在雪地上踩出了“SOS”这3个字母。", "她在雪地上踩出了求救信号。"),),
    77: (("X光片", "射线片"),),
    93: (
        (
            "这座由雕像家奥古斯特.巴索尔地设计的巨大雕像是用10年时间雕像刻成的。",
            "这座由雕塑家奥古斯特.巴索尔地设计的巨大雕像花了10年才建成。",
        ),
        ("由艾菲尔特制的金属框架", "由埃菲尔建造的金属框架"),
        ("一个鸟上", "一个岛上"),
    ),
}


def read_source_text(path: Path) -> str:
    if path.suffix.lower() == ".txt":
        return path.read_text(encoding="utf-8")
    result = subprocess.run(
        ["textutil", "-convert", "txt", "-stdout", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def strip_layout_noise(lines: list[str]) -> list[str]:
    return [
        re.sub(r"\s+", " ", line).strip()
        for line in lines
        if line.strip() and not re.fullmatch(r"\s*\d{1,4}\s*", line)
    ]


def replace_once(value: str, old: str, new: str, lesson_no: int, field: str) -> str:
    count = value.count(old)
    if count != 1:
        raise ValueError(
            f"Lesson {lesson_no}: expected one {field} correction {old!r}, found {count}"
        )
    return value.replace(old, new, 1)


def split_sentences(value: str) -> list[str]:
    """Split printed prose while retaining its original punctuation and quotes."""
    sentences: list[str] = []
    start = 0
    index = 0
    while index < len(value):
        char = value[index]
        if char not in ".!?":
            index += 1
            continue
        if char == ".":
            token_start = index
            while token_start > start and value[token_start - 1].isalpha():
                token_start -= 1
            token = value[token_start : index + 1].lower()
            if token in ABBREVIATIONS or (index > 0 and index + 1 < len(value) and value[index - 1].isdigit() and value[index + 1].isdigit()):
                index += 1
                continue
        end = index + 1
        while end < len(value) and value[end] in "'’\"”’)]}」』":
            end += 1
        if end < len(value) and not value[end].isspace():
            index = end
            continue
        next_char = end
        while next_char < len(value) and value[next_char].isspace():
            next_char += 1
        lookahead = next_char
        while lookahead < len(value) and value[lookahead] in "'‘\"“":
            lookahead += 1
        reporting_clause = re.match(
            r"(?:I|he|she|they|we)\s+(?:said|asked|answered|replied|exclaimed|shouted|whispered|thought|added|continued)\b",
            value[lookahead:],
            re.IGNORECASE,
        )
        if reporting_clause:
            index = end
            continue
        if lookahead < len(value) and not value[lookahead].isupper() and not value[lookahead].isdigit():
            index = end
            continue
        sentence = value[start:end].strip()
        if sentence:
            sentences.append(sentence)
        start = next_char
        index = next_char
    tail = value[start:].strip()
    if tail:
        sentences.append(tail)
    return sentences


def lesson_chunks(text: str) -> list[tuple[int, str]]:
    matches = list(LESSON_HEADER.finditer(text))
    lessons = [(int(match.group(1)), match, matches[i + 1].start() if i + 1 < len(matches) else len(text))
               for i, match in enumerate(matches)]
    if [lesson_no for lesson_no, _, _ in lessons] != list(range(1, LESSON_COUNT + 1)):
        raise ValueError("Word source must contain exactly the sequential Lesson 1–96 headings")
    return [(lesson_no, text[match.end():end]) for lesson_no, match, end in lessons]


def parse_lesson(lesson_no: int, chunk: str) -> dict:
    lines = strip_layout_noise(chunk.splitlines())
    if len(lines) < 8:
        raise ValueError(f"Lesson {lesson_no}: source section is unexpectedly short")
    title, title_chinese = lines[0], lines[1]
    prompt_index = next((i for i, line in enumerate(lines) if line == "First listen and then answer the question."), None)
    vocabulary_index = next((i for i, line in enumerate(lines) if line.startswith("New words and expressions")), None)
    translation_index = next((i for i, line in enumerate(lines) if line.startswith("参考译文")), None)
    if None in (prompt_index, vocabulary_index, translation_index):
        raise ValueError(f"Lesson {lesson_no}: source section is missing a required marker")
    question_chinese_index = prompt_index + 1
    question_index = prompt_index + 2
    article_start = prompt_index + 3
    if question_chinese_index >= vocabulary_index or question_index >= vocabulary_index:
        raise ValueError(f"Lesson {lesson_no}: prompt and question are not in the expected order")

    article = " ".join(lines[article_start:vocabulary_index]).strip()
    for old, new in ENGLISH_CORRECTIONS.get(lesson_no, ()):
        expected_count = 2 if lesson_no == 24 and old == "$50" else 1
        if article.count(old) != expected_count:
            raise ValueError(
                f"Lesson {lesson_no}: expected {expected_count} English correction matches for {old!r}, "
                f"found {article.count(old)}"
            )
        article = article.replace(old, new)
    translation = "".join(lines[translation_index + 1 :]).strip()
    for old, new in CHINESE_CORRECTIONS.get(lesson_no, ()):
        expected_count = 2 if (lesson_no, old) in {(77, "X光片"), (78, "一枝香烟")} else 1
        if translation.count(old) != expected_count:
            raise ValueError(
                f"Lesson {lesson_no}: expected {expected_count} Chinese correction matches for {old!r}, "
                f"found {translation.count(old)}"
            )
        translation = translation.replace(old, new)
    # The Word conversion encodes Chinese transliteration separators as ASCII
    # periods in several names. Normalize only periods between Han characters.
    translation = re.sub(r"(?<=[\u3400-\u9fff])\.(?=[\u3400-\u9fff])", "·", translation)
    translation = re.sub(r"\s+", " ", translation).strip()
    if not article or not translation or not re.search(r"[\u3400-\u9fff]", translation):
        raise ValueError(f"Lesson {lesson_no}: article or Chinese reference translation is empty")
    latin_words = re.findall(r"[A-Za-z]+", translation)
    if latin_words:
        raise ValueError(f"Lesson {lesson_no}: unexpected Latin text in Chinese translation: {latin_words}")

    vocabulary = lines[vocabulary_index + 1 : translation_index]
    vocabulary = [line for line in vocabulary if line and not line.startswith("Notes on the text")]
    sentences = split_sentences(article)
    if not sentences:
        raise ValueError(f"Lesson {lesson_no}: article did not split into sentences")

    # Printed PDF page numbers include the opening pages and 14-page unit
    # dividers after Lessons 24, 48, and 72.
    source_pdf_page = 15 + 4 * (lesson_no - 1) + 14 * ((lesson_no - 1) // 24)
    return {
        "id": f"book2-lesson-{lesson_no:03d}",
        "bookCode": "new-concept-2",
        "lessonNo": lesson_no,
        "title": title,
        "titleChinese": title_chinese,
        "kind": "dialogue",
        "sourcePdfPage": source_pdf_page,
        "sourceNotesPdfPage": source_pdf_page + 1,
        "audioFile": f"{lesson_no:03d}.mp3",
        "audioPath": f"new-concept/book2/{lesson_no:03d}.mp3",
        "vocabulary": vocabulary,
        "exercise": [],
        "prompt": lines[question_index],
        "english": sentences,
        # Book 2 supplies one paragraph-level reference translation. Keeping it
        # intact avoids inventing sentence-level pairings absent from the source.
        "chinese": [translation],
        "fullChineseTranslation": translation,
    }


def parse_lrc(content: str) -> list[tuple[float, str]]:
    cues: list[tuple[float, str]] = []
    for line in content.replace("\ufeff", "").splitlines():
        match = re.match(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)", line)
        if not match:
            continue
        seconds = int(match.group(1)) * 60 + float(match.group(2))
        text = match.group(3).strip()
        if text:
            cues.append((seconds, text))
    return cues


def normalized_tokens(text: str) -> list[str]:
    return [token.group(0).lower().replace("’", "'") for token in TOKEN.finditer(text)]


def get_sentence_clip_ranges(
    lesson: dict, cues: list[tuple[float, str]], audio_duration: float
) -> list[tuple[float, float] | None]:
    cue_tokens: list[tuple[str, int, float]] = []
    for cue_index, (seconds, text) in enumerate(cues):
        cue_tokens.extend((token, cue_index, seconds) for token in normalized_tokens(text))
    source_tokens = normalized_tokens(" ".join(lesson["english"]))
    if len(source_tokens) < 5:
        return [None] * len(lesson["english"])

    anchor = None
    for i in range(len(cue_tokens) - 4):
        if [token for token, _, _ in cue_tokens[i : i + 5]] == source_tokens[:5]:
            anchor = i
            break
    if anchor is None:
        return [None] * len(lesson["english"])

    cue_tail = cue_tokens[anchor:]
    matcher = difflib.SequenceMatcher(
        None, source_tokens, [token for token, _, _ in cue_tail], autojunk=False
    )
    source_to_cue: dict[int, int] = {}
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            source_to_cue[block.a + offset] = block.b + offset

    ranges: list[tuple[float, float] | None] = []
    source_offset = 0
    last_start = -1.0
    for sentence in lesson["english"]:
        sentence_length = len(normalized_tokens(sentence))
        matched = [source_to_cue[index] for index in range(source_offset, source_offset + sentence_length)
                   if index in source_to_cue]
        source_offset += sentence_length
        if not matched or len(matched) < max(2, sentence_length * 0.45):
            ranges.append(None)
            continue
        first_cue_index = cue_tail[matched[0]][1]
        last_cue_index = cue_tail[matched[-1]][1]
        start = cue_tail[matched[0]][2]
        next_cue = next((cue_time for cue_time, _ in cues[last_cue_index + 1 :]
                         if cue_time > start), audio_duration)
        end = min(next_cue, audio_duration) - 0.025
        if start <= last_start or end - start < 0.35 or end - start > 20:
            ranges.append(None)
            continue
        ranges.append((max(0.0, start - 0.04), end))
        last_start = start
    return ranges


def generate_sentence_clips(lesson: dict, ranges: list[tuple[float, float] | None], audio_path: Path, output_dir: Path) -> int:
    jobs = [(index, clip) for index, clip in enumerate(ranges, start=1) if clip]
    if not jobs:
        return 0
    output_dir.mkdir(parents=True, exist_ok=True)
    for sentence_no, (start, end) in jobs:
        destination = output_dir / f"{sentence_no:02d}.mp3"
        subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-ss", f"{start:.3f}", "-i", str(audio_path), "-t", f"{end - start:.3f}",
                "-codec:a", "copy", str(destination),
            ],
            check=True,
        )
    return len(jobs)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--word", type=Path, required=True)
    parser.add_argument("--audio-zip", type=Path, required=True)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--audio-output", type=Path, required=True)
    parser.add_argument("--sentence-audio-output", type=Path, required=True)
    args = parser.parse_args()
    if not args.pdf.is_file():
        raise FileNotFoundError(args.pdf)
    text = read_source_text(args.word)
    lessons = [parse_lesson(lesson_no, chunk) for lesson_no, chunk in lesson_chunks(text)]

    args.audio_output.mkdir(parents=True, exist_ok=True)
    args.sentence_audio_output.mkdir(parents=True, exist_ok=True)
    manifest = []
    clip_count = 0
    with zipfile.ZipFile(args.audio_zip) as archive:
        names = archive.namelist()
        for lesson in lessons:
            prefix = f"{lesson['lessonNo']:02d}"
            mp3_member = next((name for name in names if name.startswith(prefix) and name.lower().endswith(".mp3")), None)
            lrc_member = next((name for name in names if name.startswith(prefix) and name.lower().endswith(".lrc")), None)
            if not mp3_member or not lrc_member:
                raise ValueError(f"Lesson {lesson['lessonNo']}: matching MP3 and LRC are required")
            audio_path = args.audio_output / lesson["audioFile"]
            with archive.open(mp3_member) as source, audio_path.open("wb") as destination:
                shutil.copyfileobj(source, destination)
            cues = parse_lrc(archive.read(lrc_member).decode("utf-8-sig", errors="replace"))
            duration_text = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(audio_path)],
                check=True,
                capture_output=True,
                text=True,
            ).stdout.strip()
            ranges = get_sentence_clip_ranges(lesson, cues, float(duration_text))
            clip_dir = args.sentence_audio_output / f"{lesson['lessonNo']:03d}"
            clip_count += generate_sentence_clips(lesson, ranges, audio_path, clip_dir)
            manifest.append({
                "lessonNo": lesson["lessonNo"],
                "sourcePdfPage": lesson["sourcePdfPage"],
                "sourceNotesPdfPage": lesson["sourceNotesPdfPage"],
                "audioSource": Path(mp3_member).name,
                "subtitleSource": Path(lrc_member).name,
                "sentenceCount": len(lesson["english"]),
                "sentenceClipCount": sum(item is not None for item in ranges),
                "englishWordCount": len(normalized_tokens(" ".join(lesson["english"]))),
            })
            if lesson["lessonNo"] % 12 == 0:
                print(f"processed_lessons={lesson['lessonNo']} sentence_clips={clip_count}", flush=True)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    book = {
        "bookCode": "new-concept-2",
        "title": "新概念英语第二册",
        "edition": "美音版",
        "sourcePdf": args.pdf.name,
        "sourceWord": args.word.name,
        "sourceAudioArchive": args.audio_zip.name,
        "sourceLabel": "依据第二册原书 PDF、课文 Word 与配套美音音频逐课整理",
        "pageMapNote": "课文页码：15 + 4×(课次−1) + 14×⌊(课次−1)/24⌋；下一页为课后注释页。",
        "lessons": lessons,
    }
    args.output.write_text(json.dumps(book, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    audit_path = args.output.with_name("book-2-source-audit.json")
    audit = {
        "pdf": args.pdf.name,
        "word": args.word.name,
        "audioArchive": args.audio_zip.name,
        "pageMap": "Lesson 1 starts on PDF page 15; lessons start every four pages, with 14 divider pages after Lessons 24, 48, and 72.",
        "pdfAudioAdjudications": [
            {"lessonNo": 24, "pdfPage": 107, "decision": "Use the printed PDF currency sign £50; the synchronized subtitle and initial import used $50."},
            {"lessonNo": 39, "pdfPage": 181, "decision": "Correct the Word typo 'hosptial' to the printed spelling 'hospital'."},
            {"lessonNo": 46, "pdfPage": 209, "decision": "Use the printed PDF currency signs £3,500 and £2,000; the Word transcription used dollar signs."},
            {"lessonNo": 63, "pdfPage": 291, "decision": "Correct the Word transcription 'if very popular' to the PDF's 'is very popular', and restore sentence-initial capitalization."},
            {"lessonNo": 25, "pdfPage": 125, "decision": "Keep the final question 'Do they speak English?' from the printed text; it is absent from the supplied LRC subtitles."},
            {"lessonNo": 64, "pdfPage": 295, "decision": "Keep the printed wording 'twenty-one-mile'; subtitles use the numeral 21."},
            {"lessonNo": 82, "pdfPage": 381, "decision": "Keep 'sent to a museum' from the printed text; subtitles mis-transcribe it as 'set'."},
            {"lessonNo": 84, "pdfPage": 389, "decision": "Keep 'letters' from the printed text; subtitles contain a spelling error."},
            {"lessonNo": 88, "pdfPage": 405, "decision": "Keep the printed word 'sixteen'; subtitles use the numeral 16."},
            {"lessonNo": 93, "pdfPage": 425, "decision": "Keep 'United States of America' from the printed text; subtitles abbreviate it to USA."},
            {"lessonNo": 95, "pdfPage": 433, "decision": "Use 'of Escalopia' from the printed text and subtitle; correct the Word source's 'or'."},
        ],
        "translationAdjudications": [
            {"lessonNo": 49, "pdfPage": 235, "decision": "Repair a duplicated noun phrase in the Word translation ('一个人年轻人')."},
            {"lessonNo": 50, "pdfPage": 239, "decision": "Polish the Word translation's malformed verb in the opening sentence."},
            {"lessonNo": 54, "pdfPage": 255, "decision": "Restore the omitted first-person subject when the narrator recognizes Helen Bates's voice."},
            {"lessonNo": 56, "pdfPage": 263, "decision": "Normalize the Chinese rendering of Rolls-Royce punctuation."},
            {"lessonNo": 58, "pdfPage": 271, "decision": "Correct the unnatural phrase describing the cursed tree."},
            {"lessonNo": 59, "pdfPage": 275, "decision": "Correct a mistranslated neighbor complaint and a pronoun error for Rex."},
            {"lessonNo": 60, "pdfPage": 279, "decision": "Make the fortune-teller's Chinese name consistent throughout the translation."},
            {"lessonNo": 39, "pdfPage": 181, "decision": "Correct the Word typo '中否' to '是否' in the operation question."},
            {"lessonNo": 43, "pdfPage": 197, "decision": "Remove a conversion-inserted space in the explorer's Chinese name."},
            {"lessonNo": 46, "pdfPage": 209, "decision": "Restore the missing subject and object in the sentence describing the worker's surprise."},
            {"lessonNo": 48, "pdfPage": 217, "decision": "Correct the Word typo '米柴盒' to '火柴盒'."},
            {"lessonNo": 63, "pdfPage": 291, "decision": "Correct the addressee to Jenny in the closing line, matching the dialogue context."},
            {"lessonNo": 65, "pdfPage": 299, "decision": "Keep the elephant's name consistently as Jumbo's Chinese transliteration 江伯."},
            {"lessonNo": 66, "pdfPage": 303, "decision": "Repair the island name, Pacific Ocean typo, duplicated word, and missing sense in the engine-as-honey metaphor."},
            {"lessonNo": 67, "pdfPage": 307, "decision": "Translate 'deep caves' as 深洞 rather than the activity 探洞."},
            {"lessonNo": 68, "pdfPage": 311, "decision": "Correct the corrupted pronoun in Nigel's line to 'you'."},
            {"lessonNo": 70, "pdfPage": 319, "decision": "Correct a character typo in the bullfight passage and clarify that the drunk moved away."},
            {"lessonNo": 71, "pdfPage": 323, "decision": "Restore 'rarely' rather than 'often' and translate the observatory's action as checking the clock."},
            {"lessonNo": 73, "pdfPage": 345, "decision": "Correct the port name Calais to its Chinese rendering 加来."},
            {"lessonNo": 74, "pdfPage": 349, "decision": "Remove an unmatched opening quotation mark before the narrator's transition."},
            {"lessonNo": 77, "pdfPage": 361, "decision": "Translate 'a section of the mummy' as a tissue sample rather than a sliced section."},
            {"lessonNo": 79, "pdfPage": 369, "decision": "Repair the Chinese clause describing the narrator's one frightening flight."},
            {"lessonNo": 80, "pdfPage": 373, "decision": "Correct Crystal Palace's building material from steel to iron, matching the English source."},
            {"lessonNo": 81, "pdfPage": 377, "decision": "Fix three obvious Word conversion character errors in the escape story."},
            {"lessonNo": 83, "pdfPage": 385, "decision": "Restore 'Progressive' in the party name and correct a transposed character in the final line."},
            {"lessonNo": 74, "pdfPage": 349, "decision": "Correct the sheriff's notice, title, and unmatched quotation mark in the Word translation."},
            {"lessonNo": 76, "pdfPage": 357, "decision": "Correct the Italian region's Chinese name and normalize the date punctuation."},
            {"lessonNo": 79, "pdfPage": 369, "decision": "Use the correct measure word for a cigarette."},
            {"lessonNo": 86, "pdfPage": 397, "decision": "Clarify that the speedboat's steering wheel came away from the driver."},
            {"lessonNo": 91, "pdfPage": 417, "decision": "Translate 'airfield' as airport rather than a runway apron."},
            {"lessonNo": 95, "pdfPage": 433, "decision": "Translate the Ambassador's joke about having the firefighter posted elsewhere as '调走'."},
            {"lessonNo": 26, "pdfPage": 129, "decision": "The Word reference translation stops after the sister enters the room; complete the remaining dialogue and ending from the full printed lesson context."},
            {"lessonNo": 27, "pdfPage": 133, "decision": "Restore the omitted sentence that the boys felt tired and correct the rain sentence punctuation against the printed passage."},
            {"lessonNo": 28, "pdfPage": 137, "decision": "Correct the Word typo '磨擦' to '摩擦'; normalize Chinese transliteration separators."},
            {"lessonNo": 29, "pdfPage": 141, "decision": "Repair the mismatched quotation marks around Pilatus Porter and normalize Chinese transliteration punctuation."},
            {"lessonNo": 34, "pdfPage": 161, "decision": "Correct the Word mistranslation '一再担心' to '不再担心', matching 'not worried anymore'."},
            {"lessonNo": 61, "pdfPage": 283, "decision": "The printed text says 'stars and distant galaxies'; correct the Word translation's '行星' to '恒星'."},
            {"lessonNo": 64, "pdfPage": 295, "decision": "Correct the Word translation's '英吉利海陕' to '英吉利海峡' for 'English Channel', and normalize the Gamond surname transcription."},
            {"lessonNo": 93, "pdfPage": 425, "decision": "Use the printed source's 'island', 'sculptor', and 'took ten years to complete' to correct the Word translation's '鸟上' and statue wording."},
        ],
        "lessons": manifest,
    }
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"imported={len(lessons)} audio=96 sentence_clips={clip_count} audit={audit_path}")


if __name__ == "__main__":
    main()
