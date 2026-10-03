"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES,
  getVocabularyLookupDisplayPreferences,
  setVocabularyLookupSectionVisible,
  subscribeToVocabularyLookupDisplayPreferences,
  type VocabularyLookupSectionKey,
} from "@/lib/vocabulary/lookup-display-preferences";

type VocabularyLookupDisplaySectionProps = {
  children?: ReactNode;
  className?: string;
  controlsEnabled?: boolean;
  id: VocabularyLookupSectionKey;
  initialVisible?: boolean;
  title: string;
};

export function VocabularyLookupDisplaySection({
  children,
  className = "",
  controlsEnabled = false,
  id,
  initialVisible = DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES[id],
  title,
}: VocabularyLookupDisplaySectionProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(initialVisible);

  useEffect(() => {
    if (!controlsEnabled) return;
    const sync = () => {
      setVisible(getVocabularyLookupDisplayPreferences()[id]);
    };
    sync();
    const unsubscribe = subscribeToVocabularyLookupDisplayPreferences(() => {
      setVisible(getVocabularyLookupDisplayPreferences()[id]);
    });
    return () => {
      unsubscribe();
    };
  }, [controlsEnabled, id]);

  const expanded = !controlsEnabled || visible;

  function toggleVisibility() {
    const next = !expanded;
    setVisible(next);
    setVocabularyLookupSectionVisible(id, next);
    if (id === "video") router.refresh();
  }

  return (
    <section className={`word-detail-section vocabulary-lookup-section ${className}`.trim()}>
      <header className="word-detail-section-heading">
        <h2>{title}</h2>
        {controlsEnabled ? <button
          aria-expanded={expanded}
          className="vocabulary-lookup-section-toggle"
          onClick={toggleVisibility}
          type="button"
        >
          {expanded ? "隐藏⌃" : "展开⌄"}
        </button> : null}
      </header>
      {expanded ? children : null}
    </section>
  );
}
