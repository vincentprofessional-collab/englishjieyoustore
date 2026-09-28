export type ReviewOutcome = "familiar" | "vague" | "unfamiliar";

export type ReviewHistory = {
  completed?: boolean;
  consecutiveFamiliar?: number;
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
const FIRST_PASS_MINUTES = [10, 30, 60, 24 * 60];
const LONG_TERM_DAYS = [3, 7, 14, 30];
const ALL_MODES = [0, 1, 2, 3] as const;

export function selectEnabledMode(modeIndex: number, enabledModes: readonly number[] = ALL_MODES) {
  const modes = ALL_MODES.filter((mode) => enabledModes.includes(mode));
  const current = Math.min(3, Math.max(0, modeIndex));
  return modes.find((mode) => mode >= current) ?? modes[0] ?? 0;
}

export function scheduleReview(
  previous: ReviewHistory,
  outcome: ReviewOutcome,
  now: number,
  hadInputError = false,
  enabledModes: readonly number[] = ALL_MODES,
) {
  const modes = ALL_MODES.filter((mode) => enabledModes.includes(mode));
  const activeModes = modes.length > 0 ? modes : [...ALL_MODES];
  const currentMode = selectEnabledMode(previous.modeIndex, activeModes);
  const priorMistakes = previous.mistakeCount
    ?? (previous.spellingHadError || previous.lastOutcome === "vague" || previous.lastOutcome === "unfamiliar" ? 1 : 0);
  const mistakeCount = priorMistakes + (outcome !== "familiar" || hadInputError ? 1 : 0);
  const consecutiveFamiliar = outcome === "familiar" && !hadInputError
    ? (previous.consecutiveFamiliar ?? 0) + 1
    : 0;
  const previousStep = previous.reviewStep
    ?? (previous.completed || previous.plan === "done" ? LONG_TERM_DAYS.length : previous.plan === "long-term" ? 1 : 0);
  let recoveryRequired = previous.recoveryRequired ?? previous.lastOutcome === "unfamiliar";
  let recoveryFamiliarStreak = recoveryRequired ? (previous.recoveryFamiliarStreak ?? 0) : 0;
  let modeIndex = currentMode;
  let reviewStep = previousStep;
  let intervalMs: number;

  if (outcome === "unfamiliar") {
    recoveryRequired = true;
    recoveryFamiliarStreak = 0;
    reviewStep = 0;
    intervalMs = MINUTE;
  } else if (outcome === "vague") {
    recoveryFamiliarStreak = 0;
    reviewStep = Math.max(0, previousStep - 1);
    intervalMs = (priorMistakes > 0 ? 3 : 5) * MINUTE;
  } else if (recoveryRequired && (hadInputError || recoveryFamiliarStreak < 2)) {
    recoveryFamiliarStreak = hadInputError ? 0 : recoveryFamiliarStreak + 1;
    intervalMs = recoveryFamiliarStreak === 2 ? 10 * MINUTE : 5 * MINUTE;
  } else {
    recoveryRequired = false;
    recoveryFamiliarStreak = 0;
    modeIndex = activeModes.find((mode) => mode > currentMode) ?? activeModes[0];
    if (previousStep > 0) {
      intervalMs = LONG_TERM_DAYS[Math.min(previousStep - 1, LONG_TERM_DAYS.length - 1)] * DAY;
      reviewStep = Math.min(LONG_TERM_DAYS.length, previousStep + 1);
    } else {
      intervalMs = FIRST_PASS_MINUTES[currentMode] * MINUTE;
      if (currentMode === activeModes[activeModes.length - 1]) reviewStep = 1;
    }
    if (mistakeCount > 0 && consecutiveFamiliar < 3) {
      intervalMs = Math.max(3 * MINUTE, Math.round(intervalMs / 2));
    }
  }

  return {
    completed: false,
    consecutiveFamiliar,
    firstLearnedAt: previous.firstLearnedAt ?? previous.lastReviewedAt ?? now,
    mistakeCount,
    modeIndex,
    nextReviewAt: now + intervalMs,
    plan: reviewStep > 0 ? "long-term" as const : "short-term" as const,
    recoveryFamiliarStreak,
    recoveryRequired,
    reviewStep,
  };
}
