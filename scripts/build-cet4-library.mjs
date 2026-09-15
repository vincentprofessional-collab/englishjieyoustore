import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_ROOT = process.argv[2] || "/Volumes/My HDD3/备课/四级";
const OUTPUT = path.resolve("src/data/cet4/library.json");
const DOCUMENT_EXTENSIONS = new Set([".doc", ".docx", ".pdf", ".htm", ".html", ".txt"]);
const ANSWER_MARKER = /^\s*(?:(?:参考)?答案(?:及解析|与解析)?|答案解析|参考译文)\s*[:：]?\s*$/i;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolutePath));
    else if (entry.isFile() && !entry.name.startsWith("._") && entry.name !== ".DS_Store") files.push(absolutePath);
  }
  return files;
}

function cleanText(value) {
  return value
    .replaceAll("\u0007", "\t")
    .replaceAll("\u000b", "\n")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function extractText(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  try {
    if (extension === ".doc" || extension === ".docx") {
      return cleanText(execFileSync("textutil", ["-convert", "txt", "-stdout", filePath], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }));
    }
    if (extension === ".pdf") {
      return cleanText(execFileSync("pdftotext", ["-layout", filePath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }));
    }
    const raw = execFileSync("textutil", ["-convert", "txt", "-stdout", filePath], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    return cleanText(raw);
  } catch (error) {
    process.stderr.write(`skip unreadable ${filePath}: ${error.message}\n`);
    return "";
  }
}

function slug(value) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function stableId(prefix, value) {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function statSyncSize(filePath) {
  return statSync(filePath).size;
}

function splitAnswers(text) {
  const lines = text.split("\n");
  const index = lines.findIndex((line, lineIndex) => lineIndex > 4 && ANSWER_MARKER.test(line) && line.trim().length < 80);
  if (index < 0) return { body: text, answers: "" };
  return { body: lines.slice(0, index).join("\n").trim(), answers: lines.slice(index).join("\n").trim() };
}

function sourceLabel(filePath) {
  return path.basename(filePath).replace(/\.[^.]+$/, "");
}

function topicFor(filePath) {
  const relative = path.relative(SOURCE_ROOT, filePath).split(path.sep);
  return relative[1] || relative[0];
}

function paperKey(filePath) {
  const relative = path.relative(path.join(SOURCE_ROOT, "试卷", "真题"), filePath);
  const joined = relative.replaceAll(path.sep, " ");
  let year;
  let month;
  const chinese = joined.match(/(20\d{2})\s*年?\s*(0?6|12)\s*月?/i);
  const compact = joined.match(/(?:^|\D)(20\d{2})(06|12)(?:\D|$)/);
  if (chinese) [year, month] = [chinese[1], chinese[2].padStart(2, "0")];
  else if (compact) [year, month] = [compact[1], compact[2]];
  else return null;
  const setMatch = joined.match(/第\s*([123])\s*套/i);
  const variant = /新四级|新题型/i.test(joined) ? "new" : /B卷/i.test(joined) ? "b" : "main";
  return `${year}-${month}${setMatch ? `-set${setMatch[1]}` : variant === "main" ? "" : `-${variant}`}`;
}

function paperCandidateScore(filePath, textLength) {
  const name = sourceLabel(filePath);
  let score = textLength;
  if (/真题|试卷|全版/.test(name)) score += 80_000;
  if (/答案|解析|听力|原文|详解|辅导/.test(name)) score -= 120_000;
  if (/大家版收藏级|89-07/.test(name)) score -= 1_000_000;
  if (/无录音/.test(name)) score -= 40_000;
  return score;
}

function titleForPaper(key) {
  const match = key.match(/^(\d{4})-(\d{2})(?:-(.+))?$/);
  if (!match) return key;
  const suffix = match[3]?.startsWith("set") ? ` · 第${match[3].slice(3)}套` : match[3] === "new" ? " · 新题型卷" : match[3] === "b" ? " · B卷" : "";
  return `${match[1]}年${Number(match[2])}月大学英语四级真题${suffix}`;
}

const allFiles = await walk(SOURCE_ROOT);
const documentFiles = allFiles.filter((filePath) => DOCUMENT_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
const extracted = new Map();
for (const [index, filePath] of documentFiles.entries()) {
  const text = extractText(filePath);
  if (text.length >= 80) extracted.set(filePath, text);
  if ((index + 1) % 25 === 0) process.stderr.write(`extracted ${index + 1}/${documentFiles.length}\n`);
}

let entries = [];
function addEntry({ id, title, section, topic, filePath, text, sourceFiles = [filePath], audioSource: explicitAudioSource = "" }) {
  const { body, answers } = section === "知识点" ? { body: text, answers: "" } : splitAnswers(text);
  const practiceAudio = topic === "听力" && filePath.includes(`${path.sep}听力练习${path.sep}`)
    ? allFiles.find((candidate) => path.dirname(candidate) === path.dirname(filePath) && path.extname(candidate).toLowerCase() === ".mp3")
    : null;
  const audioSource = explicitAudioSource || practiceAudio || "";
  entries.push({
    id,
    title,
    section,
    topic,
    sourceFiles: sourceFiles.map(sourceLabel),
    sourceHash: createHash("sha256").update(text).digest("hex"),
    excerpt: body.replace(/\s+/g, " ").slice(0, 150),
    body,
    answers,
    audioUrl: audioSource ? `/cet4/audio/${id}.mp3` : "",
    audioSource,
  });
}

for (const [filePath, text] of extracted) {
  const relative = path.relative(SOURCE_ROOT, filePath);
  if (!relative.startsWith(`知识点${path.sep}`) && !relative.startsWith(`题型${path.sep}`)) continue;
  const section = relative.startsWith(`知识点${path.sep}`) ? "知识点" : "题型";
  if (section === "题型" && /温馨提醒|四级巅峰培训资料答案|四级听力材料（上交大）1/.test(sourceLabel(filePath))) continue;
  if (section === "题型" && relative.includes(`听力模拟题(2)${path.sep}Model Test One.doc`)) continue;
  const isModelTestOne = section === "题型" && sourceLabel(filePath) === "Model Test One";
  const modelAnswer = isModelTestOne ? [...extracted].find(([candidate]) => sourceLabel(candidate) === "四级巅峰培训资料答案") : null;
  const modelAudio = isModelTestOne ? allFiles.find((candidate) => sourceLabel(candidate) === "模拟试题一" && path.extname(candidate).toLowerCase() === ".mp3") : "";
  const combinedText = modelAnswer ? `${text}\n\n参考答案\n${modelAnswer[1]}` : text;
  addEntry({ id: stableId(section === "知识点" ? "knowledge" : "practice", relative), title: sourceLabel(filePath), section, topic: topicFor(filePath), filePath, text: combinedText, sourceFiles: modelAnswer ? [filePath, modelAnswer[0]] : [filePath], audioSource: modelAudio || "" });
}

const paperGroups = new Map();
for (const [filePath, text] of extracted) {
  if (!filePath.startsWith(path.join(SOURCE_ROOT, "试卷", "真题"))) continue;
  const key = paperKey(filePath);
  if (!key || Number(key.slice(0, 4)) < 2005 || Number(key.slice(0, 4)) > 2015) continue;
  const group = paperGroups.get(key) || [];
  group.push({ filePath, text, score: paperCandidateScore(filePath, text.length) });
  paperGroups.set(key, group);
}

for (const [key, group] of [...paperGroups].sort((a, b) => b[0].localeCompare(a[0]))) {
  const primary = [...group].sort((a, b) => b.score - a.score)[0];
  const primaryLabel = sourceLabel(primary.filePath);
  if (primary.text.length < 6_000 || /听力.*原文|听力文本/.test(primaryLabel) || (/答案|解析/.test(primaryLabel) && !/真题|试卷/.test(primaryLabel))) continue;
  const answerSources = group.filter((item) => item !== primary && /答案|解析|详解/.test(sourceLabel(item.filePath))).sort((a, b) => b.text.length - a.text.length);
  const combined = answerSources.length && !ANSWER_MARKER.test(primary.text)
    ? `${primary.text}\n\n参考答案与解析\n${answerSources[0].text}`
    : primary.text;
  const baseKey = key.replace(/-(?:set[123]|new|b)$/, "");
  const audioCandidates = allFiles.filter((candidate) => {
    const candidateKey = paperKey(candidate);
    return path.extname(candidate).toLowerCase() === ".mp3"
      && candidate.startsWith(path.join(SOURCE_ROOT, "试卷", "真题"))
      && Boolean(candidateKey && (candidateKey === key || candidateKey === baseKey || candidateKey.startsWith(`${baseKey}-`)));
  });
  const exactAudio = audioCandidates.filter((candidate) => paperKey(candidate) === key);
  const rankedAudio = (exactAudio.length ? exactAudio : audioCandidates).map((candidate) => ({ candidate, size: statSyncSize(candidate) })).sort((a, b) => a.size - b.size);
  addEntry({ id: `paper-${key}`, title: titleForPaper(key), section: "试卷", topic: "历年真题", filePath: primary.filePath, text: combined, sourceFiles: [primary.filePath, ...answerSources.slice(0, 1).map((item) => item.filePath)], audioSource: rankedAudio[0]?.candidate || "" });
}

for (const [filePath, text] of extracted) {
  if (!filePath.startsWith(path.join(SOURCE_ROOT, "试卷", "模拟题"))) continue;
  if (/答案/.test(sourceLabel(filePath))) continue;
  const mockAudio = /2013|13年/.test(sourceLabel(filePath)) ? allFiles.find((candidate) => candidate.startsWith(path.join(SOURCE_ROOT, "试卷", "模拟题")) && path.extname(candidate).toLowerCase() === ".mp3") : "";
  addEntry({ id: stableId("mock", path.relative(SOURCE_ROOT, filePath)), title: sourceLabel(filePath), section: "试卷", topic: "模拟题", filePath, text, audioSource: mockAudio || "" });
}

const seenContent = new Set();
entries = entries.filter((entry) => {
  const signature = createHash("sha256").update(`${entry.section}\n${entry.topic}\n${entry.body.replace(/\s+/g, " ").trim()}\n${entry.answers.replace(/\s+/g, " ").trim()}`).digest("hex");
  if (seenContent.has(signature)) return false;
  seenContent.add(signature);
  return true;
});

entries.sort((left, right) => {
  const order = { "知识点": 0, "题型": 1, "试卷": 2 };
  return order[left.section] - order[right.section] || left.topic.localeCompare(right.topic, "zh-CN") || right.title.localeCompare(left.title, "zh-CN", { numeric: true });
});

const ids = new Set();
for (const entry of entries) {
  let candidate = entry.id;
  let sequence = 2;
  while (ids.has(candidate)) candidate = `${entry.id}-${sequence++}`;
  entry.id = candidate;
  ids.add(candidate);
}

const audioOutput = path.resolve("public/cet4/audio");
await rm(audioOutput, { recursive: true, force: true });
await mkdir(audioOutput, { recursive: true });
for (const entry of entries) {
  if (entry.audioSource) await copyFile(entry.audioSource, path.join(audioOutput, path.basename(entry.audioUrl)));
  delete entry.audioSource;
}

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2)}\n`);
const bySection = Object.fromEntries(["知识点", "题型", "试卷"].map((section) => [section, entries.filter((entry) => entry.section === section).length]));
console.log(JSON.stringify({ output: OUTPUT, sourceDocuments: documentFiles.length, extractedDocuments: extracted.size, entries: entries.length, bySection }, null, 2));
