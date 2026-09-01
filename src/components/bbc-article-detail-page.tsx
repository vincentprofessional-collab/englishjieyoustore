"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AudioPlayer,
  DEFAULT_AUDIO_PLAYER_SETTINGS,
  type AudioPlayerSettings,
  type AudioSpeakingMode,
} from "@/components/audio-player";
import { BbcSentencePractice } from "@/components/bbc-sentence-practice";
import { ContentShareButton } from "@/components/content-share-button";
import { StudyAnnotationTools } from "@/components/study-annotation-tools";
import { supabase } from "@/lib/supabase/client";
import type {
  BbcArticle,
  BbcArticleSentence,
  BbcVocabularyItem,
} from "@/lib/articles/bbc";
import { mergeBbcVocabularyItems } from "@/lib/articles/bbc-vocabulary-merge";
import {
  getActiveWordIndex,
  getNextSentenceNo,
  getSpeakingPracticeDelayMs,
  getWordCount,
} from "@/lib/articles/bbc-speaking-training.mjs";

type ArticlePageProps = {
  article: BbcArticle;
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
type OriginalVisibilityMode = "show-original" | "hide-original" | "hide-vocabulary";
type ActiveSpeakingMode = Exclude<AudioSpeakingMode, "none">;

type SpeakingTrainingState = {
  mode: ActiveSpeakingMode;
  remainingSeconds: number;
  sentenceNo: number;
};

const ORIGINAL_DISPLAY_MODES: { label: string; mode: OriginalDisplayMode }[] = [
  { label: "英文", mode: "english" },
  { label: "中英", mode: "bilingual" },
  { label: "中文", mode: "chinese" },
];

const ORIGINAL_VISIBILITY_MODES: { label: string; mode: OriginalVisibilityMode }[] = [
  { label: "显示原文", mode: "show-original" },
  { label: "隐藏原文", mode: "hide-original" },
  { label: "隐藏词汇", mode: "hide-vocabulary" },
];

const SPEAKING_MODE_LABELS: Record<ActiveSpeakingMode, string> = {
  imitation: "模仿朗读",
  shadowing: "影子练习",
  "sight-translation": "视译训练",
};

const SPEAKING_PHASE_LABELS: Record<ActiveSpeakingMode, string> = {
  imitation: "轮到你模仿朗读",
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

function getBbcVocabularyOverride(metaJson: unknown): BbcVocabularyItem[] | null {
  if (!metaJson || typeof metaJson !== "object" || !("vocabulary" in metaJson)) {
    return null;
  }

  const vocabulary = (metaJson as { vocabulary?: unknown }).vocabulary;
  return Array.isArray(vocabulary) ? (vocabulary as BbcVocabularyItem[]) : null;
}

function MouseClickIcon() {
  return (
    <svg aria-hidden="true" className="bbc-reading-timer-icon" viewBox="0 0 24 24">
      <path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v6a5.5 5.5 0 0 0 11 0V9A5.5 5.5 0 0 0 12 3.5Z" />
      <path d="M12 3.5v7.25" />
      <path d="M9.25 15.25h5.5" />
    </svg>
  );
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
): { chinese?: string; english: string }[] {
  if (!sentences?.length) {
    return paragraphs.map((english) => ({ english }));
  }

  let sentenceIndex = 0;

  return paragraphs.map((english) => {
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
      chinese: chineseParts.join("") || undefined,
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
  return (
    headword.match(/\.{3}|…|[A-Za-z]+(?:['’\-][A-Za-z]+)*/g) ?? []
  ).map(normalizeBbcVocabularyToken);
}

function isBbcVocabularyPlaceholder(value: string) {
  return BBC_VOCABULARY_PLACEHOLDERS.has(value.replace(/’/g, "'"));
}

function getBbcVocabularyPhraseMatchIndexes(words: string[], vocabularyPattern: string[], start: number) {
  const maxInsertedWords = vocabularyPattern.length > 1 ? 6 : 0;

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
) {
  let wordIndex = wordOffset;
  const tokens = text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[^A-Za-z]+/g) ?? [text];
  const tokenStates = tokens.map((token) => {
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

    return { classNames, isVocabularyHighlight, isWord, token };
  });
  const groupedTokens: { classNames: string; text: string }[] = [];

  tokenStates.forEach((state, tokenIndex) => {
    const previousState = tokenStates[tokenIndex - 1];
    const nextState = tokenStates[tokenIndex + 1];
    const classNames =
      !state.isWord && /^[\s]+$/.test(state.token) && previousState?.isVocabularyHighlight && nextState?.isVocabularyHighlight
        ? "bbc-vocabulary-highlight"
        : state.classNames;
    const previousGroup = groupedTokens.at(-1);

    if (previousGroup && previousGroup.classNames === classNames) {
      previousGroup.text += state.token;
      return;
    }

    groupedTokens.push({ classNames, text: state.token });
  });

  return groupedTokens.map((group, tokenIndex) => (
    <span
      className={group.classNames || undefined}
      key={`${wordOffset}-${tokenIndex}`}
    >
      {group.text}
    </span>
  ));
}

function OriginalDisplayMenu({
  mode,
  onChange,
}: {
  mode: OriginalDisplayMode;
  onChange: (mode: OriginalDisplayMode) => void;
}) {
  const selectedMode = ORIGINAL_DISPLAY_MODES.find((displayMode) => displayMode.mode === mode) ??
    ORIGINAL_DISPLAY_MODES[0];

  return (
    <div className="player-menu bbc-original-display-dropdown">
      <button
        aria-label="原文显示模式"
        className="player-menu-trigger"
        type="button"
      >
        <span>{selectedMode.label}</span>
      </button>
      <div className="player-menu-panel">
        {ORIGINAL_DISPLAY_MODES.map((displayMode) => (
          <button
            aria-pressed={mode === displayMode.mode}
            className={mode === displayMode.mode ? "active" : ""}
            key={displayMode.mode}
            onClick={() => onChange(displayMode.mode)}
            type="button"
          >
            {displayMode.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OriginalVisibilityMenu({
  isOriginalVisible,
  isVocabularyVisible,
  onChange,
}: {
  isOriginalVisible: boolean;
  isVocabularyVisible: boolean;
  onChange: (mode: OriginalVisibilityMode) => void;
}) {
  const selectedMode = !isOriginalVisible
    ? "hide-original"
    : !isVocabularyVisible
      ? "hide-vocabulary"
      : "show-original";
  const selectedLabel = ORIGINAL_VISIBILITY_MODES.find((item) => item.mode === selectedMode)?.label ?? "显示原文";

  return (
    <div className="player-menu bbc-original-visibility-dropdown">
      <button aria-label="原文和词汇显示设置" className="player-menu-trigger" type="button">
        <span>{selectedLabel}</span>
      </button>
      <div className="player-menu-panel">
        {ORIGINAL_VISIBILITY_MODES.map((item) => (
          <button
            aria-pressed={selectedMode === item.mode}
            className={selectedMode === item.mode ? "active" : ""}
            key={item.mode}
            onClick={() => onChange(item.mode)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ArticleDetailPage({ article }: ArticlePageProps) {
  const [audioSettings, setAudioSettings] = useState<AudioPlayerSettings>(() => ({
    ...DEFAULT_AUDIO_PLAYER_SETTINGS,
    subtitleMode: "bilingual",
  }));
  const [isOriginalVisible, setIsOriginalVisible] = useState(true);
  const [isVocabularyVisible, setIsVocabularyVisible] = useState(true);
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
  const [isOriginalFullscreen, setIsOriginalFullscreen] = useState(false);
  const pageRef = useRef<HTMLElement | null>(null);
  const studyWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const activeSentenceNoRef = useRef<number | null>(null);
  const audioSettingsRef = useRef(audioSettings);
  const speakingCountdownRef = useRef<number | null>(null);
  const speakingAdvanceRef = useRef<number | null>(null);

  useEffect(() => {
    audioSettingsRef.current = audioSettings;
  }, [audioSettings]);

  useEffect(() => {
    let cancelled = false;
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
        ? getBbcVocabularyOverride(overrideResult.data?.meta_json)
        : null;

      setArticleVocabulary(override ?? mergeBbcVocabularyItems(currentArticle.vocabulary, automaticVocabulary));
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
    setSentenceAutoPlaySignals((current) => ({
      ...current,
      [nextSentenceNo]: (current[nextSentenceNo] ?? 0) + 1,
    }));
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

    if (speakingMode === "none") {
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
            title: `${article.id}-${article.title}${article.titleChinese ? ` ${article.titleChinese}` : ""}`,
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
  const originalTextBlocks = getOriginalTextBlocks(article.body, article.sentences);
  const visibleArticleVocabulary = articleVocabulary.filter((item) => item.highlight !== false);
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
    <section className="stack bbc-article-page" ref={pageRef}>
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
                text={`${article.title}\n${article.titleChinese ?? ""}`.trim()}
                title={`${article.id}-${article.title}`}
                url={`/articles/${article.id}`}
              />
            </div>
          </div>
          <h1>
            <span className="bbc-article-title-line" lang="en">
              {article.title}
            </span>
            {article.titleChinese ? (
              <span className="bbc-article-title-line" lang="zh-CN">
                {article.titleChinese}
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
                hasSelectedRate
                html5={false}
                onPlayingChange={handleFullAudioPlayingChange}
                onSettingsChange={updateAudioSettings}
                onTimeChange={setFullAudioPosition}
                settings={audioSettings}
                settingsPlacement="none"
                src={article.fullAudioUrl}
                title={`${article.title} 完整音频`}
              />
            </div>
          </section>
        ) : null}

        <div
          className={`bbc-article-columns ${isVocabularyVisible && orderedArticleVocabulary.length ? "" : "without-vocabulary"} ${
            !isOriginalVisible ? "original-hidden" : ""
          }`}
        >
        <section className="bbc-original-panel">
          <header className="bbc-original-head">
            <button
              aria-label={isReadingTimerRunning ? "暂停阅读计时" : "开始阅读计时"}
              aria-pressed={isReadingTimerRunning}
              className={`bbc-reading-timer ${isReadingTimerRunning ? "active" : ""}`}
              onClick={() => setIsReadingTimerRunning((current) => !current)}
              title={isReadingTimerRunning ? "点击暂停计时" : "点击开始计时"}
              type="button"
            >
              <span>{formatReadingTime(readingSeconds)}</span>
              <MouseClickIcon />
            </button>
            <div className="bbc-original-actions">
              <OriginalDisplayMenu mode={originalDisplayMode} onChange={setOriginalDisplayMode} />
              <OriginalVisibilityMenu
                isOriginalVisible={isOriginalVisible}
                isVocabularyVisible={isVocabularyVisible}
                onChange={(mode) => {
                  if (mode === "show-original") {
                    setIsOriginalVisible(true);
                    setIsVocabularyVisible(true);
                  } else if (mode === "hide-original") {
                    setIsOriginalVisible(false);
                    setIsVocabularyVisible(true);
                  } else {
                    setIsOriginalVisible(true);
                    setIsVocabularyVisible(false);
                  }
                }}
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
          </header>

          {isOriginalVisible ? (
            <div className={`bbc-original-copy ${originalDisplayMode === "bilingual" ? "bilingual" : ""}`}>
              {originalTextBlocksWithOffsets.map((textBlock, index) => (
                <div
                  className="bbc-original-text-block"
                  key={`${article.id}-paragraph-${index}`}
                >
                  {originalDisplayMode !== "chinese" ? (
                    <p lang="en">
                      {renderHighlightedEnglish(
                        textBlock.english,
                        textBlock.wordOffset,
                        activeFullGlobalWordIndex,
                        vocabularyHighlightWordIndexes,
                      )}
                    </p>
                  ) : null}
                  {originalDisplayMode !== "english" && textBlock.chinese ? (
                    <p className="bbc-original-chinese" lang="zh-CN">
                      {textBlock.chinese}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

        </section>

        {isVocabularyVisible && orderedArticleVocabulary.length ? (
          <section className="bbc-vocabulary-panel">
            <header className="bbc-vocabulary-head">
              <h2>词汇、短语、地道表达</h2>
              <span
                aria-label={`本篇共 ${orderedArticleVocabulary.length} 项`}
                className="bbc-vocabulary-total-count"
              >
                {orderedArticleVocabulary.length}
              </span>
            </header>
            <div className="bbc-vocabulary-list">
              {orderedArticleVocabulary.map((item) => {
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
                          href={`/vocabulary/${encodeURIComponent(vocabularyDetailTerm)}`}
                        >
                          {item.number}. {parsedVocabulary.word || cleanBbcVocabularyDisplayText(item.lemma ?? item.term)}
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

        <article className="bbc-transcript-panel">
          <header className="bbc-transcript-head">
            <span className="bbc-transcript-kicker">Transcript</span>
            <h2>中英逐句原文</h2>
          </header>

          {article.sentences?.length ? (
            <div className="sentence-list bbc-listening-sentence-list">
              {article.sentences.map((sentence) => (
                <article
                  className={`sentence-card bbc-listening-sentence-card ${
                    activeSentenceNo === sentence.sentenceNo ? "active" : ""
                  }`}
                  id={`bbc-sentence-${sentence.sentenceNo}`}
                  key={`${article.id}-${sentence.sentenceNo}`}
                >
                  <div className="sentence-meta">
                    <div className="sentence-meta-copy">
                      <span>#{sentence.sentenceNo}</span>
                    </div>
                    <div className="favorite-share-actions">
                      <button
                        aria-label={`${favoriteSentenceIds.includes(favoriteSentenceId(article.id, sentence.sentenceNo)) ? "取消收藏" : "收藏"}第 ${sentence.sentenceNo} 句`}
                        className={`favorite-star ${
                          favoriteSentenceIds.includes(favoriteSentenceId(article.id, sentence.sentenceNo))
                            ? "active"
                            : ""
                        }`}
                        onClick={() => toggleFavoriteSentence(sentence)}
                        title={favoriteSentenceIds.includes(favoriteSentenceId(article.id, sentence.sentenceNo)) ? "取消收藏" : "收藏"}
                        type="button"
                      >
                        {favoriteSentenceIds.includes(favoriteSentenceId(article.id, sentence.sentenceNo)) ? "★" : "☆"}
                      </button>
                      <ContentShareButton
                        label={`分享第 ${sentence.sentenceNo} 句`}
                        text={`${sentence.english}\n${sentence.chinese}`}
                        title={`${article.id} 第 ${sentence.sentenceNo} 句`}
                        url={`/articles/${article.id}#bbc-sentence-${sentence.sentenceNo}`}
                      />
                    </div>
                  </div>
                  <div className="sentence-copy bbc-listening-sentence-copy">
                    <BbcSentencePractice
                      activeWordIndex={
                        isSentenceAudioPlaying && activeSentenceNo === sentence.sentenceNo
                          ? getActiveWordIndex(
                              sentence.english,
                              activeSentencePosition,
                              Math.max((sentence.endMs - sentence.startMs) / 1_000, 0.1),
                            )
                          : null
                      }
                      isAudioPlaying={
                        isSentenceAudioPlaying && activeSentenceNo === sentence.sentenceNo
                      }
                      sentence={sentence}
                      settings={audioSettings}
                    />
                  </div>
                  {speakingTraining?.sentenceNo === sentence.sentenceNo ? (
                    <div aria-live="polite" className="bbc-speaking-training-status practicing">
                      <span>{SPEAKING_PHASE_LABELS[speakingTraining.mode]}</span>
                      <strong>{speakingTraining.remainingSeconds} 秒</strong>
                      <small>
                        后
                        {audioSettings.playMode === "sentence-loop"
                          ? "重播本句"
                          : sentence.sentenceNo === article.sentences?.at(-1)?.sentenceNo
                            ? "结束本轮训练"
                            : "播放下一句"}
                      </small>
                    </div>
                  ) : activeSentenceNo === sentence.sentenceNo &&
                    isSentenceAudioPlaying &&
                    audioSettings.speakingMode !== "none" ? (
                    <div className="bbc-speaking-training-status playing">
                      <span>{SPEAKING_MODE_LABELS[audioSettings.speakingMode]}</span>
                      <strong>正在播放</strong>
                      <small>{SPEAKING_PLAYING_HINTS[audioSettings.speakingMode]}</small>
                    </div>
                  ) : null}
                  <AudioPlayer
                    autoPlaySignal={sentenceAutoPlaySignals[sentence.sentenceNo] ?? 0}
                    deferSentenceLoop={audioSettings.speakingMode !== "none"}
                    hasSelectedRate
                    html5={false}
                    onEnded={() => handleSentenceEnded(sentence)}
                    onPlayingChange={(isPlaying) =>
                      handleSentencePlayingChange(sentence.sentenceNo, isPlaying)
                    }
                    onSettingsChange={updateAudioSettings}
                    onTimeChange={(positionSeconds) =>
                      handleSentenceTimeChange(sentence.sentenceNo, positionSeconds)
                    }
                    settings={audioSettings}
                    src={sentence.audioUrl}
                    title={`第 ${sentence.sentenceNo} 句音频`}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="bbc-original-copy">
              {article.body.map((paragraph, index) => (
                <p key={`${article.id}-fallback-${index}`}>{paragraph}</p>
              ))}
            </div>
          )}
        </article>

        </div>

    </section>
  );
}
