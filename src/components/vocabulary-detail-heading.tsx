"use client";

import type { ReactNode } from "react";
import { VocabularyFavoriteButton } from "@/components/vocabulary-favorite-button";
import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import { VocabularyShareButton } from "@/components/vocabulary-share-button";
import { getVocabularyComponentStyle, getVisibleVocabularyFormationParts, isVocabularyFormationQualityLocked, splitVocabularyFormation, VocabularyMorphologyWord } from "@/components/vocabulary-morphology";
import type { LocalVocabularyEntry, VocabularyFormationPart } from "@/lib/vocabulary/local-vocabulary";
import { isSupplementalLearningBook } from "@/lib/vocabulary/learning";

type VocabularyDetailHeadingProps = {
  actions?: ReactNode;
  entry: LocalVocabularyEntry;
  formationParts?: VocabularyFormationPart[];
  showMorphology?: boolean;
  showLevels?: boolean;
  studyCentered?: boolean;
  titleContent?: ReactNode;
};

export function VocabularyDetailHeading({ actions, entry, formationParts, showMorphology = true, showLevels = true, studyCentered = false, titleContent }: VocabularyDetailHeadingProps) {
  const parts = getVisibleVocabularyFormationParts(formationParts?.length ? formationParts : splitVocabularyFormation(entry.formation));
  const morphologyQualityLocked = isVocabularyFormationQualityLocked(entry.word, parts);
  const visibleLevels = entry.level.split("、").filter((level) => level && !isSupplementalLearningBook(level));
  const headerActions = actions ?? (
    <>
      <VocabularyFavoriteButton entry={entry} />
      <VocabularyShareButton entry={entry} />
    </>
  );

  return (
    <div className={`vocabulary-detail-heading${studyCentered ? " vocabulary-detail-heading-study-centered" : ""}`}>
      <div className="vocabulary-detail-heading-main">
        <div aria-label={showLevels ? "词汇音标与等级" : "词汇音标"} className="vocabulary-detail-heading-center">
          {titleContent ?? <>
            <div className="vocabulary-detail-heading-identity">
              <h1><VocabularyMorphologyWord parts={morphologyQualityLocked ? [] : parts} word={entry.word} /></h1>
              <div className="vocabulary-detail-heading-meta">
                <VocabularyInlinePronunciation
                  ukAudioUrl={entry.ukAudioUrl}
                  ukPhonetic={entry.ukPhonetic || entry.phonetic}
                  usAudioUrl={entry.usAudioUrl}
                  usPhonetic={entry.usPhonetic || entry.phonetic}
                  word={entry.word}
                />
                {showLevels ? visibleLevels.map((level) => (
                  <span className="vocabulary-level-badge" key={level}>{level}</span>
                )) : null}
              </div>
            </div>
          </>}
        </div>
        <div className="vocabulary-detail-heading-actions">{headerActions}</div>
      </div>
      {showMorphology && parts.length && !morphologyQualityLocked ? (
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
