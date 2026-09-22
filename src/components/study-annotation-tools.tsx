"use client";

import Link from "next/link";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
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
  type StudySelectionActionPosition,
} from "@/lib/study-selection";
import { cleanVocabularyDefinition } from "@/lib/vocabulary/display";
import type { LocalVocabularyHint } from "@/lib/vocabulary/local-vocabulary";

type AnnotationItem = {
  id: number;
  kind: "note" | "highlight";
  note: string;
  text: string;
};

type FavoriteAnnotationItem = {
  excerpt: string;
  href: string;
  id: string;
  savedAt: string;
  sourceTitle: string;
  title: string;
};

type FavoriteWordItem = {
  definitionCn: string;
  id: string;
  level?: string;
  partOfSpeech: string;
  phonetic: string;
  savedAt: string;
  word: string;
};

type ActiveWordTooltip = {
  hint: LocalVocabularyHint;
  left: number;
  placement: "above" | "below";
  top: number;
  width: number;
  word: string;
};

type StudyAnnotationToolsProps = {
  buttonClassName?: string;
  enableVocabularyHover?: boolean;
  sourceHref: string;
  sourceId: string;
  sourceTitle: string;
  surfaceRef: RefObject<HTMLElement | null>;
};

const FAVORITE_ANNOTATIONS_STORAGE_KEY = "ielts-platform.favoriteAnnotations";
const FAVORITE_WORDS_STORAGE_KEY = "ielts-platform.favoriteWords";
const INLINE_HIGHLIGHTS_STORAGE_PREFIX = "ielts-platform.inlineHighlights";

type InlineHighlight = { end?: number; id: string; occurrence?: number; start?: number; text: string };

function inlineHighlightsStorageKey(sourceId: string) {
  return `${INLINE_HIGHLIGHTS_STORAGE_PREFIX}:${sourceId}`;
}

function textOffsetWithin(root: HTMLElement, target: Node, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node === target) return total + offset;
    total += node.textContent?.length ?? 0;
  }
  return total;
}

function textPositionAt(root: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    if (offset <= total + length) return { node, offset: Math.max(0, offset - total) };
    total += length;
  }
  return null;
}

function textOccurrenceAt(root: HTMLElement, text: string, offset: number) {
  if (!text) return 0;
  return root.textContent?.slice(0, offset).split(text).length - 1 || 0;
}

function textRangeForOccurrence(root: HTMLElement, text: string, occurrence: number) {
  const fullText = root.textContent ?? "";
  let startOffset = -1;
  let searchFrom = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    startOffset = fullText.indexOf(text, searchFrom);
    if (startOffset < 0) return null;
    searchFrom = startOffset + text.length;
  }
  const start = textPositionAt(root, startOffset);
  const end = textPositionAt(root, startOffset + text.length);
  if (!start || !end) return null;
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
}

function wrapInlineHighlight(root: HTMLElement, item: InlineHighlight) {
  const fullText = root.textContent ?? "";
  const range = typeof item.occurrence === "number"
    ? textRangeForOccurrence(root, item.text, item.occurrence)
    : item.start !== undefined && item.end !== undefined && fullText.slice(item.start, item.end) === item.text
      ? (() => {
          const start = textPositionAt(root, item.start!);
          const end = textPositionAt(root, item.end!);
          if (!start || !end) return null;
          const legacyRange = document.createRange();
          legacyRange.setStart(start.node, start.offset);
          legacyRange.setEnd(end.node, end.offset);
          return legacyRange;
        })()
      : null;
  if (!range) return;
  if (range.collapsed) return;
  const marker = document.createElement("mark");
  marker.className = "inline-user-highlight";
  marker.dataset.highlightId = item.id;
  try {
    range.surroundContents(marker);
  } catch {
    const contents = range.extractContents();
    marker.appendChild(contents);
    range.insertNode(marker);
  }
}

