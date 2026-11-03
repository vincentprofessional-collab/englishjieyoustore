export function normalizeVocabularyAudioKey(word: string) {
  const normalized = word.trim().normalize("NFC").toLowerCase();
  if (!normalized) return "";
  if (normalized === "café") return "cafe-accent";

  return normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-']+|[-']+$/g, "");
}
