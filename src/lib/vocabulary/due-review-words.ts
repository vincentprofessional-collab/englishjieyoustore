type DueProgress = {
  lastReviewedAt: number | null;
  nextReviewAt: number | null;
  familiarity?: "familiar" | "vague" | "unfamiliar" | null;
  lastOutcome?: "familiar" | "vague" | "unfamiliar" | "unscored" | null;
  completed?: boolean;
  recoveryRequired?: boolean;
  mistakeCount?: number;
};

export function selectPendingRetryIds(ids: readonly string[], progress: Record<string, DueProgress>): string[] {
  return ids.filter((id) => {
    const entry = progress[id];
    const outcome = entry?.familiarity ?? entry?.lastOutcome;
    return entry && !entry.completed && entry.lastReviewedAt !== null && Number.isFinite(entry.lastReviewedAt)
      && (outcome === "vague" || outcome === "unfamiliar");
  }).sort((left, right) => progress[left].lastReviewedAt! - progress[right].lastReviewedAt!);
}

export function selectDueReviewWords<T extends { id: string }>(
  words: readonly T[], progress: Record<string, DueProgress>, now: number, excludedIds: readonly string[] = [],
): T[] {
  const excluded = new Set(excludedIds);
  const needsRecovery = (entry: DueProgress) => entry.recoveryRequired || ["vague", "unfamiliar"].includes(entry.familiarity ?? entry.lastOutcome ?? "");
  return words.filter(word => {
    const entry = progress[word.id];
    const outcome = entry?.familiarity ?? entry?.lastOutcome;
    return !excluded.has(word.id) && entry && !entry.completed
      && entry.lastReviewedAt !== null && Number.isFinite(entry.lastReviewedAt)
      && entry.nextReviewAt !== null && Number.isFinite(entry.nextReviewAt) && entry.nextReviewAt <= now
      && Boolean(outcome && outcome !== "unscored");
  }).sort((left, right) => {
    const a = progress[left.id], b = progress[right.id];
    return Number(needsRecovery(b)) - Number(needsRecovery(a))
      || a.nextReviewAt! - b.nextReviewAt!
      || (b.mistakeCount ?? 0) - (a.mistakeCount ?? 0)
      || a.lastReviewedAt! - b.lastReviewedAt!;
  });
}
