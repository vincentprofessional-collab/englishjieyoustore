import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [gradedSourcePath, idiomaticSourcePath] = process.argv.slice(2);
if (!gradedSourcePath || !idiomaticSourcePath) {
  throw new Error("Usage: node scripts/import-vocabulary-phrase-libraries.mjs /path/to/教学大纲分级短语.md /path/to/短语合集.md");
}

const gradedBooks = { 小学: [], 初中: [], 高中: [] };
const gradedScenarios = { 小学短语: {}, 初中短语: {}, 高中短语: {} };
const idiomaticEntries = [];
const idiomaticScenarios = {};
const idiomaticDetailsByWord = new Map(JSON.parse(await readFile("src/data/vocabulary/idiomatic-expressions.json", "utf8"))
  .map((entry) => [entry.word.trim().toLowerCase(), { extension: entry.extension, note: entry.note }]));

function parseSource(text, { sectioned, onEntry }) {
  let section = "";
  let count = 0;
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (line.startsWith("## ")) {
      section = line.slice(3).trim();
      continue;
    }
    if (!line.startsWith("- ")) continue;
    const columns = line.slice(2).split("｜");
    const head = columns.shift() ?? "";
    const match = head.match(/^(.+?)\s*\/\/([^/]+)\/\/\s*(.*)$/u);
    const fields = Object.fromEntries(columns.map((column) => {
      const field = column.match(/^\s*(使用场景|场景中文|场景英文)[：:]\s*(.*)$/u);
      return field ? [field[1], field[2].trim()] : ["", ""];
    }));
    const word = match?.[1]?.trim();
    const phonetic = match?.[2]?.trim();
    const definitionCn = match?.[3]?.trim().replace(/[;；]\s*$/u, "");
    if (!word || !phonetic || !definitionCn || columns.length !== 3
      || !fields["使用场景"] || !fields["场景中文"] || !fields["场景英文"]) {
      throw new Error(`Invalid phrase data at line ${index + 1}: ${line.slice(0, 160)}`);
    }
    if (sectioned && !["小学", "初中", "高中"].includes(section)) {
      throw new Error(`Unexpected grade section at line ${index + 1}: ${section || "(none)"}`);
    }
    onEntry({
      definitionCn,
      phonetic: `/${phonetic}/`,
      scenario: {
        context: fields["使用场景"],
        translation: fields["场景中文"],
        example: fields["场景英文"],
      },
      section,
      word,
    });
    count += 1;
  }
  return count;
}

const gradedCount = parseSource(await readFile(resolve(gradedSourcePath), "utf8"), {
  sectioned: true,
  onEntry: ({ definitionCn, phonetic, scenario, section, word }) => {
    const book = `${section}短语`;
    const key = word.toLowerCase();
    if (gradedScenarios[book][key]) throw new Error(`Duplicate phrase in ${book}: ${word}`);
    gradedBooks[section].push({ definitionCn, partOfSpeech: "phr.", phonetic, word });
    gradedScenarios[book][key] = scenario;
  },
});

const idiomaticCount = parseSource(await readFile(resolve(idiomaticSourcePath), "utf8"), {
  sectioned: false,
  onEntry: ({ definitionCn, phonetic, scenario, word }) => {
    const key = word.toLowerCase();
    if (idiomaticScenarios[key]) throw new Error(`Duplicate phrase in 地道表达: ${word}`);
    idiomaticEntries.push({ ...idiomaticDetailsByWord.get(key), definitionCn, partOfSpeech: "phr.", phonetic, word });
    idiomaticScenarios[key] = scenario;
  },
});

if (gradedCount !== 1220 || idiomaticCount !== 5462) {
  throw new Error(`Unexpected source row counts: graded=${gradedCount}, idiomatic=${idiomaticCount}`);
}

const writeJson = (path, data) => writeFile(resolve(path), `${JSON.stringify(data)}\n`);
await Promise.all([
  writeJson("src/data/vocabulary/graded-phrases.json", gradedBooks),
  writeJson("src/data/vocabulary/graded-phrase-scenarios.json", gradedScenarios),
  writeJson("src/data/vocabulary/idiomatic-expressions.json", idiomaticEntries),
  writeJson("src/data/vocabulary/idiomatic-expression-scenarios.json", idiomaticScenarios),
  writeJson("src/data/vocabulary/supplemental-learning-book-counts.json", {
    小学短语: gradedBooks.小学.length,
    初中短语: gradedBooks.初中.length,
    高中短语: gradedBooks.高中.length,
    地道表达: idiomaticEntries.length,
    俚语俗语: 2330,
  }),
]);

console.log(`Imported ${gradedBooks.小学.length} primary, ${gradedBooks.初中.length} junior-high, ${gradedBooks.高中.length} senior-high phrases and replaced 地道表达 with ${idiomaticEntries.length} phrases.`);
