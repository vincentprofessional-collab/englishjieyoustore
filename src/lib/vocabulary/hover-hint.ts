import type { LocalVocabularyHint } from "./local-vocabulary";

const requests = new Map<string, Promise<LocalVocabularyHint | null>>();

export function loadVocabularyHoverHint(word: string): Promise<LocalVocabularyHint | null> {
  const key = word.trim().toLowerCase();
  const cached = requests.get(key);
  if (cached) return cached;

  const request = fetch(`/api/vocabulary-hint?word=${encodeURIComponent(key)}`)
    .then(async (response) => {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Vocabulary lookup failed");
      const payload = await response.json() as { hint?: LocalVocabularyHint | null };
      return payload.hint ?? null;
    })
    .catch(() => {
      requests.delete(key);
      return null;
    });
  requests.set(key, request);
  return request;
}
