import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { toSupabaseSafeStoragePath } from "../src/lib/media/url.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(projectRoot, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const args = process.argv.slice(2);
const execute = args.includes("--execute");
const valueAfter = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const sourceFolderName = "腾讯云待上传-词汇视频-小于20MB";
const sourceRoot = resolve(valueAfter("--source", `/Volumes/My HDD3/${sourceFolderName}`));
const envPath = resolve(valueAfter("--env-file", resolve(projectRoot, "../englishjieyoustore/.env.cos-migration.local")));
const manifestPath = resolve(projectRoot, "outputs/cos-supabase-media-manifest.json");
const journalPath = resolve(projectRoot, "outputs/local-vocabulary-videos-to-supabase-progress.jsonl");
const maxUploadBytes = 20_000_000;
const concurrency = Number(valueAfter("--concurrency", "3"));

if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 5) {
  throw new Error("Concurrency must be an integer from 1 to 5.");
}
if (!existsSync(sourceRoot) || !statSync(sourceRoot).isDirectory()) {
  throw new Error(`Local source folder is unavailable: ${sourceRoot}`);
}

function readEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function collectFiles(root, current = root, files = new Map()) {
  for (const item of readdirSync(current, { withFileTypes: true })) {
    const absolutePath = resolve(current, item.name);
    if (item.isSymbolicLink()) throw new Error(`Source folder contains a symbolic link; refusing to follow it: ${absolutePath}`);
    if (item.isDirectory()) collectFiles(root, absolutePath, files);
    else if (item.isFile()) files.set(relative(root, absolutePath).split(sep).join("/"), absolutePath);
    else throw new Error(`Unsupported source entry: ${absolutePath}`);
  }
  return files;
}

function contentType(path) {
  const extension = path.toLowerCase().split(".").pop();
  return extension === "mp4" ? "video/mp4" : "application/octet-stream";
}

function encodeStoragePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

const prefix = `${sourceFolderName}/`;
const localFiles = collectFiles(sourceRoot);
let entries;
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.excluded !== "BBC" || !Array.isArray(manifest.entries)) {
    throw new Error("Expected the reviewed media manifest with BBC explicitly excluded.");
  }
  entries = manifest.entries.filter((entry) => entry.bucket === "videos" && entry.sourceKey?.startsWith(prefix));
  if (entries.length === 0) throw new Error("The manifest has no vocabulary video entries for this local source.");
} else {
  entries = [...localFiles].map(([relativePath, localPath]) => ({
    bucket: "videos",
    path: `vocabulary/${relativePath}`,
    bytes: statSync(localPath).size,
    sourceKey: `${prefix}${relativePath}`,
  }));
}

const expectedFiles = new Set();
const destinations = new Set();
const pending = [];
for (const entry of entries) {
  if (typeof entry.path !== "string" || !entry.path.startsWith("vocabulary/")
    || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0) {
    throw new Error("The video manifest contains an unsafe or incomplete path.");
  }
  const relativePath = entry.sourceKey.slice(prefix.length);
  if (!relativePath || relativePath.split("/").includes("..")) throw new Error("The source manifest contains an unsafe local path.");
  expectedFiles.add(relativePath);
  const localPath = localFiles.get(relativePath);
  if (!localPath) throw new Error(`Local file is missing: ${relativePath}`);
  const size = statSync(localPath).size;
  if (size !== entry.bytes) throw new Error(`Local size differs from the reviewed manifest: ${relativePath}`);
  if (size > maxUploadBytes) throw new Error(`File exceeds the current 50 MB storage limit: ${relativePath}`);
  const storagePath = toSupabaseSafeStoragePath(entry.path);
  if (destinations.has(storagePath)) throw new Error(`Two source files map to the same Supabase path: ${storagePath}`);
  destinations.add(storagePath);
  pending.push({ ...entry, localPath, storagePath });
}
if (existsSync(manifestPath)) {
  const extras = [...localFiles.keys()].filter((path) => !expectedFiles.has(path));
  if (extras.length) throw new Error(`Source folder has ${extras.length} file(s) outside the reviewed manifest; refusing to guess their destination.`);
}
if (pending.some((entry) => !entry.localPath.toLowerCase().endsWith(".mp4"))) throw new Error("The source folder contains a non-MP4 file; refusing to upload it as vocabulary video.");

