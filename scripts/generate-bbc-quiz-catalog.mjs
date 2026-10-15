import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";

import { normalizeSpace, normalizeAnswer, parseMatchingSection, findQuestionSequences, parseQuestionGroup, parseSummaryExercise, findSummaryHeadingIndex, parseAnswerGroupsWithoutHeadings, parseAnswerGroup, extractSummaryAnswers, extractMatchingAnswers, resolveChoiceAnswer } from "../src/lib/articles/bbc-pdf-quiz-parser.mjs";

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
