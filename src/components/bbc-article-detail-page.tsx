"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioPlayer,
  AudioReadingMenu,
  AudioPronunciationMenu,
  AudioSettingsMenus,
  DEFAULT_AUDIO_PLAYER_SETTINGS,
  formatArticlePhonetic,
  type AudioPlayerSettings,
  type AudioSpeakingMode,
  useArticlePronunciations,
} from "@/components/audio-player";
import { BbcSentencePractice } from "@/components/bbc-sentence-practice";
import { ArticleInlineAnnotatedText } from "@/components/article-inline-annotated-text";
import { useArticleInlineAnnotations } from "@/components/use-article-inline-annotations";
import { BbcArticleQuiz } from "@/components/bbc-article-quiz";
import { BbcArticleComments } from "@/components/bbc-article-comments";
import { type BbcSyntaxDisplayMode, type BbcSyntaxSentenceData } from "@/components/bbc-syntax-sentence";
import { BbcSyntaxInlineEditor } from "@/components/bbc-syntax-inline-editor";
import { ContentShareButton } from "@/components/content-share-button";
import { StudyAnnotationTools } from "@/components/study-annotation-tools";
import { getLikelyProperNounWords, shouldShowAudioPronunciation } from "@/lib/audio-pronunciation";
import { splitArticleSentences } from "@/lib/article-inline-annotations";
import { supabase } from "@/lib/supabase/client";
import type {
  BbcArticle,
  BbcArticleSentence,
  BbcVocabularyItem,
} from "@/lib/articles/bbc";
import { getBbcArticleContentOverride } from "@/lib/articles/bbc-content-overrides";
import {
  consumeVocabularyStudyReturn,
  getVocabularyDetailHref,
  saveVocabularyStudyReturn,
} from "@/lib/articles/vocabulary-study-return";
import { mergeBbcVocabularyItems } from "@/lib/articles/bbc-vocabulary-merge";
import {
  getActiveWordIndex,
  getNextSentenceNo,
  getSpeakingPracticeDelayMs,
  getWordCount,
} from "@/lib/articles/bbc-speaking-training.mjs";

type ArticlePageProps = {
  article: BbcArticle;
  syntaxSentences?: BbcSyntaxSentenceData[];
};

type FavoriteSentenceItem = {
  audioUrl?: string;
  bookCode?: string;
  chineseText?: string;
  englishText: string;
  href?: string;
  id: string;
  savedAt: string;
  sectionTitle?: string;
  sentenceNo?: number;
};

type FavoriteArticleItem = {
  excerpt?: string;
  href?: string;
  id: string;
  savedAt: string;
  sourceTitle?: string;
  title: string;
};

type FavoriteWordItem = {
  definitionCn: string;
  definitionLines?: string[];
  href?: string;
  id: string;
  level?: string;
  normalizedWord?: string;
  partOfSpeech: string;
  phonetic: string;
  savedAt: string;
  sourceHref?: string;
  sourceTitle?: string;
  ukPhonetic?: string;
  usPhonetic?: string;
  word: string;
};

const FAVORITE_ARTICLES_STORAGE_KEY = "ielts-platform.favoriteArticles";
const FAVORITE_SENTENCES_STORAGE_KEY = "ielts-platform.favoriteSentences";
const FAVORITE_WORDS_STORAGE_KEY = "ielts-platform.favoriteWords";

type OriginalDisplayMode = "english" | "bilingual" | "chinese";
type ArticleStudyMode = "general" | "intensive" | "listening" | "speaking" | "writing";
type ActiveSpeakingMode = Exclude<AudioSpeakingMode, "none">;

type BbcVocabularyStudyReturn = {
  activeSentenceNo: number | null;
  activeSentencePosition: number;
  audioSettings: AudioPlayerSettings;
  isOriginalVisible: boolean;
  isReadingTimerRunning: boolean;
  isReadingTimerVisible: boolean;
  isVocabularyVisible: boolean;
  originalDisplayMode: OriginalDisplayMode;
  readingSeconds: number;
  scrollY: number;
  studyMode: ArticleStudyMode;
  vocabularyScrollTop: number;
};

type SentenceRestoreSeekRequest = {
  id: number;
  positionSeconds: number;
  sentenceNo: number;
};

type SpeakingTrainingState = {
  mode: ActiveSpeakingMode;
  remainingSeconds: number;
  sentenceNo: number;
};

const SPEAKING_MODE_LABELS: Record<ActiveSpeakingMode, string> = {
  imitation: "口语模式",
  shadowing: "影子练习",
  "sight-translation": "视译训练",
};

const SPEAKING_PHASE_LABELS: Record<ActiveSpeakingMode, string> = {
  imitation: "轮到你开口练习",
  shadowing: "影子练习缓冲",
  "sight-translation": "请看中文视译成英文",
};

const SPEAKING_PLAYING_HINTS: Record<ActiveSpeakingMode, string> = {
  imitation: "播放结束后自动进入练习计时",
  shadowing: "建议佩戴耳机 一边听一边模仿跟读 初期看文本 熟练后不看文本",
  "sight-translation": "播放结束后自动进入练习计时",
};

function readStorageList<T>(key: string) {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T[]) : [];
  } catch {
    return [];
  }
}

function writeStorageList<T extends { savedAt: string }>(key: string, items: T[]) {
  const sortedItems = [...items].sort(
    (left, right) => new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime(),
  );
  window.localStorage.setItem(key, JSON.stringify(sortedItems));
}

function readFavoriteSentences() {
  return readStorageList<FavoriteSentenceItem>(FAVORITE_SENTENCES_STORAGE_KEY);
}

function favoriteSentenceId(articleId: string, sentenceNo: number) {
  return `bbc:${articleId}:sentence:${sentenceNo}`;
}

