import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SOURCE_ROOT = process.env.CET4_TRUE_SOURCE_ROOT || "/Volumes/My HDD3/备课/四级/真题2020-2026";
const DATA_PATH = path.resolve("src/data/cet4/library.json");
const AUDIO_ROOT = path.resolve("public/cet4/audio");
const REPORT_PATH = path.resolve("data/cet4/2020-2026-import-report.json");
const DOCUMENT_EXTENSIONS = new Set([".doc", ".docx", ".pdf"]);

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolutePath));
    else if (entry.isFile() && !entry.name.startsWith("._") && entry.name !== ".DS_Store") files.push(absolutePath);
  }
  return files;
}

function ocrPdf(filePath) {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "cet4-ocr-"));
  const prefix = path.join(temporaryRoot, "page");
  try {
    execFileSync("/opt/homebrew/bin/pdftoppm", ["-png", "-r", "180", filePath, prefix], {
      timeout: 300000,
      stdio: "ignore",
    });
    return readdirSync(temporaryRoot)
      .filter((name) => name.endsWith(".png"))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
      .map((name) => {
        try {
          return execFileSync("/opt/homebrew/bin/tesseract", [
            path.join(temporaryRoot, name),
            "stdout",
            "-l",
            "eng+chi_sim",
            "--psm",
            "6",
          ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: 120000 });
        } catch (error) {
          process.stderr.write(`skip OCR page ${name}: ${error.message}\n`);
          return "";
        }
      })
      .join("\n")
      .trim();
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function extractText(filePath, allowOcr = false) {
  try {
    const extension = path.extname(filePath).toLowerCase();
    const command = extension === ".pdf" ? "/opt/homebrew/bin/pdftotext" : "/usr/bin/textutil";
    const args = extension === ".pdf"
      ? ["-layout", filePath, "-"]
      : ["-convert", "txt", "-stdout", filePath];
    const text = execFileSync(command, args, {
      encoding: "utf8",
      maxBuffer: 40 * 1024 * 1024,
      timeout: 180000,
    })
      .replaceAll("\u0000", "")
      .replaceAll("\r", "")
      .trim();
    return extension === ".pdf" && allowOcr && text.length < 180 ? ocrPdf(filePath) : text;
  } catch (error) {
    process.stderr.write(`skip unreadable ${filePath}: ${error.message}\n`);
    return allowOcr && path.extname(filePath).toLowerCase() === ".pdf" ? ocrPdf(filePath) : "";
  }
}

function cleanText(text) {
  return text
    .replaceAll("\f", "\n")
    .replace(/HYPERLINK\s+"[^"]+"\s+\\o\s+"[^"]+"\s*/gi, "")
    .replace(/HYPERLINK\s+"[^"]+"\s*/gi, "")
    .replace(/INCLUDEPICTURE[^\n]*/gi, "")
    .replace(/\bPart\s+I\s+(?=(?:Listening|Reading)\b)/gi, "Part II ")
    .replace(/\bPart\s+II\s+(?=Reading\b)/gi, "Part III ")
    .replace(/\bPart\s+Il\b/gi, "Part II")
    .replace(/\bPart\s+Hl\b/gi, "Part III")
    .replace(/\bPart\s+Ill\b/gi, "Part III")
    .replace(/\bPart\s+(?:n|N)\b/gi, "Part II")
    .replace(/\bPart\s+(?:in|m|HI|DI)\b/gi, "Part III")
    .split(/[\n\u2028\u2029]+/)
    .map((line) => line.replace(/[\u00a0\u200b]/g, " ").replace(/\s+$/g, "").trim())
    .filter((line) => line
      && !/^\d+\s*$/.test(line)
      && !/尊重劳动尊重版权|文档发布，只好用PDF格式/i.test(line)
      && !/https?:\/\/|下载|电子书|资料大全|预测卷|大家论坛|大家网|汇总|讲义|复习手册|在线题库|真题新书|专题集|打印版|更新文件|考试流程|版主建议|备考方案|内部培训资料|冲刺讲义|押题|长喜|新东方|星火|首发|原创/i.test(line))
    .join("\n")
    .trim();
}

function yearMonth(fileName) {
  const match = fileName.match(/(20(?:20|21|22|23|24|25|26))\s*[年.]?\s*(0?[3679]|1[02])\s*(?:月)?/);
  return match ? `${match[1]}-${String(match[2]).padStart(2, "0")}` : null;
}

function setNumbers(fileName) {
  if (/全\s*[123一二三]\s*套|合并版|一键打印|全版/.test(fileName)) return [];
  const range = fileName.match(/第\s*([123一二三])\s*[、和及至-]\s*([123一二三])/);
  if (range) return [range[1], range[2]].map((value) => ({ 一: 1, 二: 2, 三: 3 }[value] || Number(value)));
  const match = fileName.match(/第\s*([123一二三])\s*套/);
  if (match) return [{ 一: 1, 二: 2, 三: 3 }[match[1]] || Number(match[1])];
  return [1];
}

function displayDate(ym) {
  const [year, month] = ym.split("-");
  return `${year}年${Number(month)}月`;
}

function isAnswerFile(filePath) {
  return /答案|解析|详解/.test(path.basename(filePath));
}

function isPaperFile(filePath) {
  const name = path.basename(filePath);
  return DOCUMENT_EXTENSIONS.has(path.extname(name).toLowerCase())
    && Boolean(yearMonth(name))
    && /真题|试题|试卷/.test(name)
    && !isAnswerFile(filePath)
    && !/听力|原文|写作|翻译|仔细阅读|长篇阅读|阅读解析|综合专项|六级/.test(name);
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function sourceScore(filePath, text) {
  const name = path.basename(filePath);
  let score = text.length;
  if (/\.docx?$/i.test(name)) score += 500000;
  if (/真题|试卷/.test(name)) score += 100000;
  if (/可复制|可搜索|打印首选|检索/.test(name)) score += 10000;
  return score;
}

function sourceSetKey(filePath) {
  const ym = yearMonth(path.basename(filePath));
  const numbers = setNumbers(path.basename(filePath));
  return ym && numbers.length ? `${ym}-${numbers[0]}` : null;
}

function audioCandidates(audioFiles, key) {
  return audioFiles.filter((filePath) => {
    const name = path.basename(filePath);
    if (/六级/.test(name)) return false;
    if (yearMonth(name) !== key.slice(0, 7)) return false;
    const numbers = setNumbers(name);
    return numbers.length === 1 && numbers[0] === Number(key.slice(8));
  });
}

const allFiles = walk(SOURCE_ROOT);
const documents = allFiles.filter((filePath) => DOCUMENT_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
const audioFiles = allFiles.filter((filePath) => /\.mp3$/i.test(filePath));
const paperFiles = documents.filter(isPaperFile);
const answerFiles = documents.filter(isAnswerFile).filter((filePath) => Boolean(yearMonth(path.basename(filePath))));
const textCache = new Map();
function textFor(filePath, allowOcr = false) {
  if (!textCache.has(filePath)) textCache.set(filePath, extractText(filePath, allowOcr));
  return textCache.get(filePath);
}

const groups = new Map();
for (const filePath of paperFiles) {
  const key = sourceSetKey(filePath);
  if (!key) continue;
  const group = groups.get(key) || [];
  group.push(filePath);
  groups.set(key, group);
}

const answerGroups = new Map();
for (const filePath of answerFiles) {
  const ym = yearMonth(path.basename(filePath));
  const numbers = setNumbers(path.basename(filePath));
  if (!ym || numbers.length !== 1) continue;
  const key = `${ym}-${numbers[0]}`;
  const group = answerGroups.get(key) || [];
  group.push(filePath);
  answerGroups.set(key, group);
}

const entries = [];
const selected = [];
for (const [key, candidates] of [...groups].sort(([left], [right]) => left.localeCompare(right))) {
  const scored = candidates
    .map((filePath) => ({ filePath, text: textFor(filePath, true), score: sourceScore(filePath, textFor(filePath, true)) }))
    .filter((item) => item.text.length >= 180)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath, "zh-CN"));
  const primary = scored[0];
  if (!primary) continue;

  const answerCandidates = (answerGroups.get(key) || [])
    .map((filePath) => ({ filePath, text: cleanText(textFor(filePath)) }))
    .filter((item) => item.text.length >= 80)
    .sort((left, right) => right.text.length - left.text.length);
  const [, ym, setNo] = key.match(/^(\d{4}-\d{2})-(\d+)$/) || [];
  if (!ym || !setNo) continue;
  const audio = audioCandidates(audioFiles, key).sort((left, right) => right.length - left.length)[0] || "";
  const id = `cet4-paper-${ym.replace("-", "")}${setNo}`;
  const answer = answerCandidates[0];
  const body = cleanText(primary.text);
  entries.push({
    id,
    title: `${displayDate(ym)}大学英语四级真题 · 第${setNo}套`,
    section: "试卷",
    topic: "真题",
    sourceFiles: [
      path.relative(SOURCE_ROOT, primary.filePath),
      ...(answer ? [path.relative(SOURCE_ROOT, answer.filePath)] : []),
    ],
    sourceHash: await hashFile(primary.filePath),
    excerpt: body.replace(/\s+/g, " ").slice(0, 180),
    body,
    answers: answer?.text || "",
    audioUrl: audio ? `/cet4/audio/${id}.mp3` : "",
    audioSource: audio,
  });
  selected.push({
    key,
    selected: path.relative(SOURCE_ROOT, primary.filePath),
    alternatives: scored.slice(1).map((item) => path.relative(SOURCE_ROOT, item.filePath)),
    answer: answer ? path.relative(SOURCE_ROOT, answer.filePath) : "",
    audio: audio ? path.relative(SOURCE_ROOT, audio) : "",
  });
}

if (!entries.length) throw new Error(`No CET-4 true-paper entries found under ${SOURCE_ROOT}`);

const seenBodies = new Set();
const uniqueEntries = entries.filter((entry) => {
  const signature = createHash("sha256").update(entry.body.replace(/\s+/g, " ").trim()).digest("hex");
  if (seenBodies.has(signature)) return false;
  seenBodies.add(signature);
  return true;
});

await mkdir(path.dirname(DATA_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
const publishedEntries = uniqueEntries.map(({ audioSource, ...entry }) => entry);
await writeFile(DATA_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), entries: publishedEntries }, null, 2)}\n`);

await rm(AUDIO_ROOT, { recursive: true, force: true });
await mkdir(AUDIO_ROOT, { recursive: true });
for (const entry of uniqueEntries) {
  if (!entry.audioSource) continue;
  await writeFile(path.join(AUDIO_ROOT, path.basename(entry.audioUrl)), readFileSync(entry.audioSource));
}

await writeFile(REPORT_PATH, `${JSON.stringify({
  sourceRoot: SOURCE_ROOT,
  sourceFileCount: allFiles.length,
  documentCount: documents.length,
  audioCount: audioFiles.length,
  paperCandidateCount: paperFiles.length,
  answerCandidateCount: answerFiles.length,
  groupedPaperCount: groups.size,
  publishedPaperCount: publishedEntries.length,
  selected,
}, null, 2)}\n`);

console.log(JSON.stringify({
  output: DATA_PATH,
  report: REPORT_PATH,
  sourceRoot: SOURCE_ROOT,
  sourceFileCount: allFiles.length,
  paperCandidateCount: paperFiles.length,
  groupedPaperCount: groups.size,
  publishedPaperCount: publishedEntries.length,
  audioPublishedCount: publishedEntries.filter((entry) => entry.audioUrl).length,
}, null, 2));
