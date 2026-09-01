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
  definitionGroups?: Array<{
    definitions: string[];
    partOfSpeech: string;
  }>;
  partOfSpeech?: string;
};

const PART_OF_SPEECH_PREFIX =
  /^((?:interj|modal|abbr|prep|pron|conj|adj|adv|aux|det|num|art|int|vi|vt|pl|n|v)\b\.?)\s*/i;

function getDefinitionGroups(
  definitionCn: string,
  definitionGroups: VocabularyHoverDefinitionLineProps["definitionGroups"],
  partOfSpeech?: string,
) {
  if (definitionGroups?.length) {
    return definitionGroups.map((group) => ({
      definition: group.definitions.join("；"),
      partOfSpeech: cleanPartOfSpeech(group.partOfSpeech),
    }));
  }

  const parsedGroups = definitionCn
    .split(/\s*\/\s*/)
    .map((item) => {
      const match = item.match(PART_OF_SPEECH_PREFIX);
      return {
        definition: item.replace(PART_OF_SPEECH_PREFIX, "").trim(),
        partOfSpeech: cleanPartOfSpeech(match?.[1]),
      };
    })
    .filter((group) => group.definition);

  if (parsedGroups.some((group) => group.partOfSpeech)) {
    return parsedGroups;
  }

  return [{
    definition: cleanVocabularyDefinition(definitionCn),
    partOfSpeech: cleanPartOfSpeech(partOfSpeech),
  }];
}

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
  definitionGroups,
  partOfSpeech,
}: VocabularyHoverDefinitionLineProps) {
  const groups = getDefinitionGroups(definitionCn, definitionGroups, partOfSpeech);

  return (
    <div className="word-tooltip-definition-list">
      {groups.map((group, index) => (
        <p className="word-tooltip-definition-line" key={`${group.partOfSpeech}-${index}`}>
          {group.partOfSpeech ? (
            <span className="word-tooltip-part-of-speech">{group.partOfSpeech}</span>
          ) : null}
          <span>{group.definition}</span>
        </p>
      ))}
    </div>
  );
}
