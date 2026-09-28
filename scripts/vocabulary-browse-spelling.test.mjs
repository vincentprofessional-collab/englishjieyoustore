import assert from "node:assert/strict";
import test from "node:test";
import { updateBrowseSpellingMistakes } from "../src/lib/vocabulary/browse-spelling.ts";

test("本轮浏览拼写错误按词去重，后来拼对仍保留错词记录", () => {
  let store = updateBrowseSpellingMistakes({}, "初中:all", "apple", false, 100);
  store = updateBrowseSpellingMistakes(store, "初中:all", "apple", false, 200);
  store = updateBrowseSpellingMistakes(store, "高中:all", "apple", false, 300);
  assert.deepEqual(Object.keys(store["初中:all"]), ["apple"]);
  assert.equal(store["初中:all"].apple, 200);
  store = updateBrowseSpellingMistakes(store, "初中:all", "apple", true, 400);
  assert.equal(store["初中:all"].apple, 200);
  assert.equal(store["高中:all"].apple, 300);
});
