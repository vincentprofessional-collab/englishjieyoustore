import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const namesPage = new URL(
  "../.next/server/app/speaking/part-1/speaking-part-1-007.html",
  import.meta.url,
);

test("speaking detail pages include the real question and common follow-ups below the title", () => {
  assert.ok(existsSync(namesPage), "Run `npm run build` before this test.");

  const output = readFileSync(namesPage, "utf8");
  assert.match(output, /常见追问/);
  assert.match(output, /Does your name have any meaning\? Do you like your name\?/);
});

test("speaking detail pages reserve side-by-side Band 7, Band 8, and Band 9 answer columns", () => {
  assert.ok(existsSync(namesPage), "Run `npm run build` before this test.");

  const output = readFileSync(namesPage, "utf8");
  assert.match(output, /7 分范文/);
  assert.match(output, /8 分范文/);
  assert.match(output, /9 分范文/);
  assert.match(output, /预留/);
});
