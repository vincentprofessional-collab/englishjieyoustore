"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSpellingCharacterFeedback } from "@/lib/vocabulary/spelling-feedback";
import { getListeningAnswerBatchRange, getNumberAudioClipNumbers, LISTENING_ANSWER_WORDS_PER_GROUP } from "@/lib/vocabulary/listening-answer-batches";
import { getVocabularyAudioUrl, type VocabularyAccent } from "@/lib/vocabulary/pronunciation-audio";
import type { ListeningAnswerDeck, ListeningAnswerDeckId } from "@/lib/vocabulary/listening-answer-words";
import styles from "./vocabulary-listening-answer-words.module.css";

const ANSWER_REVEAL_DELAY_MS = 5_000;
const STUDY_VOICE_STORAGE_KEY = "ielts-vocabulary-learning-v1";

function getNumberAudioUrl(clipNumber: number) {
  return `/api/vocabulary-answer-audio/numbers208/group-${String(clipNumber).padStart(3, "0")}`;
}

function getSavedStudyAccent(): VocabularyAccent {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STUDY_VOICE_STORAGE_KEY) ?? "null") as { voice?: unknown } | null;
    if (saved?.voice === "uk" || saved?.voice === "us") return saved.voice;
  } catch {
    // Use the app's default voice when the local preference is unavailable.
  }
  return "us";
}

