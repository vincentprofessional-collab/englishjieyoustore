"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import { cleanPartOfSpeech, cleanVocabularyDefinition } from "@/lib/vocabulary/display";

export function VocabularyHoverPopup({
  children,
  className,
  onClose,
  style,
  ...props
}: ComponentProps<"div"> & { onClose?: () => void }) {
  const popupRef = useRef<HTMLDivElement>(null);
  const preferredCenter = style?.left;

  useLayoutEffect(() => {
    const popup = popupRef.current;
    if (!popup || typeof preferredCenter !== "number") return;

    const positionPopup = () => {
      const halfWidth = popup.getBoundingClientRect().width / 2;
      popup.style.left = `${Math.max(16 + halfWidth, Math.min(window.innerWidth - 16 - halfWidth, preferredCenter))}px`;
    };

    positionPopup();
    const observer = new ResizeObserver(positionPopup);
    observer.observe(popup);
    window.addEventListener("resize", positionPopup);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", positionPopup);
    };
  }, [preferredCenter]);

  return (
    <div {...props} className={`${className ?? ""}${onClose ? " word-tooltip-has-close" : ""}`.trim()} ref={popupRef} style={style}>
      {children}
    </div>
  );
}

export function VocabularyHoverCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      aria-label="关闭单词简明释义"
      className="word-tooltip-close"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      type="button"
    >
      ×
    </button>
  );
}

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
