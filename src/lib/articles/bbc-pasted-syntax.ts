import type { BbcSyntaxSentenceData, BbcSyntaxSpan } from "@/components/bbc-syntax-sentence";

export type PastedBbcSyntaxSentence = {
  sentenceNo: number;
  text: string;
  items: { term: string; description: string }[];
  main: string;
  summaries?: { label: string; text: string }[];
  source?: string;
  inlineComponents?: string;
};

const SECTION_HEADING = /^##\s*句\s*(\d+)\s*$/;
const SYNTAX_TITLE = /^#\s*全文逐句词性\s*[+＋]\s*句子成分标注\s*$/im;
const FOLLOWING_CONTENT_HEADING = /^(?:#{1,6}\s*)?(?:重点\s*)?(?:词汇(?:表|与短语|和短语|及短语)?|短语|Vocabulary(?:\s+(?:and|&)\s+phrases)?)\s*[:：]?\s*$/im;
const ROLE_NAMES = ["主语从句", "主语", "谓语", "宾语从句", "宾语", "宾语补足语", "宾补", "表语从句", "表语", "定语从句", "定语", "状语从句", "状语", "同位语从句", "同位语", "补语", "独立主格"];

function normalizeText(value: string) {
  return value.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

function canonicalRole(value: string) {
  if (value === "宾语补足语") return "宾补";
  if (value === "主") return "主语";
  if (value === "谓") return "谓语";
  if (value === "宾") return "宾语";
  if (value === "系") return "系动词";
  if (value === "表") return "表语";
  if (value === "形式主") return "形式主语";
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
  if (/助动词|情态动词|系动词/.test(value)) return "AUX";
  if (/不定式符号|小品词|引导词/.test(value)) return "PART";
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
  // Curly and straight quotes occupy the same UTF-16 width, so replacing them
  // keeps the offsets compatible with the tokens rendered by the editor.
  const source = text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  const target = term.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim().replace(/\s+/g, " ");
  if (!target || target.includes("...") || target.includes("…")) return null;
  const pattern = target.split(" ").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  const match = new RegExp(pattern, "i").exec(source.slice(from));
  if (!match) return null;
  const start = from + match.index;
  return { start, end: start + match[0].length };
}

function indexesForRange(tokens: BbcSyntaxSentenceData["tokens"], range: { start: number; end: number }) {
  const indexes: number[] = [];
  tokens.forEach((token, index) => {
    if (token.pos !== "PUNCT" && token.start < range.end && token.end > range.start) indexes.push(index);
  });
  return indexes;
}

function appendSummarySpans(text: string, tokens: BbcSyntaxSentenceData["tokens"], main: string, sentenceNo: number) {
  const spans: BbcSyntaxSpan[] = [];
  const marked = /([^【】]+?)【([^】]+)】/g;
  let cursor = 0;
  for (const match of main.matchAll(marked)) {
    const phrase = match[1].trim();
    const role = rolesIn(match[2])[0] ?? canonicalRole(match[2].trim());
    const range = findTermRange(text, phrase, cursor);
    if (!range) throw new Error(`第 ${sentenceNo} 句的主干标注“${phrase}”无法匹配原句，请核对输入框中的句子成分。`);
    cursor = range.end;
    const indexes = indexesForRange(tokens, range);
    if (!indexes.length) throw new Error(`第 ${sentenceNo} 句的主干标注“${phrase}”没有对应词语。`);
    spans.push({ label: role, start: indexes[0], end: indexes.at(-1)! + 1 });
  }
  return spans;
}

export function parsePastedBbcSyntaxBlock(value: string) {
  const normalized = value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const inline = parseInlineNumberedSyntax(normalized);
  if (inline) return inline;
  const numbered = parseNumberedSyntax(normalized);
  if (numbered) return numbered;
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
  if (!annotation) return automatic;
  if (sentenceWordKey(annotation.text) !== sentenceWordKey(automatic.text)) {
    throw new Error(`第 ${annotation.sentenceNo} 句语法标注中的英文原句与正文不一致，请核对输入框内容。`);
  }

  if (annotation.inlineComponents) return applyInlineNumberedSyntax(automatic, annotation);
  if (annotation.summaries) return applyNumberedSyntax(automatic, annotation);

  const tokens = automatic.tokens.map((token) => ({ ...token }));
  const componentRows: { label: string; start: number; end: number }[] = [];
  let cursor = 0;
  for (const item of annotation.items) {
    const range = findTermRange(automatic.text, item.term, cursor);
    if (!range) throw new Error(`第 ${annotation.sentenceNo} 句的标注词语“${item.term}”无法匹配原句，请核对输入框中的语法标注。`);
    cursor = range.end;
    const indexes = indexesForRange(tokens, range);
    if (!indexes.length) throw new Error(`第 ${annotation.sentenceNo} 句的标注词语“${item.term}”没有对应词语。`);
    const code = posCode(item.description);
    if (code) indexes.forEach((index) => {
      tokens[index].pos = code;
      tokens[index].posLabel = posLabel(item.description);
    });
    for (const label of rolesIn(item.description)) {
      componentRows.push({ label, start: indexes[0], end: indexes.at(-1)! + 1 });
    }
  }

  const summarySpans = appendSummarySpans(automatic.text, tokens, annotation.main, annotation.sentenceNo);
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
    // Uploaded annotations are the authority for annotated sentences. Never
    // quietly mix them with the automatic parser when one supplied layer is empty.
    level1: summarySpans,
    level2,
    level3: [], level4: [], level5: [],
    status: "reviewed",
  };
}

// Numbered uploads keep the teacher's wording, including contractions and
// omitted words, instead of asking the automatic parser to reinterpret it.
function wordParts(value: string): string[] {
  return (normalizeText(value).toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?|'(?:s|ve|re|d|ll|m)\b/g) ?? []).flatMap((word) => {
    if (word === "n't") return ["not"];
    if (/n't$/.test(word)) return [word.slice(0, -3) === "ca" ? "can" : word.slice(0, -3) === "wo" ? "will" : word.slice(0, -3), "not"];
    const contraction = /^(.*?)('(s|ve|re|d|ll|m))$/.exec(word);
    return contraction ? [contraction[1], contraction[2]].filter(Boolean) : [word];
  });
}

function sameWord(source: string, target: string) {
  const aliases: Record<string, string[]> = { "'s": ["is", "has"], "'ve": ["have"], "'re": ["are"], "'d": ["had", "would"], "'ll": ["will"], "'m": ["am"] };
  return source === target || aliases[source]?.includes(target) || aliases[target]?.includes(source);
}

type TokenRange = { start: number; end: number };
type PhraseMatch = TokenRange & { indexes: number[]; gaps: number };

function phraseMatches(tokens: BbcSyntaxSentenceData["tokens"], phrase: string, scope: TokenRange, gaps = false): PhraseMatch[] {
  const target = wordParts(phrase.replace(/[（(][^）)]*[）)]/g, ""));
  if (!target.length) return [];
  const words = tokens.flatMap((token, index) => token.pos === "PUNCT" || index < scope.start || index >= scope.end
    ? [] : wordParts(token.text).map((word) => ({ word, index })));
  const matches: PhraseMatch[] = [];
  for (let start = 0; start < words.length; start++) {
    if (!sameWord(words[start].word, target[0])) continue;
    let cursor = start;
    const indexes: number[] = [];
    for (const part of target) {
      if (gaps) while (cursor < words.length && !sameWord(words[cursor].word, part)) cursor++;
      if (cursor >= words.length || !sameWord(words[cursor].word, part)) break;
      indexes.push(words[cursor++].index);
    }
    if (indexes.length === target.length) matches.push({ start: indexes[0], end: indexes.at(-1)! + 1, indexes: [...new Set(indexes)], gaps: cursor - start - target.length });
  }
  return matches.sort((a, b) => a.gaps - b.gaps || a.start - b.start);
}

function markedComponents(value: string) {
  return [...value.matchAll(/([^【】]+?)【([^】]+)】/g)].map((match) => ({ phrase: match[1].trim(), label: canonicalRole(match[2].trim()) }));
}

function runsForMatch(match: PhraseMatch, tokens: BbcSyntaxSentenceData["tokens"], label: string): BbcSyntaxSpan[] {
  // A clause is one enclosing span; separated verb forms stay separated so an
  // intervening adverb can retain the teacher's own adverbial annotation.
  if (/从句|真正主语/.test(label)) return [{ label, start: match.start, end: match.end }];
  const runs: BbcSyntaxSpan[] = [];
  for (const index of match.indexes) {
    const previous = runs.at(-1);
    if (previous && tokens.slice(previous.end, index).every((token) => token.pos === "PUNCT")) previous.end = index + 1;
    else runs.push({ label, start: index, end: index + 1 });
  }
  return runs;
}

function applyNumberedSyntax(automatic: BbcSyntaxSentenceData, annotation: PastedBbcSyntaxSentence): BbcSyntaxSentenceData {
  const tokens = automatic.tokens.map((token) => ({ ...token }));
  const whole = { start: 0, end: tokens.length - (tokens.at(-1)?.pos === "PUNCT" ? 1 : 0) };
  let cursor = 0;
  const labelled = new Set<number>();
  for (const item of annotation.items) {
    const match = phraseMatches(tokens, item.term, { start: cursor, end: whole.end })[0];
    const code = posCode(item.description);
    if (!match || !code) throw new Error(`第 ${annotation.sentenceNo} 句的词性标注“${item.term}：${item.description}”无法匹配原句。`);
    cursor = match.end;
    for (const index of match.indexes) {
      Object.assign(tokens[index], { pos: code, posLabel: posLabel(item.description) });
      labelled.add(index);
    }
  }
  if (tokens.some((token, index) => token.pos !== "PUNCT" && index < whole.end && !labelled.has(index))) {
    throw new Error(`第 ${annotation.sentenceNo} 句的词性标注不完整，请逐词标注。`);
  }
  const summaries = annotation.summaries ?? [];
  const layers: BbcSyntaxSpan[][] = [[], [], [], [], []];
  const notes: string[] = [];
  const contexts: { label: string; scope: TokenRange; depth: number }[] = [];
  let mainStart = 0;
  const leadingClause = summaries.map((summary) => summary.label.match(/^(While|if|whilst|when)/i)?.[1]).filter(Boolean)
    .map((connective) => tokens.findIndex((token) => token.text.toLowerCase() === connective!.toLowerCase()))
    .find((index) => index >= 0 && index <= 3);
  const leadingEnd = leadingClause === undefined ? -1 : tokens.findIndex((token, index) => index > leadingClause && token.text === ",");

  for (const summary of summaries) {
    const components = markedComponents(summary.text);
    const nested = !/^(?:主干|并列分句主干)$/.test(summary.label);
    let scope = whole;
    let depth = 0;
    let clauseLabel = summary.label.replace(/主干$/, "").replace(/（省略）|\(省略\)/g, "");
    if (nested) {
      const kind = /主语从句/.test(clauseLabel) ? "真正主语" : /表语从句/.test(clauseLabel) ? "表语从句"
        : /定语从句/.test(clauseLabel) ? "定语从句" : /宾语从句/.test(clauseLabel) ? "宾语从句" : clauseLabel;
      const parent = layers.flatMap((spans, index) => spans.filter((span) => span.label === kind).map((span) => ({ span, depth: index + 1 })))
        .find(({ span }) => !contexts.some((context) => context.label === clauseLabel && context.scope.start === span.start));
      if (parent) { scope = parent.span; depth = parent.depth; }
      else {
        const connective = summary.label.match(/^(While|if|whilst|when)/i)?.[1];
        const subject = components.find((component) => /主语|引导词/.test(component.label));
        const anchor = summary.label.match(/^([a-z]+)(?:后|的)/i)?.[1];
        const anchorIndex = anchor ? tokens.findIndex((token) => token.text.toLowerCase() === anchor.toLowerCase()) : -1;
        const start = connective ? tokens.findIndex((token) => token.text.toLowerCase() === connective.toLowerCase())
          : subject ? phraseMatches(tokens, subject.phrase, { start: Math.max(0, anchorIndex + 1), end: whole.end })
            .find((match) => !contexts.some((context) => context.label === clauseLabel && context.scope.start === match.start))?.start : undefined;
        if (start === undefined || start < 0) throw new Error(`第 ${annotation.sentenceNo} 句的“${summary.label}”无法定位。`);
        const clauseStart = !connective && /^(that|which)$/i.test(tokens[start - 1]?.text ?? "") ? start - 1 : start;
        scope = { start: clauseStart, end: start === leadingClause && leadingEnd > start ? leadingEnd : whole.end };
        const enclosing = contexts.filter((context) => scope.start >= context.scope.start && scope.end <= context.scope.end)
          .sort((a, b) => b.depth - a.depth)[0];
        depth = enclosing?.depth ?? 0;
        clauseLabel = /定语从句/.test(clauseLabel) ? "定语从句" : /宾语从句/.test(clauseLabel) ? "宾语从句" : clauseLabel.replace(/^(While|if|whilst|when)/i, "");
        layers[depth].push({ label: clauseLabel, ...scope });
        depth++;
      }
      contexts.push({ label: summary.label.replace(/主干$/, "").replace(/（省略）|\(省略\)/g, ""), scope, depth });
    }
    if (depth > 4) throw new Error(`第 ${annotation.sentenceNo} 句的标注嵌套超过五层。`);
    let subjectStart = nested ? scope.start : mainStart;
    for (const component of components) {
      const omitted = [...component.phrase.matchAll(/[（(]([^）)]+)[）)]/g)].map((match) => match[1]);
      for (const word of omitted) notes.push(`省略${/主语/.test(component.label) ? "主语" : "词语"}：${word}`);
      if (!wordParts(component.phrase.replace(/[（(][^）)]*[）)]/g, "")).length) continue;
      let matches = phraseMatches(tokens, component.phrase, scope, true);
      if (!nested && leadingClause !== undefined && leadingEnd >= 0) matches = matches.filter((match) => match.end <= leadingClause || match.start > leadingEnd);
      if (/主语|形式主语/.test(component.label)) matches = matches.filter((match) => match.start >= subjectStart);
      else if (/谓语|系动词|宾语|宾补|表语|真正主语/.test(component.label)) {
        const afterSubject = matches.filter((match) => match.start >= subjectStart);
        if (afterSubject.length) matches = afterSubject;
      }
      const match = matches[0];
      if (!match) throw new Error(`第 ${annotation.sentenceNo} 句的句子成分“${component.phrase}【${component.label}】”无法匹配原句。`);
      if (/主语|形式主语/.test(component.label)) subjectStart = match.start;
      layers[depth].push(...runsForMatch(match, tokens, component.label));
      if (!nested) mainStart = Math.max(mainStart, match.end);
    }
  }
  for (const spans of layers) spans.sort((a, b) => a.start - b.start || b.end - a.end);
  return { ...automatic, tokens, level1: layers[0], level2: layers[1], level3: layers[2], level4: layers[3], level5: layers[4], notes: [...new Set(notes)], sourceAnnotation: annotation.source, status: "reviewed" };
}

