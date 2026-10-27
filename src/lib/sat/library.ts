import fs from "node:fs";
import path from "node:path";
import type { SatCatalogIndex, SatKnowledgeIndex, SatPastPaperIndex, SatSet } from "./types";

const SAT_PUBLIC_ROOT = path.join(process.cwd(), "public", "sat");

export function getSatCatalogIndex(): SatCatalogIndex {
  return JSON.parse(fs.readFileSync(path.join(SAT_PUBLIC_ROOT, "index.json"), "utf8")) as SatCatalogIndex;
}

export function getSatKnowledgeIndex(): SatKnowledgeIndex {
  return JSON.parse(fs.readFileSync(path.join(SAT_PUBLIC_ROOT, "knowledge.json"), "utf8")) as SatKnowledgeIndex;
}

export function getSatSet(setId: string): SatSet | null {
  const filePath = path.join(SAT_PUBLIC_ROOT, "sets", `${setId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as SatSet;
}

export function getSatPastPaperIndex(): SatPastPaperIndex {
  return JSON.parse(fs.readFileSync(path.join(SAT_PUBLIC_ROOT, "papers", "index.json"), "utf8")) as SatPastPaperIndex;
}

export function getSatPastPaper(paperId: string): SatSet | null {
  const filePath = path.join(SAT_PUBLIC_ROOT, "papers", `${paperId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as SatSet;
}