export function VocabularyListeningAnswerWords({
  decks,
  initialDeckId,
}: {
  decks: ListeningAnswerDeck[];
  initialDeckId: ListeningAnswerDeckId | null;
}) {
  const [activeDeckId, setActiveDeckId] = useState<ListeningAnswerDeckId | null>(initialDeckId);
  const [groupIndex, setGroupIndex] = useState(0);
  const [typedAnswers, setTypedAnswers] = useState<Record<number, string>>({});
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioMessage, setAudioMessage] = useState("");
  const [accent, setAccent] = useState<VocabularyAccent>("us");
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const revealTimerRef = useRef<number | null>(null);
  const playbackWordOffsetRef = useRef(0);
  const playbackNumberClipOffsetRef = useRef(0);

  const activeDeck = useMemo(() => decks.find((deck) => deck.id === activeDeckId) ?? null, [activeDeckId, decks]);
  const groupCount = activeDeck ? Math.ceil(activeDeck.words.length / LISTENING_ANSWER_WORDS_PER_GROUP) : 0;
  const batchRange = activeDeck
    ? getListeningAnswerBatchRange(activeDeck.id, activeDeck.words, groupIndex)
    : null;
  const usesGroupRecording = activeDeck?.id === "numbers208";
  const numberAudioClipNumbers = usesGroupRecording && batchRange ? getNumberAudioClipNumbers(batchRange) : [];
  const initialAudioSource = activeDeck && batchRange
    ? usesGroupRecording
      ? getNumberAudioUrl(numberAudioClipNumbers[0])
      : getVocabularyAudioUrl(batchRange.words[0].answer, accent)
    : "";
  const wordsComplete = batchRange ? batchRange.endWordIndex + 1 : 0;

  useEffect(() => {
    const syncAccent = () => setAccent(getSavedStudyAccent());
    syncAccent();
    window.addEventListener("storage", syncAccent);
    return () => window.removeEventListener("storage", syncAccent);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!activeDeck || !audio || !initialAudioSource) return;
    if (audio.getAttribute("src") === initialAudioSource) return;
    audio.pause();
    setAudioReady(false);
    playbackWordOffsetRef.current = 0;
    setAudioMessage(usesGroupRecording
      ? `第 ${groupIndex + 1} 组音频正在加载…`
      : `正在加载第 ${groupIndex + 1} 组第 1 词的${accent === "uk" ? "英音" : "美音"}…`);
    audio.src = initialAudioSource;
    audio.load();
    playbackNumberClipOffsetRef.current = 0;
  }, [accent, activeDeck, groupIndex, initialAudioSource, usesGroupRecording]);

  useEffect(() => {
    if (!activeDeck || completed || answersRevealed || !batchRange) return;
    inputRefs.current[groupIndex * LISTENING_ANSWER_WORDS_PER_GROUP]?.focus();
  }, [activeDeck, answersRevealed, completed, groupIndex]);

  useEffect(() => () => {
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
    audioRef.current?.pause();
  }, []);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const startDeck = useCallback((deckId: ListeningAnswerDeckId) => {
    clearRevealTimer();
    audioRef.current?.pause();
    audioRef.current?.removeAttribute("src");
    audioRef.current?.load();
    inputRefs.current = [];
    setActiveDeckId(deckId);
    setGroupIndex(0);
    setTypedAnswers({});
    setAnswersRevealed(false);
    setCompleted(false);
    setAudioReady(false);
    setAudioMessage("");
    playbackWordOffsetRef.current = 0;
    playbackNumberClipOffsetRef.current = 0;
  }, [clearRevealTimer]);

  const returnToDecks = useCallback(() => {
    clearRevealTimer();
    audioRef.current?.pause();
    audioRef.current?.removeAttribute("src");
    audioRef.current?.load();
    setActiveDeckId(null);
    setGroupIndex(0);
    setTypedAnswers({});
    setAnswersRevealed(false);
    setCompleted(false);
    setAudioReady(false);
    setAudioMessage("");
    playbackWordOffsetRef.current = 0;
    playbackNumberClipOffsetRef.current = 0;
  }, [clearRevealTimer]);

  const revealAnswersAfterPlayback = useCallback(() => {
    if (revealTimerRef.current !== null || answersRevealed) return;
    audioRef.current?.pause();
    setAudioMessage("本组音频已结束，5 秒后显示词汇信息和拼写反馈。");
    clearRevealTimer();
    revealTimerRef.current = window.setTimeout(() => {
      setAnswersRevealed(true);
      setAudioMessage("");
      revealTimerRef.current = null;
    }, ANSWER_REVEAL_DELAY_MS);
  }, [answersRevealed, clearRevealTimer]);

  const handleAudioPlay = useCallback(() => {
    clearRevealTimer();
    setAudioMessage(usesGroupRecording
      ? `正在播放第 ${groupIndex + 1} 组数字音频（第 ${playbackNumberClipOffsetRef.current + 1}/${numberAudioClipNumbers.length} 段）…`
      : `正在播放第 ${groupIndex + 1} 组第 ${playbackWordOffsetRef.current + 1} 词…`);
  }, [clearRevealTimer, groupIndex, numberAudioClipNumbers.length, usesGroupRecording]);

  const handleReplayGroup = useCallback(() => {
    if (!activeDeck || !batchRange) return;
    const audio = audioRef.current;
    if (!audio) return;
    clearRevealTimer();
    playbackWordOffsetRef.current = 0;
    playbackNumberClipOffsetRef.current = 0;
    const source = usesGroupRecording
      ? getNumberAudioUrl(numberAudioClipNumbers[0])
      : getVocabularyAudioUrl(batchRange.words[0].answer, accent);
    audio.pause();
    audio.src = source;
    audio.load();
    setAudioReady(false);
    setAudioMessage(`正在重新播放第 ${groupIndex + 1} 组…`);
    void audio.play().catch(() => setAudioMessage("浏览器未启动自动播放，请按播放器的播放键继续本组。"));
  }, [accent, activeDeck, batchRange, clearRevealTimer, groupIndex, numberAudioClipNumbers, usesGroupRecording]);

  const handleNextGroup = useCallback(() => {
    if (!activeDeck || !batchRange || !answersRevealed) return;
    const nextGroupIndex = groupIndex + 1;
    if (nextGroupIndex >= groupCount) {
      audioRef.current?.pause();
      setCompleted(true);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    clearRevealTimer();
    audio.pause();
    setGroupIndex(nextGroupIndex);
    setAnswersRevealed(false);
    setAudioReady(false);
    playbackWordOffsetRef.current = 0;
    playbackNumberClipOffsetRef.current = 0;
    const nextBatch = getListeningAnswerBatchRange(activeDeck.id, activeDeck.words, nextGroupIndex);
    if (!nextBatch) return;
    const nextNumberAudioClipNumbers = activeDeck.id === "numbers208" ? getNumberAudioClipNumbers(nextBatch) : [];
    audio.src = activeDeck.id === "numbers208"
      ? getNumberAudioUrl(nextNumberAudioClipNumbers[0])
      : getVocabularyAudioUrl(nextBatch.words[0].answer, accent);
    audio.load();
    setAudioMessage(`正在加载第 ${nextGroupIndex + 1} 组音频…`);
    void audio.play().catch(() => {
      setAudioMessage("浏览器未启动自动播放，请按播放器的播放键播放本组。");
    });
  }, [accent, activeDeck, answersRevealed, batchRange, clearRevealTimer, groupCount, groupIndex]);

  const handleAudioEnded = useCallback(() => {
    if (usesGroupRecording && numberAudioClipNumbers.length > 0) {
      const nextClipOffset = playbackNumberClipOffsetRef.current + 1;
      if (nextClipOffset < numberAudioClipNumbers.length) {
        const audio = audioRef.current;
        if (!audio) return;
        playbackNumberClipOffsetRef.current = nextClipOffset;
        audio.src = getNumberAudioUrl(numberAudioClipNumbers[nextClipOffset]);
        audio.load();
        setAudioMessage(`正在播放第 ${groupIndex + 1} 组数字音频（第 ${nextClipOffset + 1}/${numberAudioClipNumbers.length} 段）…`);
        void audio.play().catch(() => setAudioMessage("浏览器未启动自动播放，请按播放器的播放键继续本组。"));
        return;
      }
    }
    if (!usesGroupRecording && batchRange) {
      const nextWordOffset = playbackWordOffsetRef.current + 1;
      if (nextWordOffset < batchRange.words.length) {
        const audio = audioRef.current;
        if (!audio) return;
        playbackWordOffsetRef.current = nextWordOffset;
        audio.src = getVocabularyAudioUrl(batchRange.words[nextWordOffset].answer, accent);
        audio.load();
        setAudioMessage(`正在播放第 ${groupIndex + 1} 组第 ${nextWordOffset + 1} 词…`);
        void audio.play().catch(() => setAudioMessage("浏览器未启动自动播放，请按播放器的播放键继续本组。"));
        return;
      }
    }
    revealAnswersAfterPlayback();
  }, [accent, batchRange, groupIndex, numberAudioClipNumbers, revealAnswersAfterPlayback, usesGroupRecording]);

  const currentGroupLabel = batchRange
    ? `${(batchRange.startWordIndex + 1).toLocaleString()}–${(batchRange.endWordIndex + 1).toLocaleString()} / ${activeDeck?.words.length.toLocaleString()}`
    : "";

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>背单词 · 写作模式</p>
          <h1>雅思听力答案词</h1>
          <p className={styles.intro}>每组 20 词。数字特辑自动连续播放对应的 10 词音频片段，其他词汇按当前英音／美音设置连续播放已有单词发音；本组播放结束 5 秒后显示词汇、音标、释义和逐字拼写反馈。</p>
        </div>
        {activeDeck ? <button className={styles.backButton} onClick={returnToDecks} type="button">返回词库</button> : null}
      </header>

      {!activeDeck ? (
        <div aria-label="选择答案词词库" className={styles.deckGrid}>
          {decks.map((deck) => (
            <button className={styles.deckCard} key={deck.id} onClick={() => startDeck(deck.id)} type="button">
              <span className={styles.deckKicker}>雅思听力答案词</span>
              <strong>{deck.title}</strong>
              <span className={styles.deckSubtitle}>{deck.subtitle}</span>
              <span className={styles.deckDescription}>{deck.description}</span>
              <span className={styles.deckFooter}><b>{deck.words.length.toLocaleString()} 词</b><span>点击开始听写　→</span></span>
            </button>
          ))}
        </div>
      ) : completed ? (
        <div className={styles.completeCard}>
          <span className={styles.deckKicker}>{activeDeck.title}</span>
          <h2>本套练习已完成</h2>
          <p>已按每组 20 词完成 {activeDeck.words.length.toLocaleString()} 词。</p>
          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={() => startDeck(activeDeck.id)} type="button">重新练习</button>
            <button className={styles.secondaryButton} onClick={returnToDecks} type="button">选择其他词库</button>
          </div>
        </div>
      ) : activeDeck && batchRange ? (
        <article className={styles.practiceCard}>
          <div className={styles.practiceTopline}>
            <div>
              <span className={styles.deckKicker}>{activeDeck.title} · {activeDeck.subtitle}</span>
              <h2>听音拼写</h2>
            </div>
            <div className={styles.groupCounter}>
              <strong>第 {groupIndex + 1} / {groupCount} 组</strong>
              <span>{currentGroupLabel}</span>
            </div>
          </div>
          <div aria-label="练习进度" className={styles.progressTrack} role="progressbar" aria-valuemax={activeDeck.words.length} aria-valuemin={0} aria-valuenow={wordsComplete}>
            <span style={{ width: `${(wordsComplete / activeDeck.words.length) * 100}%` }} />
          </div>

          <div className={styles.audioSection}>
            <label className={styles.audioLabel} htmlFor="listening-answer-group-audio">
              {usesGroupRecording ? `第 ${groupIndex + 1} 组听力音频（${batchRange.words.length} 词，${numberAudioClipNumbers.length} 段）` : `第 ${groupIndex + 1} 组单词发音（${accent === "uk" ? "英音" : "美音"}，逐词连续播放）`}
            </label>
            <audio
              aria-label={usesGroupRecording ? "本组数字音频，可播放、暂停和拖动进度，并自动衔接本组后续片段" : "本组单词发音，可播放、暂停当前词并自动连续播放"}
              className={styles.fullAudio}
              controls
              id="listening-answer-group-audio"
              onCanPlay={() => {
                setAudioReady(true);
                setAudioMessage("");
              }}
              onEnded={handleAudioEnded}
              onError={() => {
                setAudioReady(false);
                setAudioMessage(usesGroupRecording
                  ? "本组音频加载失败，请检查网络或项目访问状态后重试。"
                  : `“${batchRange?.words[playbackWordOffsetRef.current]?.answer ?? "当前词"}”的${accent === "uk" ? "英音" : "美音"}加载失败，请检查网络后重试。`);
              }}
              onPlay={handleAudioPlay}
              preload="metadata"
              ref={audioRef}
            />
            {audioMessage ? <p aria-live="polite" className={styles.audioMessage}>{audioMessage}</p> : null}
            {audioMessage.includes("加载失败") ? (
              <button className={styles.retryAudioButton} onClick={() => {
                setAudioMessage("本组音频正在重新加载…");
                const audio = audioRef.current;
                audio?.load();
                void audio?.play().catch(() => setAudioMessage("自动播放未启动，请按播放器的播放键继续本组。"));
              }} type="button">
                重新加载音频
              </button>
            ) : null}
            {!audioReady && !audioMessage ? <p className={styles.audioHint}>{usesGroupRecording ? "本组小音频正在准备…" : "正在准备本组第一个词的发音…"}</p> : null}
            <button className={styles.retryAudioButton} onClick={handleReplayGroup} type="button">重播本组</button>
          </div>

          <div aria-label={`第 ${groupIndex + 1} 组拼写`} className={styles.wordRows}>
            {batchRange.words.map((word, localIndex) => {
              const wordIndex = batchRange.startWordIndex + localIndex;
              const typed = typedAnswers[wordIndex] ?? "";
              const feedback = answersRevealed
                ? getSpellingCharacterFeedback(typed.trim(), word.answer, true)
                : [];
              return (
                <div className={styles.wordRow} key={`${wordIndex}-${word.answer}`}>
                  <div aria-hidden={!answersRevealed} className={`${styles.answerDetails} ${answersRevealed ? styles.answerDetailsVisible : ""}`}>
                    {answersRevealed ? (
                      <>
                        <strong className={styles.answerWord}>{word.answer}</strong>
                        <div className={styles.answerMeta}>
                          {word.partOfSpeech ? <span>{word.partOfSpeech}</span> : null}
                          {word.phonetic ? <span className={styles.answerPhonetic}>{word.phonetic}</span> : null}
                        </div>
                        {word.meaning ? <p className={styles.answerMeaning}>{word.meaning}</p> : null}
                      </>
                    ) : null}
                  </div>
                  <div className={styles.spellingCell}>
                    <span aria-hidden="true" className={styles.wordNumber}>{(wordIndex + 1).toLocaleString()}.</span>
                    {answersRevealed ? (
                      <div aria-label={`第 ${wordIndex + 1} 词拼写逐字反馈`} className={styles.spellingFeedback}>
                        {feedback.map((item, index) => (
                          <span className={item.correct ? styles.letterCorrect : styles.letterWrong} key={`${index}-${item.letter}`}>{item.letter}</span>
                        ))}
                      </div>
                    ) : (
                      <input
                        aria-label={`第 ${wordIndex + 1} 词拼写`}
                        autoComplete="off"
                        className={styles.spellingInput}
                        inputMode="text"
                        onChange={(event) => setTypedAnswers((previous) => ({ ...previous, [wordIndex]: event.target.value }))}
                        placeholder="输入拼写"
                        ref={(element) => { inputRefs.current[wordIndex] = element; }}
                        spellCheck={false}
                        type="text"
                        value={typed}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {answersRevealed ? (
            <div className={styles.nextGroupRow}>
              <span className={styles.nextGroupHint}>本组逐字反馈：绿色正确，红色需订正。</span>
              <button className={styles.primaryButton} disabled={!audioReady} onClick={handleNextGroup} type="button">
                {groupIndex + 1 >= groupCount ? "完成本套" : "下一组"}
              </button>
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
