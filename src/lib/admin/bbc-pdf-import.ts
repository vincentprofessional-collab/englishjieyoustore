import type { BbcPdfQuiz, BbcQuizQuestion } from "@/lib/articles/bbc-quiz";
import { getBbcPdfQuizIssues } from "@/lib/articles/bbc-quiz";
import {
  extractMatchingAnswers, extractSummaryAnswers, findQuestionSequences, findSummaryHeadingIndex,
  normalizeAnswer, normalizeSpace, parseAnswerGroup, parseAnswerGroupsWithoutHeadings,
  parseMatchingSection, parseSummaryChoice, extractSummaryChoiceAnswers, parseQuestionGroup, parseSummaryExercise, resolveChoiceAnswer,
  type PdfAnswerLine, type QuestionDraft,
} from "@/lib/articles/bbc-pdf-quiz-parser.mjs";

export type BbcPdfPage = { lines: PdfAnswerLine[]; text: string };

/** Shared extraction keeps server and browser imports faithful to the same PDF. */
export async function readBbcPdf(
  file: File,
  onProgress?: (page: number, total: number) => void,
  readerOptions?: { reader: typeof import("pdfjs-dist/legacy/build/pdf.mjs"); workerSrc: string; assetBase: string },
) {
  if (!/\.pdf$/i.test(file.name) || !file.size || file.size > 30 * 1024 * 1024) throw new Error("请选择不超过 30 MB 的 PDF 文件。");
  const bytes = await file.arrayBuffer();
  if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes("%PDF-")) throw new Error("文件不是有效的 PDF。");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const pdfSha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  // Load the legacy reader unchanged so browser polyfills and the worker use
  // the same PDF.js build, including in Safari and embedded browsers.
  const readerUrl = "/vendor/bbc-pdf/pdf.min.mjs";
  const pdfjs = readerOptions?.reader ?? await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ readerUrl) as typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = readerOptions?.workerSrc ?? "/vendor/bbc-pdf/pdf.worker.min.mjs";
  const assets = readerOptions?.assetBase ?? "/vendor/bbc-pdf/";
  const job = pdfjs.getDocument({ data: new Uint8Array(bytes), fontExtraProperties: true, cMapUrl: `${assets}cmaps/`, cMapPacked: true, standardFontDataUrl: `${assets}standard_fonts/`, wasmUrl: `${assets}wasm/` });
  try {
    const pdf = await job.promise;
    if (pdf.numPages > 80) throw new Error("BBC 练习 PDF 最多支持 80 页，请只保留本篇文章的页面。");
    const pages: BbcPdfPage[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      onProgress?.(number, pdf.numPages);
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      // Font names identify bold inline answers; requesting operators loads the
      // translated fonts without rendering a canvas or uploading the document.
      await page.getOperatorList();
      const rows: { y: number; height: number; items: { x: number; width: number; text: string; bold: boolean }[] }[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const y = item.transform[5], height = Math.abs(item.transform[3]) || item.height || 12;
        let fontName = item.fontName;
        try { fontName = page.commonObjs.get(item.fontName)?.name ?? fontName; } catch { /* Some fonts are image-only. */ }
        const bold = /bold|black|heavy|semibold|demi/i.test(fontName);
        let row = rows.find((row) => Math.abs(row.y - y) <= Math.max(2, height * 0.15));
        if (!row) { row = { y, height, items: [] }; rows.push(row); }
        row.items.push({ x: item.transform[4], width: item.width, text: item.str, bold });
      }
      const lines: PdfAnswerLine[] = [];
      const ordered = rows.sort((left, right) => right.y - left.y);
      for (let index = 0; index < ordered.length; index++) {
        const row = ordered[index], previous = ordered[index - 1];
        if (previous && previous.y - row.y > Math.max(row.height, previous.height) * 1.8) lines.push({ full: "", bold: "" });
        const pieces = row.items.sort((left, right) => left.x - right.x);
        let full = "";
        for (let piece = 0; piece < pieces.length; piece++) {
          const item = pieces[piece], before = pieces[piece - 1];
          const gap = before ? item.x - before.x - before.width : 0;
          const separator = before ? gap > row.height * 1.4 ? "    " : gap > row.height * 0.08 ? " " : "" : "";
          full += separator + item.text;
        }
        lines.push({ full: full.trim(), bold: normalizeSpace(pieces.filter((piece) => piece.bold).map((piece) => piece.text).join(" ")) });
      }
      pages.push({ lines, text: lines.map((line) => line.full).join("\n") });
      page.cleanup();
    }
    if (pages.every((page) => page.text.replace(/\s/g, "").length < 30)) throw new Error("这份 PDF 是扫描图片，无法直接提取题目。请上传带可选中文字的原版 PDF。");
    return { pages, pdfSha256 };
  } catch (cause) {
    if (cause instanceof Error && cause.name === "PasswordException") throw new Error("PDF 已加密，请先解除密码后再上传。");
    throw cause;
  } finally { await job.destroy(); }
}

