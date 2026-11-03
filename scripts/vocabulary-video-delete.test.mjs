import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("retired vocabulary video routes, player and upload modules remain absent", () => {
  for (const path of [
    "src/app/api/admin-video-upload/route.ts", "src/app/api/vocabulary-video-media/route.ts",
    "src/app/api/vocabulary-video-votes/route.ts", "src/app/api/vocabulary-videos/route.ts",
    "src/app/preview/vocabulary-video/page.tsx", "src/components/vocabulary-video-player.tsx",
    "src/lib/admin/upload-video.ts", "src/lib/vocabulary/videos.ts", "src/data/vocabulary/video-catalog.json",
    "scripts/upload-local-vocabulary-videos-to-supabase.mjs",
  ]) assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), false, path);
  const preferences = readFileSync(new URL("../src/lib/vocabulary/lookup-display-preferences.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.doesNotMatch(preferences, /video|视频/i);
  assert.doesNotMatch(css, /\.vocabulary-video-/);
  assert.equal("media:local-vocabulary-videos" in packageJson.scripts, false);
  assert.equal(existsSync(new URL("../src/components/vocabulary-detail-content.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../src/app/api/vocabulary-pronunciations/route.ts", import.meta.url)), true);
});
