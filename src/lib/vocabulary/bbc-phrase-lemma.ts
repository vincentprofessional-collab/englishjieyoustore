const BBC_PHRASE_LEMMAS: Record<string, string> = {
  "aerobatic activity": "activity",
  "aerobatic activities": "activity",
  "zoning out": "zone out",
};

export function getBbcPhraseLemma(value: string) {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return BBC_PHRASE_LEMMAS[normalized] ?? value.trim();
}
