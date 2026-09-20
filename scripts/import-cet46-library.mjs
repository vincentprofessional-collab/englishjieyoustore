import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, readFileSync, readdirSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_ROOTS = {
  cet4: "/Volumes/My HDD3/备课/四级",
  cet6: "/Volumes/My HDD3/备课/六级",
};
const DATA_ROOT = path.resolve("src/data");
const cache = new Map();

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolutePath));
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

function isTextFile(filePath) {
  return /\.(docx?|pdf|txt)$/i.test(filePath);
}

function extractText(filePath) {
  if (cache.has(filePath)) return cache.get(filePath);
  let text = "";
  try {
    if (/\.pdf$/i.test(filePath)) {
      text = execFileSync("/opt/homebrew/bin/pdftotext", ["-layout", filePath, "-"], { encoding: "utf8", maxBuffer: 30 * 1024 * 1024, timeout: 120000 });
    } else if (/\.docx?$/i.test(filePath)) {
      text = execFileSync("/usr/bin/textutil", ["-convert", "txt", "-stdout", filePath], { encoding: "utf8", maxBuffer: 30 * 1024 * 1024, timeout: 120000 });
    } else {
      text = readFileSync(filePath, "utf8");
    }
  } catch {
    text = "";
  }
  text = text.replaceAll("\u0000", "").replaceAll("\r", "").trim();
  cache.set(filePath, text);
  return text;
}

function cleanText(text) {
  return text
    .replaceAll("\f", "\n")
    .replace(/HYPERLINK\s+"[^"]+"\s+\\o\s+"[^"]+"\s*/gi, "")
    .replace(/HYPERLINK\s+"[^"]+"\s*/gi, "")
    .replace(/INCLUDEPICTURE\s+"[^"]+"\s*/gi, "")
    .replace(/INCLUDEPICTURE[^\n]*/gi, "")
    .replace(/大家网是大家的学习好帮手\s*/g, "")
    .split(/[\n\u2028\u2029]+/)
    .map((line) => line.replace(/[\u00a0\u200b]/g, " ").replace(/\s+$/g, "").trim())
    .filter((line) => line && !/^\d+\s*$/.test(line) && !/尊重劳动尊重版权|文档发布，只好用PDF格式/i.test(line) && !/https?:\/\/|下载|电子书|资料大全|预测卷|MP3|大家论坛|大家网|汇总|讲义|复习手册|在线题库|真题新书|专题集|答案解析|答案详解|答案及解析|真题解析|打印版|更新文件|考试流程|作文类型|版主建议|备考方案|内部培训资料|四级词汇|四级阅读|四级写作|标准分换算|冲刺讲义|押题|长喜|新东方|星火|真题与解析|首发|原创/i.test(line))
    .join("\n")
    .trim();
}

function isPracticeAnswerStart(line) {
  const trimmed = line.trim();
  if (/^(?:ANSWERS?|参考答案|答案(?:解析|详析|及解析|与解析)?|详解详析)\s*[：:]?/i.test(trimmed)) return true;
  if (trimmed.length < 160 && /(?:答案|解析)/.test(trimmed) && /(?:专项训练|试题|考试|真题|Part|Unit)/i.test(trimmed)) return true;
  if (/^\d{1,3}\s*[.．、)]\s*(?:[A-O](?:[)）])?\s*)?[\u4e00-\u9fff【]/.test(trimmed)) return true;
  return /^\d{1,3}\s*[.．、)]\s*[A-Za-z][A-Za-z'-]*(?:\s+\d{1,3}\s*[.．、)]\s*[A-Za-z]){2,}/.test(trimmed);
}

function splitPracticeSource(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((line, index) => index > 3 && isPracticeAnswerStart(line));
  if (start < 0) return { body: text, answers: "" };
  return { body: lines.slice(0, start).join("\n").trim(), answers: lines.slice(start).join("\n").trim() };
}

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function yearMonth(fileName) {
  const match = fileName.match(/(20\d{2})\s*[年.]?\s*(0?[369]|1[02])\s*(?:月)?/);
  return match ? `${match[1]}-${String(match[2]).padStart(2, "0")}` : null;
}

