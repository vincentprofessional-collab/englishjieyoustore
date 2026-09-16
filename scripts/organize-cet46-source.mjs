import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const positionalArgs = process.argv.slice(2).filter((argument) => argument !== "--apply");
const DOWNLOAD_ROOT = positionalArgs[0] || "/Users/shidianjin/Downloads/大学生英语四六级";
const FOUR_ROOT = positionalArgs[1] || "/Volumes/My HDD3/备课/四级";
const SIX_ROOT = positionalArgs[2] || "/Volumes/My HDD3/备课/六级";
const COMMON_ROOT = path.join(path.dirname(FOUR_ROOT), "四六级共用");
const APPLY = process.argv.includes("--apply");
const REPORT_PATH = path.resolve("data/cet46/source-organization-report.json");
const STAMP = new Date().toISOString().replaceAll(":", "-");
const DOWNLOAD_TRASH = path.join(path.dirname(path.dirname(DOWNLOAD_ROOT)), `.Trash`, `CET46-imported-${STAMP}`);
const HDD_TRASH = path.join(path.dirname(FOUR_ROOT), ".Trashes", String(process.getuid?.() ?? 501), `CET46-duplicates-${STAMP}`);
const STAGING = {
  four: `${FOUR_ROOT}_整理中`,
  six: `${SIX_ROOT}_整理中`,
  common: `${COMMON_ROOT}_整理中`,
};

const JUNK_NAMES = new Set([".DS_Store", "Thumbs.db"]);
const TOP_LEVELS = new Set(["知识点", "题型", "试卷"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolutePath));
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