const totalBytes = pending.reduce((sum, entry) => sum + entry.bytes, 0);
console.log(`Local source check passed: ${pending.length} vocabulary videos, ${(totalBytes / 1024 ** 3).toFixed(2)} GiB; every filename and size matches the reviewed manifest.`);
console.log(`Destination: Supabase Storage bucket videos; BBC remains excluded. Source: ${sourceRoot}`);
console.log(`Mode: ${execute ? "upload enabled" : "dry run only"}; concurrency ${concurrency}; files over 20 MB are rejected.`);
if (!execute) {
  console.log("To upload directly over your broadband, run this script again with --execute. It clears proxy environment variables and does not connect to Tencent COS.");
  process.exit(0);
}

readEnvFile(envPath);
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error(`Supabase URL or service role key is missing from ${envPath}.`);

// Use the user's broadband directly, even if their terminal has proxy variables set.
for (const name of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy", "NODE_USE_ENV_PROXY"]) {
  delete process.env[name];
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
mkdirSync(dirname(journalPath), { recursive: true });

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
  const { data, error } = await supabase.storage.from("videos").info(encodeStoragePath(path));
  if (error) throw error;
  return data;
}

let next = 0;
let uploaded = 0;
let reused = 0;
let failure;
const worker = async () => {
  while (!failure) {
    const entry = pending[next++];
    if (!entry) return;
    const bytes = readFileSync(entry.localPath);
    if (bytes.length !== entry.bytes) throw new Error(`Local file changed while uploading: ${entry.localPath}`);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const destination = `${entry.bucket}/${entry.storagePath}`;
    let info;
    let infoError;
    try {
      info = await retry(() => getInfo(entry.storagePath), `Supabase check for ${destination}`);
    } catch (error) {
      infoError = error;
    }
    if (info) {
      if (Number(info.size) !== bytes.length || info.metadata?.sha256 !== sha256) {
        throw new Error(`Existing Supabase file differs from the local source; refusing to overwrite ${destination}.`);
      }
      reused += 1;
    } else {
      const missing = Number(infoError?.status ?? infoError?.cause?.status) === 404
        || /not.?found|no.?such.?key|objectnotfound/i.test(String(infoError?.code ?? infoError?.cause?.code ?? ""))
        || /not found|does not exist|missing object/i.test(String(infoError?.message ?? ""));
      if (!missing) throw new Error(`Could not safely check ${destination}: ${String(infoError?.message ?? "unknown error")}`);
      await retry(async () => {
        const { error } = await supabase.storage.from("videos").upload(encodeStoragePath(entry.storagePath), bytes, {
          cacheControl: "31536000",
          contentType: contentType(entry.path),
          metadata: { sha256 },
          upsert: false,
        });
        if (error) throw error;
      }, `Supabase upload for ${destination}`);
      const after = await retry(() => getInfo(entry.storagePath), `Supabase verify for ${destination}`);
      if (Number(after?.size) !== bytes.length || after?.metadata?.sha256 !== sha256) {
        throw new Error(`Supabase size/hash verification failed for ${destination}.`);
      }
      uploaded += 1;
      appendFileSync(journalPath, `${JSON.stringify({ bucket: entry.bucket, path: entry.path, bytes: bytes.length, sha256, verifiedAt: new Date().toISOString() })}\n`);
    }
    const completed = uploaded + reused;
    if (completed % 25 === 0) console.log(`Checkpoint: ${completed}/${pending.length} checked; ${uploaded} uploaded, ${reused} already verified.`);
  }
};

await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
  try {
    await worker();
  } catch (error) {
    failure ??= error;
  }
}));
if (failure) throw failure;
console.log(`Complete: ${uploaded} uploaded; ${reused} already existed and matched local size/SHA-256.`);
console.log(`Progress journal: ${journalPath}`);
