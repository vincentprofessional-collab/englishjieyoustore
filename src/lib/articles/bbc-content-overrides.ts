import type { BbcVocabularyItem } from "@/lib/articles/bbc";

export type BbcArticleContentOverride = {
  chineseParagraphs?: string[];
  titleChinese?: string;
  vocabulary?: BbcVocabularyItem[];
};

export function getBbcArticleContentOverride(metaJson: unknown): BbcArticleContentOverride | null {
  if (!metaJson || typeof metaJson !== "object") {
    return null;
  }

  const meta = metaJson as Record<string, unknown>;
  const hasOverride = ["chineseParagraphs", "titleChinese", "vocabulary"].some((key) =>
    Object.prototype.hasOwnProperty.call(meta, key),
  );

  if (!hasOverride) {
    return null;
  }

  return {
    chineseParagraphs:
      Array.isArray(meta.chineseParagraphs) && meta.chineseParagraphs.every((item) => typeof item === "string")
        ? meta.chineseParagraphs
        : undefined,
    titleChinese: typeof meta.titleChinese === "string" ? meta.titleChinese : undefined,
    vocabulary: Array.isArray(meta.vocabulary) ? (meta.vocabulary as BbcVocabularyItem[]) : undefined,
  };
}
