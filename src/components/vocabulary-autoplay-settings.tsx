"use client";

import { useEffect, useState } from "react";
import {
  getVocabularyAutoplayAccent,
  setVocabularyAutoplayAccent,
  subscribeToVocabularyAutoplay,
} from "@/lib/vocabulary/autoplay-preference";
import type { VocabularyAccent } from "@/lib/vocabulary/pronunciation-audio";

type VocabularyAutoplaySettingsProps = {
  variant?: "dropdown" | "panel";
};

const accentLabels: Array<{ accent: VocabularyAccent; label: string }> = [
  { accent: "uk", label: "英音" },
  { accent: "us", label: "美音" },
];

export function VocabularyAutoplaySettings({ variant = "panel" }: VocabularyAutoplaySettingsProps) {
  const [selectedAccent, setSelectedAccent] = useState<VocabularyAccent | null>(null);

  useEffect(() => {
    setSelectedAccent(getVocabularyAutoplayAccent());
    return subscribeToVocabularyAutoplay(setSelectedAccent);
  }, []);

  function toggleAccent(accent: VocabularyAccent) {
    setVocabularyAutoplayAccent(selectedAccent === accent ? null : accent);
  }

  if (variant === "panel") {
    const rows: Array<{ label: string; accent?: VocabularyAccent }> = [
      { label: "自动发音" },
      { label: "英音", accent: "uk" },
      { label: "美音", accent: "us" },
    ];

    return (
      <section className="vocabulary-autoplay-settings panel" aria-label="自动发音设置">
        <header className="vocabulary-lookup-settings-heading">
          <div>
            <span>背单词</span>
            <h2>发音设置</h2>
          </div>
          <p>进入词汇详情页时自动播放</p>
        </header>
        <div className="vocabulary-autoplay-settings-list">
          {rows.map(({ accent, label }) => {
            const enabled = accent ? selectedAccent === accent : selectedAccent !== null;
            return (
              <div className="vocabulary-lookup-settings-row" key={label}>
                <strong>{label}</strong>
                <button
                  aria-checked={enabled}
                  aria-label={`${label}${enabled ? "开启" : "关闭"}`}
                  className={`vocabulary-lookup-switch ${enabled ? "is-on" : ""}`}
                  onClick={() => accent
                    ? toggleAccent(accent)
                    : setVocabularyAutoplayAccent(selectedAccent ? null : "uk")}
                  role="switch"
                  type="button"
                >
                  <span />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className={`vocabulary-autoplay-settings ${variant}`} aria-label="自动发音设置">
      <div>
        <strong>自动发音</strong>
      </div>
      <div className="vocabulary-autoplay-toggle" role="group" aria-label="选择自动发音口音">
        {accentLabels.map((item) => (
          <button
            aria-pressed={selectedAccent === item.accent}
            className={selectedAccent === item.accent ? "active" : ""}
            key={item.accent}
            onClick={() => toggleAccent(item.accent)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
