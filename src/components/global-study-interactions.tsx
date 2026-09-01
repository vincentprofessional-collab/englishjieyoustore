"use client";

import { useEffect, useRef, useState } from "react";
import { ContentShareButton } from "@/components/content-share-button";
import {
  VocabularyHoverDefinitionLine,
  VocabularyHoverPronunciation,
} from "@/components/vocabulary-hover-details";
import {
  getStudySelectionActionPosition,
  hasStudySelectionText,
  STUDY_SELECTION_ACTION_TIMEOUT_MS,
} from "@/lib/study-selection";
import { cleanPartOfSpeech, cleanVocabularyDefinition } from "@/lib/vocabulary/display";

type VocabularyHint = {
  definitionCn: string;
  definitionGroups?: Array<{
    definitions: string[];
    partOfSpeech: string;
  }>;
  level?: string;
  partOfSpeech?: string;
  phonetic?: string;
  ukAudioUrl?: string;
  ukPhonetic?: string;
  usAudioUrl?: string;
  usPhonetic?: string;
};

type WordTooltip = {
  hint: VocabularyHint;
  left: number;
  placement: "above" | "below";
  top: number;
  width: number;
  word: string;
};

type SelectionPopover = {
  left: number;
  placement: "above" | "below";
  text: string;
  top: number;
};

type SavedSelectionNote = {
  href: string;
  note: string;
  savedAt: string;
  sourceTitle: string;
  text: string;
};

const GLOBAL_SELECTION_NOTES_KEY = "ielts-platform.globalSelectionNotes";
const FAVORITE_WORDS_STORAGE_KEY = "ielts-platform.favoriteWords";

type FavoriteWordItem = {
  definitionCn: string;
  id: string;
  level?: string;
  partOfSpeech: string;
  phonetic: string;
  savedAt: string;
  ukPhonetic?: string;
  word: string;
};

function normalizeWord(value: string) {
  return value.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(
        target.closest(
          "button, input, textarea, select, [contenteditable='true'], .notes-panel, .selection-action-popover, .word-tooltip-floating",
        ),
      )
    : false;
}

function hasLocalSelectionHandler(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(target.closest("[data-local-selection-actions='true']"))
    : false;
}

function readStoredNotes() {
  try {
    const rawValue = window.localStorage.getItem(GLOBAL_SELECTION_NOTES_KEY);
    return rawValue ? (JSON.parse(rawValue) as SavedSelectionNote[]) : [];
  } catch {
    return [];
  }
}

function readFavoriteWords() {
  try {
    const rawValue = window.localStorage.getItem(FAVORITE_WORDS_STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as FavoriteWordItem[]) : [];
  } catch {
    return [];
  }
}

function writeFavoriteWords(items: FavoriteWordItem[]) {
  const sortedItems = [...items].sort(
    (left, right) => new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime(),
  );
  window.localStorage.setItem(FAVORITE_WORDS_STORAGE_KEY, JSON.stringify(sortedItems));
}

function pointIsInsideRect(rect: DOMRect, clientX: number, clientY: number) {
  const padding = 2;
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    clientX >= rect.left - padding &&
    clientX <= rect.right + padding &&
    clientY >= rect.top - padding &&
    clientY <= rect.bottom + padding
  );
}

function pointIsInsideRange(range: Range, clientX: number, clientY: number) {
  return [...range.getClientRects()].some((rect) => pointIsInsideRect(rect, clientX, clientY));
}

