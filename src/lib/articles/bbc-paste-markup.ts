import type { BbcArticle } from "@/lib/articles/bbc";

export function extractBbcWaveText(value: string) {
  const terms: string[] = [];
  const ranges: { start: number; end: number }[] = [];
  let cursor = 0, text = "";
  for (const match of value.matchAll(/~~([^~]+)~~/g)) {
    text += value.slice(cursor, match.index);
    const start = text.length;
    text += match[1];
    if (match[1].trim()) { terms.push(match[1].trim()); ranges.push({ start, end: text.length }); }
    cursor = match.index + match[0].length;
  }
  text += value.slice(cursor);
  return { text, terms: [...new Set(terms)], ranges };
}

export function getBbcWaveSegments(text: string, terms: string[] = [], ranges?: { start: number; end: number }[], english = false) {
  const spans = ranges?.map((range) => ({ start: Math.max(0, range.start), end: Math.min(text.length, range.end) }));
  if (spans === undefined) {
    const valid = [...new Set(terms.map((term) => term.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!valid.length) return [{ text, wave: false }];
    const pattern = new RegExp(valid.map((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return english ? `(?<![A-Za-z])${escaped}(?![A-Za-z])` : escaped;
    }).join("|"), english ? "gi" : "g");
    return getBbcWaveSegments(text, [], [...text.matchAll(pattern)].map((match) => ({ start: match.index, end: match.index + match[0].length })));
  }
  const result: { text: string; wave: boolean }[] = [];
  let cursor = 0;
  for (const span of spans.sort((a, b) => a.start - b.start || b.end - a.end)) {
    const start = Math.max(cursor, span.start);
    if (span.end <= start) continue;
    if (start > cursor) result.push({ text: text.slice(cursor, start), wave: false });
    result.push({ text: text.slice(start, span.end), wave: true }); cursor = span.end;
  }
  if (cursor < text.length) result.push({ text: text.slice(cursor), wave: false });
  return result;
}

// Only text and underline markers leave the clipboard; pasted HTML is never rendered.
export function readBbcRichPaste(html: string): string | null {
  if (!html || typeof DOMParser === "undefined") return null;
  const document = new DOMParser().parseFromString(html, "text/html");
  const selectors: string[] = [];
  for (const style of document.querySelectorAll("style")) {
    for (const match of style.textContent?.matchAll(/([^{}]+)\{([^{}]+)\}/g) ?? []) {
      if (/(?:wavy|\bwave\b)/i.test(match[2])) selectors.push(...match[1].split(",").map((value) => value.trim()));
    }
  }
  let marked = false;
  function walk(node: Node, insideWave = false): string {
    if (node.nodeType === 3) return node.textContent ?? "";
    if (!(node instanceof Element)) return "";
    const name = node.tagName.toLowerCase();
    if (["script", "style", "meta", "head", "noscript"].includes(name)) return "";
    if (name === "br") return "\n";
    const wave = name === "u" || /(?:wavy|\bwave\b)/i.test(node.getAttribute("style") ?? "") || selectors.some((selector) => {
      try { return node.matches(selector); } catch { return false; }
    });
    let text = [...node.childNodes].map((child) => walk(child, insideWave || wave)).join("");
    if (wave && !insideWave && text.trim()) { marked = true; text = `~~${text}~~`; }
    return /^(?:p|div|li|h[1-6]|tr)$/.test(name) ? `${text}\n\n` : text;
  }
  const text = [...document.body.childNodes].map((node) => walk(node)).join("")
    .replace(/\u00a0/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return marked ? text : null;
}


export function serializeBbcArticlePaste(article: BbcArticle) {
  function marked(text: string, terms: string[], ranges?: { start: number; end: number }[]) {
    if (ranges) return getBbcWaveSegments(text, [], ranges).map((part) => part.wave ? `~~${part.text}~~` : part.text).join("");
    const valid = [...new Set(terms)].filter(Boolean).sort((a, b) => b.length - a.length);
    if (!valid.length) return text;
    const pattern = new RegExp(valid.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
    return text.replace(pattern, (term) => `~~${term}~~`);
  }
  const englishTerms = article.sentences?.flatMap((sentence) => sentence.underlinedTerms ?? []) ?? [];
  const chineseTerms = article.sentences?.flatMap((sentence) => sentence.chineseUnderlinedTerms ?? []) ?? [];
  return [
    `${article.id}-${article.title}${article.titleChinese ? ` ${article.titleChinese}` : ""}`,
    ...article.body.map((paragraph, index) => `${marked(paragraph, englishTerms, article.paragraphUnderlines?.[index]?.english)}\n${marked(article.chineseParagraphs?.[index] ?? "", chineseTerms, article.paragraphUnderlines?.[index]?.chinese)}`),
    "词汇表",
    ...(article.vocabulary ?? []).map((item, index) => {
      const entry = /[\u3400-\u9fff]/.test(item.entry) ? item.entry : item.partOfSpeech || item.phonetic
        ? [item.term, item.phonetic ? `/${item.phonetic.replace(/^\/|\/$/g, "")}/` : "", item.partOfSpeech, item.definition].filter(Boolean).join(" ")
        : `${item.term} | ${item.definition ?? ""}`;
      return `${index + 1}. ${entry}${item.example ? `\n例句：${item.example}` : ""}${item.translation ? `\n翻译：${item.translation}` : ""}`;
    }),
  ].join("\n\n");
}
