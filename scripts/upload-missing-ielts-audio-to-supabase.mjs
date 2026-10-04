import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const execute = argv.includes("--execute");
const cutOnly = argv.includes("--cut-only");
const argValue = (name, fallback) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
};
const sourceRoot = resolve(argValue("--source", "/Volumes/My HDD3/备课/IELTS/剑桥雅思"));
const envFile = resolve(argValue("--env-file", join(projectRoot, ".env.cos-migration.local")));
const checkpointPath = resolve(argValue("--checkpoint", "/private/tmp/ielts-audio-upload-progress.jsonl"));
const onlyBookValue = argValue("--book", "");
const onlyBook = onlyBookValue ? Number(onlyBookValue) : null;
const concurrency = Number(argValue("--concurrency", "2"));
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 5) {
  throw new Error("--concurrency must be an integer from 1 to 5.");
}
if (onlyBook !== null && (!Number.isInteger(onlyBook) || onlyBook < 4 || onlyBook > 21)) {
  throw new Error("--book must be an integer from 4 to 21.");
}

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || !/^(SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY)$/.test(match[1]) || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function walkMp3(directory, found = []) {
  if (!existsSync(directory)) return found;
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (item.name === ".DS_Store" || item.name.startsWith("._")) continue;
    const path = join(directory, item.name);
    if (item.isSymbolicLink()) throw new Error(`Refusing to follow symbolic link: ${path}`);
    if (item.isDirectory()) walkMp3(path, found);
    else if (item.isFile() && item.name.toLowerCase().endsWith(".mp3")) found.push(path);
  }
  return found;
}

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const sourceFiles = walkMp3(onlyBook ? join(sourceRoot, `剑桥雅思${onlyBook}`) : sourceRoot);
const fullSourceByKey = new Map();
for (let book = onlyBook ?? 4; book <= (onlyBook ?? 21); book += 1) {
  const bookRoot = join(sourceRoot, `剑桥雅思${book}`);
  for (const path of sourceFiles.filter((file) => file.startsWith(`${bookRoot}/`))) {
    const base = normalize(basename(path, ".mp3"));
    if (base.includes("xiaoyinpin")) continue;
    for (let test = 1; test <= 4; test += 1) {
      for (let section = 1; section <= 4; section += 1) {
        const key = `${book}/${test}/${section}`;
        const names = new Set([
          `${book}test${test}section${section}`,
          `${book}test${test}${section}`,
          `${book}tests${test}${section}`,
          `cambridge${book}test${test}section${section}`,
        ]);
        if (names.has(base)) {
          const matches = fullSourceByKey.get(key) ?? [];
          matches.push(path);
          fullSourceByKey.set(key, matches);
        }
      }
    }
  }
}

