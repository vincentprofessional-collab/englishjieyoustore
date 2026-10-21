import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCet6Paper, cleanCet6Source } from "./cet6-paper-parser.mjs";

const cache = process.argv[2] || "/tmp/cet6-intake-20261021";
const libraryPath = path.resolve("src/data/cet6/library.json");
const library = JSON.parse(await readFile(libraryPath, "utf8"));
const files = JSON.parse(await readFile(path.join(cache, "all-inventory.json"), "utf8"));
const grouped = new Map();
const legacy = JSON.parse(await readFile(path.join(cache, "legacy-library.json"), "utf8"));
for (const file of files.filter(f => f.kind === "question")) {
  const match = file.name.match(/第\s*([123])\s*套/) || file.name.match(/全\s*(1)\s*套/);
  if (!match) continue;
  const id = `cet6-paper-${file.date.replace("-", "")}${match[1]}`;
  const body = await readFile(file.cache, "utf8");
  const candidates = grouped.get(id) || [];
  if (body.length > 100) candidates.push({ file, body, method: file.name.endsWith(".pdf") ? "pdf-text" : file.name.endsWith(".docx") ? "docx-xml" : "docx-text" });
  for (const suffix of [".ocr.zh.json", ".ocr.json"]) try {
    const pages = JSON.parse(await readFile(file.cache.replace(/\.norm\.txt$/, suffix), "utf8"));
    const ocr = pages.map(p => p.lines.map(l => l.text).join("\n")).join("\n");
    if (ocr.length > 100) candidates.push({ file, body: ocr, method: "pdf-ocr" });
  } catch { /* OCR is queued only for unreadable candidates. */ }
  grouped.set(id, candidates);
}
for (const entry of legacy.entries.filter(e => e.section === "试卷")) {
  const candidates = grouped.get(entry.id) || [];
  const file = files.find(f => f.name === path.basename(entry.sourceFiles[0]));
  if (file?.kind === "question") candidates.push({ file, body: entry.body, method: file.name.endsWith(".pdf") ? "pdf-text" : "docx-text" });
  grouped.set(entry.id, candidates);
}
const selected = [];
const prior = new Map(library.entries.map(e => [e.id, e]));
for (const [id, candidates] of [...grouped].sort()) {
  if (!candidates.length) continue;
  const date = candidates[0].file.date;
  const title = `${date.slice(0, 4)}年${Number(date.slice(5))}月大学英语六级真题 · 第${id.at(-1)}套`;
  const scored = candidates.map(candidate => {
    const entry = { ...prior.get(id), id, title, section: "试卷", topic: "真题", sourceFiles: [`试卷/真题/${candidate.file.name}`], sourceHash: candidate.file.sha256, body: cleanCet6Source(candidate.body), answers: "", audioUrl: "", sourceReview: { extractionMethod: candidate.method } };
    const set = buildCet6Paper(entry);
    const structuralIssues = set.quality.issues.filter(issue => !/解析|音频|原卷未列出本套听力/.test(issue));
    const questions = set.sections.flatMap(s => s.groups.flatMap(g => g.questions));
    const options = questions.filter(q => q.options.map(o => o.label).join("") === "ABCD").length;
    const odd = [...entry.body].filter(c => !/[\p{Script=Latin}\p{Script=Han}\p{N}\p{P}\p{Z}\p{S}\s]/u.test(c)).length;
    const score = questions.length * 5 + options * 2 - structuralIssues.length * 35 - odd * 0.02;
    return { entry, score, structuralIssues, questions: questions.length, method: candidate.method, file: candidate.file.name };
  }).sort((a, b) => b.score - a.score);
  if (!scored.length) continue;
  const best = scored[0];
  selected.push(best.entry);
  console.log(JSON.stringify({ id, source: best.file, method: best.method, questions: best.questions, issues: best.structuralIssues }));
}
library.entries = [...library.entries.filter(e => e.section === "题型").map(e => ({ ...e, body: cleanCet6Source(e.body), answers: cleanCet6Source(e.answers) })), ...selected];
await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`);
