const PART_OF_SPEECH = /^(?:phr\.\s*v\.|modal\s+v\.|[a-z]+\.)\s*/i;

export function getStudyPhonetic(word: { phonetic?: string; ukPhonetic?: string; usPhonetic?: string }, voice: "us" | "uk") {
  return (voice === "us" ? word.usPhonetic : word.ukPhonetic)?.trim() || word.phonetic?.trim() || "";
}
const CHINESE_CLOZE_SYNONYMS: Record<string, string[]> = {
  "害怕": ["怕"],
  "恐怕": ["怕"],
  "担心": ["怕"],
};

function cleanMeaning(value: string) {
  return value.replace(/\[[^\]]*\]/g, "")
    .replace(/[（(][^）)]*(?:形式|分词|过去式|复数)[^）)]*[）)]/g, "")
    .replace(/\s+/g, " ").trim();
}

export function getConciseStudyDefinition(value: string) {
  return value.replace(/\\n/g, "\n")
    .split(/\n+|\s*\/\s*(?=(?:phr\.\s*v\.|modal\s+v\.|[a-z]+\.)\s)/i)
    .map((line) => line.trim())
    .map((line) => {
      const prefix = line.match(PART_OF_SPEECH)?.[0].trim() ?? "";
      const meanings = line.slice(prefix.length).split(/[；;]/).map(cleanMeaning).filter(Boolean).slice(0, 2);
      return [prefix, meanings.join("；")].filter(Boolean).join(" ");
    }).filter(Boolean).join("\n");
}

export function getDefinitionOptionText(value: string) {
  const groups = new Map<string, string>();
  const lines = getConciseStudyDefinition(value)
    .split(/\n+|\s+(?=(?:n|v|vt|vi|adj|adv|pron|prep|conj|int|art|num|aux)\.\s)/i);
  for (const line of lines) {
    const prefix = line.match(PART_OF_SPEECH)?.[0].trim() ?? "";
    const part = /^(?:v|vt|vi|modal\s+v|phr\.\s*v)\.$/i.test(prefix) ? "v."
      : /^(?:a|s|adj)\.$/i.test(prefix) ? "adj."
      : /^(?:r|ad|adv)\.$/i.test(prefix) ? "adv." : prefix;
    const meaning = line.slice(prefix.length).split(/[；;]/)[0]?.trim();
    if (!meaning || groups.has(part)) continue;
    // Dictionary order puts the main senses first; verb variants share one part of speech.
    groups.set(part, [part, meaning].filter(Boolean).join(" "));
    if (groups.size === 2) break;
  }
  return [...groups.values()].join("\n");
}

export function maskStudyExample(english: string, chinese: string, word: string, inflections: string[], definition: string) {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const forms = [...new Set([word, ...inflections].flatMap((value) => value.split(/[,;；/|]/)).map((value) => value.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  const maskedEnglish = forms.length
    ? english.replace(new RegExp(`(^|[^a-z])(?:${forms.map(escape).join("|")})(?=$|[^a-z])`, "gi"), "$1______")
    : english;
  const meanings = definition.replace(/\\n/g, "\n").split(/\n+|\s*\/\s*(?=[a-z]+\.)|[；;、，,]/i)
    .map((value) => cleanMeaning(value.trim().replace(PART_OF_SPEECH, "")).replace(/[（(][^）)]*[）)]/g, "").trim())
    .filter((value) => /^[\u3400-\u9fff]+$/.test(value));
  const candidates = [...new Set(meanings.flatMap((value) => {
    const normalized = value.replace(/[的地]$/, "");
    return [value, normalized, ...(CHINESE_CLOZE_SYNONYMS[normalized] ?? [])];
  }).filter(Boolean))].sort((a, b) => b.length - a.length);
  const maskedChinese = candidates.length ? chinese.replace(new RegExp(candidates.map(escape).join("|"), "g"), "______") : chinese;
  return {
    english: maskedEnglish,
    // Keep the source translation when its wording has no exact meaning span.
    chinese: maskedChinese,
    matched: maskedEnglish !== english,
  };
}

export function compareStudyExamples(
  left: { chinese: string; english: string; sourceType: string },
  right: { chinese: string; english: string; sourceType: string },
) {
  return Number(right.sourceType === "workbook") - Number(left.sourceType === "workbook")
    || Number(!left.chinese.trim()) - Number(!right.chinese.trim())
    || left.english.trim().split(/\s+/).filter(Boolean).length - right.english.trim().split(/\s+/).filter(Boolean).length
    || left.english.length - right.english.length;
}