loadEnv(join(projectRoot, ".env.local"));
loadEnv(envFile);
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error(`Supabase URL or service-role key missing. Configure them in ${envFile}; values are never printed.`);
}
const require = createRequire(join(projectRoot, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchAll(makeQuery) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await makeQuery().range(offset, offset + 999);
    if (error) throw new Error(`Supabase database read failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

const sections = await fetchAll(() => supabase.from("test_sections")
  .select("id,full_audio_path").not("full_audio_path", "is", null).order("id", { ascending: true }));
const sentences = await fetchAll(() => supabase.from("transcript_sentences")
  .select("id,section_id,sentence_no,audio_path,start_ms,end_ms").not("audio_path", "is", null).order("id", { ascending: true }));

function parseListeningPath(path) {
  const match = path?.match(/^listening\/ci(\d+)\/t(\d+)\/s(\d+)\//i);
  return match ? { book: Number(match[1]), test: Number(match[2]), section: Number(match[3]) } : null;
}

const sectionSources = new Map();
const tasksByPath = new Map();
const unresolved = [];
function setTask(task) {
  const previous = tasksByPath.get(task.storagePath);
  if (previous && (previous.sourcePath !== task.sourcePath || previous.clip?.startMs !== task.clip?.startMs)) {
    unresolved.push(`${task.storagePath}: database rows resolve to conflicting local sources`);
    return;
  }
  tasksByPath.set(task.storagePath, task);
}

for (const section of sections) {
  const parts = parseListeningPath(section.full_audio_path);
  if (!parts || (onlyBook !== null && parts.book !== onlyBook) || !/^listening\/ci\d+\/t\d+\/s\d+\/(?:versions\/[^/]+\/)?full\.mp3$/i.test(section.full_audio_path)) continue;
  const matches = fullSourceByKey.get(`${parts.book}/${parts.test}/${parts.section}`) ?? [];
  const sourcePath = matches.length === 1 ? matches[0] : null;
  sectionSources.set(section.id, { ...parts, sourcePath });
  if (matches.length !== 1) {
    unresolved.push(`${section.full_audio_path}: ${matches.length ? "ambiguous" : "local full audio not found"} source for Cambridge ${parts.book}, Test ${parts.test}, Section ${parts.section}`);
    continue;
  }
  setTask({ storagePath: section.full_audio_path, sourcePath, kind: "full" });
}

function localSentenceClip(sourcePath, parts, sentenceNo, targetPath) {
  const padded = String(sentenceNo ?? "").match(/\d+/)?.[0]?.padStart(3, "0");
  if (!padded) return null;
  if (sourcePath) {
    const directory = `${basename(sourcePath, ".mp3")}小音频`;
    const candidate = join(dirname(sourcePath), directory, `${padded}.mp3`);
    if (existsSync(candidate)) return candidate;
  }
  const targetNo = basename(targetPath).match(/(\d+)\.mp3$/i)?.[1];
  if (targetNo) {
    const bookRoot = join(sourceRoot, `剑桥雅思${parts.book}`);
    const suffix = `${targetNo.padStart(3, "0")}.mp3`;
    const expectedDir = normalize(`${parts.book}test${parts.test}section${parts.section}小音频`);
    for (const file of sourceFiles) {
      if (!file.startsWith(`${bookRoot}/`) || basename(file) !== suffix) continue;
      if (normalize(basename(dirname(file))) === expectedDir) return file;
    }
  }
  return null;
}

for (const sentence of sentences) {
  const parts = parseListeningPath(sentence.audio_path);
  if (!parts || (onlyBook !== null && parts.book !== onlyBook) || !/^listening\/ci\d+\/t\d+\/s\d+\/.+\.mp3$/i.test(sentence.audio_path)) continue;
  const parent = sectionSources.get(sentence.section_id);
  const context = parent ?? { ...parts, sourcePath: null };
  const sourcePath = localSentenceClip(context.sourcePath, context, sentence.sentence_no, sentence.audio_path);
  if (sourcePath) {
    setTask({ storagePath: sentence.audio_path, sourcePath, kind: "sentence" });
    continue;
  }
  const startMs = Number(sentence.start_ms);
  const endMs = Number(sentence.end_ms);
  if (context.sourcePath && Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs && endMs - startMs <= 120000) {
    setTask({ storagePath: sentence.audio_path, kind: "cut", clip: { sourcePath: context.sourcePath, startMs, endMs } });
  } else {
    unresolved.push(`${sentence.audio_path}: no local short clip and no usable timing/full-audio source`);
  }
}

const tasks = [...tasksByPath.values()];
const kindCounts = tasks.reduce((counts, task) => ({ ...counts, [task.kind]: (counts[task.kind] ?? 0) + 1 }), {});
const uniqueSourceFiles = new Set(tasks.map((task) => task.sourcePath ?? task.clip?.sourcePath).filter(Boolean));
const sourceBytes = [...uniqueSourceFiles].reduce((sum, path) => sum + statSync(path).size, 0);
const cutSeconds = tasks.filter((task) => task.clip).reduce((sum, task) => sum + (task.clip.endMs - task.clip.startMs) / 1000, 0);
const estimatedCutMiB = (bitrate) => (cutSeconds * bitrate / 8 / 1024 ** 2).toFixed(0);
console.log(`Local Cambridge MP3 inventory: ${sourceFiles.length.toLocaleString()} files.`);
console.log(`Database-referenced IELTS audio mapped: ${tasks.length.toLocaleString()} objects (${Object.entries(kindCounts).map(([kind, count]) => `${kind} ${count}`).join(", ")}).`);
console.log(`Unique local sources: ${(sourceBytes / 1024 ** 2).toFixed(0)} MiB; clips to generate: ${(cutSeconds / 3600).toFixed(1)} hours (roughly ${estimatedCutMiB(96000)}–${estimatedCutMiB(192000)} MiB at 96–192 kbps).`);
console.log(`Unresolved mappings: ${unresolved.length.toLocaleString()}.`);
if (unresolved.length) {
  for (const item of unresolved.slice(0, 40)) console.log(`  NEEDS SOURCE: ${item}`);
  if (unresolved.length > 40) console.log(`  ...and ${unresolved.length - 40} more unresolved mappings.`);
}
console.log(`Scope: ${onlyBook ? `Cambridge IELTS ${onlyBook}` : "Cambridge IELTS 4-21"}. Mode: ${cutOnly ? "LOCAL CUT ONLY" : execute ? "UPLOAD ENABLED" : "PREVIEW ONLY (no uploads)"}.`);
if (!execute && !cutOnly) {
  console.log("Review this mapping first. Run with --execute to upload; existing objects are checked and never overwritten.");
  process.exit(0);
}

if (tasks.length === 0) throw new Error("No uploadable audio paths were mapped; nothing was uploaded.");
if (tasks.some((task) => task.kind === "cut") && spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status !== 0) {
  throw new Error("ffmpeg is required to create missing sentence clips from the local full audio files.");
}

if (cutOnly) {
  const cutTasks = [...tasksByPath.values()].filter((task) => task.kind === "cut");
  const tempDirectory = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(tmpdir(), "ielts-audio-cut-")));
  let generated = 0;
  let skipped = 0;
  let next = 0;
  let failure;
  const worker = async () => {
    while (!failure) {
      const task = cutTasks[next++];
      if (!task) return;
      try {
        const sentenceNo = basename(task.storagePath).match(/(\d+)\.mp3$/i)?.[1];
        if (!sentenceNo) throw new Error(`Cannot determine sentence number: ${task.storagePath}`);
        const outputDirectory = join(dirname(task.clip.sourcePath), `${basename(task.clip.sourcePath, ".mp3")}小音频`);
        const outputPath = join(outputDirectory, `${sentenceNo.padStart(3, "0")}.mp3`);
        if (existsSync(outputPath)) {
          skipped += 1;
          continue;
        }
        const bytes = await makeBytes(task, tempDirectory);
        mkdirSync(outputDirectory, { recursive: true });
        writeFileSync(outputPath, bytes, { flag: "wx" });
        generated += 1;
        if (generated % 50 === 0) console.log(`Cut and saved ${generated.toLocaleString()} small audio files.`);
      } catch (error) {
        failure ??= error;
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, cutTasks.length) }, () => worker()));
    if (failure) throw failure;
    console.log(`Finished: ${generated.toLocaleString()} small audio files saved; ${skipped.toLocaleString()} already existed.`);
    console.log(`Output folders: ${sourceRoot}/剑桥雅思${onlyBook ?? "*"}/*小音频/`);
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
  process.exit(0);
}

mkdirSync(dirname(checkpointPath), { recursive: true });
const completed = new Map();
if (existsSync(checkpointPath)) {
  for (const line of readFileSync(checkpointPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    const row = JSON.parse(line);
    if (row.bucket !== "audio" || typeof row.path !== "string" || !/^[a-f0-9]{64}$/.test(row.sha256 ?? "")) {
      throw new Error("Invalid upload checkpoint; refusing to resume.");
    }
    completed.set(row.path, row);
  }
}

const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");
const hash = (data) => createHash("sha256").update(data).digest("hex");
function infoIsMissing(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.cause?.status);
  return status === 404 || /not found|objectnotfound|no such key|missing object/i.test(`${error?.code ?? ""} ${error?.message ?? ""}`);
}
async function objectInfo(path) {
  const { data, error } = await supabase.storage.from("audio").info(encodePath(path));
  if (error) throw error;
  return data;
}
const wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
function isRetryable(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.cause?.status);
  return [408, 425, 429, 500, 502, 503, 504].includes(status) || status >= 500
    || ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "TimeoutError", "AbortError"].includes(error?.code ?? error?.name)
    || /fetch failed|network|timeout|gateway/i.test(error?.message ?? "");
}
async function objectInfoWithRetry(path) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await objectInfo(path);
    } catch (error) {
      if (infoIsMissing(error) || !isRetryable(error) || attempt >= 6) throw error;
      const delay = Math.min(15000, 1500 * 2 ** (attempt - 1));
      console.log(`Temporary Supabase check failure (${error.status ?? error.statusCode ?? error.message}); retrying ${path} in ${Math.ceil(delay / 1000)}s (${attempt}/5).`);
      await wait(delay);
    }
  }
}
async function findMatchingObject(path, expectedBytes) {
  let info;
  try {
    info = await objectInfoWithRetry(path);
  } catch (error) {
    if (infoIsMissing(error)) return false;
    throw error;
  }
  if (Number(info.size) !== expectedBytes) {
    throw new Error(`Existing Supabase object has a different size; left untouched: ${path}`);
  }
  return true;
}
async function uploadWithoutOverwrite(path, bytes) {
  for (let attempt = 1; ; attempt += 1) {
    const { error } = await supabase.storage.from("audio").upload(encodePath(path), bytes, {
      contentType: "audio/mpeg", cacheControl: "31536000", upsert: false,
    });
    if (!error) return "uploaded";

    if (isRetryable(error)) {
      const delay = Math.min(15000, 1500 * 2 ** (attempt - 1));
      console.log(`Temporary Supabase upload failure (${error.status ?? error.statusCode ?? error.message}); checking and retrying ${path} in ${Math.ceil(delay / 1000)}s (${attempt}/5).`);
      await wait(delay);
      if (await findMatchingObject(path, bytes.length)) return "confirmed-after-timeout";
      if (attempt >= 6) throw error;
      continue;
    }

    // A timeout or duplicate response can arrive after Storage has committed the upload.
    if (await findMatchingObject(path, bytes.length)) return "already-present";
    throw error;
  }
}
async function makeBytes(task, tempDirectory) {
  if (task.sourcePath) return readFileSync(task.sourcePath);
  const outputPath = join(tempDirectory, `${createHash("sha1").update(task.storagePath).digest("hex")}.mp3`);
  const startSeconds = task.clip.startMs / 1000;
  const durationSeconds = (task.clip.endMs - task.clip.startMs) / 1000;
  const encode = (sampleFormat) => spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-ss", String(startSeconds), "-i", task.clip.sourcePath,
    "-t", String(durationSeconds), "-vn", "-codec:a", "libmp3lame",
    ...(sampleFormat ? ["-sample_fmt", sampleFormat] : []), "-q:a", "4", "-y", outputPath,
  ], { encoding: "utf8" });
  let result = encode(null);
  if (result.status !== 0 || !existsSync(outputPath)) {
    // FFmpeg's FLTP encoder path can reject frame padding; retry only failed clips as S16P.
    result = encode("s16p");
  }
  if (result.status !== 0 || !existsSync(outputPath)) throw new Error(`ffmpeg failed for ${task.storagePath}: ${(result.stderr ?? "").slice(0, 240)}`);
  return readFileSync(outputPath);
}

let uploaded = 0;
let existing = 0;
let resumed = 0;
let recovered = 0;
let next = 0;
let failure;
const tempDirectory = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(tmpdir(), "ielts-audio-upload-")));
const worker = async () => {
  while (!failure) {
    const task = tasks[next++];
    if (!task) return;
    try {
      const checkpoint = completed.get(task.storagePath);
      if (checkpoint) {
        resumed += 1;
        continue;
      }
      const bytes = await makeBytes(task, tempDirectory);
      const checksum = hash(bytes);
      const uploadResult = await uploadWithoutOverwrite(task.storagePath, bytes);
      const verified = await objectInfoWithRetry(task.storagePath);
      if (Number(verified.size) !== bytes.length) throw new Error(`Post-upload size check failed: ${task.storagePath}`);
      const record = { bucket: "audio", path: task.storagePath, bytes: bytes.length, sha256: checksum, verifiedAt: new Date().toISOString(), ...(uploadResult === "already-present" ? { alreadyPresent: true } : {}) };
      writeFileSync(checkpointPath, `${JSON.stringify(record)}\n`, { flag: "a" });
      completed.set(task.storagePath, record);
      if (uploadResult === "already-present") existing += 1;
      else if (uploadResult === "confirmed-after-timeout") recovered += 1;
      else uploaded += 1;
      if (uploaded % 250 === 0) console.log(`Uploaded and verified ${uploaded.toLocaleString()} audio objects.`);
    } catch (error) {
      failure ??= error;
    }
  }
};

try {
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  if (failure) throw failure;
  console.log(`Finished: ${uploaded.toLocaleString()} uploaded, ${recovered.toLocaleString()} confirmed after timeout, ${existing.toLocaleString()} already present, ${resumed.toLocaleString()} resumed from verified checkpoint.`);
  console.log(`Checkpoint: ${checkpointPath}`);
  if (unresolved.length) console.log("Some paths remain unresolved; do not change website links for those until the missing source audio is supplied.");
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
