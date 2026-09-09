import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";

const repoRoot = process.cwd();
const sourceRoot = "/Volumes/My HDD3/BBC take away english";
const dataRoot = join(repoRoot, "src/data/bbc");
const outputCatalog = join(dataRoot, "quiz-index.json");
const outputCoverage = join(dataRoot, "quiz-coverage.json");

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function normalizeSpace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeAnswer(value) {
  return normalizeSpace(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[.。]+$/g, "")
    .toLowerCase();
}

function cleanExtractedAnswer(value) {
  return normalizeSpace(value)
    .replace(/\s+\d+\.\s*$/g, "")
    .replace(/\s+(?:Take Away English|Page \d+ of \d+|词汇表)[\s\S]*$/i, "")
    .trim();
}

function questionTokens(value) {
  return [...value.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?/g)].map((match) => match[0].toLowerCase().replace(/’/g, "'"));
}

function findTokenSequence(value, expectedTokens, startAt = 0) {
  if (!expectedTokens.length) return { start: value.length, end: value.length };
  const tokens = [...value.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?/g)];
  for (let index = 0; index <= tokens.length - expectedTokens.length; index += 1) {
    if (tokens[index].index < startAt) continue;
    const matches = expectedTokens.every((expected, offset) => {
      const actual = tokens[index + offset][0].toLowerCase().replace(/’/g, "'");
      return actual === expected;
    });
    if (matches) {
      const start = tokens[index].index;
      const last = tokens[index + expectedTokens.length - 1];
      return { start, end: last.index + last[0].length };
    }
  }
  return null;
}

function extractPlainAnswer(question, answerLines) {
  const raw = normalizeSpace(answerLines.map((line) => line.full).join(" ")).replace(/^\s*\d{1,2}\.\s*/, "");
  const blankMatch = question.prompt.match(/_{2,}/);

  if (blankMatch) {
    const before = question.prompt.slice(0, blankMatch.index);
    const after = question.prompt.slice((blankMatch.index ?? 0) + blankMatch[0].length);
    const beforeMatch = findTokenSequence(raw, questionTokens(before));
    const afterMatch = findTokenSequence(raw, questionTokens(after), beforeMatch?.end ?? 0);
    if (beforeMatch) {
      const answer = raw.slice(beforeMatch.end, afterMatch?.start ?? raw.length).replace(/^[?？！。.:：,，\s"']+|[?？！。.:：,，\s"']+$/g, "");
      if (answer) return answer;
    }
  }

  const questionMatch = findTokenSequence(raw, questionTokens(question.prompt));
  if (!questionMatch) return "";
  return raw.slice(questionMatch.end).replace(/^[?？！。.:：,，\s"']+/, "").trim();
}

function readPdfText(pdfPath) {
  return execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  }).replace(/\r/g, "");
}

function readPdfPages(pdfPath) {
  return readPdfText(pdfPath).split("\f").map((page) => page.trim()).filter(Boolean);
}

function pageHasQuestions(page) {
  return /(?:\bQuiz\b|测验)/i.test(page) && /(?:\bExercise\b|练习)/i.test(page);
}

function findQuestionPageRange(pages) {
  const start = pages.findIndex((page) => /(?:\bQuiz\b|测验)/i.test(page));
  if (start < 0) return null;
  const exercisePage = pages.findIndex(
    (page, index) => index >= start && /(?:\bExercise\b|练习)/i.test(page),
  );
  return { start, end: exercisePage >= 0 ? exercisePage : start };
}

function pageHasAnswers(page) {
  return /^(?:\bAnswers?\b|答案)/i.test(page);
}

function isInstructionLine(value) {
  return /(?:阅读(?:短文|课文)|在不参考课文|将标题和段落配对|根据文章内容|用方框中的单词|答案见词汇表|从每个表格|选择(?:一个)?意思(?:恰当)?|单词或词组|填入句子|without referring|choose the correct)/i.test(value);
}

function parseNumberedLine(value) {
  const match = value.match(/^\s*(\d{1,2})\s*[.)．。]\s*(.*)$/);
  return match ? { number: Number(match[1]), text: match[2].trim() } : null;
}

function findQuestionSequences(lines) {
  const markers = lines
    .map((line, index) => ({ ...parseNumberedLine(line), index }))
    .filter((marker) => marker.number != null && marker.text && !isInstructionLine(marker.text));
  const sequences = [];

  for (let index = 0; index <= markers.length - 5; index += 1) {
    const candidate = markers.slice(index, index + 5);
    if (candidate.every((marker, offset) => marker.number === offset + 1)) {
      sequences.push(candidate);
      index += 4;
    }
  }

  return sequences;
}

function splitOptions(line) {
  return line
    .trim()
    .split(/\s{2,}/)
    .map((option) => option.trim())
    .filter(Boolean);
}

function cleanOptionText(value) {
  return value.trim().replace(/^insomia$/i, "insomnia");
}

function parseLetterOptionLine(value) {
  const match = value.match(/^\s*([a-z])\s*[.)]\s*(.+?)\s*$/i);
  return match ? { letter: match[1].toLowerCase(), text: match[2].trim() } : null;
}

