import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  mkdir,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const SOURCE_ROOT = process.argv[2] || "/Volumes/My HDD3/备课/四级";
const APPLY = process.argv.includes("--apply");
const REPORT_PATH = path.resolve("data/cet4/source-organization-report.json");
const STAGING_ROOT = `${SOURCE_ROOT}_整理中`;
const MISFILED_ROOT = path.join(path.dirname(SOURCE_ROOT), "六级", "来自四级误放文件");
const VOLUME_ROOT = path.join(path.sep, ...SOURCE_ROOT.split(path.sep).filter(Boolean).slice(0, 2));
const TRASH_ROOT = path.join(
  VOLUME_ROOT,
  ".Trashes",
  String(process.getuid?.() ?? 501),
  `CET4-duplicates-${new Date().toISOString().replaceAll(":", "-")}`,
);

const JUNK_NAMES = new Set([".DS_Store", "Thumbs.db"]);
const KNOWLEDGE_PATTERN = /方法|法宝|指导|句型|模板|范文|预测|建议|技巧|备考|文本$/i;

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

function relativeSource(filePath) {
  return path.relative(SOURCE_ROOT, filePath);
}

function isJunk(filePath) {
  const name = path.basename(filePath);
  return name.startsWith("._") || name.startsWith("~$") || JUNK_NAMES.has(name);
}

