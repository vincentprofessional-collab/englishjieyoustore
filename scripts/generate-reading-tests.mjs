import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const cambridgeRoot = "/Users/shidianjin/Documents/留学考试-雅思/剑桥雅思";
const outputPath = path.resolve(
  repoRoot,
  process.env.READING_OUTPUT ?? "src/lib/ielts/generated-reading-tests.json",
);
const ocrCacheDir = path.join(repoRoot, "tmp/reading-import");
const books = parseNumberSelection(process.env.READING_BOOKS) ?? Array.from({ length: 18 }, (_, index) => index + 4);
const testsToGenerate = parseNumberSelection(process.env.READING_TESTS) ?? [1, 2, 3, 4];
const minGeneratedTests = Number(process.env.READING_MIN_TESTS ?? 60);
const manualTestIds = new Set(["cambridge-4-test-1", "cambridge-21-test-1"]);
const knownPassageTitles = new Map([
  ["cambridge-4-test-2-part1", "Lost for Words"],
  ["cambridge-4-test-2-part2", "Alternative Medicine in Australia"],
  ["cambridge-4-test-2-part3", "Play Is a Serious Business"],
  ["cambridge-4-test-3-part1", "Micro-Enterprise Credit for Street Youth"],
  ["cambridge-4-test-3-part2", "Volcanoes - earth-shattering news"],
  ["cambridge-4-test-3-part3", "Obtaining Linguistic Data"],
  ["cambridge-4-test-4-part1", "How much higher? How much faster?"],
  ["cambridge-4-test-4-part2", "The Nature and Aims of Archaeology"],
  ["cambridge-4-test-4-part3", "The Problem of Scarce Resources"],
]);
const knownPassageTextReplacements = new Map([
  [
    "cambridge-4-test-2-part2",
    [[/^\s*ALTERNATIVE MEDICINE IN AUSTRALI\s*$/gim, ""]],
  ],
  [
    "cambridge-4-test-3-part2",
    [
      [/^\s*Volcanoes-\s*$/gim, ""],
      [/^\s*earth-shattering\s*$/gim, ""],
      [/^\s*news\s*$/gim, ""],
    ],
  ],
  [
    "cambridge-4-test-4-part1",
    [
      [/^\s*How\s+·muc~:.*faster\?\s*$/gim, ""],
      [/^\s*\d+\s*,\.\s*\/'.*$/gim, ""],
      [/^\s*\d+\s*,.*~.*$/gim, ""],
    ],
  ],
  [
    "cambridge-4-test-4-part2",
    [
      [/^\s*~~~\s*\.?\s*$/gim, ""],
      [/^\s*VH E NA"TW\(\{E\s*$/gim, ""],
      [/^\s*AND AIMS OF\s*$/gim, ""],
      [/^\s*ARCHAEOlOGY\s*$/gim, ""],
    ],
  ],
  [
    "cambridge-4-test-4-part3",
    [
      [/^\s*The\s+Problem\s+of\s*$/gim, ""],
      [/^\s*Scarce\s+Resources\s*$/gim, ""],
    ],
  ],
]);

function cleanKnownPassageText(passageId, value) {
  return (knownPassageTextReplacements.get(passageId) ?? [])
    .reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function parseNumberSelection(value) {
  if (!value) return null;
  const numbers = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
  return numbers.length > 0 ? numbers : null;
}

function markPdfPages(rawText) {
  return rawText
    .replace(/\r/g, "")
    .split("\f")
    .map((page, index) => `\n\n=== PDF PAGE ${index + 1} ===\n${page}`)
    .join("\n");
}

function runPdftotext(pdfPath) {
  return markPdfPages(execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 160 * 1024 * 1024,
  }));
}

function getPdfPageCount(pdfPath) {
  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const match = /^Pages:\s+(\d+)/m.exec(info);
  if (!match) throw new Error(`Could not read PDF page count for ${pdfPath}`);
  return Number(match[1]);
}

function runOcrPdf(pdfPath, bookNo) {
  mkdirSync(ocrCacheDir, { recursive: true });
  const cachePath = path.join(ocrCacheDir, `ocr-book-${bookNo}.txt`);
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, "utf8");
  }

  const pageCount = getPdfPageCount(pdfPath);
  const pageDir = path.join(ocrCacheDir, `ocr-pages-book-${bookNo}`);
  const prefix = path.join(pageDir, "page");
  rmSync(pageDir, { recursive: true, force: true });
  mkdirSync(pageDir, { recursive: true });

  console.warn(`OCR Cambridge ${bookNo}: ${pageCount} pages`);
  execFileSync("pdftoppm", ["-scale-to", "1600", "-jpeg", pdfPath, prefix], { stdio: "ignore" });
  execFileSync("bash", [
    "-lc",
    "find \"$0\" -name '*.jpg' -print0 | xargs -0 -P 6 -I{} sh -c 'tesseract \"$1\" \"${1%.jpg}\" -l eng --psm 6 >/dev/null 2>&1' sh {}",
    pageDir,
  ], { stdio: "inherit" });

  const pages = readdirSync(pageDir)
    .filter((file) => /^page-\d+\.txt$/.test(file))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0))
    .map((file) => {
      const pageNo = Number(file.match(/\d+/)?.[0] ?? 0);
      return `\n\n=== OCR PAGE ${pageNo} ===\n${readFileSync(path.join(pageDir, file), "utf8")}`;
    });

  try {
    rmSync(pageDir, { recursive: true, force: true });
  } catch {
    // Temporary OCR pages are best-effort cleanup.
  }

  const text = pages.join("\n").replace(/\r/g, "");
  writeFileSync(cachePath, text);
  return text;
}

