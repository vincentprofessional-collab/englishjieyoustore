import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const execute = args.includes("--execute");
const valueAfter = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const sourceRoot = resolve(valueAfter(
  "--source",
  "/Volumes/My HDD3/网站/英文解忧杂货铺/04_媒体素材/词汇发音/word-audio",
));
const envFile = resolve(valueAfter("--env-file", resolve(projectRoot, ".env.seed.local")));
const checkpointPath = resolve(valueAfter(
  "--checkpoint",
  "/private/tmp/englishjieyoustore-word-audio-upload-progress.jsonl",
));
const concurrency = Number(valueAfter("--concurrency", "4"));

if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) {
  throw new Error("Concurrency must be an integer from 1 to 6.");
}

function readEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function collectMp3Files(root, current = root, files = []) {
  for (const item of readdirSync(current, { withFileTypes: true })) {
    if (item.name === ".DS_Store" || item.name.startsWith("._")) continue;
    const absolutePath = resolve(current, item.name);
    if (item.isSymbolicLink()) throw new Error(`Refusing to follow a symbolic link: ${absolutePath}`);
    if (item.isDirectory()) {
      collectMp3Files(root, absolutePath, files);
      continue;
    }
    if (!item.isFile() || !item.name.toLowerCase().endsWith(".mp3")) {
      throw new Error(`Unexpected source entry; expected MP3 audio only: ${absolutePath}`);
    }
    const relativePath = absolutePath.slice(root.length + 1).replaceAll("\\", "/");
    if (relativePath.includes("/")) {
      throw new Error(`Nested audio path cannot map to the configured word-audio URL: ${relativePath}`);
    }
    files.push({ absolutePath, relativePath });
  }
  return files;
}

const entries = [];
for (const accent of ["uk", "us"]) {
  const accentRoot = resolve(sourceRoot, accent);
  if (!existsSync(accentRoot) || !statSync(accentRoot).isDirectory()) {
    throw new Error(`Missing source directory: ${accentRoot}`);
  }
  for (const file of collectMp3Files(accentRoot)) {
    // Supabase Storage only accepts ASCII object keys here. Keep the accented
    // homophone separate from the existing plain "cafe.mp3" source file.
    const filename = file.relativePath.normalize("NFC").toLowerCase();
    const storageFilename = filename === "café.mp3" ? "cafe-accent.mp3" : filename;
    const storagePath = `word-audio/${accent}/${storageFilename}`;
    entries.push({ ...file, accent, bytes: statSync(file.absolutePath).size, storagePath });
  }
}

const byPath = new Map();
for (const entry of entries) {
  if (byPath.has(entry.storagePath)) {
    throw new Error(`Lowercase destination collision: ${entry.storagePath}`);
  }
  byPath.set(entry.storagePath, entry);
}
if (entries.length === 0) throw new Error(`No MP3 files found in ${sourceRoot}`);

console.log(`Source check passed: ${entries.length.toLocaleString()} MP3 files, ${(entries.reduce((sum, item) => sum + item.bytes, 0) / 1024 ** 2).toFixed(1)} MiB.`);
console.log(`Destination: Supabase Storage bucket audio, under word-audio/uk and word-audio/us.`);
console.log(`Mode: ${execute ? "upload enabled" : "dry run only"}; concurrency ${concurrency}.`);
if (!execute) {
  console.log("No network or file upload was attempted. Add the Supabase service key to the ignored .env.seed.local file before running with --execute.");
  process.exit(0);
}

// Load the site's public URL and the separately stored service key without printing either value.
readEnvFile(resolve(projectRoot, ".env.local"));
readEnvFile(envFile);
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(`Supabase URL or service role key is missing. Store the service key in ${envFile}; secrets are never printed.`);
}

const { createRequire } = await import("node:module");
const require = createRequire(resolve(projectRoot, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
mkdirSync(dirname(checkpointPath), { recursive: true });

const checkpointed = new Map();
if (existsSync(checkpointPath)) {
  for (const line of readFileSync(checkpointPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    const record = JSON.parse(line);
    if (record.bucket !== "audio" || typeof record.path !== "string"
      || !Number.isSafeInteger(record.bytes) || !/^[a-f0-9]{64}$/.test(record.sha256 ?? "")) {
      throw new Error("The resumable upload checkpoint is invalid; refusing to continue.");
    }
    const entry = byPath.get(record.path);
    if (!entry || record.bytes !== entry.bytes) throw new Error(`Checkpoint does not match local audio: ${record.path}`);
    checkpointed.set(record.path, record);
  }
}

const encodeStoragePath = (path) => path.split("/").map(encodeURIComponent).join("/");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function retry(operation, label) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const status = Number(error?.status ?? error?.statusCode);
      const retryable = status === 408 || status === 429 || status >= 500
        || ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "TimeoutError", "AbortError"].includes(error?.code ?? error?.name)
        || /fetch failed|network|timeout/i.test(error?.message ?? "");
      if (!retryable || attempt === 4) {
        const failure = new Error(`${label} failed after ${attempt} attempt(s): ${String(error?.message ?? "unknown error").slice(0, 180)}`);
        failure.cause = error;
        throw failure;
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 1200));
    }
  }
}