function parseInlineNumberedSyntax(normalized: string) {
  const headers = [...normalized.matchAll(/^#{1,6}\s+(\d+)[.．、]\s*(["“'‘]?[A-Za-z].+)$/gm)];
  const sections = headers.map((header, index) => ({ header, source: normalized.slice(header.index, headers[index + 1]?.index ?? normalized.length) }));
  const marked = sections.filter(({ source }) => /^词性\s*[:：]/m.test(source) && /^句子成分\s*[:：]/m.test(source));
  if (!marked.length) return null;
  const start = marked[0].header.index!;
  const following = FOLLOWING_CONTENT_HEADING.exec(normalized.slice(start));
  const end = following ? start + following.index : normalized.length;
  const sentences: PastedBbcSyntaxSentence[] = marked.filter(({ header }) => header.index! < end).map(({ header, source }) => {
    source = source.slice(0, Math.min(source.length, end - header.index!)).replace(/\n\s*---\s*$/, "").trim();
    const pos = source.match(/^词性\s*[:：]\s*(.+)$/m)![1];
    const items = pos.split(/[；;]/).filter((part) => part.trim()).map((part) => {
      const match = part.trim().match(/^([A-Za-z0-9][\s\S]*?)\s+([\u3400-\u9fff].*)$/);
      if (!match || !posCode(match[2])) throw new Error(`第 ${header[1]} 句的词性标注无法识别：${part.trim()}`);
      return { term: match[1], description: match[2].replace(/[。.]$/, "") };
    });
    return { sentenceNo: Number(header[1]), text: header[2].trim(), items, main: "", source,
      inlineComponents: source.match(/^句子成分\s*[:：]\s*(.+)$/m)![1] };
  });
  return { articleText: [normalized.slice(0, start).trim(), normalized.slice(end).trim()].filter(Boolean).join("\n\n"), sentences };
}

function applyInlineNumberedSyntax(automatic: BbcSyntaxSentenceData, annotation: PastedBbcSyntaxSentence): BbcSyntaxSentenceData {
  // Reuse the complete word-coverage check before accepting teacher annotations.
  const result = applyNumberedSyntax(automatic, { ...annotation, summaries: [] });
  const layers: [BbcSyntaxSpan[], BbcSyntaxSpan[], BbcSyntaxSpan[], BbcSyntaxSpan[], BbcSyntaxSpan[]] = [result.level1, result.level2, result.level3 ?? [], result.level4 ?? [], result.level5 ?? []];
  const notes = [...(result.notes ?? [])];
  const whole = { start: 0, end: result.tokens.length };
  for (const fragment of annotation.inlineComponents!.split(/[；;]/)) {
    const components = markedComponents(fragment);
    if (!components.length) { if (fragment.trim()) notes.push(fragment.trim()); continue; }
    const context = fragment.match(/^\s*(.*?(?:从句|真正主语))中\s*/)?.[1];
    const contextKind = context?.match(/主语从句|宾语从句|定语从句|表语从句|状语从句|真正主语/)?.[0];
    const parent = contextKind ? layers.flatMap((spans, depth) => spans.filter((span) => span.label.includes(contextKind)).map((span) => ({ ...span, depth }))).at(-1) : undefined;
    const depth = context ? Math.min(4, parent ? parent.depth + 1 : 1) : 0;
    const scope = parent ?? whole;
    let cursor = scope.start;
    for (const component of components) {
      const phrase = component.phrase.replace(/^.*[\u3400-\u9fff]\s*(?=[A-Za-z0-9"“'‘])/, "");
      if (!wordParts(phrase).length) { notes.push(`${component.phrase}【${component.label}】`); continue; }
      const matches = phraseMatches(result.tokens, phrase, scope, true);
      const match = matches.find((item) => item.start >= cursor) ?? matches[0];
      if (!match) throw new Error(`第 ${annotation.sentenceNo} 句的句子成分“${component.phrase}【${component.label}】”无法匹配原句。`);
      cursor = match.end;
      for (const span of runsForMatch(match, result.tokens, component.label)) {
        if (!layers[depth].some((existing) => existing.start === span.start && existing.end === span.end && existing.label === span.label)) layers[depth].push(span);
      }
    }
  }
  for (const layer of layers) layer.sort((a, b) => a.start - b.start || b.end - a.end);
  return { ...result, level3: layers[2], level4: layers[3], level5: layers[4], notes };
}

function parseNumberedSyntax(normalized: string) {
  const headers = [...normalized.matchAll(/^(\d+)[.．、]\s*([A-Za-z].+)$/gm)];
  const marked = headers.map((header, index) => ({ header, section: normalized.slice(header.index, headers[index + 1]?.index ?? normalized.length) }))
    .filter(({ section }) => /^(?:>\s*)?(?:主干|.*从句主干)\s*[:：]/m.test(section) && /【[^】]+】/.test(section));
  if (!marked.length) return null;
  const firstHeader = marked[0].header.index!;
  const title = SYNTAX_TITLE.exec(normalized.slice(0, firstHeader));
  const start = title && !normalized.slice(title.index + title[0].length, firstHeader).trim() ? title.index : firstHeader;
  const remainder = normalized.slice(start);
  const following = FOLLOWING_CONTENT_HEADING.exec(remainder);
  const end = following ? start + following.index : normalized.length;
  const sentences: PastedBbcSyntaxSentence[] = [];
  for (const { header, section } of marked) {
    if (header.index! >= end) continue;
    const source = section.slice(0, Math.min(section.length, end - header.index!)).trim();
    const items: PastedBbcSyntaxSentence["items"] = [];
    const summaries: NonNullable<PastedBbcSyntaxSentence["summaries"]> = [];
    for (const rawLine of source.split("\n").slice(1)) {
      const line = rawLine.trim().replace(/^>\s*/, "");
      if (!line || /^翻译\s*[:：]/.test(line)) continue;
      for (const part of line.split(/[；;]/)) {
        const separator = part.search(/[：:]/);
        if (separator <= 0) continue;
        const term = part.slice(0, separator).trim();
        const description = part.slice(separator + 1).trim();
        if (term.endsWith("主干")) summaries.push({ label: term, text: description });
        else if (/[A-Za-z0-9]/.test(term) && posCode(description)) items.push({ term, description });
      }
    }
    if (!items.length || !summaries.length) throw new Error(`第 ${header[1]} 句需要逐词词性和主干标注。`);
    sentences.push({ sentenceNo: Number(header[1]), text: header[2].replace(/\s*\/\s*/g, " ").trim(), items, main: summaries.find((summary) => summary.label === "主干")?.text ?? "", summaries, source });
  }
  return { articleText: [normalized.slice(0, start).trim(), normalized.slice(end).trim()].filter(Boolean).join("\n\n"), sentences };
}

/** Editing body/vocabulary alone must not erase previously reviewed sentences. */
export function retainReviewedBbcSyntax(next: BbcSyntaxSentenceData[], previous: BbcSyntaxSentenceData[] = []) {
  return next.map((sentence, index) => sentence.status !== "reviewed" && previous[index]?.status === "reviewed"
    && previous[index].text === sentence.text ? previous[index] : sentence);
}
