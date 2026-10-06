export type ReviewOutcome = "familiar" | "vague" | "unfamiliar";

export type ReviewHistory = {
  completed?: boolean;
  consecutiveFamiliar?: number;
  consecutiveFamiliarMode?: number;
  firstLearnedAt?: number | null;
  lastOutcome?: ReviewOutcome | "unscored" | null;
  lastReviewedAt: number | null;
  mistakeCount?: number;
  modeIndex: number;
  plan?: "short-term" | "long-term" | "done";
  recoveryFamiliarStreak?: number;
  recoveryRequired?: boolean;
  reviewStep?: number;
  spellingHadError?: boolean;
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const LONG_TERM_DAYS = [1, 3, 7, 15, 30];
const RETRY_MINUTES = { vague: 5, unfamiliar: 2 } as const;
const ALL_MODES = [0, 1, 2, 3] as const;
const CLASSIFIED_MODE_SEQUENCE = [1, 0, 2, 3] as const;

export function nextClassifiedModeIndex(modeIndex: number) {
  const currentIndex = CLASSIFIED_MODE_SEQUENCE.indexOf(modeIndex as (typeof CLASSIFIED_MODE_SEQUENCE)[number]);
  return CLASSIFIED_MODE_SEQUENCE[(currentIndex + 1 + CLASSIFIED_MODE_SEQUENCE.length) % CLASSIFIED_MODE_SEQUENCE.length];
}

export function selectEnabledMode(modeIndex: number, enabledModes: readonly number[] = ALL_MODES) {
  const modes = CLASSIFIED_MODE_SEQUENCE.filter((mode) => enabledModes.includes(mode));
  if (modes.length === 0) return 0;
  const currentIndex = CLASSIFIED_MODE_SEQUENCE.indexOf(modeIndex as (typeof CLASSIFIED_MODE_SEQUENCE)[number]);
  const startIndex = currentIndex < 0 ? 0 : currentIndex;
  for (let offset = 0; offset < CLASSIFIED_MODE_SEQUENCE.length; offset += 1) {
    const candidate = CLASSIFIED_MODE_SEQUENCE[(startIndex + offset) % CLASSIFIED_MODE_SEQUENCE.length];
    if (modes.includes(candidate)) return candidate;
  }
  return modes[0];
}

function classifiedModes(enabledModes: readonly number[]): number[] {
  const modes: number[] = CLASSIFIED_MODE_SEQUENCE.filter((mode) => enabledModes.includes(mode));
  return modes.length > 0 ? modes : [...CLASSIFIED_MODE_SEQUENCE];
}

function nextMode(modeIndex: number, modes: readonly number[]) {
  const currentIndex = modes.indexOf(modeIndex);
  return modes[(currentIndex + 1 + modes.length) % modes.length];
}

export function scheduleReview(
  previous: ReviewHistory,
  outcome: ReviewOutcome,
  now: number,
  hadInputError = false,
  enabledModes: readonly number[] = ALL_MODES,
  advanceToModeOnFamiliar?: number,
) {
  const modes = classifiedModes(enabledModes);
  const currentMode = modes.includes(previous.modeIndex) ? previous.modeIndex : modes[0];
  const forcedFamiliarMode = outcome === "familiar"
    && advanceToModeOnFamiliar !== undefined
    && modes.includes(advanceToModeOnFamiliar)
    ? advanceToModeOnFamiliar
    : null;
  const priorMistakes = previous.mistakeCount
    ?? (previous.spellingHadError || previous.lastOutcome === "vague" || previous.lastOutcome === "unfamiliar" ? 1 : 0);
  const isFamiliar = outcome === "familiar" && !hadInputError;
  const mistakeCount = priorMistakes + (isFamiliar ? 0 : 1);
  const firstLearnedAt = previous.firstLearnedAt ?? previous.lastReviewedAt ?? now;
  const previousStep = previous.reviewStep
    ?? (previous.completed || previous.plan === "done" ? LONG_TERM_DAYS.length : previous.plan === "long-term" ? 1 : 0);
  const reviewStep = Math.max(0, Math.min(LONG_TERM_DAYS.length, previousStep));
  const isLongTerm = reviewStep > 0 || previous.plan === "long-term" || previous.plan === "done" || previous.completed;

  if (!isFamiliar) {
    return {
      completed: false,
      consecutiveFamiliar: 0,
      consecutiveFamiliarMode: currentMode,
      firstLearnedAt,
      mistakeCount,
      modeIndex: currentMode,
      nextReviewAt: now + RETRY_MINUTES[outcome === "unfamiliar" ? "unfamiliar" : "vague"] * MINUTE,
      plan: isLongTerm ? "long-term" as const : "short-term" as const,
      recoveryFamiliarStreak: 0,
      recoveryRequired: true,
      reviewStep,
    };
  }

  const nextStep = Math.min(LONG_TERM_DAYS.length, reviewStep + 1);
  const nextReviewMode = forcedFamiliarMode ?? nextMode(currentMode, modes);
  return {
    completed: false,
    consecutiveFamiliar: 0,
    consecutiveFamiliarMode: nextReviewMode,
    firstLearnedAt,
    mistakeCount,
    modeIndex: nextReviewMode,
    nextReviewAt: now + LONG_TERM_DAYS[nextStep - 1] * DAY,
    plan: "long-term" as const,
    recoveryFamiliarStreak: 0,
    recoveryRequired: false,
    reviewStep: nextStep,
  };
}