function setNumbers(fileName) {
  const range = fileName.match(/第\s*([123])\s*[、和及至-]\s*([123])/);
  if (range) return [Number(range[1]), Number(range[2])];
  const match = fileName.match(/(?:第|套|卷)\s*([123])/);
  if (match) return [Number(match[1])];
  const chinese = fileName.match(/卷([一二三])/);
  if (chinese) return [{ 一: 1, 二: 2, 三: 3 }[chinese[1]]];
  return /全(?:1|一)套|全3套|合并版|一键打印|全版/.test(fileName) ? [] : [1];
}

function displayDate(ym) {
  if (!ym) return "未标日期";
  const [year, month] = ym.split("-");
  return `${year}年${Number(month)}月`;
}

function questionCandidate(filePath, exam) {
  const name = path.basename(filePath);
  const ym = yearMonth(name);
  if (!ym || Number(ym.slice(0, 4)) < 2015 || !/(真题|试题|试卷)/.test(name)) return false;
  if (/(解析|答案|听力|原文|写作真题|翻译真题|仔细阅读真题|一键打印|合并版|全版|全套|赠)/.test(name)) return false;
  if (/(专项|作文|阅读理解)/.test(filePath)) return false;
  return exam === "cet4" ? /四级|CET4/i.test(filePath) : /六级|CET6/i.test(filePath);
}

function answerCandidate(filePath, exam) {
  const name = path.basename(filePath);
  const ym = yearMonth(name);
  if (!ym || Number(ym.slice(0, 4)) < 2015 || !/(答案|解析)/.test(name)) return false;
  return exam === "cet4" ? /四级|CET4/i.test(filePath) : /六级|CET6/i.test(filePath);
}

function chooseBest(paths) {
  return [...paths].sort((left, right) => {
    const leftWord = /\.docx?$/i.test(left) ? 0 : 1;
    const rightWord = /\.docx?$/i.test(right) ? 0 : 1;
    return leftWord - rightWord || left.length - right.length || left.localeCompare(right, "zh-CN");
  })[0];
}

async function buildPapers(exam, root) {
  const files = walk(root).filter(isTextFile);
  const candidates = files.filter((filePath) => questionCandidate(filePath, exam));
  const grouped = new Map();
  for (const filePath of candidates) {
    const ym = yearMonth(path.basename(filePath));
    for (const setNo of setNumbers(path.basename(filePath))) {
      const key = `${ym}-${setNo}`;
      const list = grouped.get(key) || [];
      list.push(filePath);
      grouped.set(key, list);
    }
  }
  const answers = new Map();
  for (const filePath of files.filter((item) => answerCandidate(item, exam))) {
    const text = cleanText(extractText(filePath));
    if (text.length < 80) continue;
    const ym = yearMonth(path.basename(filePath));
    for (const setNo of setNumbers(path.basename(filePath))) {
      const key = `${ym}-${setNo}`;
      const current = answers.get(key);
      if (!current || text.length > current.text.length) answers.set(key, { text, filePath });
    }
  }
  const entries = [];
  for (const [key, paths] of [...grouped].sort()) {
    const chosen = chooseBest(paths);
    const body = cleanText(extractText(chosen));
    if (body.length < 180) continue;
    const [ym, setNo] = key.split("-").slice(-2);
    const sourceHash = await sha256(chosen);
    const title = `${displayDate(`${key.split("-")[0]}-${ym}`)}大学英语${exam === "cet4" ? "四" : "六"}级真题 · 第${setNo}套`;
    entries.push({
      id: `${exam}-paper-${key.replaceAll("-", "")}`,
      title,
      section: "试卷",
      topic: "真题",
      sourceFiles: [path.relative(root, chosen), ...(answers.get(key)?.filePath ? [path.relative(root, answers.get(key).filePath)] : [])],
      sourceHash,
      excerpt: body.slice(0, 180),
      body,
      answers: answers.get(key)?.text || "",
      audioUrl: "",
    });
  }
  return entries;
}

