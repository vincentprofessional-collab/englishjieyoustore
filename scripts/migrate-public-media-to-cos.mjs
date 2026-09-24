import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { extname, relative, resolve } from "node:path";
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";

const COS = createRequire(resolve("package.json"))("cos-nodejs-sdk-v5");
const env = process.env;
const required = ["TENCENT_SECRET_ID", "TENCENT_SECRET_KEY", "TENCENT_COS_BUCKET", "TENCENT_COS_REGION"];
const missing = required.filter((key) => !env[key]);
if (missing.length) throw new Error(`Missing local setting(s): ${missing.join(", ")}`);

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const argValue = (name, fallback) => {
  const item = args.find((value) => value.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : fallback;
};
const maxBytes = Number(argValue("--max-bytes", "450000000"));
if (execute && (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1_000_000_000)) {
  throw new Error("Execution requires --max-bytes between 1 and 1,000,000,000.");
}
const statePath = resolve(argValue("--state", "/private/tmp/englishjieyou-cos-public-media-20260924.json"));
const publicRoot = resolve("public");
const audioExtensions = new Set([".aac", ".flac", ".m4a", ".mp3", ".oga", ".ogg", ".wav", ".weba"]);
const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const videoExtensions = new Set([".avi", ".m4v", ".mkv", ".mov", ".mp4", ".ogv", ".webm"]);
const documentExtensions = new Set([".pdf"]);
const contentTypes = {
  ".aac": "audio/aac", ".avif": "image/avif", ".flac": "audio/flac", ".gif": "image/gif",
  ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".m4a": "audio/mp4", ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska", ".mov": "video/quicktime", ".mp3": "audio/mpeg", ".mp4": "video/mp4",
  ".oga": "audio/ogg", ".ogg": "audio/ogg", ".ogv": "video/ogg", ".pdf": "application/pdf",
  ".png": "image/png", ".svg": "image/svg+xml", ".wav": "audio/wav", ".weba": "audio/webm",
  ".webm": "video/webm", ".webp": "image/webp", ".avi": "video/x-msvideo",
};
const cosOptions = {
  SecretId: env.TENCENT_SECRET_ID,
  SecretKey: env.TENCENT_SECRET_KEY,
  Protocol: "https:",
  UploadCheckContentMd5: true,
};
if (env.TENCENT_COS_PROXY) cosOptions.Proxy = env.TENCENT_COS_PROXY;
const cos = new COS(cosOptions);

function cosCall(method, params) {
  return new Promise((resolvePromise, reject) => {
    cos[method](params, (error, data) => (error ? reject(error) : resolvePromise(data)));
  });
}

function listFiles(directory, output, excludedBbc) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith("._")) continue;
    const sourcePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      listFiles(sourcePath, output, excludedBbc);
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = extname(entry.name).toLowerCase();
    let bucket = null;
    if (audioExtensions.has(extension)) bucket = "audio";
    else if (imageExtensions.has(extension)) bucket = "images";
    else if (videoExtensions.has(extension)) bucket = "video";
    else if (documentExtensions.has(extension)) bucket = "documents";
    if (!bucket) continue;
    const path = relative(publicRoot, sourcePath).split("\\").join("/");
    const fileStat = statSync(sourcePath);
    const size = fileStat.size;
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("A local media file has an invalid size.");
    if (path.startsWith("audio/bbc/")) {
      excludedBbc.files += 1;
      excludedBbc.bytes += size;
      continue;
    }
    output.push({ sourcePath, path, bucket, size, mtimeMs: fileStat.mtimeMs, contentType: contentTypes[extension] ?? "application/octet-stream" });
  }
}