async function getInfo(path) {
  const { data, error } = await supabase.storage.from("audio").info(encodeStoragePath(path));
  if (error) throw error;
  return data;
}

function isMissingObject(error) {
  const status = Number(error?.status ?? error?.cause?.status);
  return status === 404 || /not.?found|no.?such.?key|objectnotfound/i.test(String(error?.code ?? error?.cause?.code ?? ""))
    || /not found|does not exist|missing object/i.test(String(error?.message ?? ""));
}

function recordVerified(entry, hash) {
  if (checkpointed.has(entry.storagePath)) return;
  const record = { bucket: "audio", path: entry.storagePath, bytes: entry.bytes, sha256: hash, verifiedAt: new Date().toISOString() };
  appendFileSync(checkpointPath, `${JSON.stringify(record)}\n`);
  checkpointed.set(entry.storagePath, record);
}

let next = 0;
let uploaded = 0;
let reused = 0;
let skipped = 0;
let failure;
const worker = async () => {
  while (!failure) {
    const entry = entries[next++];
    if (!entry) return;
    const bytes = readFileSync(entry.absolutePath);
    if (bytes.length !== entry.bytes) throw new Error(`Source file changed while uploading: ${entry.absolutePath}`);
    const hash = sha256(bytes);
    const checkpointRecord = checkpointed.get(entry.storagePath);
    if (checkpointRecord) {
      if (checkpointRecord.sha256 !== hash) throw new Error(`Local audio changed after it was checkpointed: ${entry.storagePath}`);
      skipped += 1;
      if (skipped % 1000 === 0) console.log(`Revalidated ${skipped.toLocaleString()} checkpointed source files.`);
      continue;
    }

    let info;
    try {
      info = await retry(() => getInfo(entry.storagePath), `Supabase check for ${entry.storagePath}`);
    } catch (error) {
      if (!isMissingObject(error)) throw error;
    }

    if (info) {
      if (Number(info.size) !== bytes.length) throw new Error(`Existing Supabase object has a different size; refusing to overwrite ${entry.storagePath}.`);
      if (info.metadata?.sha256 && info.metadata.sha256 !== hash) throw new Error(`Existing Supabase object has a different SHA-256; refusing to overwrite ${entry.storagePath}.`);
      if (!info.metadata?.sha256) {
        const { data, error } = await retry(() => supabase.storage.from("audio").download(encodeStoragePath(entry.storagePath)), `Supabase download check for ${entry.storagePath}`);
        if (error) throw error;
        if (!data || sha256(Buffer.from(await data.arrayBuffer())) !== hash) {
          throw new Error(`Existing Supabase object differs from the local audio; refusing to overwrite ${entry.storagePath}.`);
        }
      }
      recordVerified(entry, hash);
      reused += 1;
    } else {
      await retry(async () => {
        const { error } = await supabase.storage.from("audio").upload(encodeStoragePath(entry.storagePath), bytes, {
          cacheControl: "31536000",
          contentType: "audio/mpeg",
          metadata: { sha256: hash },
          upsert: false,
        });
        if (error) throw error;
      }, `Supabase upload for ${entry.storagePath}`);
      const after = await retry(() => getInfo(entry.storagePath), `Supabase verify for ${entry.storagePath}`);
      if (Number(after?.size) !== bytes.length || after?.metadata?.sha256 !== hash) {
        throw new Error(`Supabase size/SHA-256 verification failed for ${entry.storagePath}.`);
      }
      recordVerified(entry, hash);
      uploaded += 1;
    }

    const completed = uploaded + reused + skipped;
    if (completed % 250 === 0) console.log(`Checkpoint: ${completed.toLocaleString()}/${entries.length.toLocaleString()}; ${uploaded} uploaded, ${reused} already verified, ${skipped} resumed.`);
  }
};

await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, async () => {
  try {
    await worker();
  } catch (error) {
    failure ??= error;
  }
}));
if (failure) throw failure;
console.log(`Complete: ${uploaded.toLocaleString()} uploaded, ${reused.toLocaleString()} already matched Supabase, ${skipped.toLocaleString()} resumed from verified checkpoints.`);
console.log(`Checkpoint: ${checkpointPath}`);