export function parseBbcPdfQuiz(pages: BbcPdfPage[], source: { pdf: string; pdfSha256: string }, articleId = "", articleTitle = ""): BbcPdfQuiz {
  const clean = (line: PdfAnswerLine) => !/Take Away English|Page \d+ of \d+|bbclearningenglish\.com|©British Broadcasting/i.test(line.full);
  const rows = pages.flatMap((page, index) => page.lines.filter(clean).map((line) => ({ line, page: index + 1 })));
  const exerciseTitle = /^(?:Vocabulary )?(?:Exercise|练习)(?:\s*[:：]\s*.*)?$/i;
  const start = rows.findIndex(({ line }) =>
    /(?:^(?:Quiz|测验)\s*[:：]?|将标题和段落配对|根据文章内容选出正确)/i.test(line.full.trim()) || exerciseTitle.test(line.full.trim()));
  if (start < 0) throw new Error("PDF 内容中未识别到练习题。");
  const answerStart = rows.findIndex(({ line }, index) =>
    index > start && /^(?:Answers?|Answer Key|(?:参考)?答案)\s*[:：]?$/i.test(line.full.trim()));
  const questionRows = rows.slice(start, answerStart >= 0 ? answerStart : undefined);
  const questions = questionRows.map(({ line }) => line.full);
  const answerLines = answerStart >= 0 ? rows.slice(answerStart + 1).map(({ line }) => line) : [];
  const matching = parseMatchingSection(questions);
  const summaryChoice = parseSummaryChoice(questions);
  const sequences = findQuestionSequences(questions);
  const summary = parseSummaryExercise(questions);
  const summaryStart = findSummaryHeadingIndex(questions);
  const exerciseHeading = questions.findIndex((line, index) => index > (sequences[0]?.at(-1)?.index ?? -1) && /(?:\bExercise\b|练习)/i.test(line));
  const end = [summaryStart, exerciseHeading, sequences[1]?.[0]?.index, questions.length].filter((index): index is number => index !== undefined && index >= 0).sort((left, right) => left - right)[0];
  const exerciseOnly = exerciseTitle.test(questions[0].trim());
  const quiz = !exerciseOnly && sequences[0] ? parseQuestionGroup(questions, sequences[0], false, end) : [];
  const exerciseSequence = sequences[exerciseOnly ? 0 : 1];
  const exercise = summary.length ? summary : exerciseSequence ? parseQuestionGroup(questions, exerciseSequence, true) : [];
  if (![matching, summaryChoice, quiz, exercise].some((group) => group.length)) throw new Error("PDF 内容中未识别到练习题。");
  const answerGroups = parseAnswerGroupsWithoutHeadings(answerLines, [quiz, exercise].filter((group) => group.length));
  const quizAnswers = parseAnswerGroup(answerLines, /(?:\bQuiz\b|测验)/i, /(?:\bExercise\b|练习)/i, quiz);
  const exerciseAnswers = parseAnswerGroup(answerLines, /(?:\bExercise\b|练习)/i, undefined, exercise);
  const quizKey = quizAnswers.length === quiz.length ? quizAnswers : answerGroups[0] ?? quizAnswers;
  const exerciseKey = summary.length ? extractSummaryAnswers(answerLines, summary[0]?.options ?? [], summary.length) : exerciseAnswers.length ? exerciseAnswers : answerGroups[quiz.length ? 1 : 0] ?? [];
  const matchingKey = extractMatchingAnswers(answerLines, matching);
  function answered(group: QuestionDraft[], key: { number: number; answer: string }[]): BbcQuizQuestion[] {
    return group.map((question) => {
      const extracted = key.find((answer) => answer.number === question.number)?.answer ?? "";
      const answer = question.options?.find((option) => normalizeAnswer(option) === normalizeAnswer(extracted)) ?? resolveChoiceAnswer(question, extracted);
      return { ...question, answer };
    });
  }
  const result: BbcPdfQuiz = {
    articleId, articleTitle, ...(summaryChoice.length ? { summary: answered(summaryChoice, extractSummaryChoiceAnswers(answerLines)) } : {}), matching: answered(matching, matchingKey), quiz: answered(quiz, quizKey), exercise: answered(exercise, exerciseKey), status: "ready",
    source: {
      ...source,
      canonicalPageCount: pages.length,
      questionPage: rows[start].page,
      questionPageEnd: questionRows.at(-1)!.page,
      answerPage: answerStart >= 0 ? rows[answerStart].page : null,
      answerPageEnd: answerStart >= 0 ? pages.length : null,
    },
  };
  if (getBbcPdfQuizIssues(result).length) result.status = "review_required";
  return result;
}