function normalizeWord(value: string) {
  return value.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
}

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

  if (!textNode) {
    const element = document.elementFromPoint(clientX, clientY);
    const textNodes: Node[] = element ? [...element.childNodes] : [];

    while (textNodes.length > 0) {
      const candidateNode = textNodes.shift();
      if (!candidateNode) continue;

      if (candidateNode.nodeType !== Node.TEXT_NODE) {
        textNodes.unshift(...candidateNode.childNodes);
        continue;
      }

      const candidateText = candidateNode.textContent ?? "";
      const candidatePattern = /[A-Za-z]+(?:['’-][A-Za-z]+)?/g;
      let candidateMatch: RegExpExecArray | null;

      while ((candidateMatch = candidatePattern.exec(candidateText)) !== null) {
        const range = document.createRange();
        range.setStart(candidateNode, candidateMatch.index);
        range.setEnd(candidateNode, candidateMatch.index + candidateMatch[0].length);
        const rect = range.getBoundingClientRect();

        if (pointIsInsideRange(range, clientX, clientY)) {
          return { rect, textNode: candidateNode, word: candidateMatch[0] };
        }
      }
    }
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

    if (offset < start || offset > end) {
      continue;
    }

    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const rect = range.getBoundingClientRect();

    if (!pointIsInsideRange(range, clientX, clientY)) {
      return null;
    }

    return { rect, textNode, word: match[0] };
  }

  return null;
}

export function StudyAnnotationTools({
  buttonClassName = "annotation-toggle ielts-exam-action",
  enableVocabularyHover = false,
  sourceHref,
  sourceId,
  sourceTitle,
  surfaceRef,
}: StudyAnnotationToolsProps) {
  const [activeWordTooltip, setActiveWordTooltip] = useState<ActiveWordTooltip | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [favoriteWordIds, setFavoriteWordIds] = useState<string[]>([]);
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notePanelPosition, setNotePanelPosition] = useState({ left: 16, top: 132 });
  const [selectedText, setSelectedText] = useState("");
  const [selectionActionPosition, setSelectionActionPosition] =
    useState<StudySelectionActionPosition | null>(null);
  const hintCacheRef = useRef(new Map<string, LocalVocabularyHint | null>());
  const hoverWordTimerRef = useRef<number | null>(null);
  const hideWordTimerRef = useRef<number | null>(null);
  const notesPanelRef = useRef<HTMLElement | null>(null);
  const pendingHoverWordRef = useRef("");
  const selectedRangeRef = useRef<Range | null>(null);
  const selectionHideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    let saved: InlineHighlight[] = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(inlineHighlightsStorageKey(sourceId)) || "[]");
      saved = Array.isArray(parsed) ? parsed.filter((item): item is InlineHighlight => item && typeof item.id === "string" && typeof item.text === "string" && (typeof item.occurrence === "number" || (typeof item.start === "number" && typeof item.end === "number"))) : [];
    } catch {
      saved = [];
    }
    saved.forEach((item) => wrapInlineHighlight(surface, item));
  }, [sourceId, surfaceRef]);

  useEffect(() => {
    setFavoriteWordIds(
      readStorageList<FavoriteWordItem>(FAVORITE_WORDS_STORAGE_KEY).map((item) => item.id),
    );
    setNotePanelPosition({
      left: Math.max(16, window.innerWidth - 370),
      top: 132,
    });
  }, []);

  useEffect(() => {
    return () => clearSelectionHideTimer();
  }, []);

  useEffect(() => {
    if (!isNotesOpen) {
      return;
    }

    function handleOutsidePointer(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (
        notesPanelRef.current?.contains(target) ||
        target?.closest("[data-study-annotation-toggle], .selection-action-popover, .word-tooltip-floating")
      ) {
        return;
      }

      setIsNotesOpen(false);
    }

    document.addEventListener("mousedown", handleOutsidePointer);
    return () => document.removeEventListener("mousedown", handleOutsidePointer);
  }, [isNotesOpen]);

  useEffect(() => {
    const surface = surfaceRef.current;

    if (!surface) {
      return;
    }

    surface.setAttribute("data-local-selection-actions", "true");

    function handleSelection(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "button, input, textarea, select, [contenteditable='true'], .notes-panel, .selection-action-popover, .word-tooltip-floating",
        )
      ) {
        return;
      }

      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!selection || selection.rangeCount === 0 || !hasStudySelectionText(text)) {
        return;
      }

      const range = selection.getRangeAt(0).cloneRange();
      if (!surface?.contains(range.commonAncestorContainer)) {
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return;
      }

      selectedRangeRef.current = range;
      setSelectedText(text);
      setSelectionActionPosition(getStudySelectionActionPosition(rect));
    }

    document.addEventListener("pointerup", handleSelection);
    return () => {
      document.removeEventListener("pointerup", handleSelection);
      surface.removeAttribute("data-local-selection-actions");
    };
  }, [surfaceRef]);

  useEffect(() => {
    if (!selectedText || !selectionActionPosition) return;

    scheduleHideSelectionAction();

    return clearSelectionHideTimer;
  }, [selectedText, selectionActionPosition]);

  useEffect(() => {
    if (!enableVocabularyHover) {
      return;
    }

    const surface = surfaceRef.current;
    if (!surface) {
      return;
    }

    function clearHoverTimer() {
      if (hoverWordTimerRef.current != null) {
        window.clearTimeout(hoverWordTimerRef.current);
        hoverWordTimerRef.current = null;
      }
    }

    function clearHideTimer() {
      if (hideWordTimerRef.current != null) {
        window.clearTimeout(hideWordTimerRef.current);
        hideWordTimerRef.current = null;
      }
    }

    function scheduleHide(delay = 2200) {
      if (selectedText) {
        return;
      }

      pendingHoverWordRef.current = "";
      clearHoverTimer();
      clearHideTimer();
      hideWordTimerRef.current = window.setTimeout(() => {
        setActiveWordTooltip(null);
        hideWordTimerRef.current = null;
      }, delay);
    }

    async function showHint(word: string, rect: DOMRect) {
      const normalizedWord = normalizeWord(word);
      let hint = hintCacheRef.current.get(normalizedWord);

      if (hint === undefined) {
        try {
          const response = await fetch(`/api/vocabulary-hint?word=${encodeURIComponent(normalizedWord)}`);
          const payload = (await response.json()) as { hint?: LocalVocabularyHint | null };
          hint = response.ok ? payload.hint ?? null : null;
        } catch {
          hint = null;
        }
        hintCacheRef.current.set(normalizedWord, hint);
      }

      if (!hint) {
        setActiveWordTooltip(null);
        return;
      }

      const viewportPadding = 16;
      const tooltipWidth = Math.min(300, window.innerWidth - viewportPadding * 2);
      const estimatedTooltipHeight = 250;
      const preferredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
      const left = Math.min(
        window.innerWidth - tooltipWidth - viewportPadding,
        Math.max(viewportPadding, preferredLeft),
      );
      const shouldOpenAbove =
        rect.bottom + estimatedTooltipHeight + 12 > window.innerHeight &&
        rect.top > estimatedTooltipHeight + 12;

      setActiveWordTooltip({
        hint,
        left,
        placement: shouldOpenAbove ? "above" : "below",
        top: shouldOpenAbove ? rect.top - 10 : rect.bottom + 10,
        width: tooltipWidth,
        word: normalizedWord,
      });
    }

    function handleMouseMove(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          ".word-tooltip-floating, button, input, textarea, select, [contenteditable='true']",
        )
      ) {
        clearHideTimer();
        return;
      }

      const wordAtPoint = getEnglishWordAtPoint(event.clientX, event.clientY);
      if (!wordAtPoint || !surface?.contains(wordAtPoint.textNode)) {
        scheduleHide();
        return;
      }

      const normalizedWord = normalizeWord(wordAtPoint.word);
      clearHideTimer();

      if (activeWordTooltip?.word === normalizedWord || pendingHoverWordRef.current === normalizedWord) {
        return;
      }

      if (activeWordTooltip && activeWordTooltip.word !== normalizedWord) {
        setActiveWordTooltip(null);
      }

      pendingHoverWordRef.current = normalizedWord;
      clearHoverTimer();
      hoverWordTimerRef.current = window.setTimeout(() => {
        void showHint(wordAtPoint.word, wordAtPoint.rect);
        pendingHoverWordRef.current = "";
        hoverWordTimerRef.current = null;
      }, 1500);
    }

    function handleMouseLeave() {
      scheduleHide();
    }

    surface.addEventListener("mousemove", handleMouseMove);
    surface.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      surface.removeEventListener("mousemove", handleMouseMove);
      surface.removeEventListener("mouseleave", handleMouseLeave);
      clearHoverTimer();
      clearHideTimer();
    };
  }, [activeWordTooltip, enableVocabularyHover, selectedText, surfaceRef]);

  function clearSelectionHideTimer() {
    if (selectionHideTimerRef.current != null) {
      window.clearTimeout(selectionHideTimerRef.current);
      selectionHideTimerRef.current = null;
    }
  }

  function hideSelectionAction() {
    window.getSelection()?.removeAllRanges();
    selectedRangeRef.current = null;
    setSelectedText("");
    setSelectionActionPosition(null);
  }

  function scheduleHideSelectionAction() {
    clearSelectionHideTimer();
    selectionHideTimerRef.current = window.setTimeout(() => {
      hideSelectionAction();
      selectionHideTimerRef.current = null;
    }, STUDY_SELECTION_ACTION_TIMEOUT_MS);
  }

  function annotationFavoriteId(itemId: number) {
    return `${sourceId}:annotation:${itemId}`;
  }

  function saveFavoriteAnnotation(item: AnnotationItem) {
    if (item.kind !== "note") {
      return;
    }

    const currentItems = readStorageList<FavoriteAnnotationItem>(FAVORITE_ANNOTATIONS_STORAGE_KEY);
    const id = annotationFavoriteId(item.id);
    const note = item.note.trim();

    if (!note) {
      writeStorageList(
        FAVORITE_ANNOTATIONS_STORAGE_KEY,
        currentItems.filter((favorite) => favorite.id !== id),
      );
      return;
    }

    writeStorageList(FAVORITE_ANNOTATIONS_STORAGE_KEY, [
      {
        excerpt: note,
        href: sourceHref,
        id,
        savedAt: new Date(item.id).toISOString(),
        sourceTitle,
        title: item.text,
      },
      ...currentItems.filter((favorite) => favorite.id !== id),
    ]);
  }

  function removeAnnotation(itemId: number) {
    const id = annotationFavoriteId(itemId);
    const currentItems = readStorageList<FavoriteAnnotationItem>(FAVORITE_ANNOTATIONS_STORAGE_KEY);
    writeStorageList(
      FAVORITE_ANNOTATIONS_STORAGE_KEY,
      currentItems.filter((favorite) => favorite.id !== id),
    );
    setAnnotations((current) => current.filter((item) => item.id !== itemId));
  }

  function addAnnotation(kind: AnnotationItem["kind"]) {
    if (!selectedText) {
      return;
    }

    if (kind === "highlight") {
      const selectedRange = selectedRangeRef.current;
      if (selectedRange && !selectedRange.collapsed) {
        const surface = surfaceRef.current;
        const text = selectedRange.toString();
        const marker = document.createElement("mark");
        marker.className = "inline-user-highlight";
        const start = surface ? textOffsetWithin(surface, selectedRange.startContainer, selectedRange.startOffset) : 0;
        const item = surface ? { end: textOffsetWithin(surface, selectedRange.endContainer, selectedRange.endOffset), id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, occurrence: textOccurrenceAt(surface, text, start), start, text } : null;
        if (item) marker.dataset.highlightId = item.id;

        try {
          selectedRange.surroundContents(marker);
        } catch {
          const selectedContents = selectedRange.extractContents();
          marker.appendChild(selectedContents);
          selectedRange.insertNode(marker);
        }
        if (surface && item) {
          const highlights = readStorageList<InlineHighlight>(inlineHighlightsStorageKey(sourceId));
          try {
            window.localStorage.setItem(inlineHighlightsStorageKey(sourceId), JSON.stringify([...highlights, item]));
          } catch {
            // Highlight persistence is best-effort.
          }
        }
      }

      window.getSelection()?.removeAllRanges();
      selectedRangeRef.current = null;
      setSelectedText("");
      setSelectionActionPosition(null);
      clearSelectionHideTimer();
      return;
    }

    setAnnotations((current) => [
      { id: Date.now(), kind: "note", note: "", text: selectedText },
      ...current,
    ]);
    window.getSelection()?.removeAllRanges();
    selectedRangeRef.current = null;
    setSelectedText("");
    setSelectionActionPosition(null);
    clearSelectionHideTimer();
    setIsNotesOpen(true);
  }

  function clearAllHighlights() {
    const surface = surfaceRef.current;
    surface?.querySelectorAll("mark.inline-user-highlight").forEach((highlight) => {
      const parent = highlight.parentNode;
      if (!parent) return;
      while (highlight.firstChild) parent.insertBefore(highlight.firstChild, highlight);
      parent.removeChild(highlight);
      parent.normalize();
    });
    try {
      window.localStorage.removeItem(inlineHighlightsStorageKey(sourceId));
    } catch {
      // Highlight persistence is best-effort.
    }
  }

  function toggleFavoriteWord() {
    if (!activeWordTooltip) {
      return;
    }

    const { hint, word } = activeWordTooltip;
    const currentItems = readStorageList<FavoriteWordItem>(FAVORITE_WORDS_STORAGE_KEY);
    const exists = currentItems.some((item) => item.id === word);
    const nextItems = exists
      ? currentItems.filter((item) => item.id !== word)
      : [
          {
            definitionCn: hint.definitionCn,
            id: word,
            level: hint.level,
            partOfSpeech: hint.partOfSpeech,
            phonetic: hint.phonetic,
            savedAt: new Date().toISOString(),
            word,
          },
          ...currentItems,
        ];

    writeStorageList(FAVORITE_WORDS_STORAGE_KEY, nextItems);
    setFavoriteWordIds(nextItems.map((item) => item.id));
  }

  function beginNotesDrag(event: ReactMouseEvent<HTMLElement>) {
    if (event.button !== 0) return;
    setIsDraggingNotes(true);
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = notePanelPosition.left;
    const startTop = notePanelPosition.top;

    function handleMouseMove(moveEvent: MouseEvent) {
      setNotePanelPosition({
        left: Math.max(12, startLeft + moveEvent.clientX - startX),
        top: Math.max(88, startTop + moveEvent.clientY - startY),
      });
    }

    function handleMouseUp() {
      setIsDraggingNotes(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <>
      <button
        className={`${buttonClassName} ${isNotesOpen ? "active" : ""}`}
        data-study-annotation-toggle
        onClick={() => setIsNotesOpen((current) => !current)}
        type="button"
      >
        批注
      </button>

      {selectedText && selectionActionPosition ? (
        <div
          className={`selection-action-popover global-selection-popover ${
            selectionActionPosition.placement === "above" ? "above" : ""
          }`}
          onPointerEnter={clearSelectionHideTimer}
          onPointerLeave={scheduleHideSelectionAction}
          style={{ left: selectionActionPosition.left, top: selectionActionPosition.top }}
        >
          <span>{selectedText.slice(0, 26)}</span>
          <button type="button" onClick={() => addAnnotation("note")}>Note</button>
          <button type="button" onClick={() => addAnnotation("highlight")}>Highlight</button>
        </div>
      ) : null}

      {isNotesOpen ? (
        <aside
          className={`notes-panel draggable-notes-panel ${isDraggingNotes ? "dragging" : ""}`}
          ref={notesPanelRef}
          style={{ left: notePanelPosition.left, top: notePanelPosition.top }}
        >
          <div className="notes-panel-head" onMouseDown={beginNotesDrag}>
            <strong>Notes</strong>
            <div className="notes-panel-actions">
              <button
                className="clear-inline-highlights"
                onClick={clearAllHighlights}
                onMouseDown={(event) => event.stopPropagation()}
                type="button"
              >
                撤销全部高亮
              </button>
              <button
                onClick={() => setIsNotesOpen(false)}
                onMouseDown={(event) => event.stopPropagation()}
                type="button"
              >
                ×
              </button>
            </div>
          </div>
          {annotations.length === 0 ? (
            <div className="notes-empty">
              <strong>Your private notes will show here</strong>
              <span>Select text to highlight or create a note.</span>
            </div>
          ) : (
            <div className="notes-list">
              <button
                className="delete-all-notes"
                onClick={() => {
                  annotations.forEach((item) => removeAnnotation(item.id));
                  setAnnotations([]);
                }}
                type="button"
              >
                全部删除 note
              </button>
              {annotations.map((item) => (
                <article className={`note-card ${item.kind}`} key={item.id}>
                  <div>
                    <span>{item.kind === "note" ? "Note" : "Highlight"}</span>
                    <button type="button" onClick={() => removeAnnotation(item.id)}>Delete</button>
                  </div>
                  <strong>{item.text}</strong>
                  {item.kind === "note" ? (
                    <textarea
                      placeholder="Start typing your note"
                      value={item.note}
                      onChange={(event) => {
                        const nextItem = { ...item, note: event.target.value };
                        setAnnotations((current) =>
                          current.map((note) => (note.id === item.id ? nextItem : note)),
                        );
                        saveFavoriteAnnotation(nextItem);
                      }}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </aside>
      ) : null}

      {activeWordTooltip ? (
        <div
          className={`word-tooltip-floating study-word-tooltip ${
            activeWordTooltip.placement === "above" ? "above" : ""
          }`}
          style={{
            left: activeWordTooltip.left,
            top: activeWordTooltip.top,
            width: activeWordTooltip.width,
          }}
          onMouseEnter={() => {
            if (hideWordTimerRef.current != null) {
              window.clearTimeout(hideWordTimerRef.current);
              hideWordTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            hideWordTimerRef.current = window.setTimeout(() => setActiveWordTooltip(null), 1500);
          }}
        >
          <div className="word-tooltip-title-row">
            <Link href={`/vocabulary/${encodeURIComponent(activeWordTooltip.word)}`}>
              <strong>{activeWordTooltip.word}</strong>
            </Link>
            <div className="word-tooltip-favorite-share-actions favorite-share-actions">
              <button
                aria-label={`收藏 ${activeWordTooltip.word}`}
                className={`word-favorite-star ${
                  favoriteWordIds.includes(activeWordTooltip.word) ? "active" : ""
                }`}
                onClick={toggleFavoriteWord}
                type="button"
              >
                {favoriteWordIds.includes(activeWordTooltip.word) ? "★" : "☆"}
              </button>
              <ContentShareButton
                label={`分享 ${activeWordTooltip.word}`}
                text={`${activeWordTooltip.word}：${cleanVocabularyDefinition(activeWordTooltip.hint.definitionCn)}`}
                title={`${activeWordTooltip.word} 词汇`}
                url={`/vocabulary/${encodeURIComponent(activeWordTooltip.word)}`}
              />
            </div>
          </div>
          <VocabularyHoverPronunciation
            hint={activeWordTooltip.hint}
            word={activeWordTooltip.word}
          />
          <VocabularyHoverDefinitionLine
            definitionCn={activeWordTooltip.hint.definitionCn}
            partOfSpeech={activeWordTooltip.hint.partOfSpeech}
          />
        </div>
      ) : null}
    </>
  );
}
