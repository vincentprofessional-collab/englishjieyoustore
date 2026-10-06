import synonymData from "@/data/vocabulary/synonym-distinctions.json";

export type VocabularySynonymDistinction = {
  terms: string[];
  summary: string;
  entries: Array<{ term: string; distinction: string; details: string[] }>;
  notes: string[];
};

type SynonymDistinctionData = { groups: VocabularySynonymDistinction[] };

function normalizeTerm(term: string) {
  return term
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’]/gu, "'")
    .replace(/[‐‑‒–—]/gu, "-")
    .replace(/\s+/gu, " ")
    .replace(/^[\s"'“”‘’()[\]{}]+|[\s"'“”‘’()[\]{}.,;:!?]+$/gu, "")
    .trim();
}

const groups = (synonymData as SynonymDistinctionData).groups;
const groupIndex = new Map<string, number[]>();

groups.forEach((group, index) => {
  const terms = new Set([...group.terms, ...group.entries.map((entry) => entry.term)].map(normalizeTerm));
  terms.forEach((term) => {
    if (!term) return;
    const indexes = groupIndex.get(term) ?? [];
    indexes.push(index);
    groupIndex.set(term, indexes);
  });
});

export function getVocabularySynonymDistinctions(words: string | string[]) {
  const matches = new Set<number>();
  (Array.isArray(words) ? words : [words]).forEach((word) => {
    groupIndex.get(normalizeTerm(word))?.forEach((index) => matches.add(index));
  });
  return [...matches].sort((left, right) => left - right).map((index) => groups[index]);
}
