import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readSource(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("speaking Band 7 and Band 8 pages use separate editable content slugs", () => {
  const band7Page = readSource("src/app/speaking/[part]/[questionId]/page.tsx");
  const band8Page = readSource("src/app/speaking/[part]/[questionId]/band-8/page.tsx");

  assert.match(band7Page, /SpeakingModelAnswerContent/);
  assert.match(band7Page, /getSpeakingContentSlug\(part\.id, question\.id, "band-7"\)/);
  assert.match(band8Page, /SpeakingModelAnswerContent/);
  assert.match(band8Page, /getSpeakingContentSlug\(part\.id, question\.id, "band-8"\)/);
});

test("speaking frontend editor is gated by admin profile role and supports audio upload", () => {
  const component = readSource(
    "src/app/speaking/[part]/[questionId]/speaking-model-answer-content.tsx",
  );

  assert.match(component, /ADMIN EDIT/);
  assert.match(component, /\.from\("profiles"\)/);
  assert.match(component, /profile\?\.role === "admin"/);
  assert.match(component, /\/api\/speaking-managed-content/);
  assert.match(component, /uploadAdminAudio/);
  assert.match(component, /accept="audio\/\*,\.aac,\.flac,\.m4a,\.mp3,\.mp4,\.ogg,\.wav,\.webm"/);
});

test("speaking managed-content API reads published overrides and requires admin writes", () => {
  const apiRoute = readSource("src/app/api/speaking-managed-content/route.ts");
  const mapper = readSource("src/lib/ielts/speaking-managed-content.ts");

  assert.match(apiRoute, /export async function GET/);
  assert.match(apiRoute, /\.eq\("status", "published"\)/);
  assert.match(apiRoute, /export async function POST/);
  assert.match(apiRoute, /profile\?\.role !== "admin"/);
  assert.match(apiRoute, /normalizeSpeakingEditableContent/);

  for (const sectionKey of [
    "basic_info",
    "high_score_idea",
    "sentence_patterns",
    "vocabulary",
    "sample_answer",
    "translation",
    "audio",
  ]) {
    assert.match(mapper, new RegExp(`sectionKey: "${sectionKey}"`));
  }
});

test("speaking audio upload route stores audio in the audio bucket after admin check", () => {
  const audioRoute = readSource("src/app/api/admin-audio-upload/route.ts");
  const uploadHelper = readSource("src/lib/admin/upload-audio.ts");

  assert.match(audioRoute, /profile\?\.role !== "admin"/);
  assert.match(audioRoute, /createBucket\("audio"/);
  assert.match(audioRoute, /from\("audio"\)\.upload/);
  assert.match(audioRoute, /80 \* 1024 \* 1024/);
  assert.match(uploadHelper, /\/api\/admin-audio-upload/);
  assert.match(uploadHelper, /Authorization: `Bearer \$\{session\.access_token\}`/);
});