function extractPdfText(pdfPath, bookNo) {
  const text = runPdftotext(pdfPath);

  if (/READING PASSAGE\s+[123]/i.test(text)) {
    return text;
  }

  return runOcrPdf(pdfPath, bookNo);
}

function findBookPdf(bookNo) {
  const bookDir = path.join(cambridgeRoot, `剑桥雅思${bookNo}`);
  const files = readdirSync(bookDir)
    .filter((file) => /\.pdf$/i.test(file))
    .filter((file) => !file.includes("精讲"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No PDF found for Cambridge ${bookNo}`);
  }

  return path.join(bookDir, files[0]);
}

function findAnswerKeyIndex(text) {
  const patterns = [
    /^Answer Key\s*$/gim,
    /^ANSWER KEY\s*$/gim,
    /^Listening and Reading Answer Keys\s*$/gim,
    /^.*Listening\s*and\s*Reading\s*answer\s+keys?.*$/gim,
  ];
  const candidates = patterns.flatMap((pattern) =>
    [...text.matchAll(pattern)].map((match) => match.index ?? 0),
  );

  if (candidates.length === 0) return text.length;

  return (
    candidates
      .filter((index) => index > text.length * 0.45)
      .sort((a, b) => a - b)[0] ?? candidates.sort((a, b) => b - a)[0]
  );
}

function cleanBlock(value) {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function stripPageNoise(value) {
  return cleanBlock(
    value
      .split("\n")
      .filter((line) => !/^\s*\d{1,3}\s*$/.test(line))
      .filter((line) => !/^\s*===\s+(?:PDF|OCR)\s+PAGE\s+\d+\s+===\s*$/i.test(line))
      .filter((line) => !/^\s*[\d\s,.'"`/\\~•·:;_\-]{6,}\s*$/.test(line))
      .join("\n"),
  );
}

function findFirstQuestionIndex(block) {
  const match = /\n\s*Questions?\s+\d{1,2}/i.exec(block);
  return match?.index ?? -1;
}

