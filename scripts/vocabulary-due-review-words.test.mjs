import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { selectPendingRetryIds, selectDueReviewWords } from "../src/lib/vocabulary/due-review-words.ts";
import { calendarReviewAt, getReviewDueAt, scheduleReview } from "../src/lib/vocabulary/review-scheduler.ts";
import { selectVocabularyStudyGroup, sortVocabularyByScene, vocabularyStudyGroupCount, vocabularyStudyGroupIndex, VOCABULARY_GROUP_SIZE, VOCABULARY_GROUP_REVIEW_LIMIT } from "../src/lib/vocabulary/study-groups.ts";

const day = 86400000;
const row = (outcome, nextReviewAt, extra = {}) => ({ familiarity: outcome, lastOutcome: outcome, lastReviewedAt: day, nextReviewAt, ...extra });
test("next-day/new-word sessions include due familiar words as well as unresolved vague/unfamiliar words", () => {
  const words = ["familiar", "vague", "unfamiliar", "later", "new", "browse", "outside"].map(id => ({ id }));
  const progress = {
    familiar: row("familiar", 2 * day), vague: row("vague", day + 300000), unfamiliar: row("unfamiliar", day + 120000),
    later: row("familiar", 3 * day), new: row(null, null, { lastReviewedAt: null }), browse: row("unscored", null),
    outside: row("familiar", day),
  };
  const selected = selectDueReviewWords(words.filter(word => word.id !== "outside"), progress, 2 * day);
  assert.deepEqual(selected.map(word => word.id), ["unfamiliar", "vague", "familiar"]);
});
test("missed reviews stay due, recovery comes first, ties prefer repeated errors", () => {
  const words = ["mature", "error1", "error3", "recovery"].map(id => ({ id }));
  const progress = { mature: row("familiar", day), error1: row("vague", 2 * day, { mistakeCount: 1 }), error3: row("vague", 2 * day, { mistakeCount: 3 }), recovery: row("familiar", day, { recoveryRequired: true }) };
  assert.deepEqual(selectDueReviewWords(words, progress, 5 * day).map(word => word.id), ["recovery", "error3", "error1", "mature"]);
});
test("an earlier item may retry after its due time; exclude only the current/queued items", () => {
  const words = [{ id: "earlier" }, { id: "current" }, { id: "queued" }];
  const progress = Object.fromEntries(words.map(word => [word.id, row("unfamiliar", day + 120000)]));
  assert.deepEqual(selectDueReviewWords(words, progress, day + 119999), []);
  assert.deepEqual(selectDueReviewWords(words, progress, day + 120000, ["current", "queued"]).map(word => word.id), ["earlier"]);
});

test("restored account/local progress exposes yesterday's familiar word at midnight without changing history or minute retries", () => {
  const source = readFileSync(new URL("../src/components/vocabulary-learning.tsx", import.meta.url), "utf8");
  const body = source.slice(source.indexOf("function restoreProgress("), source.indexOf("function familiarityForProgress("));
  const restore = new Function("calendarReviewAt", "getReviewDueAt", stripTypeScriptTypes(body) + ";return restoreProgress;")(calendarReviewAt, getReviewDueAt);
  const at = value => Date.parse(value);
  const midnight = at("2026-10-29T00:00:00+08:00");
  const saved = {
    familiar: row("familiar", at("2026-10-29T22:00:00+08:00"), { lastReviewedAt: at("2026-10-28T22:00:00+08:00"), firstLearnedAt: at("2026-10-20T22:00:00+08:00"), plan: "long-term", reviewStep: 1, mistakeCount: 3 }),
    vague: row("vague", at("2026-10-29T00:04:00+08:00"), { lastReviewedAt: at("2026-10-28T23:59:00+08:00") }),
  };
  const restored = restore(saved, false);
  assert.equal(restored.familiar.nextReviewAt, midnight);
  assert.deepEqual({ ...restored.familiar, nextReviewAt: saved.familiar.nextReviewAt }, saved.familiar);
  assert.deepEqual(restored.vague, saved.vague);
  assert.deepEqual(restore(restored, false), restored);
  const words = Object.keys(saved).map(id => ({ id }));
  assert.deepEqual(selectDueReviewWords(words, restored, midnight - 1), []);
  assert.deepEqual(selectDueReviewWords(words, restored, midnight).map(word => word.id), ["familiar"]);
  assert.equal(saved.familiar.nextReviewAt, at("2026-10-29T22:00:00+08:00"));
});

