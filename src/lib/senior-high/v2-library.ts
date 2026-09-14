import fs from "node:fs";
import path from "node:path";
import type { SeniorHighLibraryEntry, SeniorHighLibraryIndex } from "./v2-types";

const INDEX_PATH = path.join(process.cwd(), "public", "senior-high", "index.json");
const HIDDEN_ENTRY_IDS = new Set(["practice-gaokao-application-writing-2000-2019"]);

export function getSeniorHighV2Index(): SeniorHighLibraryIndex {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as SeniorHighLibraryIndex;
  return { ...index, entries: index.entries.filter((entry) => !HIDDEN_ENTRY_IDS.has(entry.id)) };
}

export function getSeniorHighV2Entry(kind: SeniorHighLibraryEntry["kind"], id: string) {
  let decodedId = id;
  try {
    decodedId = decodeURIComponent(id);
  } catch {
    // Keep the original id when a caller has already supplied malformed encoding.
  }
  return getSeniorHighV2Index().entries.find((entry) => entry.kind === kind && (entry.id === id || entry.id === decodedId));
}
