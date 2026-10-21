"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MutableRefObject, type RefObject } from "react";
import { getSpellingCharacterFeedback } from "@/lib/vocabulary/spelling-feedback";
import type { ListeningAnswerDeck, ListeningAnswerDeckId, ListeningAnswerWord } from "@/lib/vocabulary/listening-answer-words";
import styles from "./vocabulary-listening-answer-words.module.css";

type AnswerStatus = "correct" | "wrong" | null;

function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function playFeedbackSound(correct: boolean) {
  if (typeof window === "undefined") return;
  const AudioContextConstructor = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return;

  try {
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    const end = start + (correct ? 0.36 : 0.28);
    oscillator.type = correct ? "sine" : "square";
    oscillator.frequency.setValueAtTime(correct ? 660 : 260, start);
    oscillator.frequency.linearRampToValueAtTime(correct ? 990 : 150, end);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.11, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.addEventListener("ended", () => { void context.close().catch(() => undefined); }, { once: true });
    oscillator.start(start);
    oscillator.stop(end);
    void context.resume().catch(() => undefined);
  } catch {
    // Audio feedback is optional on browsers without Web Audio support.
  }
}

function AnswerAudioButton({
  deckId,
  word,
  audioRef,
  playGenerationRef,
  stopTimerRef,
  onPlaybackError,
}: {
  deckId: ListeningAnswerDeckId;
  word: ListeningAnswerWord;
  audioRef: RefObject<HTMLAudioElement | null>;
  playGenerationRef: MutableRefObject<number>;
  stopTimerRef: MutableRefObject<number | null>;
  onPlaybackError: (message: string) => void;
}) {
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    playGenerationRef.current += 1;
    const generation = playGenerationRef.current;
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    audio.pause();
    onPlaybackError("");

    const sourceKey = `${deckId}/${word.audioPart}`;
    if (audio.dataset.sourceKey !== sourceKey) {
      audio.dataset.sourceKey = sourceKey;
      audio.src = `/api/vocabulary-answer-audio/${deckId}/${word.audioPart}`;
      audio.load();
    }

    const seekAndPlay = () => {
      if (generation !== playGenerationRef.current) return;
      audio.currentTime = word.audioStartMs / 1000;
      void audio.play().catch(() => onPlaybackError("音频被浏览器拦截，请再点一次播放。"));
      const remainingMs = Math.max(500, word.audioEndMs - word.audioStartMs);
      stopTimerRef.current = window.setTimeout(() => {
        if (generation === playGenerationRef.current) audio.pause();
      }, remainingMs);
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      seekAndPlay();
      return;
    }

    audio.addEventListener("loadedmetadata", seekAndPlay, { once: true });
    // Starting in the click handler preserves the browser's user-activation permission.
    void audio.play().catch(() => onPlaybackError("正在载入音频；载入后请再点一次播放。"));
  }, [audioRef, deckId, onPlaybackError, playGenerationRef, stopTimerRef, word]);

  return <button className={styles.audioButton} onClick={play} type="button">▶ 播放本题音频</button>;
}

