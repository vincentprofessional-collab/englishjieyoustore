"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AudioPlayer,
  DEFAULT_AUDIO_PLAYER_SETTINGS,
  type AudioPlayerSettings,
} from "@/components/audio-player";
import { BbcSentencePractice } from "@/components/bbc-sentence-practice";
import { ContentShareButton } from "@/components/content-share-button";
import { StudyAnnotationTools } from "@/components/study-annotation-tools";
import { getBbcArticleById, type BbcVocabularyItem } from "@/lib/articles/bbc";

type ArticlePageProps = {
  params?: never;
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

function extractBbcVocabularyHeadword(value: string) {
  return cleanBbcVocabularyText(value).match(/^[A-Za-z]+(?:[- ][A-Za-z]+)*/)?.[0]?.trim() ?? "";
}

function isPartOfSpeechHint(value: string) {
  return /^(?:n|v|adj|adv|a|prep|phr|phrase)\.?$/i.test(value.trim());
}

function parseBbcVocabularyItem(item: BbcVocabularyItem) {
  const entry = cleanBbcVocabularyText(item.entry);
  const word = extractBbcVocabularyHeadword(item.term) || extractBbcVocabularyHeadword(entry);
  const normalizedWord = word.toLowerCase();
  let rest = entry.toLowerCase().startsWith(word.toLowerCase()) ? entry.slice(word.length).trim() : entry;
  let phonetic = "";
  let partOfSpeech = "";

  const bracketPhoneticMatch = rest.match(/^\[([^\]]+)\]\s*/);
  if (bracketPhoneticMatch) {
    if (!isPartOfSpeechHint(bracketPhoneticMatch[1])) {
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

  const plainPosMatch = rest.match(/^(n|v|adj|adv|a|prep|phr|phrase)\.?(?:\s+|(?=[\u4e00-\u9fff]))/i);
  if (plainPosMatch) {
    partOfSpeech = plainPosMatch[1].trim();
    rest = rest.slice(plainPosMatch[0].length).trim();
  }

  return {
    definition: (rest || item.translation || entry).replace(/^[.·•:：;；\s]+/, "").trim(),
    normalizedWord,
    partOfSpeech,
    phonetic,
    word,
  };
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

export default function ArticleDetailPage(_: ArticlePageProps) {
  const params = useParams<{ articleId: string }>();
  const article = getBbcArticleById(params.articleId);
  const [audioSettings, setAudioSettings] = useState<AudioPlayerSettings>(() => ({
    ...DEFAULT_AUDIO_PLAYER_SETTINGS,
    subtitleMode: "bilingual",
  }));
  const [isOriginalVisible, setIsOriginalVisible] = useState(true);
  const [sentenceAutoPlaySignals, setSentenceAutoPlaySignals] = useState<Record<number, number>>({});
  const [isArticleFavorite, setIsArticleFavorite] = useState(false);
  const [favoriteSentenceIds, setFavoriteSentenceIds] = useState<string[]>([]);
  const [favoriteWordIds, setFavoriteWordIds] = useState<string[]>([]);
  const [isReadingTimerRunning, setIsReadingTimerRunning] = useState(false);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const pageRef = useRef<HTMLElement | null>(null);

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

  function updateAudioSettings(nextSettings: Partial<AudioPlayerSettings>) {
    setAudioSettings((current) => ({ ...current, ...nextSettings }));
  }

  function playNextSentence(sentenceNo: number) {
    if (!article?.sentences || audioSettings.playMode !== "sequential") {
      return;
    }

    const currentIndex = article.sentences.findIndex((sentence) => sentence.sentenceNo === sentenceNo);
    const nextSentence = article.sentences[currentIndex + 1];
    if (nextSentence) {
      setSentenceAutoPlaySignals((current) => ({
        ...current,
        [nextSentence.sentenceNo]: (current[nextSentence.sentenceNo] ?? 0) + 1,
      }));
    }
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
            ukPhonetic: parsedVocabulary.phonetic,
            usPhonetic: parsedVocabulary.phonetic,
            word: parsedVocabulary.word,
          },
          ...currentFavorites,
        ];

    writeStorageList(FAVORITE_WORDS_STORAGE_KEY, nextFavorites);
    setFavoriteWordIds(nextFavorites.map((favorite) => favorite.id));
  }

  if (!article) {
    return (
      <section className="stack bbc-article-page">
        <div className="page-heading bbc-article-hero">
          <Link className="bbc-detail-back-link" href="/articles">
            ← 返回
          </Link>
          <h1>文章不存在</h1>
        </div>
      </section>
    );
  }

  const articleWordCount =
    article.body.join(" ").match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length ?? 0;

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
      </div>

      <section className="bbc-original-panel">
        <header className="bbc-original-head">
          <div className="bbc-original-title">
            <h2>英文原文</h2>
            <span>
              共 <b className="stat-number">{articleWordCount}</b> 词
            </span>
          </div>
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
            <button type="button" onClick={() => setIsOriginalVisible((current) => !current)}>
              {isOriginalVisible ? "隐藏原文" : "显示原文"}
            </button>
            <StudyAnnotationTools
              buttonClassName="annotation-toggle ielts-exam-action bbc-annotation-toggle"
              enableVocabularyHover
              sourceHref={`/articles/${article.id}`}
              sourceId={`bbc:${article.id}`}
              sourceTitle={`BBC ${article.id} ${article.title}`}
              surfaceRef={pageRef}
            />
          </div>
        </header>

        {isOriginalVisible ? (
          <div className="bbc-original-copy">
            {article.body.map((paragraph, index) => (
              <p key={`${article.id}-paragraph-${index}`}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        {article.fullAudioUrl ? (
          <div className="bbc-full-audio">
            <AudioPlayer
              hasSelectedRate
              html5={false}
              onSettingsChange={updateAudioSettings}
              settings={audioSettings}
              settingsPlacement="none"
              src={article.fullAudioUrl}
              title={`${article.title} 完整音频`}
            />
          </div>
        ) : null}
      </section>

      <article className="bbc-transcript-panel">
        <header className="bbc-transcript-head">
          <span className="bbc-transcript-kicker">Transcript</span>
          <h2>中英逐句原文</h2>
        </header>

        {article.sentences?.length ? (
          <div className="sentence-list bbc-listening-sentence-list">
            {article.sentences.map((sentence) => (
              <article
                className="sentence-card bbc-listening-sentence-card"
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
                  <BbcSentencePractice sentence={sentence} settings={audioSettings} />
                </div>
                <AudioPlayer
                  autoPlaySignal={sentenceAutoPlaySignals[sentence.sentenceNo] ?? 0}
                  hasSelectedRate
                  html5={false}
                  onEnded={() => playNextSentence(sentence.sentenceNo)}
                  onSettingsChange={updateAudioSettings}
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

      {article.vocabulary?.length ? (
        <section className="bbc-vocabulary-panel">
          <header className="bbc-vocabulary-head">
            <span>Vocabulary & Phrases</span>
            <h2>词汇和短语</h2>
          </header>
          <div className="bbc-vocabulary-list">
            {article.vocabulary.map((item) => {
                const favoriteVocabularyId = parseBbcVocabularyItem(item).normalizedWord;

                return (
                  <article
                    className="bbc-vocabulary-item"
                    id={`bbc-vocabulary-${item.number}`}
                    key={`${article.id}-vocabulary-${item.number}`}
                  >
                    <div className="bbc-vocabulary-item-head">
                      <strong>
                        {item.number}. {item.term}
                      </strong>
                      <div className="favorite-share-actions">
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
                        <ContentShareButton
                          label={`分享 ${item.term}`}
                          text={[item.entry, item.example ? `例句：${item.example}` : "", item.translation ? `翻译：${item.translation}` : ""].filter(Boolean).join("\n")}
                          title={`${item.term} 词汇和短语`}
                          url={`/articles/${article.id}#bbc-vocabulary-${item.number}`}
                        />
                      </div>
                    </div>
                    <p>{item.entry.slice(item.term.length).trim()}</p>
                    {item.example ? <span>例句：{item.example}</span> : null}
                    {item.translation ? <small>翻译：{item.translation}</small> : null}
                  </article>
                );
              })}
          </div>
        </section>
      ) : null}
    </section>
  );
}
