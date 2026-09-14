#!/usr/bin/env node

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateSeniorHighV2Publishability, validateSeniorHighV2Set } from "./senior_high_v2_schema.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_ROOT = process.env.SENIOR_HIGH_SOURCE_ROOT || "/Volumes/My HDD3/备课/高考";
const GOLD_DIR = path.join(ROOT, "data", "senior-high", "v2", "gold");
const PUBLIC_ROOT = path.join(ROOT, "public", "senior-high");
const ASSET_DIR = path.join(PUBLIC_ROOT, "assets");
const MEDIA_LIMIT = 50 * 1024 * 1024;

const MIME_EXTENSIONS = {
  "audio/mpeg": ".mp3",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
};

const BROKEN_APOSTROPHE = /\u{1001b3}/gu;

function normalizeSeniorHighText(value) {
  if (typeof value === "string") return value.replace(BROKEN_APOSTROPHE, "'");
  if (Array.isArray(value)) return value.map(normalizeSeniorHighText);
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) value[key] = normalizeSeniorHighText(child);
  }
  return value;
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function cleanJsonDirectory(directory) {
  ensureDirectory(directory);
  for (const name of fs.readdirSync(directory)) {
    if (name.endsWith(".json")) fs.unlinkSync(path.join(directory, name));
  }
}

function cleanAssetDirectory(directory, preservedNames = new Set()) {
  ensureDirectory(directory);
  for (const name of fs.readdirSync(directory)) if (!preservedNames.has(name)) fs.unlinkSync(path.join(directory, name));
}

