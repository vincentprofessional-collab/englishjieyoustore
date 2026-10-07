#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PRACTICE_DIR = path.join(ROOT, "public", "senior-high", "practice");
const INDEX_PATH = path.join(ROOT, "public", "senior-high", "index.json");
const DEDUPE_SET_IDS = new Set([
  "practice-gaokao-single-choice-2000-2019",
  "practice-gaokao-cloze-2000-2019",
  "practice-gaokao-reading-2000-2019",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function textFor(blocks) {
  return (blocks || []).map((block) => {
    if (block.type === "heading" || block.type === "notice") return block.text || "";
    if (block.type === "paragraph" || block.type === "richText") return (block.runs || []).map((run) => run.type === "text" ? run.text : "____").join("");
    if (block.type === "table") return textFor(block.headers) + " " + (block.rows || []).flatMap((row) => row.cells.flatMap((cell) => textFor(cell))).join(" ");
    if (block.type === "dialogue") return (block.turns || []).flatMap((turn) => textFor(turn.blocks)).join(" ");
    return "";
  }).join(" ").replace(/\s+/g, " ").trim();
}

function canonicalBlocks(blocks, assets, blankAliases) {
  return (blocks || []).map((block) => {
    if (block.type === "paragraph" || block.type === "richText") {
      return {
        type: block.type,
        runs: (block.runs || []).map((run) => run.type === "blank"
          ? { type: "blank", blank: blankAliases.get(run.blankId) || "unmapped" }
          : { type: "text", text: run.text, underline: Boolean(run.underline) }),
      };
    }
    if (["image", "audio", "video"].includes(block.type)) {
      return { type: block.type, sha256: assets.get(block.assetId)?.sha256 || "missing", alt: block.alt || "", caption: block.caption || "", label: block.label || "" };
    }
    if (block.type === "table") {
      return {
        type: "table",
        headers: canonicalBlocks(block.headers, assets, blankAliases),
        rows: (block.rows || []).map((row) => ({ cells: row.cells.map((cell) => canonicalBlocks(cell, assets, blankAliases)) })),
      };
    }
    if (block.type === "dialogue") {
      return { type: "dialogue", turns: (block.turns || []).map((turn) => ({ speaker: turn.speaker, blocks: canonicalBlocks(turn.blocks, assets, blankAliases) })) };
    }
    const normalized = { ...block };
    delete normalized.id;
    return normalized;
  });
}

function questionFingerprint(question, group, assets, groupBlankAliases) {
  const localBlankAliases = new Map((question.blanks || []).map((blank, index) => [blank.blankId, "blank-" + (index + 1)]));
  const optionLabels = new Map([...(group.sharedOptions || []), ...(question.options || [])].map((option) => [option.id, { label: option.label, text: textFor(option.blocks) }]));
  const answerSpec = structuredClone(question.answerSpec || {});
  if (answerSpec.acceptedAnswers) {
    answerSpec.acceptedAnswers = answerSpec.acceptedAnswers.map((answer) => optionLabels.get(answer) || answer).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (answerSpec.perBlankAnswers) {
    answerSpec.perBlankAnswers = Object.fromEntries(Object.entries(answerSpec.perBlankAnswers)
      .map(([blankId, values]) => [localBlankAliases.get(blankId) || blankId, [...values].sort()])
      .sort(([left], [right]) => left.localeCompare(right)));
  }
  if (Array.isArray(answerSpec.referenceAnswer)) answerSpec.referenceAnswer = canonicalBlocks(answerSpec.referenceAnswer, assets, localBlankAliases);
  const placement = structuredClone(question.placement || {});
  if (placement.blankIds) placement.blankIds = placement.blankIds.map((blankId) => localBlankAliases.get(blankId) || blankId);

  const material = {
    group: {
      presentation: group.presentation || "",
      instructions: canonicalBlocks(group.instructions, assets, groupBlankAliases),
      stimulus: canonicalBlocks(group.stimulusBlocks, assets, groupBlankAliases),
      sharedOptions: (group.sharedOptions || []).map((option) => ({ label: option.label, blocks: canonicalBlocks(option.blocks, assets, groupBlankAliases) })),
      sharedOptionsReusable: Boolean(group.sharedOptionsReusable),
    },
    question: {
      type: question.type,
      prompt: canonicalBlocks(question.promptBlocks, assets, localBlankAliases),
      placement,
      options: (question.options || []).map((option) => ({ label: option.label, blocks: canonicalBlocks(option.blocks, assets, localBlankAliases) })),
      blanks: (question.blanks || []).map(({ label = "", answerShape = "" }) => ({ label, answerShape })),
      answerSpec,
      explanation: canonicalBlocks(question.explanationBlocks, assets, localBlankAliases),
      correctionStatement: question.correctionStatement || "",
      writingFrame: question.writingFrame || null,
      reviewStatus: question.reviewStatus,
    },
  };
  return crypto.createHash("sha256").update(JSON.stringify(stable(material))).digest("hex");
}

function mergeSourceRefs(target, incoming) {
  const refs = new Map();
  for (const ref of [...(target || []), ...(incoming || [])]) refs.set(JSON.stringify(stable(ref)), ref);
  return [...refs.values()];
}

function groupBlankAliases(group) {
  const aliases = new Map();
  let next = 1;
  for (const question of group.questions || []) {
    for (const blank of question.blanks || []) aliases.set(blank.blankId, "blank-" + next++);
  }
  return aliases;
}

export function dedupeSeniorHighPracticeSet(set) {
  if (!DEDUPE_SET_IDS.has(set.id)) return { removed: 0, aliases: 0 };
  const assets = new Map((set.assetRefs || []).map((asset) => [asset.assetId, asset]));
  const answerAliases = { ...(set.answerAliases || {}) };
  let removed = 0;
  const seen = new Map();
  for (const section of set.sections || []) {
    const keptGroups = [];
    for (const group of section.groups || []) {
      const aliases = groupBlankAliases(group);
      const keptQuestions = [];
      for (const question of group.questions || []) {
        const fingerprint = questionFingerprint(question, group, assets, aliases);
        const canonical = seen.get(fingerprint);
        if (!canonical) {
          seen.set(fingerprint, question);
          keptQuestions.push(question);
          continue;
        }
        canonical.sourceRefs = mergeSourceRefs(canonical.sourceRefs, question.sourceRefs);
        answerAliases[question.id] = canonical.id;
        const canonicalBlanks = canonical.blanks || [];
        const duplicateBlanks = question.blanks || [];
        for (let index = 0; index < Math.min(canonicalBlanks.length, duplicateBlanks.length); index += 1) {
          answerAliases[duplicateBlanks[index].blankId] = canonicalBlanks[index].blankId;
        }
        removed += 1;
      }
      if (keptQuestions.length > 0) keptGroups.push({ ...group, questions: keptQuestions });
    }
    section.groups = keptGroups;
  }

  for (const [alias, target] of Object.entries(answerAliases)) {
    let finalTarget = target;
    const visited = new Set([alias]);
    while (answerAliases[finalTarget] && !visited.has(finalTarget)) {
      visited.add(finalTarget);
      finalTarget = answerAliases[finalTarget];
    }
    answerAliases[alias] = finalTarget;
  }
  if (Object.keys(answerAliases).length > 0) set.answerAliases = answerAliases;
  let displayNumber = 1;
  for (const section of set.sections || []) for (const group of section.groups || []) for (const question of group.questions || []) question.displayNumber = displayNumber++;
  return { removed, aliases: Object.keys(answerAliases).length };
}

function updateEntry(entry, set) {
  const questions = set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).filter((question) => question.type !== "instruction_only");
  entry.questionCount = questions.length;
  entry.answeredCount = questions.filter((question) => question.answerSpec.availability === "answered").length;
  entry.explanationCount = questions.filter((question) => question.explanationBlocks.length > 0).length;
  const states = new Set(questions.map((question) => question.answerSpec.availability));
  entry.answerStatus = states.has("conflict") ? "conflict" : states.size === 1 && states.has("none") ? "none" : states.size === 1 && states.has("answered") ? "answered" : "partial";
  entry.questionTypes = [...new Set(questions.map((question) => question.type))];
}

function applyToPublicFiles() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  const results = [];
  for (const entry of index.entries) {
    if (!DEDUPE_SET_IDS.has(entry.id)) continue;
    const filename = path.join(PRACTICE_DIR, entry.id + ".json");
    const set = JSON.parse(fs.readFileSync(filename, "utf8"));
    const result = dedupeSeniorHighPracticeSet(set);
    updateEntry(entry, set);
    fs.writeFileSync(filename, JSON.stringify(set));
    results.push({ id: entry.id, removed: result.removed, aliases: result.aliases, remaining: entry.questionCount });
  }
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index));
  console.log(JSON.stringify(results));
}

if (process.argv.includes("--apply")) applyToPublicFiles();
