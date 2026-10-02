export type DailyMode = "reading" | "listening" | "speaking" | "writing";
export type DailyOutcome = "familiar" | "vague" | "unfamiliar";

export type DailyStudyEvent = {
  at: number;
  book: string;
  category: DailyMode;
  isReview: boolean;
  outcome: DailyOutcome | null;
  wordId: string;
};

export type DailyActivityStore = {
  bookGoals: Record<string, number>;
  date: string;
  events: DailyStudyEvent[];
  history?: Record<string, DailySummary>;
};

export type DailySummary = {
  date: string;
  studiedWords: number;
  newWords: number;
  reviewedWords: number;
  dailyGoal: number;
  dailyTaskComplete: boolean;
  completedWords: number;
  sourceCount: number;
  familiar: number;
  vague: number;
  unfamiliar: number;
  modes: Record<DailyMode, number>;
  modeOutcomes: Record<DailyMode, Record<DailyOutcome, number>>;
};

export function localStudyDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function summarizeDailyStudy(
  activity: DailyActivityStore,
  progress: Record<string, { completed?: boolean }>,
  sourceCount: number,
): DailySummary {
  const words = new Set(activity.events.map((event) => event.wordId));
  const newWords = new Set(activity.events.filter((event) => !event.isReview).map((event) => event.wordId));
  const reviewedWords = new Set(activity.events.filter((event) => event.isReview).map((event) => event.wordId));
  const latestByMode = new Map<string, DailyStudyEvent>();
  for (const event of activity.events) {
    const key = `${event.wordId}:${event.category}`;
    if (!latestByMode.has(key) || latestByMode.get(key)!.at <= event.at) latestByMode.set(key, event);
  }

  const modes: DailySummary["modes"] = { reading: 0, listening: 0, speaking: 0, writing: 0 };
  const modeOutcomes: DailySummary["modeOutcomes"] = {
    reading: { familiar: 0, vague: 0, unfamiliar: 0 },
    listening: { familiar: 0, vague: 0, unfamiliar: 0 },
    speaking: { familiar: 0, vague: 0, unfamiliar: 0 },
    writing: { familiar: 0, vague: 0, unfamiliar: 0 },
  };
  const outcomes = { familiar: 0, vague: 0, unfamiliar: 0 };
  for (const event of latestByMode.values()) {
    modes[event.category] += 1;
    if (event.outcome) {
      outcomes[event.outcome] += 1;
      modeOutcomes[event.category][event.outcome] += 1;
    }
  }

  const dailyGoal = Object.values(activity.bookGoals).reduce((sum, goal) => sum + Math.max(0, goal), 0);
  const completedWords = Object.values(progress).filter((entry) => entry.completed).length;
  return {
    date: activity.date,
    studiedWords: words.size,
    newWords: newWords.size,
    reviewedWords: reviewedWords.size,
    dailyGoal,
    dailyTaskComplete: dailyGoal > 0 && newWords.size >= dailyGoal,
    completedWords,
    sourceCount,
    familiar: outcomes.familiar,
    vague: outcomes.vague,
    unfamiliar: outcomes.unfamiliar,
    modes,
    modeOutcomes,
  };
}
