export type BbcQuizQuestion = {
  answer: string;
  isSummary?: boolean;
  number: number;
  options?: string[];
  prompt: string;
  type?: "matching";
};

export type BbcQuizRecord = {
  articleId: string;
  articleTitle: string;
  exercise: BbcQuizQuestion[];
  matching?: BbcQuizQuestion[];
  summary?: BbcQuizQuestion[];
  quiz: BbcQuizQuestion[];
  status: "ready" | "partial" | "review_required";
};

export type BbcPdfQuiz = BbcQuizRecord & {
  source: {
    pdf: string;
    pdfSha256: string;
    canonicalPageCount: number;
    questionPage: number;
    questionPageEnd: number;
    answerPage: number | null;
    answerPageEnd: number | null;
  };
};

function checkQuestions(label: string, questions: BbcQuizQuestion[], paragraphCount?: number) {
  const issues: string[] = [];
  if (questions.length > 50) issues.push(`${label}超过 50 题。`);
  const numbers = new Map<number, number>();
  for (const question of questions) numbers.set(question.number, (numbers.get(question.number) ?? 0) + 1);
  const playable = questions.filter((question) => {
    const name = `${label}第 ${question.number} 题`;
    const priorIssueCount = issues.length;
    const options = question.options ?? [];
    if (!Number.isInteger(question.number) || question.number < 1 || numbers.get(question.number) !== 1) issues.push(`${name}的题号无效或重复。`);
    if (options.some((option) => !option.trim()) || new Set(options).size !== options.length) issues.push(`${name}的选项缺漏或重复，请核对 PDF。`);
    if (!question.prompt.trim()) issues.push(`${name}缺少题干。`);
    if (!question.answer.trim()) issues.push(`${name}缺少答案，可核对 PDF 后补充。`);
    if (question.answer.trim() && options.length && !options.includes(question.answer)) issues.push(`${name}的答案不在选项中。`);
    if (label === "填空题" && (question.prompt.match(/_{2,}/g) ?? []).length !== 1) issues.push(`${name}需要保留一个填空位置。`);
    if (label === "段落配对") {
      const paragraph = Number(question.prompt.match(/^Paragraph\s+(\d+)$/i)?.[1]);
      if (!Number.isInteger(paragraph) || paragraph < 1) issues.push(`${name}缺少有效的段落编号。`);
      if (paragraphCount !== undefined && paragraph > paragraphCount) issues.push(`${name}对应第 ${paragraph} 段，正文只有 ${paragraphCount} 段。`);
      if (!options.length) issues.push(`${name}缺少段落配对选项。`);
    }
    return issues.length === priorIssueCount;
  });
  return { issues, playable };
}

function checkQuiz(record: BbcQuizRecord, paragraphCount?: number) {
  const summary = checkQuestions("总结句选择", record.summary ?? []);
  const matching = checkQuestions("段落配对", record.matching ?? [], paragraphCount);
  const quiz = checkQuestions("阅读题", record.quiz);
  const exercise = checkQuestions("填空题", record.exercise);
  const issues = [...summary.issues, ...matching.issues, ...quiz.issues, ...exercise.issues];
  if (!(record.summary?.length || record.matching?.length || record.quiz.length || record.exercise.length)) issues.push("PDF 中没有识别到题目。");
  const summaryBlanks = record.exercise.filter((question) => question.isSummary);
  const mixedBlanks = summaryBlanks.length > 0 && summaryBlanks.length !== record.exercise.length;
  const inconsistentWordBank = summaryBlanks.some((question) => JSON.stringify(question.options) !== JSON.stringify(summaryBlanks[0].options));
  if (mixedBlanks) issues.push("总结填空不能与独立填空混在同一组。请分开整理。");
  if (inconsistentWordBank) issues.push("同一篇总结填空的备选词汇必须一致。");
  return {
    issues: [...new Set(issues)],
    summary: summary.playable,
    matching: matching.playable,
    quiz: quiz.playable,
    exercise: mixedBlanks || inconsistentWordBank || (summaryBlanks.length && exercise.issues.length)
      ? exercise.playable.filter((question) => !question.isSummary)
      : exercise.playable,
  };
}

