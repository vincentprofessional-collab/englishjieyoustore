export type VocabularyMode = "reading" | "listening" | "speaking" | "writing";
export type VocabularyOutcome = "familiar" | "vague" | "unfamiliar";

export type VocabularyProgressFilterEntry = {
  familiarity?: VocabularyOutcome | null;
  lastCategory?: VocabularyMode;
  lastOutcome?: VocabularyOutcome | "unscored" | null;
  modeOutcomes?: Partial<Record<VocabularyMode, VocabularyOutcome>>;
};

export function filterProgressWordIds<T extends { id: string }>(
  words: readonly T[],
  progress: Record<string, VocabularyProgressFilterEntry>,
  modes: readonly VocabularyMode[],
  outcomes: readonly VocabularyOutcome[] = [],
) {
  const selectedModes = new Set(modes);
  const selectedOutcomes = new Set(outcomes);
  if (selectedModes.size === 0) return [];

  return words.filter((word) => {
    const entry = progress[word.id];
    if (!entry) return false;
    return [...selectedModes].some((mode) => {
      const outcome = entry.modeOutcomes?.[mode]
        ?? (entry.lastCategory === mode
          ? entry.familiarity ?? (entry.lastOutcome && entry.lastOutcome !== "unscored" ? entry.lastOutcome : null)
          : null);
      return Boolean(outcome && (!selectedOutcomes.size || selectedOutcomes.has(outcome)));
    });
  }).map((word) => word.id);
}
