import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const bundlePath = path.join(projectRoot, "data/ielts/past-papers.json");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env.seed.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase upload configuration.");
}

const sourceRoot = path.resolve(
  process.env.IELTS_PAST_PAPER_SOURCE_ROOT ?? "/Volumes/My HDD3/备课/IELTS/历年真题",
);
const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const records = bundle.records.filter((record) => record.audioStatus === "available");
const files = records.map((record) => {
  const localPath = path.join(sourceRoot, record.audioSourceFile);
  if (!existsSync(localPath) || statSync(localPath).size === 0) {
    throw new Error(`Missing local audio for ${record.sourceId}: ${localPath}`);
  }
  return { localPath, record };
});

async function uploadOne({ localPath, record }) {
  const { error } = await supabase.storage.from("audio").upload(
    record.audioPath,
    readFileSync(localPath),
    {
      contentType: record.audioMimeType,
      upsert: true,
    },
  );
  if (error) {
    throw new Error(`Upload failed for ${record.sourceId}: ${error.message}`);
  }
}

async function main() {
  const batchSize = 4;
  let uploaded = 0;
  for (let index = 0; index < files.length; index += batchSize) {
    await Promise.all(files.slice(index, index + batchSize).map(uploadOne));
    uploaded += Math.min(batchSize, files.length - index);
    console.log(`uploaded ${uploaded}/${files.length}`);
  }
  console.log(JSON.stringify({ uploaded, skipped: bundle.records.length - records.length }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
