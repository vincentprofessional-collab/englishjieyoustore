export type VocabularyExam = "junior" | "senior" | "cet4" | "cet6" | "postgraduate" | "ielts" | "sat" | "gre" | "gmat";
export type VocabularyExamQuestion = {
  id: string;
  exam: VocabularyExam;
  source: string;
  href: string;
  number: string;
  type: "choice" | "fill";
  instruction: string;
  context: string;
  prompt: string;
  options: Array<{ label: string; text: string }>;
  answers: string[];
  explanation: string;
  keywords: string[];
};

export const EXAM_BY_LEVEL: Record<string, VocabularyExam> = {
  初中: "junior", 初中短语: "junior", 高中: "senior", 高中短语: "senior",
  四级: "cet4", 六级: "cet6", 考研: "postgraduate", 托雅: "ielts", 雅思: "ielts",
  SAT: "sat", GRE: "gre", GMAT: "gmat",
};
export const EXAM_LABELS: Record<VocabularyExam, string> = {
  junior: "中考", senior: "高考", cet4: "四级", cet6: "六级", postgraduate: "考研",
  ielts: "雅思", sat: "SAT", gre: "GRE", gmat: "GMAT",
};
export const EXAM_QUESTION_PAGE_SIZE = 5;
export const normalizeExamWord = (value: string) => value.normalize("NFC").toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

// Controlled source blocks only. Never copy raw HTML, source paths or media into the response.
export function examBlockText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(examBlockText).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";
  const block = value as Record<string, any>;
  if (["image", "audio", "video", "figure"].includes(block.type ?? block.kind)) return "";
  if (block.type === "blank" || block.questionNo) return `${block.questionNo ?? ""} ______`;
  if (typeof block.text === "string") return block.text;
  if (Array.isArray(block.runs)) return block.runs.map(examBlockText).join("");
  if (Array.isArray(block.segments)) return block.segments.map(examBlockText).join("");
  const content = [block.headers, block.rows, block.cells, block.blocks, block.items, block.turns, block.texts, block.paragraphs]
    .filter(Boolean).map(examBlockText).filter(Boolean).join("\n");
  return [block.speaker ?? block.label ?? block.title, content].filter(Boolean).join("\n");
}

