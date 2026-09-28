import assert from "node:assert/strict";
import test from "node:test";
import { drawBrowseMode, filterBrowseReviewWords, nextBrowseLoopId, scheduleBrowseReview } from "../src/lib/vocabulary/browse-review.ts";

test("浏览复习范围可以不选、按今日或整体筛选，并组合多个熟悉程度", () => {
  const now = new Date(2026, 8, 27, 12).getTime();
  const yesterday = now - 24 * 60 * 60 * 1000;
  const words = ["familiar", "vague", "unfamiliar", "browsed", "fresh"].map((id) => ({ id }));
  const progress = {
    familiar: { familiarity: "familiar", lastReviewedAt: now, lastCategory: "writing" },
    vague: { familiarity: "vague", lastReviewedAt: now, lastCategory: "writing" },
    unfamiliar: { familiarity: "unfamiliar", lastReviewedAt: yesterday, lastCategory: "reading" },
    browsed: { browseByBook: { "小学:all": { browseLastSeenAt: now } } },
  };
  const ids = (view, familiarity, categories = []) => filterBrowseReviewWords(words, progress, "小学:all", view, familiarity, now, categories).map((word) => word.id);
  assert.deepEqual(ids(null, []), ["familiar", "vague", "unfamiliar", "browsed", "fresh"]);
  assert.deepEqual(ids("today", []), ["familiar", "vague", "browsed"]);
  assert.deepEqual(ids("overall", []), ["familiar", "vague", "unfamiliar"]);
  assert.deepEqual(ids("today", ["vague", "unfamiliar"]), ["vague"]);
  assert.deepEqual(ids("overall", ["vague", "unfamiliar"]), ["vague", "unfamiliar"]);
  assert.deepEqual(ids("overall", [], ["writing"]), ["familiar", "vague"]);
  assert.deepEqual(ids("overall", ["familiar", "vague", "unfamiliar"], ["reading", "listening", "speaking", "writing"]), ["familiar", "vague", "unfamiliar"]);
  assert.deepEqual(ids("overall", ["vague", "unfamiliar"], ["writing"]), ["vague"]);
  assert.deepEqual(ids("overall", ["familiar", "vague", "unfamiliar"], ["reading"]), ["unfamiliar"]);
  assert.deepEqual(ids("overall", ["vague", "unfamiliar"], ["reading", "listening", "speaking"]), ["unfamiliar"]);
  assert.deepEqual(ids(null, [], ["writing"]), ["familiar", "vague", "unfamiliar", "browsed", "fresh"]);
  assert.deepEqual(ids(null, ["familiar"]), ["familiar"]);
});

test("浏览模式随机穿插已启用方式，一轮内每种方式各出现一次", () => {
  let remaining = [];
  const selected = [];
  for (let index = 0; index < 6; index += 1) {
    const draw = drawBrowseMode([3, 0, 2], remaining, () => 0);
    selected.push(draw.mode);
    remaining = draw.remainingModes;
  }
  assert.deepEqual([...selected.slice(0, 3)].sort(), [0, 2, 3]);
  assert.deepEqual([...selected.slice(3, 6)].sort(), [0, 2, 3]);
  assert.equal(drawBrowseMode([1], [], () => 0).mode, 1);
});

test("浏览模式只记录浏览时间，不增加今日或整体学习进度", () => {
  const first = scheduleBrowseReview({}, 0, 100);
  assert.equal(first.browseModeIndex, 0);
  assert.equal(first.browseFirstSeenAt, 100);
  assert.equal(first.browseLastSeenAt, 100);
  assert.equal("lastReviewedAt" in first, false);
  assert.equal("firstLearnedAt" in first, false);
  assert.equal("familiarity" in first, false);

  const last = scheduleBrowseReview(first, 3, 200);
  assert.equal(last.browseModeIndex, 3);
  assert.equal(last.browseFirstSeenAt, 100);
  assert.equal(last.browseLastSeenAt, 200);
});

test("浏览不会改写原有的分类学习记录", () => {
  const scored = { firstLearnedAt: 10, lastReviewedAt: 20, nextReviewAt: 30 };
  const next = { ...scored, ...scheduleBrowseReview({}, 1, 100) };
  assert.equal(next.firstLearnedAt, 10);
  assert.equal(next.lastReviewedAt, 20);
  assert.equal(next.nextReviewAt, 30);
});

test("每日新词播放完后只循环当天新词，单词仅有一个时也继续", () => {
  const todayNew = ["air", "ant", "arm"];
  assert.equal(nextBrowseLoopId(todayNew, "arm", "sequential"), "air");
  assert.equal(nextBrowseLoopId(todayNew, "air", "random", () => 0), "ant");
  assert.equal(nextBrowseLoopId(["air"], "air", "sequential"), "air");
  assert.equal(nextBrowseLoopId([], "air", "sequential"), null);
});
