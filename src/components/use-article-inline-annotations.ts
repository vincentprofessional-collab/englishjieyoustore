"use client";

import { useEffect, useState } from "react";
import type {
  ArticleInlineAnnotation,
  ArticleInlineSourceType,
} from "@/lib/article-inline-annotations";

export function useArticleInlineAnnotations(sourceType: ArticleInlineSourceType, sourceId: string) {
  const [annotations, setAnnotations] = useState<ArticleInlineAnnotation[]>([]);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ sourceId, sourceType });
    fetch(`/api/article-inline-annotations?${query.toString()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (active && Array.isArray(payload?.annotations)) {
          setAnnotations(payload.annotations as ArticleInlineAnnotation[]);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [sourceId, sourceType]);

  return annotations;
}