function splitColumnLine(line) {
  const matches = [...line.matchAll(/[ \t]{4,}/g)]
    .map((match) => {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const left = line.slice(0, start).trimEnd();
      const right = line.slice(end).trimStart();
      return { left, right, start, width: match[0].length };
    })
    .filter(({ left, right }) => left.trim().length >= 8 && right.trim().length >= 8);

  if (matches.length === 0) return null;

  return matches.sort((a, b) => b.width - a.width)[0];
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function normalizeTwoColumnPage(pageText) {
  const lines = pageText
    .split("\n")
    .filter((line) => !/^\s*===\s+(?:PDF|OCR)\s+PAGE\s+\d+\s+===\s*$/i.test(line));
  const splitLines = lines
    .map((line, index) => ({ index, split: splitColumnLine(line) }))
    .filter(({ split }) => split);

  if (splitLines.length < 6) return pageText;

  const firstSplitIndex = splitLines[0].index;
  const lastSplitIndex = splitLines.at(-1).index;
  const splitStart = median(splitLines.map(({ split }) => split.start));
  const head = [];
  const left = [];
  const right = [];
  const tail = [];

  lines.forEach((line, index) => {
    if (index < firstSplitIndex) {
      head.push(line);
      return;
    }

    if (index > lastSplitIndex) {
      tail.push(line);
      return;
    }

    const split = splitColumnLine(line);
    if (split) {
      left.push(split.left);
      right.push(split.right);
      return;
    }

    if (!line.trim()) return;

    if (line.search(/\S/) > splitStart * 0.65) {
      right.push(line.trimEnd());
    } else {
      left.push(line.trimEnd());
    }
  });

  return [head.join("\n"), left.join("\n"), right.join("\n"), tail.join("\n")]
    .filter((chunk) => chunk.trim())
    .join("\n\n");
}

function normalizePassageColumns(value) {
  return value
    .split(/(?=\n\s*===\s+(?:PDF|OCR)\s+PAGE\s+\d+\s+===\s*\n)/i)
    .map((pageText) => normalizeTwoColumnPage(pageText))
    .join("\n\n");
}

function getMarkedPageRanges(value) {
  const markerPattern = /\n\s*===\s+(?:PDF|OCR)\s+PAGE\s+\d+\s+===\s*\n/gi;
  const markers = [...value.matchAll(markerPattern)];
  return markers.map((marker, index) => {
    const start = (marker.index ?? 0) + marker[0].length;
    const end = markers[index + 1]?.index ?? value.length;
    return {
      end,
      start,
      text: value.slice(start, end),
    };
  });
}

function looksLikePassagePage(value) {
  const cleaned = stripPageNoise(value);
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3 || cleaned.replace(/\s/g, "").length < 300) return false;

  const firstLines = lines.slice(0, 8).join(" ");
  if (/^Questions?\s+\d/i.test(lines[0])) return false;
  if (/Questions?\s+\d.*Choose.*Write/i.test(firstLines)) return false;
  if (/List of Headings/i.test(firstLines)) return false;

  return /[A-Za-z]{4}/.test(firstLines);
}

function getLineRecords(value) {
  const records = [];
  let offset = 0;

  for (const line of value.split("\n")) {
    records.push({
      line,
      start: offset,
    });
    offset += line.length + 1;
  }

  return records;
}

function isEmbeddedQuestionListLine(value) {
  return /^\s*\d{1,2}\s+(?:Section|Paragraph)\s+[A-Z]\s*$/i.test(value);
}

function isPassageStartCandidateLine(value) {
  const line = value.trim();
  return (
    line.length > 0 &&
    !isEmbeddedQuestionListLine(line) &&
    !/^===\s+(?:PDF|OCR)\s+PAGE\s+\d+\s+===$/i.test(line) &&
    !/^Reading$/i.test(line) &&
    !/^Test\s*\d+$/i.test(line) &&
    !/^Questions?\s+\d/i.test(line) &&
    !/^List of Headings/i.test(line) &&
    !/^(?:Choose|Complete|Do the following|Write|Which|Match|Label|Look at|Reading Passage|In boxes)\b/i.test(line)
  );
}

function findInlinePassageStart(questionText) {
  const records = getLineRecords(questionText);

  for (let index = 0; index < records.length; index += 1) {
    if (!isEmbeddedQuestionListLine(records[index].line)) continue;

    let candidateIndex = index + 1;
    while (
      candidateIndex < records.length &&
      !isPassageStartCandidateLine(records[candidateIndex].line)
    ) {
      candidateIndex += 1;
    }

    if (candidateIndex >= records.length) continue;

    const candidateStart = records[candidateIndex].start;
    if (looksLikePassagePage(questionText.slice(candidateStart))) {
      return candidateStart;
    }
  }

  return -1;
}

