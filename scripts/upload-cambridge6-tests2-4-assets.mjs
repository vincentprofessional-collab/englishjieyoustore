import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();
const questionImagesDir = "/Users/shidianjin/Desktop/雅思听力/雅思听力题干图片/6";
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

  const file = readFileSync(localPath);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload failed for ${bucket}/${storagePath}: ${error.message}`);
  }
}

async function uploadSectionImages(testNo, sectionNo) {
  const basePath = `listening/ci6/t${testNo}/s${sectionNo}`;
  const imageFiles = (await readdir(questionImagesDir))
    .filter((fileName) => new RegExp(`^T${testNo} S${sectionNo}-\\d+\\.png$`).test(fileName))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  for (const fileName of imageFiles) {
    const pageMatch = fileName.match(/-(\d+)\.png$/);
    const pageNo = pageMatch?.[1] ?? "1";
    await uploadFile(
      "images",
      path.join(questionImagesDir, fileName),
      `${basePath}/questions/t${testNo}_s${sectionNo}_${pageNo}.png`,
      "image/png",
    );
  }

  return {
    imageCount: imageFiles.length,
    sectionNo,
    testNo,
  };
}

async function uploadAssets() {
  const results = [];

  for (const testNo of testNumbers) {
    for (const sectionNo of sectionNumbers) {
      results.push(await uploadSectionImages(testNo, sectionNo));
    }
  }

  console.log("Cambridge 6 Test 2-4 assets uploaded.");
  for (const result of results) {
    console.log(
      `Test ${result.testNo} Section ${result.sectionNo}: images=${result.imageCount}`,
    );
  }

  const totalImages = results.reduce((sum, result) => sum + result.imageCount, 0);
  console.log(`Total images uploaded: ${totalImages}`);
}

uploadAssets().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
