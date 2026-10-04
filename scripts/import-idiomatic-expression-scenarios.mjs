import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [sourcePath] = process.argv.slice(2);
if (!sourcePath) {
  throw new Error("Usage: node scripts/import-idiomatic-expression-scenarios.mjs /path/to/地道表达.md");
}

const source = await readFile(resolve(sourcePath), "utf8");
const lines = source.split(/\r?\n/u).filter((line) => line.startsWith("|"));
const records = lines.slice(2).map((line, index) => {
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  if (cells.length !== 13 || !cells[1]) {
    throw new Error(`Invalid table row ${index + 3}: expected 13 columns and a phrase`);
  }

  const dialogue = cells[10]
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<[^>]*>/gu, "")
    .replace(/&amp;/giu, "&")
    .split(/\n/u)
    .map((part) => part.trim())
    .filter(Boolean);
  let context = "";
  let example = "";
  let translation = "";
  let activeSpeaker = "";
  for (const part of dialogue) {
    const scene = part.match(/^(?:场景|情景)\s*[：:]\s*(.+)$/u);
    const speaker = part.match(/^([AB])\s*[：:]\s*(.+)$/u);
    const translated = part.match(/^(?:翻译|译文)\s*[：:]\s*(.+)$/u);
    if (scene) context = scene[1].trim();
    else if (speaker) {
      activeSpeaker = speaker[1];
      if (activeSpeaker === "B") example = speaker[2].trim();
    } else if (translated) {
      if (activeSpeaker === "B") translation = translated[1].trim();
      activeSpeaker = "";
    }
  }

  if (!context || !example || !translation) {
    throw new Error(`Incomplete usage scenario for “${cells[1]}” on table row ${index + 3}`);
  }

  return [cells[1].trim().toLowerCase(), { context, translation, example }];
});

const scenarios = Object.fromEntries(records);
if (Object.keys(scenarios).length !== records.length) {
  throw new Error("Duplicate phrase keys found; refusing to overwrite a scenario");
}

const outputPath = resolve("src/data/vocabulary/idiomatic-expression-scenarios.json");
await writeFile(outputPath, `${JSON.stringify(scenarios)}\n`);
console.log(`Imported ${records.length} usage scenarios to ${outputPath}`);
