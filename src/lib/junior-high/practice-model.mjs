const WRITING_PATTERN = /书面表达|写作|作文|看图写话/;
const DIALOGUE_PATTERN = /补全对话|口语应用|口语交际|情景交际|完成对话/;
const PASSAGE_CHOICE_PATTERN = /完形填空|语法选择|阅读理解|阅读还原/;
const INLINE_BLANK_PATTERN = /短文填空|语法填空|语篇填空|综合填空|单词拼写|完成句子|句型转换|翻译|用所给词|选词填空/;
const SHORT_ANSWER_PATTERN = /阅读表达|阅读回答问题/;

export const JUNIOR_HIGH_PRACTICE_FAMILIES = Object.freeze([
  { id: "language-use", title: "语言知识运用", subtypes: Object.freeze(["单项选择", "语法选择", "完形填空"]) },
  { id: "reading", title: "阅读理解与任务阅读", subtypes: Object.freeze(["阅读理解", "阅读还原", "任务型阅读", "阅读表达"]) },
  { id: "discourse-fill", title: "语篇填空", subtypes: Object.freeze(["语法填空", "短文填空", "选词填空"]) },
  { id: "communication", title: "情景交际", subtypes: Object.freeze(["补全对话", "根据情景写句子"]) },
  { id: "words-sentences", title: "词汇与句子运用", subtypes: Object.freeze(["单词拼写", "完成句子", "句型转换", "连词成句", "翻译"]) },
  { id: "writing", title: "书面表达", subtypes: Object.freeze(["书面表达", "看图写话"]) },
]);

export const JUNIOR_HIGH_LAYOUT_FAMILIES = Object.freeze([
  "passage-choice",
  "standalone-choice",
  "inline-blank",
  "table-fill",
  "dialogue-completion",
  "short-answer",
  "writing",
]);

export function orderedJuniorHighQuestionIds(paper) {
  const existingIds = new Set((paper.questions ?? []).map((question) => question.id));
  const seen = new Set();
  const ordered = [];
  const add = (id) => {
    if (!existingIds.has(id) || seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
  };

  for (const part of paper.parts ?? []) {
    for (const group of part.groups ?? []) {
      for (const id of group.questionIds ?? []) add(id);
    }
  }
  for (const section of paper.sections ?? []) {
    for (const id of section.questionIds ?? []) add(id);
  }
  for (const question of paper.questions ?? []) add(question.id);
  return ordered;
}

export function canonicalizeJuniorHighQuestionSequence(paper) {
  const questionsById = new Map((paper.questions ?? []).map((question) => [question.id, question]));
  const questions = orderedJuniorHighQuestionIds(paper).map((id, index) => {
    const question = questionsById.get(id);
    const sourceQuestionNumber = String(
      question.sourceQuestionNumber
      ?? question.source?.originalNumber
      ?? question.displayNumber
      ?? question.number
      ?? "",
    ).trim();
    const number = paper.preserveQuestionNumbers
      ? Number(question.number ?? question.displayNumber ?? sourceQuestionNumber ?? index + 1)
      : index + 1;
    const displayNumber = paper.preserveQuestionNumbers
      ? String(question.displayNumber ?? number)
      : String(index + 1);
    return {
      ...question,
      number: Number.isFinite(number) ? number : index + 1,
      displayNumber,
      sourceQuestionNumber,
    };
  });
  const writingTasks = (paper.writingTasks ?? []).map((task, index) => ({
    ...task,
    number: paper.preserveQuestionNumbers ? Number(task.number ?? task.displayNumber ?? questions.length + index + 1) : questions.length + index + 1,
    displayNumber: paper.preserveQuestionNumbers ? String(task.displayNumber ?? task.number ?? questions.length + index + 1) : String(questions.length + index + 1),
    sourceQuestionNumber: String(task.sourceQuestionNumber ?? task.source?.originalNumber ?? task.label ?? index + 1).trim(),
  }));
  return { ...paper, questions, writingTasks };
}

const SOURCE_BATCH_PATTERN = /^第\s*\d+\s*[–—-]\s*\d+\s*题$/;
const BLANK_SOURCE_NUMBER_PATTERN = /(?:[_＿]{2,}|\.{4,}|…{2,})\s*(\d{1,3})\s*(?:[_＿]{2,}|\.{4,}|…{2,})/g;

function normalizedSourceCitation(value = "") {
  return String(value)
    .replace(/[•]/g, "·")
    .replace(/^[\s（(]+|[\s）)]+$/g, "")
    .replace(/\s*·\s*/g, "·")
    .replace(/\s+/g, " ")
    .trim();
}

function bracketedSourceCitation(value = "") {
  const match = String(value).match(/[（(]\s*([^）)]{1,180})[）)]/);
  if (!match) return "";
  const citation = normalizedSourceCitation(match[1]);
  return /20\d{2}|全国通用/.test(citation) ? citation : "";
}

