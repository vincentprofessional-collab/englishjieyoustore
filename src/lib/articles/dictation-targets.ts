export type DictationVocabularyCandidate = {
  definition?: string;
  level?: string;
  partOfSpeech?: string;
  term: string;
};

export type DictationWordMetadata = {
  isTechnical?: boolean;
  level?: string;
  partOfSpeech?: string;
};

const explicitTechnicalTermPattern =
  /(?:专业术语|技术术语|专门术语|术语词条|technical\s+(?:term|terminology|vocabulary)|specialist\s+(?:term|terminology)|专有名词)/i;
const technicalDomainPattern =
  /(?:\(|（|【|\[)\s*(?:医学|生物(?:学)?|物理(?:学)?|化学|计算机|法律|法学|语言学|经济学|数学|工程|天文学|地质学|生态学|金融|统计学|心理学|medicine|biology|physics|chemistry|computing|law|linguistics|economics|mathematics|engineering|astronomy|geology|ecology|finance|statistics|psychology)(?:术语|term)?\s*(?:\)|）|】|\])/i;

export function isLikelyTechnicalTerm(...values: Array<string | null | undefined>) {
  const metadata = values.filter(Boolean).join(" ");
  return explicitTechnicalTermPattern.test(metadata) || technicalDomainPattern.test(metadata);
}

export function createDictationWordMetadata(
  hints: Record<string, { definitionCn?: string; level?: string; partOfSpeech?: string }>,
): Record<string, DictationWordMetadata> {
  return Object.fromEntries(
    Object.entries(hints).map(([word, hint]) => [word.toLowerCase(), {
      isTechnical: isLikelyTechnicalTerm(hint.level, hint.partOfSpeech, hint.definitionCn),
      level: hint.level,
      partOfSpeech: hint.partOfSpeech,
    }]),
  );
}