function cleanExtractedPrompt(value) {
  return normalizeSpace(value)
    .replace(/\s+(?:Take Away English|Page \d+ of \d+|答案见词汇表)[\s\S]*$/i, "")
    .trim();
}

function parseQuestionGroup(lines, sequence, isExercise, groupEnd = lines.length) {
  return sequence.map((marker, index) => {
    const end = sequence[index + 1]?.index ?? groupEnd;
    const block = lines.slice(marker.index, end);
    const first = parseNumberedLine(block[0]);
    const contentLines = [first?.text ?? block[0], ...block.slice(1)];

    if (!isExercise) {
      const optionIndex = contentLines.findIndex((line, lineIndex) => lineIndex > 0 && parseLetterOptionLine(line));
      const instructionIndex = contentLines.findIndex(
        (line, lineIndex) => lineIndex > 0 && isInstructionLine(line),
      );
      const firstOptionIndex = optionIndex >= 0 ? optionIndex : contentLines.length;
      const promptEndIndex = instructionIndex >= 0
        ? Math.min(instructionIndex, firstOptionIndex)
        : firstOptionIndex;
      const options = contentLines
        .slice(optionIndex >= 0 ? optionIndex : contentLines.length)
        .map(parseLetterOptionLine)
        .filter(Boolean)
        .map((option) => option.text);

      return {
        number: marker.number,
        ...(options.length ? { options } : {}),
        prompt: cleanExtractedPrompt(
          contentLines.slice(0, promptEndIndex).join(" "),
        ),
      };
    }

    const blankIndex = contentLines.findIndex((line, lineIndex) => lineIndex > 0 && !line.trim());
    const optionAfterBlankIndex = blankIndex >= 0
      ? contentLines.findIndex((line, lineIndex) => lineIndex > blankIndex && !/Take Away English|Page \d+ of \d+/i.test(line) && splitOptions(line).length >= 2)
      : -1;
    const optionIndex = optionAfterBlankIndex >= 0
      ? optionAfterBlankIndex
      : contentLines.findIndex((line) => !/Take Away English|Page \d+ of \d+/i.test(line) && splitOptions(line).length >= 3);
    const options = [];
    if (optionIndex >= 0) {
      for (const line of contentLines.slice(optionIndex)) {
        if (/Take Away English|Page \d+ of \d+/i.test(line)) break;
        const cells = splitOptions(line);
        if (cells.length >= 2) {
          if (options.length >= 3 && cells[0].length <= 4 && /^[a-z]+$/i.test(cells[0]) && options.at(-1).length <= 6) {
            options[options.length - 1] += cells.shift();
          }
          options.push(...cells);
        }
        else if (!line.trim()) break;
      }
    }
    const promptLines = optionIndex >= 0 ? contentLines.slice(0, optionIndex) : contentLines;

    return {
      number: marker.number,
      options,
      prompt: cleanExtractedPrompt(promptLines.join(" ")),
    };
  });
}

