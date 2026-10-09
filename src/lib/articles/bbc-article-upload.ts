import type { BbcVocabularyItem } from "@/lib/articles/bbc";

export type BbcArticleDateFromTitle = {
  date: string;
  id: string;
  month: number;
  year: number;
};

export function parseBbcArticleDateFromTitle(title: string): BbcArticleDateFromTitle | null {
  const match = title.match(/(?:^|\D)(\d{8}|\d{6})(?=$|\D)/);
  if (!match) return null;

  const digits = match[1];
  const year = digits.length === 8 ? Number(digits.slice(0, 4)) : 2000 + Number(digits.slice(0, 2));
  const month = Number(digits.length === 8 ? digits.slice(4, 6) : digits.slice(2, 4));
  const day = Number(digits.length === 8 ? digits.slice(6, 8) : digits.slice(4, 6));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    year < 2015 ||
    year > 2099 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const id = `${String(year).slice(-2)}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  return { date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, id, month, year };
}

export function splitBbcArticleParagraphs(value: string, language: "en" | "zh") {
  return value
    .trim()
    .split(/\r?\n\s*\r?\n+/)
    .map((paragraph) => {
      const normalized = language === "zh"
        ? paragraph.replace(/[ \t]*\r?\n[ \t]*/g, "")
        : paragraph.replace(/[ \t]*\r?\n[ \t]*/g, " ");
      return normalized.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
}

export type ParsedBbcArticlePaste = {
  dateTitle: string;
  title: string;
  titleChinese: string;
  english: string;
  chinese: string;
  vocabulary: BbcVocabularyItem[];
};

function stripPasteMarkup(value: string) {
  return value.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").trim();
}

function parsePastedVocabulary(lines: string[]): BbcVocabularyItem[] | string {
  const entries: string[][] = [];
  for (const line of lines) {
    const match = line.match(/^\s*(?:[-*]\s*)?(\d+)[.)、]\s*(.*)$/);
    if (match) entries.push([match[1], match[2]]);
    else if (line.trim() && entries.length) entries[entries.length - 1].push(line.trim());
  }

  if (lines.length && entries.length === 0) return "已找到词汇表标题，但没有识别到编号词条。";
  const items: BbcVocabularyItem[] = [];
  for (const [fallbackNumber, ...entryLines] of entries) {
    let core: string[] = [];
    let example = "";
    let translation = "";
    let activeField: "core" | "example" | "translation" = "core";
    for (const rawLine of entryLines) {
      const line = stripPasteMarkup(rawLine.replace(/\s+$/g, ""));
      const exampleMatch = line.match(/^(?:例句|example)\s*[:：]\s*(.*)$/i);
      const translationMatch = line.match(/^(?:翻译|译文|translation)\s*[:：]\s*(.*)$/i);
      if (exampleMatch) {
        activeField = "example";
        example = exampleMatch[1].trim();
      } else if (translationMatch) {
        activeField = "translation";
        translation = translationMatch[1].trim();
      } else if (activeField === "core") {
        core.push(line);
      } else if (activeField === "example") {
        example = `${example} ${line}`.trim();
      } else {
        translation = `${translation} ${line}`.trim();
      }
    }

    const definitionLine = core.join(" ").trim();
    const phoneticMatch = definitionLine.match(/^(.+?)\s+\/([^/]+)\/\s*(.*)$/);
    const term = stripPasteMarkup(phoneticMatch?.[1] ?? "");
    if (!term) return `第 ${fallbackNumber} 条词汇无法识别。`;
    const phonetic = phoneticMatch?.[2]?.trim() ?? "";
    const tail = phoneticMatch?.[3]?.trim() ?? definitionLine.slice(term.length).trim();
    const partOfSpeechMatch = tail.match(/^(phr\.\s*v\.|phr\.|n\.|v\.|vt\.|vi\.|adj\.|adv\.|prep\.|pron\.|conj\.|det\.|num\.|interj\.|modal v\.)\s*(.*)$/i);
    const partOfSpeech = partOfSpeechMatch?.[1] ?? "";
    const definition = partOfSpeechMatch?.[2]?.trim() ?? tail;
    if (!definition) return `第 ${fallbackNumber} 条词汇缺少中文释义。`;

    items.push({
      definition,
      entry: [term, phonetic ? `/${phonetic}/` : "", partOfSpeech, definition].filter(Boolean).join(" "),
      example,
      lemma: term,
      number: Number(fallbackNumber) || items.length + 1,
      partOfSpeech: partOfSpeech || undefined,
      phonetic: phonetic || undefined,
      highlight: true,
      term,
      translation,
    });
  }
  return items;
}

export function parseBbcArticlePaste(value: string): ParsedBbcArticlePaste | string {
  const lines = value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const titleIndex = lines.findIndex((line) => line.trim());
  if (titleIndex < 0) return "请粘贴 BBC 文章全文。";
  const dateTitle = lines[titleIndex].replace(/^\s*#{1,6}\s*/, "").trim();
  if (!parseBbcArticleDateFromTitle(dateTitle)) return "标题行需包含有效日期，例如 260202 或 20260202。";

  let titleLine = dateTitle.replace(/\d{8}|\d{6}/, "").replace(/^[\s\-–—|:：·]+/, "").trim();
  const chineseTitleStart = titleLine.search(/[\u3400-\u9fff]/);
  const titleChinese = chineseTitleStart < 0 ? "" : titleLine.slice(chineseTitleStart).trim();
  const title = (chineseTitleStart < 0 ? titleLine : titleLine.slice(0, chineseTitleStart))
    .replace(/[\s\-–—|:：·]+$/, "")
    .trim();
  if (!title) return "没有识别到英文标题。";

  const contentLines = lines.slice(titleIndex + 1);
  const vocabularyIndex = contentLines.findIndex((line) =>
    /^\s*(?:#{1,6}\s*)?(?:词汇表|词汇与短语|词汇和短语|Vocabulary(?:\s+(?:and|&)\s+phrases)?)\s*[:：]?\s*$/i.test(line.trim()),
  );
  const bodyLines = contentLines.slice(0, vocabularyIndex < 0 ? contentLines.length : vocabularyIndex)
    .filter((line) => !/^\s*(?:英文原文|英文正文|中文翻译|中文译文)\s*[:：]?\s*$/.test(line));
  const englishParagraphs: string[] = [];
  const chineseParagraphs: string[] = [];
  let activeLanguage: "en" | "zh" | null = null;
  let activeParagraph: string[] = [];
  const flushParagraph = () => {
    const paragraph = activeParagraph.join(" ").replace(/\s+/g, " ").trim();
    if (paragraph && activeLanguage === "en") englishParagraphs.push(paragraph);
    if (paragraph && activeLanguage === "zh") chineseParagraphs.push(paragraph);
    activeParagraph = [];
  };
  for (const line of bodyLines) {
    const text = line.trim();
    if (!text) {
      flushParagraph();
      activeLanguage = null;
      continue;
    }
    const language = /[\u3400-\u9fff]/.test(text) ? "zh" : "en";
    if (activeLanguage && activeLanguage !== language) flushParagraph();
    activeLanguage = language;
    activeParagraph.push(text);
  }
  flushParagraph();
  if (!englishParagraphs.length || !chineseParagraphs.length) return "请在标题下粘贴英文正文和对应的中文翻译。";
  if (englishParagraphs.length !== chineseParagraphs.length) {
    return `英文正文识别为 ${englishParagraphs.length} 段，中文翻译识别为 ${chineseParagraphs.length} 段，请逐段对应。`;
  }

  const vocabulary = vocabularyIndex < 0
    ? []
    : parsePastedVocabulary(contentLines.slice(vocabularyIndex + 1));
  if (typeof vocabulary === "string") return vocabulary;

  return {
    dateTitle,
    title,
    titleChinese,
    english: englishParagraphs.join("\n\n"),
    chinese: chineseParagraphs.join("\n\n"),
    vocabulary,
  };
}
