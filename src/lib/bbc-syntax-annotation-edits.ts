import type { BbcSyntaxLayerKey, BbcSyntaxSentenceData, BbcSyntaxSpan } from "@/components/bbc-syntax-sentence";

export type BbcSyntaxSentenceEdit = Pick<BbcSyntaxSentenceData, "text" | BbcSyntaxLayerKey>;

const SYNTAX_LEVELS = [1, 2, 3, 4, 5] as const;

function layerKey(level: (typeof SYNTAX_LEVELS)[number]): BbcSyntaxLayerKey {
  return `level${level}` as BbcSyntaxLayerKey;
}

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
    const pos = typeof item.pos === "string" ? item.pos.trim() : "";
    if (item.text !== base.text || item.start !== base.start || item.end !== base.end || !pos || pos.length > 32) return null;
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

    const layers = {} as Pick<BbcSyntaxSentenceData, BbcSyntaxLayerKey>;
    for (const level of SYNTAX_LEVELS) {
      const key = layerKey(level);
      const value = item[key] === undefined ? base[key] ?? [] : item[key];
      const spans = normalizeSpans(value, base.tokens.length);
      if (!spans) return null;
      layers[key] = spans;
    }
    // Older overrides do not contain newer depth fields. Carry over the
    // canonical parent span needed by any inherited child span.
    for (const level of SYNTAX_LEVELS.slice(0, -1)) {
      const childLevel = (level + 1) as (typeof SYNTAX_LEVELS)[number];
      if (item[layerKey(childLevel)] !== undefined) continue;
      const parentKey = layerKey(level);
      const parents = [...(layers[parentKey] ?? [])];
      for (const child of layers[layerKey(childLevel)] ?? []) {
        if (parents.some((parent) => child.start >= parent.start && child.end <= parent.end)) continue;
        const canonicalParent = (base[parentKey] ?? []).find((parent) =>
          child.start >= parent.start && child.end <= parent.end);
        if (canonicalParent && !parents.some((parent) => parent.start === canonicalParent.start && parent.end === canonicalParent.end)) {
          parents.push(canonicalParent);
        }
      }
      parents.sort((left, right) => left.start - right.start || left.end - right.end);
      layers[parentKey] = parents;
    }
    const level1 = layers.level1;
    const tokens = normalizeTokens(item.tokens, base.tokens);
    if (!tokens) return null;
    if (level1.some((span, spanIndex) => spanIndex > 0 && span.start < level1[spanIndex - 1].end)) return null;
    for (const level of SYNTAX_LEVELS.slice(1)) {
      const parents = layers[layerKey((level - 1) as (typeof SYNTAX_LEVELS)[number])] ?? [];
      const children = layers[layerKey(level)] ?? [];
      if (children.some((span) => !parents.some((parent) => span.start >= parent.start && span.end <= parent.end))) return null;
    }

    result.push({ ...base, tokens, ...layers });
  }

  return result;
}