export function getBbcPdfQuizIssues(record: BbcQuizRecord, paragraphCount?: number) {
  return checkQuiz(record, paragraphCount).issues;
}

export function getPlayableBbcPdfQuiz<T extends BbcQuizRecord>(record: T, paragraphCount?: number): T | null {
  const { summary, matching, quiz, exercise } = checkQuiz(record, paragraphCount);
  if (!(summary.length || matching.length || quiz.length || exercise.length)) return null;
  return { ...record, summary, matching, quiz, exercise, status: "ready" };
}

/** Validate the JSON at the save boundary; never trust a client import label. */
export function normalizeBbcPdfQuiz(value: unknown, articleId: string, articleTitle: string, paragraphCount?: number, allowIncomplete = false): BbcPdfQuiz | string {
  if (!value || typeof value !== "object") return "PDF 练习内容格式无效。";
  if (JSON.stringify(value).length > 1_000_000) return "PDF 练习内容过长，请只保留本篇文章的题目。";
  const input = value as Record<string, unknown>;
  const source = input.source as BbcPdfQuiz["source"] | undefined;
  if (!source || typeof source.pdf !== "string" || !source.pdf.trim() || source.pdf.length > 240 || typeof source.pdfSha256 !== "string" || !/^[a-f0-9]{64}$/.test(source.pdfSha256)) return "PDF 来源记录不完整，请重新选择 PDF。";
  const pageCount = source.canonicalPageCount;
  const answerPage = source.answerPage ?? null;
  const answerPageEnd = source.answerPageEnd ?? null;
  const validPage = (page: number) => Number.isInteger(page) && page >= 1 && page <= pageCount;
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 80 || !validPage(source.questionPage) || !validPage(source.questionPageEnd) || source.questionPageEnd < source.questionPage) return "PDF 来源页码无效。";
  if ((answerPage !== null || answerPageEnd !== null) &&
      (answerPage === null || answerPageEnd === null || !validPage(answerPage) || !validPage(answerPageEnd) || answerPageEnd < answerPage || answerPage < source.questionPageEnd)) return "PDF 答案页码无效。";
  function group(value: unknown): BbcQuizQuestion[] | null {
    if (!Array.isArray(value) || value.length > 50) return null;
    const result: BbcQuizQuestion[] = [];
    for (const row of value) {
      if (!row || typeof row !== "object" || typeof row.number !== "number" || typeof row.prompt !== "string" || row.prompt.length > 6000 || typeof row.answer !== "string" || row.answer.length > 3000) return null;
      if (row.options !== undefined && (!Array.isArray(row.options) || row.options.length > 20 || row.options.some((option: unknown) => typeof option !== "string" || option.length > 1000))) return null;
      result.push({ number: row.number, prompt: row.prompt.trim(), answer: row.answer.trim(), ...(row.options?.length ? { options: row.options.map((option: string) => option.trim()) } : {}), ...(row.isSummary === true ? { isSummary: true } : {}), ...(row.type === "matching" ? { type: "matching" } : {}) });
    }
    return result;
  }
  const summary = group(input.summary ?? []), matching = group(input.matching ?? []), quiz = group(input.quiz), exercise = group(input.exercise);
  if (!summary || !matching || !quiz || !exercise) return "PDF 题目、选项或答案格式无效。";
  const record: BbcPdfQuiz = {
    articleId, articleTitle, ...(summary.length ? { summary } : {}), matching, quiz, exercise, status: "ready",
    source: { pdf: source.pdf.trim(), pdfSha256: source.pdfSha256, canonicalPageCount: pageCount, questionPage: source.questionPage, questionPageEnd: source.questionPageEnd, answerPage, answerPageEnd },
  };
  const issues = getBbcPdfQuizIssues(record, paragraphCount);
  if (issues.length) {
    if (!allowIncomplete) return issues.join("\n");
    record.status = "review_required";
  }
  return record;
}