function isClearlyNotCet4(filePath) {
  const name = path.basename(filePath);
  return /六级/i.test(name) && !/四级/i.test(name);
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function classify(relativePath) {
  const parts = relativePath.split(path.sep);
  const top = parts[0];
  const rest = parts.slice(1);
  const name = path.basename(relativePath, path.extname(relativePath));

  if (top === "四级真题（含音频）") return path.join("试卷", "真题", ...rest);
  if (top === "四级模拟题") return path.join("试卷", "模拟题", ...rest);

  if (top === "写作") {
    const section = KNOWLEDGE_PATTERN.test(name) ? "知识点" : "题型";
    return path.join(section, "写作", ...rest);
  }
  if (top === "四级阅读") {
    const section = KNOWLEDGE_PATTERN.test(name) ? "知识点" : "题型";
    return path.join(section, "阅读", ...rest);
  }
  if (top === "四级听力训练") {
    const section = KNOWLEDGE_PATTERN.test(name) ? "知识点" : "题型";
    return path.join(section, "听力", ...rest);
  }
  if (top === "选词填空") return path.join("题型", "选词填空", ...rest);
  if (top === "翻译") return path.join("题型", "翻译", ...rest);
  if (top === "四级英语专项练习") return path.join("题型", "综合专项", ...rest);

  return path.join("题型", "待复核", ...parts);
}

function chooseKeeper(paths) {
  return [...paths].sort((left, right) => {
    const leftScore = (left.includes("四级真题（含音频）") ? 0 : 10) + left.length;
    const rightScore = (right.includes("四级真题（含音频）") ? 0 : 10) + right.length;
    return leftScore - rightScore || left.localeCompare(right, "zh-CN");
  })[0];
}

async function uniqueDestination(relativeDestination, reserved) {
  const parsed = path.parse(relativeDestination);
  let candidate = relativeDestination;
  let sequence = 2;
  while (reserved.has(candidate)) {
    candidate = path.join(parsed.dir, `${parsed.name}__${sequence}${parsed.ext}`);
    sequence += 1;
  }
  reserved.add(candidate);
  return candidate;
}

async function movePreservingPath(source, root, relativePath) {
  const destination = path.join(root, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    await rename(source, destination);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  return destination;
}

const allFiles = (await walk(SOURCE_ROOT)).sort((a, b) => a.localeCompare(b, "zh-CN"));
const junk = allFiles.filter(isJunk);
const candidates = allFiles.filter((filePath) => !isJunk(filePath));
const records = [];

for (const [index, filePath] of candidates.entries()) {
  const fileStat = await stat(filePath);
  records.push({
    absolutePath: filePath,
    relativePath: relativeSource(filePath),
    bytes: fileStat.size,
    sha256: await sha256(filePath),
  });
  if ((index + 1) % 40 === 0) process.stderr.write(`hashed ${index + 1}/${candidates.length}\n`);
}

const byHash = new Map();
for (const record of records) {
  const group = byHash.get(record.sha256) || [];
  group.push(record.absolutePath);
  byHash.set(record.sha256, group);
}

const duplicateGroups = [...byHash.entries()]
  .filter(([, paths]) => paths.length > 1)
  .map(([hash, paths]) => ({ hash, keep: chooseKeeper(paths), remove: paths.filter((item) => item !== chooseKeeper(paths)) }));
const duplicatePaths = new Set(duplicateGroups.flatMap((group) => group.remove));
const misfiled = records.filter((record) => !duplicatePaths.has(record.absolutePath) && isClearlyNotCet4(record.absolutePath));
const misfiledPaths = new Set(misfiled.map((record) => record.absolutePath));
const keepers = records.filter((record) => !duplicatePaths.has(record.absolutePath) && !misfiledPaths.has(record.absolutePath));
let stagingExists = false;
try {
  stagingExists = (await stat(STAGING_ROOT)).isDirectory();
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const stagedFiles = stagingExists ? (await walk(STAGING_ROOT)).filter((filePath) => !isJunk(filePath)) : [];
const reservedDestinations = new Set(stagedFiles.map((filePath) => path.relative(STAGING_ROOT, filePath)));
for (const record of keepers) {
  record.destination = await uniqueDestination(classify(record.relativePath), reservedDestinations);
}

const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot: SOURCE_ROOT,
  mode: APPLY ? "applied" : "dry-run",
  totals: {
    discovered: allFiles.length,
    uniqueKept: keepers.length,
    exactDuplicates: duplicatePaths.size,
    junk: junk.length,
    relocatedOutsideCet4: misfiled.length,
    bytes: records.reduce((sum, record) => sum + record.bytes, 0),
  },
  destinationCounts: Object.fromEntries(["知识点", "题型", "试卷"].map((section) => [
    section,
    keepers.filter((record) => record.destination.startsWith(`${section}${path.sep}`)).length,
  ])),
  duplicateGroups: duplicateGroups.map((group) => ({
    sha256: group.hash,
    keep: relativeSource(group.keep),
    remove: group.remove.map(relativeSource),
  })),
  junk: junk.map(relativeSource),
  relocatedOutsideCet4: misfiled.map((record) => ({
    source: record.relativePath,
    destination: path.join("六级", "来自四级误放文件", path.basename(record.relativePath)),
  })),
  files: keepers.map((record) => ({
    source: record.relativePath,
    destination: record.destination,
    bytes: record.bytes,
    sha256: record.sha256,
  })),
};

if (APPLY) {
  await mkdir(STAGING_ROOT, { recursive: true });
  for (const section of ["知识点", "题型", "试卷"]) await mkdir(path.join(STAGING_ROOT, section), { recursive: true });

  for (const filePath of [...duplicatePaths, ...junk]) {
    await movePreservingPath(filePath, TRASH_ROOT, relativeSource(filePath));
  }
  for (const record of misfiled) {
    await movePreservingPath(record.absolutePath, MISFILED_ROOT, path.basename(record.relativePath));
  }
  for (const record of keepers) {
    await movePreservingPath(record.absolutePath, STAGING_ROOT, record.destination);
  }

  for (const generatedJunk of (await walk(STAGING_ROOT)).filter(isJunk)) {
    await movePreservingPath(
      generatedJunk,
      TRASH_ROOT,
      path.join("整理过程元数据", path.relative(STAGING_ROOT, generatedJunk)),
    );
  }
  for (const generatedJunk of (await walk(SOURCE_ROOT)).filter(isJunk)) {
    await movePreservingPath(
      generatedJunk,
      TRASH_ROOT,
      path.join("整理过程元数据", "原目录", relativeSource(generatedJunk)),
    );
  }
  const leftovers = await walk(SOURCE_ROOT);
  if (leftovers.length) throw new Error(`source still contains ${leftovers.length} files; refusing final rename`);
  await rm(SOURCE_ROOT, { recursive: true });
  await rename(STAGING_ROOT, SOURCE_ROOT);
  report.trashRoot = TRASH_ROOT;
}

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ report: REPORT_PATH, ...report.totals, destinationCounts: report.destinationCounts, trashRoot: report.trashRoot || null }, null, 2));