function parseMatchingSection(lines) {
  const headingIndex = lines.findIndex((line) => /将标题和段落配对|match(?:ing)?\s+(?:the\s+)?(?:headings?|paragraphs?)/i.test(line));
  const paragraphLookupHeadingIndex = lines.findIndex((line) => /根据文章内容选出正确的段落/i.test(line));
  const paragraphLookupIndex = lines.findIndex((line, index) => index >= paragraphLookupHeadingIndex && /which paragraph contains/i.test(line));
  if (headingIndex < 0 && paragraphLookupIndex < 0) return [];
  if (headingIndex < 0) {
    const endIndex = lines.findIndex((line, index) => index > paragraphLookupIndex && /^(?:二[、.]|2\s*[.)．。])/.test(line.trim()));
    const prompt = cleanExtractedPrompt(lines.slice(paragraphLookupIndex, endIndex >= 0 ? endIndex : paragraphLookupIndex + 1).join(" "));
    return prompt ? [{ type: "matching", number: 1, options: Array.from({ length: 5 }, (_, index) => `Paragraph ${index + 1}`), prompt }] : [];
  }
  const endIndex = lines.findIndex(
    (line, index) => index > headingIndex && /^(?:二[、.]|2\s*[.)．。])/.test(line.trim()),
  );
  const sectionLines = lines.slice(headingIndex + 1, endIndex >= 0 ? endIndex : lines.length);
  const paragraphLines = sectionLines
    .map((line, index) => ({ match: line.match(/^\s*Paragraph\s+(\d+)\s+_{2,}\s*$/i), index }))
    .filter((item) => item.match);
  if (!paragraphLines.length) return [];

  const optionStart = paragraphLines.at(-1).index + 1;
  const options = sectionLines
    .slice(optionStart)
    .map(parseLetterOptionLine)
    .filter(Boolean)
    .map((option) => option.text);
  if (!options.length) return [];

  return paragraphLines.map(({ match }) => ({
    type: "matching",
    number: Number(match[1]),
    options,
    prompt: `Paragraph ${match[1]}`,
  }));
}

function findSummaryHeadingIndex(lines) {
  return lines.findIndex((line) => {
    const text = typeof line === "string" ? line : line.full;
    return /^(?:三[、.]|3\s*[.)．。])\s*用方框中的单词/i.test(text.trim());
  });
}

function parseSummaryExercise(lines) {
  const headingIndex = findSummaryHeadingIndex(lines);
  if (headingIndex < 0) return [];

  const endIndex = lines.findIndex(
    (line, index) => index > headingIndex && /答案见词汇表后|(?:Glossary|词汇表)/i.test(line),
  );
  const sectionLines = lines.slice(headingIndex + 1, endIndex >= 0 ? endIndex : lines.length);
  const lastBlankLineIndex = sectionLines.reduce(
    (lastIndex, line, index) => /\b\d+\)\s*_{2,}/.test(line) ? index : lastIndex,
    -1,
  );
  if (lastBlankLineIndex < 0) return [];

  const optionBreakIndex = sectionLines.findIndex(
    (line, index) => index > lastBlankLineIndex && !line.trim(),
  );
  const promptLines = sectionLines.slice(0, optionBreakIndex >= 0 ? optionBreakIndex : lastBlankLineIndex + 1);
  const promptText = normalizeSpace(promptLines.join(" "));
  const blankMatches = [...promptText.matchAll(/\b\d+\)\s*_{2,}/g)];
  const optionLines = optionBreakIndex >= 0 ? sectionLines.slice(optionBreakIndex + 1) : [];
  const options = optionLines
    .flatMap((line) => /Take Away English|Page \d+ of \d+/i.test(line) ? [] : splitOptions(line))
    .map(cleanOptionText)
    .filter((option) => option && !/答案见词汇表|Take Away English|Page \d+ of \d+/i.test(option));

  return blankMatches.map((blank, index) => {
    const blankStart = blank.index ?? 0;
    const segmentStart = index === 0
      ? 0
      : (blankMatches[index - 1].index ?? 0) + blankMatches[index - 1][0].length;
    const segmentEnd = blankMatches[index + 1]?.index ?? promptText.length;
    const prompt = promptText
      .slice(segmentStart, segmentEnd)
      .replace(blank[0], "________")
      .trim();

    return {
      isSummary: true,
      number: index + 1,
      options,
      prompt,
    };
  });
}

