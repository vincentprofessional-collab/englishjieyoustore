import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const sourceDir = "/Volumes/My HDD3/备课/IELTS/剑桥雅思/剑桥雅思4/test1";

const answersByQuestionNo = {
  1: "shopping / variety of shopping",
  2: "guided tours",
  3: "more than 12 / over 12",
  4: "notice board",
  5: "13th February",
  6: "Tower of London",
  7: "Bristol",
  8: "American Museum",
  9: "student newspaper",
  10: "Yentob",
  11: "coal and firewood / coal, firewood / coal firewood",
  12: "local craftsmen",
  13: "160",
  14: "Woodside",
  15: "Ticket Office",
  16: "Gift Shop",
  17: "Workshop",
  18: "Showroom",
  19: "Café",
  20: "cottages",
  21: "A",
  22: "C",
  23: "E",
  24: "B",
  25: "G",
  26: "F",
  27: "C",
  28: "D",
  29: "A",
  30: "B",
  31: "cities / environment",
  32: "windy",
  33: "humid",
  34: "shady / shaded",
  35: "dangerous",
  36: "leaves",
  37: "ground",
  38: "considerably reduce / decrease / filter",
  39: "low",
  40: "space / room",
};

const questionTypesByQuestionNo = {
  21: "single_choice",
  22: "single_choice",
  23: "matching",
  24: "matching",
  25: "matching",
  26: "matching",
  27: "matching",
  28: "matching",
  29: "matching",
  30: "matching",
};

const sectionQuestionPrompts = {
  1: {
    1: "NOTES ON SOCIAL PROGRAMME\n\nVisit places which have:\n- historical interest\n- good ______",
    2: "Visit places which have:\n- ______",
    3: "Note: special trips organised for groups of ______ people",
    4: "To reserve a seat: sign name on the ______ 3 days in advance",
    5: "Complete the table.\nPlace: St Ives\nDate: ______\nNumber of seats: 16\nOptional extra: Hepworth Museum",
    6: "Complete the table.\nPlace: London\nDate: 16th February\nNumber of seats: 45\nOptional extra: ______",
    7: "Complete the table.\nPlace: ______\nDate: 3rd March\nNumber of seats: 18\nOptional extra: S.S. Great Britain",
    8: "Complete the table.\nPlace: Bath\nDate: 23rd March\nNumber of seats: 16\nOptional extra: ______",
    9: "For further information: read the ______",
    10: "For further information: see Social Assistant Jane ______",
  },
  2: {
    11: "Riverside Industrial Village: question 11",
    12: "Riverside Industrial Village: question 12",
    13: "Riverside Industrial Village: question 13",
    14: "Riverside Industrial Village map: question 14",
    15: "Riverside Industrial Village map: question 15",
    16: "Riverside Industrial Village map: question 16",
    17: "Riverside Industrial Village map: question 17",
    18: "Riverside Industrial Village map: question 18",
    19: "Riverside Industrial Village map: question 19",
    20: "Riverside Industrial Village: question 20",
  },
  3: {
    21: "Course discussion: question 21",
    22: "Course discussion: question 22",
    23: "Course discussion: question 23",
    24: "Course discussion: question 24",
    25: "Course discussion: question 25",
    26: "Course discussion: question 26",
    27: "Course discussion: question 27",
    28: "Course discussion: question 28",
    29: "Course discussion: question 29",
    30: "Course discussion: question 30",
  },
  4: {
    31: "Urban landscape lecture: question 31",
    32: "Urban landscape lecture: question 32",
    33: "Urban landscape lecture: question 33",
    34: "Urban landscape lecture: question 34",
    35: "Urban landscape lecture: question 35",
    36: "Urban landscape lecture: question 36",
    37: "Urban landscape lecture: question 37",
    38: "Urban landscape lecture: question 38",
    39: "Urban landscape lecture: question 39",
    40: "Urban landscape lecture: question 40",
  },
};

const sectionTitles = {
  1: "Section 1 - Notes on Social Programme",
  2: "Section 2 - Riverside Industrial Village",
  3: "Section 3 - Course Discussion",
  4: "Section 4 - Urban Landscape",
};