function splitRegionAndExam(value) {
  if (!value || value === "全国通用") return { region: value, examName: "" };
  const match = value.match(/^(.+?)(中考|(?:统考|校考|联考)?[一二三]模|(?:统考|校考|联考|模拟|真题|期中|期末).*)$/);
  if (!match) return { region: value, examName: "" };
  return { region: match[1].trim(), examName: match[2].trim() };
}

export function parseJuniorHighPracticeSource({ sourceSection = "", groupTitle = "", sourceFile = "" } = {}) {
  const section = normalizedSourceCitation(sourceSection);
  const title = normalizedSourceCitation(groupTitle);
  const file = normalizedSourceCitation(sourceFile);
  const explicit = bracketedSourceCitation(sourceSection)
    || (!SOURCE_BATCH_PATTERN.test(section) && /20\d{2}.*[·•]|^20\d{2}\s*年?/.test(section) ? section : "")
    || bracketedSourceCitation(groupTitle)
    || (!SOURCE_BATCH_PATTERN.test(title) && /20\d{2}.*[·•]|^20\d{2}\s*年?/.test(title) ? title : "");
  const fileYear = Number(file.match(/20\d{2}/)?.[0] ?? 0);
  const fileIsNationwide = /全国通用/.test(file);
  if (!explicit && fileYear && fileIsNationwide) {
    return { title: `${fileYear} · 全国通用 · 综合练习`, year: fileYear, region: "全国通用", examName: "综合练习", missing: false };
  }
  if (!explicit) return { title: "来源未标注 · 综合练习", year: 0, region: "", examName: "综合练习", missing: true };

  const year = Number(explicit.match(/20\d{2}/)?.[0] ?? 0);
  const segments = explicit
    .replace(/^20\d{2}\s*年?\s*[·]?\s*/, "")
    .split("·")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const first = splitRegionAndExam(segments.shift() ?? "");
  const region = first.region;
  const examName = [first.examName, ...segments].filter(Boolean).join(" · ");
  if (!year || !region) return { title: "来源未标注 · 综合练习", year: 0, region: "", examName: "综合练习", missing: true };
  const displayParts = [String(year), region, examName].filter(Boolean);
  return { title: displayParts.join(" · "), year, region, examName, missing: false };
}

export function extractJuniorHighBlankSourceNumbers(text = "") {
  return Array.from(String(text).matchAll(BLANK_SOURCE_NUMBER_PATTERN), (match) => match[1]);
}

function groupSourceText(group) {
  const blocks = group.displayBlocks?.length ? group.displayBlocks : group.blocks ?? [];
  return blocks.flatMap((block) => [block.text ?? "", ...(block.rows ?? []).flat()]).join("\n");
}

function questionSourceNumber(question) {
  return String(question?.sourceQuestionNumber ?? question?.source?.originalNumber ?? "").trim();
}

