"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES,
  getVocabularyLookupDisplayPreferences,
  setVocabularyLookupSectionVisible,
  subscribeToVocabularyLookupDisplayPreferences,
  VOCABULARY_LOOKUP_SECTIONS,
} from "@/lib/vocabulary/lookup-display-preferences";

export function VocabularyLookupDisplaySettings() {
  const [preferences, setPreferences] = useState(DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES);

  useEffect(() => {
    const sync = () => setPreferences(getVocabularyLookupDisplayPreferences());
    sync();
    return subscribeToVocabularyLookupDisplayPreferences(sync);
  }, []);

  return (
    <section aria-label="查单词显示设置" className="vocabulary-lookup-display-settings">
      <header className="vocabulary-lookup-settings-heading">
        <div>
          <span>查单词</span>
          <h2>内容显示</h2>
        </div>
        <p>控制词汇详情中各部分的显示状态</p>
      </header>
      <div className="vocabulary-lookup-settings-list">
        {VOCABULARY_LOOKUP_SECTIONS.map(({ key, label }) => (
          <div className="vocabulary-lookup-settings-row" key={key}>
            <strong>{label}</strong>
            <button
              aria-checked={preferences[key]}
              aria-label={`${label}${preferences[key] ? "显示" : "隐藏"}`}
              className={`vocabulary-lookup-switch ${preferences[key] ? "is-on" : ""}`}
              onClick={() => setVocabularyLookupSectionVisible(key, !preferences[key])}
              role="switch"
              type="button"
            >
              <span />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
