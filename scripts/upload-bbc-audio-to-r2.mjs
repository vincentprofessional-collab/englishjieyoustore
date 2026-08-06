import { createHash, createHmac } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { request } from "node:https";
import path from "node:path";

const sourceDir = "/Users/shidianjin/ielts-platform/public/audio/bbc";
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET || "englishjieyou-bbc-audio";
const prefix = (process.env.R2_PREFIX || "bbc").replace(/^\/+|\/+$/g, "");
const concurrency = Number(process.env.R2_UPLOAD_CONCURRENCY || "6");
const uploadLimit = Number(process.env.R2_UPLOAD_LIMIT || "0");
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
const skipExisting = process.env.R2_SKIP_EXISTING !== "0" && Boolean(publicBaseUrl);
const progressInterval = Number(process.env.R2_PROGRESS_INTERVAL || "2000");

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error("Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY.");
  process.exit(1);
}

const endpointHost = `${accountId}.r2.cloudflarestorage.com`;
const service = "s3";
const region = "auto";

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function sha256(value, encoding = "hex") {
  return createHash("sha256").update(value).digest(encoding);
}

async function fileSha256(filePath) {
  const hash = createHash("sha256");

  await new Promise((resolve, reject) => {
    createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", resolve);
  });

  return hash.digest("hex");
}

function amzDateParts(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    dateStamp: iso.slice(0, 8),
    amzDate: iso,
  };
}

function encodePathPart(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalUri(key) {
  return `/${bucket}/${key.split("/").map(encodePathPart).join("/")}`;
}

function publicObjectUrl(key) {
  return `${publicBaseUrl}/${key.split("/").map(encodePathPart).join("/")}`;
}

function signRequest({ method, key, payloadHash, contentLength }) {
  const { dateStamp, amzDate } = amzDateParts();
  const uri = canonicalUri(key);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const headers = {
    "cache-control": "public, max-age=31536000, immutable",
    "content-length": String(contentLength),
    "content-type": "audio/mpeg",
    host: endpointHost,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((name) => `${name}:${headers[name]}\n`)
    .join("");
  const canonicalRequest = [method, uri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service), "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");

  return {
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    path: uri,
  };
}

async function listMp3Files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listMp3Files(fullPath);
      }

      if (entry.isFile() && entry.name.endsWith(".mp3")) {
        return [fullPath];
      }

      return [];
    }),
  );

  return files.flat();
}

async function putObject(filePath) {
  const relativePath = path.relative(sourceDir, filePath).split(path.sep).join("/");
  const key = `${prefix}/${relativePath}`;
  const fileStat = await stat(filePath);

  if (skipExisting && (await hasSameSizePublicObject(key, fileStat.size))) {
    return `${key} (skipped)`;
  }

  const payloadHash = await fileSha256(filePath);
  const signed = signRequest({
    method: "PUT",
    key,
    payloadHash,
    contentLength: fileStat.size,
  });

  await new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: endpointHost,
        method: "PUT",
        path: signed.path,
        headers: signed.headers,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
            return;
          }

          reject(new Error(`Upload failed ${res.statusCode}: ${body.slice(0, 500)}`));
        });
      },
    );

    req.on("error", reject);
    createReadStream(filePath).pipe(req);
  });

  return key;
}

async function hasSameSizePublicObject(key, expectedSize) {
  return new Promise((resolve) => {
    const req = request(publicObjectUrl(key), { method: "HEAD", timeout: 20000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200 && Number(res.headers["content-length"]) === expectedSize);
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function putObjectWithRetry(filePath) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await putObject(filePath);
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }

  throw lastError;
}

async function runPool(items, worker) {
  let index = 0;
  let done = 0;

  async function runWorker() {
    while (index < items.length) {
      const item = items[index++];
      const key = await worker(item);
      done += 1;

      if (done === 1 || done % progressInterval === 0 || done === items.length) {
        console.log(`${done}/${items.length} uploaded: ${key}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
}

const files = await listMp3Files(sourceDir);
const selectedFiles = uploadLimit > 0 ? files.slice(0, uploadLimit) : files;

console.log(`Uploading ${selectedFiles.length} BBC mp3 files to r2://${bucket}/${prefix}/`);
if (skipExisting) {
  console.log(`Existing public objects with matching sizes will be skipped via ${publicBaseUrl}/`);
}
await runPool(selectedFiles, putObjectWithRetry);
console.log("BBC audio upload finished.");