function findFollowingPagesPassageStart(questionText) {
  const inlineStart = findInlinePassageStart(questionText);
  if (inlineStart >= 0) return inlineStart;

  return getMarkedPageRanges(questionText).find((page) => looksLikePassagePage(page.text))?.start ?? -1;
}

function isIntroOnlyPassage(value) {
  const cleaned = stripPageNoise(value);
  const compact = cleaned.replace(/\s/g, "");
  return (
    compact.length < 450 ||
    /\bon\s+(?:the\s+)?(?:following|fo\s*llowing)\s+pages?\.?/i.test(cleaned) ||
    /\bon\s+pages?\s+\d{1,3}/i.test(cleaned)
  );
}

function splitPassageAndQuestions(block) {
  const cleanedBlock = cleanBlock(block);
  const questionIndex = findFirstQuestionIndex(cleanedBlock);

  if (questionIndex < 0) {
    return { passageText: cleanedBlock, questionText: "" };
  }

  const leadingPassageText = cleanedBlock.slice(0, questionIndex);
  const trailingText = cleanedBlock.slice(questionIndex);

  if (isIntroOnlyPassage(leadingPassageText)) {
    const embeddedPassageStart = findFollowingPagesPassageStart(trailingText);

    if (embeddedPassageStart > 0) {
      const prePassageQuestions = trailingText.slice(0, embeddedPassageStart);
      const embeddedText = trailingText.slice(embeddedPassageStart);
      const embeddedQuestionIndex = findFirstQuestionIndex(embeddedText);
      const embeddedPassageText =
        embeddedQuestionIndex >= 0 ? embeddedText.slice(0, embeddedQuestionIndex) : embeddedText;
      const postPassageQuestions =
        embeddedQuestionIndex >= 0 ? embeddedText.slice(embeddedQuestionIndex) : "";

      return {
        passageText: `${leadingPassageText}\n\n${embeddedPassageText}`,
        questionText: [prePassageQuestions, postPassageQuestions]
          .filter((chunk) => chunk.trim())
          .join("\n\n"),
      };
    }
  }

  return {
    passageText: leadingPassageText,
    questionText: trailingText,
  };
}

function getPassageTitle(block, fallback) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines.find((line) =>
    !/^READING$/i.test(line) &&
    !/^READING PASSAGE\s+\d/i.test(line) &&
    !/^Test\s*\d+$/i.test(line) &&
    !/^You should spend/i.test(line) &&
    !/^on the following pages?\.?$/i.test(line) &&
    !/^Passage\s+\d\s+(?:below|on\s+(?:the\s+)?(?:following|fo\s*llowing)\s+pages?|on\s+pages?\s+\d{1,3})/i.test(line) &&
    !/^===\s+(?:PDF|OCR)\s+PAGE\s+\d+\s+===$/i.test(line) &&
    !/^below\.?$/i.test(line) &&
    !/^Questions?\s+\d/i.test(line) &&
    !/^\d{1,3}$/.test(line),
  );

  return title && title.length < 120 ? title : fallback;
}

function isPassageHeadingLine(line, matchIndex, matchedText) {
  const before = line.slice(0, matchIndex).trim();
  const after = line.slice(matchIndex + matchedText.length).trim();

  if (/Questions?|based on|statements|paragraph|section|refers|agree/i.test(line)) return false;
  if (before && before.length > 3 && !/^[|:;._\-–—]+$/.test(before)) return false;
  if (after && /[A-Za-z]{2,}/.test(after)) return false;

  return true;
}

function getPartNoFromQuestionStart(rawStart) {
  const start = /^I$/i.test(rawStart) ? 1 : Number(rawStart);
  if (start <= 13) return 1;
  if (start <= 26) return 2;
  return 3;
}

