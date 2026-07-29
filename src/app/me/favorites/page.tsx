"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { playVocabularyPronunciation } from "@/lib/vocabulary/pronunciation-audio";
import { supabase } from "@/lib/supabase/client";
import { getPublicStorageUrl } from "@/lib/supabase/storage";

type FavoriteTab = "words" | "sentences" | "articles" | "questions" | "annotations";

type FavoriteSentenceItem = {
  audioUrl?: string | null;
  bookCode?: string;
  chineseText?: string;
  englishText: string;
  href?: string;
  id: string;
  savedAt: string;
  sectionId?: string;
  sectionTitle?: string;
  sentenceNo?: number;
  testNo?: number;
};

type FavoriteSentenceAudioRow = {
  audio_path: string | null;
  chinese_text?: string | null;
  english_text?: string | null;
  section_id: string;
  sentence_no: number;
};

type FavoriteWordItem = {
  definitionCn: string;
  definitionLines?: string[];
  etymologySource?: string;
  formation?: string;
  href?: string;
  id: string;
  level?: string;
  normalizedWord?: string;
  partOfSpeech: string;
  phonetic: string;
  root?: string;
  rootKey?: string;
  savedAt: string;
  sourceHref?: string;
  sourceTitle?: string;
  ukPhonetic?: string;
  usPhonetic?: string;
  word: string;
};

type FavoriteArticleItem = {
  excerpt?: string;
  href?: string;
  id: string;
  savedAt: string;
  sourceTitle?: string;
  title: string;
};

type FavoriteQuestionItem = {
  href?: string;
  id: string;
  savedAt: string;
  sourceTitle?: string;
  title: string;
};

type FavoriteAnnotationItem = {
  excerpt?: string;
  href?: string;
  id: string;
  savedAt: string;
  sourceTitle?: string;
  title: string;
};

type FavoriteSortMode = "time" | "alphabetical" | "random";

const FAVORITE_ANNOTATIONS_STORAGE_KEY = "ielts-platform.favoriteAnnotations";
const FAVORITE_ARTICLES_STORAGE_KEY = "ielts-platform.favoriteArticles";
const FAVORITE_QUESTIONS_STORAGE_KEY = "ielts-platform.favoriteQuestions";
const FAVORITE_SENTENCES_STORAGE_KEY = "ielts-platform.favoriteSentences";
const FAVORITE_WORDS_STORAGE_KEY = "ielts-platform.favoriteWords";

const favoriteTabs: Array<{ id: FavoriteTab; label: string; eyebrow: string }> = [
  { id: "words", label: "单词", eyebrow: "Words" },
  { id: "sentences", label: "句子", eyebrow: "Sentences" },
  { id: "articles", label: "文章", eyebrow: "Articles" },
  { id: "questions", label: "题目", eyebrow: "Questions" },
  { id: "annotations", label: "批注", eyebrow: "Notes" },
];

const favoriteSortOptions: Array<{ id: FavoriteSortMode; label: string }> = [
  { id: "time", label: "按时间" },
  { id: "alphabetical", label: "按首字母" },
  { id: "random", label: "乱序" },
];

function readStorageList<T>(key: string) {
  try {
    const rawValue = window.localStorage.getItem(key);
    const parsedValue = rawValue ? (JSON.parse(rawValue) as T[]) : [];

    return [...parsedValue].sort(
      (a, b) =>
        new Date((b as { savedAt?: string }).savedAt ?? "").getTime() -
        new Date((a as { savedAt?: string }).savedAt ?? "").getTime(),
    );
  } catch {
    return [];
  }
}

function writeStorageList<T>(key: string, items: T[]) {
  window.localStorage.setItem(key, JSON.stringify(items));
}

function getFavoriteSentenceLookupKey(sentence: FavoriteSentenceItem) {
  return sentence.sectionId && sentence.sentenceNo != null
    ? `${sentence.sectionId}:${sentence.sentenceNo}`
    : "";
}