function cleanBbcVocabularyText(value: string) {
  return value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function cleanBbcVocabularyDisplayText(value: string) {
  return cleanBbcVocabularyText(value)
    .replace(/[（(]\s*(?:短语|phrase)\s*[）)]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractBbcVocabularyHeadword(value: string) {
  const normalized = cleanBbcVocabularyText(value).replace(/\.{3}|…/g, " ");
  return normalized.match(/^[A-Za-z]+(?:['’][A-Za-z]+)?(?:[-\s]+[A-Za-z]+(?:['’][A-Za-z]+)?)*/)?.[0]?.trim() ?? "";
}

function formatBbcPhonetic(value: string) {
  const normalized = cleanBbcVocabularyText(value).replace(/^[\[/]+|[\]/]+$/g, "").trim();
  return normalized ? `/ ${normalized} /` : "";
}

function isPartOfSpeechHint(value: string) {
  const tokens = value
    .split(/[、,/]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return (
    tokens.length > 0 &&
    tokens.every((token) => /^(?:[a-z]{1,8}\.?|[a-z]{1,5}\.[a-z]{1,5}\.)$/i.test(token))
  );
}

function extractBbcDefinitionGroups(value: string) {
  const text = cleanBbcVocabularyDisplayText(value);
  const markerPattern = /(?:^|[；;]\s*)((?:[a-z]{1,8})\.)(?=\s|[\u4e00-\u9fff])/gi;
  const matches = [...text.matchAll(markerPattern)];

  if (!matches.length) {
    return [];
  }

  return matches
    .map((match, index) => {
      const matchStart = match.index ?? 0;
      const contentStart = matchStart + match[0].length;
      const contentEnd = matches[index + 1]?.index ?? text.length;
      const definition = text
        .slice(contentStart, contentEnd)
        .replace(/^[；;\s]+|[；;\s]+$/g, "")
        .trim();

      return {
        definition,
        partOfSpeech: match[1].trim(),
      };
    })
    .filter((group) => group.definition);
}

function formatBbcDefinitionGroups(groups: { definition: string; partOfSpeech: string }[]) {
  return groups
    .map((group) => `${group.partOfSpeech} ${group.definition}`.trim())
    .filter(Boolean)
    .join("；");
}

function formatBbcDefinitionLines(groups: { definition: string; partOfSpeech: string }[]) {
  return groups
    .map((group) => `${group.partOfSpeech} ${group.definition}`.trim())
    .filter(Boolean);
}

function parseBbcVocabularyItem(item: BbcVocabularyItem) {
  const entry = cleanBbcVocabularyDisplayText(item.entry);
  const word = extractBbcVocabularyHeadword(item.term) || extractBbcVocabularyHeadword(entry);
  const normalizedWord = word.toLowerCase();
  let rest = entry.toLowerCase().startsWith(word.toLowerCase()) ? entry.slice(word.length).trim() : entry;
  let phonetic = "";
  let partOfSpeech = "";

  const bracketPhoneticMatch = rest.match(/^\[([^\]]+)\]\s*/);
  if (bracketPhoneticMatch) {
    if (isPartOfSpeechHint(bracketPhoneticMatch[1])) {
      partOfSpeech = bracketPhoneticMatch[1].trim();
    } else {
      phonetic = bracketPhoneticMatch[1].trim();
    }
    rest = rest.slice(bracketPhoneticMatch[0].length).trim();
  }

  const slashPhoneticMatch = rest.match(/^\/([^/]+)\/\s*/);
  if (slashPhoneticMatch) {
    phonetic = slashPhoneticMatch[1].trim();
    rest = rest.slice(slashPhoneticMatch[0].length).trim();
  }

  const posHintMatch = rest.match(/^\[([^\]]+)\]\s*/);
  if (posHintMatch && isPartOfSpeechHint(posHintMatch[1])) {
    partOfSpeech = posHintMatch[1].trim();
    rest = rest.slice(posHintMatch[0].length).trim();
  }

  const entryDefinitionGroups = extractBbcDefinitionGroups(rest);
  if (entryDefinitionGroups.length) {
    partOfSpeech = entryDefinitionGroups.map((group) => group.partOfSpeech).join(" / ");
    rest = formatBbcDefinitionGroups(entryDefinitionGroups);
  } else {
    const plainPosMatch = rest.match(/^([a-z]{1,8})\.?(?:\s+|(?=[\u4e00-\u9fff]))/i);
    if (plainPosMatch) {
      partOfSpeech = plainPosMatch[1].trim();
      rest = rest.slice(plainPosMatch[0].length).trim();
    }
  }

  const explicitDefinition = cleanBbcVocabularyDisplayText(item.definition ?? "");
  const explicitDefinitionGroups = extractBbcDefinitionGroups(explicitDefinition);
  const definition = explicitDefinitionGroups.length
    ? formatBbcDefinitionGroups(explicitDefinitionGroups)
    : explicitDefinition || rest || item.translation || entry;
  const definitionLines = explicitDefinitionGroups.length
    ? formatBbcDefinitionLines(explicitDefinitionGroups)
    : !explicitDefinition && entryDefinitionGroups.length
      ? formatBbcDefinitionLines(entryDefinitionGroups)
      : [
          /^(?:[a-z]{1,8})\./i.test(definition)
            ? definition
            : partOfSpeech
              ? `${partOfSpeech} ${definition}`.trim()
              : definition,
        ].filter(Boolean);

  return {
    definition: definition.replace(/^[.·•:：;；\s]+/, "").trim(),
    definitionLines,
    lemma: cleanBbcVocabularyDisplayText(item.lemma ?? item.term),
    normalizedWord,
    partOfSpeech: cleanBbcVocabularyText(item.partOfSpeech ?? "") || partOfSpeech,
    phonetic: formatBbcPhonetic(cleanBbcVocabularyText(item.phonetic ?? "") || phonetic),
    ukPhonetic: formatBbcPhonetic(item.ukPhonetic ?? "") || formatBbcPhonetic(cleanBbcVocabularyText(item.phonetic ?? "") || phonetic),
    usPhonetic: formatBbcPhonetic(item.usPhonetic ?? "") || formatBbcPhonetic(cleanBbcVocabularyText(item.phonetic ?? "") || phonetic),
    word,
  };
}

function formatReadingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeBbcParagraphText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s"'“”‘’`.,;:!?()[\]{}\-–—…]+/g, "");
}

function getOriginalTextBlocks(
  paragraphs: string[],
  sentences?: { chinese: string; english: string }[],
  chineseParagraphs?: string[],
): { chinese?: string; english: string }[] {
  if (!sentences?.length) {
    return paragraphs.map((english, index) => ({
      chinese: chineseParagraphs?.[index] || undefined,
      english,
    }));
  }

  let sentenceIndex = 0;

  return paragraphs.map((english, paragraphIndex) => {
    const normalizedParagraph = normalizeBbcParagraphText(english);
    const chineseParts: string[] = [];
    let normalizedSentences = "";

    while (sentenceIndex < sentences.length && normalizedSentences.length < normalizedParagraph.length) {
      const sentence = sentences[sentenceIndex];
      normalizedSentences += normalizeBbcParagraphText(sentence.english);
      if (sentence.chinese) {
        chineseParts.push(sentence.chinese);
      }
      sentenceIndex += 1;
    }

    return {
      chinese: chineseParagraphs?.[paragraphIndex] || chineseParts.join("") || undefined,
      english,
    };
  });
}

function normalizeBbcVocabularyToken(value: string) {
  return value.toLowerCase().replace(/’/g, "'");
}

const BBC_IRREGULAR_VOCABULARY_FORMS: Record<string, string[]> = {
  be: ["am", "is", "are", "was", "were", "been", "being"],
  bring: ["brought", "bringing"],
  catch: ["caught", "catching"],
  come: ["came", "coming"],
  cut: ["cutting"],
  die: ["dying"],
  do: ["does", "did", "done", "doing"],
  draw: ["drew", "drawn", "drawing"],
  drive: ["drove", "driven", "driving"],
  eat: ["ate", "eaten", "eating"],
  fall: ["fell", "fallen", "falling"],
  feel: ["felt", "feeling"],
  find: ["found", "finding"],
  get: ["got", "gotten", "getting"],
  give: ["gave", "given", "giving"],
  go: ["goes", "went", "gone", "going"],
  have: ["has", "had", "having"],
  hit: ["hitting"],
  hold: ["held", "holding"],
  keep: ["kept", "keeping"],
  know: ["knew", "known", "knowing"],
  leave: ["left", "leaving"],
  let: ["lets", "letting"],
  make: ["makes", "made", "making"],
  mean: ["meant", "meaning"],
  pay: ["paid", "paying"],
  put: ["puts", "putting"],
  run: ["ran", "run", "running"],
  say: ["says", "said", "saying"],
  see: ["saw", "seen", "seeing"],
  set: ["sets", "setting"],
  show: ["showed", "shown", "showing"],
  speak: ["spoke", "spoken", "speaking"],
  stick: ["stuck", "sticking"],
  sweep: ["swept", "sweeping"],
  take: ["takes", "took", "taken", "taking"],
  think: ["thought", "thinking"],
  throw: ["threw", "thrown", "throwing"],
  understand: ["understood", "understanding"],
  write: ["wrote", "written", "writing"],
};

function getBbcVocabularyTokenForms(value: string) {
  const word = normalizeBbcVocabularyToken(value);
  const forms = new Set([word, ...(BBC_IRREGULAR_VOCABULARY_FORMS[word] ?? [])]);

  if (word.length <= 2) {
    return forms;
  }

  if (/[^aeiou]y$/.test(word)) {
    forms.add(`${word.slice(0, -1)}ies`);
    forms.add(`${word.slice(0, -1)}ied`);
  } else if (/(s|x|z|ch|sh)$/.test(word)) {
    forms.add(`${word}es`);
    forms.add(`${word}ed`);
  } else if (word.endsWith("e")) {
    forms.add(`${word}s`);
    forms.add(`${word}d`);
    forms.add(`${word.slice(0, -1)}ing`);
  } else {
    forms.add(`${word}s`);
    forms.add(`${word}ed`);
    forms.add(`${word}ing`);
  }

  forms.add(`${word}'s`);

  return forms;
}

function bbcVocabularyTokensMatch(actual: string, expected: string) {
  const normalizedActual = normalizeBbcVocabularyToken(actual);
  const normalizedExpected = normalizeBbcVocabularyToken(expected);
  if (
    BBC_VOCABULARY_DETERMINERS.has(normalizedExpected) &&
    BBC_VOCABULARY_DETERMINERS.has(normalizedActual)
  ) {
    return true;
  }
  return getBbcVocabularyTokenForms(normalizedExpected).has(normalizedActual);
}

const BBC_VOCABULARY_DETERMINERS = new Set([
  "a",
  "an",
  "the",
  "this",
  "these",
  "those",
  "my",
  "your",
  "his",
  "her",
  "our",
  "their",
]);

const BBC_VOCABULARY_PLACEHOLDERS = new Set([
  "sb",
  "sth",
  "someone",
  "somebody",
  "something",
  "one's",
  "someone's",
  "somebody's",
]);

