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
import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import type { NewConceptLesson } from "@/lib/new-concept";
import {
  getNewConceptAudioUrl,
  getNewConceptNextLesson,
  getNewConceptPreviousLesson,
  getNewConceptSentenceAudioUrl,
} from "@/lib/new-concept";
import type { NewConceptVocabularyItem } from "@/lib/new-concept-vocabulary";

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
  { label: "中文", mode: "chinese" },
  { label: "中英", mode: "bilingual" },
];

const ORIGINAL_VISIBILITY_MODES: { label: string; mode: OriginalVisibilityMode }[] = [
  { label: "显示原文", mode: "show-original" },
  { label: "隐藏原文", mode: "hide-original" },
  { label: "隐藏词汇", mode: "hide-vocabulary" },
];

const FAVORITE_SENTENCES_STORAGE_KEY = "ielts-platform.favoriteSentences";

const SPEAKING_MODE_LABELS: Record<ActiveSpeakingMode, string> = {
  imitation: "模仿朗读",
  shadowing: "影子练习",
  "sight-translation": "视译训练",
};

const SPEAKING_PHASE_LABELS: Record<ActiveSpeakingMode, string> = {
  imitation: "轮到你模仿朗读",
  shadowing: "影子练习",
  "sight-translation": "请看中文视译成英文",
};

const SPEAKING_PLAYING_HINTS: Record<ActiveSpeakingMode, string> = {
  imitation: "播放结束后跟读本句",
  shadowing: "播放时跟随音频同步朗读",
  "sight-translation": "播放结束后根据中文复述英文",
};