function getFavoriteSentenceHref(sentence: FavoriteSentenceItem) {
  if (sentence.sectionId && sentence.sentenceNo != null) {
    return `/listening/${sentence.sectionId}?mode=practice&review=1#transcript-sentence-${sentence.sentenceNo}`;
  }

  return sentence.href ?? "#";
}

async function hydrateFavoriteSentences(items: FavoriteSentenceItem[]) {
  const missingItems = items.filter((item) => !item.audioUrl);
  let changed = false;
  const itemsWithCurrentHref = items.map((item) => {
    const currentHref = getFavoriteSentenceHref(item);

    if (item.href === currentHref) {
      return item;
    }

    changed = true;
    return {
      ...item,
      href: currentHref,
    };
  });

  if (missingItems.length === 0) {
    return changed ? itemsWithCurrentHref : items;
  }

  const sectionIds = Array.from(
    new Set(missingItems.map((item) => item.sectionId).filter(Boolean) as string[]),
  );
  const exactEnglishTexts = Array.from(
    new Set(
      missingItems
        .filter((item) => !getFavoriteSentenceLookupKey(item))
        .map((item) => item.englishText.trim())
        .filter(Boolean),
    ),
  );
  const audioBySectionAndSentence = new Map<string, string>();
  const audioByEnglishText = new Map<string, string>();

  if (sectionIds.length > 0) {
    const { data } = await supabase
      .from("transcript_sentences")
      .select("section_id,sentence_no,english_text,chinese_text,audio_path")
      .in("section_id", sectionIds);

    for (const row of ((data ?? []) as FavoriteSentenceAudioRow[])) {
      const audioUrl = getPublicStorageUrl("audio", row.audio_path);

      if (!audioUrl) {
        continue;
      }

      audioBySectionAndSentence.set(`${row.section_id}:${row.sentence_no}`, audioUrl);

      if (row.english_text) {
        audioByEnglishText.set(row.english_text.trim(), audioUrl);
      }
    }
  }

  if (exactEnglishTexts.length > 0) {
    const { data } = await supabase
      .from("transcript_sentences")
      .select("section_id,sentence_no,english_text,chinese_text,audio_path")
      .in("english_text", exactEnglishTexts);

    for (const row of ((data ?? []) as FavoriteSentenceAudioRow[])) {
      const audioUrl = getPublicStorageUrl("audio", row.audio_path);

      if (audioUrl && row.english_text && !audioByEnglishText.has(row.english_text.trim())) {
        audioByEnglishText.set(row.english_text.trim(), audioUrl);
      }
    }
  }

  const hydratedItems = itemsWithCurrentHref.map((item) => {
    if (item.audioUrl) {
      return item;
    }

    const audioUrl =
      audioBySectionAndSentence.get(getFavoriteSentenceLookupKey(item)) ??
      audioByEnglishText.get(item.englishText.trim());

    if (!audioUrl) {
      return item;
    }

    changed = true;
    return {
      ...item,
      audioUrl,
    };
  });

  return changed ? hydratedItems : items;
}

