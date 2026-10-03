"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { BbcSentencePractice, useBbcAnswerShortcut } from "@/components/bbc-sentence-practice";
import { ArticleRetellingPractice, buildRetellingTermGroups } from "@/components/article-retelling-practice";
import { ArticleInlineAnnotatedParagraph } from "@/components/article-inline-annotated-text";
import { useArticleInlineAnnotations } from "@/components/use-article-inline-annotations";
import { ContentShareButton } from "@/components/content-share-button";
import { StudyAnnotationTools } from "@/components/study-annotation-tools";
import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import newConceptZhTranslations from "@/data/new-concept/translations-zh.json";
import newConceptZhTurnTranslations from "@/data/new-concept/translations-zh-turns.json";
import { getLikelyProperNounWords, shouldShowAudioPronunciation } from "@/lib/audio-pronunciation";
import { getSpeakingPracticeDelayMs } from "@/lib/articles/bbc-speaking-training.mjs";
import {
  consumeVocabularyStudyReturn,
  getVocabularyDetailHref,
  saveVocabularyStudyReturn,
} from "@/lib/articles/vocabulary-study-return";
import type { NewConceptLesson } from "@/lib/new-concept";
import { getNewConceptNextLesson, getNewConceptPreviousLesson } from "@/lib/new-concept";
import { alignNewConceptParagraph } from "@/lib/new-concept-bilingual";
import type { NewConceptVocabularyItem } from "@/lib/new-concept-vocabulary";
import type { ArticleInlineAnnotation } from "@/lib/article-inline-annotations";

type OriginalDisplayMode = "english" | "bilingual" | "chinese";
type LessonStudyMode = "general" | "intensive" | "listening" | "speaking" | "writing";
type ActiveSpeakingMode = Exclude<AudioSpeakingMode, "none">;

const NEW_CONCEPT_ZH_TRANSLATIONS = newConceptZhTranslations as Record<string, string[]>;
const NEW_CONCEPT_ZH_TURN_TRANSLATIONS = newConceptZhTurnTranslations as Record<string, string[]>;

function getNewConceptChineseTranslation(lessonNo: number, blockIndex: number, sourceChinese: string) {
  const translation = NEW_CONCEPT_ZH_TRANSLATIONS[String(lessonNo)]?.[blockIndex] ?? sourceChinese;
  return removeEnglishOcrNoise(translation);
}

