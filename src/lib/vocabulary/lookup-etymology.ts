import "server-only";

import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";

export type VocabularyLookupEtymology = {
  chinese: string;
  english: string;
};

const etymologyIndexes = new Map<string, Record<string, VocabularyLookupEtymology>>();

function getEtymologyIndex(letter: string) {
  if (!etymologyIndexes.has(letter)) {
    const dataPath = resolve(process.cwd(), "src/data/vocabulary/lookup-etymology", `${letter}.json.gz`);
    etymologyIndexes.set(letter, JSON.parse(gunzipSync(readFileSync(dataPath)).toString("utf8")) as Record<string, VocabularyLookupEtymology>);
  }
  return etymologyIndexes.get(letter)!;
}

export function getVocabularyLookupEtymology(word: string): VocabularyLookupEtymology | null {
  const key = word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
  if (!key) return null;
  return getEtymologyIndex(key[0])[key] ?? null;
}
