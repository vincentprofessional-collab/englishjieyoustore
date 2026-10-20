"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";

import { VocabularyDetailShell } from "@/components/vocabulary-detail-shell";
import { VocabularyMobileBackLink } from "@/components/vocabulary-mobile-back-link";
import { VocabularyDetailContent, useVocabularyIllustration } from "@/components/vocabulary-detail-content";
import { isPhoneUserAgent } from "@/lib/vocabulary/lookup-display-preferences";
import { ACCOUNT_PROGRESS_EVENT } from "@/lib/learning/account-progress";
import { VocabularyFavoriteButton } from "@/components/vocabulary-favorite-button";
import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import { VocabularyLookupDisplaySection } from "@/components/vocabulary-lookup-display-section";
import { VocabularyShareButton } from "@/components/vocabulary-share-button";
import { VocabularyExcelImport } from "@/components/vocabulary-excel-import";
import { compareStudyExamples, getConciseStudyDefinition, getDefinitionOptionText, getStudyPhonetic, maskStudyExample } from "@/lib/vocabulary/study-definition";
import { VocabularyVideoPlayer } from "@/components/vocabulary-video-player";
import { drawBrowseMode, drawWeightedBrowseWord, filterBrowseReviewWords, nextBrowseLoopId, scheduleBrowseReview } from "@/lib/vocabulary/browse-review";
import { selectVocabularyStudyGroup, vocabularyStudyGroupIndex, VOCABULARY_GROUP_SIZE } from "@/lib/vocabulary/study-groups";
import type { VocabularyUsageExample } from "@/lib/vocabulary/examples";
import {
  FAVORITE_WORDS_CHANGED_EVENT,
  FAVORITE_WORDS_STORAGE_KEY,
  isSupplementalLearningBook,
  type FavoriteLearningWord,
  type LearningBookKey,
  type LearningWord,
} from "@/lib/vocabulary/learning";
import type { LocalVocabularyEntry, VocabularyFormationPart } from "@/lib/vocabulary/local-vocabulary";
import type { VocabularySynonymDistinction } from "@/lib/vocabulary/synonym-distinctions";
import type { VocabularyPhraseMatch } from "@/lib/vocabulary/phrases";
import { getVocabularyAudioUrl, playVocabularyPronunciation } from "@/lib/vocabulary/pronunciation-audio";
import { getSpellingCharacterFeedback } from "@/lib/vocabulary/spelling-feedback";
import { isReviewDue, scheduleReview, selectEnabledMode } from "@/lib/vocabulary/review-scheduler";
import { localStudyDate, summarizeDailyStudy, type DailyActivityStore, type DailyMode, type DailyOutcome, type DailySummary } from "@/lib/vocabulary/daily-summary";

type CollectionKey = "familiar" | "vague" | "unfamiliar";
type BookSelectionKey = LearningBookKey | "生词本";
type Voice = "us" | "uk";
type SortOrder = "sequential" | "random";
type Familiarity = "familiar" | "vague" | "unfamiliar";
type Outcome = Familiarity | "unscored";
type Plan = "short-term" | "long-term" | "done";
type RoundPhase = "idle" | "playing" | "recording" | "scoring" | "awaiting";
type ProgressCategory = "reading" | "listening" | "speaking" | "writing";
type ProgressView = "today" | "overall";
type VocabularyScope = "core" | "all";
type LearningMethod = "classified" | "browse";
type AssessmentDefinitionLanguage = "zh" | "en";
type DefinitionLanguage = AssessmentDefinitionLanguage;
type StudySettings = {
  dailyNew: number;
  browseGroups: number;
  reactionSeconds: Record<ProgressCategory, number>;
  method: LearningMethod;
  modes: ProgressCategory[];
  reviewFamiliarities: CollectionKey[];
  reviewView: ProgressView | null;
  scope: VocabularyScope;
  wordGroups: Record<VocabularyScope, number | null>;
  voice: Voice;
  order: SortOrder;
  definitionLanguage: DefinitionLanguage;
  assessmentDefinitionLanguage: AssessmentDefinitionLanguage;
  showExamples: boolean;
  showOptions: boolean;
  showPicture: boolean;
};
type StudySettingsDraft = Omit<StudySettings, "dailyNew" | "reactionSeconds" | "browseGroups"> & {
  dailyNew: string;
  browseGroups: string;
  reactionSeconds: Record<ProgressCategory, string>;
};
type ClassificationGroupSession = { ids: string[]; remainingIds: string[]; firstOutcomes: Partial<Record<string, Familiarity>>; index: number; startedAt: number; familiar: number; vague: number; unfamiliar: number; groupNo: number };
type ClassificationGroupSummary = Omit<ClassificationGroupSession, "index" | "remainingIds" | "firstOutcomes"> & { endedAt: number; book: BookSelectionKey };
type ActiveGroupProgress = { groupNo: number; scope: VocabularyScope; startedAt: number };

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  0?: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type ProgressEntry = {
  sourceBooks?: string[];
  browseByBook?: Record<string, {
    browseFirstSeenAt?: number | null;
    browseLastSeenAt?: number | null;
    browseModeIndex?: number;
  }>;
  browseFirstSeenAt?: number | null;
  browseLastSeenAt?: number | null;
  browseModeIndex?: number;
  completed?: boolean;
  consecutiveFamiliar?: number;
  consecutiveFamiliarMode?: number;
  familiarity: Familiarity | null;
  firstLearnedAt?: number | null;
  lastOutcome: Outcome | null;
  lastReviewedAt: number | null;
  mistakeCount?: number;
  modeIndex: number;
  nextReviewAt: number | null;
  plan: Plan;
  lastCategory?: ProgressCategory;
  modeOutcomes?: Partial<Record<ProgressCategory, Familiarity>>;
  recoveryFamiliarStreak?: number;
  recoveryRequired?: boolean;
  reviewStep?: number;
  spellingErrorCount: number;
  spellingHadError: boolean;
  spellingUnansweredCount: number;
};

type ProgressStore = Record<string, ProgressEntry>;
type VocabularyLearningProps = {
  bookCounts: Record<LearningBookKey, { added: number; total: number }>;
  books: Array<{ description: string; key: LearningBookKey; label: string }>;
  initialBook: BookSelectionKey;
  initialListMode?: boolean;
  initialListResume?: boolean;
  sourceCount: number;
};

type VocabularyDetailPayload = {
  entry: LocalVocabularyEntry;
  etymology?: { chinese?: string; english?: string } | null;
  formationParts: VocabularyFormationPart[];
  phrases: VocabularyPhraseMatch[];
  synonymDistinctions: VocabularySynonymDistinction[];
  usageExamples: VocabularyUsageExample[];
};
type VocabularyVideoPayload = {
  totalVideos: number;
  videos: Array<{ likedByMe: boolean; likes: number; path: string; src: string }>;
  votesEnabled: boolean;
};

const STORAGE_KEY = "ielts-vocabulary-learning-v1";
const SETTINGS_STORAGE_KEY = "ielts-vocabulary-learning-settings-v1";
const SETTINGS_UI_STORAGE_KEY = "ielts-vocabulary-learning-settings-ui-v1";
const REACTION_SETTINGS_MIGRATION_KEY = "ielts-vocabulary-reaction-defaults-10s-v1";
const STUDY_PAUSED_STORAGE_KEY = "ielts-vocabulary-learning-paused-v1";
const DAILY_ACTIVITY_STORAGE_KEY = "ielts-vocabulary-daily-activity-v1";
const GROUP_PROGRESS_KEY = "ielts-vocabulary-group-progress-v1";
const ACTIVE_GROUP_PROGRESS_KEY = "ielts-vocabulary-active-group-v1";
const GROUP_SIZE = VOCABULARY_GROUP_SIZE;
const DAILY_ENCOURAGEMENTS = ["又是元气满满的一天", "不积跬步，无以至千里", "今天的坚持，会成为明天的底气", "每记住一个词，世界就多开一扇窗"];
const QUALITY_NOTICE_BOOKS = ["地道表达", "俚语俗语"] as const;
const STUDY_MODE_OPTIONS: Array<{ category: ProgressCategory; index: number; label: string }> = [
  { category: "reading", index: 1, label: "阅读词汇" },
  { category: "listening", index: 0, label: "听力词汇" },
  { category: "speaking", index: 2, label: "口语词汇" },
  { category: "writing", index: 3, label: "写作词汇" },
];
const ALL_STUDY_MODES = STUDY_MODE_OPTIONS.map((option) => option.category);
const REACTION_TIME_OPTIONS: Array<{ category: ProgressCategory; label: string }> = [
  { category: "reading", label: "阅读" },
  { category: "listening", label: "听力" },
  { category: "speaking", label: "口语" },
  { category: "writing", label: "写作" },
];
const DEFAULT_REACTION_SECONDS: Record<ProgressCategory, number> = {
  reading: 10,
  speaking: 10,
  listening: 10,
  writing: 10,
};
const DEFAULT_STUDY_SETTINGS: StudySettings = {
  dailyNew: GROUP_SIZE,
  browseGroups: 1,
  reactionSeconds: DEFAULT_REACTION_SECONDS,
  method: "classified",
  modes: [...ALL_STUDY_MODES],
  reviewFamiliarities: [],
  reviewView: null,
  scope: "core",
  wordGroups: { core: null, all: null },
  voice: "us",
  order: "sequential",
  definitionLanguage: "zh",
  assessmentDefinitionLanguage: "zh",
  showExamples: true,
  showOptions: true,
  showPicture: true,
};
const COLLECTIONS: Array<{ key: CollectionKey; label: string }> = [
  { key: "familiar", label: "熟悉" },
  { key: "vague", label: "模糊" },
  { key: "unfamiliar", label: "生僻" },
];
const ORAL_FAMILIAR_SCORE = 80;
const ORAL_VAGUE_SCORE = 50;

function isQualityNoticeBook(book: string): boolean {
  return QUALITY_NOTICE_BOOKS.some((item) => item === book);
}

async function createDailySummaryImage(summary: DailySummary, message: string, capturedAt: Date) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器暂不支持生成图片。");
  await document.fonts?.ready;
  const { width, height } = canvas;
  context.fillStyle = "#f7f1e5";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#fffaf0";
  context.strokeStyle = "#e6d9bd";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(36, 36, width - 72, height - 72, 42);
  context.fill();
  context.stroke();

  const date = new Date(`${summary.date}T12:00:00`).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  context.fillStyle = "#367aa0";
  context.font = '700 30px "Songti SC", "Noto Serif SC", serif';
  context.fillText("每日词汇记录", 86, 112);
  context.fillStyle = "#777064";
  context.font = '24px "Songti SC", "Noto Serif SC", serif';
  context.fillText(`${date} · ${capturedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`, 86, 158);
  context.fillStyle = "#111";
  context.font = '700 58px "Songti SC", "Noto Serif SC", serif';
  context.fillText("今天的努力，看得见", 86, 248);

  const metrics = [
    ["学习组数", `${summary.groupsStudied} 组`],
    ["学习词汇", `${summary.studiedWords} 个`],
  ];
  metrics.forEach(([label, value], index) => {
    const x = index === 0 ? 86 : 548;
    const y = 294;
    context.fillStyle = "#f0f7f4";
    context.beginPath();
    context.roundRect(x, y, 446, 132, 22);
    context.fill();
    context.fillStyle = "#6e766f";
    context.font = '24px "Songti SC", "Noto Serif SC", serif';
    context.fillText(label, x + 28, y + 44);
    context.fillStyle = "#111";
    context.font = '700 38px "Songti SC", "Noto Serif SC", serif';
    context.fillText(value, x + 28, y + 98);
  });
  context.fillStyle = "#777064";
  context.font = '20px "Songti SC", "Noto Serif SC", serif';
  context.fillText("每组按 20 个词统计，不足 20 个词也计为一组。", 86, 466);

  const modes: Array<[DailyMode, string]> = [["reading", "阅读"], ["listening", "听力"], ["speaking", "口语"], ["writing", "写作"]];
  context.fillStyle = "#111";
  context.font = '700 30px "Songti SC", "Noto Serif SC", serif';
  context.fillText("各项练习熟悉度", 86, 526);
  const tableX = 86;
  const tableY = 552;
  const columnWidths = [282, 224, 224, 224];
  const rowHeight = 78;
  context.fillStyle = "#eaf1f5";
  context.beginPath();
  context.roundRect(tableX, tableY, 908, rowHeight * 5, 18);
  context.fill();
  context.fillStyle = "#245d7b";
  context.font = '700 23px "Songti SC", "Noto Serif SC", serif';
  ["练习方式", "熟悉", "模糊", "生僻"].forEach((label, column) => {
    context.textAlign = column === 0 ? "left" : "center";
    context.fillText(label, tableX + columnWidths.slice(0, column).reduce((sum, value) => sum + value, 0) + (column === 0 ? 24 : columnWidths[column] / 2), tableY + 48);
  });
  modes.forEach(([key, label], row) => {
    const y = tableY + rowHeight * (row + 1);
    context.strokeStyle = "#d5e3e9";
    context.beginPath();
    context.moveTo(tableX + 18, y);
    context.lineTo(tableX + 890, y);
    context.stroke();
    context.fillStyle = "#3f4843";
    context.font = '25px "Songti SC", "Noto Serif SC", serif';
    context.textAlign = "left";
    context.fillText(label, tableX + 24, y + 49);
    ["familiar", "vague", "unfamiliar"].forEach((outcome, column) => {
      const x = tableX + columnWidths[0] + columnWidths.slice(1, column + 1).reduce((sum, value) => sum + value, 0) + columnWidths[column + 1] / 2;
      context.textAlign = "center";
      context.fillText(String(summary.modeOutcomes[key][outcome as keyof DailySummary["modeOutcomes"][DailyMode]]), x, y + 49);
    });
  });

  context.fillStyle = "#367aa0";
  context.font = '700 34px "Songti SC", "Noto Serif SC", serif';
  const lines: string[] = [];
  let line = "";
  for (const character of message) {
    if (line && context.measureText(line + character).width > 900) {
      lines.push(line);
      line = character;
    } else line += character;
  }
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((value, index) => context.fillText(value, 86, 1050 + index * 42));
  context.fillStyle = "#777064";
  context.font = '22px "Songti SC", "Noto Serif SC", serif';
  context.fillText("今天的每一步，都在靠近更好的自己。", 86, 1190);

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图片生成失败，请重试。")), "image/png"));
  return new File([blob], `每日词汇记录-${summary.date}.png`, { type: "image/png" });
}

function downloadDailySummaryImage(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function emptyProgress(): ProgressEntry {
  return {
    completed: false,
    familiarity: null,
    lastOutcome: null,
    lastReviewedAt: null,
    modeIndex: 1,
    nextReviewAt: null,
    plan: "short-term",
    spellingErrorCount: 0,
    spellingHadError: false,
    spellingUnansweredCount: 0,
  };
}

function progressFor(store: ProgressStore, id: string) {
  return store[id] ?? emptyProgress();
}

function validDailyLimit(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 9999;
}

function validReactionSeconds(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 120;
}

function restoreReactionSeconds(value: unknown, migrateOldDefaults = false): Record<ProgressCategory, number> {
  const saved = value && typeof value === "object" ? value as Partial<Record<ProgressCategory, unknown>> : {};
  const restored = {
    reading: validReactionSeconds(saved.reading) ? saved.reading : DEFAULT_REACTION_SECONDS.reading,
    speaking: validReactionSeconds(saved.speaking) ? saved.speaking : DEFAULT_REACTION_SECONDS.speaking,
    listening: validReactionSeconds(saved.listening) ? saved.listening : DEFAULT_REACTION_SECONDS.listening,
    writing: validReactionSeconds(saved.writing) ? saved.writing : DEFAULT_REACTION_SECONDS.writing,
  };
  if (migrateOldDefaults) {
    if (restored.reading === 4) restored.reading = DEFAULT_REACTION_SECONDS.reading;
    if (restored.speaking === 4) restored.speaking = DEFAULT_REACTION_SECONDS.speaking;
    if (restored.listening === 4) restored.listening = DEFAULT_REACTION_SECONDS.listening;
  }
  return restored;
}

function toSettingsDraft(settings: StudySettings): StudySettingsDraft {
  return {
    ...settings,
    wordGroups: { ...settings.wordGroups },
    dailyNew: String(settings.dailyNew),
    browseGroups: String(settings.browseGroups),
    reactionSeconds: {
      reading: String(settings.reactionSeconds.reading),
      speaking: String(settings.reactionSeconds.speaking),
      listening: String(settings.reactionSeconds.listening),
      writing: String(settings.reactionSeconds.writing),
    },
    modes: [...settings.modes],
    reviewFamiliarities: [...settings.reviewFamiliarities],
  };
}

function parseSettingsDraft(draft: StudySettingsDraft): StudySettings | null {
  const browseGroups = Number(draft.browseGroups);
  if (!Number.isInteger(browseGroups) || browseGroups < 1 || browseGroups > 100) return null;
  const reactionSeconds = {
    reading: Number(draft.reactionSeconds.reading),
    speaking: Number(draft.reactionSeconds.speaking),
    listening: Number(draft.reactionSeconds.listening),
    writing: Number(draft.reactionSeconds.writing),
  };
  if (Object.values(reactionSeconds).some((seconds) => !validReactionSeconds(seconds))) return null;
  if (draft.modes.length === 0) return null;
  return {
    dailyNew: GROUP_SIZE,
    browseGroups,
    reactionSeconds,
    method: draft.method,
    modes: [...draft.modes],
    reviewFamiliarities: draft.method === "classified" ? [] : [...draft.reviewFamiliarities],
    reviewView: draft.method === "classified" ? null : draft.reviewView,
    scope: draft.scope,
    wordGroups: { core: vocabularyStudyGroupIndex(draft.wordGroups.core), all: vocabularyStudyGroupIndex(draft.wordGroups.all) },
    voice: draft.voice,
    order: draft.order,
    definitionLanguage: draft.definitionLanguage,
    assessmentDefinitionLanguage: draft.assessmentDefinitionLanguage,
    showExamples: draft.showExamples,
    showOptions: draft.showOptions,
    showPicture: draft.showPicture,
  };
}

function restoreStudyModes(value: unknown): ProgressCategory[] {
  if (!Array.isArray(value)) return [...ALL_STUDY_MODES];
  const selected = ALL_STUDY_MODES.filter((mode) => value.includes(mode));
  return selected;
}

function enabledModeIndices(settings: StudySettings) {
  return STUDY_MODE_OPTIONS.filter((option) => settings.modes.length === 0 || settings.modes.includes(option.category))
    .map((option) => option.index);
}

function restoreProgress(store: ProgressStore, migrateReviewSchedule = false): ProgressStore {
  return Object.fromEntries(Object.entries(store).map(([id, entry]) => {
    if (!entry) return [id, entry];
    // Earlier browse sessions used scored timestamps. Move browse-only history
    // out of the counters while preserving the day's loop on reload.
    const restored = entry.lastOutcome === "unscored" && !entry.familiarity
      ? {
          ...entry,
          browseFirstSeenAt: entry.browseFirstSeenAt ?? entry.firstLearnedAt ?? entry.lastReviewedAt,
          browseLastSeenAt: entry.browseLastSeenAt ?? entry.lastReviewedAt,
          firstLearnedAt: null,
          lastOutcome: null,
          lastReviewedAt: null,
          nextReviewAt: null,
        }
      : entry;
    const hadLegacyLongTermSchedule = restored.completed || restored.plan === "long-term" || restored.plan === "done";
    let normalized: ProgressEntry = restored.completed && restored.lastReviewedAt ? {
      ...restored,
      completed: false,
      plan: "long-term",
      reviewStep: restored.reviewStep ?? 4,
      nextReviewAt: restored.nextReviewAt ?? restored.lastReviewedAt + 30 * 24 * 60 * 60 * 1000,
    } : restored;
    if (migrateReviewSchedule && hadLegacyLongTermSchedule) {
      const legacyStep = normalized.reviewStep ?? 1;
      normalized = { ...normalized, plan: "long-term", reviewStep: Math.min(5, Math.max(1, legacyStep + 1)) };
    }
    return [id, normalized];
  })) as ProgressStore;
}

function familiarityForProgress(entry: ProgressEntry): Familiarity | null {
  if (entry.familiarity) return entry.familiarity;
  if (entry.lastOutcome && entry.lastOutcome !== "unscored") return entry.lastOutcome;
  return null;
}

function readFavoriteLearningWords(): FavoriteLearningWord[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITE_WORDS_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is FavoriteLearningWord => item && typeof item.id === "string" && typeof item.word === "string")
      : [];
  } catch {
    return [];
  }
}

const TODAY_PROGRESS_TABS: Array<{ key: ProgressCategory; label: string }> = [
  { key: "reading", label: "阅读模式" },
  { key: "listening", label: "听力模式" },
  { key: "speaking", label: "口语模式" },
  { key: "writing", label: "写作模式" },
];
const PROGRESS_VIEWS: Array<{ key: ProgressView; label: string }> = [
  { key: "today", label: "今日进度" },
  { key: "overall", label: "整体进度" },
];

function progressCategoryForMode(modeIndex: number): ProgressCategory {
  if (modeIndex === 0) return "listening";
  if (modeIndex === 2) return "speaking";
  if (modeIndex === 3) return "writing";
  return "reading";
}

function isReviewedToday(timestamp: number | null, now: number) {
  if (!timestamp) return false;
  const value = new Date(timestamp);
  const today = new Date(now);
  return value.getFullYear() === today.getFullYear()
    && value.getMonth() === today.getMonth()
    && value.getDate() === today.getDate();
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function normalizeSpokenWord(value: string) {
  return value.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      current.push(Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + substitutionCost,
      ));
    }
    for (let index = 0; index < current.length; index += 1) previous[index] = current[index];
  }
  return previous[right.length];
}

function scoreSpokenWord(transcript: string, target: string) {
  const targetWord = normalizeSpokenWord(target);
  const spokenWords = normalizeSpokenWord(transcript).split(" ").filter(Boolean);
  if (!targetWord || spokenWords.length === 0) return 0;

  return spokenWords.reduce((best, spokenWord) => {
    if (spokenWord === targetWord) return 100;
    const distance = levenshteinDistance(spokenWord, targetWord);
    const similarity = Math.max(0, 1 - distance / Math.max(spokenWord.length, targetWord.length));
    return Math.max(best, Math.round(similarity * 100));
  }, 0);
}

function familiarityFromScore(score: number): Familiarity {
  if (score >= ORAL_FAMILIAR_SCORE) return "familiar";
  if (score >= ORAL_VAGUE_SCORE) return "vague";
  return "unfamiliar";
}

function splitDefinitionLines(value: string) {
  const lines = value
    .split(/\s*\/\s*(?=[a-z]+(?:\.[a-z]+)*\.\s*)/i)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : [value];
}

