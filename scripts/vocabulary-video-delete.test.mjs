import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

test("retired vocabulary video routes, player and upload modules remain absent", () => {
  for (const path of [
    "src/app/api/admin-video-upload/route.ts", "src/app/api/vocabulary-video-media/route.ts",
    "src/app/api/vocabulary-video-votes/route.ts", "src/app/api/vocabulary-videos/route.ts",
    "src/app/preview/vocabulary-video/page.tsx", "src/components/vocabulary-video-player.tsx",
    "src/lib/admin/upload-video.ts", "src/lib/vocabulary/videos.ts", "src/data/vocabulary/video-catalog.json",
  ]) assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), false, path);
  assert.equal(existsSync(new URL("../src/components/vocabulary-detail-content.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../src/app/api/vocabulary-pronunciations/route.ts", import.meta.url)), true);
});
