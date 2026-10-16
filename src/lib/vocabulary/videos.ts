import "server-only";
import { unstable_cache } from "next/cache";

import { createClient } from "@supabase/supabase-js";
import catalogData from "@/data/vocabulary/video-catalog.json";
import { getVocabularyVideoMediaUrl, toSupabaseSafeStoragePath } from "@/lib/media/url";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LocalVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";
import { getAllVocabularyEntries } from "@/lib/vocabulary/local-vocabulary";

type CatalogItem = {
  bytes: number;
  name: string;
  reviewRequired: boolean;
  vocabularyWords?: string[];
};

export type VocabularyVideo = {
  likedByMe: boolean;
  likes: number;
  path: string;
  src: string;
};

const MAX_FILE_BYTES = 20_000_000;
const MAX_VISIBLE_VIDEOS = 20;
const VIDEOS_REPLACED_PER_QUARTER = 10;
const catalog = catalogData as CatalogItem[];
const catalogByName = new Map(catalog.map((item) => [item.name, item]));

function getSemanticFilename(item: CatalogItem) {
  // Catalog assignments are authoritative when a filename is misspelled or ambiguous.
  return item.vocabularyWords?.join(" ") ?? item.name.replace(/\.mp4$/i, "");
}

function levelRank(level: string) {
  const normalized = level.toLowerCase();
  if (/小学|elementary/.test(normalized)) return 1;
  if (/初中|junior.?high|middle.?school/.test(normalized)) return 2;
  if (/高中|senior.?high|high.?school/.test(normalized)) return 3;
  if (/四级|cet.?4|college.?english.?test.?4/.test(normalized)) return 4;
  if (/六级|cet.?6|college.?english.?test.?6/.test(normalized)) return 5;
  if (/考研|研究生|graduate|postgraduate/.test(normalized)) return 6;
  if (/雅思|托福|托雅|ielts|toefl/.test(normalized)) return 7;
  if (/sat/.test(normalized)) return 8;
  if (/gre|gmat/.test(normalized)) return 9;
  return null;
}

const levelByWord = new Map<string, number>();

function rememberWordLevel(word: string, level: string) {
  const rank = levelRank(level);
  if (rank === null) return;
  const key = word.toLowerCase();
  if (rank > (levelByWord.get(key) ?? 0)) levelByWord.set(key, rank);
}

for (const entry of getAllVocabularyEntries()) {
  rememberWordLevel(entry.normalizedWord, entry.level);
  for (const inflection of entry.inflections) {
    rememberWordLevel(inflection.value, entry.level);
  }
}