const DEFINITION_PART_OF_SPEECH_PREFIX = /^((?:n|v|vt|vi|adj|adv|pron|prep|conj|interj|int|aux|art|num|det|abbr|phr)\.(?:\s*&\s*(?:n|v|vt|vi|adj|adv|pron|prep|conj|interj|int|aux|art|num|det|abbr|phr)\.)*\s*)/i;
const DEFINITION_ENGLISH_TOKEN = /([\p{Script=Latin}]+(?:[’'.-][\p{Script=Latin}]+)*)/u;

function DefinitionDisplay({
  answer,
  englishDefinitions,
  language,
  value,
  prominent = false,
}: {
  answer: string;
  englishDefinitions: string[];
  language: AssessmentDefinitionLanguage;
  value: string;
  prominent?: boolean;
}) {
  const englishLines = englishDefinitions
    .flatMap((definition) => definition.replace(/\\n/g, "\n").split(/\n+/))
    .map((line) => line.trim())
    .filter(Boolean);
  // English mode must never fall back to the Chinese prompt while the detail
  // request is still loading. An empty English list therefore renders an
  // empty prompt for the moment instead of flashing the wrong language.
  const showEnglish = language === "en";
  const lines = showEnglish ? englishLines : splitDefinitionLines(getConciseStudyDefinition(value));
  const normalizedAnswer = (answer ?? "").trim().toLowerCase();

  return (
    <div className={`vocabulary-card-definition${prominent ? " prominent" : ""}`}>
      {lines.map((line, index) => {
        const prefix = line.match(DEFINITION_PART_OF_SPEECH_PREFIX)?.[0] ?? "";
        const parts = line.slice(prefix.length).split(DEFINITION_ENGLISH_TOKEN);
        const hasBlurredContent = parts.some((part, partIndex) => partIndex % 2 === 1
          && (!showEnglish || part.toLowerCase() === normalizedAnswer));

        return (
          <div className={`vocabulary-card-definition-line${prefix ? "" : " no-part-of-speech"}`} key={`${line}-${index}`}>
            {prefix ? <strong>{prefix}</strong> : null}
            <span>
              {parts.map((part, partIndex) => partIndex % 2 === 0 || (showEnglish && part.toLowerCase() !== normalizedAnswer)
                ? part
                : <span aria-hidden="true" className="vocabulary-card-definition-english-blurred" key={partIndex}>{part}</span>)}
              {hasBlurredContent ? <span className="sr-only">{showEnglish ? "提示中的目标单词已模糊" : "英文内容已模糊"}</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function toLookupEntry(word: LearningWord): LocalVocabularyEntry {
  return {
    antonyms: word.antonyms,
    definitionCn: word.definitionCn,
    definitionGroups: word.definitionGroups,
    definitionLines: word.definitionLines,
    englishDefinitions: word.englishDefinitions,
    englishExamples: word.englishExamples,
    extension: word.extension,
    etymologyReferences: [],
    etymologySource: word.etymologySource,
    etymologyStory: word.etymologyStory,
    formation: word.formation,
    inflections: word.inflections,
    level: word.level,
    normalizedWord: isSupplementalLearningBook(word.level)
      ? word.word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "")
      : word.id,
    partOfSpeech: word.partOfSpeech,
    phonetic: word.phonetic,
    reviewNotes: word.reviewNotes,
    root: word.root,
    rootReferences: [],
    sourceRowNumber: 0,
    synonyms: word.synonyms,
    ukAudioUrl: word.ukAudioUrl,
    ukPhonetic: word.ukPhonetic,
    usAudioUrl: word.usAudioUrl,
    usPhonetic: word.usPhonetic,
    word: word.word,
  };
}

function loadPhraseUsageScenarios(book: string) {
  switch (book) {
    case "高中短语":
      return import("@/data/vocabulary/graded-phrase-scenarios.json");
    case "地道表达":
      return import("@/data/vocabulary/idiomatic-expression-scenarios.json");
    default:
      return null;
  }
}

function LookupDetails({ word }: { word: LearningWord }) {
  const definitionGroups = word.definitionGroups.length > 0
    ? word.definitionGroups
    : [{
        definitions: word.definitionLines.length > 0 ? word.definitionLines : splitDefinitionLines(word.definitionCn),
        partOfSpeech: word.partOfSpeech,
        text: word.definitionCn,
      }];

  return (
    <div className="vocabulary-learning-lookup-details vocabulary-detail-content">
      <section className="word-detail-section vocabulary-lookup-section">
        <h2>中文释义</h2>
        <div className="definition-rows large vocabulary-lookup-definition-list">
          {definitionGroups.map((group, index) => (
            <p className={group.partOfSpeech ? undefined : "no-part-of-speech"} key={`${group.partOfSpeech}-${index}`}>
              {group.partOfSpeech ? <strong>{group.partOfSpeech}</strong> : null}
              <span>{group.definitions.join("；") || group.text}</span>
            </p>
          ))}
        </div>
      </section>

      {word.englishDefinitions.length > 0 ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>英文释义</h2>
          <div className="english-definition-list vocabulary-lookup-lines">
            {word.englishDefinitions.map((definition, index) => <p key={`${definition}-${index}`}>{definition}</p>)}
          </div>
        </section>
      ) : null}

      {word.inflections.length > 0 ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>词形变化</h2>
          <div className="word-inflection-grid vocabulary-lookup-inflections">
            {word.inflections.map((inflection) => (
              <span key={`${inflection.label}-${inflection.value}`}><b>{inflection.label}</b><strong>{inflection.value}</strong></span>
            ))}
          </div>
        </section>
      ) : null}

      {word.synonyms.length > 0 || word.antonyms.length > 0 ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>近义词与反义词</h2>
          <div className="vocabulary-lookup-lines">
            {word.synonyms.length > 0 ? <p><b>近义词</b>{word.synonyms.join("、")}</p> : null}
            {word.antonyms.length > 0 ? <p><b>反义词</b>{word.antonyms.join("、")}</p> : null}
          </div>
        </section>
      ) : null}

      {word.etymologyStory ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>词源故事</h2>
          <div className="vocabulary-lookup-lines">
            <p>{word.etymologyStory}</p>
          </div>
        </section>
      ) : null}

      {word.formation || word.root ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>词根树</h2>
          <div className="vocabulary-lookup-lines">
            {word.formation ? <p><b>构词</b>{word.formation}</p> : null}
            {word.root ? <p><b>词根</b>{word.root}</p> : null}
          </div>
        </section>
      ) : null}

      {word.etymologySource ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>词源来源</h2>
          <div className="vocabulary-lookup-lines">
            <p className="vocabulary-lookup-muted">{word.etymologySource}</p>
          </div>
        </section>
      ) : null}

      {word.reviewNotes.length > 0 ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>温故知新</h2>
          <div className="vocabulary-lookup-lines">
            {word.reviewNotes.map((note, index) => <p key={`${note}-${index}`}>{note}</p>)}
          </div>
        </section>
      ) : null}
    </div>
  );
}

type VocabularyListDisplayField = "word" | "phonetics" | "meaning";
type VocabularyListHiddenFields = Record<VocabularyListDisplayField, boolean>;

function shuffleVocabularyListIndices(indices: number[]) {
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[randomIndex]] = [indices[randomIndex], indices[index]];
  }
  return indices;
}

function getVocabularyListMeaning(word: LearningWord, language: DefinitionLanguage) {
  if (word.word.trim().toLocaleLowerCase() === "am") {
    return language === "en" ? "first-person singular form of be" : "（我）是";
  }
  if (language === "en") {
    const definition = word.englishDefinitions.find((line) => line.trim())?.trim();
    return definition?.split(/\n+/)[0] || "暂无英文释义";
  }
  const sourceDefinition = word.definitionCn.replace(/\\n/g, "\n");
  const hasAbbreviationSense = /(?:^|\n)\s*abbr\.\s*/i.test(sourceDefinition);
  const displayDefinition = hasAbbreviationSense
    ? sourceDefinition.split(/\n+/).filter((line) => !/^\s*abbr\.\s*/i.test(line)).join("\n")
    : sourceDefinition;
  const selectedDefinition = getDefinitionOptionText(displayDefinition) || getConciseStudyDefinition(displayDefinition);
  const firstLine = selectedDefinition.split(/\n+/)[0]?.trim();
  const conciseMeaning = hasAbbreviationSense
    ? firstLine?.replace(/^(?:n|v|vt|vi|adj|adv|pron|prep|conj|interj|int|aux|art|num|det|phr)\.\s*/i, "")
    : firstLine;
  return conciseMeaning?.split(/[；;]/, 1)[0]?.trim() || "暂无释义";
}

function getVocabularyListAnswer(word: LearningWord, field: Exclude<VocabularyListDisplayField, "phonetics">, language: DefinitionLanguage) {
  if (field === "word") return [word.word];
  if (language === "en") return word.englishDefinitions.map((value) => value.trim()).filter(Boolean).slice(0, 1);
  const meaning = getVocabularyListMeaning(word, "zh").replace(/^(?:(?:n|v|vt|vi|adj|adv|pron|prep|conj|interj|int|aux|art|num|det|abbr|phr)\.(?:\s*&\s*(?:n|v|vt|vi|adj|adv|pron|prep|conj|interj|int|aux|art|num|det|abbr|phr)\.)*\s*)/i, "").trim();
  return meaning ? [meaning] : [];
}

function normalizeVocabularyListAnswer(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/[\s\p{P}\p{S}\p{Cf}]/gu, "");
}

function VocabularyListClozeInput({
  answers,
  inputRef,
  label,
  onChange,
  onBlur,
  onEnter,
  revealedAnswer,
  answerSubmitted = false,
  answerCorrect,
  variant,
  value,
}: {
  answers: string[];
  inputRef: (node: HTMLInputElement | null) => void;
  label: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onEnter: () => void;
  revealedAnswer?: string;
  answerSubmitted?: boolean;
  answerCorrect?: boolean;
  variant: "word" | "definition";
  value: string;
}) {
  const answerStateClass = answerSubmitted ? (answerCorrect ? " is-answer-correct" : " is-answer-wrong") : "";

  return (
    <span className={`vocabulary-learning-list-cloze${variant === "word" ? " vocabulary-learning-list-cloze-word" : ""}${answerSubmitted ? " is-answer-submitted" : ""}${answerStateClass}`}>
      <span aria-hidden="true" className="vocabulary-learning-list-cloze-measure">
        {value || <span className="vocabulary-learning-list-cloze-placeholder">　</span>}
        {revealedAnswer ? <><span className="vocabulary-learning-list-cloze-separator"> / </span><span className="vocabulary-learning-list-cloze-expected">{revealedAnswer}</span></> : null}
      </span>
      <span aria-hidden="true" className="vocabulary-learning-list-cloze-letters">
        {value
          ? [...value].map((letter, index) => {
              const isRight = answers.some((answer) => answer[index]?.toLocaleLowerCase() === letter.toLocaleLowerCase());
              return <span className={isRight ? "is-correct" : "is-wrong"} key={`${index}-${letter}`}>{letter}</span>;
            })
          : <span className="vocabulary-learning-list-cloze-placeholder">　</span>}
        {revealedAnswer ? <><span className="vocabulary-learning-list-cloze-separator"> / </span><span className="vocabulary-learning-list-cloze-expected">{revealedAnswer}</span></> : null}
      </span>
      <input
        aria-label={label}
        autoComplete="off"
        autoCapitalize="off"
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={(event) => {
          // This field accepts English spelling, so Enter always submits it;
          // mobile IMEs often mark that action as composing.
          if (event.key === "Enter" || event.keyCode === 13) {
            event.preventDefault();
            onEnter();
          }
        }}
        ref={inputRef}
        spellCheck={false}
        type="text"
        value={value}
      />
    </span>
  );
}