const transcriptCorrections = {
  1: {
    2: {
      englishText: "I understand that the school organises ... um, trips to different...",
      chineseText: "男：我知道学校会组织……嗯，前往不同地方的旅行。",
    },
    4: {
      englishText:
        "What sort of places? Well, obviously, it varies, but always places of historical interest",
      chineseText: "男：去什么样的地方呢？女：嗯，显然地点各不相同，但总是选择具有历史意义的地方",
    },
    6: {
      chineseText:
        "然后我们会选择那些有导游讲解的地方，因为这样能让参观有一个明确的重点",
    },
    7: {
      englishText:
        "for the visit. Do you travel far? Well, we're lucky here, obviously, because we're able to say that",
      chineseText: "。男：你们会去很远吗？女：嗯，我们这里很幸运，因为可以说",
    },
    9: {
      englishText: "Again, it varies between five and fifteen pounds a head, depending on distance.",
      chineseText: "费用也各不相同，每人5到15英镑，具体取决于距离。",
    },
    14: {
      englishText: "Oh, yes. And how do we reserve a place?",
      chineseText: "男：哦，好的。那么我们要怎么预订位置呢？",
    },
    21: {
      englishText: "Questions 5 to 10.",
      chineseText: "第5至10题。",
    },
    24: {
      englishText: "But we have confirmed the dates and planned the optional extra visits,",
    },
    26: {
      englishText: "Oh, that's all right. If you can just give me some idea of the weekend ones,",
    },
    27: {
      englishText: "so I can, you know, work out when to see friends, etc.",
      chineseText: "这样我就能安排什么时间去见朋友之类的。",
    },
    38: {
      englishText: "Where?",
      chineseText: "男：哪里？",
    },
    44: {
      englishText: "We're going to Salisbury on the 18th of March.",
      chineseText: "女：我们3月18日要去索尔兹伯里。",
    },
    51: {
      englishText: "And that's in the sixteen-seater minibus.",
      chineseText: "女：这次乘坐的是一辆16座的小型巴士。",
    },
    57: {
      chineseText: "女：很乐意帮忙。",
    },
    65: {
      englishText: "Thank you very much for all your help.",
      chineseText: "男：非常感谢你的帮助。",
    },
    67: {
      chineseText: "女：祝你旅途愉快。",
    },
  },
  2: {
    11: {
      englishText:
        "and some of the water wheels were first established in the twelfth century, would you believe?",
      chineseText: "有些水车早在12世纪就建成了，你们能相信吗？",
    },
    13: {
      englishText:
        "By the seventeenth and eighteenth centuries, the region's rivers supported more than 160 water mills,",
    },
    14: {
      chineseText: "其中许多水磨一直运行到19世纪。",
    },
    18: {
      chineseText: "这就是这里的历史。",
    },
    20: {
      chineseText: "或者阅读我们这本内容详尽的参观指南。",
    },
    26: {
      englishText: "running along the bottom is Woodside Road. Got it?",
    },
    31: {
      englishText: "In front of us is the",
      chineseText: "在我们前面是",
    },
    32: {
      englishText: "car park.",
      chineseText: "停车场。",
    },
    33: {
      englishText: "As you can see,",
      chineseText: "如你们所见，",
    },
    34: {
      englishText: "to the left by the entry gate is the gift shop.",
      chineseText: "左边入口大门旁是礼品店。",
    },
    39: {
      englishText: "That's where the furnace is,",
      chineseText: "熔炉就设在那里，",
    },
    44: {
      englishText:
        "where samples of all the tools that were made through the ages are on display.",
      chineseText: "那里陈列着各个时代制造的工具样品。",
    },
    50: {
      chineseText: "不过那里确实供应很不错的传统英式茶点。",
    },
  },
  3: {
    5: {
      englishText:
        "I'm having a bit of trouble with the second assignment, and it's due in twelve days.",
      chineseText: "梅兰妮：我的第二项作业遇到了一些困难，而且12天后就要交了。",
    },
    7: {
      chineseText: "梅兰妮：嗯，这是问题的一部分。我还一直很难借到那些书。",
    },
    11: {
      englishText: "You thought you might get an extension of time to finish your assignment for me?",
      chineseText: "约翰逊博士：你是想申请延期完成我这门课的作业？",
    },
    12: {
      englishText: "If that's possible, but I don't know...",
      chineseText: "梅兰妮：如果可以的话，不过我不知道……",
    },
    13: {
      chineseText:
        "约翰逊博士：可以，但通常只有出于医疗或其他特殊困难，才会批准延期。",
    },
    16: {
      englishText: "I got 87 per cent.",
      chineseText: "梅兰妮：我得了87%。",
    },
    23: {
      chineseText: "约翰逊博士：那么阅读材料呢？你看过清单里列的期刊文章了吗？",
    },
    29: {
      englishText:
        "You should also read the article by Jackson, but just look at the part on the research methodology, how they did it.",
    },
    40: {
      chineseText: "约翰逊博士：文章不差，也能提供一点帮助，但帮助不大。",
    },
    41: {
      englishText: "Now listen and answer Questions 28 to 30.",
      chineseText: "现在请听录音并回答第28至30题。",
    },
    44: {
      englishText:
        "What seems to be the problem? It's just the bar graph showing reasons why people change where they live.",
      chineseText: "约翰逊博士：问题在哪里呢？这只是一张条形图，展示人们搬家的原因。",
    },
    52: {
      englishText: "Okay. Proximity to the city is an issue.",
      chineseText: "梅兰妮：好的，离城市近是一个因素。",
    },
  },
  4: {
    15: {
      chineseText: "高层建筑使地面风力更大，是因为高度越高，风速就越快。",
    },
    19: {
      chineseText: "建筑密集区的另一个问题是，高层建筑会加剧交通噪音。",
    },
    20: {
      chineseText:
        "在道路一侧种植一条林带，可以让环境安静一些，但大部分车辆噪音仍会穿过树林。",
    },
    25: {
      chineseText: "因此，要在当地景观中为树木安排合适的位置可能并不容易。",
    },
    28: {
      englishText:
        "If you have the chance of knocking buildings down and replacing them, then suddenly you can start looking at different ways to design the streets and to introduce...",
      chineseText:
        "如果有机会拆除并重建建筑物，你就可以开始考虑采用不同的街道设计方式，并引入……（声音渐弱）",
    },
  },
};

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function readDocxParagraphs(filePath) {
  const xml = execFileSync("unzip", ["-p", filePath, "word/document.xml"], {
    encoding: "utf8",
  });

  return [...xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)]
    .map((paragraphMatch) =>
      [...paragraphMatch[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((textMatch) => decodeXmlEntities(textMatch[1]))
        .join(""),
    )
    .map(cleanText)
    .filter(Boolean);
}

function timecodeToMs(value) {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) {
    throw new Error(`Invalid SRT timecode: ${value}`);
  }

  const [, hours, minutes, seconds, milliseconds] = match.map(Number);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}

