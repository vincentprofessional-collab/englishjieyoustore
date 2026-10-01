"use client";

import { useEffect, useState } from "react";
import type {
  ArticleInlineAnnotation,
  ArticleInlineSourceType,
} from "@/lib/article-inline-annotations";

const UPDATED_EVENT = "article-inline-annotations:updated";
const UPDATED_STORAGE_KEY = "article-inline-annotations:updated";

export function notifyArticleInlineAnnotationsUpdated(sourceType: ArticleInlineSourceType, sourceId: string) {
  if (typeof window === "undefined") return;
  const detail = { sourceId, sourceType };
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail }));
  try {
    window.localStorage.setItem(UPDATED_STORAGE_KEY, JSON.stringify({ ...detail, nonce: Date.now() }));
  } catch {
    // The same-tab event still refreshes an open article if storage is unavailable.
  }
}

export function useArticleInlineAnnotations(sourceType: ArticleInlineSourceType, sourceId: string) {
  const [annotations, setAnnotations] = useState<ArticleInlineAnnotation[]>([]);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ sourceId, sourceType });
    const refresh = () => {
      fetch(`/api/article-inline-annotations?${query.toString()}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          if (active && Array.isArray(payload?.annotations)) {
            setAnnotations(payload.annotations as ArticleInlineAnnotation[]);
          }
        })
        .catch(() => undefined);
    };
    const matchesUpdate = (detail: unknown) => {
      if (!detail || typeof detail !== "object") return false;
      const update = detail as { sourceId?: string; sourceType?: string };
      return update.sourceId === sourceId && update.sourceType === sourceType;
    };
    const handleUpdate = (event: Event) => {
      if (matchesUpdate((event as CustomEvent).detail)) refresh();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== UPDATED_STORAGE_KEY || !event.newValue) return;
      try {
        if (matchesUpdate(JSON.parse(event.newValue))) refresh();
      } catch {
        return;
      }
    };

    refresh();
    window.addEventListener(UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      window.removeEventListener(UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [sourceId, sourceType]);

  return annotations;
}