function publishedAssetNames() {
  const names = new Set();
  for (const directoryName of ["papers", "practice"]) {
    const directory = path.join(PUBLIC_ROOT, directoryName);
    for (const name of fs.readdirSync(directory).filter((value) => value.endsWith(".json"))) {
      const set = JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
      for (const asset of set.assetRefs || []) if (asset.url.startsWith("/senior-high/assets/")) names.add(path.basename(asset.url));
    }
  }
  return names;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function extensionFor(asset, sourcePath) {
  return path.extname(sourcePath) || MIME_EXTENSIONS[asset.mimeType] || "";
}

function audioFileIsPlayable(filePath) {
  try {
    const duration = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return Number.isFinite(Number(duration)) && Number(duration) > 0;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    return false;
  }
}

function audioBufferIsPlayable(buffer, extension = ".mp3") {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "senior-high-audio-"));
  const temporaryFile = path.join(temporaryDirectory, `audio${extension || ".mp3"}`);
  try {
    fs.writeFileSync(temporaryFile, buffer);
    return audioFileIsPlayable(temporaryFile);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function sourceAssetParts(asset) {
  const url = asset.url;
  const value = url.slice("source://".length);
  const marker = value.indexOf("#");
  const currentRelativePath = asset.sourceRefs?.find((ref) => ref.currentRelativePath)?.currentRelativePath || "";
  return marker < 0
    ? { relativePath: value, packagePath: "", currentRelativePath }
    : { relativePath: value.slice(0, marker), packagePath: value.slice(marker + 1), currentRelativePath };
}

function materializeAsset(asset) {
  if (!asset.url.startsWith("source://")) {
    const publicPath = path.join(ROOT, "public", asset.url.replace(/^\//, ""));
    if (!fs.existsSync(publicPath) || fs.statSync(publicPath).size === 0) return { asset: null, unavailableReason: "public_asset_missing" };
    if (asset.kind === "audio" && !audioFileIsPlayable(publicPath)) return { asset: null, unavailableReason: "audio_unplayable" };
    return { asset, unavailableReason: "" };
  }
  const { relativePath, packagePath, currentRelativePath } = sourceAssetParts(asset);
  const sourcePath = path.join(SOURCE_ROOT, currentRelativePath || relativePath);
  try {
    let buffer;
    let sourceName = sourcePath;
    if (packagePath) {
      buffer = execFileSync("unzip", ["-p", sourcePath, packagePath], { maxBuffer: 80 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
      sourceName = packagePath;
    } else {
      const size = fs.statSync(sourcePath).size;
      if (size > MEDIA_LIMIT) return { asset: null, unavailableReason: `media_over_${MEDIA_LIMIT}_bytes` };
      buffer = fs.readFileSync(sourcePath);
    }
    if (buffer.length === 0) return { asset: null, unavailableReason: "empty_asset" };
    if (sha256(buffer) !== asset.sha256) return { asset: null, unavailableReason: "sha256_mismatch" };
    let extension = extensionFor(asset, sourceName).toLowerCase();
    let mimeType = asset.mimeType;
    if (asset.kind === "audio" && !audioBufferIsPlayable(buffer, extension)) return { asset: null, unavailableReason: "audio_unplayable" };
    if (extension === ".wmf") {
      const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "senior-high-wmf-"));
      try {
        const temporarySource = path.join(temporaryDirectory, `${asset.sha256}.wmf`);
        fs.writeFileSync(temporarySource, buffer);
        execFileSync("soffice", ["--headless", "--convert-to", "png", "--outdir", temporaryDirectory, temporarySource], { stdio: "ignore" });
        buffer = fs.readFileSync(path.join(temporaryDirectory, `${asset.sha256}.png`));
        extension = ".png";
        mimeType = "image/png";
      } finally {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
      }
    }
    const filename = `${asset.sha256}${extension}`;
    fs.writeFileSync(path.join(ASSET_DIR, filename), buffer);
    return { asset: { ...asset, mimeType, url: `/senior-high/assets/${filename}` }, unavailableReason: "" };
  } catch (error) {
    return { asset: null, unavailableReason: error instanceof Error ? error.message : String(error) };
  }
}

function unavailableNotice(kind) {
  const label = kind === "image" ? "图片" : kind === "audio" ? "音频" : "视频";
  return { type: "notice", tone: "warning", text: `${label}资源尚未发布，题目文字与作答结构仍按原资料保留。` };
}

function rewriteBlocks(blocks, assets) {
  return (blocks || []).flatMap((block) => {
    if (["image", "audio", "video"].includes(block.type) && !assets.has(block.assetId)) {
      if (block.type === "image" && block.alt?.trim().toLowerCase() === "source image") return [];
      return [unavailableNotice(block.type)];
    }
    if (block.type === "table") {
      return [{
        ...block,
        headers: block.headers ? rewriteBlocks(block.headers, assets) : undefined,
        rows: block.rows.map((row) => ({ cells: row.cells.map((cell) => rewriteBlocks(cell, assets)) })),
      }];
    }
    if (block.type === "dialogue") {
      return [{ ...block, turns: block.turns.map((turn) => ({ ...turn, blocks: rewriteBlocks(turn.blocks, assets) })) }];
    }
    return [block];
  });
}

function rewriteOptions(options, assets) {
  return (options || []).map((option) => ({ ...option, blocks: rewriteBlocks(option.blocks, assets) }));
}

function blocksHaveAvailableAudio(blocks, assets) {
  for (const block of blocks || []) {
    if (block.type === "audio" && assets.has(block.assetId)) return true;
    if (block.type === "table") {
      if (blocksHaveAvailableAudio(block.headers, assets)) return true;
      for (const row of block.rows || []) for (const cell of row.cells || []) if (blocksHaveAvailableAudio(cell, assets)) return true;
    }
    if (block.type === "dialogue") for (const turn of block.turns || []) if (blocksHaveAvailableAudio(turn.blocks, assets)) return true;
  }
  return false;
}

function listeningSectionHasAvailableAudio(section, assets) {
  if (blocksHaveAvailableAudio(section.instructions, assets)) return true;
  for (const group of section.groups || []) {
    if (blocksHaveAvailableAudio(group.instructions, assets) || blocksHaveAvailableAudio(group.stimulusBlocks, assets)) return true;
    for (const option of group.sharedOptions || []) if (blocksHaveAvailableAudio(option.blocks, assets)) return true;
    for (const question of group.questions || []) {
      if (blocksHaveAvailableAudio(question.promptBlocks, assets) || blocksHaveAvailableAudio(question.explanationBlocks, assets)) return true;
      for (const option of question.options || []) if (blocksHaveAvailableAudio(option.blocks, assets)) return true;
    }
  }
  return false;
}

function blocksReferenceAsset(blocks, assetIds) {
  for (const block of blocks || []) {
    if (block.type === "audio" && assetIds.has(block.assetId)) return true;
    if (block.type === "table") {
      if (blocksReferenceAsset(block.headers, assetIds)) return true;
      for (const row of block.rows || []) for (const cell of row.cells || []) if (blocksReferenceAsset(cell, assetIds)) return true;
    }
    if (block.type === "dialogue") for (const turn of block.turns || []) if (blocksReferenceAsset(turn.blocks, assetIds)) return true;
  }
  return false;
}

function removeUnavailableAudioGroups(set, unavailableAudioIds) {
  if (unavailableAudioIds.size === 0) return;
  for (const section of set.sections || []) {
    const isListeningSection = section.id.toLowerCase().includes("listening") || section.title.includes("听力");
    if (!isListeningSection) continue;
    section.groups = (section.groups || []).filter((group) => {
      if (blocksReferenceAsset(group.instructions, unavailableAudioIds)) return false;
      if (blocksReferenceAsset(group.stimulusBlocks, unavailableAudioIds)) return false;
      if ((group.sharedOptions || []).some((option) => blocksReferenceAsset(option.blocks, unavailableAudioIds))) return false;
      if ((group.questions || []).some((question) => blocksReferenceAsset(question.promptBlocks, unavailableAudioIds) || blocksReferenceAsset(question.explanationBlocks, unavailableAudioIds) || (question.options || []).some((option) => blocksReferenceAsset(option.blocks, unavailableAudioIds)))) return false;
      return true;
    });
  }
}

function removeErrorCorrectionContent(set) {
  set.sections = (set.sections || []).flatMap((section) => {
    if (/短文改错/.test(`${section.title || ""} ${section.id || ""}`)) return [];
    const groups = (section.groups || []).flatMap((group) => {
      if (/短文改错/.test(group.title || "")) return [];
      const questions = (group.questions || []).filter((question) => {
        if (question.type === "error_correction") return false;
        const prompt = (question.promptBlocks || []).map(blockText).join(" ");
        return !/短文改错|error\s+correction|改正所给短文中的错误|每行只有一个错误|多一个词|缺一个词|错一个词|在错的词下划一横线/i.test(prompt);
      });
      if ((group.questions || []).length > 0 && questions.length === 0) return [];
      return questions.length === (group.questions || []).length ? [group] : [{ ...group, questions }];
    });
    if (groups.length > 0) return [{ ...section, groups }];
    return (section.groups || []).length === 0 ? [section] : [];
  });
}

function blockText(block) {
  if (!block) return "";
  if (block.type === "heading" || block.type === "notice") return block.text || "";
  if (block.type === "paragraph" || block.type === "richText") return (block.runs || []).map((run) => run.type === "text" ? run.text : "____").join("");
  if (block.type === "table") return (block.headers || []).map(blockText).concat((block.rows || []).flatMap((row) => row.cells.flatMap((cell) => cell.map(blockText)))).join(" ");
  if (block.type === "dialogue") return (block.turns || []).flatMap((turn) => turn.blocks || []).map(blockText).join(" ");
  return "";
}

function normalizedText(value) {
  return value.replace(/\s+/g, " ").trim();
}

const WRITING_CONTAMINATION_PATTERNS = [
  /参考答案|选择题答案|答案及解析|答案解析|听力原文|短文改错答案/i,
  /(?:^|\n)\s*\d{1,3}\s*[~～—-]\s*\d{1,3}\s+[A-H]+/m,
  /(?:^|\n)\s*\d{1,3}\s*[.．、]\s*(?:√|去掉|删去|[A-Za-z]+\s*→)/m,
  /(?:^|\n)\s*(?:解析|答案)\s*[：:]/im,
];

function writingContaminationIndex(text) {
  return WRITING_CONTAMINATION_PATTERNS.reduce((earliest, pattern) => {
    const match = pattern.exec(text);
    return match && match.index < earliest ? match.index : earliest;
  }, Number.POSITIVE_INFINITY);
}

function truncateWritingBlock(block, markerIndex) {
  if (block.type !== "paragraph" && block.type !== "richText") return null;
  const runs = [];
  let offset = 0;
  for (const run of block.runs || []) {
    const runLength = run.type === "text" ? run.text.length : 4;
    if (markerIndex <= offset) break;
    if (markerIndex < offset + runLength) {
      if (run.type === "text") {
        const prefix = run.text.slice(0, markerIndex - offset);
        if (prefix) runs.push({ ...run, text: prefix });
      }
      break;
    }
    runs.push(run);
    offset += runLength;
  }
  return runs.length > 0 ? { ...block, runs } : null;
}

function sanitizeWritingBlocks(blocks) {
  const output = [];
  for (const block of blocks || []) {
    const markerIndex = writingContaminationIndex(blockText(block));
    if (markerIndex === Number.POSITIVE_INFINITY) {
      output.push(block);
      continue;
    }
    const prefix = truncateWritingBlock(block, markerIndex);
    if (prefix) output.push(prefix);
    break;
  }
  return output.filter((block) => {
    const text = normalizedText(blockText(block));
    return !/^\d{4}年.*高考英语.*真题(?:及答案)?$/.test(text) && !/^\d{4}年.*参考答案$/.test(text);
  });
}

function isWritingSupportGroup(group) {
  return /内容要点|说明|one\s+possible\s+version|参考答案|答案|解析|听力|短文改错|单项|完形|阅读|语法|填空|单词|拼写|词汇|词语|完成句子|任务型读写/i.test(group.title || "");
}

function isNonWritingQuestion(question) {
  const text = normalizedText((question.promptBlocks || []).map(blockText).join(" "));
  return /(?:^|\s)填空(?:[。．:：]|\s|$)|在每个空格内填入|每空不超过\d+个单词|将该词完整地写在右边|单词拼写|完成句子|任务型读写|短文改错|改正所给短文中的错误|每行只有一个错误|多一个词|缺一个词|错一个词|在错的词下划一横线|单项填空|完形填空|阅读理解|听力原文|听力理解/i.test(text)
    || /(?:^|\s)\d{1,3}\s*[.．、]\s*(?:√|去掉|删去|[A-Za-z]+\s*→)/i.test(text);
}

function writingQuestionFingerprint(question) {
  const prompt = normalizedText((question.promptBlocks || []).map(blockText).join(" "));
  return prompt ? sha256(Buffer.from(prompt)) : "";
}

function dedupeWritingGroups(set) {
  const seen = new Set();
  set.sections = set.sections.map((section) => {
    const groups = [];
    for (const group of section.groups || []) {
      const questions = [];
      for (const question of group.questions || []) {
        const fingerprint = writingQuestionFingerprint(question);
        if (fingerprint && seen.has(fingerprint)) continue;
        if (fingerprint) seen.add(fingerprint);
        questions.push(question);
      }
      if (questions.length > 0) groups.push({ ...group, questions });
    }
    return { ...section, groups };
  });
}

function structuredBlockTexts(set) {
  const texts = [];
  const add = (blocks) => {
    for (const block of blocks || []) {
      const text = normalizedText(blockText(block));
      if (text) texts.push(text);
    }
  };
  for (const section of set.sections || []) {
    add(section.instructions);
    for (const group of section.groups || []) {
      add(group.instructions);
      add(group.stimulusBlocks);
      for (const option of group.sharedOptions || []) add(option.blocks);
      for (const question of group.questions || []) {
        add(question.promptBlocks);
        for (const option of question.options || []) add(option.blocks);
        add(question.explanationBlocks);
        if (Array.isArray(question.answerSpec?.referenceAnswer)) add(question.answerSpec.referenceAnswer);
      }
    }
  }
  return texts;
}

function removeDuplicateInstructionBlocks(set) {
  const structuredTexts = structuredBlockTexts(set);
  const structuredText = normalizedText(structuredTexts.join(" "));
  const hasQuestionContext = set.sections.some((section) => section.groups.some((group) => {
    const questions = (group.questions || []).filter((question) => question.type !== "instruction_only");
    const stimulusText = normalizedText((group.stimulusBlocks || []).map(blockText).join(" "));
    return questions.length > 0 && (stimulusText || questions.some((question) => normalizedText((question.promptBlocks || []).map(blockText).join(" "))));
  }));
  const hasListeningSection = set.sections.some((section) => section.id.toLowerCase().includes("listening") || section.title.includes("听力"));
  set.instructions = (set.instructions || []).filter((block) => {
    if (block.type === "image" && block.alt?.trim().toLowerCase() === "source image" && hasQuestionContext) return false;
    const text = normalizedText(blockText(block));
    if (!text) return true;
    if (!hasListeningSection && /听力|listening|听下面|录音|音频|播放 audio/i.test(text)) return false;
    if (structuredTexts.includes(text)) return false;
    if (hasQuestionContext && text.length >= 80 && /[A-Za-z]{12}|_{3,}|_{1,}\d|阅读下面|听下面|选项|答案|解析|[?？]/i.test(text)) {
      if (structuredText.includes(text)) return false;
    }
    return true;
  });
}

function makePublicSet(source) {
  const set = normalizeSeniorHighText(structuredClone(source));
  const availableAssets = new Map();
  const unavailable = [];
  const unavailableAudioSourceIds = new Set();
  for (const sourceAsset of set.assetRefs || []) {
    const result = materializeAsset(sourceAsset);
    if (result.asset) availableAssets.set(result.asset.assetId, result.asset);
    else {
      unavailable.push({ assetId: sourceAsset.assetId, kind: sourceAsset.kind, reason: result.unavailableReason });
      if (sourceAsset.kind === "audio") for (const sourceRef of sourceAsset.sourceRefs || []) unavailableAudioSourceIds.add(sourceRef.sourceDocumentId);
    }
  }
  set.assetRefs = [...availableAssets.values()];
  if (unavailableAudioSourceIds.size > 0) {
    const keepSourceRef = (sourceRef) => !unavailableAudioSourceIds.has(sourceRef.sourceDocumentId);
    set.sourceRefs = (set.sourceRefs || []).filter(keepSourceRef);
    for (const section of set.sections || []) for (const group of section.groups || []) for (const question of group.questions || []) question.sourceRefs = (question.sourceRefs || []).filter(keepSourceRef);
  }
  removeErrorCorrectionContent(set);
  removeUnavailableAudioGroups(set, new Set(unavailable.filter((asset) => asset.kind === "audio").map((asset) => asset.assetId)));
  set.sections = set.sections.filter((section) => {
    const isListeningSection = section.id.toLowerCase().includes("listening") || section.title.includes("听力");
    return !isListeningSection || listeningSectionHasAvailableAudio(section, availableAssets);
  });
  removeDuplicateInstructionBlocks(set);
  let displayNumber = 1;
  for (const section of set.sections) for (const group of section.groups) for (const question of group.questions) question.displayNumber = displayNumber++;
  set.instructions = rewriteBlocks(set.instructions, availableAssets);
  for (const section of set.sections) {
    section.instructions = rewriteBlocks(section.instructions, availableAssets);
    for (const group of section.groups) {
      group.instructions = rewriteBlocks(group.instructions, availableAssets);
      group.stimulusBlocks = rewriteBlocks(group.stimulusBlocks, availableAssets);
      group.sharedOptions = rewriteOptions(group.sharedOptions, availableAssets);
      for (const question of group.questions) {
        question.promptBlocks = rewriteBlocks(question.promptBlocks, availableAssets);
        question.options = rewriteOptions(question.options, availableAssets);
        question.explanationBlocks = rewriteBlocks(question.explanationBlocks, availableAssets);
        if (Array.isArray(question.answerSpec.referenceAnswer)) {
          question.answerSpec.referenceAnswer = rewriteBlocks(question.answerSpec.referenceAnswer, availableAssets);
        }
      }
    }
  }
  return { set, unavailable };
}

function allQuestions(set) {
  return set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions));
}

function answerStatus(questions) {
  const states = new Set(questions.map((question) => question.answerSpec.availability));
  if (states.has("conflict")) return "conflict";
  if (states.size === 1 && states.has("none")) return "none";
  if (states.size === 1 && states.has("answered")) return "answered";
  return "partial";
}

function libraryEntry(set) {
  const questions = allQuestions(set).filter((question) => question.type !== "instruction_only");
  return {
    id: set.id,
    kind: set.kind,
    title: set.title,
    year: set.year,
    region: set.region,
    variant: set.variant,
    questionCount: questions.length,
    answeredCount: questions.filter((question) => question.answerSpec.availability === "answered").length,
    explanationCount: questions.filter((question) => question.explanationBlocks.length > 0).length,
    answerStatus: answerStatus(questions),
    questionTypes: [...new Set(questions.map((question) => question.type))],
    href: `/senior-high/${set.kind === "paper" ? "papers" : "practice"}/${set.id}`,
    quality: {
      structureStatus: set.quality.structureStatus,
      structureConfidence: set.quality.structureConfidence,
      issueCount: set.quality.issueCount,
    },
  };
}

const TYPE_PRACTICE_DEFINITIONS = [
  { key: "listening", label: "听力" },
  { key: "grammar-fill", label: "语法填空" },
  { key: "single-choice", label: "单项填空" },
  { key: "seven-choice", label: "七选五" },
  { key: "cloze", label: "完形填空" },
  { key: "reading", label: "阅读理解" },
  { key: "writing", label: "书面表达／写作" },
  { key: "continuation-writing", label: "读后续写" },
  { key: "application-writing", label: "应用文写作" },
  { key: "short-answer", label: "短文回答／阅读表达" },
];

function questionTypeKey(section, group, question, stimulusText = "") {
  const context = `${section.title} ${group.title || ""}`;
  const compactContext = context.replace(/\s+/g, "");
  const listeningContext = `${context} ${stimulusText}`;
  if (/听力|listening comprehension|short conversation|you will hear|listen carefully|听下面|听第\s*\d*\s*段材料/i.test(listeningContext)) return "listening";
  if (/完形|完型|cloze/i.test(context)) return "cloze";
  if (question.type === "shared_option_matching" || context.includes("七选五") || context.includes("六选五")) return "seven-choice";
  if (question.type === "inline_fill" || context.includes("语法填空")) return "grammar-fill";
  if (context.includes("应用文")) return "application-writing";
  if (context.includes("读后续写")) return "continuation-writing";
  if (question.type === "short_answer" || context.includes("短文回答") || context.includes("阅读表达")) return "short-answer";
  if (/阅读理解|阅读/.test(compactContext) || question.type === "translation") return "reading";
  if (/语音知识|发音知识|pronunciation|phonetics/i.test(context)) return null;
  if (/单项填空|单项选择|单选填空|单选选择|语法和词汇知识|词汇知识|单词填空/.test(compactContext)) return "single-choice";
  if (/^[A-E]$/i.test((group.title || "").trim()) && question.type === "single_choice") return "reading";
  if (question.type === "essay") return "writing";
  if (stimulusText.length >= 120) {
    if (question.promptBlocks.length === 0 || (question.blanks || []).length > 0) return "cloze";
    return "reading";
  }
  if (/第一节|第二节/.test(group.title || "") && question.options.length <= 3 && question.promptBlocks.length > 0) return "listening";
  if (question.type === "single_choice" || question.type === "multi_choice") return "single-choice";
  return null;
}

function namespaceBlocks(blocks, prefix) {
  return (blocks || []).map((block) => {
    const value = structuredClone(block);
    if (value.type === "paragraph" || value.type === "richText") {
      value.runs = value.runs.map((run) => run.type === "blank" ? { ...run, blankId: `${prefix}${run.blankId}` } : run);
    } else if (value.type === "table") {
      value.headers = namespaceBlocks(value.headers, prefix);
      value.rows = value.rows.map((row) => ({ cells: row.cells.map((cell) => namespaceBlocks(cell, prefix)) }));
    } else if (value.type === "dialogue") {
      value.turns = value.turns.map((turn) => ({ ...turn, blocks: namespaceBlocks(turn.blocks, prefix) }));
    }
    return value;
  });
}

function namespaceQuestion(question, prefix, displayNumber) {
  const value = structuredClone(question);
  value.id = `${prefix}${question.id}`;
  value.displayNumber = displayNumber;
  value.promptBlocks = namespaceBlocks(value.promptBlocks, prefix);
  value.options = (value.options || []).map((option) => ({ ...option, blocks: namespaceBlocks(option.blocks, prefix) }));
  value.explanationBlocks = namespaceBlocks(value.explanationBlocks, prefix);
  value.blanks = (value.blanks || []).map((blank) => ({ ...blank, blankId: `${prefix}${blank.blankId}` }));
  if (value.placement?.blankIds) value.placement.blankIds = value.placement.blankIds.map((blankId) => `${prefix}${blankId}`);
  if (value.answerSpec?.perBlankAnswers) {
    value.answerSpec.perBlankAnswers = Object.fromEntries(Object.entries(value.answerSpec.perBlankAnswers).map(([blankId, answers]) => [`${prefix}${blankId}`, answers]));
  }
  return value;
}

function uniqueById(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (seen.has(value.assetId || `${value.sourceDocumentId}|${value.relativePath}`)) return false;
    seen.add(value.assetId || `${value.sourceDocumentId}|${value.relativePath}`);
    return true;
  });
}

