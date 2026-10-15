export const ACCOUNT_PROGRESS_BUCKET = "account-learning-progress";
export const ACCOUNT_PROGRESS_EVENT = "englishjieyou:account-progress";
export const VOCABULARY_PROGRESS_KEY = "ielts-vocabulary-learning-v1";
export const STUDY_HISTORY_KEY = "ielts-platform.analytics.dailyProgress";
const fixedKeys = new Set([VOCABULARY_PROGRESS_KEY, STUDY_HISTORY_KEY, "ielts-vocabulary-daily-activity-v1", "ielts-vocabulary-group-progress-v1", "ielts-vocabulary-learning-settings-v1", "ielts-platform.favoriteQuestions"]);
export function isProgressKey(key: string) { return fixedKeys.has(key) || /^ielts-platform\.(listeningAttempt|listeningReviewAnswers)\./.test(key); }
type Data = Record<string, any>;
export type ProgressRecord = { value: any; updatedAt: number };
export type AccountSnapshot = { version: 1; entries: Record<string, ProgressRecord>; times: Record<string, { seconds: number; activitySeconds: Record<string, number> }> };
export function emptyAccountSnapshot(): AccountSnapshot { return { version: 1, entries: {}, times: {} }; }
const object = (value: any): Data => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const positive = (value: any) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
function union(left: any[] = [], right: any[] = []) { return [...new Map([...left, ...right].map(item => [typeof item === "string" ? item : JSON.stringify(item), item])).values()]; }
export function validRecordKey(key: string) { return key.startsWith("v:") && key.length <= 250 && !["__proto__", "constructor", "prototype"].includes(key.slice(2)) || /^h:\d{4}-\d{2}-\d{2}$/.test(key) || key.startsWith("k:") && isProgressKey(key.slice(2)); }
export function sanitizeAccountSnapshot(input: any): AccountSnapshot {
  const result = emptyAccountSnapshot();
  for (const [key, value] of Object.entries(object(input?.entries))) {
    const row = object(value);
    if (validRecordKey(key) && Number.isFinite(row.updatedAt) && row.updatedAt > 0 && row.updatedAt <= Date.now() + 60_000) result.entries[key] = { value: row.value ?? null, updatedAt: row.updatedAt };
  }
  for (const [date, value] of Object.entries(object(input?.times))) if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const row = object(value);
    result.times[date] = { seconds: positive(row.seconds), activitySeconds: Object.fromEntries(["articles", "vocabulary", "lookups", "practice"].map(key => [key, positive(row.activitySeconds?.[key])])) };
  }
  return result;
}
function mergeRecord(key: string, left: ProgressRecord | undefined, right: ProgressRecord): ProgressRecord {
  if (!left) return right;
  const [old, fresh] = left.updatedAt > right.updatedAt ? [right, left] : [left, right];
  if (!old.value || !fresh.value) return fresh;
  if (key.startsWith("v:")) return { updatedAt: fresh.updatedAt, value: { ...old.value, ...fresh.value, modeOutcomes: { ...old.value.modeOutcomes, ...fresh.value.modeOutcomes }, browseByBook: { ...old.value.browseByBook, ...fresh.value.browseByBook } } };
  if (key.startsWith("h:")) return { updatedAt: fresh.updatedAt, value: { ...fresh.value, lookedUpWords: union(old.value.lookedUpWords, fresh.value.lookedUpWords), studyItems: union(old.value.studyItems, fresh.value.studyItems), practiceAttempts: [...new Map([...(old.value.practiceAttempts ?? []), ...(fresh.value.practiceAttempts ?? [])].map(item => [item.id, item])).values()] } };
  if (key === "k:ielts-vocabulary-daily-activity-v1") return { updatedAt: fresh.updatedAt, value: { ...fresh.value, history: { ...old.value.history, ...fresh.value.history }, events: old.value.date === fresh.value.date ? union(old.value.events, fresh.value.events) : fresh.value.events } };
  return fresh;
}
export function mergeAccountSnapshots(snapshots: AccountSnapshot[], sameDevice = false): AccountSnapshot {
  const result = emptyAccountSnapshot();
  for (const snapshot of snapshots) {
    for (const [key, row] of Object.entries(snapshot.entries)) result.entries[key] = mergeRecord(key, result.entries[key], row);
    for (const [date, value] of Object.entries(snapshot.times)) {
      const prior = result.times[date] ?? { seconds: 0, activitySeconds: {} };
      const combine = (a: number, b: number) => sameDevice ? Math.max(a, b) : a + b;
      result.times[date] = { seconds: combine(prior.seconds, value.seconds), activitySeconds: Object.fromEntries(["articles", "vocabulary", "lookups", "practice"].map(key => [key, combine(prior.activitySeconds[key] ?? 0, value.activitySeconds[key] ?? 0)])) };
    }
  }
  return result;
}
export function readProgressValues(storage: Pick<Storage, "length" | "key" | "getItem">): Record<string, any> {
  const result: Record<string, any> = {};
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key || !isProgressKey(key)) continue;
    try { result[key] = JSON.parse(storage.getItem(key) ?? "null"); } catch { /* Ignore a corrupt local record. */ }
  }
  return result;
}
export function flattenProgressValues(values: Record<string, any>) {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === VOCABULARY_PROGRESS_KEY) {
      const { progress, ...meta } = object(value);
      result[`k:${key}`] = meta;
      for (const [word, row] of Object.entries(object(progress))) result[`v:${word}`] = row;
    } else if (key === STUDY_HISTORY_KEY) {
      for (const [date, row] of Object.entries(object(value))) { const { seconds, activitySeconds, ...rest } = object(row); result[`h:${date}`] = rest; }
    } else result[`k:${key}`] = value;
  }
  return result;
}
export function captureAccountChanges(values: Record<string, any>, baseline: Record<string, any>, own: AccountSnapshot, now = Date.now()) {
  const delta = emptyAccountSnapshot(), next = flattenProgressValues(values), before = flattenProgressValues(baseline);
  for (const key of new Set([...Object.keys(next), ...Object.keys(before)])) if (JSON.stringify(next[key]) !== JSON.stringify(before[key])) {
    const value = next[key] ?? null;
    const reviewedAt = key.startsWith("v:") && value ? Math.max(positive(value.lastReviewedAt), ...Object.values(object(value.browseByBook)).map(row => positive(object(row).browseLastSeenAt))) : 0;
    delta.entries[key] = { value, updatedAt: key.startsWith("v:") && value ? reviewedAt || 1 : now };
  }
  const oldHistory = object(baseline[STUDY_HISTORY_KEY]);
  for (const [date, value] of Object.entries(object(values[STUDY_HISTORY_KEY]))) {
    const row = object(value), prior = object(oldHistory[date]), saved = own.times[date] ?? { seconds: 0, activitySeconds: {} };
    const seconds = saved.seconds + Math.max(0, positive(row.seconds) - positive(prior.seconds));
    const activitySeconds = Object.fromEntries(["articles", "vocabulary", "lookups", "practice"].map(key => [key, (saved.activitySeconds[key] ?? 0) + Math.max(0, positive(row.activitySeconds?.[key]) - positive(prior.activitySeconds?.[key]))]));
    if (seconds !== saved.seconds || JSON.stringify(activitySeconds) !== JSON.stringify(saved.activitySeconds)) delta.times[date] = { seconds, activitySeconds };
  }
  return delta;
}
export function materializeAccountProgress(snapshot: AccountSnapshot) {
  const values: Record<string, any> = {}, progress: Data = {}, history: Data = {};
  for (const [key, row] of Object.entries(snapshot.entries)) {
    if (row.value === null) continue;
    if (key.startsWith("k:")) values[key.slice(2)] = row.value;
    else if (key.startsWith("v:")) progress[key.slice(2)] = row.value;
    else if (key.startsWith("h:")) history[key.slice(2)] = row.value;
  }
  if (Object.keys(progress).length || values[VOCABULARY_PROGRESS_KEY]) values[VOCABULARY_PROGRESS_KEY] = { ...values[VOCABULARY_PROGRESS_KEY], progress, reviewScheduleVersion: 2 };
  for (const [date, time] of Object.entries(snapshot.times)) history[date] = { lookedUpWords: [], studyItems: [], ...history[date], ...time };
  if (Object.keys(history).length) values[STUDY_HISTORY_KEY] = history;
  return values;
}