function extractSummaryAnswers(lines, options) {
  if (!options.length) return [];

  const joinedText = normalizeSpace(lines.map((line) => line.full).join(" "));
  const headingStart = joinedText.search(/(?:用方框中的单词|When things don't go your way|30,?\s*40\s*and\s*50)/i);
  const optionStart = Math.min(
    ...options
      .map((option) => joinedText.toLowerCase().indexOf(option.toLowerCase()))
      .filter((index) => index >= 0),
    Number.POSITIVE_INFINITY,
  );
  const answerText = joinedText
    .slice(headingStart >= 0 ? headingStart : Number.isFinite(optionStart) ? optionStart : 0)
    .replace(/\s+(?:Take Away English|Page \d+ of \d+|词汇表)[\s\S]*$/i, "")
    .trim();
  if (!answerText) return [];
  const normalizedAnswerText = answerText.toLowerCase();
  let cursor = 0;

  return options.slice(0, 5).map((_, index) => {
    const matches = options
      .map((option) => ({ option, index: normalizedAnswerText.indexOf(option.toLowerCase(), cursor) }))
      .filter((match) => match.index >= cursor)
      .sort((left, right) => left.index - right.index);
    const match = matches[0];

    if (!match) {
      return { number: index + 1, answer: "" };
    }

    cursor = match.index + match.option.length;
    return { number: index + 1, answer: match.option };
  });
}

function extractMatchingAnswers(lines, questions) {
  if (!questions.length) return [];
  return questions.map((question) => {
    const answerLine = lines.find((line) => new RegExp(`^Paragraph\\s+${question.number}\\s+`, "i").test(line.full));
    const answer = answerLine?.full.match(new RegExp(`^Paragraph\\s+${question.number}\\s+([a-z])\\s*[.)]`, "i"));
    const directParagraph = (answerLine ?? lines.find((line) => /^Paragraph\s+\d+\s*[.)]/i.test(line.full)))?.full.match(/^Paragraph\s+(\d+)\s*[.)]/i);
    const letter = answer?.[1]?.toLowerCase();
    const optionIndex = letter ? letter.charCodeAt(0) - 97 : -1;
    return {
      number: question.number,
      answer: optionIndex >= 0 ? question.options[optionIndex] ?? "" : directParagraph ? `Paragraph ${directParagraph[1]}` : "",
    };
  });
}

function resolveChoiceAnswer(question, extractedAnswer) {
  if (!question.options?.length || !extractedAnswer) return extractedAnswer;
  const letter = extractedAnswer.match(/^\s*([a-z])\s*[.)]?/i)?.[1]?.toLowerCase();
  if (letter) {
    const option = question.options[letter.charCodeAt(0) - 97];
    if (option) return option;
  }
  const normalizedExtracted = normalizeAnswer(extractedAnswer);
  return question.options.find((option) => normalizedExtracted === normalizeAnswer(option)) ?? extractedAnswer;
}

