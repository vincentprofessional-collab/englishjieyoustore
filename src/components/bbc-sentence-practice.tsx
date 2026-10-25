"use client";

import { getBbcWaveSegments } from "@/lib/articles/bbc-paste-markup";
import { getLikelyProperNounWords, shouldShowAudioPronunciation } from "@/lib/audio-pronunciation";
import {
  isLikelyTechnicalTerm,
  type DictationVocabularyCandidate,
  type DictationWordMetadata,
} from "@/lib/articles/dictation-targets";
import { createPortal } from "react-dom";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { AudioPlayerSettings } from "@/components/audio-player";

type BbcPracticeSentence = {
  chinese: string;
  chineseUnderlinedTerms?: string[];
  english: string;
  sentenceNo: number;
  underlinedTerms?: string[];
  englishUnderlinedRanges?: { start: number; end: number }[];
  chineseUnderlinedRanges?: { start: number; end: number }[];
};

type DictationTarget = {
  end: number;
  normalizedWord: string;
  start: number;
  token: string;
  tokenIndex: number;
};

type SentenceOrderAnswer = {
  token: string;
  tokenIndex: number;
};

type SentenceOrderDrag = SentenceOrderAnswer & {
  pointerId: number;
  input: "pointer" | "touch";
  sourceSlot: number | null;
};

type SentenceOrderDropTarget = number | "bank";

export function useBbcAnswerShortcut(enabled: boolean, onToggle: () => void) {
  const onToggleRef = useRef(onToggle);
  const shiftPressedRef = useRef(false);
  const shiftUsedWithOtherKeyRef = useRef(false);
  onToggleRef.current = onToggle;

  useEffect(() => {
    if (!enabled) {
      shiftPressedRef.current = false;
      shiftUsedWithOtherKeyRef.current = false;
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Shift") {
        shiftPressedRef.current = true;
        shiftUsedWithOtherKeyRef.current = false;
        return;
      }
      if (shiftPressedRef.current) shiftUsedWithOtherKeyRef.current = true;
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key !== "Shift") return;
      shiftPressedRef.current = false;
      if (!shiftUsedWithOtherKeyRef.current) onToggleRef.current();
    }

    function handleWindowBlur() {
      shiftPressedRef.current = false;
      shiftUsedWithOtherKeyRef.current = false;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [enabled]);
}

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

function getDictationTermWords(value: string) {
  return (value.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [])
    .map((word) => normalizeWord(word.replace(/[’]/g, "'")))
    .filter(Boolean);
}