function isReadingTestAnchor(lines, lineIndex) {
  const preview = lines
    .slice(lineIndex + 1, lineIndex + 16)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  if (!preview) return false;
  if (/SECTION\s+\d|WRITING|SPEAKING|PART\s+\d|LISTENING|GENERAL TRAINING|Answer key/i.test(preview)) {
    return false;
  }

  return /READING|PASSAGE|[A-Z][a-z][A-Za-z ,:'’‘-]{8,}/.test(preview);
}

function extractPassageMarkers(mainText) {
  const lines = mainText.split("\n");

  function buildCandidates(includeTestAnchors) {
    const candidates = [];
    let offset = 0;

    for (const [lineIndex, line] of lines.entries()) {
      if (
        includeTestAnchors &&
        /^\s*Test\s+[1-4]\s*\|?\s*$/i.test(line) &&
        isReadingTestAnchor(lines, lineIndex)
      ) {
        candidates.push({
          index: offset,
          partNo: 1,
        });
      }

      const headingMatch = /\bREADING\s+PASSAGE\s+([123])\b/i.exec(line);
      if (headingMatch && isPassageHeadingLine(line, headingMatch.index, headingMatch[0])) {
        candidates.push({
          index: offset + headingMatch.index,
          partNo: Number(headingMatch[1]),
        });
      }

      const introMatch =
        /(?:You\s+)?should spend about 20 minutes on Questions\s+(I|\d{1,2})\s*[-–]\s*(\d{1,2})/i.exec(
          line,
        );
      if (introMatch) {
        candidates.push({
          index: offset + introMatch.index,
          partNo: getPartNoFromQuestionStart(introMatch[1]),
        });
      }

      offset += line.length + 1;
    }

    return candidates
      .sort((a, b) => a.index - b.index)
      .reduce((markers, candidate) => {
        const previous = markers.at(-1);
        if (previous && previous.partNo === candidate.partNo && candidate.index - previous.index < 700) {
          return markers;
        }

        markers.push(candidate);
        return markers;
      }, []);
  }

  const reliableMarkers = buildCandidates(false);
  return (reliableMarkers.length >= 12 ? reliableMarkers : buildCandidates(true)).slice(0, 12);
}

function extractReadingParts(text, bookNo, testNo) {
  const mainText = text.slice(0, findAnswerKeyIndex(text));
  const markers = extractPassageMarkers(mainText);
  const testMarkers = markers.slice((testNo - 1) * 3, testNo * 3);

  if (testMarkers.length !== 3) {
    return [];
  }

  return testMarkers.map((marker, index) => {
    const nextMarker = markers[(testNo - 1) * 3 + index + 1];
    let end = nextMarker?.index ?? mainText.length;
    const writingMatch = /\n\s*WRITING\s*\n/i.exec(mainText.slice(marker.index, end));

    if (writingMatch) {
      end = marker.index + writingMatch.index;
    }

    const block = mainText.slice(marker.index, end);
    const { passageText, questionText } = splitPassageAndQuestions(block);
    const partNo = marker.partNo;
    const passageId = `cambridge-${bookNo}-test-${testNo}-part${partNo}`;
    const normalizedPassageText = cleanKnownPassageText(
      passageId,
      stripPageNoise(normalizePassageColumns(passageText)),
    );
    const normalizedQuestionText = stripPageNoise(questionText);

    return {
      id: passageId,
      label: `Part ${partNo}`,
      passageText: normalizedPassageText,
      questionText: normalizedQuestionText,
      title: knownPassageTitles.get(passageId) ?? getPassageTitle(normalizedPassageText, `Reading Passage ${partNo}`),
    };
  });
}

function extractAcademicAnswerSegments(text) {
  const answerText = text.slice(findAnswerKeyIndex(text));
  const segments = new Map();
  const readingMarkers = [
    ...answerText.matchAll(/^\s*(?:ACADEMIC\s+)?R\s*E\s*A\s*D\s*I\s*N\s*G\s*:?\s*\|?\s*$/gim),
  ].map((match) => match.index ?? 0);

  if (readingMarkers.length >= 4) {
    readingMarkers.slice(0, 4).forEach((start, index) => {
      const tail = answerText.slice(start);
      const scoreMatch = /\n\s*If you score/i.exec(tail);
      const nextStart = readingMarkers[index + 1] ?? answerText.length;
      const end = scoreMatch ? start + scoreMatch.index : nextStart;
      segments.set(index + 1, stripPageNoise(answerText.slice(start, end)));
    });
    return segments;
  }

  for (const testNo of testsToGenerate) {
    const testMatch = new RegExp(`^\\s*TEST\\s+${testNo}\\s*$`, "im").exec(answerText);
    if (!testMatch) continue;

    const testStart = testMatch.index ?? 0;
    const nextMatch = new RegExp(`^\\s*TEST\\s+${testNo + 1}\\s*$`, "im").exec(
      answerText.slice(testStart + testMatch[0].length),
    );
    const testEnd = nextMatch
      ? testStart + testMatch[0].length + (nextMatch.index ?? 0)
      : answerText.length;
    const testSegment = answerText.slice(testStart, testEnd);
    const readingMatch =
      /^ACADEMIC READING\s*$/im.exec(testSegment) ??
      /^READING\s*$/im.exec(testSegment);

    if (!readingMatch) continue;

    const readingStart = readingMatch.index ?? 0;
    const tail = testSegment.slice(readingStart);
    const scoreMatch = /\n\s*If you score/i.exec(tail);
    const end = scoreMatch ? scoreMatch.index : tail.length;
    segments.set(testNo, stripPageNoise(tail.slice(0, end)));
  }

  return segments;
}

function normaliseAnswerValue(value) {
  return value
    .replace(/\s+I\s+/g, " / ")
    .replace(/\bNOTGIVEN\b/gi, "NOT GIVEN")
    .replace(/\bINANYORDER\b/gi, "IN ANY ORDER")
    .replace(/\bFORONEMARK\b/gi, "FOR ONE MARK")
    .replace(/\s+/g, " ")
    .trim();
}

function isAnswerMetadata(value) {
  return (
    !value ||
    /^ACADEMIC READING$/i.test(value) ||
    /^READING$/i.test(value) ||
    /^Each question/i.test(value) ||
    /^ANSWERS?\.?$/i.test(value) ||
    /^Reading Passage/i.test(value) ||
    /^Questions?\s+\d/i.test(value) ||
    /^FOR ONE MARK$/i.test(value) ||
    /^BOTH REQUIRED$/i.test(value) ||
    /^IN EITHER ORDER/i.test(value)
  );
}

function makeNumberList(first, delimiter, second) {
  const start = Number(first);
  const end = Number(second);

  if (!delimiter || !second) return [start];
  if (delimiter === "-" || delimiter === "–") {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }
  return [start, end];
}

function parseAnswerKey(rawAnswerText) {
  const answers = new Map();
  let pending = null;
  let currentNumber = null;

  function flushPending() {
    if (!pending || pending.values.length === 0) {
      pending = null;
      return;
    }

    if (pending.numbers.length === 1) {
      answers.set(pending.numbers[0], {
        answer: pending.values,
        answerMode: "all",
      });
      currentNumber = pending.numbers[0];
      pending = null;
      return;
    }

    pending.numbers.forEach((number) => {
      if (!answers.has(number)) {
        answers.set(number, { answer: pending.values });
      }
      currentNumber = number;
    });
    pending = null;
  }

  function addContinuation(value) {
    const cleaned = normaliseAnswerValue(cleanAnswerCandidate(value));
    if (isAnswerMetadata(cleaned)) return;

    if (pending) {
      const values =
        /^[A-Z](?:\s+[A-Z]){1,6}$/i.test(cleaned) ? cleaned.split(/\s+/) : [cleaned];
      pending.values.push(...values);
      return;
    }

    if (currentNumber && answers.has(currentNumber)) {
      const current = answers.get(currentNumber);
      if (Array.isArray(current.answer)) {
        current.answer[current.answer.length - 1] = normaliseAnswerValue(
          `${current.answer.at(-1)} ${cleaned}`,
        );
      } else {
        current.answer = normaliseAnswerValue(`${current.answer} ${cleaned}`);
      }
    }
  }

  function cleanAnswerCandidate(value) {
    return value
      .replace(/^[\s).:>°·•;|]+/, "")
      .replace(/[\s;|]+$/, "")
      .trim();
  }

  function cleanAnswerLine(value) {
    return value
      .replace(/Reading Passage\s+\d,?\s*/gi, " ")
      .replace(/Questions?\s+\d{1,2}\s*(?:[-–]{1,2}\s*\d{1,2})?/gi, " ")
      .replace(/\b([4T丁])([1-3]\d|40)\b/g, "$2")
      .replace(/\b(\d{1,2})S\s+(TRUE|FALSE|YES|NO|NOT\s*GIVEN)\b/gi, "$1 $2")
      .replace(/[|]+/g, " ")
      .trim();
  }

  function parseNumberedEntries(line) {
    const cleaned = cleanAnswerLine(line);
    const matches = [...cleaned.matchAll(/(^|\s)(\d{1,2})(?:\s*([&\-–]+)\s*(\d{1,2}))?(?=[\s).:>°]|$)/g)];

    return matches
      .map((match, index) => {
        const first = Number(match[2]);
        const second = match[4] ? Number(match[4]) : undefined;
        if (first < 1 || first > 40 || (second !== undefined && (second < 1 || second > 40))) {
          return null;
        }

        const nextMatch = matches[index + 1];
        const rawValue = cleaned.slice((match.index ?? 0) + match[0].length, nextMatch?.index).trim();
        const value = normaliseAnswerValue(cleanAnswerCandidate(rawValue));
        if (isAnswerMetadata(value)) return null;

        return {
          numbers: makeNumberList(match[2], match[3]?.startsWith("&") ? "&" : match[3], match[4]),
          value,
        };
      })
      .filter(Boolean);
  }

  for (const line of rawAnswerText.split("\n")) {
    const entries = parseNumberedEntries(line);

    if (entries.length === 0) {
      addContinuation(line);
      continue;
    }

    for (const { numbers, value } of entries) {
      flushPending();

      if (/IN\s+(?:EITHER|ANY)\s+ORDER/i.test(value) || /BOTH REQUIRED/i.test(value)) {
        pending = { numbers, values: [] };
        currentNumber = null;
        continue;
      }

      numbers.forEach((number) => {
        if (!answers.has(number)) {
          answers.set(number, { answer: value });
        }
      });
      currentNumber = numbers.at(-1) ?? null;
    }
  }

  flushPending();
  return answers;
}

