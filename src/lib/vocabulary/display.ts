const PART_OF_SPEECH_PATTERN =
  /^(?:interj|modal|abbr|prep|pron|conj|adj|adv|aux|det|num|art|int|vi|vt|pl|n|v)\b\.?\s*/i;

export function cleanVocabularyDefinition(value: string) {
  return value
    .split(/\s*\/\s*/)
    .map((item) => item.replace(PART_OF_SPEECH_PATTERN, "").trim())
    .filter(Boolean)
    .join(" / ");
}

export function cleanPartOfSpeech(value?: string) {
  return value?.replace(/\s+/g, "").trim() ?? "";
}
