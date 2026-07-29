import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();
const bundledVocabularyPath = path.join(
  rootDir,
  "src/data/vocabulary/flat-vocabulary.json",
);
const ecdictPath = path.resolve(
  process.env.ECDICT_SOURCE_PATH ??
    "/Users/shidianjin/Desktop/未命名文件夹/ecdict.csv",
);
const isDryRun = process.env.ECDICT_DRY_RUN === "1";
const batchSize = 500;

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function* parseCsvRows(value) {
  let field = "";
  let row = [];
  let isQuoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const nextCharacter = value[index + 1];

    if (character === "\"") {
      if (isQuoted && nextCharacter === "\"") {
        field += "\"";
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (character === "," && !isQuoted) {
      row.push(field);
      field = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !isQuoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(field);
      yield row;
      row = [];
      field = "";
      continue;
    }

    field += character;
  }

  if (field || row.length > 0) {
    row.push(field);
    yield row;
  }
}

function normalizeWord(value) {
  return value.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
}

function isPracticalWord(row, columns) {
  const word = row[columns.get("word")]?.trim() ?? "";
  const translation = row[columns.get("translation")]?.trim() ?? "";
  const tag = row[columns.get("tag")]?.trim() ?? "";
  const bncRank = Number(row[columns.get("bnc")] ?? 0);
  const frequencyRank = Number(row[columns.get("frq")] ?? 0);
  const hasCommonRank =
    (bncRank > 0 && bncRank <= 100_000) ||
    (frequencyRank > 0 && frequencyRank <= 100_000);

  return (
    Boolean(translation) &&
    /^[A-Za-z]+(?:['-][A-Za-z]+)*$/.test(word) &&
    normalizeWord(word).length > 1 &&
    (Boolean(tag) || hasCommonRank)
  );
}

function getLevel(tagValue) {
  const tags = new Set(tagValue.toLowerCase().split(/\s+/).filter(Boolean));
  const levels = [
    ["zk", "初中"],
    ["gk", "高中"],
    ["cet4", "四级"],
    ["cet6", "六级"],
    ["ky", "考研"],
    ["ielts", "雅思"],
    ["toefl", "托福"],
    ["gre", "GRE"],
  ];

  return levels.find(([tag]) => tags.has(tag))?.[1] ?? null;
}

function getPartOfSpeech(posValue) {
  const labels = {
    a: "adj.",
    adj: "adj.",
    adv: "adv.",
    c: "conj.",
    conj: "conj.",
    int: "int.",
    n: "n.",
    num: "num.",
    p: "prep.",
    prep: "prep.",
    pron: "pron.",
    r: "adv.",
    v: "v.",
  };
  const code = posValue
    .split("/")
    .map((item) => item.split(":")[0]?.trim().toLowerCase())
    .find(Boolean);

  return labels[code] ?? null;
}

function getWordForms(exchangeValue) {
  const labelsByCode = {
    "3": ["三单"],
    d: ["过去分词"],
    i: ["现在分词", "动名词"],
    p: ["过去式"],
    r: ["比较级"],
    s: ["复数"],
    t: ["最高级"],
  };
  const forms = {};

  for (const item of exchangeValue.split("/")) {
    const separatorIndex = item.indexOf(":");

    if (separatorIndex < 1) {
      continue;
    }

    const code = item.slice(0, separatorIndex).trim();
    const value = item.slice(separatorIndex + 1).trim();

    for (const label of labelsByCode[code] ?? []) {
      if (value) {
        forms[label] = value;
      }
    }
  }

  return forms;
}

function createDatabaseRow(row, columns) {
  const word = normalizeWord(row[columns.get("word")] ?? "");
  const phonetic = row[columns.get("phonetic")]?.trim() || null;

  return {
    access_feature_key: "vocabulary.dictionary",
    definition_cn: row[columns.get("translation")]?.trim() || null,
    definition_en: row[columns.get("definition")]?.trim() || null,
    is_paid_only: false,
    level: getLevel(row[columns.get("tag")] ?? ""),
    part_of_speech: getPartOfSpeech(row[columns.get("pos")] ?? ""),
    phonetic,
    skill_tags: ["ecdict"],
    uk_phonetic: phonetic,
    us_phonetic: phonetic,
    word,
    word_forms: getWordForms(row[columns.get("exchange")] ?? ""),
  };
}

async function upsertBatch(supabase, rows) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { error } = await supabase
      .from("vocabulary_entries")
      .upsert(rows, { onConflict: "word" });

    if (!error) {
      return;
    }

    if (attempt === 3) {
      throw new Error(`ECDICT batch import failed: ${error.message}`);
    }
  }
}

loadEnvFile(path.join(rootDir, ".env.local"));
loadEnvFile(path.join(rootDir, ".env.seed.local"));

if (!existsSync(bundledVocabularyPath)) {
  throw new Error(`Bundled vocabulary file not found: ${bundledVocabularyPath}`);
}

if (!existsSync(ecdictPath)) {
  throw new Error(`ECDICT file not found: ${ecdictPath}`);
}

const bundledEntries = JSON.parse(readFileSync(bundledVocabularyPath, "utf8"));
const bundledWords = new Set(
  bundledEntries.map((entry) => normalizeWord(entry.word ?? "")).filter(Boolean),
);
const csvRows = parseCsvRows(readFileSync(ecdictPath, "utf8"));
const header = csvRows.next().value;

if (!header) {
  throw new Error("ECDICT CSV is empty.");
}

const columns = new Map(header.map((column, index) => [column, index]));
const requiredColumns = [
  "word",
  "phonetic",
  "definition",
  "translation",
  "pos",
  "tag",
  "bnc",
  "frq",
  "exchange",
];

for (const column of requiredColumns) {
  if (!columns.has(column)) {
    throw new Error(`ECDICT CSV is missing column: ${column}`);
  }
}

let supabase = null;

if (!isDryRun) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase URL or service role key. Add them to .env.local and .env.seed.local.",
    );
  }

  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

const seenWords = new Set();
const batch = [];
let coreEnrichmentCount = 0;
let databaseRowCount = 0;
let extensionCount = 0;
let practicalCount = 0;

for (const row of csvRows) {
  if (!isPracticalWord(row, columns)) {
    continue;
  }

  practicalCount += 1;
  const databaseRow = createDatabaseRow(row, columns);

  if (seenWords.has(databaseRow.word)) {
    continue;
  }

  seenWords.add(databaseRow.word);
  if (bundledWords.has(databaseRow.word)) {
    coreEnrichmentCount += 1;
  } else {
    extensionCount += 1;
  }
  batch.push(databaseRow);

  if (batch.length < batchSize) {
    continue;
  }

  if (supabase) {
    await upsertBatch(supabase, batch);
  }

  databaseRowCount += batch.length;
  batch.length = 0;

  if (databaseRowCount % 5_000 === 0) {
    console.log(`Prepared ${databaseRowCount.toLocaleString()} dictionary rows.`);
  }
}

if (batch.length > 0) {
  if (supabase) {
    await upsertBatch(supabase, batch);
  }

  databaseRowCount += batch.length;
}

console.log(
  [
    isDryRun ? "ECDICT dry run complete." : "ECDICT import complete.",
    `Practical source rows: ${practicalCount.toLocaleString()}.`,
    `Core enrichments: ${coreEnrichmentCount.toLocaleString()}.`,
    `New extension words: ${extensionCount.toLocaleString()}.`,
    `Database rows: ${databaseRowCount.toLocaleString()}.`,
  ].join(" "),
);
