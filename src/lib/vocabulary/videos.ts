import "server-only";

import catalogData from "@/data/vocabulary/video-catalog.json";
import { getVocabularyVideoMediaUrl } from "@/lib/media/url";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LocalVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";
import { getAllVocabularyEntries } from "@/lib/vocabulary/local-vocabulary";

type CatalogItem = {
  bytes: number;
  name: string;
  reviewRequired: boolean;
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
      return hasWholeWord(item.name.replace(/\.mp4$/i, ""), forms);
    })
    .sort((left, right) => {
      const levelDifference = Number(containsAboveCet4Word(left.name)) - Number(containsAboveCet4Word(right.name));
      if (levelDifference !== 0) return levelDifference;
      const filenameLengthDifference = left.name.replace(/\.mp4$/i, "").length - right.name.replace(/\.mp4$/i, "").length;
      if (filenameLengthDifference !== 0) return filenameLengthDifference;
      return left.name.localeCompare(right.name);
    })
    .map((item) => ({ path: item.name, src: getVocabularyVideoMediaUrl(item.name) }));
}

export function getVocabularyVideoCandidates(entry: LocalVocabularyEntry) {
  return getCandidatePool(entry);
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
    return rankByLikes(items).slice(0, MAX_VISIBLE_VIDEOS)
      .sort((left, right) => (originalOrder.get(left.path) ?? 0) - (originalOrder.get(right.path) ?? 0));
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

  return visible.sort((left, right) => (originalOrder.get(left.path) ?? 0) - (originalOrder.get(right.path) ?? 0));
}

export async function getVocabularyVideos(entry: LocalVocabularyEntry) {
  const candidates = getCandidatePool(entry);
  if (candidates.length === 0) return { totalVideos: 0, videos: [] as VocabularyVideo[], votesEnabled: false };

  let startedAt = new Date().toISOString();
  let counts = new Map<string, number>();
  let likedPaths = new Set<string>();
  let votesEnabled = false;

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
      const { data } = await supabase
        .from("vocabulary_video_votes")
        .select("video_path")
        .eq("word", normalizedWord)
        .eq("user_id", userId);
      likedPaths = new Set((data ?? []).map((row: { video_path: string }) => row.video_path));
    }
  } catch {
    // The player remains usable before the vote migration is applied.
  }

  const scored = candidates.map((candidate) => ({ ...candidate, likes: counts.get(candidate.path) ?? 0 }));
  const visible = pickVisibleCandidates(scored, rotationCycle(startedAt, new Date()));

  return {
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
  return Boolean(item && item.bytes < MAX_FILE_BYTES && item.name.toLowerCase().endsWith(".mp4"));
}