function getBbcVocabularyMatchPattern(item: BbcVocabularyItem) {
  const source = cleanBbcVocabularyText(item.highlightTerm ?? item.term);
  const bracketStart = source.search(/[\[【]/);
  const headword = (bracketStart >= 0 ? source.slice(0, bracketStart) : source).trim();
  return (headword.match(/\.{3}|…|[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g) ?? [])
    .filter((token) => !/^\d+[A-Za-z]+$/i.test(token))
    .map(normalizeBbcVocabularyToken);
}

function isBbcVocabularyPlaceholder(value: string) {
  return BBC_VOCABULARY_PLACEHOLDERS.has(value.replace(/’/g, "'"));
}

function getBbcVocabularyPhraseMatchIndexes(words: string[], vocabularyPattern: string[], start: number) {
  const maxInsertedWords = vocabularyPattern.includes("...") || vocabularyPattern.includes("…") ? 6 : 0;

  function matchPattern(patternIndex: number, wordIndex: number): number[] | null {
    if (patternIndex >= vocabularyPattern.length) {
      return [];
    }

    const patternWord = vocabularyPattern[patternIndex];
    if (patternWord === "..." || patternWord === "…") {
      for (let gapLength = 0; gapLength <= maxInsertedWords; gapLength += 1) {
        const remainder = matchPattern(patternIndex + 1, wordIndex + gapLength);
        if (remainder) {
          return Array.from({ length: gapLength }, (_, index) => wordIndex + index).concat(remainder);
        }
      }
      return null;
    }

    const maxWordIndex = Math.min(words.length - 1, wordIndex + maxInsertedWords);
    for (let candidateIndex = wordIndex; candidateIndex <= maxWordIndex; candidateIndex += 1) {
      const matches = isBbcVocabularyPlaceholder(patternWord)
        ? Boolean(words[candidateIndex])
        : bbcVocabularyTokensMatch(words[candidateIndex], patternWord);
      if (!matches) {
        continue;
      }

      const remainder = matchPattern(patternIndex + 1, candidateIndex + 1);
      if (remainder) {
        return [candidateIndex, ...remainder];
      }
    }

    return null;
  }

  const matchedIndexes = matchPattern(0, start);
  if (!matchedIndexes?.length) {
    return null;
  }

  const firstIndex = matchedIndexes[0];
  const lastIndex = matchedIndexes[matchedIndexes.length - 1];
  return Array.from({ length: lastIndex - firstIndex + 1 }, (_, index) => firstIndex + index);
}

function getBbcVocabularyMatches(
  items: BbcVocabularyItem[] | undefined,
  paragraphs: string[],
) {
  const paragraphWords = paragraphs.map((paragraph) =>
    (paragraph.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? []).map(normalizeBbcVocabularyToken),
  );
  return (items ?? []).map((item) => {
    const vocabularyPattern = getBbcVocabularyMatchPattern(item);
    if (!vocabularyPattern.length) {
      return { firstIndex: null, indexes: [] };
    }

    let firstMatchIndexes: number[] | null = null;
    let paragraphWordOffset = 0;
    for (const words of paragraphWords) {
      for (let start = 0; start < words.length; start += 1) {
        const matchIndexes = getBbcVocabularyPhraseMatchIndexes(words, vocabularyPattern, start);
        if (matchIndexes) {
          firstMatchIndexes = matchIndexes.map((index) => paragraphWordOffset + index);
          break;
        }
      }
      if (firstMatchIndexes) {
        break;
      }
      paragraphWordOffset += words.length;
    }

    return {
      firstIndex: firstMatchIndexes?.[0] ?? null,
      indexes: firstMatchIndexes ?? [],
    };
  });
}

function renderHighlightedEnglish(
  text: string,
  wordOffset: number,
  activeGlobalWordIndex: number | null,
  vocabularyHighlightWordIndexes: Set<number>,
  waveTerms: string[] = [],
  pronunciations: Map<string, string> = new Map(),
) {
  let wordIndex = wordOffset;
  const normalizedWaveTerms = [
    ...new Set(
      waveTerms
        .map((term) => term.trim())
        .filter((term) => (term.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length ?? 0) >= 2),
    ),
  ];
  const wavePattern = normalizedWaveTerms.length
    ? new RegExp(
        `(${normalizedWaveTerms
          .map((term) => {
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return `(?<![A-Za-z])${escaped}(?![A-Za-z])`;
          })
          .join("|")})`,
        "gi",
      )
    : null;
  const waveTermSet = new Set(normalizedWaveTerms.map((term) => term.toLowerCase().replace(/’/g, "'")));
  const parts = wavePattern ? text.split(wavePattern) : [text];

  return parts.map((part, partIndex) => {
    const partTokens = part.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[^A-Za-z]+/g) ?? [part];
    const tokenStates = partTokens.map((token) => {
      const isWord = /^[A-Za-z]/.test(token);
      const currentWordIndex = isWord ? wordIndex : null;
      if (isWord) {
        wordIndex += 1;
      }

      const isVocabularyHighlight =
        currentWordIndex != null && vocabularyHighlightWordIndexes.has(currentWordIndex);
      const classNames = [
        isVocabularyHighlight ? "bbc-vocabulary-highlight" : "",
        currentWordIndex != null && currentWordIndex === activeGlobalWordIndex
          ? "bbc-active-word"
          : "",
      ]
        .filter(Boolean)
        .join(" ");

      const normalizedToken = token.toLowerCase().replace(/[’]/g, "'").replace(/^[^a-z]+|[^a-z]+$/g, "");
      return {
        classNames,
        currentWordIndex,
        isVocabularyHighlight,
        isWord,
        pronunciation: normalizedToken ? pronunciations.get(normalizedToken) : undefined,
        token,
      };
    });
    const content = tokenStates.map((state, tokenIndex) => {
      const previousState = tokenStates[tokenIndex - 1];
      const nextState = tokenStates[tokenIndex + 1];
      const classNames =
        !state.isWord && /^[\s]+$/.test(state.token) && previousState?.isVocabularyHighlight && nextState?.isVocabularyHighlight
          ? "bbc-vocabulary-highlight"
          : state.classNames;
      return (
        <span
          className={`${classNames ?? ""}${state.pronunciation ? " article-word-with-pronunciation" : ""}`.trim() || undefined}
          key={`${wordOffset}-${partIndex}-${tokenIndex}`}
        >
          {state.pronunciation ? <span className="article-word-pronunciation">{formatArticlePhonetic(state.pronunciation)}</span> : null}
          {state.token}
        </span>
      );
    });
    const isWaveTerm = waveTermSet.has(part.toLowerCase().replace(/’/g, "'"));

    return isWaveTerm ? (
      <span className="bbc-wave-term" key={`${wordOffset}-wave-${partIndex}`}>
        {content}
      </span>
    ) : (
      <span key={`${wordOffset}-text-${partIndex}`}>{content}</span>
    );
  });
}

function renderWaveHighlightedChinese(text: string, terms: string[] = []) {
  const uniqueTerms = [...new Set(terms.filter(Boolean))].sort((left, right) => right.length - left.length);
  if (!uniqueTerms.length) {
    return text;
  }

  const pattern = new RegExp(`(${uniqueTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const termSet = new Set(uniqueTerms);
  return text.split(pattern).map((part, index) =>
    termSet.has(part) ? <span className="bbc-wave-term" key={`zh-wave-${index}`}>{part}</span> : part,
  );
}

export default function ArticleDetailPage({ article, syntaxSentences }: ArticlePageProps) {
  const inlineTextAnnotations = useArticleInlineAnnotations("bbc", article.id);
  const [editableInlineAnnotations, setEditableInlineAnnotations] = useState(inlineTextAnnotations);
  const inlineAnnotationUnits = useMemo(
    () => article.body.flatMap((paragraph, paragraphIndex) =>
      splitArticleSentences(paragraph).map((sentence) => ({
        id: `paragraph-${paragraphIndex}:sentence-${sentence.index}`,
        text: sentence.text,
      })),
    ),
    [article.body],
  );
  const [audioSettings, setAudioSettings] = useState<AudioPlayerSettings>(() => ({
    ...DEFAULT_AUDIO_PLAYER_SETTINGS,
    subtitleMode: "bilingual",
  }));
  const dictionaryPronunciations = useArticlePronunciations(
    article?.body.join(" ") ?? "",
    audioSettings.pronunciationMode,
    true,
  );
  const [isOriginalVisible, setIsOriginalVisible] = useState(true);
  const [isVocabularyVisible, setIsVocabularyVisible] = useState(true);
  const [studyMode, setStudyMode] = useState<ArticleStudyMode>("general");
  const [syntaxPosVisible, setSyntaxPosVisible] = useState(true);
  const [syntaxDisplayMode, setSyntaxDisplayMode] = useState<BbcSyntaxDisplayMode>("all");
  const [editableSyntaxSentences, setEditableSyntaxSentences] = useState(syntaxSentences ?? []);
  const [modeSelectionVersion, setModeSelectionVersion] = useState(0);
  const [articleTitleChinese, setArticleTitleChinese] = useState(article?.titleChinese ?? "");
  const [articleChineseParagraphs, setArticleChineseParagraphs] = useState<string[]>(
    article?.chineseParagraphs ?? [],
  );
  // Keep the bilingual article body visible on first load. Users can still
  // switch to English-only or Chinese-only from the display menu.
  const [originalDisplayMode, setOriginalDisplayMode] = useState<OriginalDisplayMode>("bilingual");
  const [articleVocabulary, setArticleVocabulary] = useState<BbcVocabularyItem[]>(
    () => article?.vocabulary ?? [],
  );
  const [sentenceAutoPlaySignals, setSentenceAutoPlaySignals] = useState<Record<number, number>>({});
  const [activeSentenceNo, setActiveSentenceNo] = useState<number | null>(null);
  const [activeSentencePosition, setActiveSentencePosition] = useState(0);
  const [isSentenceAudioPlaying, setIsSentenceAudioPlaying] = useState(false);
  const [fullAudioPosition, setFullAudioPosition] = useState(0);
  const [isFullAudioPlaying, setIsFullAudioPlaying] = useState(false);
  const [speakingTraining, setSpeakingTraining] = useState<SpeakingTrainingState | null>(null);
  const [isArticleFavorite, setIsArticleFavorite] = useState(false);
  const [favoriteSentenceIds, setFavoriteSentenceIds] = useState<string[]>([]);
  const [favoriteWordIds, setFavoriteWordIds] = useState<string[]>([]);
  const [isReadingTimerRunning, setIsReadingTimerRunning] = useState(false);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [isReadingTimerVisible, setIsReadingTimerVisible] = useState(false);
  const [sentenceRestoreSeekRequest, setSentenceRestoreSeekRequest] = useState<SentenceRestoreSeekRequest | null>(null);
  const [isOriginalFullscreen, setIsOriginalFullscreen] = useState(false);
  const pageRef = useRef<HTMLElement | null>(null);
  const studyWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const activeSentenceNoRef = useRef<number | null>(null);
  const sentenceAutoPlayRequestIdRef = useRef(0);
  const audioSettingsRef = useRef(audioSettings);
  const speakingCountdownRef = useRef<number | null>(null);
  const speakingAdvanceRef = useRef<number | null>(null);

  useEffect(() => {
    setEditableSyntaxSentences(syntaxSentences ?? []);
  }, [article.id, syntaxSentences]);

  useEffect(() => {
    setEditableInlineAnnotations(inlineTextAnnotations);
  }, [article.id, inlineTextAnnotations]);

  useEffect(() => {
    audioSettingsRef.current = audioSettings;
  }, [audioSettings]);

  useEffect(() => {
    let cancelled = false;
    setArticleTitleChinese(article?.titleChinese ?? "");
    setArticleChineseParagraphs(article?.chineseParagraphs ?? []);
    setArticleVocabulary(article?.vocabulary ?? []);

    if (!article) {
      return () => {
        cancelled = true;
      };
    }

    const currentArticle = article;

    async function loadBbcVocabulary() {
      const [automaticResponse, overrideResult] = await Promise.all([
        fetch(`/api/bbc-vocabulary?articleId=${encodeURIComponent(currentArticle.id)}`),
        supabase
          .from("managed_content_pages")
          .select("meta_json")
          .eq("slug", `bbc-article-${currentArticle.id}`)
          .eq("status", "published")
          .maybeSingle(),
      ]);

      if (cancelled) {
        return;
      }

      let automaticVocabulary: BbcVocabularyItem[] = [];
      if (automaticResponse.ok) {
        const payload = (await automaticResponse.json()) as { vocabulary?: BbcVocabularyItem[] };
        automaticVocabulary = payload.vocabulary ?? [];
      }

      const override = !overrideResult.error
        ? getBbcArticleContentOverride(overrideResult.data?.meta_json)
        : null;

      if (override?.titleChinese !== undefined) {
        setArticleTitleChinese(override.titleChinese);
      }
      if (override?.chineseParagraphs !== undefined) {
        setArticleChineseParagraphs(override.chineseParagraphs);
      }
      setArticleVocabulary(
        override?.vocabulary ?? mergeBbcVocabularyItems(currentArticle.vocabulary, automaticVocabulary),
      );
    }

    void loadBbcVocabulary();

    return () => {
      cancelled = true;
    };
  }, [article?.id]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsOriginalFullscreen(document.fullscreenElement === studyWorkspaceRef.current);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    setFavoriteSentenceIds(readFavoriteSentences().map((item) => item.id));
    setIsArticleFavorite(
      readStorageList<FavoriteArticleItem>(FAVORITE_ARTICLES_STORAGE_KEY).some(
        (item) => item.id === `bbc:${article?.id}`,
      ),
    );
    setFavoriteWordIds(
      readStorageList<FavoriteWordItem>(FAVORITE_WORDS_STORAGE_KEY).map((item) => item.id),
    );
  }, [article?.id]);

  useEffect(() => {
    if (!article?.id) {
      return;
    }

    const returnState = consumeVocabularyStudyReturn<BbcVocabularyStudyReturn>(`/articles/${article.id}`);
    if (!returnState) {
      return;
    }

    const validModes: ArticleStudyMode[] = ["general", "intensive", "listening", "speaking", "writing"];
    const restoredSentenceNo = article.sentences?.some(
      (sentence) => sentence.sentenceNo === returnState.activeSentenceNo,
    )
      ? returnState.activeSentenceNo
      : null;
    const restoredAudioSettings = {
      ...DEFAULT_AUDIO_PLAYER_SETTINGS,
      ...(returnState.audioSettings ?? {}),
    };
    const restoredMode = validModes.includes(returnState.studyMode) ? returnState.studyMode : "general";

    setStudyMode(restoredMode);
    setAudioSettings(restoredAudioSettings);
    audioSettingsRef.current = restoredAudioSettings;
    setOriginalDisplayMode(returnState.originalDisplayMode ?? "bilingual");
    setIsOriginalVisible(restoredMode === "general" ? returnState.isOriginalVisible ?? true : true);
    setIsVocabularyVisible(restoredMode === "general" ? returnState.isVocabularyVisible ?? true : true);
    setActiveSentenceNo(restoredMode === "general" ? null : restoredSentenceNo ?? 1);
    activeSentenceNoRef.current = restoredMode === "general" ? null : restoredSentenceNo ?? 1;
    setActiveSentencePosition(Math.max(0, returnState.activeSentencePosition ?? 0));
    setIsSentenceAudioPlaying(false);
    setIsFullAudioPlaying(false);
    setSentenceAutoPlaySignals({});
    setSentenceRestoreSeekRequest(
      restoredSentenceNo == null
        ? null
        : {
            id: Date.now(),
            positionSeconds: Math.max(0, returnState.activeSentencePosition ?? 0),
            sentenceNo: restoredSentenceNo,
          },
    );
    setReadingSeconds(Math.max(0, returnState.readingSeconds ?? 0));
    setIsReadingTimerVisible(returnState.isReadingTimerVisible ?? false);
    setIsReadingTimerRunning(returnState.isReadingTimerRunning ?? false);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, Math.max(0, returnState.scrollY ?? 0));
      const vocabularyList = document.querySelector<HTMLElement>(".bbc-vocabulary-list");
      if (vocabularyList) {
        vocabularyList.scrollTop = Math.max(0, returnState.vocabularyScrollTop ?? 0);
      }
    });
  }, [article?.id]);

  useEffect(() => {
    if (!isReadingTimerRunning) {
      return;
    }

    const timerId = window.setInterval(() => {
      setReadingSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isReadingTimerRunning]);

  useEffect(() => {
    clearSpeakingPracticeTimers();
  }, [audioSettings.speakingMode, article?.id]);

  useEffect(
    () => () => {
      clearSpeakingPracticeTimers(false);
    },
    [],
  );

  function updateAudioSettings(nextSettings: Partial<AudioPlayerSettings>) {
    setAudioSettings((current) => ({ ...current, ...nextSettings }));
    if (nextSettings.subtitleMode) {
      setOriginalDisplayMode(nextSettings.subtitleMode);
    }
  }

  function currentStudySentenceNo() {
    const sentences = article.sentences ?? [];
    const activeSentenceNo = activeSentenceNoRef.current;
    if (activeSentenceNo != null && sentences.some((sentence) => sentence.sentenceNo === activeSentenceNo)) {
      return activeSentenceNo;
    }

    if (!isFullAudioPlaying) {
      const hashSentenceNo = Number(window.location.hash.match(/bbc-sentence-(\d+)/)?.[1]);
      if (Number.isInteger(hashSentenceNo) && sentences.some((sentence) => sentence.sentenceNo === hashSentenceNo)) {
        return hashSentenceNo;
      }
    }

    const currentAudioSentence = sentences.find((sentence) =>
      fullAudioPosition * 1_000 >= sentence.startMs && fullAudioPosition * 1_000 < sentence.endMs,
    );
    return currentAudioSentence?.sentenceNo ?? sentences[0]?.sentenceNo ?? 1;
  }

  function selectStudyMode(mode: ArticleStudyMode) {
    const sentenceNo = currentStudySentenceNo();
    clearSpeakingPracticeTimers();
    setStudyMode(mode);
    setIsOriginalVisible(true);
    setIsVocabularyVisible(true);
    setSentenceAutoPlaySignals({});
    setSentenceRestoreSeekRequest(null);
    setActiveSentencePosition(0);
    setIsSentenceAudioPlaying(false);
    if (mode === "general") {
      setActiveSentenceNo(null);
    } else {
      setModeSelectionVersion((current) => current + 1);
      activeSentenceNoRef.current = sentenceNo;
      setActiveSentenceNo(sentenceNo);
      if (mode === "listening") requestSentenceAutoPlay(sentenceNo);
    }
  }

  function selectStudySentence(sentenceNo: number) {
    const shouldContinuePlayback = isSentenceAudioPlaying;
    clearSpeakingPracticeTimers();
    activeSentenceNoRef.current = sentenceNo;
    setActiveSentenceNo(sentenceNo);
    setActiveSentencePosition(0);
    setIsSentenceAudioPlaying(false);
    setIsFullAudioPlaying(false);
    if (shouldContinuePlayback) {
      requestSentenceAutoPlay(sentenceNo);
    } else {
      setSentenceAutoPlaySignals((current) => ({ ...current, [sentenceNo]: 0 }));
    }
    setSentenceRestoreSeekRequest(null);
  }

  function requestSentenceAutoPlay(sentenceNo: number) {
    sentenceAutoPlayRequestIdRef.current += 1;
    const requestId = sentenceAutoPlayRequestIdRef.current;
    setSentenceAutoPlaySignals((current) => ({ ...current, [sentenceNo]: requestId }));
  }

  function saveVocabularyReturnState() {
    if (!article?.id) {
      return;
    }

    saveVocabularyStudyReturn(`/articles/${article.id}`, {
      activeSentenceNo,
      activeSentencePosition,
      audioSettings,
      isOriginalVisible,
      isReadingTimerRunning,
      isReadingTimerVisible,
      isVocabularyVisible,
      originalDisplayMode,
      readingSeconds,
      scrollY: window.scrollY,
      studyMode,
      vocabularyScrollTop: document.querySelector<HTMLElement>(".bbc-vocabulary-list")?.scrollTop ?? 0,
    } satisfies BbcVocabularyStudyReturn);
  }

  async function toggleOriginalFullscreen() {
    const target = studyWorkspaceRef.current;
    if (!target) {
      return;
    }

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch {
      setIsOriginalFullscreen(false);
    }
  }

  function clearSpeakingPracticeTimers(resetState = true) {
    if (speakingCountdownRef.current != null) {
      window.clearInterval(speakingCountdownRef.current);
      speakingCountdownRef.current = null;
    }
    if (speakingAdvanceRef.current != null) {
      window.clearTimeout(speakingAdvanceRef.current);
      speakingAdvanceRef.current = null;
    }
    if (resetState) {
      setSpeakingTraining(null);
    }
  }

  function centerSentenceCard(sentenceNo: number) {
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(`bbc-sentence-${sentenceNo}`)?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    });
  }

  function playSentenceByMode(sentenceNo: number) {
    if (!article?.sentences) {
      return;
    }

    const nextSentenceNo = getNextSentenceNo(
      article.sentences.map((sentence) => sentence.sentenceNo),
      sentenceNo,
      audioSettingsRef.current.playMode,
    );
    if (nextSentenceNo == null) {
      return;
    }

    activeSentenceNoRef.current = nextSentenceNo;
    setActiveSentenceNo(nextSentenceNo);
    setActiveSentencePosition(0);
    requestSentenceAutoPlay(nextSentenceNo);
    setSentenceRestoreSeekRequest(null);
    centerSentenceCard(nextSentenceNo);
  }

  function startSpeakingPractice(sentence: BbcArticleSentence, mode: ActiveSpeakingMode) {
    const durationSeconds = Math.max((sentence.endMs - sentence.startMs) / 1_000, 0.1);
    const delayMs = getSpeakingPracticeDelayMs(mode, durationSeconds);
    const deadline = Date.now() + delayMs;

    clearSpeakingPracticeTimers(false);
    setSpeakingTraining({
      mode,
      remainingSeconds: Math.ceil(delayMs / 1_000),
      sentenceNo: sentence.sentenceNo,
    });
    centerSentenceCard(sentence.sentenceNo);

    speakingCountdownRef.current = window.setInterval(() => {
      setSpeakingTraining((current) =>
        current?.sentenceNo === sentence.sentenceNo
          ? {
              ...current,
              remainingSeconds: Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)),
            }
          : current,
      );
    }, 250);

    speakingAdvanceRef.current = window.setTimeout(() => {
      if (speakingCountdownRef.current != null) {
        window.clearInterval(speakingCountdownRef.current);
        speakingCountdownRef.current = null;
      }
      speakingAdvanceRef.current = null;
      setSpeakingTraining(null);
      playSentenceByMode(sentence.sentenceNo);
    }, delayMs);
  }

  function handleSentencePlayingChange(sentenceNo: number, isPlaying: boolean) {
    if (isPlaying) {
      clearSpeakingPracticeTimers();
      activeSentenceNoRef.current = sentenceNo;
      setActiveSentenceNo(sentenceNo);
      setIsSentenceAudioPlaying(true);
      setIsFullAudioPlaying(false);
      centerSentenceCard(sentenceNo);
      return;
    }

    if (activeSentenceNoRef.current === sentenceNo) {
      setIsSentenceAudioPlaying(false);
    }
  }

  function handleSentenceTimeChange(sentenceNo: number, positionSeconds: number) {
    if (activeSentenceNoRef.current === sentenceNo) {
      setActiveSentencePosition(positionSeconds);
    }
  }

  function handleSentenceEnded(sentence: BbcArticleSentence) {
    setIsSentenceAudioPlaying(false);
    const speakingMode = audioSettingsRef.current.speakingMode;

    if (studyMode !== "speaking" || speakingMode === "none") {
      playSentenceByMode(sentence.sentenceNo);
      return;
    }

    startSpeakingPractice(sentence, speakingMode);
  }

  function handleFullAudioPlayingChange(isPlaying: boolean) {
    setIsFullAudioPlaying(isPlaying);
    if (!isPlaying) {
      return;
    }

    clearSpeakingPracticeTimers();
    activeSentenceNoRef.current = null;
    setActiveSentenceNo(null);
    setIsSentenceAudioPlaying(false);
  }

  function toggleFavoriteSentence(sentence: {
    audioUrl: string;
    chinese: string;
    english: string;
    sentenceNo: number;
  }) {
    if (!article) {
      return;
    }

    const id = favoriteSentenceId(article.id, sentence.sentenceNo);
    const currentFavorites = readFavoriteSentences();
    const isFavorite = currentFavorites.some((item) => item.id === id);
    const nextFavorites = isFavorite
      ? currentFavorites.filter((item) => item.id !== id)
      : [
          {
            audioUrl: sentence.audioUrl,
            bookCode: "BBC",
            chineseText: sentence.chinese,
            englishText: sentence.english,
            href: `/articles/${article.id}#bbc-sentence-${sentence.sentenceNo}`,
            id,
            savedAt: new Date().toISOString(),
            sectionTitle: `${article.id} ${article.title}`,
            sentenceNo: sentence.sentenceNo,
          },
          ...currentFavorites,
        ];

    const sortedFavorites = [...nextFavorites].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );
    window.localStorage.setItem(FAVORITE_SENTENCES_STORAGE_KEY, JSON.stringify(sortedFavorites));
    setFavoriteSentenceIds(sortedFavorites.map((item) => item.id));
  }

  function toggleFavoriteArticle() {
    if (!article) {
      return;
    }

    const id = `bbc:${article.id}`;
    const currentFavorites = readStorageList<FavoriteArticleItem>(FAVORITE_ARTICLES_STORAGE_KEY);
    const exists = currentFavorites.some((item) => item.id === id);
    const nextFavorites = exists
      ? currentFavorites.filter((item) => item.id !== id)
      : [
          {
            excerpt: article.body[0],
            href: `/articles/${article.id}`,
            id,
            savedAt: new Date().toISOString(),
            sourceTitle: "BBC TAKE AWAY ENGLISH",
            title: `${article.id}-${article.title}${articleTitleChinese ? ` ${articleTitleChinese}` : ""}`,
          },
          ...currentFavorites,
        ];

    writeStorageList(FAVORITE_ARTICLES_STORAGE_KEY, nextFavorites);
    setIsArticleFavorite(!exists);
  }

  function toggleFavoriteVocabulary(item: BbcVocabularyItem) {
    if (!article) {
      return;
    }

    const parsedVocabulary = parseBbcVocabularyItem(item);
    const id = parsedVocabulary.normalizedWord;
    const currentFavorites = readStorageList<FavoriteWordItem>(FAVORITE_WORDS_STORAGE_KEY);
    const exists = currentFavorites.some((favorite) => favorite.id === id);
    const nextFavorites = exists
      ? currentFavorites.filter((favorite) => favorite.id !== id)
      : [
          {
            definitionCn: parsedVocabulary.definition,
            definitionLines: [parsedVocabulary.definition],
            href: `/vocabulary/${encodeURIComponent(id)}`,
            id,
            normalizedWord: id,
            level: "外刊",
            partOfSpeech: parsedVocabulary.partOfSpeech,
            phonetic: parsedVocabulary.phonetic,
            savedAt: new Date().toISOString(),
            sourceHref: `/articles/${article.id}#bbc-vocabulary-${item.number}`,
            sourceTitle: `BBC ${article.id} ${article.title}`,
            ukPhonetic: parsedVocabulary.ukPhonetic,
            usPhonetic: parsedVocabulary.usPhonetic,
            word: parsedVocabulary.word,
          },
          ...currentFavorites,
        ];

    writeStorageList(FAVORITE_WORDS_STORAGE_KEY, nextFavorites);
    setFavoriteWordIds(nextFavorites.map((favorite) => favorite.id));
  }

  const articleWordCount =
    article.body.join(" ").match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length ?? 0;
  const originalTextBlocks = getOriginalTextBlocks(article.body, article.sentences, articleChineseParagraphs);
  const activeStudySentenceIndex = Math.max(
    0,
    (article.sentences ?? []).findIndex((sentence) => sentence.sentenceNo === activeSentenceNo),
  );
  const activeStudySentence = article.sentences?.[activeStudySentenceIndex];
  const previousStudySentence = article.sentences?.[activeStudySentenceIndex - 1];
  const nextStudySentence = article.sentences?.[activeStudySentenceIndex + 1];
  const activeStudySentenceWordOffset = activeStudySentence
    ? (article.sentences ?? [])
        .filter((sentence) => sentence.sentenceNo < activeStudySentence.sentenceNo)
        .reduce((total, sentence) => total + getWordCount(sentence.english), 0)
    : 0;
  const visibleArticleVocabulary = articleVocabulary.filter((item) => item.highlight !== false);
  const articlePhraseWaveTerms = [...new Set((article.sentences ?? []).flatMap((sentence) => sentence.underlinedTerms ?? []))];
  const vocabularyMatches = getBbcVocabularyMatches(visibleArticleVocabulary, article.body);
  const vocabularyHighlightWordIndexes = new Set(
    vocabularyMatches.flatMap((match) => match.indexes),
  );
  const orderedArticleVocabulary = visibleArticleVocabulary
    .map((item, index) => ({
      firstIndex: vocabularyMatches[index]?.firstIndex ?? Number.MAX_SAFE_INTEGER,
      item,
      originalIndex: index,
    }))
    .sort((left, right) => left.firstIndex - right.firstIndex || left.originalIndex - right.originalIndex)
    .map(({ item }, index) => ({ ...item, number: index + 1 }));
  const activeSentenceVocabularyMatches = activeStudySentence
    ? getBbcVocabularyMatches(visibleArticleVocabulary, [activeStudySentence.english])
    : [];
  const activeSentenceVocabularyHighlightWordIndexes = new Set(
    activeSentenceVocabularyMatches.flatMap((match) => match.indexes),
  );
  const articleVocabularyForDisplay = orderedArticleVocabulary;
  const likelyProperNounWords = getLikelyProperNounWords(article.body.join(" "));
  const articlePronunciations = new Map<string, string>();
  if (audioSettings.pronunciationMode === "us" || audioSettings.pronunciationMode === "uk") {
    for (const item of articleVocabulary) {
      const phonetic = audioSettings.pronunciationMode === "us"
        ? item.usPhonetic || item.phonetic
        : item.ukPhonetic || item.phonetic;
      if (!phonetic) continue;
      for (const term of [item.term, item.lemma, item.highlightTerm]) {
        const normalizedTerm = term?.trim().toLowerCase().replace(/[’]/g, "'");
        if (
          normalizedTerm &&
          !likelyProperNounWords.has(normalizedTerm) &&
          shouldShowAudioPronunciation(item.sourceLevel, normalizedTerm) &&
          /^[a-z]+(?:'[a-z]+)?$/.test(normalizedTerm)
        ) {
          articlePronunciations.set(normalizedTerm, phonetic);
        }
      }
    }
  }
  dictionaryPronunciations.forEach((phonetic, word) => articlePronunciations.set(word, phonetic));
  let originalWordOffset = 0;
  const originalTextBlocksWithOffsets = originalTextBlocks.map((textBlock) => {
    const wordOffset = originalWordOffset;
    originalWordOffset += getWordCount(textBlock.english);
    return { ...textBlock, wordOffset };
  });
  const activeFullSentence = isFullAudioPlaying
    ? article.sentences?.find(
        (sentence) =>
          fullAudioPosition >= sentence.startMs / 1_000 &&
          fullAudioPosition < sentence.endMs / 1_000,
      )
    : null;
  const activeFullWordIndex = activeFullSentence
    ? getActiveWordIndex(
        activeFullSentence.english,
        fullAudioPosition - activeFullSentence.startMs / 1_000,
        (activeFullSentence.endMs - activeFullSentence.startMs) / 1_000,
      )
    : null;
  const activeFullGlobalWordIndex =
    activeFullSentence && activeFullWordIndex != null
      ? (article.sentences ?? [])
          .filter((sentence) => sentence.sentenceNo < activeFullSentence.sentenceNo)
          .reduce((total, sentence) => total + getWordCount(sentence.english), 0) +
        activeFullWordIndex
      : null;
  return (
    <section
      className="stack bbc-article-page"
      onCopy={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      ref={pageRef}
    >
        <div className="page-heading bbc-article-hero">
          <div className="bbc-article-hero-top">
            <Link className="bbc-detail-back-link" href="/articles">
              ← 返回
            </Link>
            <span className="bbc-article-title-id">{article.id}</span>
            <div className="bbc-article-actions">
              <button
                aria-label={isArticleFavorite ? "取消收藏文章" : "收藏文章"}
                aria-pressed={isArticleFavorite}
                className={`favorite-star ${isArticleFavorite ? "active" : ""}`}
                onClick={toggleFavoriteArticle}
                title={isArticleFavorite ? "取消收藏文章" : "收藏文章"}
                type="button"
              >
                {isArticleFavorite ? "★" : "☆"}
              </button>
              <ContentShareButton
                label="分享文章"
                text={`${article.title}\n${articleTitleChinese}`.trim()}
                title={`${article.id}-${article.title}`}
                url={`/articles/${article.id}`}
              />
            </div>
          </div>
          <h1>
            <span className="bbc-article-title-line" lang="en">
              {article.title}
            </span>
            {articleTitleChinese ? (
              <span className="bbc-article-title-line" lang="zh-CN">
                {articleTitleChinese}
              </span>
            ) : null}
          </h1>
          <div className="bbc-article-word-count">
            共 <b className="stat-number">{articleWordCount}</b> 词
          </div>
        </div>

      <div className="bbc-article-study" ref={studyWorkspaceRef}>
        {article.fullAudioUrl ? (
          <section className="bbc-full-audio-panel">
            <div className="bbc-full-audio">
                      <AudioPlayer
                key={`bbc-full-${modeSelectionVersion}`}
                hasSelectedRate
                html5
                onPlayingChange={handleFullAudioPlayingChange}
                onSettingsChange={updateAudioSettings}
                onTimeChange={setFullAudioPosition}
                        settings={studyMode === "listening"
                          ? audioSettings
                          : { ...audioSettings, playMode: "sequential" }}
                settingsPlacement="none"
                src={article.fullAudioUrl}
                title={`${article.title} 完整音频`}
              />
            </div>
            <div className="bbc-audio-toolbar">
              <div className="bbc-audio-toolbar-settings bbc-audio-toolbar-modes">
                <AudioReadingMenu
                  isActive={studyMode === "general"}
                  isOriginalVisible={isOriginalVisible}
                  isVocabularyVisible={isVocabularyVisible}
                  onActivate={() => selectStudyMode("general")}
                  onOriginalVisibilityChange={setIsOriginalVisible}
                  onVocabularyVisibilityChange={setIsVocabularyVisible}
                />
                <div className="player-menu bbc-intensive-mode-menu">
                  <button
                    aria-haspopup="true"
                    aria-pressed={studyMode === "intensive"}
                    className={`player-menu-trigger bbc-fullscreen-toggle ${studyMode === "intensive" ? "active" : ""}`}
                    onClick={() => selectStudyMode(studyMode === "intensive" ? "general" : "intensive")}
                    type="button"
                  >
                    精读模式
                  </button>
                  {studyMode === "intensive" ? (
                    <div aria-label="精读标注显示" className="player-menu-panel" role="group">
                      <button
                        aria-checked={syntaxPosVisible}
                        className={syntaxPosVisible ? "active" : ""}
                        onClick={() => setSyntaxPosVisible((visible) => !visible)}
                        role="switch"
                        type="button"
                      >
                        <span>词性</span>
                        <span aria-hidden="true" className="player-menu-option-switch" />
                      </button>
                      <button
                        aria-checked={syntaxDisplayMode !== "none"}
                        className={syntaxDisplayMode !== "none" ? "active" : ""}
                        onClick={() => setSyntaxDisplayMode((mode) => mode === "none" ? "all" : "none")}
                        role="switch"
                        type="button"
                      >
                        <span>成分</span>
                        <span aria-hidden="true" className="player-menu-option-switch" />
                      </button>
                    </div>
                  ) : null}
                </div>
                <AudioSettingsMenus
                  onChange={updateAudioSettings}
                  onModeSelect={(mode) => selectStudyMode(mode)}
                  playModeLabel="精听模式"
                  preserveModeSettings
                  settings={audioSettings}
                  variant="listening-only"
                />
                <AudioSettingsMenus
                  onChange={updateAudioSettings}
                  onModeSelect={(mode) => selectStudyMode(mode)}
                  preserveModeSettings
                  settings={audioSettings}
                  variant="speaking-writing"
                />
              </div>
              <div className="bbc-audio-toolbar-utilities">
                <button
                  aria-label={isReadingTimerRunning ? "暂停计时" : "开始计时"}
                  aria-pressed={isReadingTimerRunning}
                  className={`bbc-reading-timer ${isReadingTimerRunning ? "active" : ""}`}
                  onClick={() => {
                    setIsReadingTimerVisible(true);
                    setIsReadingTimerRunning((current) => !current);
                  }}
                  title={isReadingTimerRunning ? "点击暂停计时" : "点击开始计时"}
                  type="button"
                >
                  <span>{isReadingTimerVisible ? formatReadingTime(readingSeconds) : "计时"}</span>
                </button>
                <AudioPronunciationMenu
                  onChange={(pronunciationMode) => updateAudioSettings({ pronunciationMode })}
                  value={audioSettings.pronunciationMode}
                />
                <AudioSettingsMenus
                  hasSelectedRate
                  onChange={updateAudioSettings}
                  settings={audioSettings}
                  variant="rate-only"
                />
                <AudioSettingsMenus
                  onChange={updateAudioSettings}
                  settings={audioSettings}
                  variant="subtitle-only"
                />
                <button
                  aria-pressed={isOriginalFullscreen}
                  className="bbc-fullscreen-toggle"
                  onClick={toggleOriginalFullscreen}
                  title={isOriginalFullscreen ? "退出全屏" : "全屏显示原文、词汇和音频"}
                  type="button"
                >
                  {isOriginalFullscreen ? "退出全屏" : "全屏"}
                </button>
                <StudyAnnotationTools
                  buttonClassName="annotation-toggle ielts-exam-action bbc-annotation-toggle"
                  sourceHref={`/articles/${article.id}`}
                  sourceId={`bbc:${article.id}`}
                  sourceTitle={`BBC ${article.id} ${article.title}`}
                  surfaceRef={pageRef}
                />
              </div>
            </div>
          </section>
        ) : null}
        <div
          className={`bbc-article-columns ${!isVocabularyVisible || studyMode === "intensive" ? "without-vocabulary" : ""} ${
            !isOriginalVisible ? "original-hidden" : ""
          }`}
        >
        <section className={`bbc-original-panel ${studyMode !== "general" ? "bbc-intensive-original-panel" : ""}`}>
          {isOriginalVisible ? (
            <div className={`bbc-original-copy ${originalDisplayMode === "bilingual" || studyMode !== "general" ? "bilingual" : ""}`}>
              {studyMode === "general" ? originalTextBlocksWithOffsets.map((textBlock, index) => (
                <div className="bbc-original-text-block" key={`${article.id}-paragraph-${index}`}>
                  {originalDisplayMode !== "chinese" ? (
                    <p lang="en">
                      {renderHighlightedEnglish(
                        textBlock.english,
                        textBlock.wordOffset,
                        activeFullGlobalWordIndex,
                        vocabularyHighlightWordIndexes,
                        articlePhraseWaveTerms,
                        articlePronunciations,
                      )}
                    </p>
                  ) : null}
                  {originalDisplayMode !== "english" && textBlock.chinese ? (
                    <p className="bbc-original-chinese" lang="zh-CN">{textBlock.chinese}</p>
                  ) : null}
                </div>
              )) : activeStudySentence ? (() => {
                const sentence = activeStudySentence;
                const syntaxSentence = editableSyntaxSentences[activeStudySentenceIndex];
                const inlineUnit = inlineAnnotationUnits[activeStudySentenceIndex];
                const sentenceAnnotations = studyMode === "intensive" && inlineUnit?.text === sentence.english
                  ? editableInlineAnnotations.filter((annotation) => annotation.unitId === inlineUnit.id)
                  : [];
                const hasBackendGrammarAnnotations = sentenceAnnotations.length > 0;
                const hasReviewedSyntax = studyMode === "intensive"
                  && syntaxSentence?.status === "reviewed"
                  && syntaxSentence.text === sentence.english;

                return (
                  <div className={`bbc-intensive-reading ${studyMode === "intensive" ? "bbc-syntax-reading" : ""}`} key={`${article.id}-intensive-sentence`}>
                    <div className="bbc-intensive-reading-actions">
                      {hasReviewedSyntax || hasBackendGrammarAnnotations ? <span className="bbc-intensive-sentence-number">#{sentence.sentenceNo}</span> : null}
                      <div className="bbc-intensive-sentence-controls">
                        <button
                          aria-label={favoriteSentenceIds.includes(favoriteSentenceId(article.id, sentence.sentenceNo)) ? "取消收藏本句" : "收藏本句"}
                          aria-pressed={favoriteSentenceIds.includes(favoriteSentenceId(article.id, sentence.sentenceNo))}
                          className={`favorite-star ${favoriteSentenceIds.includes(favoriteSentenceId(article.id, sentence.sentenceNo)) ? "active" : ""}`}
                          onClick={() => toggleFavoriteSentence(sentence)}
                          title={favoriteSentenceIds.includes(favoriteSentenceId(article.id, sentence.sentenceNo)) ? "取消收藏本句" : "收藏本句"}
                          type="button"
                        >
                          {favoriteSentenceIds.includes(favoriteSentenceId(article.id, sentence.sentenceNo)) ? "★" : "☆"}
                        </button>
                        <ContentShareButton
                          label="分享本句"
                          text={`${sentence.english}\n${sentence.chinese}`.trim()}
                          title={`${article.id} ${article.title} 第 ${sentence.sentenceNo} 句`}
                          url={`/articles/${article.id}#bbc-sentence-${sentence.sentenceNo}`}
                        />
                      </div>
                    </div>
                    {studyMode !== "speaking" && studyMode !== "writing" ? (
                      <>
                        {hasReviewedSyntax ? (
                          <BbcSyntaxInlineEditor
                            allInlineAnnotations={editableInlineAnnotations}
                            allSentences={editableSyntaxSentences}
                            articleId={article.id}
                            data={syntaxSentence}
                            displayMode={syntaxDisplayMode}
                            inlineAnnotations={sentenceAnnotations}
                            onInlineAnnotationsChange={setEditableInlineAnnotations}
                            onSentenceChange={(updated) => setEditableSyntaxSentences((current) => current.map((item, index) => index === activeStudySentenceIndex ? updated : item))}
                            sentenceNo={sentence.sentenceNo}
                            showPos={syntaxPosVisible}
                            translation={studyMode === "intensive"
                              ? sentence.chinese
                              : renderWaveHighlightedChinese(sentence.chinese, sentence.chineseUnderlinedTerms)}
                          />
                        ) : hasBackendGrammarAnnotations && inlineUnit ? (
                          <p className="bbc-intensive-english" lang="en">
                            <ArticleInlineAnnotatedText
                              annotations={sentenceAnnotations}
                              matchSyntaxRoleColors
                              renderText={(text, characterOffset) => renderHighlightedEnglish(
                                text,
                                getWordCount(sentence.english.slice(0, characterOffset)),
                                null,
                                new Set<number>(),
                                [],
                                articlePronunciations,
                              )}
                              showPartOfSpeech={syntaxPosVisible}
                              showComponents={syntaxDisplayMode !== "none"}
                              text={sentence.english}
                              unitId={inlineUnit.id}
                            />
                          </p>
                        ) : (
                          <p className="bbc-intensive-english" lang="en">
                            {renderHighlightedEnglish(
                              sentence.english,
                              studyMode === "intensive" ? 0 : activeStudySentenceWordOffset,
                              null,
                              studyMode === "intensive" ? new Set<number>() : vocabularyHighlightWordIndexes,
                              studyMode === "intensive" ? [] : sentence.underlinedTerms ?? [],
                              articlePronunciations,
                            )}
                          </p>
                        )}
                        {sentence.chinese && !hasReviewedSyntax ? (
                          <p className="bbc-intensive-chinese" lang="zh-CN">
                            {studyMode === "intensive"
                              ? sentence.chinese
                              : renderWaveHighlightedChinese(sentence.chinese, sentence.chineseUnderlinedTerms)}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    {studyMode === "writing" || studyMode === "speaking" ? (
                      <BbcSentencePractice
                        key={`${sentence.sentenceNo}:${sentence.english}`}
                        activeWordIndex={null}
                        englishContent={renderHighlightedEnglish(
                          sentence.english,
                          activeStudySentenceWordOffset,
                          null,
                          vocabularyHighlightWordIndexes,
                          sentence.underlinedTerms ?? [],
                          articlePronunciations,
                        )}
                        isAudioPlaying={isSentenceAudioPlaying && activeSentenceNo === sentence.sentenceNo}
                        sentence={sentence}
                        settings={studyMode === "speaking"
                          ? { ...audioSettings, dictationMode: "none" }
                          : { ...audioSettings, speakingMode: "none" }}
                        translationContent={renderWaveHighlightedChinese(sentence.chinese, sentence.chineseUnderlinedTerms)}
                      />
                    ) : null}
                    {studyMode === "speaking" && speakingTraining?.sentenceNo === sentence.sentenceNo ? (
                      <div aria-live="polite" className="bbc-speaking-training-status practicing">
                        <span>{SPEAKING_PHASE_LABELS[speakingTraining.mode]}</span>
                        <strong>{speakingTraining.remainingSeconds} 秒</strong>
                        <small>{audioSettings.playMode === "sentence-loop" ? "之后重播本句" : "之后播放下一句"}</small>
                      </div>
                    ) : studyMode === "speaking" && activeSentenceNo === sentence.sentenceNo && isSentenceAudioPlaying && audioSettings.speakingMode !== "none" ? (
                      <div className="bbc-speaking-training-status playing">
                        <span>{SPEAKING_MODE_LABELS[audioSettings.speakingMode]}</span>
                        <strong>正在播放</strong>
                        <small>{SPEAKING_PLAYING_HINTS[audioSettings.speakingMode]}</small>
                      </div>
                    ) : null}
                    <AudioPlayer
                      key={`${modeSelectionVersion}-${sentence.sentenceNo}`}
                      autoPlaySignal={sentenceAutoPlaySignals[sentence.sentenceNo] ?? 0}
                      compactControls
                      deferSentenceLoop={studyMode === "speaking" && audioSettings.speakingMode !== "none"}
                      hasSelectedRate
                      html5
                      preload={false}
                      leadingControls={(
                        <button
                          aria-label="上一句"
                          className="bbc-sentence-navigation-button"
                          disabled={!previousStudySentence}
                          onClick={() => previousStudySentence && selectStudySentence(previousStudySentence.sentenceNo)}
                          type="button"
                        >上一句</button>
                      )}
                      onEnded={() => handleSentenceEnded(sentence)}
                      onPlayingChange={(isPlaying) => handleSentencePlayingChange(sentence.sentenceNo, isPlaying)}
                      onSettingsChange={updateAudioSettings}
                      onTimeChange={(positionSeconds) => handleSentenceTimeChange(sentence.sentenceNo, positionSeconds)}
                      seekRequest={sentenceRestoreSeekRequest?.sentenceNo === sentence.sentenceNo ? sentenceRestoreSeekRequest : null}
                      settings={audioSettings}
                      settingsPlacement="none"
                      skipSeconds={3}
                      src={sentence.audioUrl}
                      title={`第 ${sentence.sentenceNo} 句音频`}
                      trailingControls={(
                        <button
                          aria-label="下一句"
                          className="bbc-sentence-navigation-button"
                          disabled={!nextStudySentence}
                          onClick={() => nextStudySentence && selectStudySentence(nextStudySentence.sentenceNo)}
                          type="button"
                        >下一句</button>
                      )}
                    />
                  </div>
                );
              })() : originalTextBlocksWithOffsets.slice(0, 1).map((textBlock, index) => (
                <div className="bbc-original-text-block" key={`${article.id}-first-paragraph-${index}`}>
                  <p lang="en">{textBlock.english}</p>
                  {textBlock.chinese ? <p className="bbc-original-chinese" lang="zh-CN">{textBlock.chinese}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

        </section>

        {isVocabularyVisible && studyMode !== "intensive" ? (
          <section className="bbc-vocabulary-panel">
            <header className="bbc-vocabulary-head">
              <h2>词汇、短语、地道表达</h2>
              <span
                aria-label={`本篇共 ${articleVocabularyForDisplay.length} 项`}
                className="bbc-vocabulary-total-count"
              >
                {articleVocabularyForDisplay.length}
              </span>
            </header>
            <div className="bbc-vocabulary-list">
              {articleVocabularyForDisplay.map((item, displayIndex) => {
                const parsedVocabulary = parseBbcVocabularyItem(item);
                const favoriteVocabularyId = parsedVocabulary.normalizedWord;
                const vocabularyDetailTerm = parsedVocabulary.lemma || parsedVocabulary.word;

                return (
                  <article
                    className="bbc-vocabulary-item"
                    id={`bbc-vocabulary-${item.number}`}
                    key={`${article.id}-vocabulary-${item.number}`}
                  >
                    <div className="bbc-vocabulary-item-head">
                      <strong>
                        <Link
                          className="bbc-vocabulary-term-link"
                          href={getVocabularyDetailHref(vocabularyDetailTerm, `/articles/${article.id}`)}
                          onClick={saveVocabularyReturnState}
                        >
                          {displayIndex + 1}. {parsedVocabulary.word || cleanBbcVocabularyDisplayText(item.lemma ?? item.term)}
                        </Link>
                      </strong>
                      <div className="bbc-vocabulary-item-actions">
                        <button
                          aria-label={`${favoriteWordIds.includes(favoriteVocabularyId) ? "取消收藏" : "收藏"} ${item.term}`}
                          aria-pressed={favoriteWordIds.includes(favoriteVocabularyId)}
                          className={`favorite-star ${favoriteWordIds.includes(favoriteVocabularyId) ? "active" : ""}`}
                          onClick={() => toggleFavoriteVocabulary(item)}
                          title={favoriteWordIds.includes(favoriteVocabularyId) ? "取消收藏" : "收藏"}
                          type="button"
                        >
                          {favoriteWordIds.includes(favoriteVocabularyId) ? "★" : "☆"}
                        </button>
                      </div>
                    </div>
                    <div className="bbc-vocabulary-details">
                      {parsedVocabulary.ukPhonetic || parsedVocabulary.usPhonetic ? (
                        <p>
                          {parsedVocabulary.ukPhonetic ? `英 ${parsedVocabulary.ukPhonetic}` : null}
                          {parsedVocabulary.ukPhonetic && parsedVocabulary.usPhonetic ? "　" : null}
                          {parsedVocabulary.usPhonetic ? `美 ${parsedVocabulary.usPhonetic}` : null}
                        </p>
                      ) : null}
                      {parsedVocabulary.definitionLines.map((definitionLine, index) => (
                        <p key={`${item.number}-definition-${index}`}>{definitionLine}</p>
                      ))}
                      {item.example ? <p>{item.example}</p> : null}
                      {item.translation ? <p>{item.translation}</p> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        </div>

          <BbcArticleQuiz key={article.id} articleId={article.id} articleTitle={article.title} />
          <BbcArticleComments articleId={article.id} />



        </div>

    </section>
  );
}
