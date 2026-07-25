"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { WritingVocabularyItem } from "@/lib/ielts/writing";

type FavoriteWordItem = {
  definitionCn: string;
  id: string;
  normalizedWord: string;
  partOfSpeech: string;
  phonetic: string;
  savedAt: string;
  sourceHref: string;
  sourceTitle: string;
  word: string;
};

type FavoriteAnnotationItem = {
  excerpt: string;
  href: string;
  id: string;
  savedAt: string;
  sourceTitle: string;
  title: string;
};

type WritingVocabularyTermProps = {
  children?: ReactNode;
  className?: string;
  item: WritingVocabularyItem & {
    exampleCn?: string;
    exampleEn?: string;
  };
  sourceHref: string;
  sourceKey: string;
  sourceTitle: string;
};

const FAVORITE_ANNOTATIONS_STORAGE_KEY = "ielts-platform.favoriteAnnotations";
const FAVORITE_WORDS_STORAGE_KEY = "ielts-platform.favoriteWords";
const WRITING_VOCABULARY_STORAGE_EVENT = "ielts-platform.writingVocabularyStorageChanged";

function readStorageList<T>(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T[]) : [];
  } catch {
    return [];
  }
}

function writeStorageList<T extends { savedAt: string }>(key: string, items: T[]) {
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
  window.localStorage.setItem(key, JSON.stringify(sortedItems));
  window.dispatchEvent(new Event(WRITING_VOCABULARY_STORAGE_EVENT));
}

function normalizeTerm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getTermId(sourceKey: string, term: string) {
  return `writing:${sourceKey}:term:${normalizeTerm(term).replace(/\s+/g, "-")}`;
}

export function WritingVocabularyTerm({
  children,
  className = "",
  item,
  sourceHref,
  sourceKey,
  sourceTitle,
}: WritingVocabularyTermProps) {
  const id = getTermId(sourceKey, item.term);
  const noteId = id.replace(":term:", ":note:");
  const [isFavorite, setIsFavorite] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    function refreshStorageState() {
      const favoriteWords = readStorageList<FavoriteWordItem>(FAVORITE_WORDS_STORAGE_KEY);
      const favoriteNotes = readStorageList<FavoriteAnnotationItem>(FAVORITE_ANNOTATIONS_STORAGE_KEY);
      setIsFavorite(favoriteWords.some((favorite) => favorite.id === id));
      setNoteDraft(favoriteNotes.find((favorite) => favorite.id === noteId)?.excerpt ?? "");
    }

    refreshStorageState();
    window.addEventListener(WRITING_VOCABULARY_STORAGE_EVENT, refreshStorageState);
    window.addEventListener("storage", refreshStorageState);

    return () => {
      window.removeEventListener(WRITING_VOCABULARY_STORAGE_EVENT, refreshStorageState);
      window.removeEventListener("storage", refreshStorageState);
    };
  }, [id, noteId]);

  function toggleFavorite() {
    const currentItems = readStorageList<FavoriteWordItem>(FAVORITE_WORDS_STORAGE_KEY);

    if (currentItems.some((favorite) => favorite.id === id)) {
      writeStorageList(
        FAVORITE_WORDS_STORAGE_KEY,
        currentItems.filter((favorite) => favorite.id !== id),
      );
      return;
    }

    writeStorageList(FAVORITE_WORDS_STORAGE_KEY, [
      {
        definitionCn: item.definitionCn,
        id,
        normalizedWord: normalizeTerm(item.term),
        partOfSpeech: item.partOfSpeech ?? "phrase",
        phonetic: item.phonetic ?? "",
        savedAt: new Date().toISOString(),
        sourceHref,
        sourceTitle,
        word: item.term,
      },
      ...currentItems,
    ]);
  }

  function saveNote() {
    const note = noteDraft.trim();
    const currentItems = readStorageList<FavoriteAnnotationItem>(FAVORITE_ANNOTATIONS_STORAGE_KEY);
    const remainingItems = currentItems.filter((favorite) => favorite.id !== noteId);

    if (note) {
      writeStorageList(FAVORITE_ANNOTATIONS_STORAGE_KEY, [
        {
          excerpt: note,
          href: sourceHref,
          id: noteId,
          savedAt: new Date().toISOString(),
          sourceTitle,
          title: item.term,
        },
        ...remainingItems,
      ]);
    } else {
      writeStorageList(FAVORITE_ANNOTATIONS_STORAGE_KEY, remainingItems);
    }

    setEditingNote(false);
  }

  return (
    <span className={`writing-vocabulary-term ${className}`.trim()} tabIndex={0}>
      {children ?? item.term}
      <span className="writing-vocabulary-tooltip" role="tooltip">
        <span className="writing-vocabulary-tooltip-actions">
          <button
            className={noteDraft ? "has-note" : ""}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setEditingNote((current) => !current);
            }}
          >
            NOTE
          </button>
          <button
            aria-label={isFavorite ? `Remove ${item.term} from favorites` : `Save ${item.term}`}
            aria-pressed={isFavorite}
            className={`writing-vocabulary-favorite ${isFavorite ? "active" : ""}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleFavorite();
            }}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </span>
        <strong>{item.term}</strong>
        <span>
          {[
            item.ukPhonetic ? `UK ${item.ukPhonetic}` : item.phonetic ? `UK ${item.phonetic}` : "",
            item.usPhonetic ? `US ${item.usPhonetic}` : item.phonetic ? `US ${item.phonetic}` : "",
            item.partOfSpeech,
            item.level,
          ].filter(Boolean).join(" · ")}
        </span>
        <small>{item.definitionCn}</small>
        {item.exampleEn ? <em>{item.exampleEn}</em> : null}
        {editingNote ? (
          <span className="writing-vocabulary-note-editor">
            <textarea
              aria-label={`Note for ${item.term}`}
              autoFocus
              placeholder="Add a note..."
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
            <button type="button" onClick={saveNote}>SAVE NOTE</button>
          </span>
        ) : null}
      </span>
    </span>
  );
}