function wordsInFilename(filename: string) {
  return filename.match(/[a-z]+(?:['’][a-z]+)?/gi)?.map((word) => word.toLowerCase()) ?? [];
}

function containsAboveCet4Word(filename: string) {
  return wordsInFilename(filename.replace(/\.mp4$/i, ""))
    .some((word) => (levelByWord.get(word) ?? 0) > 4);
}

function hasWholeWord(filename: string, forms: string[]) {
  const tokens = new Set(wordsInFilename(filename));
  return forms.some((form) => {
    const normalized = form.toLowerCase().trim();
    if (!normalized) return false;
    if (!normalized.includes(" ")) return tokens.has(normalized);
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, "i").test(filename);
  });
}

function getCandidatePool(entry: LocalVocabularyEntry) {
  const forms = [entry.normalizedWord, ...entry.inflections.map((inflection) => inflection.value)];
  const seen = new Set<string>();

  return catalog
    .filter((item) => {
      if (item.bytes >= MAX_FILE_BYTES || !item.name.toLowerCase().endsWith(".mp4")) {
        return false;
      }
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return hasWholeWord(getSemanticFilename(item), forms);
    })
    .sort((left, right) => {
      const levelDifference = Number(containsAboveCet4Word(getSemanticFilename(left))) - Number(containsAboveCet4Word(getSemanticFilename(right)));
      if (levelDifference !== 0) return levelDifference;
      const filenameLengthDifference = left.name.replace(/\.mp4$/i, "").length - right.name.replace(/\.mp4$/i, "").length;
      if (filenameLengthDifference !== 0) return filenameLengthDifference;
      return left.name.localeCompare(right.name);
    })
    .map((item) => ({
      path: item.name,
      src: getVocabularyVideoMediaUrl(item.name),
    }));
}

export function getVocabularyVideoCandidates(entry: LocalVocabularyEntry) {
  return getCandidatePool(entry);
}

export function createVocabularyVideoStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

export const VOCABULARY_VIDEO_FILES_TAG = "vocabulary-video-files";
// Non-ASCII file names are stored as root-level u- aliases, not under the folder.
const encodedStoredNames = unstable_cache(async () => {
  const storage = createVocabularyVideoStorageClient();
  if (!storage) throw new Error("Video storage is unavailable");
  const names: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.storage.from("videos").list("", {
      limit: 1000, offset, search: "u-dm9jYWJ1bGFyeS", sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    for (const file of data ?? []) if (file.id) names.push(file.name);
    if ((data?.length ?? 0) < 1000) return names;
  }
}, ["vocabulary-video-encoded-files-v1"], { revalidate: 300, tags: [VOCABULARY_VIDEO_FILES_TAG] });

// Storage search matches file-name prefixes, while a vocabulary word may be
// anywhere in a clip's name. Cache the folder inventory across all words.
const plainStoredNames = unstable_cache(async () => {
  const storage = createVocabularyVideoStorageClient();
  if (!storage) throw new Error("Video storage is unavailable");
  const names: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.storage.from("videos").list("vocabulary", {
      limit: 1000, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    for (const file of data ?? []) if (file.id) names.push(file.name);
    if ((data?.length ?? 0) < 1000) return names;
  }
}, ["vocabulary-video-plain-files-v1"], { revalidate: 300, tags: [VOCABULARY_VIDEO_FILES_TAG] });

async function getStoredCandidates(entry: LocalVocabularyEntry) {
  const candidates = getCandidatePool(entry);
  if (!candidates.length) return candidates;
  const [plain, encoded] = await Promise.all([
    plainStoredNames(),
    candidates.some(candidate => toSupabaseSafeStoragePath(`vocabulary/${candidate.path}`).startsWith("u-")) ? encodedStoredNames() : [],
  ]);
  const storedNames = new Set(plain), aliases = new Set(encoded);
  return candidates.filter((candidate) => {
    const storagePath = toSupabaseSafeStoragePath(`vocabulary/${candidate.path}`);
    return storagePath.startsWith("u-") ? aliases.has(storagePath) : storedNames.has(candidate.path);
  });
}

function addCalendarMonthsClamped(date: Date, months: number) {
  const target = new Date(date);
  const originalDay = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, lastDay));
  return target;
}

function rotationCycle(startedAt: string, now: Date) {
  const start = new Date(startedAt);
  let cycle = 0;
  while (cycle < 100 && addCalendarMonthsClamped(start, (cycle + 1) * 3) <= now) cycle += 1;
  return cycle;
}

function pickVisibleCandidates<T extends { path: string; likes: number }>(items: T[], cycle: number) {
  const originalOrder = new Map(items.map((item, index) => [item.path, index]));
  const rankByLikes = (pool: T[]) => [...pool].sort((left, right) =>
    right.likes - left.likes ||
    (originalOrder.get(left.path) ?? 0) - (originalOrder.get(right.path) ?? 0),
  );

  if (cycle >= 4) {
    return rankByLikes(items).slice(0, MAX_VISIBLE_VIDEOS);
  }

  let visible = items.slice(0, MAX_VISIBLE_VIDEOS);
  for (let quarter = 1; quarter <= cycle; quarter += 1) {
    const nextStart = MAX_VISIBLE_VIDEOS + (quarter - 1) * VIDEOS_REPLACED_PER_QUARTER;
    const additions = items.slice(nextStart, nextStart + VIDEOS_REPLACED_PER_QUARTER);
    if (additions.length === 0) break;

    const replaceCount = Math.min(VIDEOS_REPLACED_PER_QUARTER, additions.length, visible.length);
    const retained = rankByLikes(visible).slice(0, visible.length - replaceCount);
    visible = [...retained, ...additions.slice(0, replaceCount)];
  }

  return rankByLikes(visible);
}

export async function getVocabularyVideos(entry: LocalVocabularyEntry) {
  let candidates: ReturnType<typeof getCandidatePool>;
  try { candidates = await getStoredCandidates(entry); }
  catch { candidates = []; }
  if (candidates.length === 0) return { canDelete: false, totalVideos: 0, videos: [] as VocabularyVideo[], votesEnabled: false };

  let startedAt = new Date().toISOString();
  let counts = new Map<string, number>();
  let likedPaths = new Set<string>();
  let votesEnabled = false;
  let canDelete = false;

  try {
    const supabase = await createServerSupabaseClient();
    const normalizedWord = entry.normalizedWord.toLowerCase();
    const [cycleResult, countResult, userResult] = await Promise.all([
      supabase.rpc("get_or_start_vocabulary_video_cycle", { target_word: normalizedWord }),
      supabase.rpc("get_vocabulary_video_vote_counts", {
        target_word: normalizedWord,
      }),
      supabase.auth.getUser(),
    ]);

    if (!cycleResult.error && typeof cycleResult.data === "string") startedAt = cycleResult.data;
    if (!countResult.error) {
      for (const row of (countResult.data ?? []) as Array<{ likes: number | string; video_path: string }>) {
        counts.set(row.video_path, Number(row.likes) || 0);
      }
      votesEnabled = !cycleResult.error;
    }

    const userId = userResult.data.user?.id;
    if (userId) {
      const [voteResult, profileResult] = await Promise.all([
        supabase.from("vocabulary_video_votes").select("video_path").eq("word", normalizedWord).eq("user_id", userId),
        supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
      ]);
      likedPaths = new Set((voteResult.data ?? []).map((row: { video_path: string }) => row.video_path));
      canDelete = !profileResult.error && profileResult.data?.role === "admin";
    }
  } catch {
    // The player remains usable before the vote migration is applied.
  }

  const scored = candidates.map((candidate) => ({ ...candidate, likes: counts.get(candidate.path) ?? 0 }));
  const visible = pickVisibleCandidates(scored, rotationCycle(startedAt, new Date()));

  return {
    canDelete,
    totalVideos: candidates.length,
    videos: visible.map((candidate) => ({
      ...candidate,
      likedByMe: likedPaths.has(candidate.path),
    })),
    votesEnabled,
  };
}

export function isEligibleVocabularyVideo(entry: LocalVocabularyEntry, path: string) {
  return getCandidatePool(entry).some((candidate) => candidate.path === path);
}

export function isPlayableVocabularyVideoFilename(filename: string) {
  const item = catalogByName.get(filename);
  return Boolean(item && !/[\\/]/.test(filename) && item.bytes < MAX_FILE_BYTES && item.name.toLowerCase().endsWith(".mp4"));
}