// Execute the component's real callbacks with a fixed clock and state setters.
const component = readFileSync(new URL("../src/components/vocabulary-learning.tsx", import.meta.url), "utf8");
const helpers = component.slice(component.indexOf("function orderWordsForStudy("), component.indexOf("type SpeechRecognitionAlternativeLike"));
function groupHarness(overrides = {}) {
  const state = {};
  const context = {
    useCallback: fn => fn, useEffect: fn => fn(), Date: { now: () => 2 * day },
    window: { setTimeout: (fn, delay) => { state.timer = { fn, delay }; return 1; }, clearTimeout() {} },
    currentWord: null, currentWordId: null, groupSession: null, groupSummary: null,
    progress: {}, words: [], visibleWords: [], activeStudyWords: [], selectedBook: "高中",
    currentSettings: { scope: "core", order: "sequential", wordGroups: { core: null, all: null } },
    activeGroupByBook: {}, nextGroupByBook: {}, forcedSpellingWordId: null,
    chooseBrowseMode() {}, studyReady: true, pageVisible: true, loading: false, wakeTick: 0,
    GROUP_SIZE: VOCABULARY_GROUP_SIZE, VOCABULARY_GROUP_REVIEW_LIMIT,
    selectVocabularyStudyGroup, sortVocabularyByScene, vocabularyStudyGroupCount,
    vocabularyStudyGroupIndex, selectPendingRetryIds, selectDueReviewWords,
    progressFor: (progress, id) => progress[id] ?? { lastReviewedAt: null },
    familiarityForProgress: entry => entry.familiarity ?? entry.lastOutcome,
    ...overrides,
  };
  if (overrides.words && !overrides.visibleWords) context.visibleWords = overrides.words;
  state.groupSession = context.groupSession;
  for (const name of ["GroupBrowseIds", "GroupSummary", "SessionDepleted", "GroupSession", "ActiveGroupByBook", "NextGroupByBook", "SettingsByBook", "CurrentWordId", "RoundNonce", "DefinitionChoice", "WakeTick"]) {
    const key = name[0].toLowerCase() + name.slice(1);
    context[`set${name}`] = update => { state[key] = typeof update === "function" ? update(state[key] ?? (key === "roundNonce" || key === "wakeTick" ? 0 : {})) : update; };
  }
  const load = (start, end, name) => {
    const body = stripTypeScriptTypes(helpers + component.slice(component.indexOf(start), component.indexOf(end, component.indexOf(start))));
    return new Function("context", `with (context) { ${body}; return ${name}; }`)(context);
  };
  return {
    state, context,
    start: () => load("  const startClassifiedGroup = useCallback(", "  const studyReady", "startClassifiedGroup")(context.currentSettings, context.words, context.selectedBook),
    move: outcome => load("  const moveToNextWord = useCallback(", "  const commitBrowse", "moveToNextWord")(context.progress, outcome),
    idle() {
      const guard = component.indexOf("if (!studyReady || !pageVisible || loading || currentWordId !== null || groupSummary) return;");
      assert.ok(guard > 0);
      const start = component.lastIndexOf("  useEffect(() => {", guard);
      const end = component.indexOf("\n\n  useEffect", start);
      new Function("context", `with (context) { ${stripTypeScriptTypes(component.slice(start, end))} }`)(context);
    },
  };
}
const word = id => ({ id, word: id, level: "高中" });

test("a 20-word group interleaves 40 distinct due old words and leaves the overdue remainder", () => {
  const words = Array.from({ length: 120 }, (_, index) => word(String(index)));
  const progress = Object.fromEntries(words.slice(20).map(({ id }) => [id, row("familiar", day)]));
  const harness = groupHarness({ words, progress });
  assert.equal(harness.start(), true);
  assert.equal(harness.state.groupSession.ids.length, 60);
  assert.equal(new Set(harness.state.groupSession.remainingIds).size, 60);
  assert.deepEqual(harness.state.groupSession.remainingIds.slice(0, 6), ["0", "20", "21", "1", "22", "23"]);
  assert.equal(selectDueReviewWords(words, progress, 2 * day, harness.state.groupSession.ids).length, 60);
});

