import {
  BBC_ARTICLES,
  getBbcArticleById,
  mergeBbcVocabularyItems,
  type BbcArticle,
  type BbcVocabularyItem,
} from "@/lib/articles/bbc";
import {
  getVocabularyEntry,
  normalizeLookupWord,
  type LocalVocabularyEntry,
  type VocabularyAutocompleteItem,
  type VocabularyDefinitionGroup,
} from "@/lib/vocabulary/local-vocabulary";
import type { VocabularyUsageExample } from "@/lib/vocabulary/examples";

const LOW_LEVELS = new Set([
  "小学",
  "初中",
  "高中",
]);

const HIGH_LEVELS = new Set([
  "四级",
  "六级",
  "考研",
  "托雅",
  "托福",
  "雅思",
  "SAT",
  "GRE",
  "GMAT",
]);

const BBC_PART_OF_SPEECH_PATTERN =
  /^((?:interj|modal|abbr|prep|pron|conj|adj|adv|aux|det|num|art|int|vi|vt|pl|n|v)\b\.?)\s*/i;

type BbcVocabularyDetail = {
  entry: LocalVocabularyEntry;
  examples: VocabularyUsageExample[];
};

let cachedBbcVocabularyDetailMap: Map<string, BbcVocabularyDetail> | null = null;

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/’/g, "'");
}

function getArticleWords(article: BbcArticle) {
  return article.body.flatMap((paragraph) =>
    paragraph.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.map(normalizeToken) ?? [],
  );
}

function isHighLevel(level?: string) {
  const normalizedLevel = level?.trim() ?? "";

  return (
    !normalizedLevel ||
    (!LOW_LEVELS.has(normalizedLevel) &&
      (HIGH_LEVELS.has(normalizedLevel) ||
        /(?:四级|六级|考研|托|雅思|SAT|GRE|GMAT|CET[- ]?[46])/i.test(normalizedLevel)))
  );
}

function getDefinition(entry: LocalVocabularyEntry) {
  if (entry.definitionGroups.length > 0) {
    return entry.definitionGroups
      .map((group) => {
        const definition = group.definitions.join("；");
        return group.partOfSpeech ? `${group.partOfSpeech} ${definition}` : definition;
      })
      .filter(Boolean)
      .join("；");
  }

  return entry.definitionCn;
}

function getPartOfSpeech(entry: LocalVocabularyEntry) {
  return entry.definitionGroups
    .map((group) => group.partOfSpeech)
    .filter(Boolean)
    .join(" / ") || entry.partOfSpeech;
}

function getStaticVocabularyDisplayText(value: string) {
  const normalized = value.replace(/\*\*/g, "").replace(/\.{3}|…/g, " ");
  return normalized
    .match(/^[A-Za-z]+(?:['’][A-Za-z]+)?(?:[-\s]+[A-Za-z]+(?:['’][A-Za-z]+)?)*/)?.[0]
    ?.replace(/\s+/g, " ")
    .trim() ?? "";
}

