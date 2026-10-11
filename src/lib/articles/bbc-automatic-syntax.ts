import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import referenceData from "@/data/bbc/2026-syntax.json";
import type { BbcSyntaxLayerKey, BbcSyntaxSentenceData, BbcSyntaxSpan } from "@/components/bbc-syntax-sentence";

export const BBC_SYNTAX_REFERENCE_IDS = ["260713", "260720", "260727"] as const;
const references = referenceData as Record<string, BbcSyntaxSentenceData[]>;
const referenceSentences = BBC_SYNTAX_REFERENCE_IDS.flatMap((id) => references[id]);
const nlp = winkNLP(model, ["sbd", "pos"]);
const key = (text: string) => text.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const exactReferences = new Map(referenceSentences.map((sentence) => [key(sentence.text), sentence]));
const clauseLabels = new Map<string, string>();
for (const sentence of referenceSentences) {
  for (const level of ["level1", "level2", "level3", "level4", "level5"] as BbcSyntaxLayerKey[]) {
    for (const span of sentence[level] ?? []) {
      if (span.label.endsWith("从句")) {
        const first = sentence.tokens[span.start]?.text.toLowerCase();
        if (first && !clauseLabels.has(first)) clauseLabels.set(first, span.label);
      }
    }
  }
}
const linkingVerbs = new Set(["be", "am", "is", "are", "was", "were", "been", "being", "seem", "seems", "seemed", "become", "becomes", "became", "feel", "feels", "felt", "look", "looks", "looked", "get", "gets", "getting", "got", "remain", "remains"]);
const participles = new Set(["read", "put", "set", "cut", "let", "hurt", "run", "hit", "seen", "done", "gone", "been", "known", "shown", "written", "taken", "given", "made", "found", "thought", "bought", "caught", "brought", "taught", "left", "felt", "kept", "held", "built", "sent", "spent", "lost", "paid", "sold", "told", "said", "stuck", "born", "broken", "chosen", "frozen", "grown", "flown", "worn", "driven", "eaten", "fallen", "forgotten"]);

