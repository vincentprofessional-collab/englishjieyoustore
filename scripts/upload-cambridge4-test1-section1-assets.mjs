import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();
const sourceDir = "/Volumes/My HDD3/备课/IELTS/剑桥雅思/剑桥雅思4/test1";
const sentenceAudioDir = path.join(sourceDir, "4test1_section1小音频");

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

async function uploadFile(localPath, storagePath) {
  const file = readFileSync(localPath);
  const { error } = await supabase.storage.from("audio").upload(storagePath, file, {
    contentType: "audio/mpeg",
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload failed for ${storagePath}: ${error.message}`);
  }
}

async function uploadAssets() {
  const fullAudioLocalPath = path.join(sourceDir, "4test1_section1.mp3");
  await uploadFile(fullAudioLocalPath, "listening/ci4/t1/s1/full.mp3");

  const sentenceFiles = (await readdir(sentenceAudioDir))
    .filter((fileName) => /^\d{3}\.mp3$/.test(fileName))
    .sort();

  for (const fileName of sentenceFiles) {
    const sentenceNo = fileName.replace(".mp3", "");
    await uploadFile(
      path.join(sentenceAudioDir, fileName),
      `listening/ci4/t1/s1/sentences/ci4_t1_s1_${sentenceNo}.mp3`,
    );
  }

  console.log("Listening assets uploaded.");
  console.log("Full audio: listening/ci4/t1/s1/full.mp3");
  console.log(`Sentence audio files: ${sentenceFiles.length}`);
}

uploadAssets().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