export function examQuestionKeywords(prompt: string, options: string[], answers: string[]): string[] {
  const values = [...answers, ...options.filter(value => value.trim().split(/\s+/).length <= 5)];
  for (const match of prompt.matchAll(/[“"‘']([\p{L}][\p{L}'’ -]{1,60})[”"’']/gu)) values.push(match[1]);
  const result = new Set<string>();
  for (const value of values) {
    const normalized = normalizeExamWord(value.replace(/^[A-Z][.)、]\s*/i, ""));
    if (!normalized || /^(?:[a-z]|[ivx]+|true|false|yes|no|not given)$/i.test(normalized)) continue;
    if (/^[\p{L}' -]+$/u.test(normalized)) result.add(normalized);
    for (const word of normalized.match(/[\p{L}]+(?:['-][\p{L}]+)*/gu) ?? []) if (word.length > 1) result.add(word);
  }
  return [...result];
}

type Source = { exam: VocabularyExam; title: string; href: string };
function finish(source: Source, value: Omit<VocabularyExamQuestion, "exam" | "source" | "href" | "keywords">): VocabularyExamQuestion | null {
  if ((!value.prompt.trim() && !value.context.trim()) || !value.answers.length || /^Question\s+\d+\s*______?$/i.test(value.prompt.trim())) return null;
  const answerText = value.type === "choice"
    ? value.answers.flatMap(answer => value.options.filter(option => option.label === answer).map(option => option.text))
    : value.answers;
  const keywords = examQuestionKeywords(`${value.prompt}\n${value.context}`, value.options.map(option => option.text), answerText);
  const question = { ...value, exam: source.exam, href: source.href, source: source.title, keywords };
  // Very large/image-only items belong in the original exam runner, not in a word lookup response.
  return keywords.length && JSON.stringify(question).length <= 16_000 ? question : null;
}

export function extractDocumentExamQuestions(document: Record<string, any>, source: Source): VocabularyExamQuestion[] {
  const result: VocabularyExamQuestion[] = [];
  for (const section of document.sections ?? []) for (const group of section.groups ?? []) {
    const context = examBlockText(group.stimulusBlocks);
    for (const question of group.questions ?? []) {
      if (question.reviewStatus !== "approved" || question.answerSpec?.availability !== "answered") continue;
      const choice = ["single_choice", "multi_choice"].includes(question.type);
      const wordBankFill = question.type === "shared_option_matching" && question.blanks?.length && /选词|填空|cloze/i.test(`${question.typeLabel ?? ""} ${group.title ?? ""} ${section.title ?? ""}`);
      if (!choice && !wordBankFill && !["inline_fill", "multi_blank", "table_fill"].includes(question.type)) continue;
      const options = (question.options?.length ? question.options : wordBankFill ? group.sharedOptions : []) ?? [];
      const answers: string[] = question.answerSpec.acceptedAnswers ?? Object.values(question.answerSpec.perBlankAnswers ?? {}).flat();
      const value = finish(source, {
        id: question.id, number: String(question.displayNumber ?? ""), type: choice || wordBankFill ? "choice" : "fill",
        instruction: examBlockText([section.instructions, group.instructions]), context,
        prompt: examBlockText(question.promptBlocks),
        options: options.map((option: any) => ({ label: option.label ?? option.id, text: examBlockText(option.blocks) })),
        answers, explanation: examBlockText(question.explanationBlocks),
      });
      if (value) result.push(value);
    }
  }
  return result;
}

export function extractJuniorExamQuestions(document: Record<string, any>, source: Source): VocabularyExamQuestion[] {
  const result: VocabularyExamQuestion[] = [];
  for (const question of document.questions ?? []) {
    if (question.source?.needsReview || !question.answer || question.image || question.optionImages?.length) continue;
    const type = question.inputKind ?? question.type;
    const choice = type === "choice" || type === "single_choice";
    if (!choice && !["blank", "fill", "inline-blank", "inline_fill"].includes(type)) continue;
    const options = (question.options ?? []).map((text: string, index: number) => ({ label: String.fromCharCode(65 + index), text: text.replace(/^[A-D][.．、)]\s*/, "") }));
    const group = (document.parts ?? []).flatMap((part: any) => part.groups ?? []).find((row: any) => row.id === question.groupId);
    const value = finish(source, {
      id: question.id, number: String(question.displayNumber ?? question.number), type: choice ? "choice" : "fill",
      instruction: (group?.instructions ?? []).join("\n"), context: question.context || examBlockText(group?.displayBlocks ?? group?.blocks),
      prompt: question.prompt ?? "", options, answers: [question.answer], explanation: question.analysis ?? "",
    });
    if (value) result.push(value);
  }
  return result;
}

export function extractSatExamQuestions(document: Record<string, any>, source: Source): VocabularyExamQuestion[] {
  return (document.questions ?? []).flatMap((question: any) => {
    if (question.reviewStatus !== "verified" || question.test !== "Reading and Writing" || !question.correctAnswer) return [];
    const value = finish(source, {
      id: question.id, number: String(question.number ?? ""), type: "choice", instruction: "",
      context: examBlockText(question.contentBlocks), prompt: question.prompt ?? "",
      options: (question.choices ?? []).map((option: any) => ({ label: option.id, text: option.text })),
      answers: [question.correctAnswer], explanation: question.rationale ?? "",
    });
    return value ? [value] : [];
  });
}

export function extractIeltsReadingQuestions(tests: Record<string, any>[]): VocabularyExamQuestion[] {
  const result: VocabularyExamQuestion[] = [];
  for (const test of tests) for (const part of test.parts ?? []) {
    if (!test.source?.verified || !part.source?.textVerified) continue;
    for (const block of part.questionBlocks ?? []) {
      if (!["choice", "fill"].includes(block.type) || /TRUE.*FALSE|YES.*NO|NOT GIVEN/i.test(block.instruction ?? "")) continue;
      for (const question of block.questions ?? []) {
        const number = question.number ?? question.questionNumbers?.[0];
        const answers = Array.isArray(question.answer) ? question.answer : question.answer ? [question.answer] : [];
        if (answers.length && answers.every((answer: string) => /^(?:TRUE|FALSE|YES|NO|NOT\s*GIVEN)$/i.test(answer))) continue;
        const prompt = block.type === "fill" ? `${question.before ?? ""} ______ ${question.after ?? ""}` : question.prompt ?? "";
        const value = finish({ exam: "ielts", title: `${test.title} · ${part.label}`, href: `/reading/practice/${encodeURIComponent(test.id)}` }, {
          id: `${test.id}:${part.id}:${number}`, number: String(number), type: block.type,
          instruction: block.instruction ?? "", context: [examBlockText(part.sections), block.title, block.rawText, examBlockText(block.table)].filter(Boolean).join("\n"),
          prompt, options: (question.options ?? []).map((option: any) => ({ label: option.letter, text: option.text })),
          answers, explanation: test.source.answers?.[number]?.explanation ?? "",
        });
        if (value) result.push(value);
      }
    }
  }
  return result;
}

export function indexExamQuestions(questions: VocabularyExamQuestion[]) {
  const index = new Map<string, VocabularyExamQuestion[]>();
  for (const question of questions) for (const key of question.keywords) {
    const rows = index.get(key) ?? []; rows.push(question); index.set(key, rows);
  }
  return index;
}

export function selectExamQuestions(index: Map<string, VocabularyExamQuestion[]>, forms: string[], exam: VocabularyExam, page: number) {
  const unique = new Map<string, VocabularyExamQuestion>();
  for (const form of forms) for (const question of index.get(normalizeExamWord(form)) ?? []) {
    if (question.exam === exam) unique.set(question.id, question);
  }
  const all = [...unique.values()];
  const total = all.length;
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), Math.max(1, Math.ceil(total / EXAM_QUESTION_PAGE_SIZE)));
  return { exam, total, page: safePage, pageSize: EXAM_QUESTION_PAGE_SIZE, questions: all.slice((safePage - 1) * EXAM_QUESTION_PAGE_SIZE, safePage * EXAM_QUESTION_PAGE_SIZE).map(({ keywords: _keywords, ...question }) => question) };
}
