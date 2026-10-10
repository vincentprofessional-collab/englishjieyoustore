const PART_OF_SPEECH = /^(?:phr\.\s*v\.|modal\s+v\.|[a-z]+\.)\s*/i;

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

export function maskStudyExample(english: string, chinese: string, word: string, inflections: string[], definition: string) {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const forms = [...new Set([word, ...inflections].flatMap((value) => value.split(/[,;；/|]/)).map((value) => value.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  const maskedEnglish = forms.length
    ? english.replace(new RegExp(`(^|[^a-z])(?:${forms.map(escape).join("|")})(?=$|[^a-z])`, "gi"), "$1______")
    : english;
  const meanings = definition.replace(/\\n/g, "\n").split(/\n+|\s*\/\s*(?=[a-z]+\.)|[；;、，,]/i)
    .map((value) => cleanMeaning(value.trim().replace(PART_OF_SPEECH, "")).replace(/[（(][^）)]*[）)]/g, "").trim())
    .filter((value) => /^[\u3400-\u9fff]+$/.test(value));
  const candidates = [...new Set(meanings.flatMap((value) => [value, value.replace(/[的地]$/, "")]).filter(Boolean))].sort((a, b) => b.length - a.length);
  const maskedChinese = candidates.length ? chinese.replace(new RegExp(candidates.map(escape).join("|"), "g"), "______") : chinese;
  return {
    english: maskedEnglish,
    // A paraphrased translation has no reliable dictionary-span alignment.
    // Hide it instead of leaking the answer or guessing which text to replace.
    chinese: maskedChinese !== chinese ? maskedChinese : "______",
    matched: maskedEnglish !== english,
  };
}
