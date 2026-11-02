"use client";

import type { ReactNode } from "react";
import { VocabularyFavoriteButton } from "@/components/vocabulary-favorite-button";
import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import { VocabularyShareButton } from "@/components/vocabulary-share-button";
import { getVocabularyComponentStyle, splitVocabularyFormation, VocabularyMorphologyWord } from "@/components/vocabulary-morphology";
import type { LocalVocabularyEntry, VocabularyFormationPart } from "@/lib/vocabulary/local-vocabulary";

type VocabularyDetailHeadingProps = {
  actions?: ReactNode;
  entry: LocalVocabularyEntry;
  formationParts?: VocabularyFormationPart[];
  titleContent?: ReactNode;
};

function formatCount(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("en-US") : "—";
}

export function VocabularyDetailHeading({ actions, entry, formationParts, titleContent }: VocabularyDetailHeadingProps) {
  const parts = formationParts?.length ? formationParts : splitVocabularyFormation(entry.formation);
  const headerActions = actions ?? (
    <>
      <VocabularyFavoriteButton entry={entry} />
      <VocabularyShareButton entry={entry} />
    </>
  );

  return (
    <div className="vocabulary-detail-heading">
      <div className="vocabulary-detail-heading-main">
        <div aria-label="词汇音标与等级" className="vocabulary-detail-heading-center">
          {titleContent ?? <>
            <div className="vocabulary-detail-heading-identity">
              <h1><VocabularyMorphologyWord parts={parts} word={entry.word} /></h1>
              <div className="vocabulary-detail-heading-meta">
                <VocabularyInlinePronunciation
                  ukAudioUrl={entry.ukAudioUrl}
                  ukPhonetic={entry.ukPhonetic || entry.phonetic}
                  usAudioUrl={entry.usAudioUrl}
                  usPhonetic={entry.usPhonetic || entry.phonetic}
                  word={entry.word}
                />
                {entry.level.split("、").filter(Boolean).map((level) => (
                  <span className="vocabulary-level-badge" key={level}>{level}</span>
                ))}
              </div>
            </div>
            <span aria-label={`总词频排名 ${formatCount(entry.frequencyRank)}，总频率 ${formatCount(entry.totalFrequency)}`} className="vocabulary-detail-heading-frequency">
              <small>总词频</small>
              <strong>{formatCount(entry.frequencyRank)}/{formatCount(entry.totalFrequency)}</strong>
            </span>
          </>}
        </div>
        <div className="vocabulary-detail-heading-actions">{headerActions}</div>
      </div>
      {parts.length ? (
        <div aria-label="词根和词缀组成" className="vocabulary-detail-morphology-summary">
          {parts.map((part, index) => (
            <span className="vocabulary-detail-morphology-item" key={`${part.label}-${index}`}>
              {index > 0 ? <span aria-hidden="true" className="vocabulary-detail-morphology-plus">+</span> : null}
              <span className="vocabulary-detail-morphology-chip" style={getVocabularyComponentStyle(index)}>{part.label}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
