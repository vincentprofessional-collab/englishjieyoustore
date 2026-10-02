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
const LONG_TERM_DAYS = [3, 7, 14, 30];
const ALL_MODES = [0, 1, 2, 3] as const;
const CLASSIFIED_MODE_SEQUENCE = [1, 0, 2, 3] as const;

export function nextClassifiedModeIndex(modeIndex: number) {
  const currentIndex = CLASSIFIED_MODE_SEQUENCE.indexOf(modeIndex as (typeof CLASSIFIED_MODE_SEQUENCE)[number]);
  return CLASSIFIED_MODE_SEQUENCE[(currentIndex + 1 + CLASSIFIED_MODE_SEQUENCE.length) % CLASSIFIED_MODE_SEQUENCE.length];
}

export function selectEnabledMode(modeIndex: number, enabledModes: readonly number[] = ALL_MODES) {
  const modes = ALL_MODES.filter((mode) => enabledModes.includes(mode));
  const current = Math.min(3, Math.max(0, modeIndex));
  return modes.find((mode) => mode >= current) ?? modes[0] ?? 0;
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
  const isLongTerm = previousStep > 0 || previous.plan === "long-term" || previous.plan === "done" || previous.completed;
  const recoveryRequired = forcedFamiliarMode === null && (
    previous.recoveryRequired === true
    || previous.lastOutcome === "vague"
    || previous.lastOutcome === "unfamiliar"
  );
  const recoveryFamiliarStreak = previous.recoveryFamiliarStreak ?? 0;

  if (!isLongTerm) {
    if (!isFamiliar) {
      return {
        completed: false,
        consecutiveFamiliar: 0,
        consecutiveFamiliarMode: currentMode,
        firstLearnedAt,
        mistakeCount,
        modeIndex: currentMode,
        nextReviewAt: now + MINUTE,
        plan: "short-term" as const,
        recoveryFamiliarStreak: 0,
        recoveryRequired: true,
        reviewStep: 0,
      };
    }

    const nextRecoveryStreak = recoveryRequired ? recoveryFamiliarStreak + 1 : 0;
    if (recoveryRequired && nextRecoveryStreak < 3) {
      return {
        completed: false,
        consecutiveFamiliar: 0,
        consecutiveFamiliarMode: currentMode,
        firstLearnedAt,
        mistakeCount,
        modeIndex: currentMode,
        nextReviewAt: now + MINUTE,
        plan: "short-term" as const,
        recoveryFamiliarStreak: nextRecoveryStreak,
        recoveryRequired: true,
        reviewStep: 0,
      };
    }

    const completedMode = currentMode === modes[modes.length - 1];
    const nextReviewMode = forcedFamiliarMode ?? nextMode(currentMode, modes);
    const reviewStep = completedMode ? 1 : 0;
    const intervalMs = completedMode ? LONG_TERM_DAYS[0] * DAY : MINUTE;
    return {
      completed: false,
      consecutiveFamiliar: 0,
      consecutiveFamiliarMode: completedMode ? modes[0] : nextReviewMode,
      firstLearnedAt,
      mistakeCount,
      modeIndex: completedMode ? modes[0] : nextReviewMode,
      nextReviewAt: now + intervalMs,
      plan: completedMode ? "long-term" as const : "short-term" as const,
      recoveryFamiliarStreak: 0,
      recoveryRequired: false,
      reviewStep,
    };
  }

  const reviewStep = Math.max(1, Math.min(LONG_TERM_DAYS.length, previousStep || 1));
  if (!isFamiliar) {
    return {
      completed: false,
      consecutiveFamiliar: 0,
      consecutiveFamiliarMode: currentMode,
      firstLearnedAt,
      mistakeCount,
      modeIndex: currentMode,
      nextReviewAt: now + 2 * MINUTE,
      plan: "long-term" as const,
      recoveryFamiliarStreak: 0,
      recoveryRequired: true,
      reviewStep,
    };
  }

  const nextRecoveryStreak = recoveryRequired ? recoveryFamiliarStreak + 1 : 0;
  if (recoveryRequired && nextRecoveryStreak < 3) {
    return {
      completed: false,
      consecutiveFamiliar: 0,
      consecutiveFamiliarMode: currentMode,
      firstLearnedAt,
      mistakeCount,
      modeIndex: currentMode,
      nextReviewAt: now + 2 * MINUTE,
      plan: "long-term" as const,
      recoveryFamiliarStreak: nextRecoveryStreak,
      recoveryRequired: true,
      reviewStep,
    };
  }

  const nextStep = Math.min(LONG_TERM_DAYS.length, reviewStep + 1);
  return {
    completed: false,
    consecutiveFamiliar: 0,
    consecutiveFamiliarMode: forcedFamiliarMode ?? nextMode(currentMode, modes),
    firstLearnedAt,
    mistakeCount,
    modeIndex: forcedFamiliarMode ?? nextMode(currentMode, modes),
    nextReviewAt: now + LONG_TERM_DAYS[nextStep - 1] * DAY,
    plan: "long-term" as const,
    recoveryFamiliarStreak: 0,
    recoveryRequired: false,
    reviewStep: nextStep,
  };
}