function readBoldAnswerLines(pdfPath, pageNumber) {
  const xml = execFileSync("pdftohtml", ["-xml", "-i", "-f", String(pageNumber), "-l", String(pageNumber), "-stdout", pdfPath], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
  const lines = new Map();

  for (const match of xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attributes = match[1];
    const top = Number(attributes.match(/\btop="([\d.]+)"/)?.[1]);
    const left = Number(attributes.match(/\bleft="([\d.]+)"/)?.[1]);
    if (!Number.isFinite(top) || !Number.isFinite(left)) continue;

    const html = match[2];
    const text = normalizeSpace(decodeXml(html.replace(/<[^>]+>/g, "")));
    const boldText = [...html.matchAll(/<b>([\s\S]*?)<\/b>/gi)]
      .map((bold) => normalizeSpace(decodeXml(bold[1].replace(/<[^>]+>/g, ""))))
      .filter(Boolean);
    const existingKey = [...lines.keys()].find((key) => Math.abs(lines.get(key).top - top) <= 2);
    const key = existingKey ?? top;
    const line = lines.get(key) ?? { top, pieces: [] };
    line.pieces.push({ boldText, left, text });
    lines.set(key, line);
  }

  return [...lines.values()]
    .sort((left, right) => left.top - right.top)
    .map((line) => {
      const pieces = line.pieces.sort((left, right) => left.left - right.left);
      return {
        bold: normalizeSpace(pieces.flatMap((piece) => piece.boldText).join(" ")),
        full: normalizeSpace(pieces.map((piece) => piece.text).join(" ")),
      };
    });
}

function parseAnswerGroup(lines, headingPattern, stopPattern, questions = []) {
  const headingIndex = lines.findIndex(
    (line) => headingPattern.test(line.full) && /^(?:Qui\s*z|Exer\s*cise|Quiz|Exercise|测验|练习|小测验)(?:\s|$)/i.test(line.full),
  );
  if (headingIndex < 0) return [];
  const stopIndex = stopPattern ? lines.findIndex((line, index) => index > headingIndex && stopPattern.test(line.full)) : -1;
  const footerIndex = lines.findIndex((line, index) => index > headingIndex && /Take Away English|Page \d+ of \d+/i.test(line.full));
  const glossaryIndex = lines.findIndex((line, index) => index > headingIndex && /(?:Glossary|词汇表)/i.test(line.full));
  const endIndex = [stopIndex, footerIndex, glossaryIndex, lines.length].filter((index) => index >= 0).sort((left, right) => left - right)[0];
  const groupLines = lines.slice(headingIndex + 1, endIndex);
  const markers = groupLines
    .map((line, index) => ({ ...parseNumberedLine(line.full), index }))
    .filter((marker) => marker.number != null && marker.text && !isInstructionLine(marker.text));

  return markers.map((marker, index) => {
    const end = markers[index + 1]?.index ?? groupLines.length;
    const question = questions.find((item) => item.number === marker.number);
    const answerLines = groupLines.slice(marker.index, end);
    return {
      number: marker.number,
      answer: cleanExtractedAnswer(
        normalizeSpace(answerLines.map((line) => line.bold).filter(Boolean).join(" ")) ||
          (question ? extractPlainAnswer(question, answerLines) : ""),
      ),
    };
  });
}

function parseAnswerGroupsWithoutHeadings(lines, questionGroups = []) {
  const markers = lines
    .map((line, index) => ({ ...parseNumberedLine(line.full), index }))
    .filter((marker) => marker.number != null && marker.text && !isInstructionLine(marker.text));
  const groups = [];
  let currentGroup = [];
  for (const marker of markers) {
    if (marker.number === 1 && currentGroup.length) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(marker);
  }
  if (currentGroup.length) groups.push(currentGroup);
  const footerIndex = lines.findIndex((line) => /Take Away English|Page \d+ of \d+/i.test(line.full));
  const glossaryIndex = lines.findIndex((line) => /(?:Glossary|词汇表)/i.test(line.full));

  return groups.slice(0, 2).map((sequence, sequenceIndex) => {
    const nextSequenceStart = groups[sequenceIndex + 1]?.[0]?.index ?? lines.length;
    const sectionIndex = lines.findIndex(
      (line, index) => index > (sequence.at(-1)?.index ?? -1) && index < nextSequenceStart && isInstructionLine(line.full),
    );
    const endIndex = [nextSequenceStart, sectionIndex >= 0 ? sectionIndex : lines.length, footerIndex >= 0 ? footerIndex : lines.length, glossaryIndex >= 0 ? glossaryIndex : lines.length]
      .sort((left, right) => left - right)[0];
    return sequence.map((marker, index) => {
      const end = sequence[index + 1]?.index ?? endIndex;
      const question = questionGroups[sequenceIndex]?.find((item) => item.number === marker.number);
      const answerLines = lines.slice(marker.index, end);
      return {
        number: marker.number,
        answer: cleanExtractedAnswer(
          normalizeSpace(answerLines.map((line) => line.bold).filter(Boolean).join(" ")) ||
            (question ? extractPlainAnswer(question, answerLines) : ""),
        ),
      };
    });
  });
}

function getSha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function getPdfPageCount(filePath) {
  const output = execFileSync("pdfinfo", [filePath], { encoding: "utf8" });
  return Number(output.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
}

function chooseCanonicalPdf(candidates) {
  const scored = candidates.map((path) => {
    const pageCount = getPdfPageCount(path);
    const file = basename(path, extname(path));
    const parent = basename(dirname(path));
    const relativePath = relative(sourceRoot, path);
    let score = 0;
    if (/\(\d+\)/.test(file)) score += 100;
    if (file !== parent) score += 10;
    if (/\d{4}PDF\//.test(relativePath)) score += 3;
    score += Math.abs(pageCount - 4);
    return { pageCount, path, score };
  });

  return scored.sort((left, right) => left.score - right.score || left.path.localeCompare(right.path))[0];
}

function getArticleIds() {
  const articles = [];
  for (let year = 2015; year <= 2026; year += 1) {
    const indexPath = join(dataRoot, String(year), "index.json");
    if (!existsSync(indexPath)) continue;
    for (const article of JSON.parse(readFileSync(indexPath, "utf8"))) {
      articles.push({ id: article.id, title: article.title, year: article.year });
    }
  }
  return articles;
}

function buildRecord(article, pdfInfo) {
  const pages = readPdfPages(pdfInfo.path);
  const questionPageRange = findQuestionPageRange(pages);
  const questionPageIndex = questionPageRange?.start ?? -1;
  const answerPageIndex = pages.findIndex(pageHasAnswers);
  const questionPageEnd = questionPageRange
    ? answerPageIndex > questionPageRange.start
      ? answerPageIndex - 1
      : questionPageRange.end
    : -1;
  const issues = [];

  if (questionPageIndex < 0) issues.push("question_page_not_found");
  if (answerPageIndex < 0) issues.push("answer_page_not_found");

  const questionLines = questionPageRange
    ? pages.slice(questionPageIndex, questionPageEnd + 1).join("\n").split("\n")
    : [];
  const matching = parseMatchingSection(questionLines);
  const sequences = findQuestionSequences(questionLines);
  const summaryExercise = parseSummaryExercise(questionLines);
  const hasNumberedExercise = sequences.length >= 2;
  if (sequences.length < 1 && matching.length !== 5) issues.push("quiz_group_not_found");
  if (sequences.length < 2 && summaryExercise.length !== 5) issues.push("exercise_group_not_found");
  if (matching.length && (matching.length < 1 || matching.length > 5)) issues.push(`matching_count_${matching.length}`);

  const exerciseHeadingIndex = questionLines.findIndex(
    (line, index) => index > (sequences[0]?.at(-1)?.index ?? -1) && /(?:\bExercise\b|练习)/i.test(line),
  );
  const summaryHeadingIndex = findSummaryHeadingIndex(questionLines);
  const quizGroupEnd = exerciseHeadingIndex >= 0
    ? exerciseHeadingIndex
    : summaryHeadingIndex >= 0
      ? summaryHeadingIndex
      : sequences[1]?.[0]?.index ?? questionLines.length;
  const quiz = sequences[0]
    ? parseQuestionGroup(questionLines, sequences[0], false, quizGroupEnd)
    : [];
  const exercise = hasNumberedExercise
    ? parseQuestionGroup(questionLines, sequences[1], true)
    : summaryExercise;
  if (quiz.length !== 5) issues.push(`quiz_count_${quiz.length}`);
  if (exercise.length !== 5) issues.push(`exercise_count_${exercise.length}`);

  const answerLines = answerPageIndex >= 0
    ? pages.slice(answerPageIndex)
      .flatMap((_, index) => readBoldAnswerLines(pdfInfo.path, answerPageIndex + index + 1))
      .filter((line) => !/Take Away English|Page \d+ of \d+/i.test(line.full))
    : [];
  const answerGroups = parseAnswerGroupsWithoutHeadings(answerLines, [quiz, exercise]);
  const quizAnswers = parseAnswerGroup(answerLines, /(?:\bQuiz\b|测验)/i, /(?:\bExercise\b|练习)/i, quiz);
  const exerciseAnswers = parseAnswerGroup(answerLines, /(?:\bExercise\b|练习)/i, undefined, exercise);
  const resolvedQuizAnswers = quizAnswers.length === 5
    ? quizAnswers
    : (answerGroups.find((group) => group.length === 5) ?? quizAnswers ?? []);
  const resolvedExerciseAnswers = hasNumberedExercise
    ? (exerciseAnswers.length ? exerciseAnswers : (answerGroups[1] ?? []))
    : extractSummaryAnswers(answerLines, summaryExercise[0]?.options ?? []);
  const resolvedMatchingAnswers = extractMatchingAnswers(answerLines, matching);
  if (resolvedQuizAnswers.length !== 5) issues.push(`quiz_answer_count_${resolvedQuizAnswers.length}`);
  if (resolvedExerciseAnswers.length !== 5) issues.push(`exercise_answer_count_${resolvedExerciseAnswers.length}`);
  if (matching.length && resolvedMatchingAnswers.filter((answer) => answer.answer).length !== matching.length) {
    issues.push("matching_answers_incomplete");
  }

  const quizWithAnswers = quiz.map((question) => ({
    ...question,
    answer: resolveChoiceAnswer(
      question,
      resolvedQuizAnswers.find((answer) => answer.number === question.number)?.answer ?? "",
    ),
  }));
  const exerciseWithAnswers = exercise.map((question) => ({
    ...question,
    answer: (() => {
      const extractedAnswer = resolvedExerciseAnswers.find((answer) => answer.number === question.number)?.answer ?? "";
      return question.options?.find((option) => normalizeAnswer(option) === normalizeAnswer(extractedAnswer)) ?? extractedAnswer;
    })(),
  }));
  const matchingWithAnswers = matching.map((question) => ({
    ...question,
    answer: resolvedMatchingAnswers.find((answer) => answer.number === question.number)?.answer ?? "",
  }));

  for (const question of [...matchingWithAnswers, ...quizWithAnswers, ...exerciseWithAnswers]) {
    if (!question.answer) issues.push(`missing_answer_${question.number}`);
  }
  for (const question of [...matchingWithAnswers, ...quizWithAnswers]) {
    if (question.options && question.answer && !question.options.some((option) => normalizeAnswer(option) === normalizeAnswer(question.answer))) {
      issues.push(`answer_not_in_options_${question.number}`);
    }
  }
  for (const question of exerciseWithAnswers) {
    if (!question.isSummary && question.options?.length !== 4) issues.push(`option_count_${question.number}_${question.options?.length ?? 0}`);
    if (question.answer && !question.options?.some((option) => normalizeAnswer(option) === normalizeAnswer(question.answer))) {
      issues.push(`answer_not_in_options_${question.number}`);
    }
    if ((question.prompt.match(/_{2,}/g) ?? []).length !== 1) issues.push(`blank_count_${question.number}`);
  }

  const partialMatchingReview = matching.length > 0
    && issues.length > 0
    && issues.every((issue) => issue === "matching_answers_incomplete" || issue === "missing_answer_5");
  const status = issues.length === 0 ? "ready" : partialMatchingReview ? "partial" : "review_required";

  return {
    articleId: article.id,
    articleTitle: article.title,
    status,
    source: {
      answerEvidence: "Answers page bold text extracted with pdftohtml XML and mapped by source question number.",
      answerPage: answerPageIndex + 1,
      answerPageEnd: pages.length,
      canonicalPageCount: pdfInfo.pageCount,
      duplicatePdfCount: pdfInfo.duplicateCount,
      pdf: relative(sourceRoot, pdfInfo.path),
      pdfSha256: getSha256(pdfInfo.path),
      questionPage: questionPageIndex + 1,
      questionPageEnd: questionPageEnd + 1,
      reviewIssues: issues,
    },
    matching: matchingWithAnswers,
    quiz: quizWithAnswers,
    exercise: exerciseWithAnswers,
  };
}

function main() {
  if (!existsSync(sourceRoot)) throw new Error(`Source directory is unavailable: ${sourceRoot}`);
  const requestedIds = new Set(process.argv.slice(2).filter((value) => /^\d{6}$/.test(value)));
  const pdfGroups = new Map();
  for (const file of walk(sourceRoot).filter((file) => extname(file).toLowerCase() === ".pdf")) {
    const id = relative(sourceRoot, file).match(/(?:^|[\\/])(\d{6})-/)?.[1];
    if (id) pdfGroups.set(id, [...(pdfGroups.get(id) ?? []), file]);
  }

  const articles = getArticleIds().filter((article) => !requestedIds.size || requestedIds.has(article.id));
  const catalog = [];
  const coverage = [];
  for (const article of articles) {
    const candidates = pdfGroups.get(article.id) ?? [];
    if (!candidates.length) {
      coverage.push({ articleId: article.id, status: "review_required", issues: ["pdf_not_found"] });
      continue;
    }
    const pdfInfo = chooseCanonicalPdf(candidates);
    const record = buildRecord(article, { ...pdfInfo, duplicateCount: candidates.length });
    catalog.push(record);
    coverage.push({
      articleId: article.id,
      status: record.status,
      pdf: record.source.pdf,
      questionPage: record.source.questionPage,
      answerPage: record.source.answerPage,
      issues: record.source.reviewIssues,
    });
  }

  if (requestedIds.size) {
    console.log(JSON.stringify(catalog, null, 2));
    return;
  }

  mkdirSync(dataRoot, { recursive: true });
  writeFileSync(outputCatalog, `${JSON.stringify(catalog, null, 2)}\n`);
  writeFileSync(outputCoverage, `${JSON.stringify({ generatedFrom: sourceRoot, articles: coverage }, null, 2)}\n`);
  const ready = coverage.filter((item) => item.status === "ready").length;
  const partial = coverage.filter((item) => item.status === "partial").length;
  const review = coverage.filter((item) => item.status === "review_required").length;
  console.log(`BBC quiz catalog: ${catalog.length} records; ready=${ready}; partial=${partial}; review_required=${review}`);
}

main();
