import type { JuniorHighBlock, JuniorHighGroupType, JuniorHighQuestion, JuniorHighQuestionGroup, JuniorHighTableType } from "./paper-types";

export function isPassageLabel(text: string) {
  return /^[A-GＡ-Ｇ]$/.test(text.trim());
}

export function isAnswerOptionText(text: string) {
  return /^\s*(?:\d{1,3}\s*[．.、)]\s*)?[A-GＡ-Ｇ]\s*[．.、)]\s*\S+/.test(text);
}

export function questionUsesChoiceControl(question: Pick<JuniorHighQuestion, "inputKind" | "options" | "optionImages">) {
  return question.inputKind === "choice" || Boolean(question.options?.length) || Boolean(question.optionImages?.length);
}

export function questionCanUseInlineBlankControl(question: Pick<JuniorHighQuestion, "inputKind" | "options" | "optionImages">) {
  return !questionUsesChoiceControl(question) && (question.inputKind === "blank" || question.inputKind === "text");
}

export function cleanQuestionDisplayText(text: string) {
  return text
    .replace(/[，,；;。]?\s*并?将(?:答案|所选答案|所选的选项|其字母标号|序号)?(?:填写|填涂|涂|写)?(?:在|到)?答题卡[^。；;]*[。；;]?/g, "")
    .replace(/[，,；;。]?\s*答案(?:填写|填涂|涂|写)?(?:在|到)?答题卡[^。；;]*[。；;]?/g, "")
    .replace(/[，,；;。]?\s*在答题卡[^。；;]*[。；;]?/g, "")
    .replace(/[，,；;。]?\s*答在试卷上无效[。；;]?/g, "")
    .trim();
}

export function splitJuniorHighGroupTitle(text: string) {
  const cleaned = cleanQuestionDisplayText(text).replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^([（(][^）)]*(?:20\d{2}|中考|期中|期末|模拟|真题)[^）)]*[）)])\s*(.+)$/);
  if (!match) return { title: cleaned, instruction: "" };
  return { title: match[1].trim(), instruction: match[2].trim() };
}

export function isNonQuestionInstruction(text: string) {
  const normalized = text.trim();
  if (!normalized) return true;
  return /^注意事项[:：]?$/.test(normalized) ||
    /^考生(?:须知|注意)[:：]?/.test(normalized) ||
    /^温馨提示[:：]?/.test(normalized) ||
    /^第[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVX]+\s*卷/.test(normalized) ||
    /^说明[:：]/.test(normalized) ||
    /^(?:本试卷|本卷|全卷|试卷共|满分为|考试时间|考试结束|答题前|作答前|请务必|所有试题均在答题卡上作答|答在试卷上无效)/.test(normalized) ||
    /^[1-9][.．、]\s*(?:本试卷|本卷|全卷|试题的答案|作答前|请务必|考试结束|答题前|试卷共|所有试题均在答题卡上作答)/.test(normalized);
}

function hasTable(blocks: JuniorHighBlock[]) {
  return blocks.some((block) => block.kind === "table" && block.rows?.length);
}

export function isStructuredReadingText(text: string) {
  return /阅读理解|阅读表达|任务型阅读|完形填空|部分\s*阅读|^阅读下面|请通读下面|根据短文内容|根据材料内容|语法和上下文|\b(?:reading|passage|cloze)\b/i.test(text);
}

export function isListeningText(text: string) {
  return /听力|听说|听音|听短文|听对话|听到|将听到|短文读|对话读/.test(text);
}

