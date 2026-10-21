import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const sourceRoot = "/Volumes/My HDD3/备课/考研/真题/2020-2026英语一二离线练习";
const ocrRoot = "/private/tmp/kaoyan_answer_ocr";
const outputRoot = path.join(process.cwd(), "public", "exam-prep", "postgraduate");
const promoLine = /(?:微信公众号|微信号|公众号[:：]|淘宝|店铺|二维码|扫码|加\s*[vV]|加微信|资料领取|免费资料|领取资料|联系(?:老师|方式)|添加(?:老师|好友)|学习交流群|备考群|免费课程|课程咨询|网盘|小红书|blog\.sina|https?:\/\/|www\.)/i;
const watermarkLine = /(?:\b(?:RIS|BRS)\b.*\b(?:PDF|KM)\b|^\s*\d{1,3}\s*\/\s*20\d{2}\b|^\s*(?:©|file:\/\/))/i;

function cleanText(value = "") {
  return String(value)
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[\t\u00a0 ]+/g, " ").trim())
    .filter((line) => line && !promoLine.test(line) && !watermarkLine.test(line))
    .join("\n");
}

function readJsonl(file) {
  return fs.readFile(file, "utf8").then((text) => text.split("\n").filter(Boolean).map((line) => JSON.parse(line)));
}

async function answerPages(id, kind) {
  const file = path.join(ocrRoot, `${id}-${kind}.jsonl`);
  try {
    const rows = await readJsonl(file);
    return rows.map((row) => `【${kind === "key" ? "答案页" : "解析页"} ${row.page}】\n${cleanText(row.text)}`).filter((text) => !text.endsWith("\n")).join("\n\n");
  } catch {
    return "";
  }
}

function cleanQuestion(question, section) {
  const options = (question.options || []).map((option) => ({ label: option.label, text: cleanText(option.text) }));
  const raw = [question.stem, question.sourceText, ...options.map((option) => option.text)].join(" ");
  return {
    number: question.number,
    stem: cleanText(question.stem),
    options,
    answerMode: options.length === 4 ? "choice" : section.kind === "translation" ? "translation" : section.kind === "writing" ? "essay" : "text",
    reviewRequired: options.length > 0 && (options.length !== 4 || /(?:Ris\s*\(|BRS:|PDF\s+[A-Z]{2,}|淘宝|公众号|微信)/i.test(raw)),
  };
}

function cleanSection(section) {
  return {
    title: cleanText(section.title),
    kind: section.kind || "questions",
    directions: cleanText(section.directions),
    source: cleanText(section.source),
    passage: cleanText(section.passage),
    passages: (section.passages || []).map((passage) => ({
      title: cleanText(passage.title),
      text: cleanText(passage.passage),
      questions: (passage.questions || []).map((question) => cleanQuestion(question, section)),
    })),
    questions: (section.questions || []).map((question) => cleanQuestion(question, section)),
  };
}

const source = await fs.readFile(path.join(sourceRoot, "questions-data.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const papers = sandbox.window.EXAM_DATA;
await fs.mkdir(path.join(outputRoot, "papers"), { recursive: true });
let existingPracticeEntries = [];
try {
  const existingIndex = JSON.parse(await fs.readFile(path.join(outputRoot, "index.json"), "utf8"));
  existingPracticeEntries = existingIndex.entries.filter((entry) => entry.kind === "practice");
} catch { /* First build has no index yet. */ }
const entries = [];
let promotionHits = 0;

for (const paper of papers) {
  const sections = paper.sections.map(cleanSection);
  const explanation = await answerPages(paper.id, "explanation");
  const key = await answerPages(paper.id, "key");
  const allText = JSON.stringify({ sections, explanation, key });
  promotionHits += [...allText.matchAll(/(?:公众号|淘宝|微信号|扫码|加\s*[vV]|https?:\/\/|blog\.sina)/gi)].length;
  const questionCount = sections.reduce((count, section) => count + section.questions.length + section.passages.reduce((sum, passage) => sum + passage.questions.length, 0), 0);
  const reviewQuestions = sections.flatMap((section) => [...section.questions, ...section.passages.flatMap((passage) => passage.questions)]).filter((question) => question.reviewRequired).map((question) => question.number);
  const set = {
    id: paper.id,
    exam: "postgraduate",
    title: `${paper.year} 年${paper.subject}`,
    year: paper.year,
    subject: paper.subject,
    kind: "paper",
    mode: "paper",
    questionCount,
    sections,
    answerKeyText: key,
    explanationText: explanation,
    answerStatus: key || explanation ? "available" : "missing",
    quality: {
      ocrSource: Boolean(paper.ocr),
      reviewQuestionNumbers: reviewQuestions,
      warningCount: reviewQuestions.length + (paper.warnings || []).length,
    },
  };
  await fs.writeFile(path.join(outputRoot, "papers", `${paper.id}.json`), `${JSON.stringify(set)}\n`);
  entries.push({ id: paper.id, title: set.title, year: String(paper.year), subject: paper.subject, questionCount, answerStatus: set.answerStatus, reviewCount: set.quality.warningCount, href: `/exam-practice/postgraduate/${paper.id}`, kind: "paper", dataPath: `papers/${paper.id}.json` });
}

await fs.writeFile(path.join(outputRoot, "index.json"), `${JSON.stringify({ exam: "postgraduate", generatedAt: new Date().toISOString(), entries: [...entries, ...existingPracticeEntries] }, null, 2)}\n`);
console.log(JSON.stringify({ papers: entries.length, questions: entries.reduce((sum, item) => sum + item.questionCount, 0), answerReady: entries.filter((item) => item.answerStatus === "available").length, promotionHits, outputRoot }, null, 2));
