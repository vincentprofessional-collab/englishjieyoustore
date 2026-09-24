import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"));
const COS = require("cos-nodejs-sdk-v5");
const env = process.env;
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TENCENT_SECRET_ID", "TENCENT_SECRET_KEY", "TENCENT_COS_BUCKET", "TENCENT_COS_REGION"];
const missing = required.filter((key) => !env[key]);
if (missing.length) throw new Error(`Missing local setting(s): ${missing.join(", ")}`);

const args = process.argv.slice(2);
const flagValue = (name, fallback) => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const execute = args.includes("--execute");
const maxBytes = Number(flagValue("--max-bytes", "900000000"));
const include = flagValue("--include", "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const statePath = resolve(flagValue("--state", "/private/tmp/englishjieyou-cos-storage-20260924.json"));
if (!include.length) throw new Error("Pass explicit bucket:folder entries with --include.");
if (execute && (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1_000_000_000)) {
  throw new Error("Execution requires --max-bytes between 1 and 1,000,000,000.");
}

const supabaseUrl = new URL(env.SUPABASE_URL);
const supabaseHeaders = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "content-type": "application/json",
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

async function supabaseList(bucket, prefix, offset) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(new URL(`storage/v1/object/list/${encodeURIComponent(bucket)}`, supabaseUrl), {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < 4) {
          await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 500));
          continue;
        }
        throw new Error(`Supabase listing failed: HTTP ${response.status}.`);
      }
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error("Unexpected Supabase listing response.");
      return entries;
    } catch (error) {
      if (attempt === 4 || (error instanceof Error && !["TimeoutError", "AbortError"].includes(error.name) && !/fetch failed/i.test(error.message))) {
        throw error;
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 500));
    }
  }
  throw new Error("Supabase listing failed after four attempts.");
}

async function listPrefix(bucket, prefix, output, counters) {
  let frontier = [prefix];
  const visited = new Set();
  while (frontier.length) {
    if (visited.size + frontier.length > 5000) throw new Error("Safety stop: folder listing exceeded 5,000 prefixes.");
    const batch = frontier.splice(0, 8).filter((folder) => !visited.has(folder));
    const nextFolders = await Promise.all(batch.map(async (folder) => {
      visited.add(folder);
      const childFolders = [];
      let offset = 0;
      while (true) {
        counters.listRequests += 1;
        if (counters.listRequests > 10000) throw new Error("Safety stop: listing exceeded 10,000 requests.");
        const entries = await supabaseList(bucket, folder, offset);
        for (const entry of entries) {
          const key = `${folder}/${entry.name}`;
          if (entry.id == null && entry.metadata == null) {
            childFolders.push(key);
            continue;
          }
          const size = Number(entry.metadata?.size ?? entry.metadata?.contentLength);
          if (!Number.isSafeInteger(size) || size < 0) throw new Error("A listed object has no reliable size; migration stopped.");
          output.push({ bucket, path: key, size });
          counters.listedFiles += 1;
        }
        offset += entries.length;
        if (entries.length < 1000) break;
      }
      return childFolders;
    }));
    frontier.push(...nextFolders.flat());
  }
}