export function classifyJuniorHighGroup({
  partTitle,
  group,
  questions,
  displayBlocks,
}: {
  partTitle: string;
  group: JuniorHighQuestionGroup;
  questions: JuniorHighQuestion[];
  displayBlocks?: JuniorHighBlock[];
}): JuniorHighGroupType {
  if (group.groupType) return group.groupType;
  const blocks = displayBlocks ?? group.displayBlocks ?? group.blocks;
  const sourceBlocks = group.blocks?.length ? group.blocks : blocks;
  const groupText = `${group.title} ${group.instructions.join(" ")}`;
  const classificationText = `${partTitle} ${groupText}`;
  const isListeningGroup = isListeningText(groupText);
  const hasInlineQuestions = questions.some(questionCanUseInlineBlankControl);
  const optionLineCount = sourceBlocks.filter((block) => block.kind === "paragraph" && isAnswerOptionText(block.text ?? "")).length;
  if (/书面表达|写作|作文/.test(classificationText)) return "writing";
  if (/补全对话|口语应用|口语交际|情景交际|完成对话/.test(classificationText) && (questions.some((question) => question.options.length >= 5) || optionLineCount >= 5)) return "dialogue-completion";
  if (!isListeningGroup && /完形填空|语法选择/.test(classificationText)) return "cloze";
  if (hasInlineQuestions && /完成句子|短文填空|综合填空|单词拼写|词与短语填空|选词填空|阅读填空|语篇填空|听填信息|信息转换|(?<!完形)(?<!选择)填空/.test(classificationText)) return "inline-blank";
  if (group.inputMode === "inline-blank" || questions.some((question) => question.inputKind === "blank")) return "inline-blank";
  if (!isListeningGroup && isStructuredReadingText(classificationText) && questions.length > 0) return hasTable(blocks) ? "table-reading" : "reading-passage";
  if (questions.length && questions.every((question) => question.inputKind === "choice")) return "choice";
  return questions.length ? "choice" : "source";
}

export function shouldUseReadingLayout(groupType: JuniorHighGroupType) {
  return groupType === "cloze" || groupType === "reading-passage" || groupType === "table-reading";
}

export function visiblePartInstructions(partTitle: string, instructions: string[]) {
  return instructions
    .map(cleanQuestionDisplayText)
    .filter((instruction) => instruction.trim() !== partTitle.trim() && !isNonQuestionInstruction(instruction));
}

export function visibleGroupInstructions({
  partTitle,
  group,
  groupType,
  includeTitleInstruction = false,
}: {
  partTitle: string;
  group: JuniorHighQuestionGroup;
  groupType: JuniorHighGroupType;
  includeTitleInstruction?: boolean;
}) {
  const titleIsPassageLabel = isPassageLabel(group.title);
  const titleInstruction = includeTitleInstruction ? splitJuniorHighGroupTitle(group.title).instruction : "";
  const candidates = [...group.instructions, ...(titleInstruction ? [titleInstruction] : [])]
    .map(cleanQuestionDisplayText)
    .filter((instruction) => instruction.trim() !== group.title.trim() && instruction.trim() !== partTitle.trim() && !isNonQuestionInstruction(instruction));
  if (groupType === "cloze" && titleIsPassageLabel) {
    return group.title.trim().toUpperCase() === "A" ? candidates.slice(0, 2) : candidates.slice(2, 3);
  }
  return candidates.slice(0, titleIsPassageLabel ? 0 : 2);
}

export function splitJuniorHighTableCell(cell: string) {
  const raw = cell.trim();
  if (raw.includes("\n")) {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  const text = cell.replace(/\s+/g, " ").trim();
  if (!text) return [""];
  if (/^Time:/.test(text)) {
    return text
      .replace(/\s+(To\s+(?:have|make|be|\d{1,3}))/g, "\n$1")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (/^(Welcome to City Center Hotel|You can use the service|Breakfast:|Shop:)/.test(text)) {
    return text
      .replace(/([.!?])\s+(?=[A-Z])/g, "$1\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [text];
}

export function shouldMergeJuniorHighTableCell(cell: string, rowIndex: number, tableType?: JuniorHighTableType) {
  if (tableType === "plain") return false;
  return rowIndex === 0 && cell.trim().length > 0;
}

export function juniorHighTableColumnWidth(columnCount: number, index: number, tableType?: JuniorHighTableType) {
  if (columnCount === 1) return "100%";
  if (tableType === "table-reading" && columnCount === 2) return "50%";
  return index === 0 ? "28%" : `${72 / (columnCount - 1)}%`;
}
