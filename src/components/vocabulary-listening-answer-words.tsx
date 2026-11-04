"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSpellingCharacterFeedback } from "@/lib/vocabulary/spelling-feedback";
import { getListeningAnswerBatchRange, LISTENING_ANSWER_WORDS_PER_GROUP } from "@/lib/vocabulary/listening-answer-batches";
import type { ListeningAnswerDeck, ListeningAnswerDeckId } from "@/lib/vocabulary/listening-answer-words";
import styles from "./vocabulary-listening-answer-words.module.css";

const ANSWER_REVEAL_DELAY_MS = 5_000;

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const revealTimerRef = useRef<number | null>(null);

  const activeDeck = useMemo(() => decks.find((deck) => deck.id === activeDeckId) ?? null, [activeDeckId, decks]);
  const groupCount = activeDeck ? Math.ceil(activeDeck.words.length / LISTENING_ANSWER_WORDS_PER_GROUP) : 0;
  const batchRange = activeDeck
    ? getListeningAnswerBatchRange(activeDeck.id, activeDeck.words, groupIndex)
    : null;
  const wordsComplete = batchRange ? batchRange.endWordIndex + 1 : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!activeDeck || !audio) return;
    const source = `/api/vocabulary-answer-audio/${activeDeck.id}/group-${String(groupIndex + 1).padStart(3, "0")}`;
    if (audio.getAttribute("src") === source) return;
    audio.pause();
    setAudioReady(false);
    setAudioMessage(`第 ${groupIndex + 1} 组音频正在加载…`);
    audio.src = source;
    audio.load();
  }, [activeDeck, groupIndex]);

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
  }, [clearRevealTimer]);

  const revealAnswersAfterPlayback = useCallback(() => {
    if (revealTimerRef.current !== null || answersRevealed) return;
    audioRef.current?.pause();
    setAudioMessage("本组 10 词音频已结束，5 秒后显示词汇信息和拼写反馈。");
    clearRevealTimer();
    revealTimerRef.current = window.setTimeout(() => {
      setAnswersRevealed(true);
      setAudioMessage("");
      revealTimerRef.current = null;
    }, ANSWER_REVEAL_DELAY_MS);
  }, [answersRevealed, clearRevealTimer]);

  const handleAudioPlay = useCallback(() => {
    clearRevealTimer();
    setAudioMessage(`正在播放第 ${groupIndex + 1} 组 10 词音频…`);
  }, [clearRevealTimer, groupIndex]);

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
    audio.src = `/api/vocabulary-answer-audio/${activeDeck.id}/group-${String(nextGroupIndex + 1).padStart(3, "0")}`;
    audio.load();
    setAudioMessage(`正在加载第 ${nextGroupIndex + 1} 组 10 词音频…`);
    void audio.play().catch(() => {
      setAudioMessage("浏览器未启动自动播放，请按播放器的播放键播放本组。");
    });
  }, [activeDeck, answersRevealed, batchRange, clearRevealTimer, groupCount, groupIndex]);

  const handleAudioEnded = useCallback(() => {
    revealAnswersAfterPlayback();
  }, [revealAnswersAfterPlayback]);

  const currentGroupLabel = batchRange
    ? `${(batchRange.startWordIndex + 1).toLocaleString()}–${(batchRange.endWordIndex + 1).toLocaleString()} / ${activeDeck?.words.length.toLocaleString()}`
    : "";

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>背单词 · 写作模式</p>
          <h1>雅思听力答案词</h1>
          <p className={styles.intro}>每组 10 词。播放后完成拼写；本组音频结束 5 秒后显示词汇、音标、释义和逐字拼写反馈。</p>
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
          <p>已按每组 10 词完成 {activeDeck.words.length.toLocaleString()} 词。</p>
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
            <label className={styles.audioLabel} htmlFor="listening-answer-group-audio">第 {groupIndex + 1} 组听力音频（10 词）</label>
            <audio
              aria-label="本组 10 词音频，可播放、暂停和拖动进度"
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
                setAudioMessage("本组音频加载失败，请检查网络或项目访问状态后重试。");
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
            {!audioReady && !audioMessage ? <p className={styles.audioHint}>本组小音频正在准备…</p> : null}
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
