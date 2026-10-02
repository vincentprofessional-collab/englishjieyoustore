import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { toSupabaseSafeStoragePath } from "../src/lib/media/url.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(projectRoot, "package.json"));
const COS = require("cos-nodejs-sdk-v5");
const { createClient } = require("@supabase/supabase-js");
const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const direct = args.has("--direct");
const maxUploadBytes = 50_000_000;
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const concurrency = Number(concurrencyArg?.slice("--concurrency=".length) ?? 3);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 5) {
  throw new Error("Concurrency must be an integer from 1 to 5.");
}

function readEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
}

const envPathArg = process.argv.find((arg) => arg.startsWith("--env-file="));
readEnvFile(envPathArg?.slice("--env-file=".length)
  ?? resolve(projectRoot, "../englishjieyoustore/.env.cos-migration.local"));

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TENCENT_SECRET_ID", "TENCENT_SECRET_KEY", "TENCENT_COS_BUCKET", "TENCENT_COS_REGION"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing local setting(s): ${missing.join(", ")}`);

const manifestPath = resolve(projectRoot, "outputs/cos-supabase-media-manifest.json");
const existingPath = resolve(projectRoot, "outputs/supabase-existing-audio-video.json");
const journalPath = resolve(projectRoot, "outputs/cos-to-supabase-progress.jsonl");
const localVideoJournalPath = resolve(projectRoot, "outputs/local-vocabulary-videos-to-supabase-progress.jsonl");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const existingInventory = JSON.parse(readFileSync(existingPath, "utf8"));
if (manifest.excluded !== "BBC" || !Array.isArray(manifest.entries)) {
  throw new Error("Expected the reviewed manifest with BBC explicitly excluded.");
}

const normalizeEtag = (value) => String(value ?? "").replaceAll('"', "").trim().toLowerCase();
const existing = new Map(existingInventory.files.map((file) => [`${file.bucket}/${file.path}`, file]));
const entries = manifest.entries.map((entry) => {
  if (!new Set(["audio", "videos"]).has(entry.bucket)
    || typeof entry.path !== "string"
    || entry.path.startsWith("/")
    || entry.path.split("/").includes("..")
    || !Number.isSafeInteger(entry.bytes)
    || entry.bytes < 0) {
    throw new Error("The manifest contains an unsafe or incomplete object path.");
  }
  if (entry.bucket === "audio" && entry.path.toLowerCase().startsWith("bbc/")) {
    throw new Error("Safety stop: BBC audio must remain on its current storage route.");
  }
  return { ...entry, storagePath: toSupabaseSafeStoragePath(entry.path) };
});
const destinations = new Set();
for (const entry of entries) {
  const destination = `${entry.bucket}/${entry.storagePath}`;
  if (destinations.has(destination)) throw new Error(`Two source keys map to the same Supabase destination: ${destination}`);
  destinations.add(destination);
}
const oversized = entries.filter((entry) => entry.bytes > maxUploadBytes);
const eligibleEntries = entries.filter((entry) => entry.bytes <= maxUploadBytes);

const verifiedExisting = new Set();
for (const entry of eligibleEntries) {
  const destination = `${entry.bucket}/${entry.storagePath}`;
  const listed = existing.get(destination);
  if (!listed) continue;
  if (listed.bytes !== entry.bytes || normalizeEtag(listed.etag) !== normalizeEtag(entry.etag)) {
    throw new Error(`Existing Supabase object differs from the source; refusing to overwrite ${destination}.`);
  }
  verifiedExisting.add(destination);
}

