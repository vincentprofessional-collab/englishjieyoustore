const QUESTION_TYPES = new Set([
  "single_choice",
  "multi_choice",
  "shared_option_matching",
  "inline_fill",
  "multi_blank",
  "table_fill",
  "short_answer",
  "translation",
  "error_correction",
  "essay",
  "oral_response",
  "instruction_only",
]);

const BLOCK_TYPES = new Set(["heading", "paragraph", "richText", "image", "audio", "video", "table", "dialogue", "notice"]);
const LEAK_PATTERN = /(?:答案|解析)\s*[:：]|下一\s*(?:题|篇|passage)|\bnext\s+(?:question|passage)\b|\bpassage\s*\d+\b/i;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function add(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function requireString(value, path, errors) {
  if (typeof value !== "string" || value.trim() === "") add(errors, path, "must be a non-empty string");
}

function requireArray(value, path, errors) {
  if (!Array.isArray(value)) {
    add(errors, path, "must be an array");
    return false;
  }
  return true;
}

function blockText(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks.map((block) => {
    if (!isObject(block)) return "";
    if (block.type === "heading" || block.type === "notice") return block.text || "";
    if (block.type === "paragraph" || block.type === "richText") return (block.runs || []).map((run) => run.type === "text" ? run.text || "" : "").join(" ");
    if (block.type === "table") return (block.headers || []).concat((block.rows || []).flatMap((row) => (row.cells || []).flat())).map((cell) => blockText([cell])).join(" ");
    if (block.type === "dialogue") return (block.turns || []).map((turn) => `${turn.speaker || ""} ${blockText(turn.blocks)}`).join(" ");
    return "";
  }).join(" ");
}

function blankRefs(blocks, output = new Set()) {
  if (!Array.isArray(blocks)) return output;
  for (const block of blocks) {
    if (!isObject(block)) continue;
    if (block.type === "paragraph" || block.type === "richText") {
      for (const run of block.runs || []) if (run?.type === "blank") output.add(run.blankId);
    } else if (block.type === "table") {
      blankRefs(block.headers, output);
      for (const row of block.rows || []) for (const cell of row.cells || []) blankRefs(cell, output);
    } else if (block.type === "dialogue") {
      for (const turn of block.turns || []) blankRefs(turn.blocks, output);
    }
  }
  return output;
}

function validateSourceRef(ref, path, errors) {
  if (!isObject(ref)) return add(errors, path, "must be an object");
  requireString(ref.sourceDocumentId, `${path}.sourceDocumentId`, errors);
  requireString(ref.relativePath, `${path}.relativePath`, errors);
  if (!/^[a-f0-9]{64}$/i.test(ref.sha256 || "")) add(errors, `${path}.sha256`, "must be a SHA-256 hex digest");
  if (!isObject(ref.locator)) add(errors, `${path}.locator`, "must be an object");
  if (!Number.isFinite(ref.confidence) || ref.confidence < 0 || ref.confidence > 1) add(errors, `${path}.confidence`, "must be between 0 and 1");
}

function validateBlocks(blocks, path, errors, knownAssets, knownBlockIds, knownBlankRefs) {
  if (!requireArray(blocks, path, errors)) return;
  blocks.forEach((block, index) => {
    const currentPath = `${path}[${index}]`;
    if (!isObject(block) || !BLOCK_TYPES.has(block.type)) return add(errors, currentPath, "has an unsupported block type");
    if (block.id) {
      if (knownBlockIds.has(block.id)) add(errors, `${currentPath}.id`, "is duplicated");
      knownBlockIds.add(block.id);
    }
    if (block.type === "heading" || block.type === "notice") requireString(block.text, `${currentPath}.text`, errors);
    if (block.type === "heading" && ![1, 2, 3, 4].includes(block.level)) add(errors, `${currentPath}.level`, "must be 1-4");
    if (block.type === "paragraph" || block.type === "richText") {
      if (!requireArray(block.runs, `${currentPath}.runs`, errors)) return;
      block.runs.forEach((run, runIndex) => {
        if (!isObject(run) || !["text", "blank"].includes(run.type)) return add(errors, `${currentPath}.runs[${runIndex}]`, "has an unsupported run type");
        if (run.type === "text") requireString(run.text, `${currentPath}.runs[${runIndex}].text`, errors);
        if (run.type === "blank") {
          requireString(run.blankId, `${currentPath}.runs[${runIndex}].blankId`, errors);
          knownBlankRefs.add(run.blankId);
        }
      });
    }
    if (["image", "audio", "video"].includes(block.type)) {
      requireString(block.assetId, `${currentPath}.assetId`, errors);
      if (block.assetId && !knownAssets.has(block.assetId)) add(errors, `${currentPath}.assetId`, "does not reference an assetRef");
    }
    if (block.type === "table") {
      validateBlocks(block.headers || [], `${currentPath}.headers`, errors, knownAssets, knownBlockIds, knownBlankRefs);
      if (!requireArray(block.rows, `${currentPath}.rows`, errors)) return;
      block.rows.forEach((row, rowIndex) => {
        if (!isObject(row) || !requireArray(row.cells, `${currentPath}.rows[${rowIndex}].cells`, errors)) return;
        row.cells.forEach((cell, cellIndex) => validateBlocks(cell, `${currentPath}.rows[${rowIndex}].cells[${cellIndex}]`, errors, knownAssets, knownBlockIds, knownBlankRefs));
      });
    }
    if (block.type === "dialogue") {
      if (!requireArray(block.turns, `${currentPath}.turns`, errors)) return;
      block.turns.forEach((turn, turnIndex) => {
        requireString(turn?.speaker, `${currentPath}.turns[${turnIndex}].speaker`, errors);
        validateBlocks(turn?.blocks || [], `${currentPath}.turns[${turnIndex}].blocks`, errors, knownAssets, knownBlockIds, knownBlankRefs);
      });
    }
  });
}

function validateOptions(options, path, errors, knownAssets, knownBlockIds) {
  if (!requireArray(options, path, errors)) return;
  const ids = new Set();
  options.forEach((option, index) => {
    const currentPath = `${path}[${index}]`;
    if (!isObject(option)) return add(errors, currentPath, "must be an object");
    requireString(option.id, `${currentPath}.id`, errors);
    requireString(option.label, `${currentPath}.label`, errors);
    if (ids.has(option.id)) add(errors, `${currentPath}.id`, "is duplicated");
    ids.add(option.id);
    validateBlocks(option.blocks, `${currentPath}.blocks`, errors, knownAssets, knownBlockIds, new Set());
    if (blockText(option.blocks).length > 500) add(errors, currentPath, "option text exceeds 500 characters");
    if (LEAK_PATTERN.test(blockText(option.blocks))) add(errors, currentPath, "contains answer/explanation/navigation leakage");
  });
}

function validateAnswerSpec(answerSpec, question, path, errors, optionIds, blankIds) {
  if (!isObject(answerSpec)) return add(errors, path, "must be an object");
  if (!["answered", "none", "conflict"].includes(answerSpec.availability)) add(errors, `${path}.availability`, "has an unsupported value");
  if (!["auto", "manual", "none"].includes(answerSpec.gradingMode)) add(errors, `${path}.gradingMode`, "has an unsupported value");
  if (!["choice", "multi_choice", "text", "per_blank", "reference", "none"].includes(answerSpec.kind)) add(errors, `${path}.kind`, "has an unsupported value");
  if (answerSpec.availability === "none" && answerSpec.gradingMode !== "none") add(errors, path, "no-answer questions must use gradingMode=none");
  if (answerSpec.availability === "conflict" && answerSpec.gradingMode === "auto") add(errors, path, "conflicting answers cannot be auto-graded");
  if (answerSpec.gradingMode === "auto" && answerSpec.availability !== "answered") add(errors, path, "auto grading requires a non-conflicting answer");
  if (answerSpec.acceptedAnswers !== undefined && !Array.isArray(answerSpec.acceptedAnswers)) add(errors, `${path}.acceptedAnswers`, "must be an array");
  for (const answer of answerSpec.acceptedAnswers || []) {
    if (typeof answer !== "string") add(errors, `${path}.acceptedAnswers`, "must contain strings");
    if (question.type === "single_choice" && !optionIds.has(answer)) add(errors, `${path}.acceptedAnswers`, `references unknown option ${answer}`);
  }
  if (answerSpec.availability === "answered" && question.type === "multi_choice" && (answerSpec.kind !== "multi_choice" || (answerSpec.acceptedAnswers || []).length < 1)) add(errors, path, "answered multi_choice requires kind=multi_choice and acceptedAnswers");
  if (answerSpec.availability === "answered" && question.type === "single_choice" && answerSpec.kind !== "choice") add(errors, path, "answered single_choice requires kind=choice");
  if (answerSpec.availability === "answered" && question.type === "shared_option_matching" && answerSpec.kind !== "choice") add(errors, path, "answered shared_option_matching requires kind=choice");
  if (["inline_fill", "multi_blank", "table_fill"].includes(question.type)) {
    if (answerSpec.kind !== "per_blank") add(errors, path, "blank questions require kind=per_blank");
    if (!isObject(answerSpec.perBlankAnswers)) add(errors, `${path}.perBlankAnswers`, "must be an object");
    for (const blankId of blankIds) if (!Array.isArray(answerSpec.perBlankAnswers?.[blankId]) && answerSpec.availability === "answered") add(errors, `${path}.perBlankAnswers.${blankId}`, "must contain accepted answers");
  }
  if (answerSpec.normalization) {
    for (const key of ["unicodeNfkc", "trim", "collapseSpaces"]) if (answerSpec.normalization[key] !== true) add(errors, `${path}.normalization.${key}`, "must be true");
    if (typeof answerSpec.normalization.caseSensitive !== "boolean") add(errors, `${path}.normalization.caseSensitive`, "must be boolean");
  }
}

function validateQuestion(question, path, group, errors, knownAssets, knownBlockIds, knownBlankRefs) {
  if (!isObject(question)) return add(errors, path, "must be an object");
  requireString(question.id, `${path}.id`, errors);
  if (!Number.isInteger(question.displayNumber) || question.displayNumber < 1) add(errors, `${path}.displayNumber`, "must be a positive integer");
  if (question.sourceQuestionNumber !== undefined && (!Number.isInteger(question.sourceQuestionNumber) || question.sourceQuestionNumber < 1)) add(errors, `${path}.sourceQuestionNumber`, "must be a positive integer");
  if (!QUESTION_TYPES.has(question.type)) add(errors, `${path}.type`, "has an unsupported value");
  validateBlocks(question.promptBlocks, `${path}.promptBlocks`, errors, knownAssets, knownBlockIds, knownBlankRefs);
  validateBlocks(question.explanationBlocks, `${path}.explanationBlocks`, errors, knownAssets, knownBlockIds, new Set());
  validateOptions(question.options, `${path}.options`, errors, knownAssets, knownBlockIds);
  if (!requireArray(question.blanks, `${path}.blanks`, errors)) return;
  const options = Array.isArray(question.options) ? question.options : [];
  const blanks = Array.isArray(question.blanks) ? question.blanks : [];
  const blankIds = new Set();
  for (const [index, blank] of blanks.entries()) {
    if (!isObject(blank)) add(errors, `${path}.blanks[${index}]`, "must be an object");
    requireString(blank?.blankId, `${path}.blanks[${index}].blankId`, errors);
    if (blankIds.has(blank?.blankId)) add(errors, `${path}.blanks[${index}].blankId`, "is duplicated");
    blankIds.add(blank?.blankId);
  }
  if (!isObject(question.placement) || !["standalone", "inline", "table", "dialogue"].includes(question.placement.kind)) add(errors, `${path}.placement`, "has an unsupported value");
  const placementBlankIds = new Set(question.placement?.blankIds || []);
  if (question.placement?.kind !== "standalone" && !Array.isArray(question.placement?.blankIds)) add(errors, `${path}.placement.blankIds`, "must be an array");
  for (const blankId of blankIds) {
    if (!placementBlankIds.has(blankId)) add(errors, `${path}.placement.blankIds`, `does not include ${blankId}`);
    if (!knownBlankRefs.has(blankId)) add(errors, `${path}.blanks.${blankId}`, "has no explicit blank token in stimulus or prompt blocks");
  }
  const optionIds = new Set(options.map((option) => option?.id));
  if (question.type === "single_choice" && (options.length < 2 || options.length > 6)) add(errors, `${path}.options`, "single_choice must have 2-6 options");
  if (question.type === "multi_choice" && options.length < 2) add(errors, `${path}.options`, "multi_choice must have at least 2 options");
  if (["shared_option_matching", "inline_fill", "multi_blank", "table_fill", "short_answer", "translation", "error_correction", "essay", "oral_response", "instruction_only"].includes(question.type) && question.type !== "shared_option_matching" && options.length > 0) add(errors, `${path}.options`, `${question.type} must not duplicate options on the question`);
  if (question.type === "multi_choice" && blanks.length > 0) add(errors, `${path}.blanks`, "multi_choice must not contain text blanks");
  if (["single_choice", "shared_option_matching"].includes(question.type) && blanks.length > 0 && question.placement?.kind !== "inline") add(errors, `${path}.placement`, "inline choice blanks must use placement.kind=inline");
  validateAnswerSpec(question.answerSpec, question, `${path}.answerSpec`, errors, optionIds, blankIds);
  if (!requireArray(question.sourceRefs, `${path}.sourceRefs`, errors) || question.sourceRefs.length === 0) add(errors, `${path}.sourceRefs`, "must contain at least one source reference");
  question.sourceRefs?.forEach((ref, index) => validateSourceRef(ref, `${path}.sourceRefs[${index}]`, errors));
  if (!["approved", "review_required", "excluded"].includes(question.reviewStatus)) add(errors, `${path}.reviewStatus`, "has an unsupported value");
}

export function validateSeniorHighV2Set(set, { publicData = false } = {}) {
  const errors = [];
  if (!isObject(set)) return { ok: false, errors: ["root: must be an object"] };
  if (set.schemaVersion !== 2) add(errors, "schemaVersion", "must be 2");
  requireString(set.id, "id", errors);
  if (!["paper", "practice"].includes(set.kind)) add(errors, "kind", "must be paper or practice");
  for (const field of ["title", "year", "region", "variant"]) requireString(set[field], field, errors);
  if (!requireArray(set.assetRefs, "assetRefs", errors)) return { ok: false, errors };
  const assets = new Set();
  set.assetRefs.forEach((asset, index) => {
    if (!isObject(asset)) return add(errors, `assetRefs[${index}]`, "must be an object");
    requireString(asset.assetId, `assetRefs[${index}].assetId`, errors);
    if (assets.has(asset.assetId)) add(errors, `assetRefs[${index}].assetId`, "is duplicated");
    assets.add(asset.assetId);
    requireString(asset.url, `assetRefs[${index}].url`, errors);
    requireString(asset.mimeType, `assetRefs[${index}].mimeType`, errors);
    if (!/^[a-f0-9]{64}$/i.test(asset.sha256 || "")) add(errors, `assetRefs[${index}].sha256`, "must be a SHA-256 hex digest");
    if (!Array.isArray(asset.sourceRefs) || asset.sourceRefs.length === 0) add(errors, `assetRefs[${index}].sourceRefs`, "must contain at least one source reference");
    asset.sourceRefs?.forEach((ref, refIndex) => validateSourceRef(ref, `assetRefs[${index}].sourceRefs[${refIndex}]`, errors));
  });
  validateBlocks(set.instructions, "instructions", errors, assets, new Set(), new Set());
  if (!requireArray(set.sourceRefs, "sourceRefs", errors) || set.sourceRefs.length === 0) add(errors, "sourceRefs", "must contain at least one source reference");
  set.sourceRefs?.forEach((ref, index) => validateSourceRef(ref, `sourceRefs[${index}]`, errors));
  if (!isObject(set.quality)) add(errors, "quality", "must be an object");
  if (publicData && set.quality?.structureStatus !== "approved") add(errors, "quality.structureStatus", "public data must be approved");
  if (!requireArray(set.sections, "sections", errors)) return { ok: false, errors };
  const ids = new Set();
  const questionNumbers = [];
  let questionCount = 0;
  set.sections.forEach((section, sectionIndex) => {
    const sectionPath = `sections[${sectionIndex}]`;
    if (!isObject(section)) return add(errors, sectionPath, "must be an object");
    requireString(section.id, `${sectionPath}.id`, errors);
    requireString(section.title, `${sectionPath}.title`, errors);
    if (ids.has(section.id)) add(errors, `${sectionPath}.id`, "is duplicated");
    ids.add(section.id);
    validateBlocks(section.instructions, `${sectionPath}.instructions`, errors, assets, new Set(), new Set());
    if (!requireArray(section.groups, `${sectionPath}.groups`, errors)) return;
    section.groups.forEach((group, groupIndex) => {
      const groupPath = `${sectionPath}.groups[${groupIndex}]`;
      if (!isObject(group)) return add(errors, groupPath, "must be an object");
      requireString(group.id, `${groupPath}.id`, errors);
      if (ids.has(group.id)) add(errors, `${groupPath}.id`, "is duplicated");
      ids.add(group.id);
      validateBlocks(group.instructions, `${groupPath}.instructions`, errors, assets, new Set(), new Set());
      const groupBlockIds = new Set();
      const groupBlankRefs = new Set();
      validateBlocks(group.stimulusBlocks, `${groupPath}.stimulusBlocks`, errors, assets, groupBlockIds, groupBlankRefs);
      validateOptions(group.sharedOptions, `${groupPath}.sharedOptions`, errors, assets, groupBlockIds);
      if (group.questions?.length === undefined) add(errors, `${groupPath}.questions`, "must be an array");
      group.questions?.forEach((question, questionIndex) => {
        const questionPath = `${groupPath}.questions[${questionIndex}]`;
        if (ids.has(question?.id)) add(errors, `${questionPath}.id`, "is duplicated");
        ids.add(question?.id);
        const questionBlankRefs = new Set(groupBlankRefs);
        validateQuestion(question, questionPath, group, errors, assets, groupBlockIds, questionBlankRefs);
        if (publicData && question?.reviewStatus !== "approved") add(errors, `${questionPath}.reviewStatus`, "public questions must be approved");
        if (question?.type === "shared_option_matching") {
          if (group.sharedOptions.length < 2) add(errors, `${groupPath}.sharedOptions`, "must contain at least 2 options for shared_option_matching");
          if ((question.options || []).length > 0) add(errors, `${questionPath}.options`, "must be empty; use group.sharedOptions");
          for (const answer of question.answerSpec?.acceptedAnswers || []) if (!group.sharedOptions.some((option) => option.id === answer)) add(errors, `${questionPath}.answerSpec.acceptedAnswers`, `references unknown shared option ${answer}`);
        }
        if (question?.type !== "instruction_only") {
          questionCount += 1;
          questionNumbers.push(question.displayNumber);
        }
      });
    });
  });
  if (new Set(questionNumbers).size !== questionNumbers.length) add(errors, "questions.displayNumber", "contains duplicates");
  if (set.kind === "practice") {
    const sorted = [...questionNumbers].sort((a, b) => a - b);
    if (sorted.some((number, index) => number !== index + 1)) add(errors, "questions.displayNumber", "practice questions must be continuous from 1");
  }
  return { ok: errors.length === 0, errors, questionCount };
}

export function isSeniorHighV2Set(value) {
  return isObject(value) && value.schemaVersion === 2 && ["paper", "practice"].includes(value.kind);
}

export { BLOCK_TYPES, QUESTION_TYPES };