function removeEnglishOcrNoise(value: string) {
  return value
    .replace(/[A-Za-z][A-Za-z.'’\-]*/g, "")
    .replace(/\s+/g, " ")
    .replace(/^([\u3400-\u9fff·]+)\s*:\s*/, "$1：")
    .replace(/\s*([，。！？；：、])\s*/g, "$1")
    .replace(/^[\s'‘’，。！？；：、]+|[\s'‘’，。！？；：、]+$/g, "")
    .trim();
}

type NewConceptVocabularyStudyReturn = {
  activeSentenceNo: number | null;
  activeSentencePosition: number;
  audioSettings: AudioPlayerSettings;
  displayMode: OriginalDisplayMode;
  isOriginalVisible: boolean;
  isReadingTimerRunning: boolean;
  isReadingTimerVisible: boolean;
  isVocabularyVisible: boolean;
  readingSeconds: number;
  scrollY: number;
  studyMode: LessonStudyMode;
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

const FAVORITE_SENTENCES_STORAGE_KEY = "ielts-platform.favoriteSentences";
const FAVORITE_ARTICLES_STORAGE_KEY = "ielts-platform.favoriteArticles";

const SPEAKING_MODE_LABELS: Record<ActiveSpeakingMode, string> = {
  imitation: "口语模式",
  shadowing: "影子练习",
  "sight-translation": "视译训练",
};

const SPEAKING_PHASE_LABELS: Record<ActiveSpeakingMode, string> = {
  imitation: "轮到你开口练习",
  shadowing: "影子练习",
  "sight-translation": "请看中文视译成英文",
};

const SPEAKING_PLAYING_HINTS: Record<ActiveSpeakingMode, string> = {
  imitation: "播放结束后跟读本句",
  shadowing: "播放时跟随音频同步朗读",
  "sight-translation": "播放结束后根据中文复述英文",
};

function formatReadingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function favoriteSentenceId(lessonId: string, sentenceNo: number) {
  return `new-concept:${lessonId}:sentence:${sentenceNo}`;
}

function LessonVocabulary({
  onVocabularyOpen,
  returnTo,
  vocabulary,
}: {
  onVocabularyOpen: () => void;
  returnTo: string;
  vocabulary: NewConceptVocabularyItem[];
}) {
  return (
    <section className="bbc-vocabulary-panel new-concept-vocabulary-panel">
      <header className="bbc-vocabulary-head">
        <h2>词汇、音标与释义</h2>
        <span aria-label={`本课共 ${vocabulary.length} 项`} className="bbc-vocabulary-total-count">
          {vocabulary.length}
        </span>
      </header>
      <div className="bbc-vocabulary-list new-concept-vocabulary-list">
        {vocabulary.map((item, index) => (
          <article className="bbc-vocabulary-item" key={`${item.normalizedWord}-${index}`}>
            <div className="bbc-vocabulary-item-head">
              <strong>
                <Link
                  className="bbc-vocabulary-term-link"
                  href={getVocabularyDetailHref(item.normalizedWord, returnTo)}
                  onClick={onVocabularyOpen}
                >
                  {index + 1}. {item.word}
                </Link>
              </strong>
              {item.level ? <span className="new-concept-vocabulary-level">{item.level}</span> : null}
            </div>
            <VocabularyInlinePronunciation
              ukAudioUrl={item.ukAudioUrl}
              ukPhonetic={item.ukPhonetic || item.phonetic}
              usAudioUrl={item.usAudioUrl}
              usPhonetic={item.usPhonetic || item.phonetic}
              word={item.word}
            />
            <div className="bbc-vocabulary-details">
              {item.definitionLines.map((line, lineIndex) => (
                <p key={`${item.normalizedWord}-definition-${lineIndex}`}>{line}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function normalizeVocabularyWord(word: string) {
  return word.toLowerCase().replace(/’/g, "'").replace(/'s$/i, "");
}

function vocabularyTermAppearsInSentence(sentence: string, term: string) {
  const sentenceWords = (sentence.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) ?? []).map(normalizeVocabularyWord);
  const termWords = (term.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) ?? []).map(normalizeVocabularyWord);

  if (!termWords.length || termWords.length > sentenceWords.length) {
    return false;
  }

  return sentenceWords.some((_, start) =>
    termWords.every((termWord, offset) => sentenceWords[start + offset] === termWord),
  );
}

function renderNewConceptArticleEnglish(
  text: string,
  terms: string[] = [],
  pronunciations: Map<string, string> = new Map(),
) {
  const wordPattern = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
  const words = [...text.matchAll(wordPattern)];
  const normalizedWords = words.map((match) => normalizeVocabularyWord(match[0]));
  const highlightedWordIndexes = new Set<number>();

  for (const term of terms) {
    const termWords = (term.match(wordPattern) ?? []).map(normalizeVocabularyWord);
    if (!termWords.length || termWords.length > normalizedWords.length) {
      continue;
    }

    for (let start = 0; start <= normalizedWords.length - termWords.length; start += 1) {
      if (termWords.every((termWord, offset) => normalizedWords[start + offset] === termWord)) {
        for (let offset = 0; offset < termWords.length; offset += 1) {
          highlightedWordIndexes.add(start + offset);
        }
      }
    }
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  words.forEach((word, index) => {
    if (cursor < word.index!) {
      parts.push(text.slice(cursor, word.index));
    }
    const normalizedWord = normalizedWords[index];
    const phonetic = pronunciations.get(normalizedWord);
    const wordContent = phonetic ? (
      <span className="article-word-with-pronunciation" key={`pronunciation-${index}`}>
        <span className="article-word-pronunciation">{formatArticlePhonetic(phonetic)}</span>
        {word[0]}
      </span>
    ) : word[0];
    parts.push(highlightedWordIndexes.has(index) ? (
      <span className="bbc-vocabulary-highlight" key={`vocabulary-${index}`}>{wordContent}</span>
    ) : wordContent);
    cursor = word.index! + word[0].length;
  });
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return <span>{parts}</span>;
}

function getNewConceptArticleTextBlocks(lesson: NewConceptLesson) {
  const englishLines = lesson.kind === "dialogue" ? lesson.english : lesson.exercise;
  const blocks: { chinese: string; endLineIndex: number; english: string; startLineIndex: number }[] = [];

  if (lesson.bookCode === "new-concept-2") {
    const chineseLines = alignNewConceptParagraph(
      englishLines,
      lesson.fullChineseTranslation ?? lesson.chinese[0] ?? "",
      lesson.lessonNo,
    );
    return englishLines.map((english, index) => ({
      chinese: chineseLines[index] ?? "",
      endLineIndex: index,
      english,
      startLineIndex: index,
    }));
  }

  const speakerLabel = /(^|\s)([A-Z][A-Z .'-]{0,25}:)(?=\s|$|["'“”‘’])/g;
  const hasSpeakerLabels = lesson.kind === "dialogue" && englishLines.some((line) => {
    speakerLabel.lastIndex = 0;
    return speakerLabel.test(line);
  });

  if (hasSpeakerLabels) {
    let turn: { endLineIndex: number; english: string; startLineIndex: number } | null = null;
    const turns: { endLineIndex: number; english: string; startLineIndex: number }[] = [];
    const finishTurn = () => {
      if (turn) turns.push(turn);
      turn = null;
    };

    englishLines.forEach((line, lineIndex) => {
      speakerLabel.lastIndex = 0;
      const matches = Array.from(line.matchAll(speakerLabel));
      if (matches.length === 0) {
        if (!turn) turn = { endLineIndex: lineIndex, english: "", startLineIndex: lineIndex };
        turn.english = [turn.english, line.trim()].filter(Boolean).join(" ");
        turn.endLineIndex = lineIndex;
        return;
      }

      const firstMatch = matches[0];
      const firstStart = firstMatch.index! + (firstMatch[1] ? 1 : 0);
      const leadingText = line.slice(0, firstStart).trim();
      if (leadingText) {
        if (!turn) turn = { endLineIndex: lineIndex, english: "", startLineIndex: lineIndex };
        turn.english = [turn.english, leadingText].filter(Boolean).join(" ");
        turn.endLineIndex = lineIndex;
      }

      matches.forEach((match, matchIndex) => {
        finishTurn();
        const start = match.index! + (match[1] ? 1 : 0);
        const textStart = start + match[2].length;
        const nextMatch = matches[matchIndex + 1];
        const textEnd = nextMatch ? nextMatch.index! + (nextMatch[1] ? 1 : 0) : line.length;
        turn = {
          endLineIndex: lineIndex,
          english: line.slice(start, textEnd).trim(),
          startLineIndex: lineIndex,
        };
        if (textStart > textEnd) turn.english = line.slice(start).trim();
      });
    });
    finishTurn();

    const turnTranslations = NEW_CONCEPT_ZH_TURN_TRANSLATIONS[String(lesson.lessonNo)];
    return turns.map((item, index) => {
      const sourceTranslation = lesson.chinese[index] ?? "";
      const chinese = turnTranslations?.[index]
        ?? removeEnglishOcrNoise(sourceTranslation);

      return { ...item, chinese };
    });
  }

  const chineseLines = lesson.kind === "dialogue" ? lesson.chinese : [];
  let english = "";
  let chinese = "";
  let startLineIndex = 0;

  englishLines.forEach((line, index) => {
    english = [english, line.trim()].filter(Boolean).join(" ");
    chinese += chineseLines[index] ?? "";
    const endsWithSentencePunctuation = /[.!?。！？]["'’”’」』)\]]*$/.test(line.trim());

    if (endsWithSentencePunctuation || index === englishLines.length - 1) {
      blocks.push({ chinese, english, startLineIndex, endLineIndex: index });
      english = "";
      chinese = "";
      startLineIndex = index + 1;
    }
  });

  return blocks.map((block, index) => ({
    ...block,
    chinese: getNewConceptChineseTranslation(lesson.lessonNo, index, block.chinese),
  }));
}

function NewConceptArticleCopy({
  displayMode,
  annotations,
  isOriginalVisible,
  lesson,
  pronunciations,
}: {
  annotations: ArticleInlineAnnotation[];
  displayMode: OriginalDisplayMode;
  isOriginalVisible: boolean;
  lesson: NewConceptLesson;
  pronunciations: Map<string, string>;
}) {
  if (!isOriginalVisible) {
    return null;
  }

  const textBlocks = getNewConceptArticleTextBlocks(lesson);
  return (
    <div className={`bbc-original-copy new-concept-article-copy ${displayMode === "bilingual" ? "bilingual" : ""}`}>
      {textBlocks.map((textBlock, index) => {
          const { chinese, english } = textBlock;

          return (
            <div className="bbc-original-text-block" key={`${lesson.id}-article-line-${index}`}>
              {displayMode !== "chinese" ? (
                <p lang="en"><ArticleInlineAnnotatedParagraph
                  annotations={annotations}
                  paragraphId={`paragraph-${index}`}
                  text={english}
                  renderText={(text) => renderNewConceptArticleEnglish(text, [], pronunciations)}
                /></p>
              ) : null}
              {displayMode !== "english" && chinese ? (
                <p className="bbc-original-chinese" lang="zh-CN">{chinese}</p>
              ) : null}
            </div>
          );
        })}
    </div>
  );
}

function LessonTranscript({
  activeSentenceNo,
  audioSettings,
  favoriteSentenceIds,
  isSentenceAudioPlaying,
  lesson,
  onAudioSettingsChange,
  onSentenceEnded,
  onSentencePlayingChange,
  onSentenceTimeChange,
  onToggleFavorite,
  sentenceAutoPlaySignals,
  sentenceAudioUrls,
  speakingTraining,
}: {
  activeSentenceNo: number | null;
  audioSettings: AudioPlayerSettings;
  favoriteSentenceIds: string[];
  isSentenceAudioPlaying: boolean;
  lesson: NewConceptLesson;
  onAudioSettingsChange: (nextSettings: Partial<AudioPlayerSettings>) => void;
  onSentenceEnded: (sentenceNo: number) => void;
  onSentencePlayingChange: (sentenceNo: number, isPlaying: boolean) => void;
  onSentenceTimeChange: (sentenceNo: number, positionSeconds: number) => void;
  onToggleFavorite: (sentenceNo: number, english: string, chinese: string, audioUrl?: string) => void;
  sentenceAutoPlaySignals: Record<number, number>;
  sentenceAudioUrls: (string | null)[];
  speakingTraining: SpeakingTrainingState | null;
}) {
  if (lesson.kind === "written-exercise") {
    return (
      <div className="new-concept-exercise-copy">
        {lesson.exercise.map((line, index) => <p key={`${lesson.id}-exercise-${index}`}>{line}</p>)}
      </div>
    );
  }

  const alignedBookTwoChinese = lesson.bookCode === "new-concept-2"
    ? alignNewConceptParagraph(lesson.english, lesson.fullChineseTranslation ?? lesson.chinese[0] ?? "", lesson.lessonNo)
    : null;

  return (
    <div className="new-concept-sentence-list">
      {lesson.english.map((english, index) => {
        const chinese = alignedBookTwoChinese?.[index] ?? lesson.chinese[index] ?? "";
        const sentenceAudioUrl = sentenceAudioUrls[index] ?? null;

        return (
          <article
            className="new-concept-sentence-card"
            id={`new-concept-sentence-${index + 1}`}
            key={`${lesson.id}-sentence-${index}`}
          >
            <div className="sentence-meta new-concept-sentence-meta">
              <div className="sentence-meta-copy">
                <span>#{index + 1}</span>
              </div>
              <div className="favorite-share-actions">
                <button
                  aria-label={`${favoriteSentenceIds.includes(favoriteSentenceId(lesson.id, index + 1)) ? "取消收藏" : "收藏"}第 ${index + 1} 句`}
                  className={`favorite-star ${favoriteSentenceIds.includes(favoriteSentenceId(lesson.id, index + 1)) ? "active" : ""}`}
                  onClick={() => onToggleFavorite(index + 1, english, chinese, sentenceAudioUrl ?? undefined)}
                  title={favoriteSentenceIds.includes(favoriteSentenceId(lesson.id, index + 1)) ? "取消收藏" : "收藏"}
                  type="button"
                >
                  {favoriteSentenceIds.includes(favoriteSentenceId(lesson.id, index + 1)) ? "★" : "☆"}
                </button>
                <ContentShareButton
                  label={`分享第 ${index + 1} 句`}
                  text={`${english}\n${chinese}`}
                  title={`新概念英语 Lesson ${lesson.lessonNo} 第 ${index + 1} 句`}
                  url={`/new-concept/${lesson.id}#new-concept-sentence-${index + 1}`}
                />
              </div>
            </div>
            <div className="new-concept-sentence-copy">
              <BbcSentencePractice
                activeWordIndex={null}
                isAudioPlaying={isSentenceAudioPlaying && activeSentenceNo === index + 1}
                sentence={{ chinese, english, sentenceNo: index + 1 }}
                settings={audioSettings}
              />
            </div>
            {speakingTraining?.sentenceNo === index + 1 ? (
              <div aria-live="polite" className="bbc-speaking-training-status practicing">
                <span>{SPEAKING_PHASE_LABELS[speakingTraining.mode]}</span>
                <strong>{speakingTraining.remainingSeconds} 秒</strong>
                <small>之后继续播放</small>
              </div>
            ) : activeSentenceNo === index + 1 &&
              isSentenceAudioPlaying &&
              audioSettings.speakingMode !== "none" ? (
              <div className="bbc-speaking-training-status playing">
                <span>{SPEAKING_MODE_LABELS[audioSettings.speakingMode]}</span>
                <strong>正在播放</strong>
                <small>{SPEAKING_PLAYING_HINTS[audioSettings.speakingMode]}</small>
              </div>
            ) : null}
            {sentenceAudioUrl ? (
              <AudioPlayer
                autoPlaySignal={sentenceAutoPlaySignals[index + 1] ?? 0}
                deferSentenceLoop={audioSettings.speakingMode !== "none"}
                hasSelectedRate
                // Native media playback supports pitch-preserving rate changes.
                html5
                onEnded={() => onSentenceEnded(index + 1)}
                onSettingsChange={onAudioSettingsChange}
                onPlayingChange={(isPlaying) => onSentencePlayingChange(index + 1, isPlaying)}
                onTimeChange={(positionSeconds) => onSentenceTimeChange(index + 1, positionSeconds)}
                settings={audioSettings}
                src={sentenceAudioUrl}
                title={`新概念英语第 ${lesson.lessonNo} 课第 ${index + 1} 句音频`}
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function NewConceptLessonPage({
  audioEdition,
  audioUrl,
  lesson,
  sentenceAudioUrls,
  vocabulary,
}: {
  audioEdition: "us" | "uk";
  audioUrl: string | null;
  lesson: NewConceptLesson;
  sentenceAudioUrls: (string | null)[];
  vocabulary: NewConceptVocabularyItem[];
}) {
  const inlineTextAnnotations = useArticleInlineAnnotations("new-concept", lesson.id);
  const previousLesson = getNewConceptPreviousLesson(lesson);
  const nextLesson = getNewConceptNextLesson(lesson);
  const [displayMode, setDisplayMode] = useState<OriginalDisplayMode>("bilingual");
  const [isOriginalVisible, setIsOriginalVisible] = useState(true);
  const [isVocabularyVisible, setIsVocabularyVisible] = useState(true);
  const [studyMode, setStudyMode] = useState<LessonStudyMode>("general");
  const [isRetellingPractice, setIsRetellingPractice] = useState(false);
  const retellingVocabularyVisibilityRef = useRef(true);
  const [showWritingAnswers, setShowWritingAnswers] = useState(false);
  const [modeSelectionVersion, setModeSelectionVersion] = useState(0);
  const [isReadingTimerRunning, setIsReadingTimerRunning] = useState(false);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [isReadingTimerVisible, setIsReadingTimerVisible] = useState(false);
  const [isOriginalFullscreen, setIsOriginalFullscreen] = useState(false);
  const [favoriteSentenceIds, setFavoriteSentenceIds] = useState<string[]>([]);
  const [isLessonFavorite, setIsLessonFavorite] = useState(false);
  const [activeSentenceNo, setActiveSentenceNo] = useState<number | null>(null);
  const [activeSentencePosition, setActiveSentencePosition] = useState(0);
  const [sentenceRestoreSeekRequest, setSentenceRestoreSeekRequest] = useState<SentenceRestoreSeekRequest | null>(null);
  const [sentenceDurations, setSentenceDurations] = useState<Record<number, number>>({});
  const [isSentenceAudioPlaying, setIsSentenceAudioPlaying] = useState(false);
  const [sentenceAutoPlaySignals, setSentenceAutoPlaySignals] = useState<Record<number, number>>({});
  const [speakingTraining, setSpeakingTraining] = useState<SpeakingTrainingState | null>(null);
  const [audioSettings, setAudioSettings] = useState<AudioPlayerSettings>({
    ...DEFAULT_AUDIO_PLAYER_SETTINGS,
    pronunciationMode: audioEdition,
    subtitleMode: "bilingual",
  });
  useBbcAnswerShortcut(
    studyMode === "writing" && audioSettings.dictationMode !== "none",
    () => setShowWritingAnswers((visible) => !visible),
  );
  const pageRef = useRef<HTMLElement | null>(null);
  const studyWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const activeSentenceNoRef = useRef<number | null>(null);
  const sentenceAutoPlayRequestIdRef = useRef(0);
  const audioSettingsRef = useRef(audioSettings);
  const speakingCountdownRef = useRef<number | null>(null);
  const speakingAdvanceRef = useRef<number | null>(null);

  useEffect(() => {
    audioSettingsRef.current = audioSettings;
  }, [audioSettings]);

  useEffect(() => {
    setAudioSettings((current) => current.pronunciationMode === audioEdition
      ? current
      : { ...current, pronunciationMode: audioEdition });
  }, [audioEdition]);

  useEffect(() => {
    setSentenceDurations({});
  }, [lesson.id]);

  useEffect(() => {
    return () => {
      if (speakingCountdownRef.current != null) {
        window.clearInterval(speakingCountdownRef.current);
      }
      if (speakingAdvanceRef.current != null) {
        window.clearTimeout(speakingAdvanceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(FAVORITE_ARTICLES_STORAGE_KEY);
      const storedItems = rawValue ? (JSON.parse(rawValue) as Array<{ id?: unknown }>) : [];
      setIsLessonFavorite(storedItems.some((item) => item.id === `new-concept:${lesson.id}`));
    } catch {
      setIsLessonFavorite(false);
    }
  }, [lesson.id]);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(FAVORITE_SENTENCES_STORAGE_KEY);
      const storedItems = rawValue ? (JSON.parse(rawValue) as Array<{ id?: unknown }>) : [];
      setFavoriteSentenceIds(
        storedItems
          .map((item) => (typeof item.id === "string" ? item.id : ""))
          .filter(Boolean),
      );
    } catch {
      setFavoriteSentenceIds([]);
    }
  }, []);

  useEffect(() => {
    const returnState = consumeVocabularyStudyReturn<NewConceptVocabularyStudyReturn>(`/new-concept/${lesson.id}`);
    if (!returnState) {
      return;
    }

    const validModes: LessonStudyMode[] = ["general", "intensive", "listening", "speaking", "writing"];
    const restoredSentenceNo =
      typeof returnState.activeSentenceNo === "number" &&
      returnState.activeSentenceNo >= 1 &&
      returnState.activeSentenceNo <= lesson.english.length
        ? returnState.activeSentenceNo
        : null;
    const restoredAudioSettings = {
      ...DEFAULT_AUDIO_PLAYER_SETTINGS,
      ...(returnState.audioSettings ?? {}),
      pronunciationMode: audioEdition,
    };
    const restoredMode = validModes.includes(returnState.studyMode) ? returnState.studyMode : "general";

    setStudyMode(restoredMode);
    setAudioSettings(restoredAudioSettings);
    audioSettingsRef.current = restoredAudioSettings;
    setDisplayMode(returnState.displayMode ?? "bilingual");
    setIsOriginalVisible(restoredMode === "general" ? returnState.isOriginalVisible ?? true : true);
    setIsVocabularyVisible(restoredMode === "general" ? returnState.isVocabularyVisible ?? true : true);
    setActiveSentenceNo(restoredMode === "general" ? null : restoredSentenceNo ?? 1);
    activeSentenceNoRef.current = restoredMode === "general" ? null : restoredSentenceNo ?? 1;
    setActiveSentencePosition(Math.max(0, returnState.activeSentencePosition ?? 0));
    setIsSentenceAudioPlaying(false);
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
      const vocabularyList = document.querySelector<HTMLElement>(".new-concept-vocabulary-list");
      if (vocabularyList) {
        vocabularyList.scrollTop = Math.max(0, returnState.vocabularyScrollTop ?? 0);
      }
    });
  }, [audioEdition, lesson.id, lesson.english.length]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsOriginalFullscreen(document.fullscreenElement === studyWorkspaceRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isReadingTimerRunning) {
      return;
    }

    const timerId = window.setInterval(() => {
      setReadingSeconds((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [isReadingTimerRunning]);

  async function toggleOriginalFullscreen() {
    if (!studyWorkspaceRef.current) {
      return;
    }

    try {
      if (document.fullscreenElement === studyWorkspaceRef.current) {
        await document.exitFullscreen();
      } else {
        await studyWorkspaceRef.current.requestFullscreen();
      }
    } catch {
      setIsOriginalFullscreen(false);
    }
  }

  function updateAudioSettings(nextSettings: Partial<AudioPlayerSettings>) {
    setAudioSettings((current) => ({ ...current, ...nextSettings }));
    if (nextSettings.subtitleMode) {
      setDisplayMode(nextSettings.subtitleMode);
    }
  }

  function saveVocabularyReturnState() {
    saveVocabularyStudyReturn(`/new-concept/${lesson.id}`, {
      activeSentenceNo,
      activeSentencePosition,
      audioSettings,
      displayMode,
      isOriginalVisible,
      isReadingTimerRunning,
      isReadingTimerVisible,
      isVocabularyVisible,
      readingSeconds,
      scrollY: window.scrollY,
      studyMode,
      vocabularyScrollTop:
        document.querySelector<HTMLElement>(".new-concept-vocabulary-list")?.scrollTop ?? 0,
    } satisfies NewConceptVocabularyStudyReturn);
  }

  function selectStudyMode(mode: LessonStudyMode) {
    clearSpeakingPracticeTimers();
    setIsRetellingPractice(false);
    setStudyMode(mode);
    setIsOriginalVisible(true);
    setIsVocabularyVisible(true);
    setSentenceAutoPlaySignals({});
    setSentenceRestoreSeekRequest(null);
    setActiveSentencePosition(0);
    setIsSentenceAudioPlaying(false);
    if (mode === "general" || mode === "intensive") {
      const isLeavingPractice =
        audioSettings.dictationMode !== "none" || audioSettings.speakingMode !== "none";
      updateAudioSettings({
        dictationMode: "none",
        playMode: "sequential",
        speakingMode: "none",
        ...(isLeavingPractice ? { subtitleMode: "bilingual" as const } : {}),
      });
    }
    if (mode === "general") {
      activeSentenceNoRef.current = null;
      setActiveSentenceNo(null);
    } else {
      setModeSelectionVersion((current) => current + 1);
      activeSentenceNoRef.current = 1;
      setActiveSentenceNo(1);
      if (mode === "listening" && sentenceAudioUrls[0]) requestSentenceAutoPlay(1);
    }
  }

  function enterRetellingPractice() {
    retellingVocabularyVisibilityRef.current = isVocabularyVisible;
    setIsVocabularyVisible(false);
    setIsRetellingPractice(true);
  }

  function exitRetellingPractice() {
    setIsRetellingPractice(false);
    setIsVocabularyVisible(retellingVocabularyVisibilityRef.current);
  }

  function selectStudySentence(sentenceNo: number) {
    const shouldContinuePlayback = isSentenceAudioPlaying;
    clearSpeakingPracticeTimers();
    activeSentenceNoRef.current = sentenceNo;
    setActiveSentenceNo(sentenceNo);
    setActiveSentencePosition(0);
    setIsSentenceAudioPlaying(false);
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

  function toggleFavoriteLesson() {
    const id = `new-concept:${lesson.id}`;
    type FavoriteArticle = {
      excerpt?: string;
      href?: string;
      id: string;
      savedAt: string;
      sourceTitle?: string;
      title: string;
    };
    let currentItems: FavoriteArticle[] = [];

    try {
      const rawValue = window.localStorage.getItem(FAVORITE_ARTICLES_STORAGE_KEY);
      currentItems = rawValue ? (JSON.parse(rawValue) as FavoriteArticle[]) : [];
    } catch {
      currentItems = [];
    }

    const exists = currentItems.some((item) => item.id === id);
    const nextItems = exists
      ? currentItems.filter((item) => item.id !== id)
      : [
          {
            excerpt: lesson.english[0] ?? lesson.exercise[0],
            href: `/new-concept/${lesson.id}`,
            id,
            savedAt: new Date().toISOString(),
            sourceTitle: lesson.bookCode === "new-concept-2" ? "新概念英语第二册" : "新概念英语第一册",
            title: `新概念英语${lesson.bookCode === "new-concept-2" ? "第二册" : "第一册"} Lesson ${lesson.lessonNo} ${lesson.title}`,
          },
          ...currentItems,
        ];

    window.localStorage.setItem(FAVORITE_ARTICLES_STORAGE_KEY, JSON.stringify(nextItems));
    setIsLessonFavorite(!exists);
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

  function playSentenceByMode(sentenceNo: number) {
    if (audioSettingsRef.current.playMode === "sentence-loop") {
      return;
    }

    const nextSentenceNo = sentenceNo < lesson.english.length ? sentenceNo + 1 : null;
    if (nextSentenceNo == null) {
      return;
    }

    activeSentenceNoRef.current = nextSentenceNo;
    setActiveSentenceNo(nextSentenceNo);
    setActiveSentencePosition(0);
    requestSentenceAutoPlay(nextSentenceNo);
    setSentenceRestoreSeekRequest(null);
  }

  function startSpeakingPractice(sentenceNo: number, mode: ActiveSpeakingMode) {
    const durationSeconds = Math.max(sentenceDurations[sentenceNo] ?? 0.1, 0.1);
    const delayMs = getSpeakingPracticeDelayMs(mode, durationSeconds);
    const deadline = Date.now() + delayMs;

    clearSpeakingPracticeTimers(false);
    setSpeakingTraining({
      mode,
      remainingSeconds: Math.ceil(delayMs / 1_000),
      sentenceNo,
    });

    speakingCountdownRef.current = window.setInterval(() => {
      setSpeakingTraining((current) =>
        current?.sentenceNo === sentenceNo
          ? { ...current, remainingSeconds: Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)) }
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

      if (audioSettingsRef.current.playMode === "sentence-loop") {
        activeSentenceNoRef.current = sentenceNo;
        setActiveSentenceNo(sentenceNo);
        requestSentenceAutoPlay(sentenceNo);
      } else {
        playSentenceByMode(sentenceNo);
      }
    }, delayMs);
  }

  function handleSentencePlayingChange(sentenceNo: number, isPlaying: boolean) {
    if (isPlaying) {
      clearSpeakingPracticeTimers();
      activeSentenceNoRef.current = sentenceNo;
      setActiveSentenceNo(sentenceNo);
      setIsSentenceAudioPlaying(true);
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

  function handleSentenceEnded(sentenceNo: number) {
    setIsSentenceAudioPlaying(false);
    const speakingMode = audioSettingsRef.current.speakingMode;

    if (speakingMode === "none") {
      playSentenceByMode(sentenceNo);
      return;
    }

    startSpeakingPractice(sentenceNo, speakingMode);
  }

  function toggleFavoriteSentence(sentenceNo: number, english: string, chinese: string, sentenceAudioUrl?: string) {
    const id = favoriteSentenceId(lesson.id, sentenceNo);
    let currentItems: Array<{
      audioUrl?: string;
      bookCode?: string;
      chineseText?: string;
      englishText: string;
      href?: string;
      id: string;
      savedAt: string;
      sectionTitle?: string;
      sentenceNo?: number;
    }> = [];

    try {
      const rawValue = window.localStorage.getItem(FAVORITE_SENTENCES_STORAGE_KEY);
      currentItems = rawValue ? JSON.parse(rawValue) : [];
    } catch {
      currentItems = [];
    }

    const isFavorite = currentItems.some((item) => item.id === id);
    const nextItems = isFavorite
      ? currentItems.filter((item) => item.id !== id)
      : [
          {
            audioUrl: sentenceAudioUrl,
            bookCode: lesson.bookCode === "new-concept-2" ? "NEW_CONCEPT_2" : "NEW_CONCEPT_1",
            chineseText: chinese,
            englishText: english,
            href: `/new-concept/${lesson.id}#new-concept-sentence-${sentenceNo}`,
            id,
            savedAt: new Date().toISOString(),
            sectionTitle: `新概念英语${lesson.bookCode === "new-concept-2" ? "第二册" : "第一册"} Lesson ${lesson.lessonNo} ${lesson.title}`,
            sentenceNo,
          },
          ...currentItems,
        ];

    window.localStorage.setItem(FAVORITE_SENTENCES_STORAGE_KEY, JSON.stringify(nextItems));
    setFavoriteSentenceIds(nextItems.map((item) => item.id));
  }

  const studyTextBlocks = getNewConceptArticleTextBlocks(lesson);
  const activeStudySentenceIndex = Math.max(0, (activeSentenceNo ?? 1) - 1);
  const activeStudyTextBlockIndex = studyTextBlocks.findIndex(
    (block) => activeStudySentenceIndex >= block.startLineIndex && activeStudySentenceIndex <= block.endLineIndex,
  );
  const activeStudyTextBlock = studyTextBlocks[activeStudyTextBlockIndex];
  const previousStudyTextBlock = studyTextBlocks[activeStudyTextBlockIndex - 1];
  const nextStudyTextBlock = studyTextBlocks[activeStudyTextBlockIndex + 1];
  const activeStudyEnglish = activeStudyTextBlock?.english ?? lesson.english[activeStudySentenceIndex] ?? lesson.english[0] ?? "";
  const activeStudyChinese = activeStudyTextBlock?.chinese
    ?? lesson.chinese[activeStudySentenceIndex]
    ?? lesson.chinese[0]
    ?? "";
  const activeStudySentenceAudio = sentenceAudioUrls[activeStudySentenceIndex] ?? null;
  const fullLessonEnglish = studyTextBlocks.map((block) => block.english).join(" ");
  const dictionaryPronunciations = useArticlePronunciations(
    fullLessonEnglish,
    audioSettings.pronunciationMode,
    true,
  );
  const vocabularyForDisplay = vocabulary.filter((item) =>
    vocabularyTermAppearsInSentence(fullLessonEnglish, item.word),
  );
  const retellingTermGroups = buildRetellingTermGroups(vocabularyForDisplay.map((item) => item.word));
  const likelyProperNounWords = getLikelyProperNounWords(fullLessonEnglish);
  const articlePronunciations = new Map<string, string>();
  if (audioSettings.pronunciationMode === "us" || audioSettings.pronunciationMode === "uk") {
    for (const item of vocabularyForDisplay) {
      const normalizedTerm = item.word.trim().toLowerCase().replace(/[’]/g, "'");
      if (
        likelyProperNounWords.has(normalizedTerm) ||
        !shouldShowAudioPronunciation(item.level, normalizedTerm)
      ) continue;
      const phonetic = audioSettings.pronunciationMode === "us"
        ? item.usPhonetic || item.phonetic
        : item.ukPhonetic || item.phonetic;
      if (phonetic && /^[a-z]+(?:'[a-z]+)?$/.test(normalizedTerm)) {
        articlePronunciations.set(normalizedTerm, phonetic);
      }
    }
  }
  dictionaryPronunciations.forEach((phonetic, word) => articlePronunciations.set(word, phonetic));

  return (
    <section className={`stack bbc-article-page new-concept-lesson-page ${isRetellingPractice ? "article-retelling-active" : ""}`} ref={pageRef}>
      <div className="page-heading bbc-article-hero new-concept-lesson-hero">
        <div className="bbc-article-hero-top">
          <Link className="bbc-detail-back-link" href={`/new-concept?book=${lesson.bookCode ?? "new-concept-1"}&edition=${audioEdition}&unit=${Math.ceil(lesson.lessonNo / 24)}`}>
            ← 返回{lesson.bookCode === "new-concept-2" ? "新概念2" : "新概念1"}
          </Link>
          <span className="bbc-article-title-id">Lesson {lesson.lessonNo}</span>
          <div className="bbc-article-actions new-concept-article-actions">
            <button
              aria-label={isLessonFavorite ? "取消收藏文章" : "收藏文章"}
              aria-pressed={isLessonFavorite}
              className={`favorite-star ${isLessonFavorite ? "active" : ""}`}
              onClick={toggleFavoriteLesson}
              title={isLessonFavorite ? "取消收藏文章" : "收藏文章"}
              type="button"
            >
              {isLessonFavorite ? "★" : "☆"}
            </button>
            <ContentShareButton
              label="分享文章"
              text={`${lesson.title}\n${lesson.titleChinese ?? ""}`.trim()}
              title={`新概念英语 Lesson ${lesson.lessonNo} ${lesson.title}`}
              url={`/new-concept/${lesson.id}`}
            />
          </div>
        </div>
        <h1>
          <span className="bbc-article-title-line" lang="en">{lesson.title}</span>
          {lesson.titleChinese ? <span className="bbc-article-title-line" lang="zh-CN">{lesson.titleChinese}</span> : null}
        </h1>
      </div>

      <div className="bbc-article-study new-concept-study" ref={studyWorkspaceRef}>
        {audioUrl ? (
          <section className="bbc-full-audio-panel new-concept-audio-panel">
            <div className="new-concept-audio-heading">
              <div>
                <span className="new-concept-kicker">{audioEdition === "uk" ? "British English audio" : "American English audio"}</span>
                <strong>本课整段播放</strong>
              </div>
              <span>Lesson {lesson.lessonNo}</span>
            </div>
            <AudioPlayer
              key={`new-concept-full-${audioEdition}-${modeSelectionVersion}`}
              hasSelectedRate
              // Native media playback supports pitch-preserving rate changes.
              html5
              onPlayingChange={(isPlaying) => {
                if (!isPlaying) {
                  return;
                }
                clearSpeakingPracticeTimers();
                activeSentenceNoRef.current = null;
                setActiveSentenceNo(null);
                setIsSentenceAudioPlaying(false);
              }}
              onSettingsChange={updateAudioSettings}
              settings={audioSettings}
              settingsPlacement="none"
              src={audioUrl}
              title={`新概念英语第 ${lesson.lessonNo} 课整段音频`}
            />
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
                <button
                  aria-pressed={studyMode === "intensive"}
                  className={`bbc-fullscreen-toggle ${studyMode === "intensive" ? "active" : ""}`}
                  onClick={() => selectStudyMode(studyMode === "intensive" ? "general" : "intensive")}
                  type="button"
                >
                  精读模式
                </button>
                <AudioSettingsMenus
                  onChange={updateAudioSettings}
                  onModeSelect={(mode) => selectStudyMode(mode)}
                  playModeLabel="精听模式"
                  settings={audioSettings}
                  variant="listening-only"
                />
                <AudioSettingsMenus
                  onChange={updateAudioSettings}
                  onModeSelect={(mode) => selectStudyMode(mode)}
                  settings={audioSettings}
                  variant="speaking-writing"
                />
                {studyMode === "speaking" && !isRetellingPractice ? (
                  <button className="bbc-fullscreen-toggle article-retelling-mode-button" onClick={enterRetellingPractice} type="button">
                    复述练习
                  </button>
                ) : null}
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
                  sourceHref={`/new-concept/${lesson.id}`}
                  sourceId={`new-concept:${lesson.id}`}
                  sourceTitle={`新概念英语 Lesson ${lesson.lessonNo} ${lesson.title}`}
                  surfaceRef={pageRef}
                />
              </div>
            </div>
          </section>
        ) : null}

        <div
          className={`bbc-article-columns new-concept-columns ${!isVocabularyVisible || isRetellingPractice ? "without-vocabulary" : ""} ${isRetellingPractice ? "article-retelling-columns" : ""} ${!isOriginalVisible ? "original-hidden" : ""}`}
        >
          <section className={`bbc-original-panel new-concept-original-panel ${studyMode !== "general" ? "bbc-intensive-original-panel" : ""} ${isRetellingPractice ? "article-retelling-parent" : ""}`}>
            {isRetellingPractice ? (
              <ArticleRetellingPractice
                groups={retellingTermGroups}
                onExit={exitRetellingPractice}
                sourceId={lesson.id}
                sourceType="new-concept"
                title={lesson.title}
              />
            ) : isOriginalVisible ? studyMode === "general" ? (
              <NewConceptArticleCopy annotations={inlineTextAnnotations} displayMode={displayMode} isOriginalVisible lesson={lesson} pronunciations={articlePronunciations} />
            ) : activeStudyEnglish ? (
                <div className="bbc-intensive-reading">
                <div className="bbc-intensive-reading-actions">
                  {studyMode === "writing" && audioSettings.dictationMode !== "none" ? (
                    <button
                      aria-keyshortcuts="Shift"
                      aria-pressed={showWritingAnswers}
                      className={`bbc-show-writing-answers ${showWritingAnswers ? "active" : ""}`}
                      onClick={() => setShowWritingAnswers((visible) => !visible)}
                      title="点击切换答案，也可单独按 Shift"
                      type="button"
                    >
                      {showWritingAnswers ? "隐藏答案" : "显示答案"}
                    </button>
                  ) : null}
                  <button
                      aria-label={favoriteSentenceIds.includes(favoriteSentenceId(lesson.id, activeStudyTextBlock ? activeStudyTextBlock.startLineIndex + 1 : activeStudySentenceIndex + 1)) ? "取消收藏本句" : "收藏本句"}
                      aria-pressed={favoriteSentenceIds.includes(favoriteSentenceId(lesson.id, activeStudyTextBlock ? activeStudyTextBlock.startLineIndex + 1 : activeStudySentenceIndex + 1))}
                      className={`favorite-star ${favoriteSentenceIds.includes(favoriteSentenceId(lesson.id, activeStudyTextBlock ? activeStudyTextBlock.startLineIndex + 1 : activeStudySentenceIndex + 1)) ? "active" : ""}`}
                      onClick={() => toggleFavoriteSentence(
                        activeStudyTextBlock ? activeStudyTextBlock.startLineIndex + 1 : activeStudySentenceIndex + 1,
                        activeStudyEnglish,
                        activeStudyChinese,
                        activeStudySentenceAudio ?? undefined,
                      )}
                      title={favoriteSentenceIds.includes(favoriteSentenceId(lesson.id, activeStudyTextBlock ? activeStudyTextBlock.startLineIndex + 1 : activeStudySentenceIndex + 1)) ? "取消收藏本句" : "收藏本句"}
                      type="button"
                    >
                      {favoriteSentenceIds.includes(favoriteSentenceId(lesson.id, activeStudyTextBlock ? activeStudyTextBlock.startLineIndex + 1 : activeStudySentenceIndex + 1)) ? "★" : "☆"}
                    </button>
                    <ContentShareButton
                      label="分享本句"
                      text={`${activeStudyEnglish}\n${activeStudyChinese}`.trim()}
                      title={`新概念英语 Lesson ${lesson.lessonNo} 第 ${activeStudyTextBlock ? activeStudyTextBlock.startLineIndex + 1 : activeStudySentenceIndex + 1} 句`}
                      url={`/new-concept/${lesson.id}#new-concept-sentence-${activeStudyTextBlock ? activeStudyTextBlock.startLineIndex + 1 : activeStudySentenceIndex + 1}`}
                    />
                  </div>
                  {studyMode !== "speaking" && studyMode !== "writing" ? (
                    <>
                      <p className="bbc-intensive-english" lang="en">
                        {renderNewConceptArticleEnglish(activeStudyEnglish, vocabularyForDisplay.map((item) => item.word), articlePronunciations)}
                      </p>
                      {activeStudyChinese ? <p className="bbc-intensive-chinese" lang="zh-CN">{activeStudyChinese}</p> : null}
                    </>
                  ) : null}
                  {studyMode === "speaking" || studyMode === "writing" ? (
                    <BbcSentencePractice
                      key={`${activeStudySentenceIndex + 1}:${activeStudyEnglish}`}
                      activeWordIndex={null}
                      englishContent={renderNewConceptArticleEnglish(activeStudyEnglish, vocabularyForDisplay.map((item) => item.word), articlePronunciations)}
                      isAudioPlaying={isSentenceAudioPlaying && activeSentenceNo === activeStudySentenceIndex + 1}
                      sentence={{ chinese: activeStudyChinese, english: activeStudyEnglish, sentenceNo: activeStudySentenceIndex + 1 }}
                      settings={audioSettings}
                      showAnswers={showWritingAnswers}
                      translationContent={activeStudyChinese}
                    />
                  ) : null}
                  {speakingTraining?.sentenceNo === activeStudySentenceIndex + 1 ? (
                    <div aria-live="polite" className="bbc-speaking-training-status practicing">
                      <span>{SPEAKING_PHASE_LABELS[speakingTraining.mode]}</span>
                      <strong>{speakingTraining.remainingSeconds} 秒</strong>
                      <small>之后继续播放</small>
                    </div>
                  ) : activeSentenceNo === activeStudySentenceIndex + 1 && isSentenceAudioPlaying && audioSettings.speakingMode !== "none" ? (
                    <div className="bbc-speaking-training-status playing">
                      <span>{SPEAKING_MODE_LABELS[audioSettings.speakingMode]}</span>
                      <strong>正在播放</strong>
                      <small>{SPEAKING_PLAYING_HINTS[audioSettings.speakingMode]}</small>
                    </div>
                  ) : null}
                  {activeStudySentenceAudio ? (
                    <AudioPlayer
                      key={`${modeSelectionVersion}-${activeStudySentenceIndex + 1}`}
                      autoPlaySignal={sentenceAutoPlaySignals[activeStudySentenceIndex + 1] ?? 0}
                      compactControls
                      deferSentenceLoop={audioSettings.speakingMode !== "none"}
                      hasSelectedRate
                      html5
                      onDurationChange={(durationSeconds) => {
                        setSentenceDurations((current) => ({
                          ...current,
                          [activeStudySentenceIndex + 1]: durationSeconds,
                        }));
                      }}
                      leadingControls={(
                        <button
                          aria-label="上一句"
                          className="bbc-sentence-navigation-button"
                          disabled={!previousStudyTextBlock}
                          onClick={() => previousStudyTextBlock && selectStudySentence(previousStudyTextBlock.startLineIndex + 1)}
                          type="button"
                        >上一句</button>
                      )}
                      onEnded={() => handleSentenceEnded(activeStudySentenceIndex + 1)}
                      onPlayingChange={(isPlaying) => handleSentencePlayingChange(activeStudySentenceIndex + 1, isPlaying)}
                      onSettingsChange={updateAudioSettings}
                      onTimeChange={(positionSeconds) => handleSentenceTimeChange(activeStudySentenceIndex + 1, positionSeconds)}
                      seekRequest={sentenceRestoreSeekRequest?.sentenceNo === activeStudySentenceIndex + 1 ? sentenceRestoreSeekRequest : null}
                      settings={audioSettings}
                      settingsPlacement="none"
                      skipSeconds={3}
                      src={activeStudySentenceAudio}
                      title={`新概念英语第 ${lesson.lessonNo} 课第 ${activeStudySentenceIndex + 1} 句音频`}
                      trailingControls={(
                        <button
                          aria-label="下一句"
                          className="bbc-sentence-navigation-button"
                          disabled={!nextStudyTextBlock}
                          onClick={() => nextStudyTextBlock && selectStudySentence(nextStudyTextBlock.startLineIndex + 1)}
                          type="button"
                        >下一句</button>
                      )}
                    />
                  ) : null}
                </div>
              ) : null : null}
          </section>
          {isVocabularyVisible && !isRetellingPractice ? (
            <LessonVocabulary
              onVocabularyOpen={saveVocabularyReturnState}
              returnTo={`/new-concept/${lesson.id}?edition=${audioEdition}`}
              vocabulary={vocabularyForDisplay}
            />
          ) : null}
        </div>

        <nav aria-label="课次导航" className="new-concept-lesson-nav">
          {previousLesson ? <Link href={`/new-concept/${previousLesson.id}?edition=${audioEdition}`}>← Lesson {previousLesson.lessonNo} {previousLesson.title}</Link> : <span />}
          {nextLesson ? <Link href={`/new-concept/${nextLesson.id}?edition=${audioEdition}`}>Lesson {nextLesson.lessonNo} {nextLesson.title} →</Link> : <span />}
        </nav>
      </div>
    </section>
  );
}