async function exists(directory) {
  try {
    return (await stat(directory)).isDirectory();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function isJunk(filePath) {
  const name = path.basename(filePath);
  return name.startsWith("._") || name.startsWith("~$") || JUNK_NAMES.has(name);
}

function examForDownload(relativePath) {
  const top = relativePath.split(path.sep)[0];
  if (top === "四级真题" || top === "英语四级资料") return "four";
  if (top === "六级真题" || top === "英语六级资料") return "six";
  if (top !== "四六级作文模板+单词") return null;
  const name = relativePath.toLowerCase();
  const hasFour = name.includes("四级");
  const hasSix = name.includes("六级");
  if (hasFour && !hasSix) return "four";
  if (hasSix && !hasFour) return "six";
  return "common";
}

function sectionFor(relativePath, exam) {
  const normalized = relativePath.replaceAll(path.sep, "/");
  const fileName = path.basename(relativePath, path.extname(relativePath));
  if (/真题|真卷|历年|CET[46]/i.test(normalized) && !/专项|技巧|词汇|模板|范文|预测/.test(normalized)) {
    return ["试卷", "真题"];
  }
  if (/模拟|押题|密押|样卷|通关模拟/.test(normalized)) return ["试卷", "模拟题"];
  if (/专项|练习|训练/.test(normalized)) {
    if (/翻译/.test(normalized)) return ["题型", "翻译"];
    if (/听力/.test(normalized)) return ["题型", "听力"];
    if (/阅读|长篇阅读|仔细阅读|难句/.test(normalized)) return ["题型", "阅读"];
    if (/选词|完形/.test(normalized)) return ["题型", "选词填空"];
    return ["题型", "综合专项"];
  }
  if (/词汇|单词|高频词|核心词|词组/.test(normalized)) return ["知识点", "词汇"];
  if (/听力/.test(normalized)) return ["知识点", "听力"];
  if (/阅读|长篇阅读|仔细阅读|难句/.test(normalized)) return ["知识点", "阅读"];
  if (/写作|作文|句型|范文|模板/.test(normalized)) return ["知识点", "写作"];
  if (/翻译/.test(normalized)) return ["题型", "翻译"];
  if (exam === "common") return ["知识点", "共用资料"];
  return ["题型", "待复核", fileName];
}

function classifyExisting(filePath, root, exam) {
  const relativePath = path.relative(root, filePath);
  const first = relativePath.split(path.sep)[0];
  if (exam === "four" && TOP_LEVELS.has(first)) return { exam, relativePath };
  if (exam === "six" && TOP_LEVELS.has(first)) return { exam, relativePath };
  return { exam, relativePath: path.join(...sectionFor(relativePath, exam), path.basename(relativePath)) };
}

function classifyDownload(filePath) {
  const relativePath = path.relative(DOWNLOAD_ROOT, filePath);
  const exam = examForDownload(relativePath);
  if (!exam) return null;
  return { exam, relativePath: path.join(...sectionFor(relativePath, exam), path.basename(relativePath)) };
}

function chooseKeeper(records) {
  return [...records].sort((left, right) => {
    const leftExisting = left.origin === "existing" ? 0 : 1;
    const rightExisting = right.origin === "existing" ? 0 : 1;
    return leftExisting - rightExisting || left.absolutePath.length - right.absolutePath.length || left.absolutePath.localeCompare(right.absolutePath, "zh-CN");
  })[0];
}

function uniqueDestination(relativePath, reserved) {
  const parsed = path.parse(relativePath);
  let candidate = relativePath;
  let index = 2;
  while (reserved.has(candidate)) {
    candidate = path.join(parsed.dir, `${parsed.name}__${index}${parsed.ext}`);
    index += 1;
  }
  reserved.add(candidate);
  return candidate;
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function addRecords(root, origin, exam, records) {
  if (!(await exists(root))) return;
  for (const filePath of await walk(root)) {
    if (isJunk(filePath)) continue;
    const fileStat = await stat(filePath);
    records.push({ absolutePath: filePath, origin, exam, relativePath: path.relative(root, filePath), bytes: fileStat.size, sha256: await sha256(filePath) });
  }
}

const records = [];
const junkFiles = [];
for (const [root, origin] of [[FOUR_ROOT, "existing-four"], [SIX_ROOT, "existing-six"], [DOWNLOAD_ROOT, "download"]]) {
  if (!(await exists(root))) continue;
  for (const filePath of await walk(root)) if (isJunk(filePath)) junkFiles.push({ absolutePath: filePath, origin, relativePath: path.relative(root, filePath) });
}
await addRecords(FOUR_ROOT, "existing", "four", records);
await addRecords(SIX_ROOT, "existing", "six", records);
if (await exists(DOWNLOAD_ROOT)) {
  for (const filePath of await walk(DOWNLOAD_ROOT)) {
    if (isJunk(filePath)) continue;
    const classified = classifyDownload(filePath);
    if (!classified) continue;
    const fileStat = await stat(filePath);
    records.push({ absolutePath: filePath, origin: "download", ...classified, bytes: fileStat.size, sha256: await sha256(filePath) });
  }
}

const byHash = new Map();
for (const record of records) {
  const group = byHash.get(record.sha256) || [];
  group.push(record);
  byHash.set(record.sha256, group);
}
const duplicateGroups = [...byHash.entries()].filter(([, group]) => group.length > 1).map(([sha256Value, group]) => {
  const keep = chooseKeeper(group);
  return { sha256: sha256Value, keep, remove: group.filter((record) => record !== keep) };
});
const duplicateRecords = new Set(duplicateGroups.flatMap((group) => group.remove));
const keepers = records.filter((record) => !duplicateRecords.has(record));
const reserved = { four: new Set(), six: new Set(), common: new Set() };
for (const record of keepers) {
  const existingRootPath = record.relativePath.split(path.sep)[0];
  const destination = record.origin === "existing" && TOP_LEVELS.has(existingRootPath)
    ? record.relativePath
    : path.join(...sectionFor(record.relativePath, record.exam), path.basename(record.relativePath));
  record.destination = uniqueDestination(destination, reserved[record.exam]);
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? "applied" : "dry-run",
  roots: { downloads: DOWNLOAD_ROOT, four: FOUR_ROOT, six: SIX_ROOT, common: COMMON_ROOT },
  totals: {
    discovered: records.length,
    kept: keepers.length,
    exactDuplicates: duplicateRecords.size,
    junkExcluded: junkFiles.length,
    bytes: records.reduce((sum, record) => sum + record.bytes, 0),
  },
  keptByExam: Object.fromEntries(["four", "six", "common"].map((exam) => [exam, keepers.filter((record) => record.exam === exam).length])),
  duplicateGroups: duplicateGroups.map((group) => ({ sha256: group.sha256, keep: group.keep.absolutePath, remove: group.remove.map((record) => record.absolutePath) })),
  files: keepers.map((record) => ({ origin: record.origin, exam: record.exam, source: record.absolutePath, destination: record.destination, bytes: record.bytes, sha256: record.sha256 })),
};

async function moveToTrash(filePath, trashRoot, relativePath) {
  const destination = path.join(trashRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    await rename(filePath, destination);
  } catch (error) {
    if (error?.code !== "EXDEV") throw error;
    await copyFile(filePath, destination);
    const sourceHash = await sha256(filePath);
    const destinationHash = await sha256(destination);
    if (sourceHash !== destinationHash) throw new Error(`trash verification failed for ${filePath}`);
    await rm(filePath);
  }
}

async function stageRecord(record) {
  const root = STAGING[record.exam];
  const destination = path.join(root, record.destination);
  await mkdir(path.dirname(destination), { recursive: true });
  if (record.origin === "existing" && path.dirname(record.absolutePath) !== path.dirname(destination)) {
    await rename(record.absolutePath, destination);
  } else {
    await copyFile(record.absolutePath, destination);
    const destinationHash = await sha256(destination);
    if (destinationHash !== record.sha256) throw new Error(`copy verification failed for ${record.absolutePath}`);
    await moveToTrash(record.absolutePath, DOWNLOAD_TRASH, path.relative(DOWNLOAD_ROOT, record.absolutePath));
  }
}

if (APPLY) {
  for (const root of Object.values(STAGING)) await mkdir(root, { recursive: true });
  for (const exam of ["four", "six", "common"]) for (const section of ["知识点", "题型", "试卷"]) await mkdir(path.join(STAGING[exam], section), { recursive: true });
  for (const group of duplicateGroups) {
    for (const record of group.remove) {
      const trashRoot = record.origin === "download" ? DOWNLOAD_TRASH : HDD_TRASH;
      const relativePath = record.origin === "download" ? path.relative(DOWNLOAD_ROOT, record.absolutePath) : path.join(record.exam, record.relativePath);
      await moveToTrash(record.absolutePath, trashRoot, relativePath);
    }
  }
  for (const junk of junkFiles) {
    const trashRoot = junk.origin === "download" ? DOWNLOAD_TRASH : HDD_TRASH;
    const relativePath = junk.origin === "download" ? path.relative(DOWNLOAD_ROOT, junk.absolutePath) : junk.origin === "existing-four" ? path.join("four", junk.relativePath) : path.join("six", junk.relativePath);
    await moveToTrash(junk.absolutePath, trashRoot, path.join("junk", relativePath));
  }
  for (const record of keepers) await stageRecord(record);
  for (const [exam, root] of Object.entries(STAGING)) {
    const target = exam === "four" ? FOUR_ROOT : exam === "six" ? SIX_ROOT : COMMON_ROOT;
    await rm(target, { recursive: true, force: true });
    await rename(root, target);
  }
  for (const [exam, target] of [["four", FOUR_ROOT], ["six", SIX_ROOT], ["common", COMMON_ROOT]]) {
    if (!(await exists(target))) continue;
    for (const filePath of (await walk(target)).filter(isJunk)) {
      await moveToTrash(filePath, HDD_TRASH, path.join("post-stage-junk", exam, path.relative(target, filePath)));
    }
  }
  report.trashRoots = { downloads: DOWNLOAD_TRASH, hdd: HDD_TRASH };
}

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ report: REPORT_PATH, ...report.totals, keptByExam: report.keptByExam, trashRoots: report.trashRoots || null }, null, 2));