function rangeNumbers(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => index + start);
}

function getPartNo(part) {
  return Number(part.label.replace("Part ", ""));
}

function getQuestionNumberSetsForTest(parts) {
  const partThree = parts.find((part) => getPartNo(part) === 3);
  const partThreeStart = /Questions?\s+28\s*[-–]\s*40/i.test(partThree?.questionText ?? "") ? 28 : 27;

  return new Map([
    [1, rangeNumbers(1, 13)],
    [2, rangeNumbers(14, partThreeStart - 1)],
    [3, rangeNumbers(partThreeStart, 40)],
  ]);
}

function buildReadingPart({ answerMap, bookNo, part, questionNumbers, rawAnswerText, testNo }) {
  return {
    id: part.id,
    intro: `You should spend about 20 minutes on ${part.label}.`,
    label: part.label,
    questionRange: `questions ${questionNumbers[0]}-${questionNumbers.at(-1)}`,
    title: part.title,
    sections: [
      {
        id: `${part.id}-passage`,
        format: "pre",
        paragraphs: [part.passageText],
      },
    ],
    questionBlocks: [
      {
        id: `${part.id}-answers`,
        instruction: "Read the original questions above and type your answers in the answer sheet.",
        rawAnswerText,
        rawText: part.questionText,
        questions: questionNumbers.map((number) => {
          const answer = answerMap.get(number);
          return {
            number,
            before: `Question ${number}`,
            ...(answer?.answer ? { answer: answer.answer } : {}),
            ...(answer?.answerMode ? { answerMode: answer.answerMode } : {}),
          };
        }),
        title: `Cambridge ${bookNo} Test ${testNo} ${part.label} Answer Sheet`,
        type: "fill",
      },
    ],
  };
}