function favoriteSentenceId(lessonId: string, sentenceNo: number) {
  return `new-concept:${lessonId}:sentence:${sentenceNo}`;
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
      <button aria-label="原文显示模式" className="player-menu-trigger" type="button">
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

function LessonVocabulary({ vocabulary }: { vocabulary: NewConceptVocabularyItem[] }) {
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
                  href={`/vocabulary/${encodeURIComponent(item.normalizedWord)}`}
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

function renderNewConceptArticleEnglish(text: string) {
  return <span>{text}</span>;
}

function getNewConceptArticleTextBlocks(lesson: NewConceptLesson) {
  const englishLines = lesson.kind === "dialogue" ? lesson.english : lesson.exercise;
  const chineseLines = lesson.kind === "dialogue" ? lesson.chinese : [];
  const blocks: { chinese: string; english: string }[] = [];
  let english = "";
  let chinese = "";

  englishLines.forEach((line, index) => {
    english = [english, line.trim()].filter(Boolean).join(" ");
    chinese += chineseLines[index] ?? "";
    const endsWithSentencePunctuation = /[.!?。！？]["'’”’」』)\]]*$/.test(line.trim());

    if (endsWithSentencePunctuation || index === englishLines.length - 1) {
      blocks.push({ chinese, english });
      english = "";
      chinese = "";
    }
  });

  return blocks;
}

function NewConceptArticleCopy({
  displayMode,
  isOriginalVisible,
  lesson,
}: {
  displayMode: OriginalDisplayMode;
  isOriginalVisible: boolean;
  lesson: NewConceptLesson;
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
              <p lang="en">{renderNewConceptArticleEnglish(english)}</p>
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
  speakingTraining: SpeakingTrainingState | null;
}) {
  if (lesson.kind === "written-exercise") {
    return (
      <div className="new-concept-exercise-copy">
        {lesson.exercise.map((line, index) => <p key={`${lesson.id}-exercise-${index}`}>{line}</p>)}
      </div>
    );
  }

  return (
    <div className="new-concept-sentence-list">
      {lesson.english.map((english, index) => {
        const chinese = lesson.chinese[index] ?? "";
        const sentenceAudioUrl = getNewConceptSentenceAudioUrl(lesson, index);

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
  lesson,
  vocabulary,
}: {
  lesson: NewConceptLesson;
  vocabulary: NewConceptVocabularyItem[];
}) {
  const audioUrl = getNewConceptAudioUrl(lesson);
  const previousLesson = getNewConceptPreviousLesson(lesson);
  const nextLesson = getNewConceptNextLesson(lesson);
  const [displayMode, setDisplayMode] = useState<OriginalDisplayMode>("bilingual");
  const [isOriginalVisible, setIsOriginalVisible] = useState(true);
  const [isVocabularyVisible, setIsVocabularyVisible] = useState(true);
  const [isOriginalFullscreen, setIsOriginalFullscreen] = useState(false);
  const [favoriteSentenceIds, setFavoriteSentenceIds] = useState<string[]>([]);
  const [activeSentenceNo, setActiveSentenceNo] = useState<number | null>(null);
  const [activeSentencePosition, setActiveSentencePosition] = useState(0);
  const [isSentenceAudioPlaying, setIsSentenceAudioPlaying] = useState(false);
  const [sentenceAutoPlaySignals, setSentenceAutoPlaySignals] = useState<Record<number, number>>({});
  const [speakingTraining, setSpeakingTraining] = useState<SpeakingTrainingState | null>(null);
  const [audioSettings, setAudioSettings] = useState<AudioPlayerSettings>({
    ...DEFAULT_AUDIO_PLAYER_SETTINGS,
    subtitleMode: "bilingual",
  });
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
    function handleFullscreenChange() {
      setIsOriginalFullscreen(document.fullscreenElement === studyWorkspaceRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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
    setSentenceAutoPlaySignals((current) => ({
      ...current,
      [nextSentenceNo]: (current[nextSentenceNo] ?? 0) + 1,
    }));
  }

  function startSpeakingPractice(sentenceNo: number, mode: ActiveSpeakingMode) {
    const delayMs = mode === "shadowing" ? 2_500 : mode === "sight-translation" ? 3_000 : 4_000;
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
        setSentenceAutoPlaySignals((current) => ({
          ...current,
          [sentenceNo]: (current[sentenceNo] ?? 0) + 1,
        }));
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
            bookCode: "NEW_CONCEPT_1",
            chineseText: chinese,
            englishText: english,
            href: `/new-concept/${lesson.id}#new-concept-sentence-${sentenceNo}`,
            id,
            savedAt: new Date().toISOString(),
            sectionTitle: `新概念英语 Lesson ${lesson.lessonNo} ${lesson.title}`,
            sentenceNo,
          },
          ...currentItems,
        ];

    window.localStorage.setItem(FAVORITE_SENTENCES_STORAGE_KEY, JSON.stringify(nextItems));
    setFavoriteSentenceIds(nextItems.map((item) => item.id));
  }

  return (
    <section className="stack bbc-article-page new-concept-lesson-page" ref={pageRef}>
      <div className="page-heading bbc-article-hero new-concept-lesson-hero">
        <div className="bbc-article-hero-top">
          <Link className="bbc-detail-back-link" href="/new-concept">
            ← 返回新概念1
          </Link>
          <span className="bbc-article-title-id">Lesson {lesson.lessonNo}</span>
          <span className="new-concept-edition-mark">美音版</span>
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
                <span className="new-concept-kicker">American English audio</span>
                <strong>本课整段播放</strong>
              </div>
              <span>Lesson {lesson.lessonNo}</span>
            </div>
            <AudioPlayer
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
              src={audioUrl}
              title={`新概念英语第 ${lesson.lessonNo} 课整段音频`}
            />
          </section>
        ) : null}

        <div
          className={`bbc-article-columns new-concept-columns ${isVocabularyVisible && vocabulary.length ? "" : "without-vocabulary"} ${!isOriginalVisible ? "original-hidden" : ""}`}
        >
          <section className="bbc-original-panel new-concept-original-panel">
            <header className="bbc-original-head new-concept-section-head">
              <div>
                <span className="new-concept-kicker">New Concept · Original</span>
                <h2>课文原文</h2>
              </div>
              <div className="bbc-original-actions">
                <OriginalDisplayMenu
                  mode={displayMode}
                  onChange={(nextMode) => {
                    setDisplayMode(nextMode);
                    updateAudioSettings({ subtitleMode: nextMode });
                  }}
                />
                <OriginalVisibilityMenu
                  isOriginalVisible={isOriginalVisible}
                  isVocabularyVisible={isVocabularyVisible}
                  onChange={(nextMode) => {
                    if (nextMode === "show-original") {
                      setIsOriginalVisible(true);
                      setIsVocabularyVisible(true);
                    } else if (nextMode === "hide-original") {
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
                  sourceHref={`/new-concept/${lesson.id}`}
                  sourceId={`new-concept:${lesson.id}`}
                  sourceTitle={`新概念英语 Lesson ${lesson.lessonNo} ${lesson.title}`}
                  surfaceRef={pageRef}
                />
              </div>
            </header>
            <NewConceptArticleCopy
              displayMode={displayMode}
              isOriginalVisible={isOriginalVisible}
              lesson={lesson}
            />
          </section>
          {isVocabularyVisible && vocabulary.length ? <LessonVocabulary vocabulary={vocabulary} /> : null}
        </div>

        <section className="new-concept-sentence-audio-panel">
          <header className="new-concept-sentence-audio-heading">
            <div>
              <span className="new-concept-kicker">Dialogue · Sentence audio</span>
              <h2>单句音频播放</h2>
            </div>
          </header>
          <LessonTranscript
            activeSentenceNo={activeSentenceNo}
            audioSettings={audioSettings}
            favoriteSentenceIds={favoriteSentenceIds}
            isSentenceAudioPlaying={isSentenceAudioPlaying}
            lesson={lesson}
            onAudioSettingsChange={updateAudioSettings}
            onSentenceEnded={handleSentenceEnded}
            onSentencePlayingChange={handleSentencePlayingChange}
            onSentenceTimeChange={handleSentenceTimeChange}
            onToggleFavorite={toggleFavoriteSentence}
            sentenceAutoPlaySignals={sentenceAutoPlaySignals}
            speakingTraining={speakingTraining}
          />
        </section>

        <nav aria-label="课次导航" className="new-concept-lesson-nav">
          {previousLesson ? <Link href={`/new-concept/${previousLesson.id}`}>← Lesson {previousLesson.lessonNo} {previousLesson.title}</Link> : <span />}
          {nextLesson ? <Link href={`/new-concept/${nextLesson.id}`}>Lesson {nextLesson.lessonNo} {nextLesson.title} →</Link> : <span />}
        </nav>
      </div>
    </section>
  );
}
