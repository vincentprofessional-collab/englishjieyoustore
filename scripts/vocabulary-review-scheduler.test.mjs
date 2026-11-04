import assert from "node:assert/strict";
import test from "node:test";
import { calendarReviewAt, getReviewDueAt, isReviewDue, nextClassifiedModeIndex, scheduleReview, selectEnabledMode } from "../src/lib/vocabulary/review-scheduler.ts";

const minute = 60_000;
const day = 24 * 60 * minute;

function advance(previous, outcome, now, hadInputError = false) {
  const next = scheduleReview(previous, outcome, now, hadInputError);
  return { ...previous, ...next, lastOutcome: outcome, lastReviewedAt: now };
}

test("熟悉后跨天换模式；模糊五分钟、生僻两分钟后仍考当前模式", () => {
  let previous = { lastReviewedAt: null, modeIndex: 1, plan: "short-term" };
  previous = advance(previous, "familiar", 0);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.reviewStep, 1);
  assert.equal(previous.nextReviewAt, calendarReviewAt(0, 1));

  previous = advance(previous, "vague", day);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.recoveryRequired, true);
  assert.equal(previous.reviewStep, 0);
  assert.equal(previous.nextReviewAt, day + 5 * minute);

  previous = advance(previous, "familiar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.reviewStep, 1);
  assert.equal(previous.nextReviewAt, calendarReviewAt(day + 5 * minute, 1));

  previous = advance(previous, "unfamiliar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.nextReviewAt, previous.lastReviewedAt + 2 * minute);
  previous = advance(previous, "familiar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 3);
  assert.equal(previous.reviewStep, 1);
  assert.equal(previous.recoveryRequired, false);
});

test("拼写有误但选择熟悉时仍跨天切换模式", () => {
  let previous = { lastReviewedAt: null, modeIndex: 3, plan: "short-term" };
  previous = advance(previous, "familiar", 0, true);
  assert.equal(previous.modeIndex, 1);
  assert.equal(previous.recoveryRequired, false);
  assert.equal(previous.mistakeCount, 1);
  assert.equal(previous.nextReviewAt, calendarReviewAt(0, 1));
});

test("旧进度的熟悉次数不会阻止答熟悉后立即切换", () => {
  const next = scheduleReview({
    consecutiveFamiliar: 2,
    lastReviewedAt: 0,
    modeIndex: 0,
    plan: "short-term",
  }, "familiar", minute);
  assert.equal(next.modeIndex, 2);
  assert.equal(next.nextReviewAt, calendarReviewAt(minute, 1));
});

test("口语模式选择熟悉后直接进入已启用的写作模式，即使之前有错题记录", () => {
  const next = scheduleReview({
    lastOutcome: "unfamiliar",
    lastReviewedAt: 0,
    modeIndex: 2,
    plan: "short-term",
    recoveryFamiliarStreak: 2,
    recoveryRequired: true,
  }, "familiar", minute, false, [1, 0, 2, 3], 3);

  assert.equal(next.modeIndex, 3);
  assert.equal(next.recoveryRequired, false);
  assert.equal(next.recoveryFamiliarStreak, 0);
});

test("口语模式选择模糊或生僻后仍留在口语模式", () => {
  for (const outcome of ["vague", "unfamiliar"]) {
    const next = scheduleReview({ lastOutcome: "familiar", lastReviewedAt: 0, modeIndex: 2, plan: "short-term" }, outcome, minute);
    assert.equal(next.modeIndex, 2);
  }
});

test("熟悉后按阅读、听力、口语、写作轮换，并按1、3、7、15、30天递进", () => {
  let previous = { lastReviewedAt: null, modeIndex: 1, plan: "short-term" };
  let now = 0;
  const intervals = [1, 3, 7, 15, 30];
  for (const [index, mode] of [1, 0, 2, 3, 1].entries()) {
    assert.equal(previous.modeIndex, mode);
    previous = advance(previous, "familiar", now);
    assert.equal(previous.nextReviewAt, calendarReviewAt(now, intervals[index]));
    now = previous.nextReviewAt;
  }
  assert.equal(previous.plan, "long-term");
  assert.equal(previous.reviewStep, 5);
  assert.equal(previous.modeIndex, 0);
});

test("长期复习出错后先短间隔重试，熟悉时从密集计划第一档重新开始", () => {
  let previous = { lastReviewedAt: 0, modeIndex: 1, plan: "long-term", reviewStep: 1 };
  previous = advance(previous, "familiar", day);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.reviewStep, 2);
  assert.equal(previous.nextReviewAt, calendarReviewAt(day, 3));

  previous = advance(previous, "vague", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.reviewStep, 0);
  previous = advance(previous, "familiar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.reviewStep, 1);
  assert.equal(previous.nextReviewAt, calendarReviewAt(previous.lastReviewedAt, 1));

  const capped = scheduleReview({ ...previous, reviewStep: 5 }, "familiar", previous.nextReviewAt);
  assert.equal(capped.reviewStep, 5);
  assert.equal(capped.nextReviewAt, calendarReviewAt(previous.nextReviewAt, 15));
});

test("曾模糊或生僻的词以后持续使用1、2、4、7、15天，熟悉不会清除历史", () => {
  for (const outcome of ["vague", "unfamiliar"]) {
    let previous = advance({ lastReviewedAt: null, modeIndex: 1 }, outcome, day);
    for (const days of [1, 2, 4, 7, 15, 15]) {
      const now = previous.nextReviewAt;
      previous = advance(previous, "familiar", now);
      assert.equal(previous.nextReviewAt, calendarReviewAt(now, days));
      assert.equal(previous.mistakeCount, 1);
    }
  }
});

test("新词和三十天档旧词每次选择模糊/生僻，都重新计时五/两分钟", () => {
  for (const history of [{ lastReviewedAt: null, modeIndex: 1 }, { lastReviewedAt: 0, modeIndex: 3, plan: "long-term", reviewStep: 5 }]) {
    for (const [outcome, minutes] of [["vague", 5], ["unfamiliar", 2]]) {
      let previous = advance(history, outcome, day);
      assert.equal(previous.nextReviewAt, day + minutes * minute);
      assert.equal(previous.modeIndex, history.modeIndex);
      previous = advance(previous, outcome, previous.nextReviewAt);
      assert.equal(previous.nextReviewAt, day + 2 * minutes * minute);
      previous = advance(previous, "familiar", previous.nextReviewAt);
      assert.equal(previous.reviewStep, 1);
      assert.equal(previous.nextReviewAt, calendarReviewAt(previous.lastReviewedAt, 1));
    }
  }
});

test("已有困难词长间隔载入时缩短，分钟重试及更早的逾期时间保留", () => {
  const reviewedAt = Date.parse("2026-10-28T22:00:00+08:00");
  const entry = { lastOutcome: "familiar", lastReviewedAt: reviewedAt, reviewStep: 5, mistakeCount: 2, nextReviewAt: calendarReviewAt(reviewedAt, 30) };
  assert.equal(getReviewDueAt(entry), calendarReviewAt(reviewedAt, 15));
  assert.equal(getReviewDueAt({ ...entry, nextReviewAt: getReviewDueAt(entry) }), getReviewDueAt(entry));
  assert.equal(getReviewDueAt({ ...entry, mistakeCount: 0 }), entry.nextReviewAt);
  assert.equal(getReviewDueAt({ ...entry, nextReviewAt: calendarReviewAt(reviewedAt, 2) }), calendarReviewAt(reviewedAt, 2));
  assert.equal(getReviewDueAt({ ...entry, lastOutcome: "vague", nextReviewAt: reviewedAt + 5 * minute }), reviewedAt + 5 * minute);
});

test("关闭的考察方式会跳过，单一方式答熟悉后进入长期复习", () => {
  assert.equal(selectEnabledMode(2, [0, 1, 3]), 3);
  const first = scheduleReview({ lastReviewedAt: null, modeIndex: 1, plan: "short-term" }, "familiar", 0, false, [1]);
  assert.equal(first.modeIndex, 1);
  assert.equal(first.nextReviewAt, calendarReviewAt(0, 1));
  assert.equal(first.plan, "long-term");
});

test("分类记忆按阅读、听力、口语、写作循环", () => {
  assert.deepEqual([1, 0, 2, 3].map(nextClassifiedModeIndex), [0, 2, 3, 1]);
});

test("到期的熟悉、模糊、生僻词都进入复习队列；未到期或已完成的不进入", () => {
  const now = day * 4;
  for (const outcome of ["familiar", "vague", "unfamiliar"]) {
    assert.equal(isReviewDue(now, false, outcome, now), true);
    const later = outcome === "familiar" ? calendarReviewAt(now, 1) : now + minute;
    assert.equal(isReviewDue(later, false, outcome, now), false);
    assert.equal(isReviewDue(now, true, outcome, now), false);
  }
  assert.equal(isReviewDue(now, false, null, now), false);
});

const at = value => Date.parse(value);

test("晚上十点学熟悉，过北京时间零点立即到期，不等二十四小时", () => {
  const learnedAt = at("2026-10-28T22:00:00+08:00");
  const midnight = at("2026-10-29T00:00:00+08:00");
  const next = scheduleReview({ lastReviewedAt: null, modeIndex: 1 }, "familiar", learnedAt);
  assert.equal(next.nextReviewAt, midnight);
  assert.equal(isReviewDue(next.nextReviewAt, false, "familiar", midnight - 1), false);
  assert.equal(isReviewDue(next.nextReviewAt, false, "familiar", midnight), true);
  assert.equal(isReviewDue(next.nextReviewAt, false, "familiar", at("2026-10-29T09:00:00+08:00")), true);
});

test("多天间隔、月底和年末均按日历日期零点安排", () => {
  assert.equal(calendarReviewAt(at("2026-10-28T22:00:00+08:00"), 3), at("2026-10-31T00:00:00+08:00"));
  assert.equal(calendarReviewAt(at("2026-10-31T23:59:59+08:00"), 1), at("2026-11-01T00:00:00+08:00"));
  assert.equal(calendarReviewAt(at("2026-12-31T23:59:59+08:00"), 1), at("2027-01-01T00:00:00+08:00"));
  assert.equal(calendarReviewAt(at("2028-02-28T22:00:00+08:00"), 1), at("2028-02-29T00:00:00+08:00"));
});

test("两分钟和五分钟重试跨零点时仍保留实际等待时长", () => {
  const now = at("2026-10-28T23:59:00+08:00");
  for (const [outcome, minutes] of [["unfamiliar", 2], ["vague", 5]]) {
    const next = scheduleReview({ lastReviewedAt: null, modeIndex: 1 }, outcome, now);
    assert.equal(next.nextReviewAt, now + minutes * minute);
    assert.equal(getReviewDueAt({ ...next, lastOutcome: outcome }), next.nextReviewAt);
    assert.equal(isReviewDue(next.nextReviewAt, false, outcome, at("2026-10-29T00:00:00+08:00")), false);
  }
});

test("已有二十四小时制熟悉记录按原到期日零点兼容，重复转换不推进日期", () => {
  const entry = { lastOutcome: "familiar", nextReviewAt: at("2026-10-29T22:00:00+08:00") };
  const migrated = getReviewDueAt(entry);
  assert.equal(migrated, at("2026-10-29T00:00:00+08:00"));
  assert.equal(getReviewDueAt({ ...entry, nextReviewAt: migrated }), migrated);
  assert.equal(getReviewDueAt({ familiarity: "familiar", nextReviewAt: entry.nextReviewAt }), migrated);
  assert.equal(getReviewDueAt({ lastOutcome: "unscored", nextReviewAt: null }), null);
});