function cleanVocabularyText(value?: string) {
  return (value ?? "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function isPartOfSpeechHint(value: string) {
  return /^(?:n|v|adj|adv|a|prep|phr|phrase)\.?$/i.test(value.trim());
}

function stripPartOfSpeechPrefix(value: string) {
  return value
    .replace(/^(?:n|v|adj|adv|a|prep|phr|phrase)\.?(?:\s+|(?=[\u4e00-\u9fff]))/i, "")
    .replace(/^[.·•:：;；\s]+/, "")
    .trim();
}

function parseEmbeddedVocabulary(value?: string) {
  const cleanedValue = cleanVocabularyText(value);

  if (/^(?:n|v|adj|adv|a|prep|phr|phrase)\.?\s/i.test(cleanedValue)) {
    return {
      definition: stripPartOfSpeechPrefix(cleanedValue),
      phonetic: "",
      word: "",
    };
  }

  const word = cleanedValue.match(/^[A-Za-z]+(?:[- ][A-Za-z]+)*/)?.[0]?.trim() ?? "";
  let rest = word ? cleanedValue.slice(word.length).trim() : cleanedValue;
  let phonetic = "";

  const bracketMatch = rest.match(/^\[([^\]]+)\]\s*/);
  if (bracketMatch) {
    if (!isPartOfSpeechHint(bracketMatch[1])) {
      phonetic = bracketMatch[1].trim();
    }
    rest = rest.slice(bracketMatch[0].length).trim();
  }

  const slashMatch = rest.match(/^\/([^/]+)\/\s*/);
  if (slashMatch) {
    phonetic = slashMatch[1].trim();
    rest = rest.slice(slashMatch[0].length).trim();
  }

  const partOfSpeechMatch = rest.match(/^\[([^\]]+)\]\s*/);
  if (partOfSpeechMatch && isPartOfSpeechHint(partOfSpeechMatch[1])) {
    rest = rest.slice(partOfSpeechMatch[0].length).trim();
  }

  rest = stripPartOfSpeechPrefix(rest);

  return {
    definition: rest,
    phonetic,
    word,
  };
}

function normalizeFavoriteLookupWord(value?: string) {
  return parseEmbeddedVocabulary(value).word.toLowerCase();
}