function header(headers, name) {
  const key = Object.keys(headers ?? {}).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function isMissingObject(error) {
  return Number(error?.statusCode ?? error?.status) === 404 || ["NoSuchKey", "NotFound"].includes(error?.code);
}

function saveState(state) {
  const tempPath = `${statePath}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  renameSync(tempPath, statePath);
}

async function main() {
  if (!existsSync(publicRoot)) throw new Error("The public media directory was not found.");
  const assets = [];
  const excludedBbc = { files: 0, bytes: 0 };
  listFiles(publicRoot, assets, excludedBbc);
  assets.sort((a, b) => a.path.localeCompare(b.path));
  if (!assets.length) throw new Error("No supported media files were found in public/.");

  const totalBytes = assets.reduce((sum, asset) => sum + asset.size, 0);
  const byBucket = new Map();
  for (const asset of assets) {
    const summary = byBucket.get(asset.bucket) ?? { files: 0, bytes: 0 };
    summary.files += 1;
    summary.bytes += asset.size;
    byBucket.set(asset.bucket, summary);
  }
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { version: 1, copied: {} };
  if (!state.copied || typeof state.copied !== "object") throw new Error("Invalid upload checkpoint.");
  const plan = [];
  let plannedBytes = 0;
  for (const asset of assets) {
    const prior = state.copied[`${asset.bucket}/static/${asset.path}`];
    if (prior?.size === asset.size && prior?.sha256 && prior?.mtimeMs === asset.mtimeMs) continue;
    if (execute && plannedBytes + asset.size > maxBytes) continue;
    plan.push(asset);
    plannedBytes += asset.size;
  }
  console.log(`Local inventory: ${assets.length} files | ${totalBytes} bytes.`);
  for (const [bucket, summary] of byBucket) console.log(`${bucket}: ${summary.files} files | ${summary.bytes} bytes.`);
  console.log(`BBC audio left on its existing protected R2 path: ${excludedBbc.files} files | ${excludedBbc.bytes} bytes.`);
  console.log(`Batch: ${plan.length} files | ${plannedBytes} bytes | ${execute ? "upload enabled" : "dry run only"}.`);
  if (!execute) return;

  let uploaded = 0;
  let verifiedExisting = 0;
  let sourceBytesUsed = 0;
  let next = 0;
  let failure = null;
  const worker = async () => {
    while (!failure) {
      const index = next++;
      if (index >= plan.length) return;
      const asset = plan[index];
      const bytes = readFileSync(asset.sourcePath);
      if (bytes.length !== asset.size || sourceBytesUsed + bytes.length > maxBytes) {
        throw new Error("A local file changed during upload or exceeded the batch cap.");
      }
      sourceBytesUsed += bytes.length;
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const destination = `${asset.bucket}/static/${asset.path}`;
      let existing = null;
      try {
        existing = await cosCall("headObject", { Bucket: env.TENCENT_COS_BUCKET, Region: env.TENCENT_COS_REGION, Key: destination });
      } catch (error) {
        if (!isMissingObject(error)) throw new Error("Could not safely check a COS destination; upload stopped.");
      }
      if (existing) {
        if (
          Number(header(existing.headers, "content-length")) !== bytes.length ||
          header(existing.headers, "x-cos-meta-sha256") !== sha256
        ) {
          throw new Error("A different COS file already exists at a local-media path; refusing to overwrite it.");
        }
        verifiedExisting += 1;
      } else {
        await cosCall("putObject", {
          Bucket: env.TENCENT_COS_BUCKET,
          Region: env.TENCENT_COS_REGION,
          Key: destination,
          Body: bytes,
          ContentLength: bytes.length,
          ContentType: asset.contentType,
          ACL: "private",
          "x-cos-meta-sha256": sha256,
        });
        const verified = await cosCall("headObject", { Bucket: env.TENCENT_COS_BUCKET, Region: env.TENCENT_COS_REGION, Key: destination });
        if (Number(header(verified.headers, "content-length")) !== bytes.length || header(verified.headers, "x-cos-meta-sha256") !== sha256) {
          throw new Error("COS verification failed; the local source file was retained.");
        }
        uploaded += 1;
      }
      state.copied[destination] = { size: bytes.length, sha256, mtimeMs: asset.mtimeMs, verifiedAt: new Date().toISOString() };
      saveState(state);
      if ((uploaded + verifiedExisting) % 50 === 0) console.log(`Checkpoint: ${uploaded} uploaded, ${verifiedExisting} already present and verified.`);
    }
  };

  await Promise.all(Array.from({ length: Math.min(3, plan.length) }, async () => {
    try {
      await worker();
    } catch (error) {
      failure ??= error;
    }
  }));
  if (failure) throw failure;
  console.log(`Batch complete: ${uploaded} uploaded, ${verifiedExisting} already present and verified, ${sourceBytesUsed} bytes read.`);
  console.log("Local public files were left unchanged; COS objects are private.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Public media upload failed.");
  process.exitCode = 1;
});
