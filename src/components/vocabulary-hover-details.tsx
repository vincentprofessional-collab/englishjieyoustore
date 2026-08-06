"use client";

import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import { cleanPartOfSpeech, cleanVocabularyDefinition } from "@/lib/vocabulary/display";

type VocabularyHoverHint = {
  definitionCn: string;
  partOfSpeech?: string;
  phonetic?: string;
  ukAudioUrl?: string;
  ukPhonetic?: string;
  usAudioUrl?: string;
  usPhonetic?: string;
};

type VocabularyHoverPronunciationProps = {
  hint: VocabularyHoverHint;
  word: string;
};

type VocabularyHoverDefinitionLineProps = {
  definitionCn: string;
  partOfSpeech?: string;
};

export function VocabularyHoverPronunciation({ hint, word }: VocabularyHoverPronunciationProps) {
  return (
    <div className="word-tooltip-pronunciation">
      <VocabularyInlinePronunciation
        ukAudioUrl={hint.ukAudioUrl}
        ukPhonetic={hint.ukPhonetic || hint.phonetic}
        usAudioUrl={hint.usAudioUrl}
        usPhonetic={hint.usPhonetic || hint.phonetic}
        word={word}
      />
    </div>
  );
}

export function VocabularyHoverDefinitionLine({
  definitionCn,
  partOfSpeech,
}: VocabularyHoverDefinitionLineProps) {
  const cleanedPartOfSpeech = cleanPartOfSpeech(partOfSpeech);
  const cleanedDefinition = cleanVocabularyDefinition(definitionCn);

  return (
    <p className="word-tooltip-definition-line">
      {cleanedPartOfSpeech ? (
        <span className="word-tooltip-part-of-speech">{cleanedPartOfSpeech}</span>
      ) : null}
      <span>{cleanedDefinition}</span>
    </p>
  );
}