function getEnglishWordAtPoint(clientX: number, clientY: number) {
  const documentWithCaret = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offset: number; offsetNode: Node } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const caretPosition = documentWithCaret.caretPositionFromPoint?.(clientX, clientY);
  let textNode: Node | null = caretPosition?.offsetNode ?? null;
  let offset = caretPosition?.offset ?? 0;

  if (!textNode) {
    const range = documentWithCaret.caretRangeFromPoint?.(clientX, clientY);
    textNode = range?.startContainer ?? null;
    offset = range?.startOffset ?? 0;
  }

  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const text = textNode.textContent ?? "";
  const wordPattern = /[A-Za-z]+(?:['’-][A-Za-z]+)?/g;
  let match: RegExpExecArray | null;

  while ((match = wordPattern.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset < start || offset > end) continue;

    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const rect = range.getBoundingClientRect();
    if (!pointIsInsideRange(range, clientX, clientY)) return null;

    return { rect, textNode, word: match[0] };
  }

  return null;
}

export function GlobalStudyInteractions() {
  const [favoriteWordIds, setFavoriteWordIds] = useState<string[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [selectionMode, setSelectionMode] = useState<"actions" | "note">("actions");
  const [selectionPopover, setSelectionPopover] = useState<SelectionPopover | null>(null);
  const [wordTooltip, setWordTooltip] = useState<WordTooltip | null>(null);
  const hideSelectionTimerRef = useRef<number | null>(null);
  const hideWordTimerRef = useRef<number | null>(null);
  const hintCacheRef = useRef(new Map<string, VocabularyHint>());
  const hoverWordTimerRef = useRef<number | null>(null);
  const longPressPointRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pendingWordRef = useRef("");
  const selectedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    setFavoriteWordIds(readFavoriteWords().map((item) => item.id));
  }, []);

  useEffect(() => {
    function clearHoverTimer() {
      if (hoverWordTimerRef.current != null) {
        window.clearTimeout(hoverWordTimerRef.current);
        hoverWordTimerRef.current = null;
      }
    }

    function clearHideWordTimer() {
      if (hideWordTimerRef.current != null) {
        window.clearTimeout(hideWordTimerRef.current);
        hideWordTimerRef.current = null;
      }
    }

    function clearLongPressTimer() {
      if (longPressTimerRef.current != null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      longPressPointRef.current = null;
    }

    function scheduleHideWord() {
      pendingWordRef.current = "";
      clearHoverTimer();
      if (hideWordTimerRef.current == null) {
        hideWordTimerRef.current = window.setTimeout(() => {
          setWordTooltip(null);
          hideWordTimerRef.current = null;
        }, 1000);
      }
    }

    async function loadHint(word: string) {
      const normalizedWord = normalizeWord(word);
      const cachedHint = hintCacheRef.current.get(normalizedWord);
      if (cachedHint) return cachedHint;

      let hint: VocabularyHint | null = null;
      try {
        const response = await fetch(`/api/vocabulary-hint?word=${encodeURIComponent(normalizedWord)}`);
        const payload = (await response.json()) as { hint?: VocabularyHint | null };
        hint = response.ok ? payload.hint ?? null : null;
      } catch {
        hint = null;
      }

      const resolvedHint = hint ?? { definitionCn: "词库暂无释义，可结合上下文理解。", partOfSpeech: "" };
      hintCacheRef.current.set(normalizedWord, resolvedHint);
      return resolvedHint;
    }

    async function showHint(word: string, rect: DOMRect) {
      const normalizedWord = normalizeWord(word);
      if (!normalizedWord) return;

      const hint = await loadHint(normalizedWord);
      const viewportPadding = 16;
      const tooltipWidth = Math.min(260, window.innerWidth - viewportPadding * 2);
      const preferredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
      const left = Math.min(
        window.innerWidth - tooltipWidth - viewportPadding,
        Math.max(viewportPadding, preferredLeft),
      );
      const shouldOpenAbove = rect.bottom + 170 > window.innerHeight && rect.top > 170;

      setWordTooltip({
        hint,
        left,
        placement: shouldOpenAbove ? "above" : "below",
        top: shouldOpenAbove ? rect.top - 10 : rect.bottom + 10,
        width: tooltipWidth,
        word: normalizedWord,
      });
    }

    function handleMouseMove(event: MouseEvent) {
      if (selectionPopover || isInteractiveTarget(event.target)) {
        return;
      }

      const wordAtPoint = getEnglishWordAtPoint(event.clientX, event.clientY);
      if (
        !wordAtPoint ||
        !wordAtPoint.textNode.parentElement?.closest("main, article, section, p, li, h1, h2, h3, h4, span")
      ) {
        scheduleHideWord();
        return;
      }

      const normalizedWord = normalizeWord(wordAtPoint.word);
      if (!normalizedWord || pendingWordRef.current === normalizedWord || wordTooltip?.word === normalizedWord) {
        clearHideWordTimer();
        return;
      }

      if (wordTooltip && wordTooltip.word !== normalizedWord) {
        setWordTooltip(null);
      }

      clearHoverTimer();
      clearHideWordTimer();
      pendingWordRef.current = normalizedWord;
      hoverWordTimerRef.current = window.setTimeout(() => {
        void showHint(wordAtPoint.word, wordAtPoint.rect);
        pendingWordRef.current = "";
        hoverWordTimerRef.current = null;
      }, 1500);
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType !== "touch" || selectionPopover || isInteractiveTarget(event.target)) {
        return;
      }

      const wordAtPoint = getEnglishWordAtPoint(event.clientX, event.clientY);
      if (!wordAtPoint) {
        if (wordTooltip) scheduleHideWord();
        return;
      }

      clearHoverTimer();
      clearHideWordTimer();
      clearLongPressTimer();
      longPressTriggeredRef.current = false;
      longPressPointRef.current = { x: event.clientX, y: event.clientY };
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        void showHint(wordAtPoint.word, wordAtPoint.rect);
        longPressTimerRef.current = null;
      }, 650);
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType !== "touch" || !longPressPointRef.current) return;
      const distance = Math.hypot(
        event.clientX - longPressPointRef.current.x,
        event.clientY - longPressPointRef.current.y,
      );
      if (distance > 12) clearLongPressTimer();
    }

    function handlePointerEnd(event: PointerEvent) {
      if (event.pointerType !== "touch") return;
      clearLongPressTimer();
      if (longPressTriggeredRef.current) event.preventDefault();
    }

    function handleContextMenu(event: MouseEvent) {
      if (longPressTriggeredRef.current) event.preventDefault();
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerEnd);
    document.addEventListener("pointercancel", handlePointerEnd);
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerEnd);
      document.removeEventListener("pointercancel", handlePointerEnd);
      document.removeEventListener("contextmenu", handleContextMenu);
      clearHoverTimer();
      clearHideWordTimer();
      clearLongPressTimer();
    };
  }, [selectionPopover, wordTooltip]);

  useEffect(() => {
    function handlePointerUp(event: PointerEvent) {
      if (longPressTriggeredRef.current) {
        window.getSelection()?.removeAllRanges();
        longPressTriggeredRef.current = false;
        return;
      }

      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!selection || selection.rangeCount === 0 || !hasStudySelectionText(text)) return;

      const range = selection.getRangeAt(0).cloneRange();
      if (hasLocalSelectionHandler(event.target) || hasLocalSelectionHandler(range.commonAncestorContainer)) return;
      if (isInteractiveTarget(event.target)) return;

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      selectedRangeRef.current = range;
      setNoteDraft("");
      setSelectionMode("actions");
      setSelectionPopover({
        ...getStudySelectionActionPosition(rect),
        text,
      });
      setWordTooltip(null);
    }

    document.addEventListener("pointerup", handlePointerUp);
    return () => document.removeEventListener("pointerup", handlePointerUp);
  }, []);

  function toggleFavoriteWord() {
    if (!wordTooltip) return;

    const word = normalizeWord(wordTooltip.word);
    const currentFavorites = readFavoriteWords();
    const existingFavorite = currentFavorites.find((item) => item.id === word);

    if (existingFavorite) {
      const nextFavorites = currentFavorites.filter((item) => item.id !== word);
      writeFavoriteWords(nextFavorites);
      setFavoriteWordIds(nextFavorites.map((item) => item.id));
      return;
    }

    const nextFavorites = [
      {
        definitionCn: cleanVocabularyDefinition(wordTooltip.hint.definitionCn),
        id: word,
        level: wordTooltip.hint.level,
        partOfSpeech: cleanPartOfSpeech(wordTooltip.hint.partOfSpeech),
        phonetic: wordTooltip.hint.phonetic || wordTooltip.hint.ukPhonetic || "",
        savedAt: new Date().toISOString(),
        ukPhonetic: wordTooltip.hint.ukPhonetic,
        word,
      },
      ...currentFavorites,
    ];
    writeFavoriteWords(nextFavorites);
    setFavoriteWordIds(nextFavorites.map((item) => item.id));
  }

  function clearHideSelectionTimer() {
    if (hideSelectionTimerRef.current != null) {
      window.clearTimeout(hideSelectionTimerRef.current);
      hideSelectionTimerRef.current = null;
    }
  }

  function scheduleHideSelection() {
    clearHideSelectionTimer();
    hideSelectionTimerRef.current = window.setTimeout(() => {
      window.getSelection()?.removeAllRanges();
      selectedRangeRef.current = null;
      setSelectionPopover(null);
      setNoteDraft("");
      setSelectionMode("actions");
      hideSelectionTimerRef.current = null;
    }, STUDY_SELECTION_ACTION_TIMEOUT_MS);
  }

  useEffect(() => {
    if (!selectionPopover || selectionMode === "note") return;
    scheduleHideSelection();
    return clearHideSelectionTimer;
  }, [selectionMode, selectionPopover]);

  function highlightSelection() {
    const selectedRange = selectedRangeRef.current;
    if (selectedRange && !selectedRange.collapsed) {
      const marker = document.createElement("mark");
      marker.className = "inline-user-highlight";

      try {
        selectedRange.surroundContents(marker);
      } catch {
        const selectedContents = selectedRange.extractContents();
        marker.appendChild(selectedContents);
        selectedRange.insertNode(marker);
      }
    }

    window.getSelection()?.removeAllRanges();
    selectedRangeRef.current = null;
    setSelectionPopover(null);
  }

  function saveNote() {
    if (!selectionPopover) return;

    window.localStorage.setItem(
      GLOBAL_SELECTION_NOTES_KEY,
      JSON.stringify([
        {
          href: window.location.pathname,
          note: noteDraft.trim(),
          savedAt: new Date().toISOString(),
          sourceTitle: document.title,
          text: selectionPopover.text,
        },
        ...readStoredNotes(),
      ]),
    );
    window.getSelection()?.removeAllRanges();
    selectedRangeRef.current = null;
    setSelectionPopover(null);
    setNoteDraft("");
    setSelectionMode("actions");
  }

  return (
    <>
      <span aria-hidden="true" className="global-study-interactions-root" hidden />

      {wordTooltip ? (
        <div
          className={`word-tooltip-floating global-word-tooltip ${wordTooltip.placement === "above" ? "above" : ""}`}
          style={{ left: wordTooltip.left, top: wordTooltip.top, width: wordTooltip.width }}
          onMouseEnter={() => {
            if (hideWordTimerRef.current != null) {
              window.clearTimeout(hideWordTimerRef.current);
              hideWordTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            if (hideWordTimerRef.current != null) window.clearTimeout(hideWordTimerRef.current);
            hideWordTimerRef.current = window.setTimeout(() => {
              setWordTooltip(null);
              hideWordTimerRef.current = null;
            }, 1000);
          }}
        >
          <div className="word-tooltip-title-row">
            <strong>{wordTooltip.word}</strong>
            <div className="word-tooltip-favorite-share-actions favorite-share-actions">
              <button
                aria-label={`${favoriteWordIds.includes(wordTooltip.word) ? "取消收藏" : "收藏"} ${wordTooltip.word}`}
                aria-pressed={favoriteWordIds.includes(wordTooltip.word)}
                className={`word-favorite-star ${favoriteWordIds.includes(wordTooltip.word) ? "active" : ""}`}
                type="button"
                onClick={toggleFavoriteWord}
              >
                {favoriteWordIds.includes(wordTooltip.word) ? "★" : "☆"}
              </button>
              <ContentShareButton
                label={`分享 ${wordTooltip.word}`}
                text={`${wordTooltip.word}：${cleanVocabularyDefinition(wordTooltip.hint.definitionCn)}`}
                title={`${wordTooltip.word} 词汇`}
                url={`/vocabulary/${encodeURIComponent(wordTooltip.word)}`}
              />
            </div>
          </div>
          <VocabularyHoverPronunciation hint={wordTooltip.hint} word={wordTooltip.word} />
          <VocabularyHoverDefinitionLine
            definitionCn={wordTooltip.hint.definitionCn}
            definitionGroups={wordTooltip.hint.definitionGroups}
            partOfSpeech={wordTooltip.hint.partOfSpeech}
          />
        </div>
      ) : null}

      {selectionPopover ? (
        <div
          className={`selection-action-popover global-selection-popover ${
            selectionMode === "note" ? "expanded" : ""
          } ${selectionPopover.placement === "above" ? "above" : ""}`}
          style={{ left: selectionPopover.left, top: selectionPopover.top }}
          onPointerEnter={clearHideSelectionTimer}
          onPointerLeave={scheduleHideSelection}
        >
          {selectionMode === "actions" ? (
            <>
              <span>{selectionPopover.text.slice(0, 32)}</span>
              <button type="button" onClick={() => setSelectionMode("note")}>Note</button>
              <button type="button" onClick={highlightSelection}>Highlight</button>
            </>
          ) : (
            <label className="global-note-editor">
              <span>Note</span>
              <textarea
                autoFocus
                placeholder="Write a quick note"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
              <button type="button" onClick={saveNote}>Save</button>
            </label>
          )}
        </div>
      ) : null}
    </>
  );
}