async function buildKnowledge(exam, root, limit = 40) {
  const files = walk(path.join(root, "知识点")).filter(isTextFile).filter((filePath) => !/\.(txt)$/i.test(filePath));
  const entries = [];
  for (const filePath of files.sort((a, b) => a.localeCompare(b, "zh-CN"))) {
    const body = cleanText(extractText(filePath));
    if (body.length < 240) continue;
    const topic = /听力/.test(filePath) ? "听力" : /阅读/.test(filePath) ? "阅读" : /写作|作文|句型|范文|模板/.test(filePath) ? "写作" : "词汇";
    const sourceHash = await sha256(filePath);
    entries.push({ id: `${exam}-knowledge-${sourceHash.slice(0, 12)}`, title: path.basename(filePath, path.extname(filePath)), section: "知识点", topic, sourceFiles: [path.relative(root, filePath)], sourceHash, excerpt: body.slice(0, 180), body, answers: "", audioUrl: "" });
    if (entries.length >= limit) break;
  }
  return entries;
}

async function buildPractice(exam, root, limit = 45) {
  const files = walk(path.join(root, "题型")).filter(isTextFile).filter((filePath) => !/\.(txt)$/i.test(filePath));
  const entries = [];
  for (const filePath of files.sort((a, b) => a.localeCompare(b, "zh-CN"))) {
    const name = path.basename(filePath);
    if (/(听力音频|字幕|答案卡|技巧总结|答案|解析)/.test(name)) continue;
    const split = splitPracticeSource(cleanText(extractText(filePath)));
    const body = split.body;
    const looksLikePractice = /(\d{1,3}[.．、)]|Questions?\s+\d|Part\s+[IVX]+)/i.test(body) || /(练习|训练|专项|模拟)/.test(name);
    if (body.length < 240 || !looksLikePractice) continue;
    const topic = /听力/.test(filePath) ? "听力" : /翻译/.test(filePath) ? "翻译" : /选词|完形/.test(filePath) ? "选词填空" : /阅读|匹配/.test(filePath) ? "阅读" : "综合题型";
    const sourceHash = await sha256(filePath);
    entries.push({ id: `${exam}-practice-${sourceHash.slice(0, 12)}`, title: path.basename(filePath, path.extname(filePath)), section: "题型", topic, sourceFiles: [path.relative(root, filePath)], sourceHash, excerpt: body.slice(0, 180), body, answers: split.answers, audioUrl: "" });
    if (entries.length >= limit) break;
  }
  return entries;
}

async function main() {
  for (const [exam, root] of Object.entries(SOURCE_ROOTS)) {
    const existingPath = path.join(DATA_ROOT, exam === "cet4" ? "cet4" : "cet6", "library.json");
    let existing = { generatedAt: "", entries: [] };
    try { existing = JSON.parse(await readFile(existingPath, "utf8")); } catch {}
    const oldEntries = exam === "cet4"
      ? existing.entries
        .filter((entry) => !/^cet4-paper-/.test(entry.id))
        .filter((entry) => !(entry.section === "题型" && /答案|解析/.test(entry.title || "")))
        .map((entry) => {
          const cleanBody = cleanText(entry.body || "");
          const split = entry.section === "题型" ? splitPracticeSource(cleanBody) : { body: cleanBody, answers: "" };
          return {
          ...entry,
          excerpt: cleanText(entry.excerpt || "").slice(0, 180),
          body: split.body,
          answers: [split.answers, cleanText(entry.answers || "")].filter(Boolean).join("\n"),
        }; })
      : [];
    const papers = await buildPapers(exam, path.join(root, "试卷", "真题"));
    const oldTitles = new Set(oldEntries.map((entry) => entry.title));
    const oldBodies = new Set(oldEntries.map((entry) => entry.body));
    const knowledge = (await buildKnowledge(exam, root)).filter((entry) => !oldTitles.has(entry.title) && !oldBodies.has(entry.body));
    const practice = (await buildPractice(exam, root)).filter((entry) => !oldTitles.has(entry.title) && !oldBodies.has(entry.body));
    const entries = [...oldEntries, ...knowledge, ...practice, ...papers];
    const seen = new Set();
    const uniqueEntries = entries.filter((entry) => !seen.has(entry.id) && seen.add(entry.id));
    await mkdir(path.dirname(existingPath), { recursive: true });
    await writeFile(existingPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), entries: uniqueEntries }, null, 2)}\n`);
    console.log(JSON.stringify({ exam, output: existingPath, entries: uniqueEntries.length, knowledge: uniqueEntries.filter((entry) => entry.section === "知识点").length, practice: uniqueEntries.filter((entry) => entry.section === "题型").length, papers: uniqueEntries.filter((entry) => entry.section === "试卷").length }, null, 2));
  }
}

await main();