export function VocabularyListeningAnswerWords({
  decks,
  initialDeckId,
}: {
  decks: ListeningAnswerDeck[];
  initialDeckId: ListeningAnswerDeckId | null;
}) {
  const [activeDeckId, setActiveDeckId] = useState<ListeningAnswerDeckId | null>(initialDeckId);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>(null);
  const [completed, setCompleted] = useState(false);
  const [audioMessage, setAudioMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playGenerationRef = useRef(0);
  const stopTimerRef = useRef<number | null>(null);
  const activeDeck = useMemo(() => decks.find((deck) => deck.id === activeDeckId) ?? null, [activeDeckId, decks]);
  const currentWord = activeDeck?.words[questionIndex] ?? null;

  useEffect(() => {
    if (activeDeckId && !completed) inputRef.current?.focus();
  }, [activeDeckId, completed, questionIndex]);

  useEffect(() => () => {
    playGenerationRef.current += 1;
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    audioRef.current?.pause();
  }, []);

  const returnToDecks = useCallback(() => {
    playGenerationRef.current += 1;
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    audioRef.current?.pause();
    setActiveDeckId(null);
    setQuestionIndex(0);
    setTypedAnswer("");
    setAnswerStatus(null);
    setCompleted(false);
    setAudioMessage("");
  }, []);

  const startDeck = useCallback((deckId: ListeningAnswerDeckId) => {
    playGenerationRef.current += 1;
    audioRef.current?.pause();
    setActiveDeckId(deckId);
    setQuestionIndex(0);
    setTypedAnswer("");
    setAnswerStatus(null);
    setCompleted(false);
    setAudioMessage("");
  }, []);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentWord || answerStatus) return;
    const correct = normalizeAnswer(typedAnswer) === normalizeAnswer(currentWord.answer);
    setAnswerStatus(correct ? "correct" : "wrong");
    playFeedbackSound(correct);
  }

  function advance() {
    if (!activeDeck || !answerStatus) return;
    if (questionIndex + 1 >= activeDeck.words.length) {
      setCompleted(true);
      audioRef.current?.pause();
      return;
    }
    setQuestionIndex((index) => index + 1);
    setTypedAnswer("");
    setAnswerStatus(null);
    setAudioMessage("");
  }

  const characterFeedback = currentWord && answerStatus === "wrong"
    ? getSpellingCharacterFeedback(typedAnswer.trim(), currentWord.answer, true)
    : [];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>背单词 · 写作模式</p>
          <h1>雅思听力答案词</h1>
          <p className={styles.intro}>按词表顺序听音、看释义并拼写。练习直接使用原词汇文档，不打开单词详情页。</p>
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
              <span className={styles.deckFooter}><b>{deck.words.length.toLocaleString()} 词</b><span>点击开始写作练习　→</span></span>
            </button>
          ))}
        </div>
      ) : completed ? (
        <div className={styles.completeCard}>
          <span className={styles.deckKicker}>{activeDeck.title}</span>
          <h2>本套练习已完成</h2>
          <p>已按词表顺序完成 {activeDeck.words.length.toLocaleString()} 词。</p>
          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={() => startDeck(activeDeck.id)} type="button">重新练习</button>
            <button className={styles.secondaryButton} onClick={returnToDecks} type="button">选择其他词库</button>
          </div>
        </div>
      ) : currentWord ? (
        <article className={styles.practiceCard}>
          <div className={styles.practiceTopline}>
            <div><span className={styles.deckKicker}>{activeDeck.title} · {activeDeck.subtitle}</span><h2>听音拼写</h2></div>
            <strong className={styles.counter}>{(questionIndex + 1).toLocaleString()} / {activeDeck.words.length.toLocaleString()}</strong>
          </div>
          <div aria-label="练习进度" className={styles.progressTrack} role="progressbar" aria-valuemax={activeDeck.words.length} aria-valuemin={0} aria-valuenow={questionIndex + 1}>
            <span style={{ width: `${((questionIndex + 1) / activeDeck.words.length) * 100}%` }} />
          </div>
          <div className={styles.clue}>
            <div className={styles.clueMeta}>
              {currentWord.partOfSpeech ? <span>{currentWord.partOfSpeech}</span> : null}
              {currentWord.category ? <span>{currentWord.category}</span> : null}
              {currentWord.phonetic ? <span className={styles.phonetic}>{currentWord.phonetic}</span> : null}
            </div>
            <p>{currentWord.meaning || "请根据音频拼写答案词。"}</p>
          </div>
          <AnswerAudioButton
            audioRef={audioRef}
            deckId={activeDeck.id}
            onPlaybackError={setAudioMessage}
            playGenerationRef={playGenerationRef}
            stopTimerRef={stopTimerRef}
            word={currentWord}
          />
          {audioMessage ? <p aria-live="polite" className={styles.audioMessage}>{audioMessage}</p> : null}
          <form className={styles.answerForm} onSubmit={submitAnswer}>
            <label htmlFor="listening-answer-word-input">听音后拼写答案</label>
            <input
              aria-describedby={answerStatus ? "listening-answer-word-feedback" : undefined}
              aria-invalid={answerStatus === "wrong"}
              autoComplete="off"
              className={`${styles.answerInput} ${answerStatus ? styles[answerStatus] : ""}`}
              disabled={Boolean(answerStatus)}
              id="listening-answer-word-input"
              inputMode="text"
              onChange={(event) => setTypedAnswer(event.target.value)}
              placeholder="点击此处输入拼写"
              ref={inputRef}
              spellCheck={false}
              type="text"
              value={typedAnswer}
            />
            {!answerStatus ? <button className={styles.primaryButton} disabled={!typedAnswer.trim()} type="submit">检查拼写</button> : null}
          </form>
          {answerStatus ? (
            <div aria-live="polite" className={`${styles.feedback} ${styles[answerStatus]}`} id="listening-answer-word-feedback">
              <strong>{answerStatus === "correct" ? "拼写正确" : "拼写错误"}</strong>
              {answerStatus === "wrong" ? <span>正确答案：{currentWord.answer}</span> : <span>{currentWord.answer}</span>}
              {answerStatus === "wrong" ? <div aria-label="逐字拼写反馈" className={styles.letterFeedback}>
                {characterFeedback.map((item, index) => <span className={item.correct ? styles.letterCorrect : styles.letterWrong} key={`${index}-${item.letter}`}>{item.letter}</span>)}
              </div> : null}
              <button className={styles.primaryButton} onClick={advance} type="button">{questionIndex + 1 === activeDeck.words.length ? "完成本套" : "下一词"}</button>
            </div>
          ) : null}
        </article>
      ) : null}
      <audio aria-hidden="true" preload="none" ref={audioRef} />
    </section>
  );
}