function getAnswerSegments(pdfPath, bookNo, text) {
  const textSegments = extractAcademicAnswerSegments(text);
  const hasWeakTextSegment = testsToGenerate.some(
    (testNo) => parseAnswerKey(textSegments.get(testNo) ?? "").size < 30,
  );

  if (!hasWeakTextSegment) {
    return textSegments;
  }

  const ocrSegments = extractAcademicAnswerSegments(runOcrPdf(pdfPath, bookNo));
  const segments = new Map(textSegments);

  for (const testNo of testsToGenerate) {
    const textSegment = textSegments.get(testNo) ?? "";
    const ocrSegment = ocrSegments.get(testNo) ?? "";
    if (parseAnswerKey(ocrSegment).size > parseAnswerKey(textSegment).size) {
      segments.set(testNo, ocrSegment);
    }
  }

  return segments;
}

function buildTestsForBook(bookNo) {
  const pdfPath = findBookPdf(bookNo);
  const text = extractPdfText(pdfPath, bookNo);
  const answerSegments = getAnswerSegments(pdfPath, bookNo, text);
  const tests = [];

  for (const testNo of testsToGenerate) {
    const id = `cambridge-${bookNo}-test-${testNo}`;
    if (manualTestIds.has(id)) continue;

    const rawParts = extractReadingParts(text, bookNo, testNo);
    if (rawParts.length !== 3) {
      console.warn(`skip ${id}: expected 3 reading passages, got ${rawParts.length}`);
      continue;
    }

    const rawAnswerText = answerSegments.get(testNo) ?? "";
    const answerMap = parseAnswerKey(rawAnswerText);
    const questionNumberSets = getQuestionNumberSetsForTest(rawParts);
    const parts = rawParts.map((part) =>
      buildReadingPart({
        answerMap,
        bookNo,
        part,
        questionNumbers: questionNumberSets.get(getPartNo(part)) ?? rangeNumbers(1, 40),
        rawAnswerText,
        testNo,
      }),
    );

    tests.push({
      bookCode: `cambridge-${bookNo}`,
      bookTitle: `剑桥雅思 ${bookNo}`,
      id,
      parts,
      testNo,
      title: `剑桥雅思 ${bookNo} Test ${testNo} Reading`,
    });
  }

  return tests;
}

