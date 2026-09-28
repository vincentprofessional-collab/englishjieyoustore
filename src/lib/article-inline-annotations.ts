export const ARTICLE_INLINE_SOURCE_TYPES = ["bbc", "new-concept", "ielts-reading"] as const;

export type ArticleInlineSourceType = (typeof ARTICLE_INLINE_SOURCE_TYPES)[number];
export type ArticleInlineLineStyle = "solid" | "dashed" | "wavy" | "thick";

export type ArticleInlineAnnotation = {
  end: number;
  id: string;
  label: string;
  partOfSpeech: string;
  selectedText: string;
  start: number;
  style: ArticleInlineLineStyle;
  unitId: string;
};

export type ArticleInlineTextUnit = {
  id: string;
  label: string;
  text: string;
};

export type ArticleInlineSourceDocument = {
  href: string;
  id: string;
  title: string;
  units: ArticleInlineTextUnit[];
};

export type ArticleInlineSourceSummary = {
  href: string;
  id: string;
  label: string;
  title: string;
};

export type ArticleSentenceSegment = { end: number; index: number; start: number; text: string };

export function splitArticleSentences(text: string): ArticleSentenceSegment[] {
  const segments: ArticleSentenceSegment[] = [];
  const sentenceEnd = /[.!?]+(?:["'’”」』)\]]*)?(?=\s|$)/g;
  const commonAbbreviation = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|a\.m|p\.m|e\.g|i\.e)\.$/i;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = sentenceEnd.exec(text)) !== null) {
    const end = sentenceEnd.lastIndex;
    const candidate = text.slice(cursor, end).trim();
    if (!candidate || (match[0].includes(".") && commonAbbreviation.test(candidate))) continue;

    let start = cursor;
    while (start < end && /\s/.test(text[start])) start += 1;
    if (start < end) {
      segments.push({ end, index: segments.length, start, text: text.slice(start, end) });
      cursor = end;
    }
  }

  let tailStart = cursor;
  while (tailStart < text.length && /\s/.test(text[tailStart])) tailStart += 1;
  if (tailStart < text.length) {
    segments.push({ end: text.length, index: segments.length, start: tailStart, text: text.slice(tailStart) });
  }
  return segments.length ? segments : [{ end: text.length, index: 0, start: 0, text }];
}

export function isArticleInlineSourceType(value: unknown): value is ArticleInlineSourceType {
  return ARTICLE_INLINE_SOURCE_TYPES.includes(value as ArticleInlineSourceType);
}

export function isArticleInlineLineStyle(value: unknown): value is ArticleInlineLineStyle {
  return value === "solid" || value === "dashed" || value === "wavy" || value === "thick";
}

export function normalizeArticleInlineAnnotations(
  value: unknown,
  units: ArticleInlineTextUnit[],
): ArticleInlineAnnotation[] | null {
  if (!Array.isArray(value) || value.length > 2_000) return null;

  const unitTextById = new Map(units.map((unit) => [unit.id, unit.text]));
  const normalized: ArticleInlineAnnotation[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const item = candidate as Record<string, unknown>;
    const unitId = typeof item.unitId === "string" ? item.unitId : "";
    const text = unitTextById.get(unitId);
    const start = Number(item.start);
    const end = Number(item.end);
    const selectedText = typeof item.selectedText === "string" ? item.selectedText : "";
    const label = typeof item.label === "string" ? item.label.trim().slice(0, 160) : "";
    const partOfSpeech = typeof item.partOfSpeech === "string" ? item.partOfSpeech.trim().slice(0, 48) : "";

    if (
      !text ||
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end <= start ||
      end > text.length ||
      text.slice(start, end) !== selectedText ||
      !selectedText.trim() ||
      !label ||
      !isArticleInlineLineStyle(item.style)
    ) {
      return null;
    }

    normalized.push({
      end,
      id: typeof item.id === "string" && item.id.trim() ? item.id.trim().slice(0, 80) : crypto.randomUUID(),
      label,
      partOfSpeech,
      selectedText,
      start,
      style: item.style,
      unitId,
    });
  }

  normalized.sort((left, right) => left.unitId.localeCompare(right.unitId) || left.start - right.start);
  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    if (previous.unitId === current.unitId && current.start < previous.end) return null;
  }

  return normalized;
}