function cleanBbcVocabularyText(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/[（(]\s*(?:短语|phrase)\s*[）)]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getBbcVocabularyDisplayTerm(item: BbcVocabularyItem) {
  return getStaticVocabularyDisplayText(item.lemma || item.term || item.entry);
}

function getBbcVocabularyDefinitionSource(item: BbcVocabularyItem, term: string) {
  if (item.definition?.trim()) {
    return cleanBbcVocabularyText(item.definition);
  }

  let entry = cleanBbcVocabularyText(item.entry);
  if (entry.toLowerCase().startsWith(term.toLowerCase())) {
    entry = entry.slice(term.length).trim();
  }

  entry = entry.replace(/^\/[^/]+\/\s*/, "");
  return entry || cleanBbcVocabularyText(item.translation);
}

function getBbcDefinitionGroups(item: BbcVocabularyItem, term: string): VocabularyDefinitionGroup[] {
  const definitionSource = getBbcVocabularyDefinitionSource(item, term);
  const partOfSpeechItems = (item.partOfSpeech ?? "")
    .split(/\s*\/\s*/)
    .map((value) => value.trim())
    .filter(Boolean);

  return definitionSource
    .split(/\s*\/\s*/)
    .map((value, index) => {
      const match = value.match(BBC_PART_OF_SPEECH_PATTERN);
      const partOfSpeech = match?.[1]?.trim() || partOfSpeechItems[index] || (index === 0 ? partOfSpeechItems[0] : "");
      const definition = value.replace(BBC_PART_OF_SPEECH_PATTERN, "").trim();

      return {
        definitions: definition ? [definition] : [],
        partOfSpeech,
        text: [partOfSpeech, definition].filter(Boolean).join(" "),
      };
    })
    .filter((group) => group.definitions.length > 0);
}

function formatBbcVocabularyPhonetic(value?: string) {
  const normalized = value?.replace(/^\/+|\/+$/g, "").trim() ?? "";
  return normalized ? `/ ${normalized} /` : "";
}

function createBbcVocabularyEntry(item: BbcVocabularyItem, term: string): LocalVocabularyEntry {
  const definitionGroups = getBbcDefinitionGroups(item, term);
  const definitionLines = definitionGroups.map((group) => group.text);
  const fallbackPhonetic = formatBbcVocabularyPhonetic(item.phonetic);
  const normalizedWord = normalizeLookupWord(term);

  return {
    antonyms: [],
    definitionCn: definitionLines.join(" / ") || cleanBbcVocabularyText(item.translation),
    definitionGroups,
    definitionLines,
    englishDefinitions: [],
    englishExamples: [],
    etymologySource: "",
    etymologyStory: "",
    etymologyReferences: [],
    formation: "",
    inflections: [],
    level: /\s/.test(term) ? "BBC短语/表达" : (item.sourceLevel || "BBC词汇"),
    normalizedWord,
    partOfSpeech: definitionGroups[0]?.partOfSpeech || item.partOfSpeech || "",
    phonetic: fallbackPhonetic,
    reviewNotes: [],
    root: "",
    rootReferences: [],
    sourceRowNumber: 0,
    synonyms: [],
    ukPhonetic: formatBbcVocabularyPhonetic(item.ukPhonetic) || fallbackPhonetic,
    usPhonetic: formatBbcVocabularyPhonetic(item.usPhonetic) || fallbackPhonetic,
    word: term,
  };
}

function loadBbcVocabularyDetailMap() {
  if (cachedBbcVocabularyDetailMap) {
    return cachedBbcVocabularyDetailMap;
  }

  cachedBbcVocabularyDetailMap = new Map();

  for (const article of BBC_ARTICLES) {
    for (const item of article.vocabulary ?? []) {
      const term = getBbcVocabularyDisplayTerm(item);
      const normalizedTerm = normalizeLookupWord(term);
      if (!normalizedTerm) continue;

      let detail = cachedBbcVocabularyDetailMap.get(normalizedTerm);
      if (!detail) {
        detail = { entry: createBbcVocabularyEntry(item, term), examples: [] };
        cachedBbcVocabularyDetailMap.set(normalizedTerm, detail);
      }

      const example = cleanBbcVocabularyText(item.example);
      if (example && !detail.examples.some((existing) => existing.englishText === example)) {
        detail.examples.push({
          audioUrl: null,
          bookCode: "BBC",
          chineseText: cleanBbcVocabularyText(item.translation),
          englishText: example,
          id: `bbc-vocabulary:${article.id}:${item.number}`,
          sentenceNo: item.number,
          sourceId: article.id,
          sourceTitle: `BBC ${article.year} · ${article.title}`,
          sourceType: "article",
          testNo: 0,
        });
      }
    }
  }

  return cachedBbcVocabularyDetailMap;
}

export function getBbcVocabularyDetail(value: string) {
  return loadBbcVocabularyDetailMap().get(normalizeLookupWord(value)) ?? null;
}

export function getBbcVocabularyAutocompleteItems(): VocabularyAutocompleteItem[] {
  return [...loadBbcVocabularyDetailMap().values()]
    .map(({ entry }) => entry)
    .filter((entry) => /\s/.test(entry.normalizedWord))
    .map((entry) => ({
      definition: entry.definitionLines[0] || entry.definitionCn,
      definitionSearchText: entry.definitionCn.toLowerCase().replace(/\s+/g, ""),
      level: entry.level,
      normalizedWord: entry.normalizedWord,
      ukPhonetic: entry.ukPhonetic,
      usPhonetic: entry.usPhonetic,
      word: entry.word,
    }))
    .sort((left, right) => left.word.localeCompare(right.word));
}

function shouldKeepStaticVocabularyItem(item: BbcVocabularyItem) {
  const displayText = getStaticVocabularyDisplayText(item.term);

  if (/\s/.test(displayText)) {
    return true;
  }

  const entry = getVocabularyEntry(displayText.toLowerCase());

  return !entry?.level.trim() || isHighLevel(entry.level);
}

function getExampleMatchWords(words: string[]) {
  const candidates = new Set(words.map(normalizeToken).filter(Boolean));

  for (const word of [...candidates]) {
    if (word.length <= 2) {
      continue;
    }

    if (/[^aeiou]y$/i.test(word)) {
      candidates.add(`${word.slice(0, -1)}ies`);
      candidates.add(`${word.slice(0, -1)}ied`);
    } else if (/(s|x|z|ch|sh)$/i.test(word)) {
      candidates.add(`${word}es`);
      candidates.add(`${word}ed`);
    } else if (word.endsWith("e")) {
      candidates.add(`${word}s`);
      candidates.add(`${word}d`);
      candidates.add(`${word.slice(0, -1)}ing`);
    } else {
      candidates.add(`${word}s`);
      candidates.add(`${word}ed`);
      candidates.add(`${word}ing`);
    }
  }

  return candidates;
}

function sentenceMatchesWords(sentence: string, words: Set<string>) {
  return (sentence.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [])
    .map(normalizeToken)
    .some((word) => words.has(word));
}

function findShortestBbcExample(words: string[]) {
  const matchWords = getExampleMatchWords(words);
  const candidates: Array<{ articleIndex: number; sentence: NonNullable<BbcArticle["sentences"]>[number] }> = [];

  BBC_ARTICLES.forEach((article, articleIndex) => {
    for (const sentence of article.sentences ?? []) {
      if (sentenceMatchesWords(sentence.english, matchWords) && sentence.chinese) {
        candidates.push({ articleIndex, sentence });
      }
    }
  });

  candidates.sort((left, right) => {
    const lengthDelta =
      (left.sentence.english.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length ?? 0) -
      (right.sentence.english.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length ?? 0);

    return lengthDelta || right.articleIndex - left.articleIndex;
  });

  const candidate = candidates[0]?.sentence;

  return candidate
    ? {
        example: candidate.english,
        translation: candidate.chinese,
      }
    : null;
}

function findArticleExample(article: BbcArticle, word: string) {
  const normalizedWord = normalizeToken(word);
  const sentence = article.sentences?.find((item) =>
    (item.english.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [])
      .map(normalizeToken)
      .includes(normalizedWord),
  );

  if (sentence) {
    return {
      example: sentence.english,
      translation: sentence.chinese,
    };
  }

  const paragraph = article.body.find((item) =>
    (item.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [])
      .map(normalizeToken)
      .includes(normalizedWord),
  );

  return {
    example: paragraph ?? "",
    translation: "",
  };
}

function createAutoVocabularyItem(
  article: BbcArticle,
  entry: LocalVocabularyEntry,
  matchedWord: string,
  number: number,
): BbcVocabularyItem {
  const example =
    findShortestBbcExample([entry.word, matchedWord]) ?? findArticleExample(article, matchedWord);
  const phonetic = entry.phonetic || entry.ukPhonetic || entry.usPhonetic || "";

  return {
    definition: getDefinition(entry),
    entry: [entry.word, phonetic, getDefinition(entry)].filter(Boolean).join(" "),
    example: example.example,
    highlight: true,
    highlightTerm: matchedWord,
    lemma: entry.word,
    number,
    partOfSpeech: getPartOfSpeech(entry),
    phonetic,
    sourceLevel: entry.level || "未分级",
    term: entry.word,
    translation: example.translation,
    ukPhonetic: entry.ukPhonetic,
    usPhonetic: entry.usPhonetic,
  };
}

export function getBbcHighLevelVocabulary(article: BbcArticle) {
  const items: BbcVocabularyItem[] = [];
  const seenEntries = new Set<string>();

  for (const word of getArticleWords(article)) {
    const entry = getVocabularyEntry(word);

    const isExternalFallbackEntry = Boolean(entry && !entry.level.trim() && entry.sourceRowNumber === 0);

    if (
      !entry ||
      !isHighLevel(entry.level) ||
      isExternalFallbackEntry ||
      seenEntries.has(entry.normalizedWord)
    ) {
      continue;
    }

    seenEntries.add(entry.normalizedWord);
    items.push(createAutoVocabularyItem(article, entry, word, items.length + 1));
  }

  return items;
}

export function getBbcEffectiveVocabulary(article: BbcArticle) {
  const preservedVocabulary = (article.vocabulary ?? []).filter(shouldKeepStaticVocabularyItem);

  return mergeBbcVocabularyItems(preservedVocabulary, getBbcHighLevelVocabulary(article));
}

export function getBbcEffectiveVocabularyById(articleId: string) {
  const article = getBbcArticleById(articleId);

  return article ? getBbcEffectiveVocabulary(article) : null;
}
