import fs from "node:fs";
import path from "node:path";
import type { SeniorHighLibraryEntry, SeniorHighLibraryIndex } from "./v2-types";

const INDEX_PATH = path.join(process.cwd(), "public", "senior-high", "index.json");

export function getSeniorHighV2Index(): SeniorHighLibraryIndex {
  return JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as SeniorHighLibraryIndex;
}

export function getSeniorHighV2Entry(kind: SeniorHighLibraryEntry["kind"], id: string) {
  return getSeniorHighV2Index().entries.find((entry) => entry.kind === kind && entry.id === id);
}