function header(headers, name) {
  const key = Object.keys(headers ?? {}).find((entry) => entry.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function isMissingObject(error) {
  return Number(error?.statusCode ?? error?.status) === 404 || ["NoSuchKey", "NotFound"].includes(error?.code);
}

let stateWriteChain = Promise.resolve();
function saveState(state) {
  const snapshot = `${JSON.stringify(state)}\n`;
  stateWriteChain = stateWriteChain.then(() => {
    const temporaryPath = `${statePath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, snapshot, { mode: 0o600 });
    renameSync(temporaryPath, statePath);
  });
  return stateWriteChain;
}

async function main() {
  const files = [];
  const counters = { listRequests: 0, listedFiles: 0 };
  for (const item of include) {
    const split = item.indexOf(":");
    const bucket = item.slice(0, split);
    const prefix = item.slice(split + 1).replace(/^\/+|\/+$/g, "");
    if (!new Set(["audio", "images", "video", "videos", "documents"]).has(bucket) || !prefix) {
      throw new Error("Only explicit non-empty prefixes in known Supabase buckets are allowed.");
    }
    await listPrefix(bucket, prefix, files, counters);
  }

  const assets = [...new Map(files.map((file) => [`${file.bucket}/${file.path}`, file])).values()];
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { version: 1, copied: {} };
  if (!state.copied || typeof state.copied !== "object") throw new Error("Invalid migration checkpoint.");
  const planned = [];
  let plannedBytes = 0;
  for (const asset of assets) {
    if (execute && plannedBytes + asset.size > maxBytes) continue;
    planned.push(asset);
    plannedBytes += asset.size;
  }
  const totalKnownBytes = assets.reduce((sum, asset) => sum + asset.size, 0);
  console.log(`Inventory: ${assets.length} objects | ${totalKnownBytes} known bytes | ${counters.listRequests} listing requests.`);
  console.log(`Batch: ${planned.length} objects | ${plannedBytes} source bytes | ${execute ? "copy enabled" : "dry run only"}.`);
  if (!execute) return;

  let copied = 0;
  let verifiedExisting = 0;
  let sourceBytesUsed = 0;
  let nextAsset = 0;
  let failure = null;
  const worker = async () => {
    while (!failure) {
      const index = nextAsset++;
      if (index >= planned.length) return;
      const asset = planned[index];
      const destination = `${asset.bucket}/${asset.path}`;
      const response = await fetch(new URL(`storage/v1/object/authenticated/${encodeURIComponent(asset.bucket)}/${asset.path.split("/").map(encodeURIComponent).join("/")}`, supabaseUrl), {
        headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) throw new Error(`Supabase object fetch failed: HTTP ${response.status}; batch stopped.`);
      const advertisedSize = Number(response.headers.get("content-length"));
      if (Number.isFinite(advertisedSize) && advertisedSize > 0 && advertisedSize !== asset.size) {
        await response.body?.cancel();
        throw new Error("Downloaded object size differed from its listing; migration stopped.");
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length !== asset.size || sourceBytesUsed + bytes.length > maxBytes) {
        throw new Error("Downloaded object size differed from its listing or exceeded this batch cap.");
      }
      sourceBytesUsed += bytes.length;
      const sha256 = createHash("sha256").update(bytes).digest("hex");

      let existing = null;
      try {
        existing = await cosCall("headObject", { Bucket: env.TENCENT_COS_BUCKET, Region: env.TENCENT_COS_REGION, Key: destination });
      } catch (error) {
        if (!isMissingObject(error)) throw new Error("Could not safely check a COS destination; batch stopped.");
      }
      if (existing) {
        const sameSize = Number(header(existing.headers, "content-length")) === bytes.length;
        const sameHash = header(existing.headers, "x-cos-meta-sha256") === sha256;
        if (!sameSize || !sameHash) throw new Error("A different COS object already exists at a migration path; refusing to overwrite it.");
        verifiedExisting += 1;
      } else {
        await cosCall("putObject", {
          Bucket: env.TENCENT_COS_BUCKET,
          Region: env.TENCENT_COS_REGION,
          Key: destination,
          Body: bytes,
          ContentLength: bytes.length,
          ContentType: response.headers.get("content-type") || "application/octet-stream",
          ACL: "private",
          "x-cos-meta-sha256": sha256,
        });
        const verified = await cosCall("headObject", { Bucket: env.TENCENT_COS_BUCKET, Region: env.TENCENT_COS_REGION, Key: destination });
        if (Number(header(verified.headers, "content-length")) !== bytes.length || header(verified.headers, "x-cos-meta-sha256") !== sha256) {
          throw new Error("COS size/hash verification failed; the Supabase source was retained.");
        }
        copied += 1;
      }

      state.copied[destination] = { size: bytes.length, sha256, verifiedAt: new Date().toISOString() };
      await saveState(state);
      if ((copied + verifiedExisting) % 50 === 0) console.log(`Checkpoint: ${copied} uploaded, ${verifiedExisting} already present and verified.`);
    }
  };

  const workers = Array.from({ length: Math.min(3, planned.length) }, async () => {
    try {
      await worker();
    } catch (error) {
      failure ??= error;
    }
  });
  await Promise.all(workers);
  if (failure) throw failure;
  await stateWriteChain;
  console.log(`Batch complete: ${copied} uploaded, ${verifiedExisting} already present and verified, ${sourceBytesUsed} bytes read.`);
  console.log("Supabase originals were left unchanged; COS objects are private.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Media migration failed.");
  process.exitCode = 1;
});
