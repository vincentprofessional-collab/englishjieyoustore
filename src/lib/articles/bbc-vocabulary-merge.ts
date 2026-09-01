import type { BbcVocabularyItem } from "@/lib/articles/bbc";

export function normalizeBbcVocabularyTerm(value: string) {
  return value
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/[（(]\s*(?:短语|phrase)\s*[）)]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getBbcVocabularyMergeKey(item: BbcVocabularyItem) {
  const source = normalizeBbcVocabularyTerm(item.lemma || item.term);
  const headword = source
    .replace(/\.{3}|…/g, " ")
    .match(/^[a-z]+(?:['’][a-z]+)?(?:[-\s]+[a-z]+(?:['’][a-z]+)?)*/)?.[0]
    ?.replace(/\s+/g, " ")
    .trim();
  return headword || source;
}

export function mergeBbcVocabularyItems(
  baseItems: BbcVocabularyItem[] | undefined,
  additionalItems: BbcVocabularyItem[] | undefined,
) {
  const merged: BbcVocabularyItem[] = [];
  const itemIndexes = new Map<string, number>();

  for (const item of [...(baseItems ?? []), ...(additionalItems ?? [])]) {
    const key = getBbcVocabularyMergeKey(item);

    if (!key) {
      continue;
    }

    const existingIndex = itemIndexes.get(key);

    if (existingIndex == null) {
      itemIndexes.set(key, merged.length);
      merged.push({ ...item, number: merged.length + 1 });
      continue;
    }

    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...item,
      ...existing,
      definition: existing.definition || item.definition,
      entry: existing.entry || item.entry,
      example: existing.example || item.example,
      highlightTerm: existing.highlightTerm || item.highlightTerm,
      lemma: existing.lemma || item.lemma,
      number: existing.number,
      partOfSpeech: existing.partOfSpeech || item.partOfSpeech,
      phonetic: existing.phonetic || item.phonetic,
      sourceLevel: existing.sourceLevel || item.sourceLevel,
      translation: existing.translation || item.translation,
      ukPhonetic: existing.ukPhonetic || item.ukPhonetic,
      usPhonetic: existing.usPhonetic || item.usPhonetic,
    };
  }

  return merged.map((item, index) => ({ ...item, number: index + 1 }));
}