function matchesVocabularyWord(actual: string, expected: string) {
  const normalizedActual = normalizeWord(actual.replace(/[’]/g, "'")).replace(/'/g, "");
  const normalizedExpected = normalizeWord(expected.replace(/[’]/g, "'")).replace(/'/g, "");
  if (normalizedActual === normalizedExpected) return true;

  const forms = new Set<string>();
  if (/[^aeiou]y$/.test(normalizedExpected)) {
    forms.add(`${normalizedExpected.slice(0, -1)}ies`);
    forms.add(`${normalizedExpected.slice(0, -1)}ied`);
  } else if (/(s|x|z|ch|sh)$/.test(normalizedExpected)) {
    forms.add(`${normalizedExpected}es`);
    forms.add(`${normalizedExpected}ed`);
  } else if (normalizedExpected.endsWith("e")) {
    forms.add(`${normalizedExpected}s`);
    forms.add(`${normalizedExpected}d`);
    forms.add(`${normalizedExpected.slice(0, -1)}ing`);
  } else {
    forms.add(`${normalizedExpected}s`);
    forms.add(`${normalizedExpected}ed`);
    forms.add(`${normalizedExpected}ing`);
  }
  forms.add(`${normalizedExpected}'s`);
  return forms.has(normalizedActual);
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function renderUnderlinedEnglish(
  sentence: BbcPracticeSentence,
  activeWordIndex: number | null = null,
) {
  const parts = getBbcWaveSegments(sentence.english, sentence.underlinedTerms, sentence.englishUnderlinedRanges, true);
  let wordIndex = 0;
  return parts.map(({ text: part, wave: isWaveTerm }, partIndex) => {
    const tokens = splitEnglishTokens(part).map((token, tokenIndex) => {
      const currentWordIndex = isWordToken(token) ? wordIndex : null;
      if (currentWordIndex != null) {
        wordIndex += 1;
      }

      const isActiveWord = currentWordIndex != null && currentWordIndex === activeWordIndex;
      const className = [
        isActiveWord ? "bbc-active-word" : "",
        isWaveTerm && isWordToken(token) ? "bbc-wave-term-word" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <span
          className={className || undefined}
          key={`${sentence.sentenceNo}-word-${partIndex}-${tokenIndex}`}
        >
          {token}
        </span>
      );
    });

    return isWaveTerm ? (
      <span className="bbc-wave-term" key={`${sentence.sentenceNo}-wave-${partIndex}`}>
        {tokens}
      </span>
    ) : (
      <span key={`${sentence.sentenceNo}-text-${partIndex}`}>{tokens}</span>
    );
  });
}

function renderUnderlinedChinese(sentence: BbcPracticeSentence) {
  return getBbcWaveSegments(sentence.chinese, sentence.chineseUnderlinedTerms, sentence.chineseUnderlinedRanges)
    .map((part, index) => part.wave ? <span className="bbc-wave-term" key={`${sentence.sentenceNo}-chinese-${index}`}>{part.text}</span> : part.text);
}

export function BbcSentencePractice({
  activeWordIndex = null,
  englishContent,
  isAudioPlaying = false,
  dictationTargetTokenIndexes,
  dictationVocabularyCandidates,
  dictationWordMetadata,
  dictationExcludedWords,
  showAnswers = false,
  translationContent,
  sentence,
  settings,
}: {
  activeWordIndex?: number | null;
  dictationTargetTokenIndexes?: number[];
  dictationVocabularyCandidates?: DictationVocabularyCandidate[];
  dictationWordMetadata?: Record<string, DictationWordMetadata>;
  dictationExcludedWords?: string[];
  englishContent?: ReactNode;
  isAudioPlaying?: boolean;
  showAnswers?: boolean;
  translationContent?: ReactNode;
  sentence: BbcPracticeSentence;
  settings: AudioPlayerSettings;
}) {
  const [dictationAnswers, setDictationAnswers] = useState<Record<string, string>>({});
  const [sentenceOrderAnswers, setSentenceOrderAnswers] = useState<
    Record<number, SentenceOrderAnswer>
  >({});
  const [sentenceOrderDrag, setSentenceOrderDrag] = useState<SentenceOrderDrag | null>(null);
  const [sentenceOrderHover, setSentenceOrderHover] = useState<SentenceOrderDropTarget | null>(null);
  const [sentenceOrderPointerPosition, setSentenceOrderPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const [isMobilePointerViewport, setIsMobilePointerViewport] = useState(false);
  const sentenceKey = `${sentence.sentenceNo}:${sentence.english}:${settings.dictationMode}`;
  const activeTokenIndex = activeWordIndex == null ? null : splitEnglishTokens(sentence.english)
    .flatMap((token, index) => isWordToken(token) ? [index] : [])[activeWordIndex];
  const previousSentenceKeyRef = useRef(sentenceKey);
  const sentenceOrderLineRef = useRef<HTMLParagraphElement | null>(null);
  const sentenceOrderBankRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 820px), (pointer: coarse), (any-pointer: coarse)");
    const updateMobilePointerViewport = () => setIsMobilePointerViewport(mobileQuery.matches);
    updateMobilePointerViewport();
    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", updateMobilePointerViewport);
      return () => mobileQuery.removeEventListener("change", updateMobilePointerViewport);
    }
    mobileQuery.addListener?.(updateMobilePointerViewport);
    return () => mobileQuery.removeListener?.(updateMobilePointerViewport);
  }, []);

  useEffect(() => {
    if (previousSentenceKeyRef.current === sentenceKey) {
      return;
    }

    previousSentenceKeyRef.current = sentenceKey;
    setDictationAnswers({});
    setSentenceOrderAnswers({});
    setSentenceOrderDrag(null);
    setSentenceOrderHover(null);
    setSentenceOrderPointerPosition(null);
  }, [sentenceKey]);

  useLayoutEffect(() => {
    if (!sentenceOrderDrag) {
      return;
    }
    const activeDrag = sentenceOrderDrag;

    function getDropTarget(clientX: number, clientY: number): SentenceOrderDropTarget | null {
      const elements = document.elementsFromPoint?.(clientX, clientY) ?? [document.elementFromPoint(clientX, clientY)];
      for (const element of elements) {
        const dropZone = element?.closest<HTMLElement>("[data-sentence-order-drop-target]");
        if (dropZone?.dataset.sentenceOrderDropTarget != null && sentenceOrderLineRef.current?.contains(dropZone)) {
          return Number(dropZone.dataset.sentenceOrderDropTarget);
        }
        if (element && sentenceOrderBankRef.current?.contains(element)) {
          return "bank";
        }
      }

      return null;
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) {
        return;
      }

      event.preventDefault();
      setSentenceOrderHover(getDropTarget(event.clientX, event.clientY));
      setSentenceOrderPointerPosition({ x: event.clientX, y: event.clientY });
    }

    function handlePointerUp(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) {
        return;
      }

      const target = getDropTarget(event.clientX, event.clientY);
      if (target !== null) {
        moveSentenceOrderAnswer(activeDrag, target);
      }
      setSentenceOrderDrag(null);
      setSentenceOrderHover(null);
      setSentenceOrderPointerPosition(null);
    }

    function handlePointerCancel(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) {
        return;
      }

      setSentenceOrderDrag(null);
      setSentenceOrderHover(null);
      setSentenceOrderPointerPosition(null);
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeDrag.pointerId);
      if (!touch) return;
      if (event.cancelable) event.preventDefault();
      setSentenceOrderHover(getDropTarget(touch.clientX, touch.clientY));
      setSentenceOrderPointerPosition({ x: touch.clientX, y: touch.clientY });
    }

    function handleTouchEnd(event: TouchEvent) {
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeDrag.pointerId);
      if (!touch) return;
      if (event.type !== "touchcancel") {
        const target = getDropTarget(touch.clientX, touch.clientY);
        if (target !== null) moveSentenceOrderAnswer(activeDrag, target);
      }
      setSentenceOrderDrag(null);
      setSentenceOrderHover(null);
      setSentenceOrderPointerPosition(null);
    }

    if (activeDrag.input === "touch") {
      window.addEventListener("touchmove", handleTouchMove, { capture: true, passive: false });
      window.addEventListener("touchend", handleTouchEnd, true);
      window.addEventListener("touchcancel", handleTouchEnd, true);
      return () => {
        window.removeEventListener("touchmove", handleTouchMove, true);
        window.removeEventListener("touchend", handleTouchEnd, true);
        window.removeEventListener("touchcancel", handleTouchEnd, true);
      };
    }

    window.addEventListener("pointermove", handlePointerMove, { capture: true, passive: false });
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerCancel, true);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerCancel, true);
    };
  }, [sentenceOrderDrag]);

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
    const practicePanel = currentInput.closest(
      ".bbc-transcript-panel, .practice-audio-study-panel",
    );
    return Array.from(
      (practicePanel ?? document).querySelectorAll<HTMLInputElement>(".dictation-blank-input"),
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
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.stopPropagation();
      return;
    }

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
    let characterOffset = 0;
    return splitEnglishTokens(sentence.english)
      .map((token, tokenIndex) => {
        const start = characterOffset;
        characterOffset += token.length;
        if (!isWordToken(token)) {
          return null;
        }

        return {
          end: characterOffset,
          normalizedWord: normalizeWord(token),
          start,
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

    if (dictationTargetTokenIndexes) {
      const selected = new Set(dictationTargetTokenIndexes);
      return wordTargets.filter((target) => selected.has(target.tokenIndex));
    }

    if (dictationVocabularyCandidates || dictationWordMetadata || dictationExcludedWords) {
      const targetCount = getBlankDictationTargetCount(wordTargets.length);
      const excludedWords = new Set([
        ...getLikelyProperNounWords(sentence.english),
        ...(dictationExcludedWords ?? []).map((word) => normalizeWord(word.replace(/[’]/g, "'"))),
      ]);
      const metadataFor = (word: string) => {
        const normalized = normalizeWord(word.replace(/[’]/g, "'")).toLowerCase();
        return dictationWordMetadata?.[normalized] ?? dictationWordMetadata?.[word.toLowerCase()];
      };
      const isProperOrTechnical = (word: string, metadata?: DictationWordMetadata) =>
        excludedWords.has(normalizeWord(word.replace(/[’]/g, "'"))) ||
        Boolean(metadata?.isTechnical) ||
        isLikelyTechnicalTerm(metadata?.partOfSpeech);
      const isExcludedWord = (word: string, metadata?: DictationWordMetadata) =>
        isProperOrTechnical(word, metadata) || !shouldShowAudioPronunciation(metadata?.level, word);

      const preferredGroups: Array<{ endIndex: number; startIndex: number }> = [];
      for (const candidate of dictationVocabularyCandidates ?? []) {
        const pattern = getDictationTermWords(candidate.term);
        if (
          !pattern.length ||
          !shouldShowAudioPronunciation(candidate.level, candidate.term) ||
          isLikelyTechnicalTerm(candidate.term, candidate.definition, candidate.level, candidate.partOfSpeech) ||
          pattern.some((word) => excludedWords.has(word))
        ) {
          continue;
        }

        for (let startIndex = 0; startIndex <= wordTargets.length - pattern.length; startIndex += 1) {
          let matches = true;
          for (let offset = 0; offset < pattern.length; offset += 1) {
            const target = wordTargets[startIndex + offset];
            if (!target || isProperOrTechnical(target.normalizedWord, metadataFor(target.normalizedWord)) ||
              (pattern.length === 1 && !shouldShowAudioPronunciation(metadataFor(target.normalizedWord)?.level, target.normalizedWord)) ||
              !matchesVocabularyWord(target.token, pattern[offset])) {
              matches = false;
              break;
            }
            if (offset > 0) {
              const previous = wordTargets[startIndex + offset - 1];
              if (sentence.english.slice(previous.end, target.start).trim()) {
                matches = false;
                break;
              }
            }
          }
          if (matches) {
            preferredGroups.push({ endIndex: startIndex + pattern.length, startIndex });
            break;
          }
        }
      }

      const selectedIndexes = new Set<number>();
      const uniquePreferredGroups = [...new Map(
        preferredGroups.map((group) => [`${group.startIndex}:${group.endIndex}`, group] as const),
      ).values()].sort((left, right) =>
        (right.endIndex - right.startIndex) - (left.endIndex - left.startIndex) || left.startIndex - right.startIndex,
      );
      for (const group of uniquePreferredGroups) {
        const indexes = wordTargets.slice(group.startIndex, group.endIndex).map((target) => target.tokenIndex);
        if (
          indexes.length === 0 ||
          indexes.length > targetCount - selectedIndexes.size ||
          indexes.some((index) => selectedIndexes.has(index))
        ) continue;
        indexes.forEach((index) => selectedIndexes.add(index));
        if (selectedIndexes.size >= targetCount) break;
      }

      if (selectedIndexes.size < targetCount) {
        const fallbackCandidates = wordTargets
          .filter((target) => !selectedIndexes.has(target.tokenIndex))
          .filter((target) => !isExcludedWord(target.normalizedWord, metadataFor(target.normalizedWord)))
          .sort((left, right) => right.normalizedWord.length - left.normalizedWord.length || left.tokenIndex - right.tokenIndex);
        for (const target of fallbackCandidates) {
          selectedIndexes.add(target.tokenIndex);
          if (selectedIndexes.size >= targetCount) break;
        }
      }

      return wordTargets.filter((target) => selectedIndexes.has(target.tokenIndex));
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
    const blankNumber =
      getDictationTargets().findIndex((item) => item.tokenIndex === target.tokenIndex) + 1;
    const userAnswer = dictationAnswers[answerKey] ?? "";
    const normalizedTarget = Array.from(normalizeAnswer(target.token));
    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    const shouldRevealAnswer = showAnswers && normalizedUserAnswer !== normalizeAnswer(target.token);
    const displayedAnswer = userAnswer || (shouldRevealAnswer ? target.token : "\u00a0\u00a0\u00a0\u00a0\u00a0");
    let answerCharacterIndex = 0;
    const answerCharacters = Array.from(userAnswer).map((character, index) => {
      const normalizedCharacter = normalizeAnswer(character);
      const isCorrect = normalizedCharacter.length > 0 &&
        normalizedTarget.slice(
          answerCharacterIndex,
          answerCharacterIndex + normalizedCharacter.length,
        ).join("") === normalizedCharacter;
      answerCharacterIndex += normalizedCharacter.length;

      return (
        <span
          aria-hidden="true"
          className={`dictation-answer-char ${normalizedCharacter ? (isCorrect ? "is-correct" : "is-wrong") : ""}`}
          key={`${index}-${character}`}
          style={normalizedCharacter ? {
            color: isCorrect ? "#19804e" : "#c84c4c",
            WebkitTextFillColor: isCorrect ? "#19804e" : "#c84c4c",
          } : undefined}
        >
          {character}
        </span>
      );
    });

    return (
      <span
        className={`dictation-blank-wrap ${userAnswer ? "has-answer" : ""} ${shouldRevealAnswer ? "answer-revealed" : ""} ${activeTokenIndex === target.tokenIndex ? "current-word" : ""}`}
        key={`${sentence.sentenceNo}-dictation-${target.tokenIndex}`}
      >
        <span aria-hidden="true" className="dictation-blank-measure">
          {`${displayedAnswer}${shouldRevealAnswer && userAnswer ? ` / ${target.token}` : ""}`}
        </span>
        <span aria-hidden="true" className="dictation-blank-display">
          {userAnswer ? answerCharacters : null}
          {shouldRevealAnswer ? (
            <span className="dictation-answer-correction">
              {userAnswer ? " / " : ""}{target.token}
            </span>
          ) : null}
        </span>
        <input
          aria-label={`听写第 ${blankNumber} 个空`}
          className="dictation-blank-input"
          onChange={(event) => updateDictationAnswer(target.tokenIndex, event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleDictationBlankKeyDown}
          spellCheck={false}
          size={1}
          value={userAnswer}
        />
      </span>
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

          return <span className={activeTokenIndex === tokenIndex ? "current-word" : undefined} key={`${sentence.sentenceNo}-dictation-token-${tokenIndex}`}>{token}</span>;
        })}
      </p>
    );
  }

  function getSentenceOrderWordBank() {
    const usedTokenIndexes = new Set(
      Object.values(sentenceOrderAnswers).map((answer) => answer.tokenIndex),
    );

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
    }).filter((target) => !usedTokenIndexes.has(target.tokenIndex));
  }

  function moveSentenceOrderAnswer(
    payload: SentenceOrderAnswer & { sourceSlot: number | null },
    target: SentenceOrderDropTarget,
  ) {
    setSentenceOrderAnswers((current) => {
      const next = { ...current };
      const movingAnswer = payload.sourceSlot == null ? payload : next[payload.sourceSlot];

      if (!movingAnswer?.token) {
        return current;
      }

      if (target === "bank") {
        if (payload.sourceSlot != null) {
          delete next[payload.sourceSlot];
        }
        return next;
      }

      if (payload.sourceSlot === target) {
        return current;
      }

      const replacedAnswer = next[target];
      if (payload.sourceSlot != null) {
        delete next[payload.sourceSlot];
        if (replacedAnswer) {
          next[payload.sourceSlot] = replacedAnswer;
        }
      }
      next[target] = {
        token: movingAnswer.token,
        tokenIndex: movingAnswer.tokenIndex,
      };
      return next;
    });
  }

  function startSentenceOrderPointerDrag(
    event: ReactPointerEvent<HTMLElement>,
    answer: SentenceOrderAnswer,
    sourceSlot: number | null,
  ) {
    if (typeof window.PointerEvent === "undefined") return;
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.getSelection?.()?.removeAllRanges();
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Capture is optional; window capture listeners still track this pointer.
    }
    setSentenceOrderPointerPosition({ x: event.clientX, y: event.clientY });
    setSentenceOrderDrag({
      ...answer,
      pointerId: event.pointerId,
      input: "pointer",
      sourceSlot,
    });
    setSentenceOrderHover(null);
  }

  function startSentenceOrderTouchDrag(
    event: ReactTouchEvent<HTMLElement>,
    answer: SentenceOrderAnswer,
    sourceSlot: number | null,
  ) {
    if (typeof window.PointerEvent !== "undefined") return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    window.getSelection?.()?.removeAllRanges();
    setSentenceOrderDrag({ ...answer, pointerId: touch.identifier, input: "touch", sourceSlot });
    setSentenceOrderPointerPosition({ x: touch.clientX, y: touch.clientY });
    setSentenceOrderHover(null);
  }

  function renderSentenceOrderBlank(target: DictationTarget) {
    const placedAnswer = sentenceOrderAnswers[target.tokenIndex] ?? null;
    const hasAnswer = Boolean(placedAnswer);
    const isCorrect = hasAnswer && normalizeAnswer(placedAnswer?.token ?? "") === normalizeAnswer(target.token);
    const isWrong = hasAnswer && !isCorrect;
    const shouldRevealAnswer = showAnswers && !isCorrect;

    return (
      <span
        aria-label={`语序排列 ${target.normalizedWord}`}
        className={`sentence-order-dropzone ${activeTokenIndex === target.tokenIndex ? "current-word" : ""} ${hasAnswer || shouldRevealAnswer ? "filled" : ""} ${
          sentenceOrderDrag?.sourceSlot === target.tokenIndex ? "sentence-order-dragging" : ""
        } ${sentenceOrderHover === target.tokenIndex ? "hover" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
        data-sentence-order-drop-target={target.tokenIndex}
        data-no-word-hint="true"
        onContextMenu={(event) => event.preventDefault()}
        onCopy={(event) => event.preventDefault()}
        onCut={(event) => event.preventDefault()}
        draggable={false}
        key={`${sentence.sentenceNo}-order-${target.tokenIndex}`}
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          if (placedAnswer) {
            startSentenceOrderPointerDrag(event, placedAnswer, target.tokenIndex);
          }
        }}
        onTouchStart={(event) => {
          if (placedAnswer) startSentenceOrderTouchDrag(event, placedAnswer, target.tokenIndex);
        }}
        role="button"
        tabIndex={0}
      >
        {placedAnswer?.token ?? (shouldRevealAnswer ? target.token : "")}
        {isWrong && shouldRevealAnswer ? (
          <span className="sentence-order-answer-correction"> / {target.token}</span>
        ) : null}
      </span>
    );
  }

  function renderSentenceOrderLine() {
    const tokens = splitEnglishTokens(sentence.english);
    const targetMap = new Map(
      getSentenceWordTargets().map((target) => [target.tokenIndex, target]),
    );

    return (
      <p className="subtitle-english-line dictation-line sentence-order-line" ref={sentenceOrderLineRef}>
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
      <>
        <p className="sentence-order-touch-hint">按住词块拖到上方虚线；已放入的词块可移到其他虚线，或拖回下方词汇区</p>
        <div
          className={`sentence-order-word-bank ${sentenceOrderHover === "bank" ? "hover" : ""}`}
          data-sentence-order-bank
          data-no-word-hint="true"
          aria-label="词汇区域"
          role="group"
          ref={sentenceOrderBankRef}
          onContextMenu={(event) => event.preventDefault()}
          onCopy={(event) => event.preventDefault()}
          onCut={(event) => event.preventDefault()}
        >
          {getSentenceOrderWordBank().map((target) => (
            <button
              className={`sentence-order-chip ${
                sentenceOrderDrag?.tokenIndex === target.tokenIndex ? "sentence-order-dragging" : ""
              }`}
              draggable={false}
              key={`${sentence.sentenceNo}-word-bank-${target.tokenIndex}`}
              onClick={(event) => event.stopPropagation()}
              onDragStart={(event) => event.preventDefault()}
              onPointerDown={(event) =>
                startSentenceOrderPointerDrag(event, target, null)
              }
              onTouchStart={(event) => startSentenceOrderTouchDrag(event, target, null)}
              type="button"
            >
              {target.token}
            </button>
          ))}
        </div>
        {sentenceOrderDrag && sentenceOrderPointerPosition
          ? createPortal(
              <span
                aria-hidden="true"
                className="sentence-order-drag-preview"
                onContextMenu={(event) => event.preventDefault()}
                style={{ left: sentenceOrderPointerPosition.x, top: sentenceOrderPointerPosition.y }}
              >
                {sentenceOrderDrag.token}
              </span>,
              document.body,
            )
          : null}
      </>
    );
  }

  function renderTranslation(className = "") {
    return (
      <p className={`translation ${className}`.trim()}>
        {translationContent ?? renderUnderlinedChinese(sentence)}
      </p>
    );
  }

  if (settings.speakingMode === "sight-translation") {
    if (!isAudioPlaying) {
      return renderTranslation("primary-translation bbc-sight-translation");
    }

    return (
      <>
        <p className="bbc-sentence-english">
          {englishContent ?? renderUnderlinedEnglish(sentence, activeWordIndex)}
        </p>
        {renderTranslation("primary-translation bbc-sight-translation")}
      </>
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
        <p className="bbc-sentence-english">
          {englishContent ?? renderUnderlinedEnglish(sentence, activeWordIndex)}
        </p>
      ) : null}
      {settings.subtitleMode !== "english" ? (
        <p className="translation bbc-sentence-chinese">{translationContent ?? renderUnderlinedChinese(sentence)}</p>
      ) : null}
    </>
  );
}
