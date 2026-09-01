#!/usr/bin/env node

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateSeniorHighV2Set } from "./senior_high_v2_schema.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_ROOT = "/Users/shidianjin/Documents/高考英语";
const GOLD_DIR = path.join(ROOT, "data", "senior-high", "v2", "gold");
const PUBLIC_ROOT = path.join(ROOT, "public", "senior-high");
const ASSET_DIR = path.join(PUBLIC_ROOT, "assets");
const MEDIA_LIMIT = 12 * 1024 * 1024;

const MIME_EXTENSIONS = {
  "audio/mpeg": ".mp3",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
};

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function cleanJsonDirectory(directory) {
  ensureDirectory(directory);
  for (const name of fs.readdirSync(directory)) {
    if (name.endsWith(".json")) fs.unlinkSync(path.join(directory, name));
  }
}

function cleanAssetDirectory(directory) {
  ensureDirectory(directory);
  for (const name of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, name));
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function extensionFor(asset, sourcePath) {
  return path.extname(sourcePath) || MIME_EXTENSIONS[asset.mimeType] || "";
}

function sourceAssetParts(url) {
  const value = url.slice("source://".length);
  const marker = value.indexOf("#");
  return marker < 0
    ? { relativePath: value, packagePath: "" }
    : { relativePath: value.slice(0, marker), packagePath: value.slice(marker + 1) };
}

function materializeAsset(asset) {
  if (!asset.url.startsWith("source://")) return { asset, unavailableReason: "" };
  const { relativePath, packagePath } = sourceAssetParts(asset.url);
  const sourcePath = path.join(SOURCE_ROOT, relativePath);
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
  return (blocks || []).map((block) => {
    if (["image", "audio", "video"].includes(block.type) && !assets.has(block.assetId)) return unavailableNotice(block.type);
    if (block.type === "table") {
      return {
        ...block,
        headers: block.headers ? rewriteBlocks(block.headers, assets) : undefined,
        rows: block.rows.map((row) => ({ cells: row.cells.map((cell) => rewriteBlocks(cell, assets)) })),
      };
    }
    if (block.type === "dialogue") {
      return { ...block, turns: block.turns.map((turn) => ({ ...turn, blocks: rewriteBlocks(turn.blocks, assets) })) };
    }
    return block;
  });
}

function rewriteOptions(options, assets) {
  return (options || []).map((option) => ({ ...option, blocks: rewriteBlocks(option.blocks, assets) }));
}

function makePublicSet(source) {
  const set = structuredClone(source);
  const availableAssets = new Map();
  const unavailable = [];
  for (const sourceAsset of set.assetRefs || []) {
    const result = materializeAsset(sourceAsset);
    if (result.asset) availableAssets.set(result.asset.assetId, result.asset);
    else unavailable.push({ assetId: sourceAsset.assetId, kind: sourceAsset.kind, reason: result.unavailableReason });
  }
  set.assetRefs = [...availableAssets.values()];
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

function main() {
  cleanAssetDirectory(ASSET_DIR);
  const paperDirectory = path.join(PUBLIC_ROOT, "papers");
  const practiceDirectory = path.join(PUBLIC_ROOT, "practice");
  cleanJsonDirectory(paperDirectory);
  cleanJsonDirectory(practiceDirectory);
  const entries = [];
  const published = [];
  const rejected = [];
  for (const name of fs.readdirSync(GOLD_DIR).filter((value) => value.endsWith(".json")).sort()) {
    const source = JSON.parse(fs.readFileSync(path.join(GOLD_DIR, name), "utf8"));
    const sourceValidation = validateSeniorHighV2Set(source);
    if (!sourceValidation.ok || source.quality.structureStatus !== "approved") {
      rejected.push({ id: source.id, errors: sourceValidation.errors, structureStatus: source.quality.structureStatus });
      continue;
    }
    const { set, unavailable } = makePublicSet(source);
    const publicValidation = validateSeniorHighV2Set(set, { publicData: true });
    if (!publicValidation.ok) {
      rejected.push({ id: source.id, errors: publicValidation.errors, structureStatus: source.quality.structureStatus });
      continue;
    }
    const directory = set.kind === "paper" ? paperDirectory : practiceDirectory;
    fs.writeFileSync(path.join(directory, `${set.id}.json`), JSON.stringify(set));
    entries.push(libraryEntry(set));
    published.push({ id: set.id, kind: set.kind, questions: publicValidation.questionCount, unavailableAssets: unavailable });
  }
  entries.sort((a, b) => b.year.localeCompare(a.year, "zh-CN") || a.region.localeCompare(b.region, "zh-CN") || a.title.localeCompare(b.title, "zh-CN"));
  const index = { schemaVersion: 2, generatedAt: new Date().toISOString(), entries };
  fs.writeFileSync(path.join(PUBLIC_ROOT, "index.json"), JSON.stringify(index));

  const legacy = JSON.parse(fs.readFileSync(path.join(PUBLIC_ROOT, "catalog.json"), "utf8"));
  fs.writeFileSync(path.join(PUBLIC_ROOT, "knowledge.json"), JSON.stringify({ version: legacy.version, generated_at: legacy.generated_at, knowledge: legacy.knowledge || [] }));

  const report = {
    schemaVersion: 2,
    generatedAt: index.generatedAt,
    publishable: rejected.length === 0 && published.length > 0,
    published,
    rejected,
    totals: {
      sets: published.length,
      papers: published.filter((value) => value.kind === "paper").length,
      practiceSets: published.filter((value) => value.kind === "practice").length,
      questions: published.reduce((sum, value) => sum + value.questions, 0),
      unavailableAssets: published.reduce((sum, value) => sum + value.unavailableAssets.length, 0),
    },
  };
  fs.writeFileSync(path.join(ROOT, "data", "senior-high", "v2", "publish-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.totals));
  if (!report.publishable) process.exitCode = 1;
}

main();