const tests = books.flatMap(buildTestsForBook);

if (tests.length < minGeneratedTests) {
  throw new Error(`Generated only ${tests.length} tests; expected most Cambridge 4-21 tests.`);
}

writeFileSync(outputPath, `${JSON.stringify(tests)}\n`);
console.log(`Generated ${tests.length} reading tests at ${outputPath}`);

const missingAnswerCounts = tests.map((test) => ({
  id: test.id,
  answered: test.parts.reduce(
    (total, part) =>
      total + part.questionBlocks[0].questions.filter((question) => question.answer).length,
    0,
  ),
}));

const weak = missingAnswerCounts.filter((item) => item.answered < 30);
if (weak.length > 0) {
  console.warn(
    `Tests with fewer than 30 parsed answers: ${weak.map((item) => `${item.id}:${item.answered}`).join(", ")}`,
  );
}

const weakPassages = tests.flatMap((test) =>
  test.parts
    .filter((part) => {
      const passageText = part.sections[0]?.paragraphs[0] ?? "";
      return passageText.replace(/\s/g, "").length < 1200 || /on the following pages/i.test(part.title);
    })
    .map((part) => `${test.id}:${part.label}:${part.title}:${(part.sections[0]?.paragraphs[0] ?? "").length}`),
);

if (weakPassages.length > 0) {
  console.warn(`Passages needing manual review: ${weakPassages.join(", ")}`);
}

if (!existsSync(outputPath)) {
  throw new Error("Generated file was not written.");
}
