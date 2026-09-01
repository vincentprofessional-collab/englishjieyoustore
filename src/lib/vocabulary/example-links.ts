import type { VocabularyUsageExample } from "./examples";

export function getVocabularyExampleHref(example: VocabularyUsageExample) {
  if (example.sourceType === "article") {
    return `/articles/${encodeURIComponent(example.sourceId)}#bbc-sentence-${example.sentenceNo}`;
  }

  if (example.sourceType === "listening") {
    return `/listening/${encodeURIComponent(example.sourceId)}?mode=practice&review=1#transcript-sentence-${example.sentenceNo}`;
  }

  return null;
}
