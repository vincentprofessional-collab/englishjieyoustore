"use client";

import { ContentShareButton } from "@/components/content-share-button";
import type { LocalVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";

type VocabularyShareButtonProps = {
  entry: LocalVocabularyEntry;
};

export function VocabularyShareButton({ entry }: VocabularyShareButtonProps) {
  const phonetic = entry.phonetic.replace(/^[/\[]+/, "").replace(/[/\]]+$/, "");
  const definitions = entry.definitionGroups
    .slice(0, 2)
    .map((group) => [group.partOfSpeech, group.definitions.join("；")].filter(Boolean).join(" "));
  const shareText = [
    phonetic ? `/${phonetic}/` : "",
    definitions.join("；"),
    entry.formation ? `词根词缀：${entry.formation}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <ContentShareButton
      className="vocabulary-share-button"
      label={`分享 ${entry.word}`}
      text={shareText || entry.definitionCn}
      title={`${entry.word} 词汇卡片`}
      url={`/vocabulary/${encodeURIComponent(entry.normalizedWord)}`}
    />
  );
}