function practicePaperTitle(paper) {
  const title = (paper.title || "").trim();
  if (title && !/^(?:第[一二三四五六七八九十]+部分|试卷题目|绝密)/.test(title)) return title;
  return `${paper.year}年${paper.region || "高考"}高考英语真题`;
}

function buildTypePracticeSets(papers) {
  const byKey = new Map();
  for (const paper of papers) {
    const listeningAudio = (paper.assetRefs || []).find((asset) => asset.kind === "audio");
    let listeningPresentationAdded = false;
    for (const section of paper.sections || []) {
      for (const group of section.groups || []) {
        const stimulusText = (group.stimulusBlocks || []).map(blockText).join(" ").replace(/\s+/g, " ").trim();
        const hasArticle = stimulusText.length >= 120 && !/^例\s*[:：]/.test(stimulusText);
        const groupedQuestions = new Map();
        for (const question of group.questions || []) {
          if (question.type === "instruction_only") continue;
          const key = questionTypeKey(section, group, question, stimulusText);
          if (!key) continue;
          const hasPrompt = (question.promptBlocks || []).length > 0;
          if (["cloze", "reading", "seven-choice", "grammar-fill"].includes(key) && !hasArticle) continue;
          if (!hasPrompt && !hasArticle && key !== "listening") continue;
          if (!groupedQuestions.has(key)) groupedQuestions.set(key, []);
          groupedQuestions.get(key).push(question);
        }
        for (const [key, questions] of groupedQuestions) {
          if (key === "listening" && !listeningAudio) continue;
          if (["writing", "application-writing", "continuation-writing"].includes(key) && isWritingSupportGroup(group)) continue;
          const definition = TYPE_PRACTICE_DEFINITIONS.find((item) => item.key === key);
          if (!definition) continue;
          if (!byKey.has(key)) {
            byKey.set(key, {
              schemaVersion: 2,
              id: `practice-gaokao-${key}-2000-2019`,
              kind: "practice",
              title: `高考英语 · ${definition.label}（2000-2019真题）`,
              year: "2000-2019",
              region: "历年真题",
              variant: "题型汇编",
              instructions: [],
              sections: [{ id: `section-${key}`, title: definition.label, instructions: [], layout: "flow", groups: [] }],
              assetRefs: [],
              sourceRefs: [],
              quality: { structureStatus: "approved", structureConfidence: 0.9, issueCount: 0, issues: [] },
              submissionMode: "whole-paper",
            });
          }
          const target = byKey.get(key);
          const prefix = `${key}-${paper.id}-${section.id}-${group.id}-`;
          const writingKey = ["writing", "application-writing", "continuation-writing"].includes(key);
          const selectedQuestions = writingKey ? questions.filter((question) => !isNonWritingQuestion(question)) : questions;
          if (selectedQuestions.length === 0) continue;
          const clonedGroup = structuredClone(group);
          clonedGroup.id = `${prefix}group`;
          const firstListeningGroup = key === "listening" && !listeningPresentationAdded;
          clonedGroup.title = key === "listening" && !firstListeningGroup ? "" : practicePaperTitle(paper);
          clonedGroup.instructions = namespaceBlocks(clonedGroup.instructions, prefix);
          clonedGroup.stimulusBlocks = namespaceBlocks(clonedGroup.stimulusBlocks, prefix);
          if (key === "listening" && listeningAudio) {
            clonedGroup.stimulusBlocks = [
              ...(firstListeningGroup ? [{ type: "audio", assetId: listeningAudio.assetId, label: "听力音频" }] : []),
              ...clonedGroup.stimulusBlocks.filter((block) => block.type !== "audio"),
            ];
            listeningPresentationAdded = true;
          }
          clonedGroup.sharedOptions = (clonedGroup.sharedOptions || []).map((option) => ({ ...option, blocks: namespaceBlocks(option.blocks, prefix) }));
          let displayNumber = target.sections[0].groups.reduce((sum, item) => sum + item.questions.length, 0) + 1;
          clonedGroup.questions = selectedQuestions
            .map((question) => {
              const value = namespaceQuestion(question, prefix, displayNumber++);
              if (["writing", "application-writing", "continuation-writing"].includes(key)) {
                value.promptBlocks = sanitizeWritingBlocks(value.promptBlocks);
                if (value.answerSpec?.referenceAnswer) {
                  value.answerSpec.referenceAnswer = sanitizeWritingBlocks(value.answerSpec.referenceAnswer);
                }
              }
              return value;
            })
            .filter((question) => question.promptBlocks.length > 0 || question.type !== "essay");
          if (clonedGroup.questions.length === 0) continue;
          target.sections[0].groups.push(clonedGroup);
          target.assetRefs.push(...(paper.assetRefs || []));
          target.sourceRefs.push(...(paper.sourceRefs || []));
        }
      }
    }
  }
  return [...byKey.values()].map((set) => {
    if (/^practice-gaokao-(?:writing|application-writing|continuation-writing)-/.test(set.id)) dedupeWritingGroups(set);
    let displayNumber = 1;
    for (const section of set.sections) for (const group of section.groups) for (const question of group.questions) question.displayNumber = displayNumber++;
    set.assetRefs = uniqueById(set.assetRefs);
    set.sourceRefs = uniqueById(set.sourceRefs);
    return set;
  });
}

