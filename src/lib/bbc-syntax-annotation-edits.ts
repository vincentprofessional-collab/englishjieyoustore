import type { BbcSyntaxSentenceData, BbcSyntaxSpan } from "@/components/bbc-syntax-sentence";

export type BbcSyntaxSentenceEdit = Pick<BbcSyntaxSentenceData, "text" | "level1" | "level2">;

function normalizeSpans(value: unknown, tokenCount: number): BbcSyntaxSpan[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const spans: BbcSyntaxSpan[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const item = candidate as Record<string, unknown>;
    const label = typeof item.label === "string" ? item.label.trim().slice(0, 80) : "";
    const start = Number(item.start);
    const end = Number(item.end);
    if (!label || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > tokenCount) return null;
    spans.push({ label, start, end });
  }

  spans.sort((left, right) => left.start - right.start || left.end - right.end);
  return spans;
}

function normalizeTokens(value: unknown, canonical: BbcSyntaxSentenceData["tokens"]): BbcSyntaxSentenceData["tokens"] | null {
  if (value === undefined) return canonical;
  if (!Array.isArray(value) || value.length !== canonical.length) return null;
  const tokens: BbcSyntaxSentenceData["tokens"] = [];
  for (let index = 0; index < canonical.length; index += 1) {
    const candidate = value[index];
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const item = candidate as Record<string, unknown>;
    const base = canonical[index];
    const pos = typeof item.pos === "string" ? item.pos : "";
    if (item.text !== base.text || item.start !== base.start || item.end !== base.end || !/^[A-Z][A-Z0-9_]{0,15}$/.test(pos)) return null;
    tokens.push({ ...base, pos });
  }
  return tokens;
}

export function normalizeBbcSyntaxSentenceEdits(
  value: unknown,
  canonical: BbcSyntaxSentenceData[],
): BbcSyntaxSentenceData[] | null {
  if (!Array.isArray(value) || value.length !== canonical.length) return null;

  const result: BbcSyntaxSentenceData[] = [];
  for (let index = 0; index < canonical.length; index += 1) {
    const base = canonical[index];
    const candidate = value[index];
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const item = candidate as Record<string, unknown>;
    if (item.text !== base.text) return null;

    const level1 = normalizeSpans(item.level1, base.tokens.length);
    const level2 = normalizeSpans(item.level2, base.tokens.length);
    const tokens = normalizeTokens(item.tokens, base.tokens);
    if (!level1 || !level2 || !tokens) return null;
    if (level1.some((span, spanIndex) => spanIndex > 0 && span.start < level1[spanIndex - 1].end)) return null;
    if (level2.some((span) => !level1.some((parent) => span.start >= parent.start && span.end <= parent.end))) return null;

    result.push({ ...base, tokens, level1, level2 });
  }

  return result;
}
