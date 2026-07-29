"use client";

import { useEffect, useRef, useState } from "react";
import { getStudySelectionActionPosition } from "@/lib/study-selection";

type VocabularyHint = {
  definitionCn: string;
  level?: string;
  partOfSpeech?: string;
  phonetic?: string;
  ukPhonetic?: string;
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
    if (rect.width === 0 && rect.height === 0) return null;

    return { rect, textNode, word: match[0] };
  }

  return null;
}

export function GlobalStudyInteractions() {
  const [noteDraft, setNoteDraft] = useState("");
  const [selectionMode, setSelectionMode] = useState<"actions" | "note">("actions");
  const [selectionPopover, setSelectionPopover] = useState<SelectionPopover | null>(null);
  const [wordTooltip, setWordTooltip] = useState<WordTooltip | null>(null);
  const hideSelectionTimerRef = useRef<number | null>(null);
  const hideWordTimerRef = useRef<number | null>(null);
  const hintCacheRef = useRef(new Map<string, VocabularyHint>());
  const hoverWordTimerRef = useRef<number | null>(null);
  const pendingWordRef = useRef("");
  const selectedRangeRef = useRef<Range | null>(null);

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

    function scheduleHideWord() {
      pendingWordRef.current = "";
      clearHoverTimer();
      if (hideWordTimerRef.current == null) {
        hideWordTimerRef.current = window.setTimeout(() => {
          setWordTooltip(null);
          hideWordTimerRef.current = null;
        }, 1500);
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

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      clearHoverTimer();
      clearHideWordTimer();
    };
  }, [selectionPopover, wordTooltip]);

  useEffect(() => {
    function handleMouseUp(event: MouseEvent) {
      if (hasLocalSelectionHandler(event.target)) return;
      if (isInteractiveTarget(event.target)) return;

      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!selection || selection.rangeCount === 0 || !/[A-Za-z]/.test(text)) return;

      const range = selection.getRangeAt(0).cloneRange();
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

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

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
    }, 1500);
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
            hideWordTimerRef.current = window.setTimeout(() => setWordTooltip(null), 1500);
          }}
        >
          <strong>{wordTooltip.word}</strong>
          {wordTooltip.hint.phonetic || wordTooltip.hint.ukPhonetic ? (
            <span>{wordTooltip.hint.phonetic || wordTooltip.hint.ukPhonetic}</span>
          ) : null}
          {wordTooltip.hint.partOfSpeech ? <span>{wordTooltip.hint.partOfSpeech}</span> : null}
          <small>{wordTooltip.hint.definitionCn}</small>
        </div>
      ) : null}

      {selectionPopover ? (
        <div
          className={`selection-action-popover global-selection-popover ${
            selectionMode === "note" ? "expanded" : ""
          } ${selectionPopover.placement === "above" ? "above" : ""}`}
          style={{ left: selectionPopover.left, top: selectionPopover.top }}
          onMouseEnter={clearHideSelectionTimer}
          onMouseLeave={scheduleHideSelection}
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
