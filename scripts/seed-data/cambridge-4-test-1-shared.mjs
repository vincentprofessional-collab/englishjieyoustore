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

    return {
      audioPath: `listening/ci4/t1/s${sectionNo}/sentences/ci4_t1_s${sectionNo}_${sentenceNoPadded}.mp3`,
      chineseText: row.chineseText,
      endMs: row.endMs,
      englishText: row.englishText,
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