function VocabularyStudyList({
  bookLabel,
  language,
  mode,
  reactionSeconds,
  returnTo,
  voice,
  words,
}: {
  bookLabel: string;
  language: DefinitionLanguage;
  mode: ProgressCategory;
  reactionSeconds: number;
  returnTo: string;
  voice: Voice;
  words: LearningWord[];
}) {
  const [hiddenFields, setHiddenFields] = useState<VocabularyListHiddenFields>({
    word: mode === "writing" || mode === "speaking",
    phonetics: mode === "speaking",
    meaning: mode === "reading",
  });
  const [showMenuOpen, setShowMenuOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [listeningTargetId, setListeningTargetId] = useState<string | null>(null);
  const [listeningFeedback, setListeningFeedback] = useState<{ wordId: string; correct: boolean } | null>(null);
  const [speakingStarted, setSpeakingStarted] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(0);
  const [speakingRevealed, setSpeakingRevealed] = useState(false);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const viewportCleanupRef = useRef<(() => void) | null>(null);
  const displayMenuRef = useRef<HTMLDivElement | null>(null);
  const listeningTimerRef = useRef<number | null>(null);
  const listeningTargetRef = useRef<string | null>(null);
  const listeningPreviousRef = useRef<string | null>(null);
  const nextListeningRoundRef = useRef<() => void>(() => undefined);
  const speakingTimerRef = useRef<number | null>(null);
  const speakingRunRef = useRef(0);
  const speakingQueueRef = useRef<number[]>([]);
  const displayLanguage: DefinitionLanguage = mode === "listening" || mode === "speaking" ? "zh" : language;
  const answerColumnTitle = displayLanguage === "zh" ? "中文释义" : "英文释义";
  const showPhoneticsColumn = mode === "speaking" || !hiddenFields.phonetics;
  const activeAnswerField: Exclude<VocabularyListDisplayField, "phonetics"> | null = mode === "reading" ? "meaning" : mode === "writing" ? "word" : null;

  useEffect(() => {
    if ((mode === "reading" || mode === "writing") && window.matchMedia("(max-width: 680px)").matches) {
      setHiddenFields((current) => current.phonetics ? current : { ...current, phonetics: true });
    }
  }, [mode]);

  useEffect(() => () => viewportCleanupRef.current?.(), []);

  const setAnswer = (wordId: string, value: string) => {
    setAnswers((current) => ({ ...current, [wordId]: value }));
    setSubmitted((current) => ({ ...current, [wordId]: false }));
  };

  const focusNextRow = (index: number) => {
    for (let nextIndex = index + 1; nextIndex < words.length; nextIndex += 1) {
      const nextWord = words[nextIndex];
      if (activeAnswerField === "meaning" && hiddenFields.meaning && getVocabularyListAnswer(nextWord, "meaning", language).length === 0) continue;
      if (activeAnswerField === "word" && hiddenFields.word && getVocabularyListAnswer(nextWord, "word", language).length === 0) continue;
      window.requestAnimationFrame(() => {
        const nextInput = inputRefs.current.get(nextWord.id);
        if (!nextInput) return;
        viewportCleanupRef.current?.();
        const isMobile = window.matchMedia("(max-width: 680px)").matches;
        const visualViewport = window.visualViewport;
        const timers: number[] = [];
        const keepInputAboveKeyboard = () => {
          if (!nextInput.isConnected || (isMobile && document.activeElement !== nextInput)) return;
          const viewportTop = visualViewport?.offsetTop ?? 0;
          const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight);
          const rect = nextInput.getBoundingClientRect();
          const margin = 28;
          let scrollDelta = rect.bottom > viewportBottom - margin
            ? rect.bottom - viewportBottom + margin
            : rect.top < viewportTop + margin
              ? rect.top - viewportTop - margin
              : 0;
          if (mode === "writing" && window.matchMedia("(max-width: 1024px) and (pointer: coarse)").matches) {
            const thirdUpcomingWord = words[Math.min(nextIndex + 2, words.length - 1)];
            const thirdUpcomingInput = thirdUpcomingWord ? inputRefs.current.get(thirdUpcomingWord.id) : null;
            const thirdUpcomingRow = thirdUpcomingInput?.closest("tr");
            const thirdUpcomingBottom = thirdUpcomingRow?.getBoundingClientRect().bottom;
            if (thirdUpcomingBottom !== undefined && thirdUpcomingBottom > viewportBottom - margin) {
              scrollDelta = Math.max(scrollDelta, thirdUpcomingBottom - viewportBottom + margin);
            }
          }
          if (!scrollDelta) return;

          for (let parent = nextInput.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
            const overflowY = window.getComputedStyle(parent).overflowY;
            if (/(auto|scroll)/.test(overflowY) && parent.scrollHeight > parent.clientHeight + 1) {
              parent.scrollTop += scrollDelta;
              return;
            }
          }
          if (isMobile) window.scrollBy({ top: scrollDelta });
          else window.scrollBy({ top: scrollDelta, behavior: "smooth" });
        };

        if (!isMobile) {
          nextInput.focus({ preventScroll: true });
          [80, 180, 320, 480].forEach((delay) => window.setTimeout(keepInputAboveKeyboard, delay));
          return;
        }

        const cleanup = () => {
          visualViewport?.removeEventListener("resize", keepInputAboveKeyboard);
          visualViewport?.removeEventListener("scroll", keepInputAboveKeyboard);
          window.removeEventListener("resize", keepInputAboveKeyboard);
          nextInput.removeEventListener("blur", cleanup);
          timers.forEach((timer) => window.clearTimeout(timer));
          if (viewportCleanupRef.current === cleanup) viewportCleanupRef.current = null;
        };
        viewportCleanupRef.current = cleanup;
        visualViewport?.addEventListener("resize", keepInputAboveKeyboard);
        visualViewport?.addEventListener("scroll", keepInputAboveKeyboard);
        window.addEventListener("resize", keepInputAboveKeyboard);
        nextInput.addEventListener("blur", cleanup, { once: true });
        nextInput.focus({ preventScroll: true });
        nextInput.scrollIntoView({ block: "center", inline: "nearest" });
        keepInputAboveKeyboard();

        // Mobile keyboards resize the visual viewport asynchronously. Recheck
        // after the keyboard animation so the focused row remains visible.
        [80, 180, 320, 520, 800].forEach((delay) => {
          timers.push(window.setTimeout(keepInputAboveKeyboard, delay));
        });
      });
      return;
    }
  };

  const toggleDisplayField = (field: VocabularyListDisplayField) => {
    setHiddenFields((current) => {
      const visibleCount = Object.values(current).filter((hidden) => !hidden).length;
      if (!current[field] && visibleCount <= 1) return current;
      return { ...current, [field]: !current[field] };
    });
    setAnswers({});
    setSubmitted({});
    setShowMenuOpen(false);
  };

  const showDisplayOptions = () => {
    setShowMenuOpen((open) => !open);
  };

  useEffect(() => {
    if (!showMenuOpen) return;
    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !displayMenuRef.current?.contains(event.target)) {
        setShowMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
  }, [showMenuOpen]);

  const handleLetterEnter = (word: LearningWord, index: number) => {
    setSubmitted((current) => ({ ...current, [word.id]: true }));
    if (mode === "writing" && window.matchMedia("(pointer: coarse)").matches) {
      unlockLearningAudio();
      void playWordAudio(word, voice, 1).catch(() => undefined);
    }
    focusNextRow(index);
  };

  const finishListeningRound = useCallback((selectedWordId: string | null) => {
    const targetWordId = listeningTargetRef.current;
    if (!targetWordId) return;
    if (listeningTimerRef.current !== null) window.clearTimeout(listeningTimerRef.current);
    stopLearningAudio();
    listeningTargetRef.current = null;
    setListeningTargetId(null);
    const correct = selectedWordId === targetWordId;
    setListeningFeedback({ wordId: selectedWordId ?? targetWordId, correct });
    if (!correct) void playSpellingFeedbackSound(false);
    listeningTimerRef.current = window.setTimeout(() => {
      setListeningFeedback(null);
      nextListeningRoundRef.current();
    }, 2000);
  }, []);

  const startListeningRound = useCallback(() => {
    if (mode !== "listening" || words.length === 0 || listeningTargetRef.current) return;
    const candidates = words.filter((word) => word.id !== listeningPreviousRef.current);
    const pool = candidates.length > 0 ? candidates : words;
    const target = pool[Math.floor(Math.random() * pool.length)];
    if (!target) return;
    listeningPreviousRef.current = target.id;
    listeningTargetRef.current = target.id;
    setListeningTargetId(target.id);
    setListeningFeedback(null);
    void playWordAudio(target, voice, 1);
    listeningTimerRef.current = window.setTimeout(() => finishListeningRound(null), reactionSeconds * 1000);
  }, [finishListeningRound, mode, reactionSeconds, voice, words]);

  nextListeningRoundRef.current = startListeningRound;

  useEffect(() => {
    if (mode !== "listening" || words.length === 0) return;
    unlockLearningAudio();
    startListeningRound();
    return () => {
      if (listeningTimerRef.current !== null) window.clearTimeout(listeningTimerRef.current);
      listeningTimerRef.current = null;
      listeningTargetRef.current = null;
    };
  }, [mode, startListeningRound, words.length]);

  const chooseListeningWord = (wordId: string) => {
    if (!listeningTargetRef.current) return;
    finishListeningRound(wordId);
  };

  const runSpeakingCycleRef = useRef<(rowIndex: number, runId: number) => void>(() => undefined);
  const runSpeakingCycle = useCallback((rowIndex: number, runId: number) => {
    const word = words[rowIndex];
    if (mode !== "speaking" || !word || runId !== speakingRunRef.current) return;

    setSpeakingIndex(rowIndex);
    setSpeakingRevealed(false);
    speakingTimerRef.current = window.setTimeout(() => {
      if (runId !== speakingRunRef.current) return;
      setSpeakingRevealed(true);
      void playWordAudio(word, voice, 1).catch(() => undefined).then(() => {
        if (runId !== speakingRunRef.current) return;
        speakingTimerRef.current = window.setTimeout(() => {
          if (runId !== speakingRunRef.current) return;
          setSpeakingRevealed(false);
          stopLearningAudio();
          const candidates = speakingQueueRef.current.filter((index) => index < words.length);
          if (candidates.length === 0) {
            candidates.push(...shuffleVocabularyListIndices(words.map((_, index) => index).filter((index) => index !== rowIndex)));
          }
          const nextIndex = candidates.shift() ?? rowIndex;
          speakingQueueRef.current = candidates;
          runSpeakingCycleRef.current(nextIndex, runId);
        }, 3000);
      });
    }, reactionSeconds * 1000);
  }, [mode, reactionSeconds, voice, words]);
  runSpeakingCycleRef.current = runSpeakingCycle;

  const speakingWordsKey = words.map((word) => word.id).join("\u001f");
  useEffect(() => {
    if (mode !== "speaking" || words.length === 0) return;
    unlockLearningAudio();
    speakingRunRef.current += 1;
    const runId = speakingRunRef.current;
    const firstIndex = Math.floor(Math.random() * words.length);
    speakingQueueRef.current = shuffleVocabularyListIndices(words.map((_, index) => index).filter((index) => index !== firstIndex));
    setSpeakingIndex(firstIndex);
    setSpeakingRevealed(false);
    setSpeakingStarted(true);
    runSpeakingCycleRef.current(firstIndex, runId);
    return () => {
      speakingRunRef.current += 1;
      if (speakingTimerRef.current !== null) window.clearTimeout(speakingTimerRef.current);
      speakingTimerRef.current = null;
      stopLearningAudio();
    };
  }, [mode, reactionSeconds, speakingWordsKey, words.length]);

  useEffect(() => () => {
    if (listeningTimerRef.current !== null) window.clearTimeout(listeningTimerRef.current);
  }, []);

  const hiddenCount = Object.values(hiddenFields).filter(Boolean).length;
  const isChineseMeaning = activeAnswerField === "meaning" && hiddenFields.meaning && displayLanguage === "zh";
  const listeningChoiceLabel = [
    !hiddenFields.word ? "词汇" : null,
    !hiddenFields.phonetics ? "音标" : null,
    !hiddenFields.meaning ? "中文释义" : null,
  ].filter((label): label is string => label !== null).join("、");
  const speakingFitPage = mode === "speaking" && words.length <= 20;
  const compactListFitPage = mode !== "speaking" && words.length <= 20;

  return (
    <section aria-label={`${bookLabel}词汇列表`} className={`vocabulary-learning-list-mode${speakingFitPage ? " is-speaking-fit-page" : ""}${compactListFitPage ? " is-tablet-desktop-fit-page" : ""}`} data-mode={mode} onPointerDownCapture={() => {
      if (mode === "speaking" || mode === "listening") unlockLearningAudio();
    }}>
      <div className={`vocabulary-learning-list-toolbar${mode === "speaking" ? " is-speaking" : ""}`}>
        <div className="vocabulary-learning-list-head">
          <div className="vocabulary-learning-list-actions">
            <div className="vocabulary-learning-list-display-menu" ref={displayMenuRef}>
              <button aria-expanded={showMenuOpen} onClick={showDisplayOptions} type="button">显示 <span aria-hidden="true" className="vocabulary-learning-list-display-caret">⌄</span></button>
              {showMenuOpen ? (
                <div aria-label="列表显示内容" className="vocabulary-learning-list-display-options" role="group">
                  <label><input checked={!hiddenFields.word} disabled={mode === "speaking" || (hiddenCount >= 2 && !hiddenFields.word)} onChange={() => toggleDisplayField("word")} type="checkbox" />词汇</label>
                  <label><input checked={!hiddenFields.phonetics} disabled={mode === "speaking" || (hiddenCount >= 2 && !hiddenFields.phonetics)} onChange={() => toggleDisplayField("phonetics")} type="checkbox" />音标</label>
                  <label><input checked={!hiddenFields.meaning} disabled={mode === "speaking" || (hiddenCount >= 2 && !hiddenFields.meaning)} onChange={() => toggleDisplayField("meaning")} type="checkbox" />释义</label>
                </div>
              ) : null}
            </div>
            <button className="vocabulary-learning-list-export" onClick={() => window.print()} type="button">导出 PDF</button>
          </div>
        </div>
        {mode === "listening" ? <p aria-live="polite" className="vocabulary-learning-list-practice-status"><span className="vocabulary-learning-list-practice-status-desktop">正在随机播放词汇发音，请在 {reactionSeconds} 秒内点击对应的{listeningChoiceLabel}。{listeningFeedback ? listeningFeedback.correct ? " 正确" : " 错误" : ""}</span><span className="vocabulary-learning-list-practice-status-mobile">正在随机播放词汇发音。请在10秒钟内点击对应的中文释义。</span></p> : null}
        {mode === "speaking" ? <p aria-live="polite" className="vocabulary-learning-list-practice-status">请在 {reactionSeconds} 秒内根据释义说出单词，之后显示词汇和音标并播放正确发音，3 秒后进入下一词。</p> : null}
      </div>
      <div className="vocabulary-learning-list-table-wrap">
        <table className={`vocabulary-learning-list-table${showPhoneticsColumn ? " has-phonetics" : ""}`}>
          {!speakingFitPage ? <thead><tr><th aria-label="序号" className="vocabulary-learning-list-index-heading" scope="col"><span>序号</span></th><th scope="col">词汇</th>{showPhoneticsColumn ? <th scope="col">音标</th> : null}<th scope="col">{answerColumnTitle}</th></tr></thead> : null}
          <tbody>
            {words.map((word, index) => {
              const meaning = getVocabularyListMeaning(word, displayLanguage);
              const meaningAnswers = getVocabularyListAnswer(word, "meaning", displayLanguage);
              const wordAnswer = answers[word.id] ?? "";
              const expectedWord = getVocabularyListAnswer(word, "word", displayLanguage);
              const submittedAnswer = submitted[word.id] === true;
              const writingAnswerIsCorrect = expectedWord.some((answer) => normalizeVocabularyListAnswer(wordAnswer) === normalizeVocabularyListAnswer(answer));
              const writingAnswerCanStillMatch = expectedWord.some((answer) => normalizeVocabularyListAnswer(answer).startsWith(normalizeVocabularyListAnswer(wordAnswer)));
              const writingAnswerShouldReveal = mode === "writing" && !writingAnswerIsCorrect && (submittedAnswer || (Boolean(wordAnswer) && !writingAnswerCanStillMatch));
              const normalizedReadingAnswer = normalizeVocabularyListAnswer(wordAnswer);
              const readingMeaningIsCorrect = meaningAnswers.some((answer) => {
                const normalizedMeaning = normalizeVocabularyListAnswer(answer);
                const normalizedCoreMeaning = normalizeVocabularyListAnswer(answer.replace(/[（(][^）)]*[）)]/g, ""));
                return normalizedReadingAnswer === normalizedMeaning || normalizedReadingAnswer === normalizedCoreMeaning;
              });
              const normalizedMeaningCandidates = meaningAnswers.flatMap((answer) => [
                normalizeVocabularyListAnswer(answer),
                normalizeVocabularyListAnswer(answer.replace(/[（(][^）)]*[）)]/g, "")),
              ]).filter(Boolean);
              const readingMeaningCanStillMatch = normalizedMeaningCandidates.some((answer) => answer.startsWith(normalizedReadingAnswer));
              const readingMeaningIsWrongSoFar = normalizedReadingAnswer.length > 0 && !readingMeaningCanStillMatch;
              const listeningMeaningFeedback = listeningFeedback?.wordId === word.id ? listeningFeedback : null;
              const isSpeakingTarget = mode === "speaking" && speakingStarted && speakingIndex === index;
              const listeningResultClass = listeningMeaningFeedback ? listeningMeaningFeedback.correct ? "is-listening-correct" : "is-listening-wrong" : "";
              const rowClassName = [mode === "listening" ? "is-listening-choice" : "", listeningResultClass, isSpeakingTarget ? "is-speaking-target" : "", isSpeakingTarget && speakingRevealed ? "is-speaking-revealed" : ""].filter(Boolean).join(" ");
              return (
                <tr
                  aria-label={mode === "listening" ? `选择第 ${index + 1} 行：${word.word}` : undefined}
                  className={rowClassName || undefined}
                  key={word.id}
                  onClick={mode === "listening" ? () => chooseListeningWord(word.id) : undefined}
                  onKeyDown={mode === "listening" ? (event) => {
                    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                    event.preventDefault();
                    chooseListeningWord(word.id);
                  } : undefined}
                  tabIndex={mode === "listening" ? 0 : undefined}
                >
                  <td className="vocabulary-learning-list-index">{index + 1}</td>
                  <td className={`vocabulary-learning-list-word${mode === "writing" && submittedAnswer ? " has-writing-answer" : ""}`}>
                    {mode === "speaking" ? speakingRevealed && isSpeakingTarget ? (
                      <span className="vocabulary-learning-list-speaking-reveal-text">{word.word}</span>
                    ) : (
                      <span aria-label="词汇暂时隐藏" className="vocabulary-learning-list-speaking-hidden" />
                    ) : hiddenFields.word && activeAnswerField === "word" ? (
                      <div className="vocabulary-learning-list-letter-answer">
                        <VocabularyListClozeInput
                          answers={expectedWord}
                          inputRef={(node) => { if (node) inputRefs.current.set(word.id, node); else inputRefs.current.delete(word.id); }}
                          label={`第 ${index + 1} 行词汇`}
                          onChange={(value) => setAnswer(word.id, value)}
                          onBlur={() => {
                            if (window.matchMedia("(max-width: 680px)").matches && wordAnswer.trim()) {
                              setSubmitted((current) => ({ ...current, [word.id]: true }));
                            }
                          }}
                          onEnter={() => handleLetterEnter(word, index)}
                          revealedAnswer={mode === "writing" && submittedAnswer && !writingAnswerIsCorrect ? expectedWord[0] : undefined}
                          answerSubmitted={mode === "writing" && submittedAnswer}
                          answerCorrect={mode === "writing" ? writingAnswerIsCorrect : undefined}
                          variant="word"
                          value={wordAnswer}
                        />
                        {writingAnswerShouldReveal ? (
                          <span aria-live="polite" className="vocabulary-learning-list-writing-answer-reveal">{expectedWord[0]}</span>
                        ) : null}
                        {mode === "writing" && submittedAnswer ? <span aria-live="polite" className="sr-only">正确拼写：{expectedWord[0]}</span> : null}
                      </div>
                    ) : hiddenFields.word ? (
                      <span aria-label="词汇已隐藏" className="vocabulary-learning-list-speaking-hidden" />
                    ) : mode === "listening" ? (
                      <button aria-label={`选择词汇：${word.word}`} className="vocabulary-learning-list-speaking-choice" disabled={!listeningTargetId} type="button">{word.word}</button>
                    ) : <Link className="vocabulary-learning-list-word-link" href={`/vocabulary/${encodeURIComponent(word.word)}?${new URLSearchParams({ returnTo })}`}>{word.word}</Link>}
                  </td>
                  {showPhoneticsColumn ? (
                    <td className="vocabulary-learning-list-phonetic">
                      {mode === "speaking" ? (
                        speakingRevealed && isSpeakingTarget
                          ? <span className="vocabulary-learning-list-speaking-reveal-text">{getStudyPhonetic(word, voice) || "—"}</span>
                          : <span aria-label="音标暂时隐藏" className="vocabulary-learning-list-speaking-hidden" />
                      ) : mode === "listening" ? (
                        <button
                          aria-label={`选择音标：${word.word}`}
                          className="vocabulary-learning-list-speaking-choice"
                          disabled={!listeningTargetId}
                          type="button"
                        >{getStudyPhonetic(word, voice) || "—"}</button>
                      ) : <span>{getStudyPhonetic(word, voice) || "—"}</span>}
                      {mode !== "speaking" ? <button
                        aria-label={`播放 ${word.word} ${voice === "uk" ? "英音" : "美音"}`}
                        className="pronunciation-wave vocabulary-learning-list-pronunciation"
                        onClick={() => playVocabularyPronunciation({ accent: voice, audioUrl: voice === "uk" ? word.ukAudioUrl : word.usAudioUrl, word: word.word })}
                        type="button"
                      ><svg aria-hidden="true" className="pronunciation-wave-icon" viewBox="0 0 18 24"><path d="M6.2 7.4c1.4 1.1 2.2 2.7 2.2 4.6s-.8 3.5-2.2 4.6" /><path d="M11.1 4.4c2.3 1.9 3.7 4.6 3.7 7.6s-1.4 5.7-3.7 7.6" /></svg></button> : null}
                    </td>
                  ) : null}
                  <td className="vocabulary-learning-list-meaning">
                    {mode === "speaking" ? (
                      <span className={`vocabulary-learning-list-speaking-meaning${isSpeakingTarget ? " is-current" : ""}`}>{meaning}</span>
                    ) : hiddenFields.meaning && activeAnswerField !== "meaning" ? (
                      <span aria-label="释义已隐藏" className="vocabulary-learning-list-speaking-hidden" />
                    ) : mode === "listening" && !hiddenFields.meaning ? (
                      <button aria-label={`选择中文释义：${meaning}`} className="vocabulary-learning-list-listening-meaning" disabled={!listeningTargetId} type="button">{meaning}</button>
                    ) : hiddenFields.meaning && activeAnswerField === "meaning" && meaningAnswers.length > 0 ? isChineseMeaning ? (
                      <div className="vocabulary-learning-list-chinese-answer">
                        {mode === "reading" && submittedAnswer ? (
                          <div aria-live="polite" className={`vocabulary-learning-list-chinese-answer-result ${readingMeaningIsCorrect ? "is-correct" : "is-wrong"}`}>
                            <span className="vocabulary-learning-list-entered-answer">{wordAnswer || "（空）"}</span>
                            {!readingMeaningIsCorrect ? (
                              <span className="vocabulary-learning-list-correct-answer">
                                <span aria-hidden="true"> / </span>
                                <span className="vocabulary-learning-list-correct-meaning">{meaningAnswers.join("、")}</span>
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <>
                            <input
                              aria-label={`第 ${index + 1} 行中文释义`}
                              className={readingMeaningIsCorrect ? "is-correct" : readingMeaningIsWrongSoFar ? "is-wrong" : undefined}
                              onChange={(event) => setAnswer(word.id, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.nativeEvent.keyCode !== 13) return;
                                event.preventDefault();
                                const submittedValue = event.currentTarget.value;
                                setAnswers((current) => ({ ...current, [word.id]: submittedValue }));
                                setSubmitted((current) => ({ ...current, [word.id]: true }));
                                focusNextRow(index);
                              }}
                              placeholder="输入中文释义"
                              size={Math.max(4, [...wordAnswer].length + 2)}
                              ref={(node) => { if (node) inputRefs.current.set(word.id, node); else inputRefs.current.delete(word.id); }}
                              type="text"
                              value={wordAnswer}
                            />
                            {readingMeaningIsWrongSoFar ? (
                              <span className="vocabulary-learning-list-correct-answer">
                                <span aria-hidden="true"> / </span>
                                <span className="vocabulary-learning-list-correct-meaning">{meaningAnswers.join("、")}</span>
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="vocabulary-learning-list-letter-answer">
                        <VocabularyListClozeInput
                          answers={meaningAnswers}
                          inputRef={(node) => { if (node) inputRefs.current.set(word.id, node); else inputRefs.current.delete(word.id); }}
                          label={`第 ${index + 1} 行${answerColumnTitle}`}
                          onChange={(value) => setAnswer(word.id, value)}
                          onEnter={() => handleLetterEnter(word, index)}
                          revealedAnswer={mode === "reading" && submittedAnswer && !readingMeaningIsCorrect ? meaningAnswers.join("、") : undefined}
                          answerSubmitted={mode === "reading" && submittedAnswer}
                          answerCorrect={mode === "reading" ? readingMeaningIsCorrect : undefined}
                          variant="definition"
                          value={wordAnswer}
                        />
                        {mode === "reading" && submittedAnswer && !readingMeaningIsCorrect ? (
                          <span aria-live="polite" className="vocabulary-learning-list-reading-answer-reveal">{meaningAnswers.join("、")}</span>
                        ) : null}
                        {mode === "reading" && submittedAnswer ? <span aria-live="polite" className="sr-only">{readingMeaningIsCorrect ? "回答正确" : `正确释义：${meaningAnswers.join("、")}`}</span> : null}
                      </div>
                    ) : hiddenFields.meaning ? (
                      <span aria-label="释义已隐藏" className="vocabulary-learning-list-speaking-hidden" />
                    ) : meaning}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div aria-hidden="true" className="vocabulary-learning-list-print">
        <h1>{bookLabel}词汇表</h1>
        <table>
          <thead><tr><th>序号</th><th>词汇</th><th>音标</th><th>{answerColumnTitle}</th></tr></thead>
        <tbody>{words.map((word, index) => <tr key={`print-${word.id}`}><td>{index + 1}</td><td>{word.word}</td><td>{getStudyPhonetic(word, voice) || "—"}</td><td>{getVocabularyListMeaning(word, displayLanguage)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function SpellingColoredAnswer({ answer, feedbackVisible, target }: { answer: string; feedbackVisible: boolean; target: string }) {
  const feedback = getSpellingCharacterFeedback(answer, target, feedbackVisible);

  return (
    <span aria-hidden="true" className="vocabulary-learning-spelling-colored-answer">
      {feedback.map(({ letter, correct }, index) => (
        <span
          className={!feedbackVisible ? "is-unsubmitted" : correct ? "is-correct" : "is-wrong"}
          key={`${index}-${letter}`}
          style={{
            color: !feedbackVisible ? "#171a17" : correct ? "#19804e" : "#c84c4c",
            WebkitTextFillColor: !feedbackVisible ? "#171a17" : correct ? "#19804e" : "#c84c4c",
          }}
        >{letter}</span>
      ))}
    </span>
  );
}

function SpellingTitleInput({
  answer,
  autoFocus,
  disabled,
  feedbackVisible,
  focusOnReady,
  history,
  onChange,
  onEnter,
  onSubmit,
  target,
}: {
  answer: string;
  autoFocus: boolean;
  disabled: boolean;
  feedbackVisible: boolean;
  focusOnReady?: boolean;
  history: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEnter?: () => void;
  onSubmit: () => void;
  target: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!focusOnReady || disabled || feedbackVisible) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [disabled, feedbackVisible, focusOnReady, target]);

  return (
    <div className={`vocabulary-learning-spelling-title ${feedbackVisible ? "is-revealed" : ""}`}>
      <div aria-live="polite" className="vocabulary-learning-spelling-target" />
      <div className={`vocabulary-spelling-input vocabulary-learning-spelling-inline-input ${feedbackVisible ? "has-feedback" : ""}`}>
        <span className="sr-only">拼写英文</span>
        <span className="vocabulary-learning-spelling-answer-line">
          <span aria-hidden="true" className="vocabulary-learning-spelling-width-sizer">{feedbackVisible ? (answer.length > target.length ? answer : target) : answer || "\u00a0"}</span>
          <input
            autoComplete="off"
            autoFocus={autoFocus}
            disabled={disabled}
            onChange={onChange}
            onKeyDown={onEnter ? (event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing || event.repeat) return;
              event.preventDefault();
              onEnter();
            } : undefined}
            ref={inputRef}
            spellCheck={false}
            value={answer}
          />
          <SpellingColoredAnswer answer={answer} feedbackVisible={feedbackVisible} target={target} />
        </span>
        <button
          className="vocabulary-learning-spelling-submit"
          disabled={disabled || feedbackVisible}
          onClick={onSubmit}
          type="button"
        >提交</button>
        {history ? (
          <span className="vocabulary-learning-spelling-inline-history">
            <span className="vocabulary-learning-spelling-submit-hint">敲击回车 完成提交</span>
            <span>{history}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function LearningRoundExamples({ word }: { word: LearningWord }) {
  const candidates = word.englishExamples.map((english, index) => ({ english, chinese: word.englishExampleTranslations?.[index] ?? "", sourceType: "manual" }))
    .filter((example) => example.english.trim() && example.chinese.trim());
  const seen = new Set<string>();
  const rows = candidates
    .map((example) => ({
      ...maskStudyExample(example.english, example.chinese, word.word, word.inflections.map((item) => item.value), word.definitionCn),
      sourceType: example.sourceType,
    }))
    .filter((example) => {
      const key = example.english.toLowerCase().replace(/\s+/g, " ").trim();
      if (!example.matched || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(compareStudyExamples)
    .slice(0, 1);
  return <section aria-label="语境例句" className="vocabulary-learning-round-examples">
    {rows.length ? rows.map((example) => <div key={example.english}><p lang="en">{example.english}</p><p lang="zh-CN">{example.chinese}</p></div>) : <p className="muted">暂无该词的双语例句。</p>}
  </section>;
}

function LearningRoundPicture({ word }: { word: LearningWord }) {
  const picture = useVocabularyIllustration(word.level === "小学" ? word.word : null, false);
  return picture ? <section aria-label="词汇图片" className="vocabulary-learning-round-picture">
    {picture}
  </section> : null;
}

function LearningVocabularyDetails({
  detailPayload,
  entry,
  showExamples,
  definitionPrefix,
  showDefinition = true,
  showWord = true,
}: {
  detailPayload: VocabularyDetailPayload | null;
  entry: LocalVocabularyEntry;
  showExamples: boolean;
  definitionPrefix?: ReactNode;
  showDefinition?: boolean;
  showWord?: boolean;
}) {
  const isSupplementalBook = isSupplementalLearningBook(entry.level);
  const detailedEntry = !isSupplementalBook && detailPayload?.entry ? detailPayload.entry : entry;
  const conciseEntry = { ...detailedEntry, definitionCn: getConciseStudyDefinition(detailedEntry.definitionCn), definitionGroups: detailedEntry.definitionGroups.map((group) => ({ ...group, definitions: group.definitions.slice(0, 2) })) };
  const [showVideo, setShowVideo] = useState(false);
  const scenarioKey = entry.word.trim().toLowerCase();
  const [loadedScenario, setLoadedScenario] = useState<{
    book: string;
    word: string;
    scenario: { context: string; translation: string; example: string } | null;
  } | null>(null);
  const usageScenario = loadedScenario?.book === entry.level && loadedScenario.word === scenarioKey
    ? loadedScenario.scenario
    : null;

  useEffect(() => {
    const scenariosPromise = loadPhraseUsageScenarios(entry.level);
    if (!scenariosPromise) {
      setLoadedScenario(null);
      return;
    }
    let active = true;
    void scenariosPromise.then(({ default: scenarios }) => {
      const scenarioBook = entry.level === "地道表达"
        ? scenarios as unknown as Record<string, { context: string; translation: string; example: string }>
        : (scenarios as unknown as Record<string, Record<string, { context: string; translation: string; example: string }>>)[entry.level] ?? {};
      const scenario = scenarioBook[scenarioKey] ?? null;
      if (active) setLoadedScenario({ book: entry.level, word: scenarioKey, scenario });
    }).catch(() => {
      if (active) setLoadedScenario({ book: entry.level, word: scenarioKey, scenario: null });
    });
    return () => { active = false; };
  }, [entry.level, scenarioKey]);

  useEffect(() => {
    setShowVideo(!isPhoneUserAgent(navigator.userAgent));
  }, []);

  return (
    <div className="vocabulary-learning-complete-detail vocabulary-detail-content">
      {showWord ? <div className="vocabulary-learning-complete-detail-header">
        <h1>{detailedEntry.word}</h1>
        <div className="vocabulary-learning-complete-detail-meta">
          <VocabularyInlinePronunciation
            ukAudioUrl={detailedEntry.ukAudioUrl}
            ukPhonetic={detailedEntry.ukPhonetic || detailedEntry.phonetic}
            usAudioUrl={detailedEntry.usAudioUrl}
            usPhonetic={detailedEntry.usPhonetic || detailedEntry.phonetic}
            word={detailedEntry.word}
          />
          {detailedEntry.level ? <span className="vocabulary-learning-complete-detail-level">{detailedEntry.level}</span> : null}
        </div>
      </div> : null}
      {definitionPrefix}
      {showDefinition ? <VocabularyDetailContent
        entry={conciseEntry}
        etymologyChinese={detailPayload?.etymology?.chinese}
        etymologyEnglish={detailPayload?.etymology?.english}
        formationParts={detailPayload?.formationParts ?? []}
        inlineVideo={!isSupplementalBook && showVideo ? (
          <VocabularyLearningVideoSection word={detailedEntry.normalizedWord} />
        ) : null}
        showExamples={showExamples}
        showIllustration={false}
        phrases={detailPayload?.phrases ?? []}
        synonymDistinctions={detailPayload?.synonymDistinctions ?? []}
        usageScenario={usageScenario}
        usageExamples={detailPayload?.usageExamples ?? []}
      /> : null}
    </div>
  );
}

function VocabularyLearningVideoSection({ word }: { word: string }) {
  const [payload, setPayload] = useState<VocabularyVideoPayload | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setPayload(null);
    void fetch(`/api/vocabulary-videos?word=${encodeURIComponent(word)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("词汇视频加载失败");
        return (await response.json()) as VocabularyVideoPayload;
      })
      .then((result) => {
        if (Array.isArray(result.videos) && typeof result.totalVideos === "number") setPayload(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPayload(null);
      });

    return () => controller.abort();
  }, [word]);

  if (!payload?.videos.length) return null;

  return (
    <VocabularyLookupDisplaySection controlsEnabled id="video" title="视频">
      <VocabularyVideoPlayer
        entryWord={word}
        totalVideos={payload.totalVideos}
        videos={payload.videos}
        votesEnabled={payload.votesEnabled}
      />
    </VocabularyLookupDisplaySection>
  );
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

let learningAudioGeneration = 0;
const activeLearningAudioStops = new Set<() => void>();
let learningAudioContext: AudioContext | null = null;

function unlockLearningAudio() {
  if (typeof window === "undefined") return;
  const AudioContextConstructor = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return;
  if (!learningAudioContext || learningAudioContext.state === "closed") learningAudioContext = new AudioContextConstructor();
  const context = learningAudioContext;
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  const silence = context.createBufferSource();
  silence.buffer = context.createBuffer(1, 1, context.sampleRate);
  silence.connect(context.destination);
  try { silence.start(0); } catch { /* The next real playback still falls back to HTML audio. */ }
}

function stopLearningAudio() {
  learningAudioGeneration += 1;
  for (const stop of [...activeLearningAudioStops]) stop();
  window.speechSynthesis?.cancel();
}

async function playLearningAudioBuffer(audioUrl: string, generation: number): Promise<boolean | null> {
  const context = learningAudioContext;
  if (!context) return null;
  if (context.state !== "running") {
    try { await context.resume(); } catch { return null; }
  }
  if (context.state !== "running") return null;
  let buffer: AudioBuffer;
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) return null;
    buffer = await context.decodeAudioData(await response.arrayBuffer());
  } catch {
    return null;
  }
  if (generation !== learningAudioGeneration) return false;
  if (context.state !== "running") return null;

  return await new Promise<boolean>((resolve) => {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    let settled = false;
    const stop = () => finish(false);
    const finish = (played: boolean) => {
      if (settled) return;
      settled = true;
      activeLearningAudioStops.delete(stop);
      if (!played) {
        try { source.stop(); } catch { /* The source may not have started. */ }
      }
      resolve(played);
    };
    activeLearningAudioStops.add(stop);
    source.addEventListener("ended", () => finish(true), { once: true });
    try { source.start(0); } catch { finish(false); }
  });
}

async function playSiteAudio(audioUrl: string, generation: number) {
  const bufferedPlayback = await playLearningAudioBuffer(audioUrl, generation);
  if (bufferedPlayback !== null) return bufferedPlayback;
  return await new Promise<boolean>((resolve) => {
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    let settled = false;
    let timeout = 0;
    const stop = () => finish(false);
    const finish = (played: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      activeLearningAudioStops.delete(stop);
      if (!played) audio.pause();
      resolve(played);
    };
    activeLearningAudioStops.add(stop);
    audio.addEventListener("ended", () => finish(true), { once: true });
    audio.addEventListener("error", () => finish(false), { once: true });
    timeout = window.setTimeout(() => finish(false), 8000);
    const playback = audio.play();
    if (playback) {
      void playback.catch(() => finish(false));
    }
  });
}

const vocabularyAudioUrlLookup = new Map<string, Promise<{ uk: string; us: string }>>();

function getStoredVocabularyAudioUrls(word: string) {
  const normalizedWord = word.trim().toLowerCase();
  const cached = vocabularyAudioUrlLookup.get(normalizedWord);
  if (cached) return cached;

  const request = fetch(`/api/vocabulary-hint?word=${encodeURIComponent(word)}`)
    .then(async (response) => {
      if (!response.ok) return { uk: "", us: "" };
      const payload = await response.json() as { hint?: Pick<LocalVocabularyEntry, "ukAudioUrl" | "usAudioUrl"> | null };
      return {
        uk: payload.hint?.ukAudioUrl?.trim() ?? "",
        us: payload.hint?.usAudioUrl?.trim() ?? "",
      };
    })
    .catch(() => ({ uk: "", us: "" }));
  vocabularyAudioUrlLookup.set(normalizedWord, request);
  return request;
}

async function playAudioOnce(word: LearningWord, voice: Voice, generation: number) {
  const preferredAudioUrl = voice === "us" ? word.usAudioUrl : word.ukAudioUrl;
  const storedAudioUrlRequest = preferredAudioUrl?.trim()
    ? Promise.resolve("")
    : getStoredVocabularyAudioUrls(word.word).then((urls) => urls[voice]);
  if (generation !== learningAudioGeneration) return false;
  const immediateAudioUrls = Array.from(new Set([
    getVocabularyAudioUrl(word.word, voice),
    preferredAudioUrl?.trim(),
  ].filter((url): url is string => Boolean(url))));

  for (const audioUrl of immediateAudioUrls) {
    if (generation !== learningAudioGeneration) return false;
    if (await playSiteAudio(audioUrl, generation)) return false;
  }

  if (generation !== learningAudioGeneration) return false;
  const storedAudioUrl = await storedAudioUrlRequest;
  if (storedAudioUrl && !immediateAudioUrls.includes(storedAudioUrl)) {
    if (await playSiteAudio(storedAudioUrl, generation)) return false;
  }

  if (generation !== learningAudioGeneration) return false;
  if (typeof window.speechSynthesis === "undefined") {
    return true;
  }

  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = voice === "us" ? "en-US" : "en-GB";
    utterance.rate = 0.88;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    utterance.addEventListener("end", finish, { once: true });
    utterance.addEventListener("error", finish, { once: true });
    window.setTimeout(finish, 6000);
    window.speechSynthesis.speak(utterance);
  });

  return true;
}

async function playWordAudio(word: LearningWord, voice: Voice, repeats: number) {
  let usedBrowserVoice = false;
  const generation = learningAudioGeneration;
  for (let index = 0; index < repeats; index += 1) {
    if (generation !== learningAudioGeneration) break;
    usedBrowserVoice = (await playAudioOnce(word, voice, generation)) || usedBrowserVoice;
  }
  return usedBrowserVoice;
}

function playSpellingFeedbackSound(correct: boolean): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const AudioContextConstructor = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let context: AudioContext;
    try {
      context = new AudioContextConstructor();
    } catch {
      resolve();
      return;
    }

    let settled = false;
    let fallbackTimer = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackTimer);
      void context.close().catch(() => undefined);
      resolve();
    };

    fallbackTimer = window.setTimeout(finish, 1800);
    void context.resume().then(() => {
      if (settled) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime;
      const end = start + (correct ? 0.42 : 0.3);

      oscillator.type = correct ? "sine" : "square";
      if (correct) {
        oscillator.frequency.setValueAtTime(660, start);
        oscillator.frequency.linearRampToValueAtTime(880, start + 0.16);
        oscillator.frequency.linearRampToValueAtTime(1046, end);
      } else {
        oscillator.frequency.setValueAtTime(260, start);
        oscillator.frequency.linearRampToValueAtTime(150, end);
      }

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.addEventListener("ended", finish, { once: true });
      fallbackTimer = window.setTimeout(finish, correct ? 1000 : 900);
      oscillator.start(start);
      oscillator.stop(end);
    }).catch(finish);
  });
}

function chooseNextWord(
  words: LearningWord[],
  store: ProgressStore,
  now: number,
  order: SortOrder,
  excludeId: string | null,
  settings: StudySettings,
  browseKey: string,
  preferredBook: BookSelectionKey,
): LearningWord | null {
  const preferredWords = preferredBook === "生词本" ? words : words.filter((word) => word.level === preferredBook);
  const earlierWords = settings.scope === "all" && preferredBook !== "生词本"
    ? words.filter((word) => word.level !== preferredBook)
    : [];
  if (settings.method === "browse") {
    const browseWordLimit = settings.browseGroups * GROUP_SIZE;
    if (settings.reviewView !== null || settings.reviewFamiliarities.length > 0) {
      if (settings.reviewView !== null
        && (settings.reviewFamiliarities.length === 0 || settings.modes.length === 0)) return null;
      const allFamiliaritiesSelected = (["familiar", "vague", "unfamiliar"] as const).every((value) => settings.reviewFamiliarities.includes(value));
      const selected = filterBrowseReviewWords(
        settings.scope === "all" ? words : preferredWords, store, browseKey, settings.reviewView, settings.reviewFamiliarities, now, settings.modes,
      );
      if (settings.reviewView !== null || allFamiliaritiesSelected) return drawWeightedBrowseWord(selected, store, Math.random, excludeId);
      const nextId = nextBrowseLoopId(selected.map((word) => word.id), excludeId, order);
      return selected.find((word) => word.id === nextId) ?? (earlierWords.length
        ? chooseNextWord(earlierWords, store, now, order, excludeId, { ...settings, scope: "core" }, browseKey, "生词本")
        : null);
    }
    const todayIds = preferredWords
      .filter((word) => isReviewedToday(store[word.id]?.browseByBook?.[browseKey]?.browseLastSeenAt ?? null, now))
      .map((word) => word.id);
    if (todayIds.length < browseWordLimit) {
      const todaySet = new Set(todayIds);
      const candidates = preferredWords.filter((word) => !todaySet.has(word.id) && word.id !== excludeId);
      const neverBrowsed = candidates.filter((word) => {
        const entry = store[word.id];
        return !entry?.lastReviewedAt && !entry?.browseByBook?.[browseKey]?.browseFirstSeenAt;
      });
      const unscored = candidates.filter((word) => !store[word.id]?.lastReviewedAt);
      const fresh = neverBrowsed.length > 0 ? neverBrowsed : unscored.length > 0 ? unscored : candidates;
      if (fresh.length > 0) return order === "random" ? shuffle(fresh)[0] : fresh[0];
    }
    const loopIds = todayIds
      .sort((left, right) => (store[left]?.browseByBook?.[browseKey]?.browseLastSeenAt ?? 0)
        - (store[right]?.browseByBook?.[browseKey]?.browseLastSeenAt ?? 0))
      .slice(0, browseWordLimit);
    const loopId = nextBrowseLoopId(loopIds, excludeId, order);
    return preferredWords.find((word) => word.id === loopId) ?? (earlierWords.length
      ? chooseNextWord(earlierWords, store, now, order, excludeId, { ...settings, scope: "core" }, browseKey, "生词本")
      : null);
  }
  const newToday = preferredWords.filter((word) => {
    const entry = progressFor(store, word.id);
    return isReviewedToday(entry.firstLearnedAt ?? null, now);
  }).length;
  const queue: LearningWord[] = [];
  for (const word of preferredWords) {
    if (word.id === excludeId) continue;
    const entry = progressFor(store, word.id);
    if (entry.completed) continue;
    if (entry.lastReviewedAt === null) {
      // New words always follow the daily-new limit, even when the selected
      // review modes have no history yet.
      if (newToday < settings.dailyNew) queue.push(word);
    } else if (entry.nextReviewAt === null || entry.nextReviewAt <= now) {
      queue.push(word);
    }
  }
  if (queue.length === 0) return earlierWords.length && preferredWords.every((word) => progressFor(store, word.id).completed)
    ? chooseNextWord(earlierWords, store, now, order, excludeId, { ...settings, scope: "core" }, browseKey, "生词本")
    : null;
  return order === "random" ? shuffle(queue)[0] : queue[0];
}

export function VocabularyLearning({ bookCounts, books, initialBook, initialListMode = false, initialListResume = false, sourceCount }: VocabularyLearningProps) {
  const [selectedBook, setSelectedBook] = useState<BookSelectionKey>(initialBook);
  const [qualityNoticeOpen, setQualityNoticeOpen] = useState(() => isQualityNoticeBook(initialBook));
  useEffect(() => {
    setSelectedBook(initialBook);
    setQualityNoticeOpen(isQualityNoticeBook(initialBook));
  }, [initialBook]);
  const [entryGate, setEntryGate] = useState<"loading" | "select-book" | "continue" | "settings" | "active">("loading");
  const [resumeBookPickerOpen, setResumeBookPickerOpen] = useState(false);
  const [settingsByBook, setSettingsByBook] = useState<Partial<Record<BookSelectionKey, StudySettings>>>({});
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [settingsOpenFor, setSettingsOpenFor] = useState<BookSelectionKey | null>(null);
  const [setupMode, setSetupMode] = useState<"single" | "pk">("single");
  const [listModeActive, setListModeActive] = useState(false);
  const [settingsListMode, setSettingsListMode] = useState(initialListMode);
  const settingsDraftBookRef = useRef<BookSelectionKey | null>(null);
  const [pkSetupBook, setPkSetupBook] = useState<LearningBookKey>(initialBook === "生词本" ? "小学" : initialBook);
  const [studyPaused, setStudyPaused] = useState(false);
  const [browseCountdownPaused, setBrowseCountdownPaused] = useState(false);
  const [browseSecondsRemaining, setBrowseSecondsRemaining] = useState<number | null>(null);
  const browseCountdownPausedRef = useRef(false);
  const [settingsDraft, setSettingsDraft] = useState<StudySettingsDraft>(() => toSettingsDraft(DEFAULT_STUDY_SETTINGS));
  const settingsUiHydratedRef = useRef(false);
  const rememberSettingsUi = useCallback((nextSetupMode: "single" | "pk", nextListMode: boolean) => {
    try { window.localStorage.setItem(SETTINGS_UI_STORAGE_KEY, JSON.stringify({ setupMode: nextSetupMode, listMode: nextListMode })); } catch { /* Preference storage is optional. */ }
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SETTINGS_UI_STORAGE_KEY) ?? "null") as { setupMode?: unknown; listMode?: unknown } | null;
      if (saved?.setupMode === "single" || saved?.setupMode === "pk") setSetupMode(saved.setupMode);
      if (initialListMode) setSettingsListMode(true);
      else if (typeof saved?.listMode === "boolean") setSettingsListMode(saved.listMode);
    } catch {
      // Modal view preferences are optional.
    } finally {
      settingsUiHydratedRef.current = true;
    }
  }, [initialListMode]);
  useEffect(() => {
    if (!settingsUiHydratedRef.current) return;
    rememberSettingsUi(setupMode, settingsListMode);
  }, [rememberSettingsUi, settingsListMode, setupMode]);
  const weightedBrowse = settingsDraft.method === "browse" && (settingsDraft.reviewView !== null || (["familiar", "vague", "unfamiliar"] as const).every((value) => settingsDraft.reviewFamiliarities.includes(value)));
  const reactionOptionsRef = useRef<HTMLDivElement | null>(null);
  const [favoriteWords, setFavoriteWords] = useState<FavoriteLearningWord[]>([]);
  const [customBookOpen, setCustomBookOpen] = useState(false);
  const [voice, setVoice] = useState<Voice>("us");
  const [order, setOrder] = useState<SortOrder>("sequential");
  const [progress, setProgress] = useState<ProgressStore>({});
  const [dailyActivity, setDailyActivity] = useState<DailyActivityStore>({ date: "", events: [], bookGoals: {} });
  const [dailyActivityHydrated, setDailyActivityHydrated] = useState(false);
  const [dailySummarySnapshot, setDailySummarySnapshot] = useState<{ summary: DailySummary; capturedAt: Date } | null>(null);
  const [selectedEncouragement, setSelectedEncouragement] = useState(DAILY_ENCOURAGEMENTS[0]);
  const [customEncouragement, setCustomEncouragement] = useState("");
  const [sharingSummary, setSharingSummary] = useState(false);
  const [shareError, setShareError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [words, setWords] = useState<LearningWord[]>([]);
  const [detailPayload, setDetailPayload] = useState<VocabularyDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadNonce, setLoadNonce] = useState(0);
  const [currentWordId, setCurrentWordId] = useState<string | null>(null);
  const [forcedSpellingWordId, setForcedSpellingWordId] = useState<string | null>(null);
  const [sessionDepleted, setSessionDepleted] = useState(false);
  const [groupSession, setGroupSession] = useState<ClassificationGroupSession | null>(null);
  const [groupSummary, setGroupSummary] = useState<ClassificationGroupSummary | null>(null);
  const [groupBrowseIds, setGroupBrowseIds] = useState<string[] | null>(null);
  const [nextGroupByBook, setNextGroupByBook] = useState<Record<string, number>>({});
  const [activeGroupByBook, setActiveGroupByBook] = useState<Record<string, ActiveGroupProgress>>({});
  const [groupProgressHydrated, setGroupProgressHydrated] = useState(false);
  const [definitionChoice, setDefinitionChoice] = useState<number | null>(null);
  const [wakeTick, setWakeTick] = useState(0);
  const [roundNonce, setRoundNonce] = useState(0);
  const [pageVisible, setPageVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const [phase, setPhase] = useState<RoundPhase>("idle");
  const [revealedRoundKey, setRevealedRoundKey] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [roundHadSpellingError, setRoundHadSpellingError] = useState(false);
  const [spellingAnswerShown, setSpellingAnswerShown] = useState(false);
  const [spellingPlaybackPending, setSpellingPlaybackPending] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [oralScoreFeedback, setOralScoreFeedback] = useState<number | null>(null);
  const [recordingAudioUrl, setRecordingAudioUrl] = useState<string | null>(null);
  const [advancePending, setAdvancePending] = useState(false);
  const [sidebarHeight, setSidebarHeight] = useState<number | null>(null);

  const sidebarRef = useRef<HTMLElement | null>(null);
  const roundTokenRef = useRef(0);
  const browseSpellingRevealedTokenRef = useRef(-1);
  const speakingDetailsRevealedTokenRef = useRef(-1);
  const answerRef = useRef("");
  const spellingPlaybackPromiseRef = useRef<Promise<void> | null>(null);
  const spellingClassificationPendingRef = useRef(false);
  const forceNextSpellingWordRef = useRef(false);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const holdingMicRef = useRef(false);
  const touchMicPointerRef = useRef(false);
  const recordingStartPendingRef = useRef(false);
  const spaceKeyRecordingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const recordingFinishedRef = useRef(false);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const oralTranscriptRef = useRef("");
  const oralRecognitionErrorRef = useRef(false);
  const oralOutcomeLockedRef = useRef(false);
  const recordingAudioUrlRef = useRef<string | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const browseModeBagRef = useRef<{ key: string; remaining: number[] }>({ key: "", remaining: [] });
  const browseChoiceRef = useRef<number | null>(null);

  const playSpellingFeedbackThenWord = useCallback((word: LearningWord, correct: boolean, roundToken: number) => {
    if (spellingPlaybackPromiseRef.current) return spellingPlaybackPromiseRef.current;
    setSpellingPlaybackPending(true);
    const playback = (async () => {
      try {
        await playSpellingFeedbackSound(correct);
        if (roundToken === roundTokenRef.current) await playWordAudio(word, voice, 1);
      } catch {
        // Audio failures should not prevent the spelling result from being recorded.
      } finally {
        if (roundToken === roundTokenRef.current) setSpellingPlaybackPending(false);
      }
    })();
    spellingPlaybackPromiseRef.current = playback;
    return playback;
  }, [voice]);

  const chooseBrowseMode = useCallback((settings: StudySettings) => {
    if (settings.method !== "browse") return;
    const enabled = enabledModeIndices(settings);
    const key = [...enabled].sort((left, right) => left - right).join(",");
    if (browseModeBagRef.current.key !== key) browseModeBagRef.current = { key, remaining: [] };
    const draw = drawBrowseMode(enabled, browseModeBagRef.current.remaining);
    browseModeBagRef.current.remaining = draw.remainingModes;
    browseChoiceRef.current = draw.mode;
  }, []);

  useEffect(() => {
    const options = reactionOptionsRef.current;
    if (!settingsOpenFor || !options) return;

    const handleWheel = (event: WheelEvent) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || event.deltaY === 0) return;
      const category = REACTION_TIME_OPTIONS.find((option) => option.category === input.dataset.reactionCategory)?.category;
      if (!category) return;
      event.preventDefault();
      setSettingsDraft((current) => {
        const previous = Number(current.reactionSeconds[category]);
        const seconds = Number.isFinite(previous) ? previous : DEFAULT_REACTION_SECONDS[category];
        const next = Math.min(120, Math.max(1, seconds + (event.deltaY < 0 ? 1 : -1)));
        return {
          ...current,
          reactionSeconds: { ...current.reactionSeconds, [category]: String(next) },
        };
      });
    };

    options.addEventListener("wheel", handleWheel, { passive: false });
    return () => options.removeEventListener("wheel", handleWheel);
  }, [settingsOpenFor, setupMode]);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      setSidebarHeight(Math.ceil(sidebar.getBoundingClientRect().height));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sidebar);
    return () => observer.disconnect();
  }, [books.length, progress, selectedBook, words.length]);

  const replaceRecordingAudio = useCallback((blob: Blob | null) => {
    if (recordingAudioUrlRef.current) URL.revokeObjectURL(recordingAudioUrlRef.current);
    const nextUrl = blob ? URL.createObjectURL(blob) : null;
    recordingAudioUrlRef.current = nextUrl;
    setRecordingAudioUrl(nextUrl);
  }, []);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
      if (recordingAudioUrlRef.current) URL.revokeObjectURL(recordingAudioUrlRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          order?: SortOrder;
          progress?: ProgressStore;
          reviewScheduleVersion?: number;
          selectedBook?: string;
          voice?: Voice;
        };
        const hasExplicitBook = new URLSearchParams(window.location.search).has("level");
        const savedBook = saved.selectedBook === "未分级" ? "其他词汇" : saved.selectedBook;
        if (!hasExplicitBook && savedBook && (savedBook === "生词本" || books.some((book) => book.key === savedBook))) {
          setSelectedBook(savedBook as BookSelectionKey);
        }
        if (saved.voice === "us" || saved.voice === "uk") setVoice(saved.voice);
        if (saved.order === "sequential" || saved.order === "random") setOrder(saved.order);
        if (saved.progress && typeof saved.progress === "object") {
          setProgress(restoreProgress(saved.progress, (saved.reviewScheduleVersion ?? 1) < 2));
        }
      }
    } catch {
      // A corrupt anonymous cache should not prevent the vocabulary page from opening.
    } finally {
      setHydrated(true);
    }
  }, [books]);

  useEffect(() => {
    const refreshAccountProgress = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
        setProgress(restoreProgress(saved.progress ?? {}, false));
        const activity = JSON.parse(localStorage.getItem(DAILY_ACTIVITY_STORAGE_KEY) ?? "null");
        if (activity?.date === localStudyDate() && Array.isArray(activity.events)) setDailyActivity(activity);
        const groups = JSON.parse(localStorage.getItem(GROUP_PROGRESS_KEY) ?? "{}");
        setNextGroupByBook(groups && typeof groups === "object"
          ? Object.fromEntries(Object.entries(groups).filter(([, value]) => Number.isInteger(value) && Number(value) >= 0)) as Record<string, number>
          : {});
        const activeGroups = JSON.parse(localStorage.getItem(ACTIVE_GROUP_PROGRESS_KEY) ?? "{}");
        if (activeGroups && typeof activeGroups === "object") {
          setActiveGroupByBook(Object.fromEntries(Object.entries(activeGroups).filter(([, value]) => {
            if (!value || typeof value !== "object") return false;
            const item = value as Partial<ActiveGroupProgress>;
            return Number.isInteger(item.groupNo) && Number(item.groupNo) >= 0
              && (item.scope === "core" || item.scope === "all")
              && Number.isFinite(item.startedAt) && Number(item.startedAt) > 0;
          })) as Record<string, ActiveGroupProgress>);
        }
      } catch { /* A failed sync must not interrupt the active word. */ }
    };
    window.addEventListener(ACCOUNT_PROGRESS_EVENT, refreshAccountProgress);
    return () => window.removeEventListener(ACCOUNT_PROGRESS_EVENT, refreshAccountProgress);
  }, []);

  useEffect(() => {
    const today = localStudyDate();
    try {
      const raw = window.localStorage.getItem(DAILY_ACTIVITY_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<DailyActivityStore>;
        const history = saved.history && typeof saved.history === "object" ? { ...saved.history } : {};
        const rawLearning = window.localStorage.getItem(STORAGE_KEY);
        const learningState = rawLearning ? JSON.parse(rawLearning) as { progress?: ProgressStore } : {};
        const oldEvents = Array.isArray(saved.events) ? saved.events : [];
        const oldGoals = saved.bookGoals && typeof saved.bookGoals === "object" ? saved.bookGoals : {};
        if (saved.date && saved.date !== today && oldEvents.length) {
          history[saved.date] = summarizeDailyStudy({ date: saved.date, events: oldEvents, bookGoals: oldGoals }, learningState.progress ?? {}, sourceCount);
        }
        const compactHistory = Object.fromEntries(Object.entries(history).sort(([left], [right]) => left.localeCompare(right)).slice(-1826));
        const events = saved.date === today ? oldEvents.filter((event) => event && typeof event.wordId === "string" && Number.isFinite(event.at)) : [];
        const goals = saved.date === today ? oldGoals : {};
        setDailyActivity({ date: today, events, bookGoals: goals, history: compactHistory });
      } else setDailyActivity({ date: today, events: [], bookGoals: {} });
    } catch {
      setDailyActivity({ date: today, events: [], bookGoals: {} });
    } finally {
      setDailyActivityHydrated(true);
    }
  }, [sourceCount]);

  useEffect(() => {
    try {
      setStudyPaused(window.localStorage.getItem(STUDY_PAUSED_STORAGE_KEY) === "true");
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) as Record<string, Partial<StudySettings>> : {};
      const migrateOldReactionDefaults = window.localStorage.getItem(REACTION_SETTINGS_MIGRATION_KEY) !== "done";
      const restored: Partial<Record<BookSelectionKey, StudySettings>> = {};
      for (const key of ["生词本", ...books.map((book) => book.key)] as BookSelectionKey[]) {
        const item = saved[key] ?? (key === "其他词汇" ? saved["未分级"] : undefined);
        if (!item || !validDailyLimit(item.dailyNew)) continue;
        const method = item.method === "browse" ? "browse" : "classified";
        const storedDefinitionLanguage = (item as { definitionLanguage?: unknown }).definitionLanguage;
        const storedAssessmentDefinitionLanguage = (item as { assessmentDefinitionLanguage?: unknown }).assessmentDefinitionLanguage;
        const legacyFamiliarity = (item as Partial<StudySettings> & { reviewFamiliarity?: CollectionKey | null }).reviewFamiliarity;
        const reviewView = item.reviewView === "overall" || item.reviewView === "today" ? item.reviewView : null;
        const restoredModes = restoreStudyModes(item.modes);
        const restoredFamiliarities = Array.isArray(item.reviewFamiliarities)
          ? COLLECTIONS.map((collection) => collection.key).filter((key) => item.reviewFamiliarities?.includes(key))
          : (legacyFamiliarity === "familiar" || legacyFamiliarity === "vague" || legacyFamiliarity === "unfamiliar")
            ? [legacyFamiliarity] : [];
        restored[key] = {
          dailyNew: item.dailyNew,
          browseGroups: Number.isInteger(item.browseGroups) && Number(item.browseGroups) > 0 ? Number(item.browseGroups) : 1,
          reactionSeconds: restoreReactionSeconds(item.reactionSeconds, migrateOldReactionDefaults),
          method,
          modes: restoredModes.length === 0 ? [...ALL_STUDY_MODES] : restoredModes,
          reviewFamiliarities: method === "classified"
            ? []
            : reviewView && restoredFamiliarities.length === 0
              ? COLLECTIONS.map((collection) => collection.key) : restoredFamiliarities,
          reviewView: method === "classified" ? null : reviewView,
          scope: item.scope === "all" ? "all" : "core",
          wordGroups: { core: vocabularyStudyGroupIndex(item.wordGroups?.core), all: vocabularyStudyGroupIndex(item.wordGroups?.all) },
          voice: item.voice === "uk" ? "uk" : "us",
          order: item.order === "random" ? "random" : "sequential",
          definitionLanguage: storedDefinitionLanguage === "en" || (storedDefinitionLanguage === "synonym" && storedAssessmentDefinitionLanguage === "en") ? "en" : "zh",
          assessmentDefinitionLanguage: storedAssessmentDefinitionLanguage === "en" || (!storedAssessmentDefinitionLanguage && storedDefinitionLanguage === "en") ? "en" : "zh",
          showExamples: item.showExamples !== false,
          showOptions: item.showOptions !== false,
          showPicture: item.showPicture !== false,
        };
      }
      setSettingsByBook(restored);
      window.localStorage.setItem(REACTION_SETTINGS_MIGRATION_KEY, "done");
    } catch {
      setSettingsByBook({});
    } finally {
      setSettingsHydrated(true);
    }
  }, [books]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(GROUP_PROGRESS_KEY) ?? "{}") as Record<string, number>;
      setNextGroupByBook(Object.fromEntries(Object.entries(saved).filter(([, value]) => Number.isInteger(value) && value >= 0)));
    } catch {
      setNextGroupByBook({});
    } finally {
      setGroupProgressHydrated(true);
    }
    try {
      const saved = JSON.parse(window.localStorage.getItem(ACTIVE_GROUP_PROGRESS_KEY) ?? "{}");
      setActiveGroupByBook(Object.fromEntries(Object.entries(saved).filter(([, value]) => {
        if (!value || typeof value !== "object") return false;
        const item = value as Partial<ActiveGroupProgress>;
        return Number.isInteger(item.groupNo) && Number(item.groupNo) >= 0
          && (item.scope === "core" || item.scope === "all")
          && Number.isFinite(item.startedAt) && Number(item.startedAt) > 0;
      })) as Record<string, ActiveGroupProgress>);
    } catch {
      setActiveGroupByBook({});
    }
  }, []);

  useEffect(() => {
    if (!groupProgressHydrated) return;
    try { window.localStorage.setItem(GROUP_PROGRESS_KEY, JSON.stringify(nextGroupByBook)); } catch { /* Local progress is optional. */ }
  }, [groupProgressHydrated, nextGroupByBook]);

  useEffect(() => {
    if (!groupProgressHydrated) return;
    try { window.localStorage.setItem(ACTIVE_GROUP_PROGRESS_KEY, JSON.stringify(activeGroupByBook)); } catch { /* Incomplete group progress is optional. */ }
  }, [activeGroupByBook, groupProgressHydrated]);

  useEffect(() => {
    if (!settingsHydrated) return;
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsByBook));
    } catch {
      // Private browsing can reject local study settings.
    }
  }, [settingsByBook, settingsHydrated]);

  useEffect(() => {
    if (!settingsHydrated) return;
    try {
      window.localStorage.setItem(STUDY_PAUSED_STORAGE_KEY, String(studyPaused));
    } catch {
      // Private browsing can reject saved pause state.
    }
  }, [settingsHydrated, studyPaused]);

  useEffect(() => {
    if (!hydrated || !settingsHydrated || !groupProgressHydrated || entryGate !== "loading") return;
    const saved = settingsByBook[selectedBook];
    if (saved) {
      setVoice(saved.voice);
      setOrder(saved.order);
    }
    setStudyPaused(true);
    const mobileListEntryNeedsStart = initialListMode
      && !initialListResume
      && window.matchMedia("(max-width: 680px)").matches;
    if (mobileListEntryNeedsStart) {
      setSettingsDraft(toSettingsDraft(saved ?? { ...DEFAULT_STUDY_SETTINGS, voice, order }));
      settingsDraftBookRef.current = selectedBook;
      setSettingsListMode(true);
      setSettingsOpenFor(selectedBook);
      window.history.replaceState(null, "", `/vocabulary/books?level=${encodeURIComponent(selectedBook)}`);
      setEntryGate("settings");
      return;
    }
    setListModeActive(initialListMode);
    setEntryGate(initialListMode ? "active" : saved ? "continue" : "select-book");
  }, [entryGate, groupProgressHydrated, hydrated, initialListMode, initialListResume, order, selectedBook, settingsByBook, settingsHydrated, voice]);

  useEffect(() => {
    const refreshFavoriteWords = () => {
      const next = readFavoriteLearningWords();
      setFavoriteWords((current) => current.length === next.length
        && current.every((item, index) => item.id === next[index].id)
        ? current
        : next);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === FAVORITE_WORDS_STORAGE_KEY) refreshFavoriteWords();
    };
    refreshFavoriteWords();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refreshFavoriteWords);
    window.addEventListener(FAVORITE_WORDS_CHANGED_EVENT, refreshFavoriteWords);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshFavoriteWords();
    }, 3000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refreshFavoriteWords);
      window.removeEventListener(FAVORITE_WORDS_CHANGED_EVENT, refreshFavoriteWords);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ order, progress, reviewScheduleVersion: 2, selectedBook, voice }));
    } catch {
      // Private or embedded browsers may expose localStorage but reject writes.
    }
  }, [hydrated, order, progress, selectedBook, voice]);

  useEffect(() => {
    if (!dailyActivityHydrated || !dailyActivity.date) return;
    try {
      window.localStorage.setItem(DAILY_ACTIVITY_STORAGE_KEY, JSON.stringify(dailyActivity));
    } catch {
      // Keep the learning session usable when local storage is unavailable.
    }
  }, [dailyActivity, dailyActivityHydrated]);

  const selectedFavorites = selectedBook === "生词本" ? favoriteWords : null;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setWords([]);
    setCurrentWordId(null);
    setSessionDepleted(false);
    void fetch(selectedFavorites ? "/api/vocabulary-learning" : `/api/vocabulary-learning?book=${encodeURIComponent(selectedBook)}`, {
      signal: controller.signal,
      ...(selectedFavorites ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorites: selectedFavorites }),
      } : {}),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("词库加载失败");
        return (await response.json()) as { words: LearningWord[] };
      })
      .then((payload) => {
        if (!controller.signal.aborted) setWords(Array.isArray(payload.words) ? payload.words : []);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        setLoadError(error instanceof Error ? error.message : "词库加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [loadNonce, selectedBook, selectedFavorites]);

  const currentSettings = settingsByBook[selectedBook] ?? DEFAULT_STUDY_SETTINGS;
  const dailySummary = useMemo(
    () => summarizeDailyStudy(dailyActivity, progress, sourceCount),
    [dailyActivity, progress, sourceCount],
  );
  const recordDailyActivity = useCallback((wordId: string, category: DailyMode, outcome: DailyOutcome | null, isReview: boolean, at: number) => {
    const date = localStudyDate(new Date(at));
    setDailyActivity((current) => {
      const history = { ...(current.history ?? {}) };
      if (current.date && current.date !== date && current.events.length > 0) {
        history[current.date] = summarizeDailyStudy(current, progress, sourceCount);
      }
      const compactHistory = Object.fromEntries(Object.entries(history).sort(([left], [right]) => left.localeCompare(right)).slice(-1826));
      const base = current.date === date ? current : { date, events: [], bookGoals: {}, history: compactHistory };
      return {
        ...base,
        history: compactHistory,
        bookGoals: { ...base.bookGoals, [selectedBook]: Math.max(base.bookGoals[selectedBook] ?? 0, currentSettings.dailyNew) },
        events: [...base.events, { at, book: selectedBook, category, isReview, outcome, wordId }].slice(-5000),
      };
    });
  }, [currentSettings.dailyNew, progress, selectedBook, sourceCount]);
  const selectedBookLabel = selectedBook === "生词本"
    ? "生词本"
    : books.find((book) => book.key === selectedBook)?.label ?? selectedBook;
  const resumeBookOptions = (["生词本", ...books.map((book) => book.key)] as BookSelectionKey[])
    .filter((book, index, all) => settingsByBook[book] && all.indexOf(book) === index);
  // Use the draft while the current book's settings dialog is open. This keeps
  // the definition language in sync with the user's selection before the
  // saved settings state is committed, so an old Chinese line cannot flash
  // before the English definition appears.
  const displayedDefinitionLanguage: AssessmentDefinitionLanguage = settingsOpenFor === selectedBook
    ? settingsDraft.definitionLanguage
    : currentSettings.definitionLanguage;
  const visibleWords = useMemo(
    () => selectedBook === "生词本" || currentSettings.scope === "all"
      ? words
      : words.filter((word) => word.level === selectedBook),
    [currentSettings.scope, selectedBook, words],
  );
  const activeStudyWords = useMemo(() => currentSettings.method === "browse" && currentSettings.reviewView !== null
    ? visibleWords
    : groupBrowseIds
    ? visibleWords.filter((word) => groupBrowseIds.includes(word.id))
    : selectVocabularyStudyGroup(visibleWords, currentSettings.wordGroups[currentSettings.scope]), [currentSettings.method, currentSettings.reviewView, currentSettings.scope, currentSettings.wordGroups, groupBrowseIds, visibleWords]);
  const studyListWords = useMemo(() => currentSettings.method === "browse"
    && (currentSettings.reviewView !== null || currentSettings.reviewFamiliarities.length > 0)
    ? filterBrowseReviewWords(activeStudyWords, progress, `${selectedBook}:${currentSettings.scope}`, currentSettings.reviewView, currentSettings.reviewFamiliarities, Date.now(), currentSettings.modes)
    : activeStudyWords, [activeStudyWords, currentSettings.method, currentSettings.modes, currentSettings.reviewFamiliarities, currentSettings.reviewView, currentSettings.scope, progress, selectedBook]);
  const resumeScopeWords = selectedBook === "生词本" || currentSettings.scope === "all"
    ? words
    : words.filter((word) => word.level === selectedBook);
  const resumeGroupNo = vocabularyStudyGroupIndex(currentSettings.wordGroups[currentSettings.scope], resumeScopeWords.length)
    ?? (nextGroupByBook[selectedBook] ?? 0) % Math.max(1, Math.ceil(resumeScopeWords.length / GROUP_SIZE));
  const activeGroupProgress = activeGroupByBook[selectedBook];
  const isResumingPartialGroup = currentSettings.method === "classified"
    && activeGroupProgress?.groupNo === resumeGroupNo
    && activeGroupProgress?.scope === currentSettings.scope;
  const partialGroupRemainingCount = isResumingPartialGroup && activeGroupProgress
    ? resumeScopeWords.slice(resumeGroupNo * GROUP_SIZE, (resumeGroupNo + 1) * GROUP_SIZE)
      .filter((word) => (progressFor(progress, word.id).lastReviewedAt ?? 0) < activeGroupProgress.startedAt).length
    : 0;
  const hasCompletedVocabularyGroup = Object.prototype.hasOwnProperty.call(nextGroupByBook, selectedBook);
  const startClassifiedGroup = useCallback((settings: StudySettings, sourceWords: LearningWord[], book: BookSelectionKey) => {
    if (!sourceWords.length) return false;
    const groupCount = Math.max(1, Math.ceil(sourceWords.length / GROUP_SIZE));
    let groupNo = vocabularyStudyGroupIndex(settings.wordGroups[settings.scope], sourceWords.length) ?? (nextGroupByBook[book] ?? 0) % groupCount;
    const active = activeGroupByBook[book];
    const isResuming = active?.groupNo === groupNo && active?.scope === settings.scope;
    let startedAt = isResuming ? active.startedAt : Date.now();

    const makeSession = (targetGroupNo: number, targetStartedAt: number, resume: boolean) => {
      const groupWords = sourceWords.slice(targetGroupNo * GROUP_SIZE, (targetGroupNo + 1) * GROUP_SIZE);
      const processedWords = resume
        ? groupWords.filter((word) => (progressFor(progress, word.id).lastReviewedAt ?? 0) >= targetStartedAt)
        : [];
      const processedIds = new Set(processedWords.map((word) => word.id));
      const remainingWords = resume ? groupWords.filter((word) => !processedIds.has(word.id)) : groupWords;
      const remainingIds = remainingWords.map((word) => word.id);
      const dueReviewWords = sourceWords.filter((word) => {
        if (remainingIds.includes(word.id)) return false;
        const entry = progressFor(progress, word.id);
        const familiarity = familiarityForProgress(entry);
        return isReviewDue(entry.nextReviewAt, Boolean(entry.completed), familiarity, Date.now());
      });
      const ids = [...new Set([...groupWords.map((word) => word.id), ...dueReviewWords.map((word) => word.id)])];
      const queued = new Set(remainingIds);
      const reviewIds = dueReviewWords.map((word) => word.id).filter((id) => !queued.has(id));
      const freshIds = [...remainingIds];
      remainingIds.length = 0;
      let freshIndex = 0;
      let reviewIndex = 0;
      while (freshIndex < freshIds.length || reviewIndex < reviewIds.length) {
        for (let slot = 0; slot < 4 && freshIndex < freshIds.length; slot += 1) remainingIds.push(freshIds[freshIndex++]);
        if (reviewIndex < reviewIds.length) remainingIds.push(reviewIds[reviewIndex++]);
      }
      const firstOutcomes = Object.fromEntries(processedWords.flatMap((word) => {
        const outcome = familiarityForProgress(progressFor(progress, word.id));
        return outcome ? [[word.id, outcome]] : [];
      })) as Partial<Record<string, Familiarity>>;
      const counts = { familiar: 0, vague: 0, unfamiliar: 0 };
      for (const outcome of Object.values(firstOutcomes)) if (outcome) counts[outcome] += 1;
      const orderedIds = settings.order === "random" ? shuffle(remainingIds) : remainingIds;
      return { ids, remainingIds: orderedIds, firstOutcomes, startedAt: targetStartedAt, ...counts, groupNo: targetGroupNo, index: processedWords.length };
    };

    let session = makeSession(groupNo, startedAt, isResuming);
    if (session.remainingIds.length === 0) {
      groupNo = (groupNo + 1) % groupCount;
      startedAt = Date.now();
      session = makeSession(groupNo, startedAt, false);
      setNextGroupByBook((current) => ({ ...current, [book]: groupNo }));
      setActiveGroupByBook((current) => {
        const next = { ...current };
        delete next[book];
        return next;
      });
      setSettingsByBook((current) => {
        const saved = current[book] ?? settings;
        return { ...current, [book]: { ...saved, wordGroups: { ...saved.wordGroups, [saved.scope]: groupNo } } };
      });
    }
    if (session.remainingIds.length === 0) return false;

    setGroupBrowseIds(null);
    setGroupSummary(null);
    setSessionDepleted(false);
    setGroupSession(session);
    setActiveGroupByBook((current) => ({ ...current, [book]: { groupNo, scope: settings.scope, startedAt } }));
    setCurrentWordId(session.remainingIds[0]);
    setRoundNonce((value) => value + 1);
    return true;
  }, [activeGroupByBook, nextGroupByBook, progress]);
  const studyReady = hydrated && settingsHydrated && entryGate === "active" && !studyPaused && settingsOpenFor === null && Boolean(settingsByBook[selectedBook]);

  const displayedDailySummary = dailySummarySnapshot?.summary ?? dailySummary;

  const openDailySummary = useCallback(() => {
    setDailySummarySnapshot({ summary: dailySummary, capturedAt: new Date() });
    setShareError("");
  }, [dailySummary]);

  const continueStudying = useCallback(() => {
    setDailySummarySnapshot(null);
  }, []);

  const openReviewSettings = useCallback(() => {
    const saved = settingsByBook[selectedBook] ?? { ...DEFAULT_STUDY_SETTINGS, voice, order };
    const reviewSettings: StudySettings = {
      ...saved,
      method: "browse",
      reviewView: "overall",
      reviewFamiliarities: ["vague", "unfamiliar"],
      wordGroups: { ...saved.wordGroups, [saved.scope]: null },
    };
    setListModeActive(false);
    setSettingsDraft(toSettingsDraft(reviewSettings));
    settingsDraftBookRef.current = selectedBook;
    setSetupMode("single");
    setPkSetupBook(selectedBook === "生词本" ? "小学" : selectedBook);
    setSettingsOpenFor(selectedBook);
    setStudyPaused(true);
    setEntryGate("settings");
  }, [order, selectedBook, settingsByBook, voice]);

  const shareDailySummary = useCallback(async () => {
    setSharingSummary(true);
    setShareError("");
    let file: File | null = null;
    try {
      if (!dailySummarySnapshot) return;
      const message = customEncouragement.trim() || selectedEncouragement;
      file = await createDailySummaryImage(dailySummarySnapshot.summary, message, dailySummarySnapshot.capturedAt);
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "每日词汇记录", text: message });
      } else {
        downloadDailySummaryImage(file);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (file && error instanceof DOMException && error.name === "NotAllowedError") {
        downloadDailySummaryImage(file);
      } else {
        setShareError(error instanceof Error ? error.message : "分享图片失败，请重试。");
      }
    } finally {
      setSharingSummary(false);
    }
  }, [customEncouragement, dailySummarySnapshot, selectedEncouragement]);

  const currentWord = useMemo(
    () => visibleWords.find((word) => word.id === currentWordId) ?? null,
    [currentWordId, visibleWords],
  );
  const definitionOptions = useMemo(() => {
    if (!currentWord?.definitionCn.trim()) return [];
    const correct = getDefinitionOptionText(currentWord.definitionCn);
    const distractors = [...new Set(visibleWords.map((word) => getDefinitionOptionText(word.definitionCn)).filter((definition) => definition && definition !== correct))];
    return shuffle([correct, ...shuffle(distractors).slice(0, 3)]);
  }, [currentWord?.id, currentWord?.definitionCn, visibleWords]);
  useEffect(() => setDefinitionChoice(null), [currentWordId]);
  const currentProgress = currentWord ? progressFor(progress, currentWord.id) : emptyProgress();
  const reviewedTodayCount = visibleWords.filter((word) => isReviewedToday(progressFor(progress, word.id).lastReviewedAt, Date.now())).length;
  const dailyGoal = currentSettings.dailyNew;
  const browseMode = currentSettings.method === "browse";
  const canRunRound = !browseMode || pageVisible;
  const savedModeIndex = selectEnabledMode(
    browseMode ? browseChoiceRef.current ?? 0 : currentProgress.lastReviewedAt === null ? 1 : currentProgress.modeIndex,
    enabledModeIndices(currentSettings),
  );
  const modeIndex = forcedSpellingWordId === currentWordId && enabledModeIndices(currentSettings).includes(3)
    ? 3
    : savedModeIndex;
  const currentRoundKey = currentWord
    ? `${currentWord.id}:${modeIndex}:${roundNonce}:${browseMode ? "browse" : "classified"}`
    : null;
  const currentRoundRevealed = currentRoundKey !== null && revealedRoundKey === currentRoundKey;
  const revealCurrentRound = useCallback(() => {
    if (currentRoundKey) setRevealedRoundKey(currentRoundKey);
  }, [currentRoundKey]);

  const waitForBrowseTime = useCallback((milliseconds: number, token: number, signal: AbortSignal) => new Promise<void>((resolve) => {
    let remaining = milliseconds;
    let previous = performance.now();
    setBrowseSecondsRemaining(Math.ceil(remaining / 1000));
    const finish = () => {
      window.clearInterval(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!browseCountdownPausedRef.current) remaining = Math.max(0, remaining - (now - previous));
      previous = now;
      if (roundTokenRef.current !== token || signal.aborted) { finish(); return; }
      setBrowseSecondsRemaining(Math.ceil(remaining / 1000));
      if (remaining === 0 && !browseCountdownPausedRef.current) finish();
    }, 100);
    if (signal.aborted) finish();
    else signal.addEventListener("abort", finish, { once: true });
  }), []);

  function toggleBrowseCountdown() {
    browseCountdownPausedRef.current = !browseCountdownPausedRef.current;
    setBrowseCountdownPaused(browseCountdownPausedRef.current);
  }

  useEffect(() => {
    if (!browseMode) { browseCountdownPausedRef.current = false; setBrowseCountdownPaused(false); setBrowseSecondsRemaining(null); }
  }, [browseMode]);

  useEffect(() => {
    if (!browseMode || !studyReady) return;
    function handleBrowseKeyboard(event: KeyboardEvent) {
      if (event.code !== "Space" && event.key !== " ") return;
      const target = event.target;
      if (event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey
        || (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
          && !target.closest(".vocabulary-learning-spelling-inline-input"))) return;
      event.preventDefault();
      toggleBrowseCountdown();
    }
    document.addEventListener("keydown", handleBrowseKeyboard);
    return () => document.removeEventListener("keydown", handleBrowseKeyboard);
  }, [browseMode, studyReady]);

  useEffect(() => {
    setDetailPayload(null);
    setDetailLoading(Boolean(currentWord));
    if (!currentWord) return;

    const controller = new AbortController();
    void fetch(`/api/vocabulary-hint?word=${encodeURIComponent(currentWord.word)}&detail=1&study=1`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("详情加载失败");
        return (await response.json()) as VocabularyDetailPayload;
      })
      .then((payload) => {
        if (payload?.entry && Array.isArray(payload.formationParts) && Array.isArray(payload.phrases) && Array.isArray(payload.usageExamples)) {
          setDetailPayload(payload);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetailPayload(null);
      }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });

    return () => controller.abort();
  }, [currentWord?.id]);

  useEffect(() => {
    if (!studyReady || loading || currentWordId !== null || activeStudyWords.length === 0 || groupSession || groupSummary) return;
    const now = Date.now();
    const next = chooseNextWord(
      activeStudyWords,
      progress,
      now,
      currentSettings.order,
      null,
      currentSettings,
      `${selectedBook}:${currentSettings.scope}`,
      selectedBook,
    );
    if (next) {
      setSessionDepleted(false);
      chooseBrowseMode(currentSettings);
      setCurrentWordId(next.id);
      return;
    }
    setSessionDepleted(true);
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    let nextWake = midnight.getTime();
    for (const word of activeStudyWords) {
      const entry = progressFor(progress, word.id);
      if (!entry.completed && entry.nextReviewAt && entry.nextReviewAt > now) {
        nextWake = Math.min(nextWake, entry.nextReviewAt);
      }
    }
    const timer = window.setTimeout(() => setWakeTick((value) => value + 1), Math.max(1000, nextWake - now + 50));
    return () => window.clearTimeout(timer);
  }, [activeStudyWords, chooseBrowseMode, currentSettings, currentWordId, groupSession, groupSummary, loading, progress, studyReady, wakeTick]);

  useEffect(() => {
    if (!hydrated || loading || currentWordId !== null || visibleWords.length > 0) return;
    setCurrentWordId(null);
  }, [currentWordId, hydrated, loading, visibleWords.length]);

  useEffect(() => {
    if (currentWordId && !visibleWords.some((word) => word.id === currentWordId)) {
      setCurrentWordId(null);
    }
  }, [currentWordId, visibleWords]);

  const revealBrowseSpelling = useCallback((roundToken = roundTokenRef.current) => {
    if (!browseMode || !pageVisible || !studyReady || !currentWord || modeIndex !== 3 || roundTokenRef.current !== roundToken) return;
    if (browseSpellingRevealedTokenRef.current === roundToken) return;
    browseSpellingRevealedTokenRef.current = roundToken;
    const correct = answerRef.current.trim().toLowerCase() === currentWord.word.trim().toLowerCase();
    setSpellingAnswerShown(true);
    revealCurrentRound();
    if (!correct) setRoundHadSpellingError(true);
    void playSpellingFeedbackThenWord(currentWord, correct, roundToken);
  }, [browseMode, currentSettings.scope, currentWord, modeIndex, pageVisible, playSpellingFeedbackThenWord, revealCurrentRound, selectedBook, studyReady]);

  const revealSpeakingDetails = useCallback((roundToken = roundTokenRef.current) => {
    if (!currentWord || !currentRoundKey || roundTokenRef.current !== roundToken) return;
    setRevealedRoundKey(currentRoundKey);
    if (speakingDetailsRevealedTokenRef.current === roundToken) return;
    speakingDetailsRevealedTokenRef.current = roundToken;
    void playWordAudio(currentWord, voice, 1);
  }, [currentRoundKey, currentWord, voice]);

  useEffect(() => {
    const token = ++roundTokenRef.current;
    const countdownController = new AbortController();
    stopLearningAudio();
    spellingPlaybackPromiseRef.current = null;
    spellingClassificationPendingRef.current = false;
    setSpellingPlaybackPending(false);
    setPhase("idle");
    setRevealedRoundKey(null);
    setAnswer("");
    answerRef.current = "";
    setRoundHadSpellingError(false);
    setSpellingAnswerShown(false);
    setRecordingError("");
    setOralScoreFeedback(null);
    replaceRecordingAudio(null);
    setAdvancePending(false);
    oralTranscriptRef.current = "";
    oralRecognitionErrorRef.current = false;
    oralOutcomeLockedRef.current = false;

    if (!studyReady || !canRunRound || !currentWord || (!browseMode && currentProgress.completed)) return;

    const startRound = async () => {
      const reactionDelay = currentSettings.reactionSeconds[progressCategoryForMode(modeIndex)] * 1000;
      if (modeIndex === 1) {
        setPhase("playing");
        void playWordAudio(currentWord, voice, 1);
        if (browseMode) await waitForBrowseTime(reactionDelay, token, countdownController.signal);
        else await new Promise<void>((resolve) => window.setTimeout(resolve, reactionDelay));
        if ((roundTokenRef.current !== token || countdownController.signal.aborted)) return;
        revealCurrentRound();
        void playWordAudio(currentWord, voice, 1);
        setPhase("awaiting");
        return;
      }

      if (browseMode) {
        if (modeIndex === 3) {
          setPhase("awaiting");
          await waitForBrowseTime(reactionDelay, token, countdownController.signal);
          if (roundTokenRef.current === token && !countdownController.signal.aborted) revealBrowseSpelling(token);
          return;
        }
        if (modeIndex === 0) {
          setPhase("playing");
          await playWordAudio(currentWord, voice, 1);
          if ((roundTokenRef.current !== token || countdownController.signal.aborted)) return;
          await waitForBrowseTime(reactionDelay, token, countdownController.signal);
          if ((roundTokenRef.current !== token || countdownController.signal.aborted)) return;
          revealCurrentRound();
          setPhase("playing");
          void playWordAudio(currentWord, voice, 1).finally(() => {
            if (roundTokenRef.current === token && !countdownController.signal.aborted) setPhase("awaiting");
          });
          return;
        }
        setPhase("awaiting");
        await waitForBrowseTime(reactionDelay, token, countdownController.signal);
        if ((roundTokenRef.current !== token || countdownController.signal.aborted)) return;
        revealCurrentRound();
        return;
      }

      if (modeIndex === 0) {
        setPhase("playing");
        await playWordAudio(currentWord, voice, 1);
        if ((roundTokenRef.current !== token || countdownController.signal.aborted)) return;
        await new Promise<void>((resolve) => window.setTimeout(resolve, reactionDelay));
        if ((roundTokenRef.current !== token || countdownController.signal.aborted)) return;
        revealCurrentRound();
        void playWordAudio(currentWord, voice, 1);
        setPhase("awaiting");
        return;
      }

      if (modeIndex === 2) {
        setPhase("awaiting");
        await new Promise<void>((resolve) => window.setTimeout(resolve, reactionDelay));
        if ((roundTokenRef.current !== token || countdownController.signal.aborted) || recordingRef.current) return;
        revealSpeakingDetails(token);
        return;
      }

      if ((roundTokenRef.current !== token || countdownController.signal.aborted)) return;
      setPhase("awaiting");
    };

    void startRound();
    return () => countdownController.abort();
  }, [browseMode, canRunRound, currentProgress.completed, currentSettings.reactionSeconds, currentWord, modeIndex, replaceRecordingAudio, revealBrowseSpelling, revealCurrentRound, revealSpeakingDetails, roundNonce, studyReady, voice, waitForBrowseTime]);

  const selectWord = useCallback((nextSelection: BookSelectionKey) => {
    if (advancePending) return;
    if (isQualityNoticeBook(nextSelection)) {
      setSettingsOpenFor(null);
      setQualityNoticeOpen(true);
      return;
    }
    roundTokenRef.current += 1;
    stopLearningAudio();
    forceNextSpellingWordRef.current = false;
    setForcedSpellingWordId(null);
    setOralScoreFeedback(null);
    setCurrentWordId(null);
    setGroupSession(null);
    setGroupSummary(null);
    setGroupBrowseIds(null);
    setListModeActive(false);
    window.history.replaceState(null, "", `/vocabulary/books?level=${encodeURIComponent(nextSelection)}`);
    setPkSetupBook(nextSelection === "生词本" ? "小学" : nextSelection);
    if (nextSelection !== selectedBook) {
      setWords([]);
      setLoading(true);
      setSelectedBook(nextSelection);
    }
    setSettingsDraft(toSettingsDraft(settingsByBook[nextSelection] ?? { ...DEFAULT_STUDY_SETTINGS, voice, order }));
    settingsDraftBookRef.current = nextSelection;
    setSettingsOpenFor(nextSelection);
    setStudyPaused(true);
    setEntryGate("settings");
  }, [advancePending, order, selectedBook, settingsByBook, voice]);

  const openStudySettings = useCallback(() => {
    const listViewQuery = listModeActive ? "&view=list" : "";
    window.history.replaceState(null, "", `/vocabulary/books?level=${encodeURIComponent(selectedBook)}${listViewQuery}`);
    forceNextSpellingWordRef.current = false;
    setForcedSpellingWordId(null);
    if (settingsDraftBookRef.current !== selectedBook) {
      setSettingsDraft(toSettingsDraft(settingsByBook[selectedBook] ?? { ...DEFAULT_STUDY_SETTINGS, voice, order }));
      settingsDraftBookRef.current = selectedBook;
    }
    setPkSetupBook(selectedBook === "生词本" ? "小学" : selectedBook);
    setSettingsOpenFor(selectedBook);
    setStudyPaused(true);
    setEntryGate("settings");
  }, [listModeActive, order, selectedBook, settingsByBook, voice]);

  const continuePreviousStudy = useCallback(() => {
    setListModeActive(false);
    window.history.replaceState(null, "", `/vocabulary/books?level=${encodeURIComponent(selectedBook)}`);
    if (!settingsByBook[selectedBook]) {
      setEntryGate("select-book");
      return;
    }
    setEntryGate("active");
    setStudyPaused(false);
    setGroupSummary(null);
    setGroupBrowseIds(null);
    const savedSettings = settingsByBook[selectedBook] ?? DEFAULT_STUDY_SETTINGS;
    const settings: StudySettings = { ...savedSettings, method: "classified", reviewView: null, reviewFamiliarities: [] };
    setSettingsByBook((current) => ({ ...current, [selectedBook]: settings }));
    const sourceWords = selectedBook === "生词本" || settings.scope === "all" ? words : words.filter((word) => word.level === selectedBook);
    startClassifiedGroup(settings, sourceWords, selectedBook);
  }, [selectedBook, settingsByBook, startClassifiedGroup, words]);

  const selectResumeBook = useCallback((nextBook: BookSelectionKey) => {
    const settings = settingsByBook[nextBook];
    if (!settings) return;
    setResumeBookPickerOpen(false);
    if (nextBook === selectedBook) return;

    roundTokenRef.current += 1;
    stopLearningAudio();
    setSelectedBook(nextBook);
    setListModeActive(false);
    setVoice(settings.voice);
    setOrder(settings.order);
    setWords([]);
    setLoading(true);
    setCurrentWordId(null);
    setGroupSession(null);
    setGroupSummary(null);
    setGroupBrowseIds(null);
    setSessionDepleted(false);
    setStudyPaused(true);
    setSettingsOpenFor(null);
    setEntryGate("loading");
    window.history.replaceState(null, "", `/vocabulary/books?level=${encodeURIComponent(nextBook)}`);
  }, [selectedBook, settingsByBook]);

  const closeStudySettings = useCallback(() => {
    const rememberedSettings = settingsOpenFor ? parseSettingsDraft(settingsDraft) : null;
    if (settingsOpenFor && rememberedSettings) {
      setSettingsByBook((current) => ({ ...current, [settingsOpenFor]: rememberedSettings }));
    }
    roundTokenRef.current += 1;
    stopLearningAudio();
    holdingMicRef.current = false;
    stopRequestedRef.current = true;
    recordingFinishedRef.current = true;
    const recorder = recordingRef.current;
    recordingRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // The recorder may have stopped between the state check and stop call.
      }
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    try {
      speechRecognitionRef.current?.stop();
    } catch {
      // Recognition may already have stopped.
    }
    speechRecognitionRef.current = null;
    replaceRecordingAudio(null);
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = null;
    setAdvancePending(false);
    setCurrentWordId(null);
    forceNextSpellingWordRef.current = false;
    setForcedSpellingWordId(null);
    setSessionDepleted(false);
    setStudyPaused(true);
    setSettingsOpenFor(null);
    setEntryGate(settingsByBook[selectedBook] || (settingsOpenFor === selectedBook && rememberedSettings) ? "continue" : "select-book");
  }, [replaceRecordingAudio, selectedBook, settingsByBook, settingsDraft, settingsOpenFor]);

  const saveStudySettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settingsOpenFor) return;
    const settings = parseSettingsDraft(settingsDraft);
    if (!settings) return;
    setListModeActive(false);
    setCurrentWordId(null);
    forceNextSpellingWordRef.current = false;
    setForcedSpellingWordId(null);
    chooseBrowseMode(settings);
    setSettingsByBook((current) => ({ ...current, [settingsOpenFor]: settings }));
    setVoice(settings.voice);
    setOrder(settings.order);
    setStudyPaused(false);
    setEntryGate("active");
    setSettingsOpenFor(null);
    setSessionDepleted(false);
    setGroupSummary(null);
    if (settings.method === "classified") {
      const selected = settingsOpenFor === "生词本" || settings.scope === "all"
        ? words
        : words.filter((word) => word.level === settingsOpenFor);
      startClassifiedGroup(settings, selected, settingsOpenFor);
    } else {
      setGroupSession(null);
      setGroupBrowseIds(null);
    }
  };

  const enterListMode = () => {
    const book = settingsOpenFor ?? selectedBook;
    const settings = settingsOpenFor ? parseSettingsDraft(settingsDraft) : currentSettings;
    if (!settings) return;
    roundTokenRef.current += 1;
    stopLearningAudio();
    if (settings.modes[0] === "listening" || settings.modes[0] === "speaking") unlockLearningAudio();
    setSettingsByBook((current) => ({ ...current, [book]: settings }));
    setVoice(settings.voice);
    setOrder(settings.order);
    setCurrentWordId(null);
    setGroupSession(null);
    setGroupSummary(null);
    setGroupBrowseIds(null);
    setSessionDepleted(false);
    setListModeActive(true);
    setStudyPaused(true);
    setEntryGate("active");
    setSettingsOpenFor(null);
    window.history.replaceState(null, "", `/vocabulary/books?level=${encodeURIComponent(book)}&view=list`);
  };

  const openCustomBook = () => {
    closeStudySettings();
    setGroupSession(null);
    setGroupSummary(null);
    setGroupBrowseIds(null);
    setCustomBookOpen(true);
  };

  const validSettingsDraft = parseSettingsDraft(settingsDraft) !== null;
  const scopeBook = settingsOpenFor ?? selectedBook;
  const scopeCounts = scopeBook === "生词本"
    ? { added: favoriteWords.length, total: favoriteWords.length }
    : bookCounts[scopeBook];
  const settingsReviewCounts = useMemo(() => {
    if (!settingsOpenFor) return null;
    const scopePool = settingsOpenFor === "生词本" || settingsDraft.scope === "all"
      ? words
      : words.filter((word) => word.level === settingsOpenFor);
    const scopedWords = selectVocabularyStudyGroup(scopePool, settingsDraft.wordGroups[settingsDraft.scope]);
    const allRecords = scopedWords
      .map((word) => progressFor(progress, word.id))
      .filter((entry) => entry.lastReviewedAt !== null && (entry.lastOutcome !== "unscored" || Boolean(entry.familiarity)));
    const now = Date.now();
    const todayRecords = allRecords.filter((entry) => isReviewedToday(entry.lastReviewedAt, now));
    const source = settingsDraft.reviewView === "today" ? todayRecords : allRecords;
    const familiarityCounts: Record<CollectionKey, number> = { familiar: 0, vague: 0, unfamiliar: 0 };
    for (const entry of source) {
      const familiarity = familiarityForProgress(entry);
      const category = entry.lastCategory ?? "reading";
      if (familiarity && (settingsDraft.reviewView === null || settingsDraft.modes.includes(category))) {
        familiarityCounts[familiarity] += 1;
      }
    }
    return {
      today: todayRecords.length,
      overall: allRecords.length,
      total: scopedWords.length,
      familiarity: familiarityCounts,
    };
  }, [progress, settingsDraft.modes, settingsDraft.reviewView, settingsDraft.scope, settingsDraft.wordGroups, settingsOpenFor, words]);

  const toggleStudyMode = (category: ProgressCategory) => {
    if (settingsListMode) {
      setSettingsDraft((current) => ({ ...current, modes: [category] }));
      return;
    }
    setSettingsDraft((current) => ({
      ...current,
      modes: current.modes.includes(category)
        ? current.modes.filter((mode) => mode !== category)
        : [...current.modes, category],
    }));
  };

  const selectListMode = () => {
    setSettingsDraft((current) => ({
      ...current,
      modes: current.modes.length > 0 ? [current.modes[0]] : [REACTION_TIME_OPTIONS[0].category],
    }));
    setSettingsListMode(true);
  };

  const moveToNextWord = useCallback(
    (updatedProgress: ProgressStore, outcome?: Outcome) => {
      if (!currentWord) return;
      if (groupSession && outcome && outcome !== "unscored") {
        const firstClassification = !groupSession.firstOutcomes[currentWord.id];
        const counts = {
          familiar: groupSession.familiar + (firstClassification && outcome === "familiar" ? 1 : 0),
          vague: groupSession.vague + (firstClassification && outcome === "vague" ? 1 : 0),
          unfamiliar: groupSession.unfamiliar + (firstClassification && outcome === "unfamiliar" ? 1 : 0),
        };
        const remainingIds = groupSession.remainingIds.filter((id) => id !== currentWord.id);
        const reviewPool = selectedBook === "生词本" || currentSettings.scope === "all"
          ? words
          : words.filter((word) => word.level === selectedBook);
        const now = Date.now();
        const dueReviewIds = reviewPool.flatMap((word) => {
          if (word.id === currentWord.id || remainingIds.includes(word.id)) return [];
          const entry = progressFor(updatedProgress, word.id);
          const familiarity = familiarityForProgress(entry);
          return isReviewDue(entry.nextReviewAt, Boolean(entry.completed), familiarity, now)
            ? [word.id]
            : [];
        });
        const nextRemainingIds = [...remainingIds, ...dueReviewIds];
        const groupIds = [...new Set([...groupSession.ids, ...dueReviewIds])];
        setDefinitionChoice(null);
        if (nextRemainingIds.length === 0) {
          const endedAt = Date.now();
          const groupSourceWords = selectedBook === "生词本" || currentSettings.scope === "all"
            ? words
            : words.filter((word) => word.level === selectedBook);
          const groupCount = Math.max(1, Math.ceil(groupSourceWords.length / GROUP_SIZE));
          const nextGroupNo = (groupSession.groupNo + 1) % groupCount;
          setGroupSession(null);
          setGroupSummary({ ids: groupSession.ids, startedAt: groupSession.startedAt, ...counts, groupNo: groupSession.groupNo, endedAt, book: selectedBook });
          setNextGroupByBook((current) => ({ ...current, [selectedBook]: nextGroupNo }));
          setActiveGroupByBook((current) => {
            const next = { ...current };
            delete next[selectedBook];
            return next;
          });
          setSettingsByBook((current) => {
            const saved = current[selectedBook] ?? currentSettings;
            return { ...current, [selectedBook]: { ...saved, wordGroups: { ...saved.wordGroups, [saved.scope]: nextGroupNo } } };
          });
          setCurrentWordId(null);
          setSessionDepleted(true);
          return;
        }
        setGroupSession({ ...groupSession, ...counts, ids: groupIds, remainingIds: nextRemainingIds, firstOutcomes: { ...groupSession.firstOutcomes, [currentWord.id]: groupSession.firstOutcomes[currentWord.id] ?? outcome }, index: groupIds.length - nextRemainingIds.length });
        setCurrentWordId(nextRemainingIds[0]);
        setSessionDepleted(false);
        setRoundNonce((value) => value + 1);
        return;
      }
      const next = chooseNextWord(
        activeStudyWords,
        updatedProgress,
        Date.now(),
        currentSettings.order,
        currentWord.id,
        currentSettings,
        `${selectedBook}:${currentSettings.scope}`,
        selectedBook,
      );
      if (next) chooseBrowseMode(currentSettings);
      if (forceNextSpellingWordRef.current && next && enabledModeIndices(currentSettings).includes(3)) {
        setForcedSpellingWordId(next.id);
      } else if (!next || forcedSpellingWordId === currentWord.id) {
        setForcedSpellingWordId(null);
      }
      forceNextSpellingWordRef.current = false;
      setCurrentWordId(next?.id ?? null);
      setSessionDepleted(next === null);
      setRoundNonce((value) => value + 1);
    },
    [activeStudyWords, chooseBrowseMode, currentSettings, currentWord, forcedSpellingWordId, groupSession, selectedBook, visibleWords, words],
  );

  const commitBrowse = useCallback(() => {
    if (!browseMode || !pageVisible || !currentWord || advancePending) return;
    const timestamp = Date.now();
    const previous = progressFor(progress, currentWord.id);
    const next: ProgressEntry = {
      ...previous,
      sourceBooks: [...new Set([...(previous.sourceBooks ?? []), currentWord.level])],
      browseByBook: {
        ...previous.browseByBook,
        [`${selectedBook}:${currentSettings.scope}`]: scheduleBrowseReview(
          previous.browseByBook?.[`${selectedBook}:${currentSettings.scope}`] ?? {},
          modeIndex,
          timestamp,
        ),
      },
    };
    const updatedProgress = { ...progress, [currentWord.id]: next };
    const priorBrowse = previous.browseByBook?.[`${selectedBook}:${currentSettings.scope}`];
    recordDailyActivity(currentWord.id, progressCategoryForMode(modeIndex), null, Boolean(priorBrowse?.browseLastSeenAt), timestamp);
    setProgress(updatedProgress);
    moveToNextWord(updatedProgress);
  }, [advancePending, browseMode, currentSettings, currentWord, modeIndex, moveToNextWord, pageVisible, progress, recordDailyActivity, selectedBook]);

  useEffect(() => {
    if (!browseMode || !pageVisible || !studyReady || !currentWord || !currentRoundRevealed || detailLoading || advancePending || spellingPlaybackPending
      || (modeIndex <= 1 && phase === "playing")) return;
    const token = roundTokenRef.current;
    const controller = new AbortController();
    void waitForBrowseTime(2000, token, controller.signal).then(() => {
      if (!controller.signal.aborted && roundTokenRef.current === token) commitBrowse();
    });
    return () => controller.abort();
  }, [advancePending, browseMode, commitBrowse, currentRoundRevealed, currentWord, detailLoading, modeIndex, pageVisible, phase, roundNonce, spellingPlaybackPending, studyReady, waitForBrowseTime]);

  const commitOutcome = useCallback(
    (
      outcome: Outcome,
      spellingDetails?: { correct: boolean; hadError: boolean; unanswered: boolean },
      oralScore?: number,
      advanceDelayMs = 1000,
    ) => {
      if (!currentWord || outcome === "unscored" || advancePending) return;
      const timestamp = Date.now();
      const previous = progressFor(progress, currentWord.id);
      const spellingError = Boolean(spellingDetails && (!spellingDetails.correct || spellingDetails.hadError));
      const oralFamiliarNextMode = modeIndex === 2 && outcome === "familiar" ? 3 : undefined;
      const scheduledReview = scheduleReview(
        { ...previous, modeIndex },
        outcome,
        timestamp,
        spellingError,
        enabledModeIndices(currentSettings),
        oralFamiliarNextMode,
      );
      const next: ProgressEntry = {
        ...previous,
        ...scheduledReview,
        sourceBooks: [...new Set([...(previous.sourceBooks ?? []), currentWord.level])],
        firstLearnedAt: previous.firstLearnedAt ?? timestamp,
        modeIndex: scheduledReview.modeIndex,
        familiarity: outcome,
        lastCategory: progressCategoryForMode(modeIndex),
        modeOutcomes: { ...previous.modeOutcomes, [progressCategoryForMode(modeIndex)]: outcome },
        lastOutcome: outcome,
        lastReviewedAt: timestamp,
      };

      if (spellingDetails) {
        const wrong = !spellingDetails.correct || spellingDetails.hadError;
        next.spellingHadError = previous.spellingHadError || wrong;
        next.spellingErrorCount = previous.spellingErrorCount + (wrong ? 1 : 0);
        next.spellingUnansweredCount = previous.spellingUnansweredCount + (spellingDetails.unanswered ? 1 : 0);
      }

      setOralScoreFeedback(typeof oralScore === "number" ? oralScore : null);
      const updatedProgress = { ...progress, [currentWord.id]: next };
      setAdvancePending(true);
      if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = window.setTimeout(() => {
        advanceTimerRef.current = null;
        setAdvancePending(false);
        recordDailyActivity(currentWord.id, progressCategoryForMode(modeIndex), outcome, previous.lastReviewedAt !== null, timestamp);
        setProgress(updatedProgress);
        moveToNextWord(updatedProgress, outcome);
      }, advanceDelayMs);
    },
    [advancePending, currentSettings, currentWord, modeIndex, moveToNextWord, progress, recordDailyActivity],
  );

  const handleRecognitionOutcome = useCallback(
    (outcome: Familiarity) => {
      if (modeIndex < 2 && !currentRoundRevealed) return;
      if (modeIndex === 2) {
        if (oralScoreFeedback === null) return;
        commitOutcome(outcome, undefined, oralScoreFeedback);
        return;
      }

      if (modeIndex > 1) return;
      commitOutcome(outcome);
    },
    [commitOutcome, currentRoundRevealed, modeIndex, oralScoreFeedback],
  );

  const spellingCorrect = currentWord ? answer.trim().toLowerCase() === currentWord.word.trim().toLowerCase() : false;

  const revealSpellingAnswer = useCallback(() => {
    if (!currentWord || modeIndex !== 3 || phase === "recording" || spellingAnswerShown) return;
    const correct = currentWord.word.trim().toLowerCase() === answerRef.current.trim().toLowerCase();
    setSpellingAnswerShown(true);
    if (!correct) setRoundHadSpellingError(true);
    void playSpellingFeedbackThenWord(currentWord, correct, roundTokenRef.current);
  }, [currentWord, modeIndex, phase, playSpellingFeedbackThenWord, spellingAnswerShown]);

  const submitSpelling = useCallback(
    async (requestedOutcome: Familiarity) => {
      if (!currentWord || modeIndex !== 3 || phase === "recording") return;
      const currentAnswer = answerRef.current.trim();
      const correct = currentAnswer.toLowerCase() === currentWord.word.trim().toLowerCase();
      if (!correct && requestedOutcome === "familiar") return;
      if (spellingClassificationPendingRef.current) return;
      spellingClassificationPendingRef.current = true;
      const roundToken = roundTokenRef.current;
      if (!spellingAnswerShown) revealSpellingAnswer();
      await spellingPlaybackPromiseRef.current;
      if (roundToken !== roundTokenRef.current) return;

      if (correct) {
        forceNextSpellingWordRef.current = true;
        commitOutcome(requestedOutcome, {
          correct: true,
          hadError: false,
          unanswered: false,
        });
        return;
      }

      if (!spellingAnswerShown) {
        revealCurrentRound();
        setSpellingAnswerShown(true);
      }

      forceNextSpellingWordRef.current = true;
      commitOutcome(requestedOutcome, {
        correct,
        hadError: roundHadSpellingError,
        unanswered: currentAnswer.length === 0,
      }, undefined, 2000);
    },
    [commitOutcome, currentWord, modeIndex, phase, revealCurrentRound, revealSpellingAnswer, roundHadSpellingError, spellingAnswerShown],
  );

  useEffect(() => {
    if (!studyReady || !pageVisible || loading || advancePending || !currentWord || browseMode) return;

    const handleClassificationKeyboard = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      const editable = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      const key = event.key.toLowerCase();
      const letterShortcut = key === "j" || key === "k" || key === "l";
      if (editable && (modeIndex !== 3 || (letterShortcut && !spellingAnswerShown))) return;
      if (modeIndex < 2 && currentSettings.showOptions && definitionOptions.length >= 4 && !currentRoundRevealed && /^[a-d]$/.test(key)) {
        event.preventDefault();
        setDefinitionChoice(key.charCodeAt(0) - 97);
        revealCurrentRound();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "ArrowRight" || letterShortcut) {
        event.preventDefault();
        const requestedOutcome = event.key === "ArrowLeft" || key === "j"
          ? "familiar"
          : event.key === "ArrowDown" || key === "k"
            ? "vague"
            : "unfamiliar";
        if (modeIndex === 3) {
          if (requestedOutcome === "familiar" && !spellingCorrect) return;
          submitSpelling(requestedOutcome);
        } else {
          handleRecognitionOutcome(requestedOutcome);
        }
        return;
      }

      if (event.key !== "Enter" || modeIndex !== 3 || editable) return;
      event.preventDefault();
      revealSpellingAnswer();
    };

    document.addEventListener("keydown", handleClassificationKeyboard);
    return () => document.removeEventListener("keydown", handleClassificationKeyboard);
  }, [advancePending, browseMode, currentRoundRevealed, currentSettings.showOptions, currentWord, definitionOptions.length, handleRecognitionOutcome, loading, modeIndex, pageVisible, revealCurrentRound, revealSpellingAnswer, spellingAnswerShown, spellingCorrect, studyReady, submitSpelling]);

  const finishRecording = useCallback(() => {
    if (recordingFinishedRef.current || oralOutcomeLockedRef.current) return;
    recordingFinishedRef.current = true;
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    recordingRef.current = null;
    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Recognition may already have ended when the microphone is released.
      }
    }

    const recordedChunks = recordingChunksRef.current;
    if (recordedChunks.length > 0) {
      replaceRecordingAudio(new Blob(recordedChunks, { type: recordedChunks[0]?.type || "audio/webm" }));
    }

    setPhase("scoring");
    const token = roundTokenRef.current;
    window.setTimeout(() => {
      if (roundTokenRef.current !== token || !currentWord || oralOutcomeLockedRef.current) return;
      if (oralRecognitionErrorRef.current) {
        revealSpeakingDetails(token);
        setRecordingError("录音已保存，但浏览器未能识别语音，本轮无法自动评分。请重新录音，或使用 Chrome／Edge。");
        setPhase("awaiting");
        return;
      }

      const score = scoreSpokenWord(oralTranscriptRef.current, currentWord.word);
      oralOutcomeLockedRef.current = true;
      revealSpeakingDetails(token);
      setOralScoreFeedback(score);
      setPhase("awaiting");
    }, 500);
  }, [currentWord, replaceRecordingAudio, revealSpeakingDetails]);

  const startRecording = useCallback(async () => {
    if (!currentWord || modeIndex !== 2 || phase === "recording" || phase === "scoring" || advancePending) return;
    setRevealedRoundKey(null);
    speakingDetailsRevealedTokenRef.current = -1;
    setRecordingError("");
    setOralScoreFeedback(null);
    replaceRecordingAudio(null);
    stopRequestedRef.current = false;
    recordingFinishedRef.current = false;
    oralTranscriptRef.current = "";
    oralRecognitionErrorRef.current = false;
    oralOutcomeLockedRef.current = false;

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setRecordingError("录音需要安全连接，请通过 HTTPS 页面打开后重试。若使用局域网地址，请确认地址以 https:// 开头。");
      setPhase("awaiting");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("当前浏览器不支持录音；本轮未产生评分。");
      setPhase("awaiting");
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      oralRecognitionErrorRef.current = true;
    }

    let stream: MediaStream | null = null;
    let recognition: SpeechRecognitionLike | null = null;
    let recorder: MediaRecorder | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!holdingMicRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setPhase("awaiting");
        return;
      }

      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = voice === "us" ? "en-US" : "en-GB";
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const transcripts: string[] = [];
          for (let index = 0; index < event.results.length; index += 1) {
            const transcript = event.results[index]?.[0]?.transcript;
            if (transcript) transcripts.push(transcript);
          }
          oralTranscriptRef.current = transcripts.join(" ");
        };
        recognition.onerror = (event) => {
          const error = (event as Event & { error?: string }).error;
          if (error !== "aborted") oralRecognitionErrorRef.current = true;
        };
        speechRecognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {
          oralRecognitionErrorRef.current = true;
          speechRecognitionRef.current = null;
          recognition = null;
        }
      }

      recorder = new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      recordingRef.current = recorder;
      recordingChunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", finishRecording, { once: true });
      setPhase("recording");
      recorder.start();
      if (stopRequestedRef.current) recorder.stop();
    } catch {
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // The recognition instance may not have started.
        }
      }
      speechRecognitionRef.current = null;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stream?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      recordingRef.current = null;
      setRecordingError("麦克风未授权或暂时不可用；本轮未产生评分。");
      setPhase("awaiting");
    }
  }, [advancePending, currentWord, finishRecording, modeIndex, phase, replaceRecordingAudio, voice]);

  const stopRecording = useCallback(() => {
    holdingMicRef.current = false;
    stopRequestedRef.current = true;
    const recorder = recordingRef.current;
    if (!recorder) return;
    if (recorder.state !== "inactive") recorder.stop();
  }, []);

  const playRecordedAudio = useCallback(() => {
    if (!recordingAudioUrl) return;
    const audio = new Audio(recordingAudioUrl);
    void audio.play().catch(() => undefined);
  }, [recordingAudioUrl]);

  const playCorrectPronunciation = useCallback(() => {
    if (!currentWord) return;
    void playWordAudio(currentWord, voice, 1);
  }, [currentWord, voice]);

  useEffect(() => {
    if (!studyReady || !pageVisible || loading || !currentWord || browseMode || modeIndex !== 2) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const element = event.target instanceof HTMLElement ? event.target : null;
      const editable = element?.isContentEditable || Boolean(element && ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName));
      const isSpace = event.code === "Space" || event.key === " ";
      if (editable) return;

      if (isSpace) {
        if (element?.closest("button:not(.vocabulary-mic-button)")) return;
        event.preventDefault();
        if (event.repeat || phase === "recording" || phase === "scoring" || advancePending) return;
        spaceKeyRecordingRef.current = true;
        holdingMicRef.current = true;
        void startRecording();
        return;
      }

      if (event.repeat || phase === "recording" || phase === "scoring") return;
      if (event.key === "1") {
        event.preventDefault();
        playRecordedAudio();
      } else if (event.key === "2") {
        event.preventDefault();
        playCorrectPronunciation();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if ((event.code !== "Space" && event.key !== " ") || !spaceKeyRecordingRef.current) return;
      event.preventDefault();
      spaceKeyRecordingRef.current = false;
      holdingMicRef.current = false;
      stopRecording();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [advancePending, browseMode, currentWord, loading, modeIndex, pageVisible, phase, playCorrectPronunciation, playRecordedAudio, startRecording, stopRecording, studyReady]);

  const updateSpelling = (event: ChangeEvent<HTMLInputElement>) => {
    const nextAnswer = event.target.value;
    answerRef.current = nextAnswer;
    setAnswer(nextAnswer);
    if (!currentWord) return;
    const normalized = nextAnswer.trim().toLowerCase();
    const target = currentWord.word.trim().toLowerCase();
    if (normalized && !target.startsWith(normalized)) setRoundHadSpellingError(true);
  };

  const detailEntry = currentWord ? toLookupEntry(currentWord) : null;
  const promptEnglishDefinitions = detailPayload?.entry
    && detailPayload.entry.word.trim().toLowerCase() === currentWord?.word.trim().toLowerCase()
    && detailPayload.entry.englishDefinitions.length > 0
    ? detailPayload.entry.englishDefinitions
    : currentWord?.englishDefinitions ?? [];
  const learningHeaderActions = detailEntry ? (
    <>
      <VocabularyFavoriteButton entry={detailEntry} />
      <VocabularyShareButton entry={detailEntry} />
    </>
  ) : null;
  const learningCategoryBar = browseMode ? <button aria-keyshortcuts="Space" aria-pressed={browseCountdownPaused} className="vocabulary-browse-countdown" onClick={toggleBrowseCountdown} type="button">
    {browseCountdownPaused ? "倒计时已暂停 · 空格继续" : `${currentRoundRevealed ? "详情停留" : "反应时间"} ${browseSecondsRemaining ?? (currentRoundRevealed ? 2 : currentSettings.reactionSeconds[progressCategoryForMode(modeIndex)])} 秒 · 空格暂停`}
  </button> : (
    <div className="vocabulary-learning-bottom-bar">
      <div className="vocabulary-learning-bottom-actions">
        <button
          className="vocabulary-learning-category-button familiar"
          aria-keyshortcuts="J ArrowLeft"
          title="按 J 或 ←：熟悉"
          disabled={advancePending || (modeIndex < 2 && !currentRoundRevealed) || (modeIndex === 2 && oralScoreFeedback === null) || (modeIndex === 3 && !spellingCorrect)}
          onClick={() => modeIndex === 3 ? submitSpelling("familiar") : handleRecognitionOutcome("familiar")}
          type="button"
        ><span>熟悉</span><small aria-hidden="true">J</small></button>
        <button
          className="vocabulary-learning-category-button vague"
          aria-keyshortcuts="K ArrowDown"
          title="按 K 或 ↓：模糊"
          disabled={advancePending || (modeIndex < 2 && !currentRoundRevealed) || (modeIndex === 2 && oralScoreFeedback === null)}
          onClick={() => modeIndex === 3 ? submitSpelling("vague") : handleRecognitionOutcome("vague")}
          type="button"
        ><span>模糊</span><small aria-hidden="true">K</small></button>
        <button
          className="vocabulary-learning-category-button unfamiliar"
          aria-keyshortcuts="L ArrowRight"
          title="按 L 或 →：生僻"
          disabled={advancePending || (modeIndex < 2 && !currentRoundRevealed) || (modeIndex === 2 && oralScoreFeedback === null)}
          onClick={() => modeIndex === 3 ? submitSpelling("unfamiliar") : handleRecognitionOutcome("unfamiliar")}
          type="button"
        ><span>生僻</span><small aria-hidden="true">L</small></button>
      </div>
    </div>
  );
  const showingVocabularyDetails = browseMode ? currentRoundRevealed : modeIndex < 2
    ? currentRoundRevealed
    : modeIndex === 2
      ? currentRoundRevealed
      : spellingAnswerShown;
  const assessmentStage = !showingVocabularyDetails;
  const detailPageStyle = assessmentStage && sidebarHeight !== null
    ? ({ "--vocabulary-learning-assessment-height": `${sidebarHeight}px` } as CSSProperties)
    : undefined;
  const roundMemoryAids = currentWord ? <>
    {currentSettings.showPicture ? <LearningRoundPicture key={currentWord.id} word={currentWord} /> : null}
    {currentSettings.showExamples ? <LearningRoundExamples word={currentWord} /> : null}
  </> : null;
  const definitionChoiceCards = currentSettings.showOptions && currentWord && modeIndex < 2 && definitionOptions.length >= 4 ? (
    <div aria-label="释义选项" className="vocabulary-learning-definition-options" role="group">
      {definitionOptions.map((option, index) => {
        const isCorrect = currentRoundRevealed && option === getDefinitionOptionText(currentWord.definitionCn);
        const isWrong = currentRoundRevealed && definitionChoice === index && !isCorrect;
        const shortcut = String.fromCharCode(65 + index);
        return <button aria-keyshortcuts={shortcut} aria-pressed={definitionChoice === index} className={`${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`} disabled={currentRoundRevealed} key={`${currentWord.id}-meaning-${index}`} onClick={() => { setDefinitionChoice(index); revealCurrentRound(); }} title={`按 ${shortcut} 选择`} type="button"><b aria-hidden="true">{shortcut}</b><span>{option}</span>{isCorrect ? <em>正确释义</em> : null}</button>;
      })}
    </div>
  ) : null;

  return (
    <section className="stack vocabulary-learning-page">
      <header className="mobile-learning-header">
        <VocabularyMobileBackLink ariaLabel="返回查单词" href="/vocabulary" />
        <h1>背单词</h1>
        <div className="vocabulary-learning-book-heading-actions">
          <button className="vocabulary-learning-mobile-summary" disabled={!dailyActivityHydrated || advancePending} onClick={openDailySummary} type="button">今日总结</button>
          <button className="vocabulary-learning-mobile-import" disabled={!settingsHydrated || advancePending} onClick={openCustomBook} type="button">自建生词本</button>
          <button aria-label="背单词设置" disabled={!settingsHydrated || advancePending} onClick={openStudySettings} type="button">⚙</button>
        </div>
      </header>
      <section aria-label="今日学习进度" className="mobile-learning-progress">
        <div><strong>今日学习</strong><span>已完成 {Math.min(reviewedTodayCount, dailyGoal)} / {dailyGoal}</span></div>
        <div aria-valuemax={dailyGoal} aria-valuemin={0} aria-valuenow={Math.min(reviewedTodayCount, dailyGoal)} className="mobile-learning-progress-track" role="progressbar"><span style={{ width: `${dailyGoal ? Math.min(100, reviewedTodayCount / dailyGoal * 100) : 0}%` }} /></div>
      </section>
      <div className="vocabulary-learning-layout">
        <aside className="vocabulary-learning-sidebar" ref={sidebarRef}>
          <div className="vocabulary-learning-book-heading">
            <div className="vocabulary-learning-book-heading-actions">
              <button className="vocabulary-learning-summary-trigger" disabled={!dailyActivityHydrated || advancePending} onClick={openDailySummary} type="button">今日总结</button>
              <button disabled={!settingsHydrated || advancePending} onClick={openCustomBook} type="button">自建生词本</button>
              <button disabled={!settingsHydrated || advancePending || entryGate === "select-book"} onClick={openStudySettings} type="button">设置</button>
            </div>
            <div className="vocabulary-learning-book-heading-copy">
              <span>词汇</span>
            </div>
          </div>
          <div className="vocabulary-learning-book-list">
            <button
              className={`vocabulary-learning-nav-button ${selectedBook === "生词本" ? "active" : ""}`}
              onClick={() => selectWord("生词本")}
              type="button"
            >
              <span aria-hidden="true" className="vocabulary-learning-nav-dot" />
              <span className="vocabulary-learning-nav-label">生词本</span>
              <strong>{favoriteWords.length.toLocaleString()}</strong>
              <span aria-hidden="true" className="vocabulary-learning-nav-arrow">›</span>
            </button>
            {books.map((book) => (
              <Fragment key={book.key}>
                {book.key === "小学短语" ? <h2 className="vocabulary-learning-phrase-heading">短语</h2> : null}
                <button
                  className={`vocabulary-learning-nav-button ${selectedBook === book.key ? "active" : ""}`}
                  onClick={() => selectWord(book.key)}
                  title={book.description}
                  type="button"
                >
                  <span aria-hidden="true" className="vocabulary-learning-nav-dot" />
                  <span className="vocabulary-learning-nav-label">{book.label}</span>
                  <strong>
                    {book.key === "其他词汇"
                      ? `${bookCounts[book.key].total.toLocaleString()}/${sourceCount.toLocaleString()}`
                      : bookCounts[book.key].added === bookCounts[book.key].total
                      ? bookCounts[book.key].total.toLocaleString()
                      : `${bookCounts[book.key].added.toLocaleString()}/${bookCounts[book.key].total.toLocaleString()}`}
                  </strong>
                  <span aria-hidden="true" className="vocabulary-learning-nav-arrow">›</span>
                </button>
              </Fragment>
            ))}
          </div>
        </aside>

        <main className="vocabulary-learning-workspace">
          <div className="vocabulary-learning-content-grid">
          {loading ? <div className="vocabulary-learning-empty">正在加载完整词库……</div> : null}
          {!loading && loadError ? (
            <div className="vocabulary-learning-empty vocabulary-learning-error">
              <strong>{loadError}</strong>
              <button className="button" onClick={() => setLoadNonce((value) => value + 1)} type="button">重试</button>
            </div>
          ) : null}
          {!loading && !loadError && entryGate === "select-book" ? (
            <div className="vocabulary-learning-empty vocabulary-learning-plan-empty">
              <strong className="vocabulary-learning-book-select-desktop">请选择左侧词汇</strong>
              <p className="vocabulary-learning-book-select-desktop">选择后会自动打开该分类的学习设置。</p>
              <strong className="vocabulary-learning-book-select-mobile">请点击右上角设置</strong>
              <p className="vocabulary-learning-book-select-mobile">在设置中选择词汇并完成学习设置。</p>
            </div>
          ) : null}
          {!loading && !loadError && entryGate === "continue" && !listModeActive ? (
            <div className="vocabulary-learning-empty vocabulary-learning-plan-empty">
              <strong>继续之前的进度</strong>
              <div className="vocabulary-learning-resume-book-picker">
                <p>将按照 {resumeBookOptions.length > 1 ? (
                  <button aria-controls="vocabulary-learning-resume-books" aria-expanded={resumeBookPickerOpen} className="vocabulary-learning-resume-book-chip" onClick={() => setResumeBookPickerOpen((open) => !open)} type="button">{selectedBookLabel}<span aria-hidden="true">⌄</span></button>
                ) : <span className="vocabulary-learning-resume-book-chip is-current">{selectedBookLabel}</span>} 上次保存的设置继续学习。</p>
                {resumeBookPickerOpen && resumeBookOptions.length > 1 ? (
                  <div aria-label="选择继续学习的词汇书" className="vocabulary-learning-resume-book-options" id="vocabulary-learning-resume-books" role="group">
                    {resumeBookOptions.map((book) => {
                      const label = book === "生词本" ? book : books.find((item) => item.key === book)?.label ?? book;
                      return <button aria-pressed={book === selectedBook} className={book === selectedBook ? "active" : ""} key={book} onClick={() => selectResumeBook(book)} type="button"><span>{label}</span>{book === selectedBook ? <small>当前选择</small> : null}</button>;
                    })}
                  </div>
                ) : null}
              </div>
              {currentSettings.method === "classified" ? (
                <p className="vocabulary-learning-resume-guidance">
                  {isResumingPartialGroup && partialGroupRemainingCount > 0
                    ? `第 ${resumeGroupNo + 1} 组还有 ${partialGroupRemainingCount} 个词尚未完成筛选，继续后会接着学习这一组。`
                    : `继续记忆将从第 ${resumeGroupNo + 1} 组新词开始，并穿插已到复习时间的模糊、生僻词。`}
                </p>
              ) : null}
              <div className="vocabulary-learning-resume-actions">
                <button className="button" onClick={continuePreviousStudy} type="button">继续记忆</button>
                {hasCompletedVocabularyGroup ? <button className="button secondary" onClick={openReviewSettings} type="button">开始复习</button> : null}
              </div>
            </div>
          ) : null}
          {!loading && !loadError && listModeActive ? (
            studyListWords.length > 0 ? (
              <VocabularyStudyList
                bookLabel={selectedBookLabel}
                key={currentSettings.modes[0] ?? "reading"}
                language={currentSettings.definitionLanguage}
                mode={currentSettings.modes[0] ?? "reading"}
                reactionSeconds={currentSettings.reactionSeconds[currentSettings.modes[0] ?? "reading"]}
                returnTo={`/vocabulary/books?level=${encodeURIComponent(selectedBook)}&view=list&resume=1`}
                voice={currentSettings.voice}
                words={studyListWords}
              />
            ) : (
              <div className="vocabulary-learning-empty"><strong>当前筛选条件下没有可显示的词汇。</strong></div>
            )
          ) : null}
          {!loading && !loadError && entryGate === "active" && groupSummary ? (
            <section aria-label="本组学习小结" className="vocabulary-learning-group-summary">
              <span className="vocabulary-learning-group-summary-kicker">本组完成</span>
              <h2>第 {groupSummary.groupNo + 1} 组学习小结</h2>
              <p>用时 {Math.floor((groupSummary.endedAt - groupSummary.startedAt) / 60000)} 分 {Math.floor(((groupSummary.endedAt - groupSummary.startedAt) % 60000) / 1000)} 秒 · 共 {groupSummary.ids.length} 个词</p>
              <div className="vocabulary-learning-group-summary-counts"><strong>熟悉 <b>{groupSummary.familiar}</b></strong><strong>模糊 <b>{groupSummary.vague}</b></strong><strong>生僻 <b>{groupSummary.unfamiliar}</b></strong></div>
              <div className="vocabulary-learning-group-summary-actions">
                <button className="primary" onClick={() => {
                  const groupSourceWords = selectedBook === "生词本" || currentSettings.scope === "all"
                    ? words
                    : words.filter((word) => word.level === selectedBook);
                  const nextGroupNo = (groupSummary.groupNo + 1) % Math.max(1, Math.ceil(groupSourceWords.length / GROUP_SIZE));
                  const settings = { ...currentSettings, wordGroups: { ...currentSettings.wordGroups, [currentSettings.scope]: nextGroupNo } };
                  setSettingsByBook((current) => ({ ...current, [selectedBook]: settings }));
                  setGroupSummary(null);
                  startClassifiedGroup(settings, groupSourceWords, selectedBook);
                }} type="button">继续下一组（记忆新词）</button>
                <button onClick={() => {
                  const browseSettings = { ...currentSettings, method: "browse" as const, reviewView: null, reviewFamiliarities: [], modes: [...ALL_STUDY_MODES] };
                  setSettingsByBook((current) => ({ ...current, [selectedBook]: browseSettings }));
                  setGroupBrowseIds(groupSummary.ids);
                  setGroupSession(null);
                  setGroupSummary(null);
                  setCurrentWordId(null);
                  setStudyPaused(false);
                  setSessionDepleted(false);
                  chooseBrowseMode(browseSettings);
                }} type="button">复习刚刚这一组</button>
                {groupSummary.book === "生词本" ? (
                  <button disabled title="积分 PK 按共享词汇书分别排名；请从正式词汇书开始 PK。" type="button">收藏词汇无法计入书籍 PK 榜</button>
                ) : (
                  <Link href={`/vocabulary/pk?book=${encodeURIComponent(selectedBook)}&mode=auto&wordIds=${encodeURIComponent(groupSummary.ids.join(","))}`}>
                    PK 本组词汇{groupSummary.ids.length < GROUP_SIZE ? "（本组循环至20题）" : ""}
                  </Link>
                )}
                <button onClick={() => { setGroupSummary(null); setGroupSession(null); setGroupBrowseIds(null); setCurrentWordId(null); setStudyPaused(true); setEntryGate("continue"); }} type="button">结束任务</button>
              </div>
            </section>
          ) : null}
          {!loading && !loadError && entryGate === "active" && !listModeActive && visibleWords.length === 0 ? (
            <div className="vocabulary-learning-empty">
              <strong>{selectedBook === "生词本" && favoriteWords.length === 0 ? "生词本还没有收藏的单词。" : "当前分类没有可处理的新词。"}</strong>
              <p>{selectedBook === "生词本" && favoriteWords.length === 0 ? "在单词页面点击收藏，单词会自动加入这里。" : "可以切换其他分类，或等待已安排的复习时间到达。"}</p>
            </div>
          ) : null}
          {!loading && !loadError && entryGate === "active" && !groupSummary && visibleWords.length > 0 && !currentWord && studyReady && sessionDepleted ? (
            <div className="vocabulary-learning-empty vocabulary-learning-plan-empty">
              <strong>当前没有可学习的词汇</strong>
              <p>{currentSettings.method === "browse" && (currentSettings.reviewView !== null || currentSettings.reviewFamiliarities.length > 0)
                ? "当前复习范围没有符合条件的词汇，可调整筛选条件。"
                : "今日数量已达上限，或下一轮复习尚未到时间；到期后会自动出现。"}</p>
              <button className="button" onClick={openStudySettings} type="button">调整设置</button>
            </div>
          ) : null}

          {!loading && !loadError && !listModeActive && settingsHydrated && settingsByBook[selectedBook] && currentWord ? (
              <article
                className={`vocabulary-learning-detail-page vocabulary-learning-lookup vocabulary-learning-stage-${modeIndex} ${assessmentStage ? "vocabulary-learning-assessment" : "vocabulary-learning-complete"}`}
                style={detailPageStyle}
              >
              {modeIndex < 2 ? (
                <VocabularyDetailShell
                  className="vocabulary-learning-detail-shell"
                  contentClassName="vocabulary-learning-stage-detail-main"
                  entry={detailEntry ?? toLookupEntry(currentWord)}
                  showBack={false}
                  showHeader={false}
                >
                  {learningCategoryBar}
                    <LearningVocabularyDetails
                      detailPayload={detailPayload?.entry.word.toLowerCase() === currentWord.word.toLowerCase() ? detailPayload : null}
                      definitionPrefix={<>{roundMemoryAids}{definitionChoiceCards}</>}
                      entry={detailEntry?.word.toLowerCase() === currentWord.word.toLowerCase() ? detailEntry : toLookupEntry(currentWord)}
                      showExamples={false}
                      showDefinition={currentRoundRevealed}
                      showWord={currentRoundRevealed || modeIndex === 1}
                    />
                </VocabularyDetailShell>
              ) : null}

              {modeIndex === 2 ? (
                <VocabularyDetailShell
                  className="vocabulary-learning-detail-shell"
                  contentClassName="vocabulary-learning-speaking-detail-main"
                  entry={detailEntry ?? toLookupEntry(currentWord)}
                  showHeader={false}
                >
                  {learningCategoryBar}
                  <div className="vocabulary-learning-speaking-row">
                    {!browseMode ? <div className="vocabulary-learning-speaking-controls">
                      <div className="vocabulary-learning-speaking-actions">
                      <button
                        aria-label={phase === "recording" ? "停止录音" : "开始录音"}
                        aria-keyshortcuts="Space"
                        className={`vocabulary-mic-button ${phase === "recording" ? "recording" : ""}`}
                        disabled={advancePending || phase === "scoring"}
                        title="点击开始或停止录音；桌面端可按住录音"
                        onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                          if (event.pointerType !== "mouse") {
                            touchMicPointerRef.current = true;
                            return;
                          }
                          event.currentTarget.setPointerCapture(event.pointerId);
                          holdingMicRef.current = true;
                          void startRecording();
                        }}
                        onPointerUp={(event: ReactPointerEvent<HTMLButtonElement>) => {
                          if (event.pointerType === "mouse") stopRecording();
                        }}
                        onPointerCancel={(event: ReactPointerEvent<HTMLButtonElement>) => {
                          if (event.pointerType === "mouse") {
                            stopRecording();
                          } else {
                            touchMicPointerRef.current = false;
                          }
                        }}
                        onClick={() => {
                          if (!touchMicPointerRef.current) return;
                          touchMicPointerRef.current = false;
                          if (phase === "recording" || recordingStartPendingRef.current) {
                            stopRecording();
                            return;
                          }
                          recordingStartPendingRef.current = true;
                          holdingMicRef.current = true;
                          void startRecording().finally(() => {
                            recordingStartPendingRef.current = false;
                          });
                        }}
                        type="button"
                      >
                        <span aria-hidden="true" className="vocabulary-mic-button-icon">
                          <svg viewBox="0 0 24 24">
                            <path d="M12 4a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0v-5A2.5 2.5 0 0 0 12 4Z" />
                            <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" />
                          </svg>
                        </span>
                      </button>
                        <button aria-label="重听录音" aria-keyshortcuts="1" className="button vocabulary-learning-play-button" disabled={!recordingAudioUrl} onClick={playRecordedAudio} title="数字 1：重听录音" type="button">
                          <span aria-hidden="true" className="vocabulary-audio-button-icon">
                            <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10" /></svg>
                          </span>
                        </button>
                      <button aria-label="播放正确发音" aria-keyshortcuts="2" className="button vocabulary-learning-correct-pronunciation-button" disabled={advancePending} onClick={playCorrectPronunciation} title="数字 2：播放正确读音" type="button">
                          <span aria-hidden="true" className="vocabulary-audio-button-icon">
                            <svg viewBox="0 0 24 24"><path d="m9 5 10 7-10 7V5Z" /></svg>
                          </span>
                        </button>
                      </div>
                      <p className="vocabulary-learning-speaking-shortcuts">点击麦克风开始或停止录音 · 桌面端可按住空格 · 数字 1 重听 · 数字 2 播放正确读音</p>
                      <div aria-live="polite" className="vocabulary-learning-score-slot">
                        {oralScoreFeedback !== null ? (
                          <div
                            className={`vocabulary-learning-score-feedback vocabulary-learning-score-feedback-${familiarityFromScore(oralScoreFeedback)}`}
                            role="status"
                          >
                            <strong>{oralScoreFeedback}</strong>
                            <small>分</small>
                          </div>
                        ) : null}
                      </div>
                    </div> : null}
                    {currentRoundRevealed ? (
                      <LearningVocabularyDetails
                        detailPayload={detailPayload}
                        definitionPrefix={roundMemoryAids}
                        entry={detailEntry ?? toLookupEntry(currentWord)}
                        showExamples={false}
                        />
                    ) : (
                      <DefinitionDisplay
                        answer={currentWord.word}
                        englishDefinitions={promptEnglishDefinitions}
                        language={displayedDefinitionLanguage}
                        prominent
                        value={currentWord.definitionCn}
                      />
                    )}
                  </div>
                  {!currentRoundRevealed ? roundMemoryAids : null}
                  {recordingError ? <p className="vocabulary-learning-inline-error">{recordingError}</p> : null}
                </VocabularyDetailShell>
              ) : null}

              {modeIndex === 3 ? (
                <VocabularyDetailShell
                  className="vocabulary-learning-detail-shell"
                  contentClassName="vocabulary-learning-spelling-detail-main"
                  entry={detailEntry ?? toLookupEntry(currentWord)}
                  headerActions={learningHeaderActions}
                  showBack={false}
                  showHeader={false}
                >
                    {learningCategoryBar}
                    <SpellingTitleInput
                      answer={answer}
                      autoFocus={!browseMode}
                      disabled={phase === "recording" || currentRoundRevealed || spellingAnswerShown || advancePending}
                      feedbackVisible={spellingAnswerShown}
                      focusOnReady={studyReady && pageVisible && (browseMode || modeIndex === 3)}
                      history={browseMode ? "" : `曾经错过 ${currentProgress.spellingErrorCount} 次`}
                      key={`${currentWord.id}:${roundNonce}`}
                      onChange={updateSpelling}
                      onEnter={browseMode ? () => revealBrowseSpelling() : revealSpellingAnswer}
                      onSubmit={browseMode ? () => revealBrowseSpelling() : revealSpellingAnswer}
                      target={currentWord.word}
                    />
                    {!(browseMode ? currentRoundRevealed : spellingAnswerShown) ? (
                      <DefinitionDisplay
                        answer={currentWord.word}
                        englishDefinitions={promptEnglishDefinitions}
                        language={displayedDefinitionLanguage}
                        prominent
                        value={currentWord.definitionCn}
                      />
                    ) : null}
                    {!(browseMode ? currentRoundRevealed : spellingAnswerShown) ? roundMemoryAids : null}
                    {(browseMode ? currentRoundRevealed : spellingAnswerShown) ? (
                      <LearningVocabularyDetails
                        detailPayload={detailPayload}
                        definitionPrefix={roundMemoryAids}
                        entry={detailEntry ?? toLookupEntry(currentWord)}
                        showExamples={false}
                        />
                    ) : null}
                </VocabularyDetailShell>
              ) : null}

              </article>
          ) : null}
          </div>
        </main>
      </div>
      {qualityNoticeOpen ? (
        <div className="vocabulary-learning-settings-backdrop">
          <section aria-labelledby="vocabulary-quality-notice-title" aria-modal="true" className="vocabulary-learning-settings-dialog vocabulary-quality-notice-dialog" role="dialog">
            <h2 id="vocabulary-quality-notice-title">暂未达到可公开学习的质量标准</h2>
            <button onClick={() => window.location.replace("/vocabulary/books")} type="button">确定</button>
          </section>
        </div>
      ) : null}
      {dailySummarySnapshot ? (
        <div className="vocabulary-daily-summary-backdrop">
          <section aria-labelledby="vocabulary-daily-summary-title" aria-modal="true" className="vocabulary-daily-summary-dialog" role="dialog">
            <button aria-label="关闭今日总结" className="vocabulary-daily-summary-close" onClick={continueStudying} type="button">×</button>
            <p className="vocabulary-daily-summary-date">{new Date(`${displayedDailySummary.date}T12:00:00`).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })} · 截至 {dailySummarySnapshot.capturedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p>
            <h2 id="vocabulary-daily-summary-title">今天的努力，看得见</h2>
            <p className="vocabulary-daily-summary-subtitle">背过的每一组、每一个词，都在慢慢变成自己的。</p>
            <div className="vocabulary-daily-summary-metrics">
              <div><span>学习组数</span><strong>{displayedDailySummary.groupsStudied}<small> 组</small></strong></div>
              <div><span>学习词汇</span><strong>{displayedDailySummary.studiedWords}<small> 个</small></strong></div>
            </div>
            <p className="vocabulary-daily-summary-group-note">按每组 20 个词统计，不足 20 个词也计为一组；多本词汇书分别计算。</p>
            <div aria-label="各项练习的熟悉度统计" className="vocabulary-daily-summary-breakdown" role="table">
              <div className="vocabulary-daily-summary-breakdown-head" role="row">
                <strong role="columnheader">练习方式</strong><strong role="columnheader">熟悉</strong><strong role="columnheader">模糊</strong><strong role="columnheader">生僻</strong>
              </div>
              {([["reading", "阅读"], ["listening", "听力"], ["speaking", "口语"], ["writing", "写作"]] as Array<[DailyMode, string]>).map(([mode, label]) => (
                <div className="vocabulary-daily-summary-mode-row" key={mode} role="row">
                  <strong role="rowheader">{label}</strong>
                  <span role="cell">{displayedDailySummary.modeOutcomes[mode].familiar}</span>
                  <span role="cell">{displayedDailySummary.modeOutcomes[mode].vague}</span>
                  <span role="cell">{displayedDailySummary.modeOutcomes[mode].unfamiliar}</span>
                </div>
              ))}
            </div>
            <div className="vocabulary-daily-summary-share">
              <strong>给今天的自己留句话</strong>
              <div aria-label="选择鼓励语" className="vocabulary-daily-summary-quotes" role="group">
                {DAILY_ENCOURAGEMENTS.map((quote) => (
                  <button aria-pressed={selectedEncouragement === quote} className={selectedEncouragement === quote ? "selected" : ""} key={quote} onClick={() => setSelectedEncouragement(quote)} type="button">{quote}</button>
                ))}
              </div>
              <label className="vocabulary-daily-summary-custom-message">
                <span>也可以输入自己的内容，生成时会替换上面的鼓励语</span>
                <textarea maxLength={80} onChange={(event) => setCustomEncouragement(event.target.value)} placeholder="写下想出现在分享图片里的话" value={customEncouragement} />
              </label>
              <p className="vocabulary-daily-summary-share-note">分享图片可通过系统菜单发送给好友、分享到朋友圈、QQ 空间或小红书；当前设备不支持图片分享时会下载图片。</p>
              {shareError ? <p className="vocabulary-daily-summary-error" role="alert">{shareError}</p> : null}
            </div>
            <div className="vocabulary-daily-summary-actions">
              <button className="vocabulary-daily-summary-share-button" disabled={sharingSummary} onClick={() => void shareDailySummary()} type="button">{sharingSummary ? "正在生成图片…" : "分享今日总结"}</button>
              <button onClick={continueStudying} type="button">继续学习</button>
            </div>
          </section>
        </div>
      ) : null}
      {customBookOpen ? <VocabularyExcelImport
        onClose={() => setCustomBookOpen(false)}
        onStudy={() => { setCustomBookOpen(false); selectWord("生词本"); }}
      /> : null}
      {settingsOpenFor ? (
        <div className="vocabulary-learning-settings-backdrop">
          <form
            aria-label="词汇设置"
            aria-modal="true"
            className="vocabulary-learning-settings-dialog"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeStudySettings();
            }}
            onSubmit={(event) => {
              event.preventDefault();
              if (setupMode !== "single") {
                return;
              }
              if (settingsListMode) enterListMode();
              else saveStudySettings(event);
            }}
            role="dialog"
          >
            <div className="vocabulary-learning-settings-body">
            {setupMode === "single" ? <label className="vocabulary-learning-settings-book-select">
              <span>选择词汇表</span>
              <span className="vocabulary-book-select-control">
                <span aria-hidden="true">{selectedBookLabel}</span>
                <select
                  aria-label="选择词汇表"
                  onChange={(event) => selectWord(event.target.value as BookSelectionKey)}
                  value={settingsOpenFor}
                >
                  <option value="生词本">生词本（{favoriteWords.length.toLocaleString()}）</option>
                  {books.map((book) => (
                    <option key={book.key} value={book.key}>{book.label}</option>
                  ))}
                </select>
                <span aria-hidden="true" className="vocabulary-book-select-arrow" />
              </span>
            </label> : null}
            <div aria-label="学习模式" className="vocabulary-learning-setup-modes" role="tablist">
              <button aria-selected={setupMode === "single"} className={setupMode === "single" ? "active" : ""} onClick={() => setSetupMode("single")} role="tab" type="button">单人学习</button>
              <button aria-selected={setupMode === "pk"} className={setupMode === "pk" ? "active" : ""} onClick={() => setSetupMode("pk")} role="tab" type="button">PK 挑战</button>
            </div>
            {setupMode === "single" ? (
              <div aria-label="单人学习模式" className="vocabulary-learning-view-modes" role="tablist">
                <button aria-selected={!settingsListMode} className={!settingsListMode ? "active" : ""} onClick={() => setSettingsListMode(false)} role="tab" type="button">卡片形式</button>
                <button aria-selected={settingsListMode} className={settingsListMode ? "active" : ""} onClick={selectListMode} role="tab" type="button">列表形式</button>
              </div>
            ) : null}
            {setupMode === "pk" ? (
              <section aria-label="PK 设置" className="vocabulary-learning-pk-setup">
                <fieldset className="vocabulary-learning-settings-options vocabulary-learning-pk-books">
                  <legend>词汇书</legend>
                  {books.map((book) => (
                    <label key={book.key}>
                      <input checked={pkSetupBook === book.key} name="pk-study-book" onChange={() => setPkSetupBook(book.key)} type="radio" />
                      <span>{book.label}</span>
                    </label>
                  ))}
                </fieldset>
                <p>每局随机抽取 20 题，每题 10 秒；从 4 个中文释义选项中作答，答对加 20 分，超时不扣分。</p>
                <p>优先自动匹配同词汇书、同段位的在线用户；暂时没有对手时，可创建链接邀请访客参加。</p>
              </section>
            ) : null}
            {setupMode === "single" ? <>
            <fieldset className="vocabulary-learning-settings-options vocabulary-learning-settings-method">
              <legend>当前任务</legend>
              <label><input checked={settingsDraft.method === "classified"} name="learning-method" onChange={() => setSettingsDraft((current) => ({ ...current, method: "classified", reviewView: null, reviewFamiliarities: [] }))} type="radio" />记忆新词</label>
              <label><input checked={settingsDraft.method === "browse"} name="learning-method" onChange={() => setSettingsDraft((current) => ({ ...current, method: "browse" }))} type="radio" />复习旧词</label>
            </fieldset>
            <fieldset className="vocabulary-learning-settings-options vocabulary-learning-settings-scope">
              <legend>词汇范围</legend>
              {([{ scope: "core", title: "核心词汇", count: scopeCounts.added }, { scope: "all", title: "全部词汇", count: scopeCounts.total }] as const).map(({ scope, title, count }) => {
                const group = vocabularyStudyGroupIndex(settingsDraft.wordGroups[scope], count);
                const groups = Math.ceil(count / GROUP_SIZE);
                return <div className="vocabulary-learning-scope-choice" key={scope}>
                  <label>
                    <input checked={settingsDraft.scope === scope} name="study-scope" onChange={() => setSettingsDraft((current) => ({ ...current, scope }))} type="radio" />
                    <span>{title}<small>{count.toLocaleString()}</small>{group !== null ? <small className="vocabulary-study-group-label">第 {group + 1} 组</small> : null}</span>
                  </label>
                  <select aria-label={`${title}选择词汇组`} className="vocabulary-study-group-select" disabled={!groups || loading} onChange={(event) => {
                    const value = event.currentTarget.value === "" ? null : Number(event.currentTarget.value);
                    setSettingsDraft((current) => ({ ...current, scope, wordGroups: { ...current.wordGroups, [scope]: value } }));
                  }} title={`${title}：每组 ${GROUP_SIZE} 词，共 ${groups} 组`} value={group ?? ""}>
                    <option value="">全部组（{groups} 组）</option>
                    {Array.from({ length: groups }, (_, index) => <option key={index} value={index}>第 {index + 1} 组</option>)}
                  </select>
                  <span aria-hidden="true" className="vocabulary-study-group-arrow" />
                </div>;
              })}
            </fieldset>
            <div className="vocabulary-learning-settings-fields">
              <fieldset className="vocabulary-learning-settings-reaction">
                <legend>考察模式 <small>秒 · 滚轮可调</small></legend>
                <div className="vocabulary-learning-settings-reaction-options" ref={reactionOptionsRef}>
                  {REACTION_TIME_OPTIONS.map(({ category, label }) => (
                    <div className={`vocabulary-learning-reaction-choice ${settingsDraft.modes.includes(category) ? "active" : ""}`} key={category}>
                      <button aria-pressed={settingsDraft.modes.includes(category)} className="vocabulary-learning-reaction-mode" onClick={() => toggleStudyMode(category)} type="button">
                        <span aria-hidden="true" className="vocabulary-learning-settings-review-dot" />
                        <span>{label}模式</span>
                      </button>
                      <input
                        aria-label={`${label}反应时间（秒）`}
                        data-reaction-category={category}
                        enterKeyHint="done"
                        inputMode="numeric"
                        max="120"
                        min="1"
                        onChange={(event) => setSettingsDraft((current) => ({
                          ...current,
                          reactionSeconds: { ...current.reactionSeconds, [category]: event.target.value },
                        }))}
                        step="1"
                        title="滚轮调整秒数，也可点击输入"
                        type="number"
                        value={settingsDraft.reactionSeconds[category]}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
            <section aria-label="模式选择" className="vocabulary-learning-settings-review-range">
              <h3>复习设置</h3>
              <div aria-label="进度范围" className="vocabulary-learning-settings-review-progress" role="group">
                {PROGRESS_VIEWS.map((tab) => (
                  <button
                    aria-pressed={settingsDraft.reviewView === tab.key}
                    className={settingsDraft.reviewView === tab.key ? "active" : ""}
                    disabled={settingsDraft.method === "classified"}
                    key={tab.key}
                    onClick={() => setSettingsDraft((current) => ({
                      ...current,
                      reviewView: tab.key,
                      reviewFamiliarities: current.reviewFamiliarities.length > 0
                        ? current.reviewFamiliarities : COLLECTIONS.map((collection) => collection.key),
                    }))}
                    type="button"
                  >
                    <span aria-hidden="true" className="vocabulary-learning-settings-review-dot" />
                    <span>{tab.label}</span>
                    <strong>{tab.key === "today"
                      ? `${settingsReviewCounts?.today ?? 0}/${settingsDraft.browseGroups ? Number(settingsDraft.browseGroups) * GROUP_SIZE : GROUP_SIZE}`
                      : `${settingsReviewCounts?.overall ?? 0}/${settingsReviewCounts?.total ?? 0}`}</strong>
                  </button>
                ))}
              </div>
              <div aria-label="熟悉程度" className="vocabulary-learning-settings-review-familiarity" role="group">
                {COLLECTIONS.map((collection) => (
                  <button
                    aria-pressed={settingsDraft.reviewFamiliarities.includes(collection.key)}
                    className={settingsDraft.reviewFamiliarities.includes(collection.key) ? "active" : ""}
                    disabled={settingsDraft.method === "classified"}
                    key={collection.key}
                    onClick={() => setSettingsDraft((current) => ({
                      ...current,
                      reviewFamiliarities: current.reviewFamiliarities.includes(collection.key)
                        ? current.reviewFamiliarities.filter((key) => key !== collection.key)
                        : [...current.reviewFamiliarities, collection.key],
                    }))}
                    type="button"
                  >
                    <span aria-hidden="true" className="vocabulary-learning-settings-review-dot" />
                    <span>{collection.label}</span>
                    <strong>{settingsReviewCounts?.familiarity[collection.key] ?? 0}</strong>
                  </button>
                ))}
              </div>
            </section>
            <div className="vocabulary-learning-settings-paired-options">
              <fieldset className="vocabulary-learning-settings-options">
                <legend>记忆顺序</legend>
                <label><input checked={!weightedBrowse && settingsDraft.order === "sequential"} disabled={weightedBrowse} name="study-order" onChange={() => setSettingsDraft((current) => ({ ...current, order: "sequential" }))} type="radio" />顺序</label>
                <label><input checked={weightedBrowse || settingsDraft.order === "random"} name="study-order" onChange={() => setSettingsDraft((current) => ({ ...current, order: "random" }))} type="radio" />乱序</label>
              </fieldset>
              <fieldset className="vocabulary-learning-settings-options">
                <legend>发音设置</legend>
                <label><input checked={settingsDraft.voice === "us"} name="study-voice" onChange={() => setSettingsDraft((current) => ({ ...current, voice: "us" }))} type="radio" />美音</label>
                <label><input checked={settingsDraft.voice === "uk"} name="study-voice" onChange={() => setSettingsDraft((current) => ({ ...current, voice: "uk" }))} type="radio" />英音</label>
              </fieldset>
              <fieldset className="vocabulary-learning-settings-options vocabulary-learning-settings-definition-options">
                <legend>释义选择</legend>
                <label><input checked={settingsDraft.definitionLanguage === "zh"} name="study-definition-language" onChange={() => setSettingsDraft((current) => ({ ...current, definitionLanguage: "zh", assessmentDefinitionLanguage: "zh" }))} type="radio" />中文释义</label>
                <label><input checked={settingsDraft.definitionLanguage === "en"} name="study-definition-language" onChange={() => setSettingsDraft((current) => ({ ...current, definitionLanguage: "en", assessmentDefinitionLanguage: "en" }))} type="radio" />英文释义</label>
              </fieldset>
              <fieldset aria-disabled={settingsListMode} className={`vocabulary-learning-settings-options vocabulary-learning-settings-memory-options${settingsListMode ? " is-disabled" : ""}`}>
                <legend>辅助记忆</legend>
                <label><input checked={settingsDraft.showExamples} disabled={settingsListMode} onChange={(event) => setSettingsDraft((current) => ({ ...current, showExamples: event.target.checked }))} type="checkbox" />语境例句</label>
                <label><input checked={settingsDraft.showOptions} disabled={settingsListMode} onChange={(event) => setSettingsDraft((current) => ({ ...current, showOptions: event.target.checked }))} type="checkbox" />释义选项</label>
                <label><input checked={settingsDraft.showPicture} disabled={settingsListMode} onChange={(event) => setSettingsDraft((current) => ({ ...current, showPicture: event.target.checked }))} type="checkbox" />看图识词</label>
              </fieldset>
            </div>
            {settingsDraft.modes.length === 0
              ? <p className="vocabulary-learning-settings-validation">请至少选择一种考察模式。</p>
              : null}
            </> : null}
            </div>
            <div className="vocabulary-learning-settings-actions">
              <button onClick={closeStudySettings} type="button">取消</button>
              {setupMode === "single"
                ? <button className="primary" disabled={!validSettingsDraft} type="submit">开始</button>
                : <Link className="primary" href={`/vocabulary/pk?book=${encodeURIComponent(pkSetupBook)}&mode=auto`}>进入 PK 挑战</Link>}
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
