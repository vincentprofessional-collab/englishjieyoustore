import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../data/tv-speaking/clips.json", import.meta.url), "utf8"));
const nav = readFileSync(new URL("../src/lib/content/site-chrome.ts", import.meta.url), "utf8");
const player = readFileSync(new URL("../src/components/tv-speaking-learning.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../src/app/api/tv-speaking/route.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../src/components/admin-tv-speaking-editor.tsx", import.meta.url), "utf8");

test("manifest contains the 100 shortest unique valid clips", () => {
  assert.equal(manifest.clips.length, 100);
  assert.equal(new Set(manifest.clips.map((clip) => clip.english.toLowerCase())).size, 100);
  assert.ok(manifest.clips.every((clip) => clip.wordCount === 1));
  assert.ok(manifest.clips.every((clip) => clip.durationSeconds > 0 && clip.durationSeconds <= 15));
});

test("navigation opens the TV speaking page", () => {
  assert.match(nav, /label: "看美剧学口语"/);
  assert.match(nav, /href: "\/tv-speaking"/);
});

test("player keeps the requested video learning controls", () => {
  assert.match(player, /className="tv-subtitle-mask"[\s\S]*?<BbcSentencePractice/);
  assert.match(player, /className="howler-player tv-video-player"[\s\S]*?player-main-controls[\s\S]*?player-progress-row/);
  assert.match(player, /AudioSettingsMenus/);
  assert.match(player, /上一条/);
  assert.match(player, /下一条/);
  assert.doesNotMatch(player, /tv-speaking-hero/);
  assert.doesNotMatch(player, /tv-speaking-copy/);
});

test("admin mutations require an authenticated admin and support edit and delete", () => {
  assert.match(api, /requireAdmin/);
  assert.match(api, /export async function PATCH/);
  assert.match(api, /export async function DELETE/);
  assert.match(api, /storage\.from\("videos"\)\.remove/);
  assert.match(admin, /<video controls playsInline/);
});
