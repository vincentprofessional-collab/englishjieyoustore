import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();
const sourceDir = "/Volumes/My HDD3/备课/IELTS/剑桥雅思/剑桥雅思4/test1";
const questionImagesDir = "/Users/shidianjin/Desktop/雅思听力/雅思听力题干图片/4";
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

  const file = readFileSync(localPath);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload failed for ${bucket}/${storagePath}: ${error.message}`);
  }
}

async function uploadSectionAssets(sectionNo) {
  const basePath = `listening/ci4/t1/s${sectionNo}`;
  const fullAudioLocalPath = path.join(sourceDir, `4test1_section${sectionNo}.mp3`);
  const sentenceAudioDir = path.join(sourceDir, `4test1_section${sectionNo}小音频`);

  await uploadFile("audio", fullAudioLocalPath, `${basePath}/full.mp3`, "audio/mpeg");

  const sentenceFiles = (await readdir(sentenceAudioDir))
    .filter((fileName) => /^\d{3}\.mp3$/.test(fileName))
    .sort();

  for (const fileName of sentenceFiles) {
    const sentenceNo = fileName.replace(".mp3", "");
    await uploadFile(
      "audio",
      path.join(sentenceAudioDir, fileName),
      `${basePath}/sentences/ci4_t1_s${sectionNo}_${sentenceNo}.mp3`,
      "audio/mpeg",
    );
  }

  const imageFiles = (await readdir(questionImagesDir))
    .filter((fileName) => new RegExp(`^T1 S${sectionNo}-\\d+\\.png$`).test(fileName))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  for (const fileName of imageFiles) {
    const pageMatch = fileName.match(/-(\d+)\.png$/);
    const pageNo = pageMatch?.[1] ?? "1";
    await uploadFile(
      "images",
      path.join(questionImagesDir, fileName),
      `${basePath}/questions/t1_s${sectionNo}_${pageNo}.png`,
      "image/png",
    );
  }

  return {
    fullAudioPath: `${basePath}/full.mp3`,
    imageCount: imageFiles.length,
    sectionNo,
    sentenceCount: sentenceFiles.length,
  };
}

async function uploadAssets() {
  const results = [];

  for (const sectionNo of sectionNumbers) {
    results.push(await uploadSectionAssets(sectionNo));
  }

  console.log("Cambridge 4 Test 1 assets uploaded.");
  for (const result of results) {
    console.log(
      `Section ${result.sectionNo}: full=${result.fullAudioPath}, sentences=${result.sentenceCount}, images=${result.imageCount}`,
    );
  }
}

uploadAssets().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
