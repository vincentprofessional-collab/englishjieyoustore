import type { SeniorHighBlock, SeniorHighInlineRun, SeniorHighSet } from "./v2-types";

const ADMIN_CLEANUP_NOTICES = [
  /注意\s*[:：]\s*此部分试题请在答题卡\s*(?:2|２|二)\s*上作答[。.!！]?/giu,
  /原资料(?:未提供|缺少|未收录)(?:听力|阅读|写作|词汇|题目|试题|音频){0,3}[。.!！]?/giu,
  /原卷(?:未提供|缺少|未收录)(?:听力|阅读|写作|词汇|题目|试题|音频){0,3}[。.!！]?/giu,
];

function stripAnswerSheetNotice(text: string) {
  return ADMIN_CLEANUP_NOTICES.reduce((cleaned, pattern) => cleaned.replace(pattern, ""), text).trim();
}

function cleanBlocks(blocks: SeniorHighBlock[]): SeniorHighBlock[] {
  const cleaned: SeniorHighBlock[] = [];
  for (const block of blocks) {
    if (block.type === "heading" || block.type === "notice") {
      const text = stripAnswerSheetNotice(block.text);
      if (text) cleaned.push({ ...block, text });
      continue;
    }
    if (block.type === "paragraph" || block.type === "richText") {
      const runs: SeniorHighInlineRun[] = [];
      for (const run of block.runs) {
        if (run.type !== "text") { runs.push(run); continue; }
        const text = stripAnswerSheetNotice(run.text);
        if (text) runs.push({ ...run, text });
      }
      if (runs.some((run) => run.type !== "text" || run.text.trim())) cleaned.push({ ...block, runs });
      continue;
    }
    if (block.type === "dialogue") {
      const turns = block.turns.map((turn) => ({ ...turn, blocks: cleanBlocks(turn.blocks) })).filter((turn) => turn.blocks.length > 0);
      if (turns.length) cleaned.push({ ...block, turns });
      continue;
    }
    if (block.type === "table") {
      const headers = block.headers ? cleanBlocks(block.headers) : undefined;
      const rows = block.rows.map((row) => ({ ...row, cells: row.cells.map(cleanBlocks) }));
      cleaned.push({ ...block, ...(headers ? { headers } : {}), rows });
      continue;
    }
    cleaned.push(block);
  }
  return cleaned;
}

export function cleanExamSetNotice(set: SeniorHighSet): SeniorHighSet {
  return {
    ...set,
    instructions: cleanBlocks(set.instructions),
    sections: set.sections.map((section) => ({
      ...section,
      instructions: cleanBlocks(section.instructions),
      groups: section.groups.map((group) => ({
        ...group,
        instructions: cleanBlocks(group.instructions),
        stimulusBlocks: cleanBlocks(group.stimulusBlocks),
        explanationBlocks: group.explanationBlocks ? cleanBlocks(group.explanationBlocks) : undefined,
        sharedOptions: group.sharedOptions.map((option) => ({ ...option, blocks: cleanBlocks(option.blocks) })),
        questions: group.questions.map((question) => ({
          ...question,
          promptBlocks: cleanBlocks(question.promptBlocks),
          options: question.options.map((option) => ({ ...option, blocks: cleanBlocks(option.blocks) })),
          answerSpec: {
            ...question.answerSpec,
            ...(Array.isArray(question.answerSpec.referenceAnswer) ? { referenceAnswer: cleanBlocks(question.answerSpec.referenceAnswer) } : {}),
          },
          explanationBlocks: cleanBlocks(question.explanationBlocks),
          ...(question.correctionStatement ? { correctionStatement: stripAnswerSheetNotice(question.correctionStatement) } : {}),
          ...(question.writingFrame ? { writingFrame: { before: question.writingFrame.before.map(stripAnswerSheetNotice).filter(Boolean), after: question.writingFrame.after.map(stripAnswerSheetNotice).filter(Boolean) } } : {}),
        })),
      })),
    })),
  };
}
