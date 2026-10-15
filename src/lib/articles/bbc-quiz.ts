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
    answerPage: number;
    answerPageEnd: number;
  };
};

export function getBbcPdfQuizIssues(record: BbcQuizRecord, paragraphCount?: number) {
  const issues: string[] = [];
  const groups = [["总结句选择", record.summary ?? []], ["段落配对", record.matching ?? []], ["阅读题", record.quiz], ["填空题", record.exercise]] as const;
  if (!groups.some(([, questions]) => questions.length)) issues.push("PDF 中没有识别到题目。");
  for (const [label, questions] of groups) {
    if (questions.length > 50) issues.push(`${label}超过 50 题。`);
    const numbers = new Set<number>();
    for (const question of questions) {
      const name = `${label}第 ${question.number} 题`;
      if (!Number.isInteger(question.number) || question.number < 1 || numbers.has(question.number)) issues.push(`${name}的题号无效或重复。`);
      numbers.add(question.number);
      if (question.options?.some((option) => !option.trim())) issues.push(`${name}的选项缺漏，请核对 PDF。`);
      if (!question.prompt.trim()) issues.push(`${name}缺少题干。`);
      if (!question.answer.trim()) issues.push(`${name}缺少答案，请核对 PDF 后补充或删除此题。`);
      if (question.answer.trim() && question.options?.length && !question.options.includes(question.answer)) issues.push(`${name}的答案不在选项中。`);
      if (label === "填空题" && (question.prompt.match(/_{2,}/g) ?? []).length !== 1) issues.push(`${name}需要保留一个填空位置。`);
      if (label === "段落配对" && paragraphCount) {
        const paragraph = Number(question.prompt.match(/^Paragraph\s+(\d+)$/i)?.[1]);
        if (paragraph > paragraphCount) issues.push(`${name}对应第 ${paragraph} 段，正文只有 ${paragraphCount} 段。`);
      }
    }
  }
  const summary = record.exercise.filter((question) => question.isSummary);
  if (summary.length && summary.length !== record.exercise.length) issues.push("总结填空不能与独立填空混在同一组。请分开整理。");
  if (summary.some((question) => JSON.stringify(question.options) !== JSON.stringify(summary[0].options))) issues.push("同一篇总结填空的备选词汇必须一致。");
  return issues;
}

/** Validate the JSON at the save boundary; never trust a client import label. */
export function normalizeBbcPdfQuiz(value: unknown, articleId: string, articleTitle: string, paragraphCount?: number): BbcPdfQuiz | string {
  if (!value || typeof value !== "object") return "PDF 练习内容格式无效。";
  if (JSON.stringify(value).length > 1_000_000) return "PDF 练习内容过长，请只保留本篇文章的题目。";
  const input = value as Record<string, unknown>;
  const source = input.source as BbcPdfQuiz["source"] | undefined;
  if (!source || typeof source.pdf !== "string" || !source.pdf.trim() || source.pdf.length > 240 || typeof source.pdfSha256 !== "string" || !/^[a-f0-9]{64}$/.test(source.pdfSha256)) return "PDF 来源记录不完整，请重新选择 PDF。";
  const pageCount = source.canonicalPageCount;
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 80 || [source.questionPage, source.questionPageEnd, source.answerPage, source.answerPageEnd].some((page) => !Number.isInteger(page) || page < 1 || page > pageCount) || source.questionPageEnd < source.questionPage || source.answerPageEnd < source.answerPage || source.questionPageEnd >= source.answerPage) return "PDF 来源页码无效。";
  function group(value: unknown): BbcQuizQuestion[] | null {
    if (!Array.isArray(value) || value.length > 50) return null;
    const result: BbcQuizQuestion[] = [];
    for (const row of value) {
      if (!row || typeof row !== "object" || typeof row.prompt !== "string" || row.prompt.length > 6000 || typeof row.answer !== "string" || row.answer.length > 3000) return null;
      if (row.options !== undefined && (!Array.isArray(row.options) || row.options.length > 20 || row.options.some((option: unknown) => typeof option !== "string" || !option.trim() || option.length > 1000) || new Set(row.options).size !== row.options.length)) return null;
      if (row.options && new Set(row.options.map((option: string) => option.trim())).size !== row.options.length) return null;
      result.push({ number: row.number, prompt: row.prompt.trim(), answer: row.answer.trim(), ...(row.options?.length ? { options: row.options.map((option: string) => option.trim()) } : {}), ...(row.isSummary === true ? { isSummary: true } : {}), ...(row.type === "matching" ? { type: "matching" } : {}) });
    }
    return result;
  }
  const summary = group(input.summary ?? []), matching = group(input.matching ?? []), quiz = group(input.quiz), exercise = group(input.exercise);
  if (!summary || !matching || !quiz || !exercise) return "PDF 题目、选项或答案格式无效。";
  const record: BbcPdfQuiz = {
    articleId, articleTitle, ...(summary.length ? { summary } : {}), matching, quiz, exercise, status: "ready",
    source: { pdf: source.pdf.trim(), pdfSha256: source.pdfSha256, canonicalPageCount: pageCount, questionPage: source.questionPage, questionPageEnd: source.questionPageEnd, answerPage: source.answerPage, answerPageEnd: source.answerPageEnd },
  };
  const issues = getBbcPdfQuizIssues(record, paragraphCount);
  return issues.length ? issues.join("\n") : record;
}