test("due retries go before the remaining new/old queue even after 40 old-word slots are full", () => {
  const words = Array.from({ length: 61 }, (_, index) => word(String(index)));
  const ids = words.slice(0, 60).map(({ id }) => id);
  const progress = Object.fromEntries(words.map(({ id }) => [id, row("familiar", 3 * day)]));
  progress["27"] = row("unfamiliar", 2 * day);
  progress["60"] = row("familiar", day);
  const remainingIds = ids.filter(id => id !== "0" && id !== "27");
  const groupSession = { ids, remainingIds, firstOutcomes: {}, familiar: 0, vague: 0, unfamiliar: 0, startedAt: day, groupNo: 0 };
  const harness = groupHarness({ words, progress, groupSession, currentWord: words[0] });
  harness.move("familiar");
  assert.equal(harness.state.currentWordId, "27");
  assert.equal(harness.state.groupSession.ids.length, 60);
  assert.equal(harness.state.groupSession.remainingIds.includes("60"), false);
  assert.equal(harness.state.groupSession.remainingIds.length, new Set(harness.state.groupSession.remainingIds).size);
});

test("new and old words repeat immediately when only unresolved words remain, keeping the normal retry timestamp", () => {
  for (const old of [false, true]) {
    for (const [outcome, minutes] of [["unfamiliar", 2], ["vague", 5]]) {
      const target = word("target");
      const history = { modeIndex: 1, lastReviewedAt: old ? day : null, ...(old ? { reviewStep: 5, plan: "long-term" } : {}) };
      const scheduled = scheduleReview(history, outcome, 2 * day);
      const progress = { target: row(outcome, scheduled.nextReviewAt, { ...scheduled, lastReviewedAt: 2 * day }) };
      const groupSession = { ids: ["target"], remainingIds: ["target"], firstOutcomes: {}, familiar: 0, vague: 0, unfamiliar: 0, groupNo: 0, startedAt: day };
      const harness = groupHarness({ words: [target], visibleWords: [target], currentWord: target, groupSession, progress });
      harness.move(outcome);
      assert.equal(harness.state.currentWordId, "target");
      assert.ok(harness.state.groupSession);
      assert.equal(harness.state.groupSummary, undefined);
      assert.deepEqual(harness.state.groupSession.remainingIds, ["target"]);
      assert.equal(progress.target.nextReviewAt, 2 * day + minutes * 60000);
      const resumed = groupHarness({ words: [target], visibleWords: [target], groupSession: harness.state.groupSession, progress });
      resumed.idle();
      assert.equal(resumed.state.currentWordId, "target");
      assert.equal(resumed.state.timer, undefined);
      const passed = { ...progress.target, ...scheduleReview(progress.target, "familiar", 2 * day + 1000), familiarity: "familiar", lastOutcome: "familiar" };
      const finished = groupHarness({ words: [target], currentWord: target, groupSession: resumed.state.groupSession, progress: { target: passed } });
      finished.move("familiar");
      assert.equal(finished.state.groupSession, null);
      assert.deepEqual(finished.state.groupSummary.ids, ["target"]);
    }
  }
});

test("resuming a fully seen group immediately repeats its unresolved word instead of waiting or advancing groups", () => {
  const target = word("target");
  const settings = { scope: "core", order: "sequential", wordGroups: { core: 0, all: null } };
  const harness = groupHarness({ words: [target], currentSettings: settings,
    activeGroupByBook: { 高中: { groupNo: 0, scope: "core", order: "sequential", startedAt: day } },
    progress: { target: row("unfamiliar", 2 * day + 120000, { lastReviewedAt: 2 * day }) } });
  assert.equal(harness.start(), true);
  assert.equal(harness.state.currentWordId, "target");
  assert.deepEqual(harness.state.groupSession.remainingIds, ["target"]);
  assert.equal(harness.state.groupSession.groupNo, 0);
});

