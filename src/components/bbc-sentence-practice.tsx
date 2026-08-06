"use client";

import {
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useState,
} from "react";
import type { AudioPlayerSettings } from "@/components/audio-player";

type BbcPracticeSentence = {
  chinese: string;
  chineseUnderlinedTerms?: string[];
  english: string;
  sentenceNo: number;
  underlinedTerms?: string[];
};

type DictationTarget = {
  normalizedWord: string;
  token: string;
  tokenIndex: number;
};

type SentenceOrderAnswer = {
  token: string;
  tokenIndex: number;
};

function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?\'"“”‘’()\[\]\s-]/g, "");
}

function normalizeWord(value: string) {
  return value.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
}

function splitEnglishTokens(text: string) {
  return text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)?|[^A-Za-z]+/g) ?? [text];
}

function isWordToken(token: string) {
  return /^[A-Za-z]/.test(token);
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function renderUnderlinedEnglish(sentence: BbcPracticeSentence) {
  const terms = [...(sentence.underlinedTerms ?? [])]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  if (terms.length === 0) {
    return sentence.english;
  }

  const escapedTerms = terms.map((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return `(?<![A-Za-z])${escaped}(?![A-Za-z])`;
  });
  const pattern = new RegExp(`(${escapedTerms.join("|")})`, "gi");
  const termSet = new Set(terms.map((term) => term.toLowerCase()));

  return sentence.english.split(pattern).map((part, index) =>
    termSet.has(part.toLowerCase()) ? (
      <span className="bbc-wave-term" key={`${sentence.sentenceNo}-wave-${index}`}>
        {part}
      </span>
    ) : (
      <span key={`${sentence.sentenceNo}-text-${index}`}>{part}</span>
    ),
  );
}

function renderUnderlinedChinese(sentence: BbcPracticeSentence) {
  const terms = [...(sentence.chineseUnderlinedTerms ?? [])]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  if (terms.length === 0) {
    return sentence.chinese;
  }

  const escapedTerms = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escapedTerms.join("|")})`, "g");
  const termSet = new Set(terms);

  return sentence.chinese.split(pattern).map((part, index) =>
    termSet.has(part) ? (
      <span className="bbc-wave-term" key={`${sentence.sentenceNo}-chinese-wave-${index}`}>
        {part}
      </span>
    ) : (
      <span key={`${sentence.sentenceNo}-chinese-text-${index}`}>{part}</span>
    ),
  );
}

export function BbcSentencePractice({
  sentence,
  settings,
}: {
  sentence: BbcPracticeSentence;
  settings: AudioPlayerSettings;
}) {
  const [dictationAnswers, setDictationAnswers] = useState<Record<string, string>>({});
  const [sentenceOrderAnswers, setSentenceOrderAnswers] = useState<
    Record<number, SentenceOrderAnswer>
  >({});

  function getDictationAnswerKey(tokenIndex: number) {
    return `${settings.dictationMode}:${tokenIndex}`;
  }

  function updateDictationAnswer(tokenIndex: number, value: string) {
    setDictationAnswers((current) => ({
      ...current,
      [getDictationAnswerKey(tokenIndex)]: value,
    }));
  }

  function getTranscriptDictationBlanks(currentInput: HTMLInputElement) {
    const transcriptPanel = currentInput.closest(".bbc-transcript-panel");
    return Array.from(
      (transcriptPanel ?? document).querySelectorAll<HTMLInputElement>(".dictation-blank-input"),
    );
  }

  function focusNextDictationBlank(currentInput: HTMLInputElement) {
    const inputs = getTranscriptDictationBlanks(currentInput);
    const currentIndex = inputs.indexOf(currentInput);
    const nextInput = currentIndex >= 0 ? inputs[currentIndex + 1] : null;

    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  }

  function focusPreviousDictationBlank(currentInput: HTMLInputElement) {
    const inputs = getTranscriptDictationBlanks(currentInput);
    const currentIndex = inputs.indexOf(currentInput);
    const previousInput = currentIndex > 0 ? inputs[currentIndex - 1] : null;

    if (!previousInput) {
      return;
    }

    const cursorPosition = previousInput.value.length;
    previousInput.focus();
    previousInput.setSelectionRange(cursorPosition, cursorPosition);
  }

  function handleDictationBlankKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      focusNextDictationBlank(event.currentTarget);
      return;
    }

    if (event.key === " " && event.currentTarget.value.trim()) {
      event.preventDefault();
      focusNextDictationBlank(event.currentTarget);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      event.currentTarget.value.length === 0
    ) {
      event.preventDefault();
      focusPreviousDictationBlank(event.currentTarget);
    }
  }

  function getSentenceWordTargets() {
    return splitEnglishTokens(sentence.english)
      .map((token, tokenIndex) => {
        if (!isWordToken(token)) {
          return null;
        }

        return {
          normalizedWord: normalizeWord(token),
          token,
          tokenIndex,
        };
      })
      .filter((target): target is DictationTarget => Boolean(target));
  }

  function getBlankDictationTargetCount(wordCount: number) {
    if (wordCount <= 0) {
      return 0;
    }

    return Math.max(1, Math.floor((wordCount - 1) / 5));
  }

  function getDictationTargets() {
    const wordTargets = getSentenceWordTargets();

    if (
      settings.dictationMode === "sentence-dictation" ||
      settings.dictationMode === "translation-training"
    ) {
      return wordTargets;
    }

    if (settings.dictationMode !== "blank-dictation" || wordTargets.length === 0) {
      return [];
    }

    return [...wordTargets]
      .sort((left, right) => {
        if (left.normalizedWord.length !== right.normalizedWord.length) {
          return right.normalizedWord.length - left.normalizedWord.length;
        }

        return left.tokenIndex - right.tokenIndex;
      })
      .slice(0, getBlankDictationTargetCount(wordTargets.length))
      .sort((left, right) => left.tokenIndex - right.tokenIndex);
  }

  function renderDictationBlank(target: DictationTarget) {
    const answerKey = getDictationAnswerKey(target.tokenIndex);
    const userAnswer = dictationAnswers[answerKey] ?? "";
    const hasTyped = userAnswer.trim().length > 0;
    const isCorrect = hasTyped && normalizeAnswer(userAnswer) === normalizeAnswer(target.token);
    const isWrong = hasTyped && !isCorrect;

    return (
      <input
        aria-label={`听写 ${target.normalizedWord}`}
        className={`dictation-blank-input ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
        key={`${sentence.sentenceNo}-dictation-${target.tokenIndex}`}
        onChange={(event) => updateDictationAnswer(target.tokenIndex, event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDictationBlankKeyDown}
        style={{ width: `${Math.max(62, target.token.length * 15)}px` }}
        value={userAnswer}
      />
    );
  }

  function renderDictationSentence() {
    const tokens = splitEnglishTokens(sentence.english);
    const targetMap = new Map(getDictationTargets().map((target) => [target.tokenIndex, target]));

    return (
      <p className="subtitle-english-line dictation-line">
        {tokens.map((token, tokenIndex) => {
          const target = targetMap.get(tokenIndex);

          if (target) {
            return renderDictationBlank(target);
          }

          return <span key={`${sentence.sentenceNo}-dictation-token-${tokenIndex}`}>{token}</span>;
        })}
      </p>
    );
  }

  function getSentenceOrderWordBank() {
    return [...getSentenceWordTargets()].sort((left, right) => {
      const leftHash = stableHash(
        `${sentence.sentenceNo}:${left.tokenIndex}:${left.token.toLowerCase()}`,
      );
      const rightHash = stableHash(
        `${sentence.sentenceNo}:${right.tokenIndex}:${right.token.toLowerCase()}`,
      );

      if (leftHash !== rightHash) {
        return leftHash - rightHash;
      }

      return left.tokenIndex - right.tokenIndex;
    });
  }

  function renderSentenceOrderBlank(target: DictationTarget) {
    const placedAnswer = sentenceOrderAnswers[target.tokenIndex] ?? null;
    const hasAnswer = Boolean(placedAnswer);
    const isCorrect = hasAnswer && normalizeAnswer(placedAnswer?.token ?? "") === normalizeAnswer(target.token);
    const isWrong = hasAnswer && !isCorrect;

    return (
      <span
        aria-label={`语序排列 ${target.normalizedWord}`}
        className={`sentence-order-dropzone ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
        key={`${sentence.sentenceNo}-order-${target.tokenIndex}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event: ReactDragEvent<HTMLSpanElement>) => {
          event.preventDefault();
          event.stopPropagation();

          try {
            const payload = JSON.parse(
              event.dataTransfer.getData("application/json"),
            ) as SentenceOrderAnswer;

            if (payload.token) {
              setSentenceOrderAnswers((current) => ({
                ...current,
                [target.tokenIndex]: payload,
              }));
            }
          } catch {
            const fallbackToken = event.dataTransfer.getData("text/plain");

            if (fallbackToken) {
              setSentenceOrderAnswers((current) => ({
                ...current,
                [target.tokenIndex]: { token: fallbackToken, tokenIndex: -1 },
              }));
            }
          }
        }}
        role="button"
        tabIndex={0}
      >
        {placedAnswer?.token ?? ""}
      </span>
    );
  }

  function renderSentenceOrderLine() {
    const tokens = splitEnglishTokens(sentence.english);
    const targetMap = new Map(
      getSentenceWordTargets().map((target) => [target.tokenIndex, target]),
    );

    return (
      <p className="subtitle-english-line dictation-line sentence-order-line">
        {tokens.map((token, tokenIndex) => {
          const target = targetMap.get(tokenIndex);

          if (target) {
            return renderSentenceOrderBlank(target);
          }

          return <span key={`${sentence.sentenceNo}-order-token-${tokenIndex}`}>{token}</span>;
        })}
      </p>
    );
  }

  function renderSentenceOrderWordBank() {
    return (
      <div className="sentence-order-word-bank">
        {getSentenceOrderWordBank().map((target) => (
          <button
            className="sentence-order-chip"
            draggable
            key={`${sentence.sentenceNo}-word-bank-${target.tokenIndex}`}
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              const payload: SentenceOrderAnswer = {
                token: target.token,
                tokenIndex: target.tokenIndex,
              };

              event.dataTransfer.setData("application/json", JSON.stringify(payload));
              event.dataTransfer.setData("text/plain", target.token);
            }}
            type="button"
          >
            {target.token}
          </button>
        ))}
      </div>
    );
  }

  function renderTranslation(className = "") {
    return (
      <p className={`translation ${className}`.trim()}>{renderUnderlinedChinese(sentence)}</p>
    );
  }

  if (settings.dictationMode === "sentence-order") {
    return (
      <>
        {renderSentenceOrderLine()}
        {renderSentenceOrderWordBank()}
      </>
    );
  }

  if (settings.dictationMode === "translation-training") {
    return (
      <>
        {renderTranslation("primary-translation writing-mode-translation")}
        {renderDictationSentence()}
      </>
    );
  }

  if (settings.dictationMode !== "none") {
    return (
      <>
        {renderDictationSentence()}
      </>
    );
  }

  return (
    <>
      {settings.subtitleMode !== "chinese" ? (
        <p className="bbc-sentence-english">{renderUnderlinedEnglish(sentence)}</p>
      ) : null}
      {settings.subtitleMode !== "english" ? (
        <p className="translation bbc-sentence-chinese">{renderUnderlinedChinese(sentence)}</p>
      ) : null}
    </>
  );
}