function main() {
  const paperDirectory = path.join(PUBLIC_ROOT, "papers");
  const practiceDirectory = path.join(PUBLIC_ROOT, "practice");
  cleanJsonDirectory(paperDirectory);
  cleanJsonDirectory(practiceDirectory);
  const entries = [];
  const published = [];
  const rejected = [];
  const legacyPapers = [];
  const archivedPaperIds = [];
  for (const name of fs.readdirSync(GOLD_DIR).filter((value) => value.endsWith(".json")).sort()) {
    const source = JSON.parse(fs.readFileSync(path.join(GOLD_DIR, name), "utf8"));
    if (typeof source.title === "string" && source.title.includes("【未上传】")) {
      rejected.push({ id: source.id, errors: ["unpublished_placeholder"], structureStatus: source.quality?.structureStatus || "unknown" });
      continue;
    }
    const sourceValidation = validateSeniorHighV2Set(source);
    if (!sourceValidation.ok || source.quality.structureStatus !== "approved") {
      rejected.push({ id: source.id, errors: [...sourceValidation.errors, ...(source.quality.structureStatus === "approved" ? [] : source.quality.issues || [])], structureStatus: source.quality.structureStatus });
      continue;
    }
    const publishability = validateSeniorHighV2Publishability(source);
    if (!publishability.ok) {
      rejected.push({ id: source.id, errors: publishability.errors, structureStatus: source.quality.structureStatus });
      continue;
    }
    const { set, unavailable } = makePublicSet(source);
    if (set.kind === "paper" && Number(set.year) < 2020) legacyPapers.push(set);
    const publicValidation = validateSeniorHighV2Set(set, { publicData: true });
    if (!publicValidation.ok) {
      rejected.push({ id: source.id, errors: publicValidation.errors, structureStatus: source.quality.structureStatus });
      continue;
    }
    if (set.kind === "paper" && Number(set.year) < 2020) {
      archivedPaperIds.push(set.id);
      continue;
    }
    const directory = set.kind === "paper" ? paperDirectory : practiceDirectory;
    fs.writeFileSync(path.join(directory, `${set.id}.json`), JSON.stringify(set));
    entries.push(libraryEntry(set));
    published.push({ id: set.id, kind: set.kind, questions: publicValidation.questionCount, unavailableAssets: unavailable });
  }
  const typePracticeSets = buildTypePracticeSets(legacyPapers);
  for (const set of typePracticeSets) {
    const validation = validateSeniorHighV2Set(set);
    if (!validation.ok) {
      rejected.push({ id: set.id, errors: validation.errors, structureStatus: set.quality.structureStatus });
      continue;
    }
    fs.writeFileSync(path.join(practiceDirectory, `${set.id}.json`), JSON.stringify(set));
    entries.push(libraryEntry(set));
    published.push({ id: set.id, kind: set.kind, questions: validation.questionCount, unavailableAssets: [] });
  }
  cleanAssetDirectory(ASSET_DIR, publishedAssetNames());
  entries.sort((a, b) => b.year.localeCompare(a.year, "zh-CN") || a.region.localeCompare(b.region, "zh-CN") || a.title.localeCompare(b.title, "zh-CN"));
  const index = { schemaVersion: 2, generatedAt: new Date().toISOString(), entries };
  fs.writeFileSync(path.join(PUBLIC_ROOT, "index.json"), JSON.stringify(index));

  const legacy = JSON.parse(fs.readFileSync(path.join(PUBLIC_ROOT, "catalog.json"), "utf8"));
  fs.writeFileSync(path.join(PUBLIC_ROOT, "knowledge.json"), JSON.stringify({ version: legacy.version, generated_at: legacy.generated_at, knowledge: legacy.knowledge || [] }));

  const report = {
    schemaVersion: 2,
    generatedAt: index.generatedAt,
    publishable: published.length > 0,
    published,
    rejected,
    totals: {
      sets: published.length,
      papers: published.filter((value) => value.kind === "paper").length,
      practiceSets: published.filter((value) => value.kind === "practice").length,
      questions: published.reduce((sum, value) => sum + value.questions, 0),
      unavailableAssets: published.reduce((sum, value) => sum + value.unavailableAssets.length, 0),
      rejected: rejected.length,
      archivedPapers: archivedPaperIds.length,
      typePracticeSets: typePracticeSets.length,
    },
    archivedPaperIds,
  };
  fs.writeFileSync(path.join(ROOT, "data", "senior-high", "v2", "publish-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.totals));
  if (!report.publishable) process.exitCode = 1;
}

main();