test("with untested new and old words still queued, two/five-minute retries keep their normal cooldown", () => {
  for (const [outcome, minutes] of [["unfamiliar", 2], ["vague", 5]]) {
    const words = [word("retry"), word("new"), word("old")];
    const progress = { retry: row(outcome, 2 * day + minutes * 60000), old: row("familiar", day) };
    const groupSession = { ids: words.map(({ id }) => id), remainingIds: words.map(({ id }) => id), firstOutcomes: {}, familiar: 0, vague: 0, unfamiliar: 0, groupNo: 0, startedAt: day };
    const harness = groupHarness({ words, groupSession, progress, currentWord: words[0] });
    harness.move(outcome);
    assert.deepEqual(harness.state.groupSession.remainingIds, ["new", "old"]);
    assert.equal(harness.state.currentWordId, "new");
    const updated = { ...progress, new: row("familiar", 3 * day) };
    const beforeDue = groupHarness({ words, groupSession: harness.state.groupSession, progress: updated, currentWord: words[1], Date: { now: () => 2 * day + minutes * 60000 - 1 } });
    beforeDue.move("familiar");
    assert.equal(beforeDue.state.currentWordId, "old");
    assert.equal(beforeDue.state.groupSession.remainingIds.includes("retry"), false);
  }
});

test("after other words pass, unresolved words cycle without waiting and leave the loop as soon as familiar", () => {
  const words = [word("done"), word("vague"), word("unfamiliar"), word("passed")];
  const progress = {
    done: row("familiar", 3 * day), passed: row("familiar", 3 * day),
    vague: row("vague", 2 * day + 300000, { lastReviewedAt: 2 * day - 30000 }),
    unfamiliar: row("unfamiliar", 2 * day + 120000, { lastReviewedAt: 2 * day - 20000 }),
  };
  let groupSession = { ids: words.map(({ id }) => id), remainingIds: ["done"], firstOutcomes: {}, familiar: 0, vague: 0, unfamiliar: 0, groupNo: 0, startedAt: day };
  let harness = groupHarness({ words, groupSession, progress, currentWord: words[0] });
  harness.move("familiar");
  assert.deepEqual(harness.state.groupSession.remainingIds, ["vague", "unfamiliar"]);
  groupSession = harness.state.groupSession;
  for (const [index, id, outcome, next] of [[1,"vague","vague","unfamiliar"],[2,"unfamiliar","unfamiliar","vague"],[3,"vague","familiar","unfamiliar"],[4,"unfamiliar","familiar",null]]) {
    const now = 2 * day + index * 1000;
    progress[id] = row(outcome, now + (outcome === "vague" ? 300000 : outcome === "unfamiliar" ? 120000 : day), { lastReviewedAt: now });
    harness = groupHarness({ words, groupSession, progress, currentWord: words.find(w => w.id === id), Date: { now: () => now } });
    harness.move(outcome);
    assert.equal(harness.state.currentWordId, next);
    groupSession = harness.state.groupSession;
    if (outcome === "familiar" && next !== null) assert.equal(groupSession.remainingIds.includes(id), false);
  }
  assert.equal(groupSession, null);
  assert.ok(harness.state.groupSummary);
});

test("resuming keeps previously studied old words for immediate retry without adding a 41st old word", () => {
  const words = Array.from({ length: 61 }, (_, index) => word(String(index)));
  const progress = Object.fromEntries(words.slice(0,60).map(({ id }) => [id, row("familiar", 3 * day, { lastReviewedAt: 2 * day - 30000 })]));
  progress["20"] = row("vague", 2 * day + 300000, { lastReviewedAt: 2 * day - 1000 });
  progress["60"] = row("familiar", day, { lastReviewedAt: day - 1000 });
  const harness = groupHarness({ words, progress,
    activeGroupByBook: { 高中: { groupNo: 0, scope: "core", order: "sequential", startedAt: day } },
    currentSettings: { scope: "core", order: "sequential", vocabularySort: "frequency", wordGroups: { core: 0, all: null } } });
  assert.equal(harness.start(), true);
  assert.equal(harness.state.currentWordId, "20");
  assert.equal(harness.state.groupSession.ids.length, 60);
  assert.equal(harness.state.groupSession.ids.includes("60"), false);
});
