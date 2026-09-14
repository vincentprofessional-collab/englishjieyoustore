import fs from "node:fs";
import path from "node:path";
import type { SatCatalogIndex, SatSet } from "./types";

const SAT_PUBLIC_ROOT = path.join(process.cwd(), "public", "sat");

export function getSatCatalogIndex(): SatCatalogIndex {
  return JSON.parse(fs.readFileSync(path.join(SAT_PUBLIC_ROOT, "index.json"), "utf8")) as SatCatalogIndex;
}

export function getSatSet(setId: string): SatSet | null {
  const filePath = path.join(SAT_PUBLIC_ROOT, "sets", `${setId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as SatSet;
}