function parseSrtCues(sectionNo) {
  const srtPath = path.join(sourceDir, `4test1_section${sectionNo}.srt`);
  const rawSrt = readFileSync(srtPath, "utf8").replace(/\r/g, "");

  return rawSrt
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const sentenceNo = Number(lines[0]);
      const timeMatch = lines[1]?.match(
        /^(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})$/,
      );

      if (!Number.isInteger(sentenceNo) || !timeMatch) {
        throw new Error(`Invalid SRT block in section ${sectionNo}: ${block}`);
      }

      return {
        sentenceNo,
        englishText: cleanText(lines.slice(2).join(" ")),
        startMs: timecodeToMs(timeMatch[1]),
        endMs: timecodeToMs(timeMatch[2]),
      };
    });
}

function inferSpeakerFromChinese(chineseText) {
  const hasMan = /男[:：]|约翰逊博士[:：]/.test(chineseText);
  const hasWoman = /女[:：]|梅兰妮[:：]/.test(chineseText);

  if (hasMan && !hasWoman) {
    return "man";
  }

  if (hasWoman && !hasMan) {
    return "woman";
  }

  return null;
}

function normalizeForMatch(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/…/g, " ")
    .replace(/etcetera/g, "etc")
    .replace(/s\.s\./g, "ss")
    .replace(/[^a-z0-9']+/g, " ")
    .trim();
}

function wordsForMatch(value) {
  return normalizeForMatch(value)
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

function scoreWindow(cueText, pairs) {
  const cueWords = wordsForMatch(cueText);
  const pairWords = new Set(wordsForMatch(pairs.map((pair) => pair.englishText).join(" ")));

  if (cueWords.length === 0 || pairWords.size === 0) {
    return 0;
  }

  return cueWords.filter((word) => pairWords.has(word)).length / cueWords.length;
}

function chooseTranslationWindow(cue, translationPairs, searchStartIndex) {
  let best = {
    endIndex: searchStartIndex,
    score: -1,
    startIndex: searchStartIndex,
  };

  const maxStartIndex = Math.min(translationPairs.length - 1, searchStartIndex + 5);
  for (let startIndex = searchStartIndex; startIndex <= maxStartIndex; startIndex += 1) {
    const maxEndIndex = Math.min(translationPairs.length - 1, startIndex + 2);
    for (let endIndex = startIndex; endIndex <= maxEndIndex; endIndex += 1) {
      const score = scoreWindow(cue.englishText, translationPairs.slice(startIndex, endIndex + 1));
      if (score > best.score) {
        best = { endIndex, score, startIndex };
      }
    }
  }

  return best;
}

function parseTimedBilingualDocx(paragraphs) {
  const rows = [];

  for (let index = 0; index < paragraphs.length; index += 4) {
    const sentenceNo = Number(paragraphs[index]);
    const timeMatch = paragraphs[index + 1]?.match(
      /^(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})$/,
    );

    if (!Number.isInteger(sentenceNo) || !timeMatch || !paragraphs[index + 2]) {
      return null;
    }

    rows.push({
      chineseText: cleanText(paragraphs[index + 3]),
      endMs: timecodeToMs(timeMatch[2]),
      englishText: cleanText(paragraphs[index + 2]),
      sentenceNo,
      speaker: inferSpeakerFromChinese(paragraphs[index + 3]),
      startMs: timecodeToMs(timeMatch[1]),
    });
  }

  return rows;
}

function parseAlternatingBilingualDocx(paragraphs) {
  const pairs = [];

  for (let index = 0; index < paragraphs.length - 1; index += 1) {
    const englishMatch = paragraphs[index].match(/^(M|W):\s*(.+)$/);
    if (!englishMatch) {
      continue;
    }

    const chineseMatch = paragraphs[index + 1].match(/^(男|女)：\s*(.+)$/);
    if (!chineseMatch) {
      continue;
    }

    pairs.push({
      chineseText: cleanText(chineseMatch[2]),
      englishText: cleanText(englishMatch[2]),
      speaker: englishMatch[1] === "M" ? "man" : "woman",
    });
  }

  return pairs;
}

function buildUntimedSectionTranscript(sectionNo, paragraphs) {
  const srtCues = parseSrtCues(sectionNo);
  const translationPairs = parseAlternatingBilingualDocx(paragraphs);
  let searchStartIndex = 0;

  return srtCues.map((cue) => {
    const window = chooseTranslationWindow(cue, translationPairs, searchStartIndex);
    const matchedPairs = translationPairs.slice(window.startIndex, window.endIndex + 1);
    const speakers = Array.from(new Set(matchedPairs.map((pair) => pair.speaker)));

    searchStartIndex = Math.max(window.startIndex, window.endIndex - 1);

    return {
      ...cue,
      chineseText: matchedPairs.map((pair) => pair.chineseText).join(" / "),
      speaker: speakers.length === 1 ? speakers[0] : null,
    };
  });
}

export function buildTranscriptSentences(sectionNo) {
  const docxPath = path.join(sourceDir, `4test1_section${sectionNo}_双语对照.docx`);
  const paragraphs = readDocxParagraphs(docxPath);
  const timedRows = parseTimedBilingualDocx(paragraphs);
  const rows = timedRows ?? buildUntimedSectionTranscript(sectionNo, paragraphs);

  return rows.map((row) => {
    const sentenceNoPadded = String(row.sentenceNo).padStart(3, "0");
    const correction = transcriptCorrections[sectionNo]?.[row.sentenceNo] ?? {};

    return {
      audioPath: `listening/ci4/t1/s${sectionNo}/sentences/ci4_t1_s${sectionNo}_${sentenceNoPadded}.mp3`,
      chineseText: correction.chineseText ?? row.chineseText,
      endMs: row.endMs,
      englishText: correction.englishText ?? row.englishText,
      sentenceNo: row.sentenceNo,
      speaker: row.speaker,
      startMs: row.startMs,
    };
  });
}

function answerFor(questionNo) {
  const rawAnswer = answersByQuestionNo[questionNo];
  if (!rawAnswer) {
    throw new Error(`Missing answer for question ${questionNo}.`);
  }

  const values = rawAnswer
    .split(/\s*(?:\/|、)\s*/u)
    .map(cleanText)
    .filter(Boolean);

  return {
    answerText: values[0],
    variants: values.slice(1),
  };
}

export function fillQuestion(sectionNo, questionNo) {
  return {
    questionNo,
    questionType: questionTypesByQuestionNo[questionNo] ?? "fill_blank",
    promptText: sectionQuestionPrompts[sectionNo]?.[questionNo] ?? `Question ${questionNo}`,
    ...answerFor(questionNo),
  };
}

export function buildSectionSeed(sectionNo) {
  const firstQuestionNo = (sectionNo - 1) * 10 + 1;

  return {
    book: {
      code: "cambridge-4",
      isPublished: true,
      sourceType: "cambridge",
      title: "Cambridge IELTS 4",
    },
    questions: Array.from({ length: 10 }, (_, index) =>
      fillQuestion(sectionNo, firstQuestionNo + index),
    ),
    section: {
      fullAudioPath: `listening/ci4/t1/s${sectionNo}/full.mp3`,
      questionCount: 10,
      questionImagePath: `listening/ci4/t1/s${sectionNo}/questions/t1_s${sectionNo}_1.png`,
      sectionNo,
      timeLimitSeconds: 600,
      title: sectionTitles[sectionNo] ?? `Section ${sectionNo}`,
    },
    test: {
      isPublished: true,
      testNo: 1,
      title: "Test 1",
    },
    transcriptSentences: buildTranscriptSentences(sectionNo),
  };
}