function sourceLine(question) {
  const value = Number(question?.source?.sourceLineStart);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function sameOrder(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function orderedJuniorHighSourceGroupQuestionIds(group, questions = []) {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const originalIds = (group.questionIds ?? []).filter((id, index, ids) => questionsById.has(id) && ids.indexOf(id) === index);
  const sourceNumberIds = new Map();
  for (const id of originalIds) {
    const number = questionSourceNumber(questionsById.get(id));
    if (number && !sourceNumberIds.has(number)) sourceNumberIds.set(number, id);
  }
  const blankIds = [];
  for (const number of extractJuniorHighBlankSourceNumbers(groupSourceText(group))) {
    const id = sourceNumberIds.get(number);
    if (id && !blankIds.includes(id)) blankIds.push(id);
  }
  const lineIds = [...originalIds].sort((left, right) => {
    const difference = sourceLine(questionsById.get(left)) - sourceLine(questionsById.get(right));
    return difference || originalIds.indexOf(left) - originalIds.indexOf(right);
  });
  const auditFlags = [];
  let orderedQuestionIds;
  if (blankIds.length) {
    const remaining = lineIds.filter((id) => !blankIds.includes(id));
    orderedQuestionIds = [...blankIds, ...remaining];
    if (!sameOrder(orderedQuestionIds, originalIds)) auditFlags.push("article-blank-order-overrode-question-ids");
    if (!sameOrder(orderedQuestionIds, lineIds)) auditFlags.push("article-blank-order-overrode-source-lines");
  } else {
    orderedQuestionIds = lineIds;
    if (!sameOrder(orderedQuestionIds, originalIds)) auditFlags.push("source-line-order-overrode-question-ids");
  }
  return { orderedQuestionIds, auditFlags };
}

function normalizedSignatureText(value = "") {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function questionSetSignature(ids, questionsById) {
  return JSON.stringify(ids.map((id) => {
    const question = questionsById.get(id);
    return [
      normalizedSignatureText(question?.prompt),
      (question?.options ?? []).map(normalizedSignatureText),
      normalizedSignatureText(question?.answer),
    ];
  }));
}

function practiceCardSort(left, right) {
  return right.year - left.year
    || left.region.localeCompare(right.region, "zh-CN")
    || left.examName.localeCompare(right.examName, "zh-CN")
    || left.sourceIndex - right.sourceIndex;
}

export function buildJuniorHighSourcePracticeCards(paper) {
  const questionsById = new Map((paper.questions ?? []).map((question) => [question.id, question]));
  const cards = [];
  let sourceIndex = 0;
  for (const part of paper.parts ?? []) {
    for (const group of part.groups ?? []) {
      const order = orderedJuniorHighSourceGroupQuestionIds(group, paper.questions ?? []);
      const orderedQuestionIds = order.orderedQuestionIds.filter((id) => isPracticeItemReady(questionsById.get(id)));
      if (!orderedQuestionIds.length) {
        sourceIndex += 1;
        continue;
      }
      const parsed = parseJuniorHighPracticeSource({
        sourceSection: group.source?.sourceSection,
        groupTitle: group.title,
        sourceFile: group.source?.sourceFile,
      });
      cards.push({
        id: group.id,
        baseTitle: parsed.title,
        title: parsed.title,
        year: parsed.year,
        region: parsed.region,
        examName: parsed.examName,
        missingSource: parsed.missing,
        sourceIndex,
        groupIds: [group.id],
        orderedQuestionIds,
        writingTaskIds: [],
        layoutFamily: resolveJuniorHighLayoutFamily({ questionType: paper.questionType, partTitle: part.title, group, questions: orderedQuestionIds.map((id) => questionsById.get(id)) }),
        sourceFile: group.source?.sourceFile ?? "",
        sourceSection: group.source?.sourceSection ?? group.title ?? "",
        auditFlags: [...order.auditFlags, ...(parsed.missing ? ["source-unmarked"] : [])],
        signature: questionSetSignature(orderedQuestionIds, questionsById),
      });
      sourceIndex += 1;
    }
  }
  for (const task of paper.writingTasks ?? []) {
    if (!isPracticeItemReady(task)) continue;
    const parsed = parseJuniorHighPracticeSource({ sourceSection: task.source?.sourceSection, groupTitle: task.label, sourceFile: task.source?.sourceFile });
    cards.push({
      id: `writing:${task.id}`,
      baseTitle: parsed.title,
      title: parsed.title,
      year: parsed.year,
      region: parsed.region,
      examName: parsed.examName,
      missingSource: parsed.missing,
      sourceIndex,
      groupIds: [],
      orderedQuestionIds: [],
      writingTaskIds: [task.id],
      layoutFamily: "writing",
      sourceFile: task.source?.sourceFile ?? "",
      sourceSection: task.source?.sourceSection ?? task.label ?? "",
      auditFlags: parsed.missing ? ["source-unmarked"] : [],
      signature: JSON.stringify([normalizedSignatureText(task.prompt), normalizedSignatureText(task.requirements), normalizedSignatureText(task.analysis)]),
    });
    sourceIndex += 1;
  }

  const deduplicated = cards.filter((card, index) => cards.findIndex((candidate) => candidate.baseTitle === card.baseTitle && candidate.signature === card.signature) === index);
  const titleCounts = new Map();
  for (const card of deduplicated) titleCounts.set(card.baseTitle, (titleCounts.get(card.baseTitle) ?? 0) + 1);
  const titleOccurrences = new Map();
  return deduplicated.map((card) => {
    const occurrence = (titleOccurrences.get(card.baseTitle) ?? 0) + 1;
    titleOccurrences.set(card.baseTitle, occurrence);
    return {
      ...card,
      title: titleCounts.get(card.baseTitle) > 1 ? `${card.baseTitle}（${occurrence}）` : card.baseTitle,
    };
  }).sort(practiceCardSort);
}

export function createJuniorHighSourcePracticePaper(paper, card) {
  const selectedQuestionIds = new Set(card.orderedQuestionIds ?? []);
  const selectedGroupIds = new Set(card.groupIds ?? []);
  const questionsById = new Map((paper.questions ?? []).map((question) => [question.id, question]));
  const questions = (card.orderedQuestionIds ?? []).map((id) => questionsById.get(id)).filter(Boolean);
  const parts = (paper.parts ?? []).map((part) => ({
    ...part,
    groups: (part.groups ?? []).filter((group) => selectedGroupIds.has(group.id)).map((group) => ({
      ...group,
      questionIds: (card.orderedQuestionIds ?? []).filter((id) => selectedQuestionIds.has(id) && (group.questionIds ?? []).includes(id)),
    })),
  })).filter((part) => part.groups.length > 0);
  const writingTaskIds = new Set(card.writingTaskIds ?? []);
  const selected = {
    ...paper,
    preserveQuestionNumbers: false,
    displayTitle: `${paper.questionType ?? "题型训练"} · ${card.title}`,
    questions,
    parts,
    sections: [],
    writingTasks: (paper.writingTasks ?? []).filter((task) => writingTaskIds.has(task.id)),
    practiceAuditFlags: card.auditFlags ?? [],
  };
  return canonicalizeJuniorHighQuestionSequence(selected);
}

function hasChoiceQuestions(questions) {
  return questions.length > 0 && questions.every((question) => question.inputKind === "choice" || question.options?.length || question.optionImages?.length);
}

function hasInformationConversionTable(group) {
  const blocks = group.displayBlocks?.length ? group.displayBlocks : group.blocks ?? [];
  return blocks.some((block) => block.kind === "table" && block.tableType === "info-conversion");
}

export function resolveJuniorHighLayoutFamily({ questionType = "", partTitle = "", group = {}, questions = [] }) {
  if (JUNIOR_HIGH_LAYOUT_FAMILIES.includes(group.layoutFamily)) return group.layoutFamily;
  const scope = `${questionType} ${partTitle} ${group.title ?? ""} ${(group.instructions ?? []).join(" ")}`;
  if (WRITING_PATTERN.test(scope) || group.groupType === "writing") return "writing";
  if (DIALOGUE_PATTERN.test(scope) || group.groupType === "dialogue-completion") return "dialogue-completion";
  if (hasInformationConversionTable(group)) return "table-fill";
  if (/任务型阅读|信息转换|阅读填表/.test(scope) && (group.blocks ?? []).some((block) => block.kind === "table")) return "table-fill";
  if (PASSAGE_CHOICE_PATTERN.test(scope) || group.groupType === "cloze") return "passage-choice";
  if (SHORT_ANSWER_PATTERN.test(scope)) return "short-answer";
  if ((group.groupType === "reading-passage" || group.groupType === "table-reading") && !hasChoiceQuestions(questions)) return "short-answer";
  if (INLINE_BLANK_PATTERN.test(scope) || group.groupType === "inline-blank" || questions.some((question) => question.inputKind === "blank")) return "inline-blank";
  if (hasChoiceQuestions(questions) || group.groupType === "choice") return "standalone-choice";
  return "short-answer";
}

export function isPracticeItemReady(item) {
  const source = item?.source;
  const hasSourceLocator = Array.isArray(source?.sourcePage) && source.sourcePage.length > 0
    || source?.extractionMethod === "markdown-structured"
      && Number.isInteger(source?.sourceLineStart)
      && Number.isInteger(source?.sourceLineEnd)
      && source.sourceLineStart > 0
      && source.sourceLineEnd >= source.sourceLineStart;
  return Boolean(
    source
    && source.needsReview === false
    && hasSourceLocator
    && Array.isArray(source.reviewFlags)
    && source.reviewFlags.length === 0,
  );
}