function formatBbcSourceFromHref(href?: string) {
  const articleId = href?.match(/^\/articles\/([^#?]+)/)?.[1];

  return articleId ? `BBC ${articleId}` : "";
}

function getFavoriteQuestionSourceLabel(question: FavoriteQuestionItem) {
  const sourceText = [
    question.id,
    question.href,
    question.sourceTitle,
    question.title,
  ]
    .filter(Boolean)
    .join(" ");
  const moduleMatch = sourceText.match(/\b(speaking|writing|listening|reading)\b/i);

  if (!moduleMatch) {
    return question.sourceTitle ?? "";
  }

  const moduleLabels: Record<string, string> = {
    listening: "Listening",
    reading: "Reading",
    speaking: "Speaking",
    writing: "Writing",
  };
  const moduleKey = moduleMatch[1].toLowerCase();
  const cambridgeNumber =
    sourceText.match(/\bcambridge(?:\s+ielts)?[-\s]*(\d+)\b/i)?.[1] ??
    sourceText.match(/\bci[-\s]*(\d+)\b/i)?.[1] ??
    sourceText.match(/剑桥雅思\s*(\d+)/)?.[1];
  const testNumber = sourceText.match(/\btest[-\s]*(\d+)\b/i)?.[1];
  const partNumber = sourceText.match(/\bpart[-\s]*(\d+)\b/i)?.[1];
  const taskNumber = sourceText.match(/\btask[-\s]*(\d+)\b/i)?.[1];
  const questionNumber =
    sourceText.match(/\bquestion[-\s]*(\d+(?:[-–]\d+)?)\b/i)?.[1] ??
    sourceText.match(/\bspeaking-part-\d+-(\d+)\b/i)?.[1];
  const questionLabel = questionNumber
    ?.split(/[-–]/)
    .map((value) => Number(value))
    .join("–");
  const labels = [
    cambridgeNumber ? `IELTS Cambridge ${Number(cambridgeNumber)}` : "IELTS",
    moduleLabels[moduleKey],
    testNumber ? `Test ${Number(testNumber)}` : "",
    partNumber ? `Part ${Number(partNumber)}` : "",
    taskNumber ? `Task ${Number(taskNumber)}` : "",
    questionLabel ? `Question ${questionLabel}` : "",
  ].filter(Boolean);

  return labels.join(" · ");
}

function isGeneratedFavoriteQuestionTitle(title: string) {
  return /^(?:listening|reading)\s+(?:ci|cambridge)[-\s\d]/i.test(title.trim());
}

function getFavoriteWordDisplay(word: FavoriteWordItem) {
  const rawDefinition = word.definitionLines?.[0] ?? word.definitionCn;
  const parsedWord = parseEmbeddedVocabulary(word.word);
  const parsedDefinition = parseEmbeddedVocabulary(rawDefinition);
  const displayWord = parsedWord.word || cleanVocabularyText(word.word);
  const parsedDefinitionText =
    parsedWord.definition && parsedWord.word && parsedWord.word !== cleanVocabularyText(word.word)
      ? parsedWord.definition
      : parsedDefinition.definition;
  const definition = cleanVocabularyText(parsedDefinitionText || rawDefinition);
  const normalizedWord =
    normalizeFavoriteLookupWord(word.normalizedWord) || displayWord.toLowerCase();
  const sourceTitle =
    word.sourceTitle ?? (word.href?.startsWith("/articles/") ? formatBbcSourceFromHref(word.href) : "");
  const sourceHref = word.sourceHref ?? (word.href?.startsWith("/articles/") ? word.href : undefined);
  const isPhrase = /\s/.test(displayWord) || /^(?:phr|phrase)\.?$/i.test(word.partOfSpeech.trim());

  return {
    definition: stripPartOfSpeechPrefix(definition),
    detailHref: `/vocabulary/${encodeURIComponent(normalizedWord)}`,
    href: isPhrase && sourceHref ? sourceHref : `/vocabulary/${encodeURIComponent(normalizedWord)}`,
    isPhrase,
    normalizedWord,
    sourceHref,
    sourceTitle,
    ukPhonetic: word.ukPhonetic || word.phonetic || parsedWord.phonetic || parsedDefinition.phonetic,
    usPhonetic: word.usPhonetic || word.phonetic || parsedWord.phonetic || parsedDefinition.phonetic,
    word: displayWord,
  };
}

function hashForRandomSort(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function sortFavoriteItems<T extends { id: string; savedAt: string }>(
  items: T[],
  mode: FavoriteSortMode,
  randomSeed: number,
  getText: (item: T) => string,
) {
  return [...items].sort((left, right) => {
    if (mode === "alphabetical") {
      return getText(left).localeCompare(getText(right), "en", { sensitivity: "base" });
    }

    if (mode === "random") {
      return (
        hashForRandomSort(`${randomSeed}:${left.id}`) -
        hashForRandomSort(`${randomSeed}:${right.id}`)
      );
    }

    return new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime();
  });
}

function formatFavoritePhonetic(value?: string) {
  const firstPhonetic =
    value
      ?.split(/[;,，；]/)[0]
      ?.replace(/[\[\]]/g, "")
      .replace(/^\/+|\/+$/g, "")
      .trim() ?? "";

  if (!firstPhonetic) {
    return "";
  }

  return `/ ${firstPhonetic} /`;
}

function FavoriteRemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button aria-label={label} className="favorite-library-star active" onClick={onRemove} type="button">
      ★
    </button>
  );
}

function FavoriteAudioWaveIcon() {
  return (
    <svg aria-hidden="true" className="pronunciation-wave-icon" viewBox="0 0 18 24">
      <path d="M6.2 7.4c1.4 1.1 2.2 2.7 2.2 4.6s-.8 3.5-2.2 4.6" />
      <path d="M11.1 4.4c2.3 1.9 3.7 4.6 3.7 7.6s-1.4 5.7-3.7 7.6" />
    </svg>
  );
}

function FavoriteSentenceSpeakerIcon() {
  return (
    <svg aria-hidden="true" className="vocabulary-example-speaker-icon" viewBox="0 0 24 24">
      <path d="M4 9.5v5h4.2l5.1 4.1V5.4L8.2 9.5H4Z" />
      <path d="M16.2 8.4a5 5 0 0 1 0 7.2" />
      <path d="M18.9 5.8a8.8 8.8 0 0 1 0 12.4" />
    </svg>
  );
}

function playFavoriteSentenceAudio(sentence: FavoriteSentenceItem) {
  if (sentence.audioUrl) {
    const audio = new Audio(sentence.audioUrl);
    void audio.play();
    return;
  }

  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sentence.englishText);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}

function FavoriteSentenceAudioButton({ sentence }: { sentence: FavoriteSentenceItem }) {
  return (
    <button
      aria-label="播放收藏句子音频"
      className="vocabulary-example-audio-button favorite-sentence-audio-button"
      onClick={() => playFavoriteSentenceAudio(sentence)}
      type="button"
    >
      <FavoriteSentenceSpeakerIcon />
    </button>
  );
}

function FavoritePhoneticSide({
  label,
  locale,
  phonetic,
  word,
}: {
  label: string;
  locale: "en-GB" | "en-US";
  phonetic: string;
  word: string;
}) {
  return (
    <span className="favorite-phonetic-side">
      <b>{label}</b>
      {phonetic ? <span>{phonetic}</span> : null}
      <button
        aria-label={`播放 ${word} ${label}音`}
        className="pronunciation-wave favorite-phonetic-audio-button"
        onClick={() => playVocabularyPronunciation({ accent: locale === "en-GB" ? "uk" : "us", word })}
        type="button"
      >
        <FavoriteAudioWaveIcon />
      </button>
    </span>
  );
}

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<FavoriteTab>("words");
  const [annotations, setAnnotations] = useState<FavoriteAnnotationItem[]>([]);
  const [articles, setArticles] = useState<FavoriteArticleItem[]>([]);
  const [questions, setQuestions] = useState<FavoriteQuestionItem[]>([]);
  const [randomSeed, setRandomSeed] = useState(1);
  const [sentences, setSentences] = useState<FavoriteSentenceItem[]>([]);
  const [sortMode, setSortMode] = useState<FavoriteSortMode>("time");
  const [words, setWords] = useState<FavoriteWordItem[]>([]);

  useEffect(() => {
    setAnnotations(readStorageList<FavoriteAnnotationItem>(FAVORITE_ANNOTATIONS_STORAGE_KEY));
    setArticles(readStorageList<FavoriteArticleItem>(FAVORITE_ARTICLES_STORAGE_KEY));
    setQuestions(readStorageList<FavoriteQuestionItem>(FAVORITE_QUESTIONS_STORAGE_KEY));
    const initialSentences = readStorageList<FavoriteSentenceItem>(FAVORITE_SENTENCES_STORAGE_KEY);
    setSentences(initialSentences);
    setWords(readStorageList<FavoriteWordItem>(FAVORITE_WORDS_STORAGE_KEY));

    void hydrateFavoriteSentences(initialSentences).then((hydratedSentences) => {
      if (hydratedSentences === initialSentences) {
        return;
      }

      setSentences(hydratedSentences);
      writeStorageList(FAVORITE_SENTENCES_STORAGE_KEY, hydratedSentences);
    });
  }, []);

  const counts = useMemo(
    () => ({
      annotations: annotations.length,
      articles: articles.length,
      questions: questions.length,
      sentences: sentences.length,
      words: words.length,
    }),
    [annotations.length, articles.length, questions.length, sentences.length, words.length],
  );
  const activeLabel = favoriteTabs.find((tab) => tab.id === activeTab)?.label ?? "单词";
  const activeSortLabel =
    favoriteSortOptions.find((option) => option.id === sortMode)?.label ?? "按时间";
  const sortedWords = useMemo(
    () =>
      sortFavoriteItems(words, sortMode, randomSeed, (word) => getFavoriteWordDisplay(word).word),
    [randomSeed, sortMode, words],
  );
  const sortedSentences = useMemo(
    () => sortFavoriteItems(sentences, sortMode, randomSeed, (sentence) => sentence.englishText),
    [randomSeed, sentences, sortMode],
  );
  const sortedArticles = useMemo(
    () => sortFavoriteItems(articles, sortMode, randomSeed, (article) => article.title),
    [articles, randomSeed, sortMode],
  );
  const sortedQuestions = useMemo(
    () => sortFavoriteItems(questions, sortMode, randomSeed, (question) => question.title),
    [questions, randomSeed, sortMode],
  );
  const sortedAnnotations = useMemo(
    () => sortFavoriteItems(annotations, sortMode, randomSeed, (annotation) => annotation.title),
    [annotations, randomSeed, sortMode],
  );

  function chooseSortMode(nextSortMode: FavoriteSortMode) {
    setSortMode(nextSortMode);

    if (nextSortMode === "random") {
      setRandomSeed((current) => current + 1);
    }
  }

  function removeWord(id: string) {
    const nextWords = words.filter((word) => word.id !== id);

    setWords(nextWords);
    writeStorageList(FAVORITE_WORDS_STORAGE_KEY, nextWords);
  }

  function removeSentence(id: string) {
    const nextSentences = sentences.filter((sentence) => sentence.id !== id);

    setSentences(nextSentences);
    writeStorageList(FAVORITE_SENTENCES_STORAGE_KEY, nextSentences);
  }

  function removeArticle(id: string) {
    const nextArticles = articles.filter((article) => article.id !== id);

    setArticles(nextArticles);
    writeStorageList(FAVORITE_ARTICLES_STORAGE_KEY, nextArticles);
  }

  function removeQuestion(id: string) {
    const nextQuestions = questions.filter((question) => question.id !== id);

    setQuestions(nextQuestions);
    writeStorageList(FAVORITE_QUESTIONS_STORAGE_KEY, nextQuestions);
  }

  function removeAnnotation(id: string) {
    const nextAnnotations = annotations.filter((annotation) => annotation.id !== id);

    setAnnotations(nextAnnotations);
    writeStorageList(FAVORITE_ANNOTATIONS_STORAGE_KEY, nextAnnotations);
  }

  return (
    <main className="stack favorites-page">
      <section className="favorites-library-head" aria-label="收藏分类">
        <div className="favorites-segmented-tabs" role="tablist" aria-label="收藏类型">
          {favoriteTabs.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              <strong>{counts[tab.id]}</strong>
              <span>{tab.label}</span>
              <small>{tab.eyebrow}</small>
            </button>
          ))}
        </div>
      </section>

      <section
        className={`favorite-library-panel ${activeTab}-panel`}
        aria-label={`${activeLabel}收藏列表`}
      >
        <div className="favorite-sort-control">
          <button className="favorite-sort-trigger" type="button">
            排序
            <span>{activeSortLabel}</span>
          </button>
          <div className="favorite-sort-menu" aria-label="收藏排序方式">
            {favoriteSortOptions.map((option) => (
              <button
                className={sortMode === option.id ? "active" : ""}
                key={option.id}
                onClick={() => chooseSortMode(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {activeTab === "words" ? (
          words.length === 0 ? (
            <div className="favorite-empty full">
              <strong>还没有收藏单词</strong>
              <span>在查词页面或听力单词弹窗里点击星号，单词就会出现在这里。</span>
            </div>
          ) : (
            <div className="favorite-library-table">
              {sortedWords.map((word) => {
                const displayWord = getFavoriteWordDisplay(word);

                return (
                  <article className="favorite-library-row word-row" key={word.id}>
                    <Link className="favorite-library-title" href={displayWord.href}>
                      <span className="favorite-library-title-text">{displayWord.word}</span>
                    </Link>
                    <span className="favorite-library-phonetics">
                      <FavoritePhoneticSide
                        label="英"
                        locale="en-GB"
                        phonetic={formatFavoritePhonetic(displayWord.ukPhonetic)}
                        word={displayWord.word}
                      />
                      <FavoritePhoneticSide
                        label="美"
                        locale="en-US"
                        phonetic={formatFavoritePhonetic(displayWord.usPhonetic)}
                        word={displayWord.word}
                      />
                    </span>
                    <small className="favorite-library-content">
                      <span className="favorite-library-content-text">{displayWord.definition}</span>
                    </small>
                    <div className="favorite-share-actions">
                      <FavoriteRemoveButton label={`取消收藏 ${displayWord.word}`} onRemove={() => removeWord(word.id)} />
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : null}

        {activeTab === "sentences" ? (
          sentences.length === 0 ? (
            <div className="favorite-empty full">
              <strong>还没有收藏句子</strong>
              <span>在听力练习页或词汇例句里点击星号，句子就会出现在这里。</span>
            </div>
          ) : (
            <div className="favorite-library-table">
              {sortedSentences.map((sentence) => (
                <article className="favorite-library-row sentence-row" key={sentence.id}>
                  <div className="favorite-library-title sentence favorite-sentence-title-cell">
                    <Link
                      className="favorite-sentence-text-link"
                      href={getFavoriteSentenceHref(sentence)}
                    >
                      {sentence.englishText}
                    </Link>
                    <FavoriteSentenceAudioButton sentence={sentence} />
                  </div>
                  <small className="favorite-library-content">
                    <span className="favorite-library-content-text">{sentence.chineseText ?? ""}</span>
                  </small>
                  <div className="favorite-share-actions">
                    <FavoriteRemoveButton label="取消收藏句子" onRemove={() => removeSentence(sentence.id)} />
                  </div>
                </article>
              ))}
            </div>
          )
        ) : null}

        {activeTab === "articles" ? (
          articles.length === 0 ? (
            <div className="favorite-empty full">
              <strong>还没有收藏文章</strong>
              <span>外刊和阅读模块接入收藏后，文章会像书签一样显示在这里。</span>
            </div>
          ) : (
            <div className="favorite-library-table">
              {sortedArticles.map((article) => (
                <article className="favorite-library-row article-row" key={article.id}>
                  <Link className="favorite-library-title" href={article.href ?? "/articles"}>
                    <span className="favorite-library-title-text">{article.title}</span>
                  </Link>
                  <div className="favorite-share-actions">
                    <FavoriteRemoveButton label={`取消收藏 ${article.title}`} onRemove={() => removeArticle(article.id)} />
                  </div>
                </article>
              ))}
            </div>
          )
        ) : null}

        {activeTab === "questions" ? (
          questions.length === 0 ? (
            <div className="favorite-empty full">
              <strong>还没有收藏题目</strong>
              <span>做错的题会自动出现在这里；点击题号可以回到提交后的复盘页。</span>
            </div>
          ) : (
            <div className="favorite-library-table">
              {sortedQuestions.map((question) => {
                const sourceLabel = getFavoriteQuestionSourceLabel(question);
                const showQuestionTitle = !isGeneratedFavoriteQuestionTitle(question.title);

                return (
                  <article className="favorite-library-row question-row" key={question.id}>
                    <Link className="favorite-library-title question" href={question.href ?? "/training"}>
                      {sourceLabel ? (
                        <span className="favorite-question-source">{sourceLabel}</span>
                      ) : null}
                      {showQuestionTitle ? (
                        <span className="favorite-library-title-text">{question.title}</span>
                      ) : null}
                    </Link>
                    <div className="favorite-share-actions">
                      <FavoriteRemoveButton label={`取消收藏 ${question.title}`} onRemove={() => removeQuestion(question.id)} />
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : null}

        {activeTab === "annotations" ? (
          annotations.length === 0 ? (
            <div className="favorite-empty full">
              <strong>还没有收藏批注</strong>
              <span>后期文章、题目和句子里的批注会统一沉淀在这里。</span>
            </div>
          ) : (
            <div className="favorite-library-table">
              {sortedAnnotations.map((annotation) => (
                <article className="favorite-library-row annotation-row" key={annotation.id}>
                  <Link className="favorite-library-title" href={annotation.href ?? "/articles"}>
                    <span className="favorite-library-title-text">{annotation.title}</span>
                  </Link>
                  <small className="favorite-library-content">
                    <span className="favorite-library-content-text">{annotation.excerpt ?? ""}</span>
                  </small>
                  <div className="favorite-share-actions">
                    <FavoriteRemoveButton
                      label={`取消收藏 ${annotation.title}`}
                      onRemove={() => removeAnnotation(annotation.id)}
                    />
                  </div>
                </article>
              ))}
            </div>
          )
        ) : null}
      </section>
    </main>
  );
}