export function buildAutomaticBbcSyntax(text: string): BbcSyntaxSentenceData {
  const known = exactReferences.get(key(text));
  if (known && known.text.length === text.length) return { ...structuredClone(known), text, tokens: known.tokens.map((token) => ({ ...token, text: text.slice(token.start, token.end) })) };
  const tokens: BbcSyntaxSentenceData["tokens"] = [];
  let cursor = 0;
  nlp.readDoc(text).tokens().each((token: { out: (helper: unknown) => string }) => {
    cursor += token.out(nlp.its.precedingSpaces).length;
    const value = token.out(nlp.its.value);
    const original = text.slice(cursor, cursor + value.length);
    if (key(original) !== key(value)) throw new Error("词性分词与原文不一致，请检查该句标点或特殊字符。");
    tokens.push({ text: original, pos: token.out(nlp.its.pos), start: cursor, end: cursor + value.length });
    cursor += value.length;
  });
  for (let i = 1; i < tokens.length; i++) {
    const previous = tokens[i - 1].text.toLowerCase();
    const value = tokens[i].text.toLowerCase();
    // A bare word after copular "be" is predicative, not an infinitive verb.
    if (tokens[i].pos === "VERB" && /^(?:be|am|is|are|was|were|been|being)$/.test(previous) && !/(?:ing|ed|en)$/.test(value) && !participles.has(value)) tokens[i].pos = "ADJ";
  }
  const data: BbcSyntaxSentenceData = { text, tokens, level1: [], level2: [], level3: [], level4: [], level5: [], status: "draft" };
  const word = (index: number) => tokens[index]?.text.toLowerCase() ?? "";
  const layers = (level: number) => data[`level${level}` as BbcSyntaxLayerKey]!;
  function add(level: number, label: string, start: number, end: number) {
    while (start < end && tokens[start].pos === "PUNCT") start++;
    while (end > start && tokens[end - 1].pos === "PUNCT") end--;
    if (end > start && level <= 5) layers(level).push({ label, start, end });
  }
  function clause(start: number, end: number, level: number) {
    if (level > 5 || start >= end) return;
    while (end > start && tokens[end - 1].pos === "PUNCT") end--;
    if (end <= start) return;
    const comma = tokens.findIndex((token, index) => index > start && index < end && token.text === ",");
    if (comma > start && (tokens[start].pos === "SCONJ" || ["if", "when", "while", "although", "because", "unless"].includes(word(start)))) {
      add(level, clauseLabels.get(word(start)) ?? "状语", start, comma);
      clause(start + 1, comma, level + 1);
      start = comma + 1;
    } else if (comma > start && ["ADP", "ADV"].includes(tokens[start].pos)) {
      add(level, "状语", start, comma); start = comma + 1;
    }
    let predicate = -1;
    let relative = false;
    for (let i = start; i < end; i++) {
      if (i > start && ["who", "which", "that", "whose"].includes(word(i)) && ["NOUN", "PROPN", "PRON"].includes(tokens[i - 1].pos)) relative = true;
      if (relative && tokens[i].text === ",") relative = false;
      if (["AUX", "VERB"].includes(tokens[i].pos) && word(i - 1) !== "to") {
        if (relative) {
          const later = tokens.findIndex((token, index) => index > i && index < end && token.pos === "AUX");
          if (later > i) { predicate = later; break; }
        }
        predicate = i; break;
      }
    }
    if (predicate < 0) { add(level, "主语", start, end); return; }
    if (predicate > start) add(level, "主语", start, predicate);
    let predicateEnd = predicate + 1;
    while (predicateEnd < end && ["AUX", "VERB", "ADV", "PART"].includes(tokens[predicateEnd].pos) && word(predicateEnd) !== "to") predicateEnd++;
    add(level, "谓语", predicate, predicateEnd);
    if (predicateEnd < end) {
      const first = word(predicateEnd);
      const nominalClause = ["what", "that", "whether", "how", "why", "if"].includes(first);
      const linking = linkingVerbs.has(word(predicateEnd - 1));
      const prep = nominalClause ? -1 : tokens.findIndex((token, index) => index >= predicateEnd && index < end && token.pos === "ADP");
      const complementEnd = prep >= predicateEnd ? prep : end;
      const label = nominalClause ? (linking ? "表语从句" : "宾语从句") : linking ? "表语" : "宾语";
      add(level, label, predicateEnd, complementEnd);
      if (nominalClause && tokens[predicateEnd].pos === "SCONJ") clause(predicateEnd + 1, complementEnd, level + 1);
      if (prep >= predicateEnd) add(level, "状语", prep, end);
    }
    if (level < 5) {
      for (const parent of [...layers(level)]) {
        if (parent.start < start || parent.end > end || parent.label.endsWith("从句")) continue;
        const marker = tokens.findIndex((token, index) => index > parent.start && index < parent.end && ["who", "which", "that", "whose"].includes(token.text.toLowerCase()));
        if (marker > parent.start) {
          add(level + 1, "定语从句", marker, parent.end);
          clause(marker, parent.end, level + 2);
        }
      }
    }
  }
  clause(0, tokens.length, 1);
  for (let level = 1; level <= 5; level++) {
    const spans = layers(level).sort((a, b) => a.start - b.start || a.end - b.end);
    const accepted: BbcSyntaxSpan[] = [];
    for (const span of spans) {
      if (accepted.some((previous) => span.start < previous.end && previous.start < span.end)) continue;
      if (level > 1 && !layers(level - 1).some((parent) => span.start >= parent.start && span.end <= parent.end)) continue;
      accepted.push(span);
    }
    data[`level${level}` as BbcSyntaxLayerKey] = accepted;
  }
  return data;
}
