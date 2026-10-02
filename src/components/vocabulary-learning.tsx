"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";

import { VocabularyDetailShell } from "@/components/vocabulary-detail-shell";
import { VocabularyDetailContent } from "@/components/vocabulary-detail-content";
import { VocabularyFavoriteButton } from "@/components/vocabulary-favorite-button";
import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import { VocabularyShareButton } from "@/components/vocabulary-share-button";
import { VocabularyVideoPlayer } from "@/components/vocabulary-video-player";
import { drawBrowseMode, filterBrowseReviewWords, nextBrowseLoopId, scheduleBrowseReview } from "@/lib/vocabulary/browse-review";
import { updateBrowseSpellingMistakes, type BrowseSpellingMistakeStore } from "@/lib/vocabulary/browse-spelling";
import type { VocabularyUsageExample } from "@/lib/vocabulary/examples";
import {
  FAVORITE_WORDS_CHANGED_EVENT,
  FAVORITE_WORDS_STORAGE_KEY,
  type FavoriteLearningWord,
  type LearningBookKey,
  type LearningWord,
} from "@/lib/vocabulary/learning";
import type { LocalVocabularyEntry, VocabularyFormationPart } from "@/lib/vocabulary/local-vocabulary";
import type { VocabularyPhraseMatch } from "@/lib/vocabulary/phrases";
import { getVocabularyAudioUrl } from "@/lib/vocabulary/pronunciation-audio";
import { getSpellingCharacterFeedback } from "@/lib/vocabulary/spelling-feedback";
import { scheduleReview, selectEnabledMode } from "@/lib/vocabulary/review-scheduler";
import { localStudyDate, shouldOpenDailySummary, summarizeDailyStudy, type DailyActivityStore, type DailyMode, type DailyOutcome } from "@/lib/vocabulary/daily-summary";
import { filterProgressWordIds, type VocabularyMode, type VocabularyOutcome } from "@/lib/vocabulary/progress-filters";

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
type DefinitionLanguage = "zh" | "en";
type StudySettings = {
  dailyNew: number;
  reactionSeconds: Record<ProgressCategory, number>;
  method: LearningMethod;
  modes: ProgressCategory[];
  reviewFamiliarities: CollectionKey[];
  reviewView: ProgressView | null;
  scope: VocabularyScope;
  voice: Voice;
  order: SortOrder;
  definitionLanguage: DefinitionLanguage;
};
type StudySettingsDraft = Omit<StudySettings, "dailyNew" | "reactionSeconds"> & {
  dailyNew: string;
  reactionSeconds: Record<ProgressCategory, string>;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  0?: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = Event & {
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
  spellingCorrectStreak: number;
  spellingErrorCount: number;
  spellingHadError: boolean;
  spellingUnansweredCount: number;
};

type ProgressStore = Record<string, ProgressEntry>;
type VocabularyLearningProps = {
  bookCounts: Record<LearningBookKey, { added: number; total: number }>;
  books: Array<{ description: string; key: LearningBookKey; label: string }>;
  initialBook: BookSelectionKey;
  sourceCount: number;
};

type VocabularyDetailPayload = {
  entry: LocalVocabularyEntry;
  formationParts: VocabularyFormationPart[];
  phrases: VocabularyPhraseMatch[];
  usageExamples: VocabularyUsageExample[];
};
type VocabularyVideoPayload = {
  totalVideos: number;
  videos: Array<{ likedByMe: boolean; likes: number; path: string; src: string }>;
  votesEnabled: boolean;
};

const STORAGE_KEY = "ielts-vocabulary-learning-v1";
const SETTINGS_STORAGE_KEY = "ielts-vocabulary-learning-settings-v1";
const STUDY_PAUSED_STORAGE_KEY = "ielts-vocabulary-learning-paused-v1";
const DAILY_ACTIVITY_STORAGE_KEY = "ielts-vocabulary-daily-activity-v1";
const LEGACY_PENDING_DAILY_SUMMARY_KEY = "ielts-vocabulary-pending-daily-summary-v1";
const DAILY_SUMMARY_SHOWN_KEY = "ielts-vocabulary-daily-summary-shown-v1";
const DAILY_ENCOURAGEMENTS = ["又是元气满满的一天", "不积跬步，无以至千里", "今天的坚持，会成为明天的底气", "每记住一个词，世界就多开一扇窗"];
const STUDY_MODE_OPTIONS: Array<{ category: ProgressCategory; index: number; label: string }> = [
  { category: "reading", index: 1, label: "阅读词汇" },
  { category: "listening", index: 0, label: "听力词汇" },
  { category: "speaking", index: 2, label: "口语词汇" },
  { category: "writing", index: 3, label: "写作词汇" },
];
const ALL_STUDY_MODES = STUDY_MODE_OPTIONS.map((option) => option.category);
const REACTION_TIME_OPTIONS: Array<{ category: ProgressCategory; label: string }> = [
  { category: "reading", label: "阅读" },
  { category: "speaking", label: "口语" },
  { category: "listening", label: "听力" },
  { category: "writing", label: "写作" },
];
const DEFAULT_REACTION_SECONDS: Record<ProgressCategory, number> = {
  reading: 2,
  speaking: 4,
  listening: 4,
  writing: 10,
};
const DEFAULT_STUDY_SETTINGS: StudySettings = {
  dailyNew: 200,
  reactionSeconds: DEFAULT_REACTION_SECONDS,
  method: "classified",
  modes: [],
  reviewFamiliarities: [],
  reviewView: null,
  scope: "core",
  voice: "us",
  order: "sequential",
  definitionLanguage: "zh",
};
const COLLECTIONS: Array<{ key: CollectionKey; label: string }> = [
  { key: "familiar", label: "熟悉" },
  { key: "vague", label: "模糊" },
  { key: "unfamiliar", label: "生僻" },
];
const ORAL_FAMILIAR_SCORE = 80;
const ORAL_VAGUE_SCORE = 50;

async function createDailySummaryImage(summary: ReturnType<typeof summarizeDailyStudy>, message: string) {
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
  context.fillStyle = "#0b604c";
  context.font = '700 30px "Songti SC", "Noto Serif SC", serif';
  context.fillText("每日词汇记录", 86, 112);
  context.fillStyle = "#777064";
  context.font = '24px "Songti SC", "Noto Serif SC", serif';
  context.fillText(date, 86, 158);
  context.fillStyle = "#111";
  context.font = '700 58px "Songti SC", "Noto Serif SC", serif';
  context.fillText("今天的努力，看得见", 86, 248);

  const metrics = [
    ["今日学习", `${summary.studiedWords} 个`],
    ["新学词汇", `${summary.newWords} 个`],
    ["复习词汇", `${summary.reviewedWords} 个`],
    ["每日任务", summary.dailyTaskComplete ? "已完成" : `${summary.newWords}/${summary.dailyGoal}`],
  ];
  metrics.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? 86 : 548;
    const y = index < 2 ? 294 : 452;
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

  context.fillStyle = "#111";
  context.font = '700 30px "Songti SC", "Noto Serif SC", serif';
  context.fillText("今日背词统计", 86, 642);
  const wordBars = [
    ["今日学习", summary.studiedWords, "#0b604c"],
    ["新学词汇", summary.newWords, "#4c91bd"],
    ["复习词汇", summary.reviewedWords, "#c8952e"],
  ] as const;
  const maxWordCount = Math.max(1, ...wordBars.map(([, count]) => count));
  wordBars.forEach(([label, count, color], index) => {
    const y = 680 + index * 48;
    context.fillStyle = "#4e554f";
    context.font = '24px "Songti SC", "Noto Serif SC", serif';
    context.fillText(label, 86, y + 18);
    context.fillStyle = "#e8e8e1";
    context.beginPath();
    context.roundRect(260, y, 650, 18, 9);
    context.fill();
    const barWidth = 650 * count / maxWordCount;
    if (barWidth > 0) {
      context.fillStyle = color;
      context.beginPath();
      context.roundRect(260, y, barWidth, 18, 9);
      context.fill();
    }
    context.fillStyle = "#111";
    context.font = '700 24px "Songti SC", "Noto Serif SC", serif';
    context.textAlign = "right";
    context.fillText(String(count), 994, y + 18);
    context.textAlign = "left";
  });

  context.fillStyle = "#111";
  context.font = '700 30px "Songti SC", "Noto Serif SC", serif';
  context.fillText("总进度", 86, 858);
  const completion = summary.sourceCount > 0 ? Math.min(1, summary.completedWords / summary.sourceCount) : 0;
  context.fillStyle = "#e2e2dc";
  context.beginPath();
  context.roundRect(86, 886, 908, 18, 9);
  context.fill();
  context.fillStyle = "#0b604c";
  context.beginPath();
  context.roundRect(86, 886, 908 * completion, 18, 9);
  context.fill();
  context.fillStyle = "#555";
  context.font = '24px "Songti SC", "Noto Serif SC", serif';
  context.fillText(`${summary.completedWords.toLocaleString()} / ${summary.sourceCount.toLocaleString()} 个 · ${Math.round(completion * 100)}%`, 86, 946);

  const modes: Array<[DailyMode, string]> = [["reading", "阅读"], ["listening", "听力"], ["speaking", "口语"], ["writing", "写作"]];
  context.fillStyle = "#111";
  context.font = '700 30px "Songti SC", "Noto Serif SC", serif';
  context.fillText("今日练习", 86, 1014);
  context.font = '26px "Songti SC", "Noto Serif SC", serif';
  context.fillStyle = "#3f4843";
  context.fillText(modes.map(([key, label]) => `${label} ${summary.modes[key]}`).join("　 ·　 "), 86, 1062);
  context.fillText(`熟悉 ${summary.familiar}　·　模糊 ${summary.vague}　·　生僻 ${summary.unfamiliar}`, 86, 1110);

  context.fillStyle = "#0b604c";
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
  lines.slice(0, 2).forEach((value, index) => context.fillText(value, 86, 1190 + index * 42));
  context.fillStyle = "#777064";
  context.font = '22px "Songti SC", "Noto Serif SC", serif';
  context.fillText("今天的每一步，都在靠近更好的自己。", 86, 1280);

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
    spellingCorrectStreak: 0,
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

function restoreReactionSeconds(value: unknown): Record<ProgressCategory, number> {
  const saved = value && typeof value === "object" ? value as Partial<Record<ProgressCategory, unknown>> : {};
  return {
    reading: validReactionSeconds(saved.reading) ? saved.reading : DEFAULT_REACTION_SECONDS.reading,
    speaking: validReactionSeconds(saved.speaking) ? saved.speaking : DEFAULT_REACTION_SECONDS.speaking,
    listening: validReactionSeconds(saved.listening) ? saved.listening : DEFAULT_REACTION_SECONDS.listening,
    writing: validReactionSeconds(saved.writing) ? saved.writing : DEFAULT_REACTION_SECONDS.writing,
  };
}

function toSettingsDraft(settings: StudySettings): StudySettingsDraft {
  return {
    ...settings,
    dailyNew: String(settings.dailyNew),
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
  const dailyNew = Number(draft.dailyNew);
  if (!validDailyLimit(dailyNew)) return null;
  const reactionSeconds = {
    reading: Number(draft.reactionSeconds.reading),
    speaking: Number(draft.reactionSeconds.speaking),
    listening: Number(draft.reactionSeconds.listening),
    writing: Number(draft.reactionSeconds.writing),
  };
  if (Object.values(reactionSeconds).some((seconds) => !validReactionSeconds(seconds))) return null;
  const browse = draft.method === "browse";
  if (browse && draft.reviewView !== null
    && (draft.reviewFamiliarities.length === 0 || draft.modes.length === 0)) return null;
  return {
    dailyNew,
    reactionSeconds,
    method: draft.method,
    modes: browse ? [...draft.modes] : [],
    reviewFamiliarities: browse ? [...draft.reviewFamiliarities] : [],
    reviewView: browse ? draft.reviewView : null,
    scope: draft.scope,
    voice: draft.voice,
    order: draft.order,
    definitionLanguage: draft.definitionLanguage,
  };
}

function restoreStudyModes(value: unknown): ProgressCategory[] {
  if (!Array.isArray(value)) return [...ALL_STUDY_MODES];
  const selected = ALL_STUDY_MODES.filter((mode) => value.includes(mode));
  return selected;
}

function enabledModeIndices(settings: StudySettings) {
  return STUDY_MODE_OPTIONS.filter((option) => settings.method === "classified"
    || settings.modes.length === 0 || settings.modes.includes(option.category)).map((option) => option.index);
}

function restoreProgress(store: ProgressStore): ProgressStore {
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
    if (!restored.completed || !restored.lastReviewedAt) return [id, restored];
    return [id, {
      ...restored,
      completed: false,
      plan: "long-term",
      reviewStep: restored.reviewStep ?? 4,
      nextReviewAt: restored.nextReviewAt ?? restored.lastReviewedAt + 30 * 24 * 60 * 60 * 1000,
    }];
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
  { key: "reading", label: "阅读词汇" },
  { key: "listening", label: "听力词汇" },
  { key: "speaking", label: "口语词汇" },
  { key: "writing", label: "写作词汇" },
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

function VocabularyWordListPanel({
  browseMistakes,
  progress,
  voice,
  words,
}: {
  browseMistakes: Record<string, number>;
  progress: ProgressStore;
  voice: Voice;
  words: LearningWord[];
}) {
  const [showWords, setShowWords] = useState(true);
  const [showDefinitions, setShowDefinitions] = useState(true);
  const [displayMenuOpen, setDisplayMenuOpen] = useState(false);
  const [selectedModes, setSelectedModes] = useState<VocabularyMode[]>([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState<VocabularyOutcome[]>([]);
  const displayMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!displayMenuOpen) return;
    const timer = window.setTimeout(() => setDisplayMenuOpen(false), 5000);
    const closeOutside = (event: Event) => {
      if (!displayMenuRef.current?.contains(event.target as Node)) setDisplayMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDisplayMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [displayMenuOpen, showWords, showDefinitions]);
  const mistakes = words
    .filter((word) => browseMistakes[word.id] !== undefined)
    .sort((left, right) => browseMistakes[right.id] - browseMistakes[left.id]);
  const hasActiveFilter = selectedModes.length > 0 || selectedOutcomes.length > 0;
  const selectedWordIds = new Set(filterProgressWordIds(words, progress, selectedModes, selectedOutcomes));
  const displayedWords = hasActiveFilter ? words.filter((word) => selectedWordIds.has(word.id)) : mistakes;
  const toggleMode = (mode: VocabularyMode) => setSelectedModes((current) => {
    const next = current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode];
    if (next.length === 0) setSelectedOutcomes([]);
    return next;
  });
  const toggleOutcome = (outcome: VocabularyOutcome) => setSelectedOutcomes((current) =>
    current.includes(outcome) ? current.filter((item) => item !== outcome) : [...current, outcome]);
  const modes: Array<[VocabularyMode, string]> = [["reading", "阅读词汇"], ["listening", "听力词汇"], ["speaking", "口语词汇"], ["writing", "写作词汇"]];
  const outcomes: Array<[VocabularyOutcome, string]> = [["familiar", "熟悉"], ["unfamiliar", "生僻"], ["vague", "模糊"]];

  return (
    <aside aria-label="词汇列表" className="vocabulary-learning-today-panel">
      <div className="vocabulary-learning-word-list-heading">
        <strong>词汇列表 {displayedWords.length}</strong>
        <div className="vocabulary-learning-list-actions">
          <button className="vocabulary-learning-export-button" disabled={!displayedWords.length} onClick={() => window.print()} type="button">导出 PDF</button>
          <div className="vocabulary-learning-list-display-menu" ref={displayMenuRef}>
            <button
              aria-controls="vocabulary-learning-list-display-options"
              aria-expanded={displayMenuOpen}
              onClick={() => setDisplayMenuOpen((open) => !open)}
              type="button"
            >显示</button>
            {displayMenuOpen ? (
              <div aria-label="词单显示内容" className="vocabulary-learning-list-display-options" id="vocabulary-learning-list-display-options" role="group">
                <label><span>词汇</span><input checked={showWords} onChange={(event) => setShowWords(event.target.checked)} type="checkbox" /></label>
                <label><span>释义</span><input checked={showDefinitions} onChange={(event) => setShowDefinitions(event.target.checked)} type="checkbox" /></label>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div aria-label="筛选词汇模式" className="vocabulary-learning-list-filters">
        <div aria-label="词汇学习模式" className="vocabulary-learning-list-filter-row" role="group">
          {modes.map(([mode, label]) => <button aria-pressed={selectedModes.includes(mode)} className={selectedModes.includes(mode) ? "selected" : ""} key={mode} onClick={() => toggleMode(mode)} type="button">{label}</button>)}
        </div>
        <div aria-label="词汇熟悉程度" className="vocabulary-learning-list-filter-row outcomes" role="group">
          {outcomes.map(([outcome, label]) => <button aria-pressed={selectedOutcomes.includes(outcome)} className={selectedOutcomes.includes(outcome) ? "selected" : ""} disabled={!selectedModes.length} key={outcome} onClick={() => toggleOutcome(outcome)} type="button">{label}</button>)}
        </div>
        {!hasActiveFilter ? <p>选择学习模式查看该类已背词汇；熟悉程度可叠加筛选。</p> : null}
      </div>
      <div className={`vocabulary-learning-today-list${!showWords && !showDefinitions ? " is-obscured" : ""}`}>
        {displayedWords.map((word) => (
          <div className="vocabulary-learning-today-item is-wrong" key={word.id}>
            <span aria-hidden="true" className="vocabulary-learning-today-status-dot" />
            <div aria-hidden={!showWords} className={`vocabulary-learning-today-word${showWords ? "" : " is-hidden"}`}><strong>{word.word}</strong></div>
            <span aria-hidden={!showDefinitions} className={`vocabulary-learning-today-definition${showDefinitions ? "" : " is-hidden"}`}>{briefLearningDefinition(word)}</span>
          </div>
        ))}
        {hasActiveFilter && displayedWords.length === 0 ? <p className="vocabulary-learning-list-empty">这个筛选条件下还没有背过的词汇。</p> : null}
      </div>
      <div aria-hidden="true" className="vocabulary-learning-pdf-export">
        <h1>词汇学习清单</h1>
        <table>
          <colgroup><col className="pdf-word" /><col className="pdf-phonetic" /><col className="pdf-definition" />{Array.from({ length: 5 }, (_, index) => <col className="pdf-answer" key={index} />)}</colgroup>
          <thead><tr><th>英文</th><th>{voice === "us" ? "美音音标" : "英音音标"}</th><th>简明中文释义</th>{Array.from({ length: 5 }, (_, index) => <th key={index}>练习</th>)}</tr></thead>
          <tbody>{displayedWords.map((word) => <tr key={`pdf-${word.id}`}><td>{word.word}</td><td>{voice === "us" ? word.usPhonetic || word.phonetic : word.ukPhonetic || word.phonetic}</td><td>{briefLearningDefinition(word)}</td>{Array.from({ length: 5 }, (_, index) => <td className="pdf-answer-cell" key={index}>（　　　）</td>)}</tr>)}</tbody>
        </table>
      </div>
    </aside>
  );
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

function briefLearningDefinition(word: LearningWord) {
  const firstLine = word.definitionLines.find((line) => line.trim()) ?? word.definitionCn;
  return firstLine.split(/\r?\n|[；;]/, 1)[0].trim().replace(DEFINITION_PART_OF_SPEECH_PREFIX, "").trim() || "暂无释义";
}

function DefinitionDisplay({
  answer,
  englishDefinitions,
  language,
  value,
  prominent = false,
}: {
  answer: string;
  englishDefinitions: string[];
  language: DefinitionLanguage;
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
  const lines = showEnglish ? englishLines : splitDefinitionLines(value);
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
    etymologyReferences: [],
    etymologySource: word.etymologySource,
    etymologyStory: word.etymologyStory,
    formation: word.formation,
    inflections: word.inflections,
    level: word.level,
    normalizedWord: word.id,
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
          <h2>词根词缀</h2>
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

      {word.englishExamples.length > 0 ? (
        <section className="word-detail-section vocabulary-lookup-section">
          <h2>例句</h2>
          <div className="english-example-list vocabulary-lookup-lines">
            {word.englishExamples.map((example, index) => <blockquote className="vocabulary-lookup-example" key={`${example}-${index}`}>{example}</blockquote>)}
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

function SpellingColoredAnswer({ answer, feedbackVisible, target }: { answer: string; feedbackVisible: boolean; target: string }) {
  const feedback = getSpellingCharacterFeedback(answer, target, feedbackVisible);

  return (
    <span aria-hidden="true" className="vocabulary-learning-spelling-colored-answer">
      {feedback.map(({ letter, correct }, index) => (
        <span
          className={correct ? "is-correct" : "is-wrong"}
          key={`${index}-${letter}`}
          style={{
            color: correct ? "#19804e" : "#c84c4c",
            WebkitTextFillColor: correct ? "#19804e" : "#c84c4c",
          }}
        >{letter}</span>
      ))}
    </span>
  );
}

function SpellingTitleInput({
  answer,
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
  disabled: boolean;
  feedbackVisible: boolean;
  focusOnReady?: boolean;
  history: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEnter?: () => void;
  onSubmit: () => void;
  target: string;
}) {
  const answerMatchesTarget = answer.trim().toLowerCase() === target.trim().toLowerCase();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!focusOnReady || disabled || feedbackVisible) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [disabled, feedbackVisible, focusOnReady, target]);

  return (
    <div className={`vocabulary-learning-spelling-title ${feedbackVisible ? "is-revealed" : ""}`}>
      <div aria-live="polite" className="vocabulary-learning-spelling-target" />
      <div className={`vocabulary-spelling-input vocabulary-learning-spelling-inline-input ${feedbackVisible ? "has-feedback" : ""} ${feedbackVisible ? (answerMatchesTarget ? "correct" : "wrong") : ""}`}>
        <span className="sr-only">拼写英文</span>
        <span className="vocabulary-learning-spelling-answer-line">
          <span aria-hidden="true" className="vocabulary-learning-spelling-width-sizer">{feedbackVisible ? (answer.length > target.length ? answer : target) : answer || "\u00a0"}</span>
          <input
            autoComplete="off"
            autoFocus={onEnter === undefined}
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
        {history ? <span className="vocabulary-learning-spelling-inline-history">{history}</span> : null}
      </div>
    </div>
  );
}

function LearningVocabularyDetails({
  detailPayload,
  entry,
}: {
  detailPayload: VocabularyDetailPayload | null;
  entry: LocalVocabularyEntry;
}) {
  const detailedEntry = detailPayload?.entry ?? entry;

  return (
    <div className="vocabulary-learning-complete-detail vocabulary-detail-content">
      <div className="vocabulary-learning-complete-detail-header">
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
      </div>
      <VocabularyDetailContent
        entry={detailedEntry}
        formationParts={detailPayload?.formationParts ?? []}
        phrases={detailPayload?.phrases ?? []}
        usageExamples={detailPayload?.usageExamples ?? []}
      />
      <VocabularyLearningVideoSection word={detailedEntry.normalizedWord} />
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
    <VocabularyVideoPlayer
      entryWord={word}
      totalVideos={payload.totalVideos}
      videos={payload.videos}
      votesEnabled={payload.votesEnabled}
    />
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

function stopLearningAudio() {
  learningAudioGeneration += 1;
  for (const stop of [...activeLearningAudioStops]) stop();
  window.speechSynthesis?.cancel();
}

async function playSiteAudio(audioUrl: string) {
  return await new Promise<boolean>((resolve) => {
    const audio = new Audio(audioUrl);
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
    if (await playSiteAudio(audioUrl)) return false;
  }

  if (generation !== learningAudioGeneration) return false;
  const storedAudioUrl = await storedAudioUrlRequest;
  if (storedAudioUrl && !immediateAudioUrls.includes(storedAudioUrl)) {
    if (await playSiteAudio(storedAudioUrl)) return false;
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

function playSpellingFeedbackSound(correct: boolean) {
  if (typeof window === "undefined") return;
  const AudioContextConstructor = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return;

  const context = new AudioContextConstructor();
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
  oscillator.addEventListener("ended", () => {
    void context.close();
  }, { once: true });
  oscillator.start(start);
  oscillator.stop(end);
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
    if (settings.reviewView !== null || settings.reviewFamiliarities.length > 0) {
      if (settings.reviewView !== null
        && (settings.reviewFamiliarities.length === 0 || settings.modes.length === 0)) return null;
      const selected = filterBrowseReviewWords(
        preferredWords, store, browseKey, settings.reviewView, settings.reviewFamiliarities, now, settings.modes,
      );
      const nextId = nextBrowseLoopId(selected.map((word) => word.id), excludeId, order);
      return selected.find((word) => word.id === nextId) ?? (earlierWords.length
        ? chooseNextWord(earlierWords, store, now, order, excludeId, { ...settings, scope: "core" }, browseKey, "生词本")
        : null);
    }
    const todayIds = preferredWords
      .filter((word) => isReviewedToday(store[word.id]?.browseByBook?.[browseKey]?.browseLastSeenAt ?? null, now))
      .map((word) => word.id);
    if (todayIds.length < settings.dailyNew) {
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
      .slice(0, settings.dailyNew);
    const loopId = nextBrowseLoopId(loopIds, excludeId, order);
    return preferredWords.find((word) => word.id === loopId) ?? (earlierWords.length
      ? chooseNextWord(earlierWords, store, now, order, excludeId, { ...settings, scope: "core" }, browseKey, "生词本")
      : null);
  }
  const newToday = preferredWords.filter((word) => {
    const entry = progressFor(store, word.id);
    return isReviewedToday(entry.firstLearnedAt ?? null, now);
  }).length;
  const due: LearningWord[] = [];
  const fresh: LearningWord[] = [];
  for (const word of preferredWords) {
    if (word.id === excludeId) continue;
    const entry = progressFor(store, word.id);
    if (entry.completed) continue;
    if (entry.lastReviewedAt === null) {
      if (newToday < settings.dailyNew) fresh.push(word);
    } else if (entry.nextReviewAt === null || entry.nextReviewAt <= now) {
      due.push(word);
    }
  }
  const pool = due.length > 0 ? due : fresh;
  if (pool.length === 0) return earlierWords.length && preferredWords.every((word) => progressFor(store, word.id).completed)
    ? chooseNextWord(earlierWords, store, now, order, excludeId, { ...settings, scope: "core" }, browseKey, "生词本")
    : null;
  if (order === "random") return shuffle(pool)[0];
  if (due.length > 0) return due.reduce((earliest, word) =>
    (progressFor(store, word.id).nextReviewAt ?? now) < (progressFor(store, earliest.id).nextReviewAt ?? now)
      ? word
      : earliest);
  return fresh[0];
}

export function VocabularyLearning({ bookCounts, books, initialBook, sourceCount }: VocabularyLearningProps) {
  const [selectedBook, setSelectedBook] = useState<BookSelectionKey>(initialBook);
  useEffect(() => setSelectedBook(initialBook), [initialBook]);
  const [entryGate, setEntryGate] = useState<"loading" | "select-book" | "continue" | "settings" | "active">("loading");
  const [settingsByBook, setSettingsByBook] = useState<Partial<Record<BookSelectionKey, StudySettings>>>({});
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [settingsOpenFor, setSettingsOpenFor] = useState<BookSelectionKey | null>(null);
  const [studyPaused, setStudyPaused] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<StudySettingsDraft>(() => toSettingsDraft(DEFAULT_STUDY_SETTINGS));
  const reactionOptionsRef = useRef<HTMLDivElement | null>(null);
  const [favoriteWords, setFavoriteWords] = useState<FavoriteLearningWord[]>([]);
  const [voice, setVoice] = useState<Voice>("us");
  const [order, setOrder] = useState<SortOrder>("sequential");
  const [progress, setProgress] = useState<ProgressStore>({});
  const [dailyActivity, setDailyActivity] = useState<DailyActivityStore>({ date: "", events: [], bookGoals: {} });
  const [dailyActivityHydrated, setDailyActivityHydrated] = useState(false);
  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);
  const [selectedEncouragement, setSelectedEncouragement] = useState(DAILY_ENCOURAGEMENTS[0]);
  const [customEncouragement, setCustomEncouragement] = useState("");
  const [sharingSummary, setSharingSummary] = useState(false);
  const [shareError, setShareError] = useState("");
  const [browseSpellingMistakes, setBrowseSpellingMistakes] = useState<BrowseSpellingMistakeStore>({});
  const [hydrated, setHydrated] = useState(false);
  const [words, setWords] = useState<LearningWord[]>([]);
  const [detailPayload, setDetailPayload] = useState<VocabularyDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadNonce, setLoadNonce] = useState(0);
  const [currentWordId, setCurrentWordId] = useState<string | null>(null);
  const [sessionDepleted, setSessionDepleted] = useState(false);
  const [wakeTick, setWakeTick] = useState(0);
  const [roundNonce, setRoundNonce] = useState(0);
  const [pageVisible, setPageVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const [phase, setPhase] = useState<RoundPhase>("idle");
  const [revealedRoundKey, setRevealedRoundKey] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [roundHadSpellingError, setRoundHadSpellingError] = useState(false);
  const [spellingAnswerShown, setSpellingAnswerShown] = useState(false);
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
  const recordingRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const holdingMicRef = useRef(false);
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
  }, [settingsOpenFor]);

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
          selectedBook?: string;
          voice?: Voice;
        };
        const hasExplicitBook = new URLSearchParams(window.location.search).has("level");
        const savedBook = saved.selectedBook;
        if (!hasExplicitBook && savedBook && (savedBook === "生词本" || books.some((book) => book.key === savedBook))) {
          setSelectedBook(savedBook as BookSelectionKey);
        }
        if (saved.voice === "us" || saved.voice === "uk") setVoice(saved.voice);
        if (saved.order === "sequential" || saved.order === "random") setOrder(saved.order);
        if (saved.progress && typeof saved.progress === "object") setProgress(restoreProgress(saved.progress));
      }
    } catch {
      // A corrupt anonymous cache should not prevent the vocabulary page from opening.
    } finally {
      setHydrated(true);
    }
  }, [books]);

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
      const restored: Partial<Record<BookSelectionKey, StudySettings>> = {};
      for (const key of ["生词本", ...books.map((book) => book.key)] as BookSelectionKey[]) {
        const item = saved[key];
        if (!item || !validDailyLimit(item.dailyNew)) continue;
        const method = item.method === "browse" ? "browse" : "classified";
        const legacyFamiliarity = (item as Partial<StudySettings> & { reviewFamiliarity?: CollectionKey | null }).reviewFamiliarity;
        const reviewView = method === "browse" && (item.reviewView === "overall" || item.reviewView === "today") ? item.reviewView : null;
        const restoredModes = method === "browse" ? restoreStudyModes(item.modes) : [];
        const restoredFamiliarities = method === "browse" && Array.isArray(item.reviewFamiliarities)
          ? COLLECTIONS.map((collection) => collection.key).filter((key) => item.reviewFamiliarities?.includes(key))
          : method === "browse" && (legacyFamiliarity === "familiar" || legacyFamiliarity === "vague" || legacyFamiliarity === "unfamiliar")
            ? [legacyFamiliarity] : [];
        restored[key] = {
          dailyNew: item.dailyNew,
          reactionSeconds: restoreReactionSeconds(item.reactionSeconds),
          method,
          modes: reviewView && restoredModes.length === 0 ? [...ALL_STUDY_MODES] : restoredModes,
          reviewFamiliarities: reviewView && restoredFamiliarities.length === 0
            ? COLLECTIONS.map((collection) => collection.key) : restoredFamiliarities,
          reviewView,
          scope: item.scope === "all" ? "all" : "core",
          voice: item.voice === "uk" ? "uk" : "us",
          order: item.order === "random" ? "random" : "sequential",
          definitionLanguage: item.definitionLanguage === "en" ? "en" : "zh",
        };
      }
      setSettingsByBook(restored);
    } catch {
      setSettingsByBook({});
    } finally {
      setSettingsHydrated(true);
    }
  }, [books]);

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
    if (!hydrated || !settingsHydrated || entryGate !== "loading") return;
    const saved = settingsByBook[selectedBook];
    if (saved) {
      setVoice(saved.voice);
      setOrder(saved.order);
    }
    setStudyPaused(true);
    setEntryGate(saved ? "continue" : "select-book");
  }, [entryGate, hydrated, selectedBook, settingsByBook, settingsHydrated]);

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
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ order, progress, selectedBook, voice }));
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
  const dailyWordChartData = [
    { label: "今日学习", value: dailySummary.studiedWords, color: "studied" },
    { label: "新学词汇", value: dailySummary.newWords, color: "new" },
    { label: "复习词汇", value: dailySummary.reviewedWords, color: "reviewed" },
  ];
  const dailyWordChartMaximum = Math.max(1, ...dailyWordChartData.map((item) => item.value));
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
  // Use the draft while the current book's settings dialog is open. This keeps
  // the definition language in sync with the user's selection before the
  // saved settings state is committed, so an old Chinese line cannot flash
  // before the English definition appears.
  const displayedDefinitionLanguage: DefinitionLanguage = settingsOpenFor === selectedBook
    ? settingsDraft.definitionLanguage
    : currentSettings.definitionLanguage;
  const visibleWords = useMemo(
    () => selectedBook === "生词本" || currentSettings.scope === "all"
      ? words
      : words.filter((word) => word.level === selectedBook),
    [currentSettings.scope, selectedBook, words],
  );
  const studyReady = hydrated && settingsHydrated && entryGate === "active" && !studyPaused && settingsOpenFor === null && Boolean(settingsByBook[selectedBook]);

  useEffect(() => {
    if (!dailyActivityHydrated || !dailyActivity.date) return;
    let shouldShowSummary = dailySummary.dailyTaskComplete;
    try {
      // Ignore a stale prompt written by the previous any-activity behavior.
      window.localStorage.removeItem(LEGACY_PENDING_DAILY_SUMMARY_KEY);
      shouldShowSummary = shouldOpenDailySummary(
        dailySummary.dailyTaskComplete,
        window.localStorage.getItem(DAILY_SUMMARY_SHOWN_KEY) === dailyActivity.date,
      );
      if (shouldShowSummary) window.localStorage.setItem(DAILY_SUMMARY_SHOWN_KEY, dailyActivity.date);
    } catch {
      // Storage can be disabled; the completed task should still show its summary.
    }
    if (shouldShowSummary) setDailySummaryOpen(true);
  }, [dailyActivity.date, dailyActivityHydrated, dailySummary.dailyTaskComplete]);

  const continueStudying = useCallback(() => {
    setDailySummaryOpen(false);
  }, []);

  const shareDailySummary = useCallback(async () => {
    setSharingSummary(true);
    setShareError("");
    let file: File | null = null;
    try {
      const message = customEncouragement.trim() || selectedEncouragement;
      file = await createDailySummaryImage(dailySummary, message);
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
  }, [customEncouragement, dailySummary, selectedEncouragement]);

  const currentWord = useMemo(
    () => visibleWords.find((word) => word.id === currentWordId) ?? null,
    [currentWordId, visibleWords],
  );
  const currentProgress = currentWord ? progressFor(progress, currentWord.id) : emptyProgress();
  const reviewedTodayCount = visibleWords.filter((word) => isReviewedToday(progressFor(progress, word.id).lastReviewedAt, Date.now())).length;
  const dailyGoal = currentSettings.dailyNew;
  const browseMode = currentSettings.method === "browse";
  const canRunRound = !browseMode || pageVisible;
  const modeIndex = selectEnabledMode(
    browseMode ? browseChoiceRef.current ?? 0 : currentProgress.lastReviewedAt === null ? 1 : currentProgress.modeIndex,
    enabledModeIndices(currentSettings),
  );
  const currentRoundKey = currentWord
    ? `${currentWord.id}:${modeIndex}:${roundNonce}:${browseMode ? "browse" : "classified"}`
    : null;
  const currentRoundRevealed = currentRoundKey !== null && revealedRoundKey === currentRoundKey;
  const revealCurrentRound = useCallback(() => {
    if (currentRoundKey) setRevealedRoundKey(currentRoundKey);
  }, [currentRoundKey]);

  useEffect(() => {
    setDetailPayload(null);
    if (!currentWord) return;

    const controller = new AbortController();
    void fetch(`/api/vocabulary-hint?word=${encodeURIComponent(currentWord.word)}&detail=1`, { signal: controller.signal })
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
      });

    return () => controller.abort();
  }, [currentWord?.id]);

  useEffect(() => {
    if (!studyReady || loading || currentWordId !== null || visibleWords.length === 0) return;
    const now = Date.now();
    const next = chooseNextWord(
      visibleWords,
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
    for (const word of visibleWords) {
      const entry = progressFor(progress, word.id);
      if (!entry.completed && entry.nextReviewAt && entry.nextReviewAt > now) {
        nextWake = Math.min(nextWake, entry.nextReviewAt);
      }
    }
    const timer = window.setTimeout(() => setWakeTick((value) => value + 1), Math.max(1000, nextWake - now + 50));
    return () => window.clearTimeout(timer);
  }, [chooseBrowseMode, currentSettings, currentWordId, loading, progress, studyReady, visibleWords, wakeTick]);

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
    playSpellingFeedbackSound(correct);
    setSpellingAnswerShown(true);
    revealCurrentRound();
    if (!correct) setRoundHadSpellingError(true);
    setBrowseSpellingMistakes((store) => updateBrowseSpellingMistakes(
      store,
      `${selectedBook}:${currentSettings.scope}`,
      currentWord.id,
      correct,
      Date.now(),
    ));
    void playWordAudio(currentWord, voice, 1);
  }, [browseMode, currentSettings.scope, currentWord, modeIndex, pageVisible, revealCurrentRound, selectedBook, studyReady, voice]);

  const revealSpeakingDetails = useCallback((roundToken = roundTokenRef.current) => {
    if (!currentWord || !currentRoundKey || roundTokenRef.current !== roundToken) return;
    setRevealedRoundKey(currentRoundKey);
    if (speakingDetailsRevealedTokenRef.current === roundToken) return;
    speakingDetailsRevealedTokenRef.current = roundToken;
    void playWordAudio(currentWord, voice, 1);
  }, [currentRoundKey, currentWord, voice]);

  useEffect(() => {
    const token = ++roundTokenRef.current;
    stopLearningAudio();
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
        await new Promise<void>((resolve) => window.setTimeout(resolve, reactionDelay));
        if (roundTokenRef.current !== token) return;
        revealCurrentRound();
        void playWordAudio(currentWord, voice, 1);
        setPhase("awaiting");
        return;
      }

      if (browseMode) {
        if (modeIndex === 3) {
          setPhase("awaiting");
          await new Promise<void>((resolve) => window.setTimeout(resolve, reactionDelay));
          if (roundTokenRef.current === token) revealBrowseSpelling(token);
          return;
        }
        if (modeIndex === 0) {
          setPhase("playing");
          await playWordAudio(currentWord, voice, 1);
          if (roundTokenRef.current !== token) return;
          await new Promise<void>((resolve) => window.setTimeout(resolve, reactionDelay));
          if (roundTokenRef.current !== token) return;
          revealCurrentRound();
          setPhase("playing");
          void playWordAudio(currentWord, voice, 1).finally(() => {
            if (roundTokenRef.current === token) setPhase("awaiting");
          });
          return;
        }
        setPhase("awaiting");
        await new Promise<void>((resolve) => window.setTimeout(resolve, reactionDelay));
        if (roundTokenRef.current !== token) return;
        revealCurrentRound();
        return;
      }

      if (modeIndex === 0) {
        setPhase("playing");
        await playWordAudio(currentWord, voice, 1);
        if (roundTokenRef.current !== token) return;
        await new Promise<void>((resolve) => window.setTimeout(resolve, reactionDelay));
        if (roundTokenRef.current !== token) return;
        revealCurrentRound();
        void playWordAudio(currentWord, voice, 1);
        setPhase("awaiting");
        return;
      }

      if (modeIndex === 2) {
        setPhase("awaiting");
        await new Promise<void>((resolve) => window.setTimeout(resolve, reactionDelay));
        if (roundTokenRef.current !== token || recordingRef.current) return;
        revealSpeakingDetails(token);
        return;
      }

      if (roundTokenRef.current !== token) return;
      setPhase("awaiting");
    };

    void startRound();
  }, [browseMode, canRunRound, currentProgress.completed, currentSettings.reactionSeconds, currentWord, modeIndex, replaceRecordingAudio, revealBrowseSpelling, revealCurrentRound, revealSpeakingDetails, roundNonce, studyReady, voice]);

  const selectWord = useCallback((nextSelection: BookSelectionKey) => {
    if (advancePending) return;
    roundTokenRef.current += 1;
    stopLearningAudio();
    setOralScoreFeedback(null);
    setBrowseSpellingMistakes({});
    setCurrentWordId(null);
    window.history.replaceState(null, "", `/vocabulary/books?level=${encodeURIComponent(nextSelection)}`);
    if (nextSelection !== selectedBook) {
      setWords([]);
      setLoading(true);
      setSelectedBook(nextSelection);
    }
    setSettingsDraft(toSettingsDraft(settingsByBook[nextSelection] ?? { ...DEFAULT_STUDY_SETTINGS, voice, order }));
    setSettingsOpenFor(nextSelection);
    setStudyPaused(true);
    setEntryGate("settings");
  }, [advancePending, order, selectedBook, settingsByBook, voice]);

  const openStudySettings = useCallback(() => {
    setSettingsDraft(toSettingsDraft(settingsByBook[selectedBook] ?? { ...DEFAULT_STUDY_SETTINGS, voice, order }));
    setSettingsOpenFor(selectedBook);
    setStudyPaused(true);
    setEntryGate("settings");
  }, [order, selectedBook, settingsByBook, voice]);

  const continuePreviousStudy = useCallback(() => {
    if (!settingsByBook[selectedBook]) {
      setEntryGate("select-book");
      return;
    }
    setEntryGate("active");
    setStudyPaused(false);
  }, [selectedBook, settingsByBook]);

  const closeStudySettings = useCallback(() => {
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
    setSessionDepleted(false);
    setStudyPaused(true);
    setSettingsOpenFor(null);
    setEntryGate(settingsByBook[selectedBook] ? "continue" : "select-book");
  }, [replaceRecordingAudio, selectedBook, settingsByBook]);

  const saveStudySettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settingsOpenFor) return;
    const settings = parseSettingsDraft(settingsDraft);
    if (!settings) return;
    setCurrentWordId(null);
    setBrowseSpellingMistakes({});
    chooseBrowseMode(settings);
    setSettingsByBook((current) => ({ ...current, [settingsOpenFor]: settings }));
    setVoice(settings.voice);
    setOrder(settings.order);
    setStudyPaused(false);
    setEntryGate("active");
    setSettingsOpenFor(null);
    setSessionDepleted(false);
  };

  const validSettingsDraft = parseSettingsDraft(settingsDraft) !== null;
  const settingsFirstOpen = settingsOpenFor !== null && !settingsByBook[settingsOpenFor];
  const scopeBook = settingsOpenFor ?? selectedBook;
  const scopeCounts = scopeBook === "生词本"
    ? { added: favoriteWords.length, total: favoriteWords.length }
    : bookCounts[scopeBook];
  const settingsReviewCounts = useMemo(() => {
    if (!settingsOpenFor) return null;
    const scopedWords = settingsOpenFor === "生词本" || settingsDraft.scope === "all"
      ? words
      : words.filter((word) => word.level === settingsOpenFor);
    const allRecords = scopedWords
      .map((word) => progressFor(progress, word.id))
      .filter((entry) => entry.lastReviewedAt !== null && (entry.lastOutcome !== "unscored" || Boolean(entry.familiarity)));
    const now = Date.now();
    const todayRecords = allRecords.filter((entry) => isReviewedToday(entry.lastReviewedAt, now));
    const source = settingsDraft.reviewView === "today" ? todayRecords : allRecords;
    const familiarityCounts: Record<CollectionKey, number> = { familiar: 0, vague: 0, unfamiliar: 0 };
    const categoryCounts: Record<ProgressCategory, number> = { reading: 0, listening: 0, speaking: 0, writing: 0 };
    for (const entry of source) {
      const familiarity = familiarityForProgress(entry);
      const category = entry.lastCategory ?? "reading";
      if (familiarity && (settingsDraft.reviewView === null || settingsDraft.modes.includes(category))) {
        familiarityCounts[familiarity] += 1;
      }
      if (settingsDraft.reviewView === null || settingsDraft.reviewFamiliarities.includes(familiarity as CollectionKey)) {
        categoryCounts[entry.lastCategory ?? "reading"] += 1;
      }
    }
    return {
      today: todayRecords.length,
      overall: allRecords.length,
      total: scopedWords.length,
      familiarity: familiarityCounts,
      categories: categoryCounts,
    };
  }, [progress, settingsDraft.modes, settingsDraft.reviewFamiliarities, settingsDraft.reviewView, settingsDraft.scope, settingsOpenFor, words]);

  const toggleStudyMode = (category: ProgressCategory) => {
    setSettingsDraft((current) => ({
      ...current,
      modes: current.modes.includes(category)
        ? current.modes.filter((mode) => mode !== category)
        : [...current.modes, category],
    }));
  };

  const moveToNextWord = useCallback(
    (updatedProgress: ProgressStore) => {
      if (!currentWord) return;
      const next = chooseNextWord(
        visibleWords,
        updatedProgress,
        Date.now(),
        currentSettings.order,
        currentWord.id,
        currentSettings,
        `${selectedBook}:${currentSettings.scope}`,
        selectedBook,
      );
      if (next) chooseBrowseMode(currentSettings);
      setCurrentWordId(next?.id ?? null);
      setSessionDepleted(next === null);
      setRoundNonce((value) => value + 1);
    },
    [chooseBrowseMode, currentSettings, currentWord, selectedBook, visibleWords],
  );

  const commitBrowse = useCallback(() => {
    if (!browseMode || !pageVisible || !currentWord || advancePending) return;
    const timestamp = Date.now();
    const previous = progressFor(progress, currentWord.id);
    const next: ProgressEntry = {
      ...previous,
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
    if (!browseMode || !pageVisible || !studyReady || !currentWord || !currentRoundRevealed || advancePending
      || (modeIndex <= 1 && phase === "playing")) return;
    const token = roundTokenRef.current;
    const timer = window.setTimeout(() => {
      if (roundTokenRef.current === token) commitBrowse();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [advancePending, browseMode, commitBrowse, currentRoundRevealed, currentWord, modeIndex, pageVisible, phase, roundNonce, studyReady]);

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
        next.spellingCorrectStreak = spellingDetails.correct && !spellingDetails.hadError
          ? previous.spellingCorrectStreak + 1
          : 0;
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
        moveToNextWord(updatedProgress);
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
    const correct = currentWord.word.trim().toLowerCase() === answer.trim().toLowerCase();
    playSpellingFeedbackSound(correct);
    setSpellingAnswerShown(true);
    if (!correct) setRoundHadSpellingError(true);
  }, [answer, currentWord, modeIndex, phase, spellingAnswerShown]);

  const submitSpelling = useCallback(
    (requestedOutcome: Familiarity) => {
      if (!currentWord || modeIndex !== 3 || phase === "recording") return;
      const correct = answer.trim().toLowerCase() === currentWord.word.trim().toLowerCase();
      if (correct) {
        commitOutcome(requestedOutcome, {
          correct: true,
          hadError: false,
          unanswered: false,
        });
        return;
      }

      if (requestedOutcome === "familiar") return;
      if (!spellingAnswerShown) {
        revealCurrentRound();
        setSpellingAnswerShown(true);
      }

      commitOutcome(requestedOutcome, {
        correct,
        hadError: roundHadSpellingError,
        unanswered: answer.trim().length === 0,
      }, undefined, 2000);
    },
    [answer, commitOutcome, currentWord, modeIndex, phase, revealCurrentRound, roundHadSpellingError, spellingAnswerShown],
  );

  useEffect(() => {
    if (!studyReady || !pageVisible || loading || advancePending || !currentWord || browseMode) return;

    const handleClassificationKeyboard = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      const editable = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (editable && modeIndex !== 3) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        const requestedOutcome = event.key === "ArrowLeft"
          ? "familiar"
          : event.key === "ArrowDown"
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

      if (event.key !== "Enter" || modeIndex !== 3) return;
      event.preventDefault();
      revealSpellingAnswer();
    };

    document.addEventListener("keydown", handleClassificationKeyboard);
    return () => document.removeEventListener("keydown", handleClassificationKeyboard);
  }, [advancePending, browseMode, currentWord, handleRecognitionOutcome, loading, modeIndex, pageVisible, revealSpellingAnswer, spellingCorrect, studyReady, submitSpelling]);

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
        setRecordingError("语音识别没有完成，本轮未产生分数，请重新录音。");
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

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("当前浏览器不支持录音；本轮未产生评分。");
      setPhase("awaiting");
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setRecordingError("当前浏览器不支持口述自动评分，请使用 Chrome 或 Edge 重试。");
      setPhase("awaiting");
      return;
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
      recognition.start();

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
  const learningCategoryBar = browseMode ? null : (
    <div className="vocabulary-learning-bottom-bar">
      <div className="vocabulary-learning-bottom-actions">
        <button
          className="vocabulary-learning-category-button familiar"
          aria-keyshortcuts="ArrowLeft"
          title="左方向键：熟悉"
          disabled={advancePending || (modeIndex < 2 && !currentRoundRevealed) || (modeIndex === 2 && oralScoreFeedback === null) || (modeIndex === 3 && !spellingCorrect)}
          onClick={() => modeIndex === 3 ? submitSpelling("familiar") : handleRecognitionOutcome("familiar")}
          type="button"
        >熟悉</button>
        <button
          className="vocabulary-learning-category-button vague"
          aria-keyshortcuts="ArrowDown"
          title="下方向键：模糊"
          disabled={advancePending || (modeIndex < 2 && !currentRoundRevealed) || (modeIndex === 2 && oralScoreFeedback === null)}
          onClick={() => modeIndex === 3 ? submitSpelling("vague") : handleRecognitionOutcome("vague")}
          type="button"
        >模糊</button>
        <button
          className="vocabulary-learning-category-button unfamiliar"
          aria-keyshortcuts="ArrowRight"
          title="右方向键：生僻"
          disabled={advancePending || (modeIndex < 2 && !currentRoundRevealed) || (modeIndex === 2 && oralScoreFeedback === null)}
          onClick={() => modeIndex === 3 ? submitSpelling("unfamiliar") : handleRecognitionOutcome("unfamiliar")}
          type="button"
        >生僻</button>
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

  return (
    <section className="stack vocabulary-learning-page">
      <header className="mobile-learning-header">
        <Link href="/vocabulary">‹ 单词</Link>
        <h1>背单词</h1>
        <button aria-label="背单词设置" disabled={!settingsHydrated || advancePending} onClick={openStudySettings} type="button">⚙</button>
      </header>
      <section aria-label="今日学习进度" className="mobile-learning-progress">
        <div><strong>今日学习</strong><span>已完成 {Math.min(reviewedTodayCount, dailyGoal)} / {dailyGoal}</span></div>
        <div aria-valuemax={dailyGoal} aria-valuemin={0} aria-valuenow={Math.min(reviewedTodayCount, dailyGoal)} className="mobile-learning-progress-track" role="progressbar"><span style={{ width: `${dailyGoal ? Math.min(100, reviewedTodayCount / dailyGoal * 100) : 0}%` }} /></div>
      </section>
      <div className="vocabulary-learning-layout">
        <aside className="vocabulary-learning-sidebar" ref={sidebarRef}>
          <div className="vocabulary-learning-book-heading">
            <div className="vocabulary-learning-book-heading-copy">
              <span>词汇书</span>
            </div>
            <button disabled={!settingsHydrated || advancePending || entryGate === "select-book"} onClick={openStudySettings} type="button">设置</button>
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
              <button
                className={`vocabulary-learning-nav-button ${selectedBook === book.key ? "active" : ""}`}
                key={book.key}
                onClick={() => selectWord(book.key)}
                title={book.description}
                type="button"
              >
                <span aria-hidden="true" className="vocabulary-learning-nav-dot" />
                <span className="vocabulary-learning-nav-label">{book.label}</span>
                <strong>
                  {book.key === "未分级"
                    ? `${bookCounts[book.key].total.toLocaleString()}/${sourceCount.toLocaleString()}`
                    : bookCounts[book.key].added === bookCounts[book.key].total
                    ? bookCounts[book.key].total.toLocaleString()
                    : `${bookCounts[book.key].added.toLocaleString()}/${bookCounts[book.key].total.toLocaleString()}`}
                </strong>
                <span aria-hidden="true" className="vocabulary-learning-nav-arrow">›</span>
              </button>
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
              <strong className="vocabulary-learning-book-select-desktop">请选择左侧词汇书</strong>
              <p className="vocabulary-learning-book-select-desktop">选择后会自动打开这本词汇书的学习设置。</p>
              <strong className="vocabulary-learning-book-select-mobile">请点击右上角设置</strong>
              <p className="vocabulary-learning-book-select-mobile">在设置中选择词汇书并完成学习设置。</p>
            </div>
          ) : null}
          {!loading && !loadError && entryGate === "continue" ? (
            <div className="vocabulary-learning-empty vocabulary-learning-plan-empty">
              <strong>继续之前的进度</strong>
              <p>将按照「{selectedBookLabel}」上次保存的设置继续记忆词汇。</p>
              <button className="button" onClick={continuePreviousStudy} type="button">继续背单词</button>
            </div>
          ) : null}
          {!loading && !loadError && entryGate === "active" && visibleWords.length === 0 ? (
            <div className="vocabulary-learning-empty">
              <strong>{selectedBook === "生词本" && favoriteWords.length === 0 ? "生词本还没有收藏的单词。" : "这本词汇书没有可处理的新词。"}</strong>
              <p>{selectedBook === "生词本" && favoriteWords.length === 0 ? "在单词页面点击收藏，单词会自动加入这里。" : "可以切换其他词汇书，或等待已安排的复习时间到达。"}</p>
            </div>
          ) : null}
          {!loading && !loadError && entryGate === "active" && visibleWords.length > 0 && !currentWord && studyReady && sessionDepleted ? (
            <div className="vocabulary-learning-empty vocabulary-learning-plan-empty">
              <strong>当前没有可学习的词汇</strong>
              <p>{browseMode && (currentSettings.reviewView !== null || currentSettings.reviewFamiliarities.length > 0)
                ? "当前复习范围没有符合条件的词汇，可调整筛选条件。"
                : "今日数量已达上限，或下一轮复习尚未到时间；到期后会自动出现。"}</p>
              <button className="button" onClick={openStudySettings} type="button">调整设置</button>
            </div>
          ) : null}

          {!loading && !loadError && settingsHydrated && settingsByBook[selectedBook] && currentWord ? (
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
                  {!currentRoundRevealed && modeIndex === 1 ? (
                    <div className="vocabulary-learning-complete-detail vocabulary-detail-content">
                      <div className="vocabulary-learning-complete-detail-header">
                        <h1>{currentWord.word}</h1>
                        <div className="vocabulary-learning-complete-detail-meta">
                          <VocabularyInlinePronunciation
                            ukAudioUrl={currentWord.ukAudioUrl}
                            ukPhonetic={currentWord.ukPhonetic || currentWord.phonetic}
                            usAudioUrl={currentWord.usAudioUrl}
                            usPhonetic={currentWord.usPhonetic || currentWord.phonetic}
                            word={currentWord.word}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {currentRoundRevealed ? (
                    <LearningVocabularyDetails
                      detailPayload={detailPayload}
                      entry={detailEntry ?? toLookupEntry(currentWord)}
                    />
                  ) : null}
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
                        aria-label={phase === "recording" ? "松开结束录音" : "录音"}
                        aria-keyshortcuts="Space"
                        className={`vocabulary-mic-button ${phase === "recording" ? "recording" : ""}`}
                        disabled={advancePending || phase === "scoring"}
                        title="按住空格录音"
                        onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
                          event.currentTarget.setPointerCapture(event.pointerId);
                          holdingMicRef.current = true;
                          void startRecording();
                        }}
                        onPointerUp={stopRecording}
                        onPointerCancel={stopRecording}
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
                      <p className="vocabulary-learning-speaking-shortcuts">按住空格录音 · 数字 1 重听 · 数字 2 播放正确读音</p>
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
                        entry={detailEntry ?? toLookupEntry(currentWord)}
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
                      disabled={phase === "recording" || currentRoundRevealed || advancePending}
                      feedbackVisible={spellingAnswerShown}
                      focusOnReady={browseMode && studyReady && pageVisible}
                      history={browseMode ? "" : `曾经错过 ${currentProgress.spellingErrorCount} 次 · 连续正确 ${currentProgress.spellingCorrectStreak}/3`}
                      key={`${currentWord.id}:${roundNonce}`}
                      onChange={updateSpelling}
                      onEnter={browseMode ? () => revealBrowseSpelling() : undefined}
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
                    {(browseMode ? currentRoundRevealed : spellingAnswerShown) ? (
                      <LearningVocabularyDetails
                        detailPayload={detailPayload}
                        entry={detailEntry ?? toLookupEntry(currentWord)}
                      />
                    ) : null}
                </VocabularyDetailShell>
              ) : null}

              </article>
          ) : null}
          <VocabularyWordListPanel
            browseMistakes={browseSpellingMistakes[`${selectedBook}:${currentSettings.scope}`] ?? {}}
            progress={progress}
            voice={voice}
            words={visibleWords}
          />
          </div>
        </main>
      </div>
      {dailySummaryOpen ? (
        <div className="vocabulary-daily-summary-backdrop">
          <section aria-labelledby="vocabulary-daily-summary-title" aria-modal="true" className="vocabulary-daily-summary-dialog" role="dialog">
            <button aria-label="关闭今日总结" className="vocabulary-daily-summary-close" onClick={continueStudying} type="button">×</button>
            <p className="vocabulary-daily-summary-date">{dailySummary.date}</p>
            <h2 id="vocabulary-daily-summary-title">今天的努力，看得见</h2>
            <p className="vocabulary-daily-summary-subtitle">背过的每个词，都在慢慢变成自己的。</p>
            <div className="vocabulary-daily-summary-metrics">
              <div><span>今日学习</span><strong>{dailySummary.studiedWords}<small> 个</small></strong></div>
              <div><span>新学词汇</span><strong>{dailySummary.newWords}<small> 个</small></strong></div>
              <div><span>复习词汇</span><strong>{dailySummary.reviewedWords}<small> 个</small></strong></div>
              <div><span>每日任务</span><strong className={dailySummary.dailyTaskComplete ? "is-complete" : ""}>{dailySummary.dailyTaskComplete ? "已完成" : `${dailySummary.newWords}/${dailySummary.dailyGoal}`}</strong></div>
            </div>
            <div
              aria-label={`今日背词数量图表：今日学习 ${dailySummary.studiedWords} 个，新学 ${dailySummary.newWords} 个，复习 ${dailySummary.reviewedWords} 个`}
              className="vocabulary-daily-summary-chart"
              role="img"
            >
              <strong>今日背词统计</strong>
              <div className="vocabulary-daily-summary-chart-rows">
                {dailyWordChartData.map((item) => (
                  <div aria-hidden="true" className="vocabulary-daily-summary-chart-row" key={item.color}>
                    <span>{item.label}</span>
                    <div><i className={item.color} style={{ width: `${item.value / dailyWordChartMaximum * 100}%` }} /></div>
                    <b>{item.value}</b>
                  </div>
                ))}
              </div>
              <small>新学与复习按词汇分别统计，同一个词当天可能同时计入两项。</small>
            </div>
            <div className="vocabulary-daily-summary-progress">
              <div><strong>总进度</strong><span>{dailySummary.completedWords.toLocaleString()} / {dailySummary.sourceCount.toLocaleString()} 个（{dailySummary.sourceCount ? Math.round(Math.min(1, dailySummary.completedWords / dailySummary.sourceCount) * 100) : 0}%）</span></div>
              <div aria-label="总词汇完成进度" className="vocabulary-daily-summary-progress-track"><span style={{ width: `${dailySummary.sourceCount ? Math.min(100, dailySummary.completedWords / dailySummary.sourceCount * 100) : 0}%` }} /></div>
            </div>
            <div className="vocabulary-daily-summary-breakdown">
              <div><strong>熟悉程度</strong><span>熟悉 {dailySummary.familiar} · 模糊 {dailySummary.vague} · 生僻 {dailySummary.unfamiliar}</span></div>
              <div><strong>练习模式</strong><span>阅读 {dailySummary.modes.reading} · 听力 {dailySummary.modes.listening} · 口语 {dailySummary.modes.speaking} · 写作 {dailySummary.modes.writing}</span></div>
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
              <p className="vocabulary-daily-summary-share-note">生成图片后可用系统分享菜单发送到朋友圈、小红书、QQ 空间或微博；当前设备不支持图片分享时会下载图片。</p>
              {shareError ? <p className="vocabulary-daily-summary-error" role="alert">{shareError}</p> : null}
            </div>
            <div className="vocabulary-daily-summary-actions">
              <button className="vocabulary-daily-summary-share-button" disabled={sharingSummary} onClick={() => void shareDailySummary()} type="button">{sharingSummary ? "正在生成图片…" : "生成分享图片"}</button>
              <button onClick={continueStudying} type="button">继续学习</button>
            </div>
          </section>
        </div>
      ) : null}
      {settingsOpenFor ? (
        <div className="vocabulary-learning-settings-backdrop">
          <form
            aria-label="词汇书设置"
            aria-modal="true"
            className="vocabulary-learning-settings-dialog"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeStudySettings();
            }}
            onSubmit={saveStudySettings}
            role="dialog"
          >
            <div className="vocabulary-learning-settings-head">
              <button aria-label="关闭设置并暂停学习" className="vocabulary-learning-settings-close" onClick={closeStudySettings} type="button">×</button>
            </div>
            <label className="vocabulary-learning-settings-book-select">
              <span>词汇书</span>
              <select
                aria-label="选择词汇书"
                onChange={(event) => selectWord(event.target.value as BookSelectionKey)}
                value={settingsOpenFor}
              >
                <option value="生词本">生词本（{favoriteWords.length.toLocaleString()}）</option>
                {books.map((book) => (
                  <option key={book.key} value={book.key}>{book.label}</option>
                ))}
              </select>
            </label>
            <div className="vocabulary-learning-settings-fields">
              <label className="vocabulary-learning-settings-daily-new">
                <span>每日新词</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  max="9999"
                  min="1"
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, dailyNew: event.target.value }))}
                  step="1"
                  type="number"
                  value={settingsDraft.dailyNew}
                />
              </label>
              <fieldset className="vocabulary-learning-settings-reaction">
                <legend>反应时间 <small>秒 · 滚轮可调</small></legend>
                <div className="vocabulary-learning-settings-reaction-options" ref={reactionOptionsRef}>
                  {REACTION_TIME_OPTIONS.map(({ category, label }) => (
                    <label key={category}>
                      <span>{label}</span>
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
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <fieldset className="vocabulary-learning-settings-options vocabulary-learning-settings-method">
              <legend>记忆方式</legend>
              <label><input checked={settingsDraft.method === "classified"} name="learning-method" onChange={() => setSettingsDraft((current) => ({ ...current, method: "classified", reviewView: null, reviewFamiliarities: [], modes: [] }))} type="radio" />分类记忆</label>
              <label><input checked={settingsDraft.method === "browse"} name="learning-method" onChange={() => setSettingsDraft((current) => ({ ...current, method: "browse" }))} type="radio" />浏览模式</label>
            </fieldset>
            <fieldset className="vocabulary-learning-settings-options vocabulary-learning-settings-scope">
              <legend>词汇范围</legend>
              <label>
                <input checked={settingsDraft.scope === "core"} name="study-scope" onChange={() => setSettingsDraft((current) => ({ ...current, scope: "core" }))} type="radio" />
                <span>核心词汇<small>{scopeCounts.added.toLocaleString()}</small></span>
              </label>
              <label>
                <input checked={settingsDraft.scope === "all"} name="study-scope" onChange={() => setSettingsDraft((current) => ({ ...current, scope: "all" }))} type="radio" />
                <span>全部词汇<small>{scopeCounts.total.toLocaleString()}</small></span>
              </label>
            </fieldset>
            <section aria-disabled={settingsDraft.method === "classified"} aria-label="复习范围" className={`vocabulary-learning-settings-review-range${settingsDraft.method === "classified" ? " is-disabled" : ""}`}>
              <h3>复习范围</h3>
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
                      reviewFamiliarities: COLLECTIONS.map((collection) => collection.key),
                      modes: [...ALL_STUDY_MODES],
                    }))}
                    type="button"
                  >
                    <span aria-hidden="true" className="vocabulary-learning-settings-review-dot" />
                    <span>{tab.label}</span>
                    <strong>{tab.key === "today"
                      ? `${settingsReviewCounts?.today ?? 0}/${settingsDraft.dailyNew || "—"}`
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
              <div aria-label="复习词汇类型" className="vocabulary-learning-settings-review-categories" role="group">
                {TODAY_PROGRESS_TABS.map((tab) => (
                  <button
                    aria-pressed={settingsDraft.modes.includes(tab.key)}
                    className={settingsDraft.modes.includes(tab.key) ? "active" : ""}
                    disabled={settingsDraft.method === "classified"}
                    key={tab.key}
                    onClick={() => toggleStudyMode(tab.key)}
                    type="button"
                  >
                    <span aria-hidden="true" className="vocabulary-learning-settings-review-dot" />
                    <span>{tab.label}</span>
                    <strong>{settingsReviewCounts?.categories[tab.key] ?? 0}</strong>
                  </button>
                ))}
              </div>
            </section>
            <div className="vocabulary-learning-settings-paired-options">
              <div className="vocabulary-learning-settings-option-column">
                <fieldset className="vocabulary-learning-settings-options">
                  <legend>记忆顺序</legend>
                  <label><input checked={settingsDraft.order === "sequential"} name="study-order" onChange={() => setSettingsDraft((current) => ({ ...current, order: "sequential" }))} type="radio" />顺序</label>
                  <label><input checked={settingsDraft.order === "random"} name="study-order" onChange={() => setSettingsDraft((current) => ({ ...current, order: "random" }))} type="radio" />乱序</label>
                </fieldset>
                <fieldset className="vocabulary-learning-settings-options">
                  <legend>释义选择</legend>
                  <label><input checked={settingsDraft.definitionLanguage === "zh"} name="study-definition-language" onChange={() => setSettingsDraft((current) => ({ ...current, definitionLanguage: "zh" }))} type="radio" />中文</label>
                  <label><input checked={settingsDraft.definitionLanguage === "en"} name="study-definition-language" onChange={() => setSettingsDraft((current) => ({ ...current, definitionLanguage: "en" }))} type="radio" />英文</label>
                </fieldset>
              </div>
              <fieldset className="vocabulary-learning-settings-options">
                <legend>发音设置</legend>
                <label><input checked={settingsDraft.voice === "us"} name="study-voice" onChange={() => setSettingsDraft((current) => ({ ...current, voice: "us" }))} type="radio" />美音</label>
                <label><input checked={settingsDraft.voice === "uk"} name="study-voice" onChange={() => setSettingsDraft((current) => ({ ...current, voice: "uk" }))} type="radio" />英音</label>
              </fieldset>
            </div>
            {settingsDraft.method === "browse" && settingsDraft.reviewView !== null
              && (settingsDraft.reviewFamiliarities.length === 0 || settingsDraft.modes.length === 0)
              ? <p className="vocabulary-learning-settings-validation">请至少保留一种熟悉程度和一种词汇类型。</p>
              : null}
            <div className="vocabulary-learning-settings-actions">
              {!settingsFirstOpen ? <button onClick={closeStudySettings} type="button">取消</button> : null}
              <button className="primary" disabled={!validSettingsDraft} type="submit">开始背单词</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
