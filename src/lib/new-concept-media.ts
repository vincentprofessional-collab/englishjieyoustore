import "server-only";

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NewConceptLesson } from "@/lib/new-concept";
import { getPublicStorageUrl } from "@/lib/supabase/storage";

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function hasPublicFile(path: string) {
  const publicRoot = resolve(process.cwd(), "public");
  const filePath = resolve(publicRoot, path);
  return filePath.startsWith(`${publicRoot}/`) && existsSync(filePath);
}

function resolveAudioUrl(storagePath: string, localPath: string) {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_NEW_CONCEPT_AUDIO_BASE_URL?.replace(/\/+$/, "");
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/${encodePath(storagePath)}`;
  }

  if (process.env.COS_MEDIA_ENABLED === "true") {
    return getPublicStorageUrl("audio", storagePath);
  }

  if (hasPublicFile(localPath)) {
    return `/${encodePath(localPath)}`;
  }

  return getPublicStorageUrl("audio", storagePath);
}

export function getNewConceptMediaUrls(lesson: NewConceptLesson) {
  if (!lesson.audioPath) {
    return { audioUrl: null, sentenceAudioUrls: [] as (string | null)[] };
  }

  const fullAudioLocalPath = `audio/${lesson.audioPath}`;
  const isImportedBookTwo = lesson.bookCode === "new-concept-2";
  const audioUrl = isImportedBookTwo && hasPublicFile(fullAudioLocalPath)
    ? `/${encodePath(fullAudioLocalPath)}`
    : resolveAudioUrl(lesson.audioPath, fullAudioLocalPath);
  const lessonCode = String(lesson.lessonNo).padStart(3, "0");
  const bookFolder = lesson.bookCode === "new-concept-2" ? "book2" : "book1";
  const sentenceAudioUrls = lesson.english.map((_, index) => {
    if (lesson.kind !== "dialogue") return null;

    const sentenceCode = String(index + 1).padStart(2, "0");
    const path = `new-concept-sentences/${bookFolder}/${lessonCode}/${sentenceCode}.mp3`;
    if (isImportedBookTwo && hasPublicFile(`audio/${path}`)) {
      return `/${encodePath(`audio/${path}`)}`;
    }
    return resolveAudioUrl(path, `audio/${path}`);
  });

  return { audioUrl, sentenceAudioUrls };
}
