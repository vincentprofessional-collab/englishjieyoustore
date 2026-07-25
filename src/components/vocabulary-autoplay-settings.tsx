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

  return (
    <section className={`vocabulary-autoplay-settings ${variant}`} aria-label="自动发音设置">
      <div>
        <strong>自动发音</strong>
        {variant === "panel" ? (
          <span>{selectedAccent ? `已选择${selectedAccent === "uk" ? "英音" : "美音"}` : "进入词汇详情页时自动播放"}</span>
        ) : null}
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
