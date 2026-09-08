import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const bundle = JSON.parse(
  readFileSync(path.join(projectRoot, "data/ielts/past-papers.json"), "utf8"),
);

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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");

function audioUrl(storagePath) {
  const encodedPath = storagePath.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${supabaseUrl}/storage/v1/object/public/audio/${encodedPath}`;
}

const records = bundle.records.filter((record) => record.audioStatus === "available");
const failures = [];
for (let index = 0; index < records.length; index += 8) {
  await Promise.all(
    records.slice(index, index + 8).map(async (record) => {
      const response = await fetch(audioUrl(record.audioPath), { method: "HEAD" });
      const contentType = response.headers.get("content-type") ?? "";
      if (response.status !== 200 || !contentType.toLowerCase().startsWith("audio/")) {
        failures.push({
          sourceId: record.sourceId,
          status: response.status,
          contentType,
        });
      }
    }),
  );
}

console.log(
  JSON.stringify({
    checked: records.length,
    failures: failures.length,
    failureIds: failures.map((failure) => failure.sourceId),
  }),
);
if (failures.length) process.exitCode = 1;