const completed = new Map();
if (existsSync(journalPath)) {
  for (const line of readFileSync(journalPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    const record = JSON.parse(line);
    const destination = `${record.bucket}/${toSupabaseSafeStoragePath(record.path)}`;
    if (!Number.isSafeInteger(record.bytes) || !/^[a-f0-9]{64}$/.test(record.sha256 ?? "")) {
      throw new Error("The migration checkpoint is invalid; refusing to skip any file.");
    }
    completed.set(destination, record);
  }
}

const eligibleByDestination = new Map(eligibleEntries.map((entry) => [`${entry.bucket}/${entry.storagePath}`, entry]));
let locallyVerifiedVideos = 0;
if (existsSync(localVideoJournalPath)) {
  for (const line of readFileSync(localVideoJournalPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    const record = JSON.parse(line);
    if (record.bucket !== "videos" || typeof record.path !== "string"
      || !Number.isSafeInteger(record.bytes) || record.bytes < 0
      || !/^[a-f0-9]{64}$/.test(record.sha256 ?? "")) {
      throw new Error("The local video upload checkpoint is invalid; refusing to skip any file.");
    }
    const destination = `${record.bucket}/${toSupabaseSafeStoragePath(record.path)}`;
    const sourceEntry = eligibleByDestination.get(destination);
    if (!sourceEntry || sourceEntry.bytes !== record.bytes) {
      throw new Error(`Local video checkpoint does not match the reviewed migration manifest: ${destination}`);
    }
    completed.set(destination, { ...record, bucket: "videos", path: sourceEntry.path });
    locallyVerifiedVideos += 1;
  }
}

const pending = eligibleEntries.filter((entry) => {
  const key = `${entry.bucket}/${entry.storagePath}`;
  if (verifiedExisting.has(key)) return false;
  const record = completed.get(key);
  if (!record) return true;
  if (record.bytes !== entry.bytes) throw new Error(`Checkpoint size changed for ${key}.`);
  return false;
});
const pendingBytes = pending.reduce((sum, entry) => sum + entry.bytes, 0);
console.log(`Plan: ${entries.length} non-BBC objects; ${verifiedExisting.size} exact existing objects; ${pending.length} remaining (${pendingBytes} bytes).`);
if (locallyVerifiedVideos) console.log(`Skipping ${locallyVerifiedVideos} video(s) already verified from the local drive.`);
console.log(`Skipped ${oversized.length} object(s) larger than ${maxUploadBytes} bytes; their Tencent COS copies stay in service.`);
console.log(`Mode: ${execute ? "upload enabled; source COS objects will be retained" : "dry run"}.`);
if (!execute) process.exit(0);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const cos = new COS({
  SecretId: process.env.TENCENT_SECRET_ID,
  SecretKey: process.env.TENCENT_SECRET_KEY,
  Protocol: "https:",
  UploadCheckContentMd5: true,
  ...(direct ? {} : { Proxy: process.env.TENCENT_COS_PROXY || "http://127.0.0.1:7690" }),
  Tunnel: !direct,
});

function getCosObject(key) {
  return new Promise((resolvePromise, reject) => {
    cos.getObject({
      Bucket: process.env.TENCENT_COS_BUCKET,
      Region: process.env.TENCENT_COS_REGION,
      Key: key,
    }, (error, data) => (error ? reject(error) : resolvePromise(data)));
  });
}

function contentType(path) {
  const extension = path.toLowerCase().split(".").pop();
  return ({
    aac: "audio/aac",
    flac: "audio/flac",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    ogg: "audio/ogg",
    wav: "audio/wav",
    webm: "video/webm",
  })[extension] ?? "application/octet-stream";
}

function encodeStoragePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function retry(operation, label) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const status = Number(error?.status ?? error?.statusCode ?? error?.statusCodeValue);
      const retryable = status === 408 || status === 429 || status >= 500
        || ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "TimeoutError", "AbortError"].includes(error?.code ?? error?.name)
        || /fetch failed|network|timeout/i.test(error?.message ?? "");
      if (!retryable || attempt === 4) {
        const failure = new Error(`${label} failed after ${attempt} attempt(s).`);
        failure.status = error?.status ?? error?.statusCode;
        failure.code = error?.code;
        failure.reason = typeof error?.message === "string" ? error.message.slice(0, 180) : "";
        throw failure;
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 1200));
    }
  }
  throw new Error(`${label} failed.`);
}

async function getStorageInfo(bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).info(encodeStoragePath(path));
  if (error) throw error;
  return data;
}

let next = 0;
let uploaded = 0;
let reusedAfterResume = 0;
let sourceBytes = 0;
let failure;
const worker = async () => {
  while (!failure) {
    const entry = pending[next++];
    if (!entry) return;
    const destination = `${entry.bucket}/${entry.storagePath}`;
    const source = await retry(() => getCosObject(entry.sourceKey), `COS read for ${destination}`);
    const bytes = Buffer.isBuffer(source.Body) ? source.Body : Buffer.from(source.Body ?? "");
    if (bytes.length !== entry.bytes) throw new Error(`Source size mismatch for ${destination}; upload stopped.`);
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    let before;
    let infoError;
    try {
      before = await retry(() => getStorageInfo(entry.bucket, entry.storagePath), `Supabase destination check for ${destination}`);
    } catch (error) {
      infoError = error;
    }
    if (before) {
      if (Number(before.size) !== bytes.length || before.metadata?.sha256 !== sha256) {
        throw new Error(`Existing Supabase object cannot be verified for ${destination}; refusing to overwrite it.`);
      }
      appendFileSync(journalPath, `${JSON.stringify({ bucket: entry.bucket, path: entry.path, bytes: bytes.length, sha256, verifiedAt: new Date().toISOString() })}\n`);
      reusedAfterResume += 1;
    } else {
      const missing = Number(infoError?.status) === 404
        || /not.?found|no.?such.?key|objectnotfound/i.test(String(infoError?.code ?? ""))
        || /not found|does not exist|missing object/i.test(String(infoError?.reason ?? infoError?.message ?? ""));
      if (!missing) {
        const status = infoError?.status ?? "unknown";
        const code = infoError?.code ?? "unknown";
        const reason = infoError?.reason ? ` ${infoError.reason}` : "";
        throw new Error(`Could not verify destination ${destination} (status ${status}; code ${code}).${reason}`);
      }
      await retry(async () => {
        const { error } = await supabase.storage.from(entry.bucket).upload(encodeStoragePath(entry.storagePath), bytes, {
          cacheControl: "31536000",
          contentType: contentType(entry.path),
          metadata: { sha256 },
          upsert: false,
        });
        if (error) throw error;
      }, `Supabase upload for ${destination}`);
      const after = await retry(() => getStorageInfo(entry.bucket, entry.storagePath), `Supabase verification for ${destination}`);
      if (Number(after?.size) !== bytes.length || after?.metadata?.sha256 !== sha256) {
        throw new Error(`Supabase size/hash metadata verification failed for ${destination}.`);
      }
      appendFileSync(journalPath, `${JSON.stringify({ bucket: entry.bucket, path: entry.path, bytes: bytes.length, sha256, verifiedAt: new Date().toISOString() })}\n`);
      uploaded += 1;
    }

    sourceBytes += bytes.length;
    const completedCount = uploaded + reusedAfterResume;
    if (completedCount % 25 === 0) {
      console.log(`Checkpoint: ${completedCount}/${pending.length} migrated in this run; ${sourceBytes} source bytes read.`);
    }
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
console.log(`Complete: ${uploaded} uploaded, ${verifiedExisting.size + reusedAfterResume} verified as already present; ${sourceBytes} source bytes read.`);
console.log(`Checkpoint: ${journalPath}`);
console.log("All Tencent COS source objects remain available for rollback.");
