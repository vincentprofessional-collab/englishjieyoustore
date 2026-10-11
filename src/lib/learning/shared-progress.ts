import { readSiteStudyHistory } from "@/lib/learning/site-progress";
import { localStudyDate, summarizeDailyStudy, type DailyActivityStore, type DailyOutcome, type DailySummary, type DailyMode } from "@/lib/vocabulary/daily-summary";

export const SHARED_PROGRESS_VOCABULARY_KEY = "ielts-vocabulary-learning-v1";
export const SHARED_PROGRESS_VOCABULARY_ACTIVITY_KEY = "ielts-vocabulary-daily-activity-v1";
export const SHARED_PROGRESS_WRONG_QUESTIONS_KEY = "ielts-platform.favoriteQuestions";

type ProgressOutcome = DailyOutcome | "unscored" | null;
type ProgressEntry = {
  completed?: boolean;
  familiarity?: DailyOutcome | null;
  lastCategory?: DailyMode;
  lastOutcome?: ProgressOutcome;
  modeOutcomes?: Partial<Record<DailyMode, DailyOutcome>>;
};
type StoredProgress = { progress?: Record<string, ProgressEntry> };
type WrongQuestion = {
  category?: string;
  correctAnswer?: string;
  href?: string;
  id?: string;
  knowledgePoint?: string;
  origin?: string;
  prompt?: string;
  questionNumber?: string;
  questionType?: string;
  savedAt?: string;
  sourceTitle?: string;
  title?: string;
  userAnswer?: string;
};

export type ShareableWrongQuestion = Pick<WrongQuestion,
  "correctAnswer" | "href" | "knowledgePoint" | "origin" | "prompt" | "questionNumber" | "questionType" | "savedAt" | "sourceTitle" | "title" | "userAnswer"
>;

export type ShareableLearningProgressSnapshot = {
  capturedAt: string;
  siteHistory: ReturnType<typeof readSiteStudyHistory>;
  vocabularyHistory: Record<string, DailySummary>;
  vocabularyProgress: Record<string, ProgressEntry>;
  wrongQuestions: ShareableWrongQuestion[];
};

function parseStorageJson<T>(storage: Pick<Storage, "getItem">, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function sanitizeProgress(progress: Record<string, ProgressEntry>) {
  return Object.fromEntries(Object.values(progress).map((entry, index) => {
    const modeOutcomes = Object.fromEntries(
      Object.entries(entry.modeOutcomes ?? {}).filter(([, value]) => ["familiar", "vague", "unfamiliar"].includes(String(value))),
    ) as ProgressEntry["modeOutcomes"];
    const lastCategory = ["reading", "listening", "speaking", "writing"].includes(String(entry.lastCategory))
      ? entry.lastCategory
      : undefined;
    const familiarity = ["familiar", "vague", "unfamiliar"].includes(String(entry.familiarity)) ? entry.familiarity : null;
    const lastOutcome = entry.lastOutcome === "unscored" || ["familiar", "vague", "unfamiliar"].includes(String(entry.lastOutcome))
      ? entry.lastOutcome
      : null;
    return [String(index), { completed: Boolean(entry.completed), familiarity, lastCategory, lastOutcome, modeOutcomes }];
  }));
}

export function buildShareableLearningProgressSnapshot(
  storage: Pick<Storage, "getItem"> = window.localStorage,
  now = new Date(),
): ShareableLearningProgressSnapshot {
  const savedProgress = parseStorageJson<StoredProgress>(storage, SHARED_PROGRESS_VOCABULARY_KEY, {});
  const vocabularyProgress = sanitizeProgress(savedProgress.progress ?? {});
  const savedActivity = parseStorageJson<DailyActivityStore>(storage, SHARED_PROGRESS_VOCABULARY_ACTIVITY_KEY, {
    bookGoals: {}, date: localStudyDate(now), events: [], history: {},
  });
  const vocabularyHistory = { ...(savedActivity.history ?? {}) };
  if (savedActivity.date === localStudyDate(now) && Array.isArray(savedActivity.events) && savedActivity.events.length > 0) {
    vocabularyHistory[savedActivity.date] = summarizeDailyStudy(savedActivity, vocabularyProgress, 0);
  }
  const wrongQuestions = parseStorageJson<WrongQuestion[]>(storage, SHARED_PROGRESS_WRONG_QUESTIONS_KEY, [])
    .filter((item) => item && (item.category === "wrong" || item.id?.startsWith("reading:") || item.id?.startsWith("listening:")))
    .sort((left, right) => Date.parse(right.savedAt ?? "") - Date.parse(left.savedAt ?? ""))
    .slice(0, 200)
    .map(({ correctAnswer, href, knowledgePoint, origin, prompt, questionNumber, questionType, savedAt, sourceTitle, title, userAnswer }) => ({
      correctAnswer, href, knowledgePoint, origin, prompt, questionNumber, questionType, savedAt, sourceTitle, title, userAnswer,
    }));

  return {
    capturedAt: now.toISOString(),
    siteHistory: readSiteStudyHistory(storage),
    vocabularyHistory,
    vocabularyProgress,
    wrongQuestions,
  };
}
