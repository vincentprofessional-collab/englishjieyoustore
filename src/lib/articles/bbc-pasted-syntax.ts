import type { BbcSyntaxSentenceData, BbcSyntaxSpan } from "@/components/bbc-syntax-sentence";

export type PastedBbcSyntaxSentence = {
  sentenceNo: number;
  text: string;
  items: { term: string; description: string }[];
  main: string;
};

const SECTION_HEADING = /^##\s*句\s*(\d+)\s*$/;
const SYNTAX_TITLE = /^#\s*全文逐句词性\s*[+＋]\s*句子成分标注\s*$/im;
const FOLLOWING_CONTENT_HEADING = /^(?:#{1,6}\s*)?(?:重点\s*)?(?:词汇(?:表|与短语|和短语|及短语)?|短语|Vocabulary(?:\s+(?:and|&)\s+phrases)?)\s*[:：]?\s*$/im;
const ROLE_NAMES = ["主语", "谓语", "宾语从句", "宾语", "宾补", "宾语补足语", "表语从句", "表语", "定语从句", "定语", "状语", "同位语", "补语"];

function normalizeText(value: string) {
  return value.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

function canonicalRole(value: string) {
  if (value === "宾语补足语") return "宾补";
  if (value === "主") return "主语";
  if (value === "谓") return "谓语";
  if (value === "宾") return "宾语";
  return value;
}

function rolesIn(description: string) {
  const found = new Set<string>();
  const positiveDescription = description.replace(/非谓语/g, "");
  for (const role of ROLE_NAMES) {
    if (positiveDescription.includes(role)) found.add(canonicalRole(role));
  }
  return [...found].filter((role) => ![...found].some((other) => other !== role && other.includes(role)));
}

function sentenceWordKey(value: string) {
  return (value.toLowerCase().replace(/[‘’]/g, "'").match(/[a-z0-9]+(?:'[a-z0-9]+)*/g) ?? []).join(" ");
}

function posCode(description: string) {
  const value = description.trim();
  if (/助动词|情态动词/.test(value)) return "AUX";
  if (/不定式符号|小品词/.test(value)) return "PART";
  if (/专有名词|头衔专有名词/.test(value)) return "PROPN";
  if (/物主代词/.test(value)) return "DET";
  if (/连接代词|疑问代词|代词/.test(value)) return "PRON";
  if (/冠词|限定词/.test(value)) return "DET";
  if (/数词/.test(value)) return "NUM";
  if (/感叹词/.test(value)) return "INTJ";
  if (/介词/.test(value)) return "ADP";
  if (/并列连词/.test(value)) return "CCONJ";
  if (/连词|连接词/.test(value)) return "SCONJ";
  if (/副词/.test(value)) return "ADV";
  if (/形容词/.test(value)) return "ADJ";
  if (/动名词/.test(value)) return "NOUN";
  if (/名词/.test(value)) return "NOUN";
  if (/动词|现在分词|过去分词/.test(value)) return "VERB";
  return null;
}

function posLabel(description: string) {
  return description.replace(/[（(].*?[）)]/g, "").replace(/\s+/g, " ").trim().slice(0, 32);
}

function findTermRange(text: string, term: string, from: number) {
  const source = normalizeText(text).toLowerCase();
  const target = normalizeText(term).toLowerCase();
  if (!target || target.includes("...") || target.includes("…")) return null;
  const start = source.indexOf(target, from);
  return start < 0 ? null : { start, end: start + target.length };
}

function indexesForRange(tokens: BbcSyntaxSentenceData["tokens"], range: { start: number; end: number }) {
  const indexes: number[] = [];
  tokens.forEach((token, index) => {
    if (token.pos !== "PUNCT" && token.start < range.end && token.end > range.start) indexes.push(index);
  });
  return indexes;
}

function appendSummarySpans(text: string, tokens: BbcSyntaxSentenceData["tokens"], main: string) {
  const spans: BbcSyntaxSpan[] = [];
  const marked = /([^【】]+?)【([^】]+)】/g;
  let cursor = 0;
  for (const match of main.matchAll(marked)) {
    const phrase = match[1].trim();
    const role = rolesIn(match[2])[0] ?? canonicalRole(match[2].trim());
    const range = findTermRange(text, phrase, cursor);
    if (!range) continue;
    cursor = range.end;
    const indexes = indexesForRange(tokens, range);
    if (indexes.length) spans.push({ label: role, start: indexes[0], end: indexes.at(-1)! + 1 });
  }
  return spans;
}

export function parsePastedBbcSyntaxBlock(value: string) {
  const normalized = value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const title = SYNTAX_TITLE.exec(normalized);
  const heading = /^##\s*句\s*\d+\s*$/m.exec(normalized);
  const start = title?.index ?? heading?.index;
  if (start === undefined) return { articleText: value, sentences: [] as PastedBbcSyntaxSentence[] };

  const remainder = normalized.slice(start);
  const followingHeading = FOLLOWING_CONTENT_HEADING.exec(remainder);
  const blockEnd = followingHeading?.index ?? remainder.length;
  const block = remainder.slice(0, blockEnd);
  const articleText = [normalized.slice(0, start).trim(), remainder.slice(blockEnd).trim()]
    .filter(Boolean)
    .join("\n\n");
  const sections = block.split(/(?=^##\s*句\s*\d+\s*$)/m);
  const sentences: PastedBbcSyntaxSentence[] = [];
  for (const section of sections) {
    const lines = section.split("\n");
    const sectionHeading = lines[0]?.trim().match(SECTION_HEADING);
    if (!sectionHeading) continue;
    const textIndex = lines.findIndex((line, index) => index > 0 && line.trim());
    if (textIndex < 0) continue;
    const text = lines[textIndex].trim();
    const items: PastedBbcSyntaxSentence["items"] = [];
    let main = "";
    for (const rawLine of lines.slice(textIndex + 1)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^>\s*主干\s*[:：]/.test(line)) {
        main = line.replace(/^>\s*主干\s*[:：]\s*/, "");
        continue;
      }
      const separator = line.search(/[：:]/);
      if (separator <= 0) continue;
      items.push({ term: line.slice(0, separator).trim().replace(/^[-*]\s*/, ""), description: line.slice(separator + 1).trim() });
    }
    if (items.length) sentences.push({ sentenceNo: Number(sectionHeading[1]), text, items, main });
  }
  return sentences.length ? { articleText, sentences } : { articleText: value, sentences: [] as PastedBbcSyntaxSentence[] };
}

export function applyPastedBbcSyntax(
  automatic: BbcSyntaxSentenceData,
  annotations: PastedBbcSyntaxSentence[],
  sentenceNo?: number,
): BbcSyntaxSentenceData {
  const annotation = sentenceNo == null
    ? annotations.find((item) => sentenceWordKey(item.text) === sentenceWordKey(automatic.text))
    : annotations.find((item) => item.sentenceNo === sentenceNo);
  if (!annotation || sentenceWordKey(annotation.text) !== sentenceWordKey(automatic.text)) return automatic;

  const tokens = automatic.tokens.map((token) => ({ ...token }));
  const componentRows: { label: string; start: number; end: number }[] = [];
  let cursor = 0;
  for (const item of annotation.items) {
    const range = findTermRange(automatic.text, item.term, cursor);
    if (!range) return automatic;
    cursor = range.end;
    const indexes = indexesForRange(tokens, range);
    if (!indexes.length) continue;
    const code = posCode(item.description);
    if (code) indexes.forEach((index) => {
      tokens[index].pos = code;
      tokens[index].posLabel = posLabel(item.description);
    });
    for (const label of rolesIn(item.description)) {
      componentRows.push({ label, start: indexes[0], end: indexes.at(-1)! + 1 });
    }
  }

  const summarySpans = appendSummarySpans(automatic.text, tokens, annotation.main);
  const level2: BbcSyntaxSpan[] = [];
  for (const row of componentRows) {
    if (!level2.some((span) => span.label === row.label && span.end === row.start)) {
      level2.push({ ...row });
    } else {
      const previous = [...level2].reverse().find((span) => span.label === row.label && span.end === row.start)!;
      previous.end = row.end;
    }
  }
  return {
    ...automatic,
    tokens,
    level1: summarySpans.length ? summarySpans : automatic.level1,
    level2: level2.length ? level2 : automatic.level2,
    status: "reviewed",
  };
}
