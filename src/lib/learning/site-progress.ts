export const SITE_DAILY_PROGRESS_KEY = "ielts-platform.analytics.dailyProgress";

export type SiteStudyDay = {
  lookedUpWords: string[];
  seconds: number;
  studyItems: string[];
};

export type SiteStudyHistory = Record<string, SiteStudyDay>;

function localStudyDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function readSiteStudyHistory(storage: Pick<Storage, "getItem"> = window.localStorage): SiteStudyHistory {
  try {
    const raw = storage.getItem(SITE_DAILY_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<SiteStudyDay>>;
    return Object.fromEntries(Object.entries(parsed).map(([date, day]) => [date, {
      lookedUpWords: Array.isArray(day.lookedUpWords) ? day.lookedUpWords.filter((value): value is string => typeof value === "string") : [],
      seconds: Number.isFinite(day.seconds) ? Math.max(0, Number(day.seconds)) : 0,
      studyItems: Array.isArray(day.studyItems) ? day.studyItems.filter((value): value is string => typeof value === "string") : [],
    }]));
  } catch {
    return {};
  }
}

function writeHistory(history: SiteStudyHistory, storage: Pick<Storage, "setItem"> = window.localStorage) {
  const retained = Object.fromEntries(Object.entries(history).sort(([left], [right]) => left.localeCompare(right)).slice(-1826));
  try { storage.setItem(SITE_DAILY_PROGRESS_KEY, JSON.stringify(retained)); } catch { /* Browser storage can be disabled or full. */ }
}

function updateToday(update: (day: SiteStudyDay) => SiteStudyDay, storage: Pick<Storage, "getItem" | "setItem">, date: Date) {
  const history = readSiteStudyHistory(storage);
  const today = localStudyDate(date);
  history[today] = update(history[today] ?? { lookedUpWords: [], seconds: 0, studyItems: [] });
  writeHistory(history, storage);
}

export function recordDailyLearningSeconds(seconds: number, storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage, date = new Date()) {
  const delta = Math.max(0, Math.min(120, Math.floor(seconds)));
  if (!delta) return;
  updateToday((day) => ({ ...day, seconds: day.seconds + delta }), storage, date);
}

export function recordStudyPage(path: string, storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage, date = new Date()) {
  updateToday((day) => {
    let item: string | null = null;
    const article = path.match(/^\/articles\/([^/?#]+)/);
    const lesson = path.match(/^\/new-concept\/([^/?#]+)/);
    try {
      if (article) item = `bbc:${decodeURIComponent(article[1])}`;
      else if (lesson) item = `new-concept:${decodeURIComponent(lesson[1])}`;
    } catch {
      item = null;
    }
    return item && !day.studyItems.includes(item) ? { ...day, studyItems: [...day.studyItems, item] } : day;
  }, storage, date);
}

export function recordVocabularyLookup(query: string, storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage, date = new Date()) {
  const normalized = query.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (!normalized) return;
  updateToday((day) => day.lookedUpWords.includes(normalized)
    ? day
    : { ...day, lookedUpWords: [...day.lookedUpWords, normalized] }, storage, date);
}
