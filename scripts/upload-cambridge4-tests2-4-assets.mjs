import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();
const sourceRoot = "/Volumes/My HDD3/备课/IELTS/剑桥雅思/剑桥雅思4";
const testNumbers = [2, 3, 4];
const sectionNumbers = [1, 2, 3, 4];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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

loadEnvFile(path.join(rootDir, ".env.local"));
loadEnvFile(path.join(rootDir, ".env.seed.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.");
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY. Put it in .env.seed.local before uploading assets.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

async function uploadFile(bucket, localPath, storagePath, contentType) {
  if (!existsSync(localPath)) {
    throw new Error(`Local file not found: ${localPath}`);
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, readFileSync(localPath), {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed for ${bucket}/${storagePath}: ${error.message}`);
  }
}

async function uploadInBatches(items, upload, batchSize = 8) {
  for (let index = 0; index < items.length; index += batchSize) {
    await Promise.all(items.slice(index, index + batchSize).map(upload));
  }
}

async function uploadSectionAssets(testNo, sectionNo) {
  const sourceDir = path.join(sourceRoot, `test${testNo}`);
  const basePath = `listening/ci4/t${testNo}/s${sectionNo}`;
  const fullAudioLocalPath = path.join(
    sourceDir,
    `4test${testNo}_section${sectionNo}.mp3`,
  );
  const sentenceAudioDir = path.join(
    sourceDir,
    `4test${testNo}_section${sectionNo}小音频`,
  );

  await uploadFile("audio", fullAudioLocalPath, `${basePath}/full.mp3`, "audio/mpeg");

  const sentenceFiles = (await readdir(sentenceAudioDir))
    .filter((fileName) => /^\d{3}\.mp3$/.test(fileName))
    .sort();

  await uploadInBatches(sentenceFiles, async (fileName) => {
    const sentenceNo = fileName.replace(".mp3", "");
    await uploadFile(
      "audio",
      path.join(sentenceAudioDir, fileName),
      `${basePath}/sentences/ci4_t${testNo}_s${sectionNo}_${sentenceNo}.mp3`,
      "audio/mpeg",
    );
  });

  console.log(`Test ${testNo} Section ${sectionNo}: sentences=${sentenceFiles.length}`);
}

for (const testNo of testNumbers) {
  for (const sectionNo of sectionNumbers) {
    await uploadSectionAssets(testNo, sectionNo);
  }
}

console.log("Cambridge 4 Test 2-4 assets uploaded.");
