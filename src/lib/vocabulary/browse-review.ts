type BrowseHistory = {
  browseFirstSeenAt?: number | null;
  browseLastSeenAt?: number | null;
  browseModeIndex?: number;
};

type BrowseCategory = "reading" | "listening" | "speaking" | "writing";

type BrowseProgress = {
  browseByBook?: Record<string, BrowseHistory>;
  familiarity?: "familiar" | "vague" | "unfamiliar" | null;
  lastOutcome?: "familiar" | "vague" | "unfamiliar" | "unscored" | null;
  lastCategory?: BrowseCategory;
  lastReviewedAt?: number | null;
};

export function filterBrowseReviewWords<T extends { id: string }>(
  words: readonly T[],
  progress: Record<string, BrowseProgress>,
  browseKey: string,
  view: "today" | "overall" | null,
  familiarities: readonly ("familiar" | "vague" | "unfamiliar")[],
  now: number,
  categories: readonly BrowseCategory[] = [],
) {
  if (view === null && familiarities.length === 0) return [...words];
  const today = new Date(now).toDateString();
  return words.filter((word) => {
    const entry = progress[word.id];
    if (!entry) return false;
    const reviewedAt = entry.lastReviewedAt ?? null;
    const browsedAt = entry.browseByBook?.[browseKey]?.browseLastSeenAt ?? null;
    const familiarity = entry.familiarity ?? (entry.lastOutcome === "unscored" ? null : entry.lastOutcome);
    if (familiarities.length > 0 && (!familiarity || !familiarities.includes(familiarity))) return false;
    if (categories.length > 0 && (reviewedAt === null || !categories.includes(entry.lastCategory ?? "reading"))) return false;
    if (view === "today") return (reviewedAt !== null && new Date(reviewedAt).toDateString() === today)
      || (browsedAt !== null && new Date(browsedAt).toDateString() === today);
    if (view === "overall") return reviewedAt !== null;
    return reviewedAt !== null;
  });
}

export function nextBrowseLoopId(
  todayNewIds: readonly string[],
  currentId: string | null,
  order: "sequential" | "random",
  random: () => number = Math.random,
) {
  const ids = [...new Set(todayNewIds)];
  if (ids.length === 0) return null;
  if (order === "sequential") {
    const currentIndex = currentId === null ? -1 : ids.indexOf(currentId);
    return ids[(currentIndex + 1) % ids.length];
  }
  const alternatives = ids.filter((id) => id !== currentId);
  const candidates = alternatives.length > 0 ? alternatives : ids;
  return candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))];
}

export function drawBrowseMode(
  enabledModes: readonly number[],
  remainingModes: readonly number[],
  random: () => number = Math.random,
) {
  const modes = [...new Set(enabledModes)].filter((mode) => mode >= 0 && mode <= 3);
  if (modes.length === 0) return { mode: 0, remainingModes: [] };
  const bag = remainingModes.length > 0
    ? remainingModes.filter((mode) => modes.includes(mode))
    : [...modes];
  if (remainingModes.length === 0) {
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
  }
  return { mode: bag[0] ?? modes[0], remainingModes: bag.slice(1) };
}

export function scheduleBrowseReview(
  previous: BrowseHistory,
  currentMode: number,
  now: number,
) {
  return {
    browseModeIndex: currentMode,
    browseFirstSeenAt: previous.browseFirstSeenAt ?? now,
    browseLastSeenAt: now,
  };
}
