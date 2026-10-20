"use client";

import { useEffect, useMemo, useState } from "react";
import { localStudyDate, summarizeDailyStudy, type DailyActivityStore, type DailyMode, type DailyOutcome, type DailySummary } from "@/lib/vocabulary/daily-summary";
import { readSiteStudyHistory, type LearningActivity, type SiteStudyHistory } from "@/lib/learning/site-progress";

const VOCABULARY_PROGRESS_KEY = "ielts-vocabulary-learning-v1";
const VOCABULARY_DAILY_ACTIVITY_KEY = "ielts-vocabulary-daily-activity-v1";
const MODES: Array<[DailyMode, string]> = [["reading", "阅读"], ["listening", "听力"], ["speaking", "口语"], ["writing", "写作"]];
const OUTCOMES: Array<[DailyOutcome, string]> = [["familiar", "熟悉"], ["vague", "模糊"], ["unfamiliar", "生僻"]];

export type SavedVocabularyProgress = Record<string, {
  sourceBooks?: string[];
  completed?: boolean;
  familiarity?: DailyOutcome | null;
  lastCategory?: DailyMode;
  lastOutcome?: DailyOutcome | "unscored" | null;
  modeOutcomes?: Partial<Record<DailyMode, DailyOutcome>>;
}>;
type TrendRange = "7d" | "30d" | "1y" | "3y" | "5y";
type LearningTrendPoint = { articles: number; date: string; label: string; lookups: number; minutes: number; words: number };

const TREND_RANGES: Array<{ key: TrendRange; label: string }> = [
  { key: "7d", label: "7 天" },
  { key: "30d", label: "30 天" },
  { key: "1y", label: "1 年" },
  { key: "3y", label: "3 年" },
  { key: "5y", label: "5 年" },
];

function dayAtOffset(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + offset);
  return localStudyDate(value);
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} 小时 ${minutes} 分` : `${minutes} 分钟`;
}

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function buildLearningTrend(range: TrendRange, siteHistory: SiteStudyHistory, vocabularyHistory: Record<string, DailySummary>, today: string) {
  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30;
    return Array.from({ length: days }, (_, index) => {
      const date = dayAtOffset(today, index - days + 1);
      const site = siteHistory[date] ?? { lookedUpWords: [], seconds: 0, studyItems: [] };
      return {
        articles: site.studyItems.length,
        date,
        label: date.slice(5),
        lookups: site.lookedUpWords.length,
        minutes: Math.round(site.seconds / 60),
        words: vocabularyHistory[date]?.studiedWords ?? 0,
      } satisfies LearningTrendPoint;
    });
  }

  const months = range === "1y" ? 12 : range === "3y" ? 36 : 60;
  const todayDate = new Date(`${today}T12:00:00`);
  return Array.from({ length: months }, (_, index) => {
    const month = new Date(todayDate.getFullYear(), todayDate.getMonth() - months + index + 1, 1);
    const year = month.getFullYear();
    const monthNumber = month.getMonth() + 1;
    const date = `${year}-${String(monthNumber).padStart(2, "0")}`;
    const prefix = `${date}-`;
    const siteDays = Object.entries(siteHistory).filter(([day]) => day.startsWith(prefix)).map(([, value]) => value);
    const vocabularyDays = Object.entries(vocabularyHistory).filter(([day]) => day.startsWith(prefix)).map(([, value]) => value);
    return {
      articles: siteDays.reduce((sum, day) => sum + day.studyItems.length, 0),
      date,
      label: months > 12 ? `${String(year).slice(-2)}年${monthNumber}月` : `${monthNumber}月`,
      lookups: siteDays.reduce((sum, day) => sum + day.lookedUpWords.length, 0),
      minutes: Math.round(siteDays.reduce((sum, day) => sum + day.seconds, 0) / 60),
      words: vocabularyDays.reduce((sum, day) => sum + day.studiedWords, 0),
    } satisfies LearningTrendPoint;
  });
}

function LearningTrendChart({
  color,
  points,
  title,
  unit,
  valueKey,
}: {
  color: string;
  points: LearningTrendPoint[];
  title: string;
  unit: string;
  valueKey: "articles" | "lookups" | "minutes" | "words";
}) {
  const maxValue = Math.max(1, ...points.map((point) => point[valueKey]));
  const total = points.reduce((sum, point) => sum + point[valueKey], 0);
  const slotWidth = 660 / points.length;
  const barWidth = Math.min(24, Math.max(3, slotWidth * 0.62));
  const labelStep = Math.max(1, Math.ceil(points.length / 7));

  return <article className="learning-progress-trend-chart">
    <div className="learning-progress-trend-chart-heading"><strong>{title}</strong><span>{total.toLocaleString()} {unit}</span></div>
    {total > 0 ? <svg aria-label={`${title}趋势图，总计${total}${unit}`} className="learning-progress-trend-chart-svg" role="img" viewBox="0 0 720 190">
      {[30, 78, 126].map((y) => <line key={y} x1="30" x2="690" y1={y} y2={y} />)}
      {points.map((point, index) => {
        const value = point[valueKey];
        const height = value > 0 ? Math.max(2, value / maxValue * 112) : 0;
        const x = 30 + index * slotWidth + (slotWidth - barWidth) / 2;
        const label = valueKey === "minutes" ? `${value} 分钟` : `${value} ${unit}`;
        return <g key={point.date}>
          {height > 0 ? <rect fill={color} height={height} rx={Math.min(5, barWidth / 2)} width={barWidth} x={x} y={138 - height}><title>{point.date}：{label}</title></rect> : null}
          {(index % labelStep === 0 || index === points.length - 1) ? <text x={x + barWidth / 2} y="164" textAnchor="middle">{point.label}</text> : null}
        </g>;
      })}
    </svg> : <p className="learning-progress-trend-empty">该时间范围还没有记录。</p>}
  </article>;
}

function studyItemTitle(item: string) {
  const [kind, ...parts] = item.split(":");
  const title = parts.join(":").replace(/[-_]+/g, " ").trim();
  return kind === "bbc" ? title : `新概念英语 · ${title}`;
}

function studyItemHref(item: string) {
  const separator = item.indexOf(":");
  const kind = item.slice(0, separator);
  const id = item.slice(separator + 1);
  return `${kind === "bbc" ? "/articles/" : "/new-concept/"}${encodeURIComponent(id)}`;
}

export function LearningActivityOverview({
  ownerName,
  siteHistory,
  vocabularyHistory,
  vocabularyProgress,
}: {
  ownerName?: string;
  siteHistory: SiteStudyHistory;
  vocabularyHistory: Record<string, DailySummary>;
  vocabularyProgress: SavedVocabularyProgress;
}) {
  const today = localStudyDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [trendRange, setTrendRange] = useState<TrendRange>("30d");
  const [shownMonth, setShownMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const monthStart = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1);
  const monthLength = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const streakStart = siteHistory[today] ? today : dayAtOffset(today, -1);
  let streak = 0;
  while (siteHistory[dayAtOffset(streakStart, -streak)]) streak += 1;

  const allTimeItems = [...new Set(Object.values(siteHistory).flatMap((day) => day.studyItems))].sort();
  const allTimeLookups = [...new Set(Object.values(siteHistory).flatMap((day) => day.lookedUpWords))].sort((left, right) => left.localeCompare(right));
  const practiceAttempts = Object.values(siteHistory).flatMap((day) => day.practiceAttempts ?? []).sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt));
  const trackedWordCount = Object.values(vocabularyProgress).filter((entry) => Object.keys(entry.modeOutcomes ?? {}).length > 0 || Boolean(entry.lastCategory)).length;
  const totalLearningSeconds = Object.values(siteHistory).reduce((sum, day) => sum + day.seconds, 0);
  const activitySeconds = (activity: LearningActivity) => Object.values(siteHistory).reduce((sum, day) => sum + (day.activitySeconds?.[activity] ?? 0), 0);
  const mastery = Object.fromEntries(MODES.map(([mode]) => [mode, { familiar: 0, vague: 0, unfamiliar: 0 }])) as Record<DailyMode, Record<DailyOutcome, number>>;
  const wordsByStage = new Map<string, number>();
  for (const entry of Object.values(vocabularyProgress)) {
    if (Object.keys(entry.modeOutcomes ?? {}).length || entry.lastCategory) {
      for (const book of entry.sourceBooks?.length ? entry.sourceBooks : ["旧记录未标注阶段"]) wordsByStage.set(book, (wordsByStage.get(book) ?? 0) + 1);
    }
    for (const [mode] of MODES) {
      const outcome = entry.modeOutcomes?.[mode] ?? (entry.lastCategory === mode
        ? entry.familiarity ?? (entry.lastOutcome && entry.lastOutcome !== "unscored" ? entry.lastOutcome : null)
        : null);
      if (outcome) mastery[mode][outcome] += 1;
    }
  }
  const trendPoints = buildLearningTrend(trendRange, siteHistory, vocabularyHistory, today);

  return <section className="learning-progress-overview">
    <div className="learning-progress-overview-heading"><div><p className="eyebrow">{ownerName ? `${ownerName} 的学习足迹` : "你的学习足迹"}</p><h2>每天一点，持续进步</h2></div><span>学习记录最多保留 5 年</span></div>
    <div className="learning-progress-overview-stats">
      <article><span>连续打卡</span><strong>{streak}<small> 天</small></strong></article>
      <article><span>累计学习时长</span><strong>{formatDuration(totalLearningSeconds)}</strong></article>
    </div>

    <section className="learning-progress-card learning-progress-calendar-card">
      <div className="learning-progress-card-heading"><div><p className="eyebrow">学习打卡</p><h2>学习日历</h2></div><div className="learning-progress-month-controls">
        <button aria-label="上个月" onClick={() => setShownMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} type="button">‹</button>
        <strong>{shownMonth.getFullYear()}年{shownMonth.getMonth() + 1}月</strong>
        <button aria-label="下个月" disabled={shownMonth.getFullYear() === new Date().getFullYear() && shownMonth.getMonth() >= new Date().getMonth()} onClick={() => setShownMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} type="button">›</button>
      </div></div>
      <div className="learning-progress-calendar-grid" role="grid" aria-label="学习打卡日历">
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => <span className="weekday" key={day}>{day}</span>)}
        {Array.from({ length: firstWeekday }, (_, index) => <span aria-hidden="true" className="empty-day" key={`blank-${index}`} />)}
        {Array.from({ length: monthLength }, (_, index) => {
          const day = index + 1;
          const key = `${shownMonth.getFullYear()}-${String(shownMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const checked = Boolean(siteHistory[key]);
          return <button aria-label={`${key}${checked ? " 已打卡" : " 未打卡"}`} aria-pressed={key === selectedDate} className={`learning-progress-calendar-day${checked ? " checked" : ""}${key === today ? " today" : ""}${key === selectedDate ? " selected" : ""}`} disabled={key > today} key={key} onClick={() => setSelectedDate(key)} role="gridcell" title={checked ? `${formatDuration(siteHistory[key].seconds)} · 阅读 ${siteHistory[key].studyItems.length} 篇` : "尚无学习记录"} type="button">{checked ? "✓" : day}</button>;
        })}
      </div>
      <p className="learning-progress-calendar-note">已选择 {selectedDate}。访问或学习网站当天即记录打卡。</p>
    </section>

    <section className="learning-progress-card learning-progress-trend-card">
      <div className="learning-progress-card-heading">
        <div><p className="eyebrow">学习趋势</p><h2>学习活动变化</h2></div>
        <div aria-label="学习进度时间范围" className="learning-progress-range-controls" role="group">
          {TREND_RANGES.map(({ key, label }) => <button aria-pressed={trendRange === key} className={trendRange === key ? "selected" : ""} key={key} onClick={() => setTrendRange(key)} type="button">{label}</button>)}
        </div>
      </div>
      <div className="learning-progress-trend-charts">
        <LearningTrendChart color="#23795b" points={trendPoints} title="学习时长" unit="分钟" valueKey="minutes" />
        <LearningTrendChart color="#c8952e" points={trendPoints} title="阅读文章" unit="篇次" valueKey="articles" />
        <LearningTrendChart color="#4c91bd" points={trendPoints} title="背词练习" unit="词次" valueKey="words" />
        <LearningTrendChart color="#8870b8" points={trendPoints} title="查词" unit="词次" valueKey="lookups" />
      </div>
      <p className="learning-progress-calendar-note">7 天、30 天按日统计；1 年、3 年、5 年按月汇总。</p>
    </section>

    <div className="learning-progress-category-grid">
      <section className="learning-progress-category-card">
        <div className="learning-progress-category-heading"><div><p className="eyebrow">阅读记录</p><h2>文章</h2></div></div>
        <div className="learning-progress-category-stats"><div><span>投入时间</span><strong>{formatDuration(activitySeconds("articles"))}</strong></div><div><span>累计阅读</span><strong>{allTimeItems.length}<small> 篇</small></strong></div></div>
        <details className="learning-progress-details"><summary>查看读过的文章</summary>
          {allTimeItems.length ? <ul>{allTimeItems.map((item) => <li key={item}><a href={studyItemHref(item)}>{studyItemTitle(item)}</a></li>)}</ul> : <p>还没有文章阅读记录。</p>}
        </details>
      </section>

      <section className="learning-progress-category-card">
        <div className="learning-progress-category-heading"><div><p className="eyebrow">词汇记录</p><h2>背单词</h2></div></div>
        <div className="learning-progress-category-stats"><div><span>投入时间</span><strong>{formatDuration(activitySeconds("vocabulary"))}</strong></div><div><span>已记录词汇</span><strong>{trackedWordCount}<small> 个</small></strong></div></div>
        <div aria-label="词汇阶段" className="learning-progress-vocabulary-stages">{[...wordsByStage].map(([stage, count]) => <span key={stage}>{stage} <strong>{count}</strong> 个</span>)}</div>
        <details className="learning-progress-details"><summary>查看各模式掌握情况</summary>
          <div className="learning-progress-table learning-progress-mastery-table">
            <div className="learning-progress-table-row learning-progress-table-head"><span>模式</span>{OUTCOMES.map(([outcome, label]) => <span key={outcome}>{label}</span>)}</div>
            {MODES.map(([mode, label]) => <div className="learning-progress-table-row" key={mode}><span>{label}</span>{OUTCOMES.map(([outcome]) => <span className={outcome === "familiar" ? "success" : outcome === "unfamiliar" ? "error" : ""} key={outcome}>{mastery[mode][outcome]}</span>)}</div>)}
          </div>
        </details>
      </section>
      <section className="learning-progress-category-card">
        <div className="learning-progress-category-heading"><div><p className="eyebrow">做题记录</p><h2>练习</h2></div></div>
        <div className="learning-progress-category-stats"><div><span>投入时间</span><strong>{formatDuration(activitySeconds("practice"))}</strong></div><div><span>提交练习</span><strong>{practiceAttempts.length}<small> 次</small></strong></div></div>
        <details className="learning-progress-details"><summary>查看做过的练习</summary>
          {practiceAttempts.length ? <ul>{practiceAttempts.map((attempt) => <li key={`${attempt.id}:${attempt.completedAt}`}><a href={attempt.href}>{attempt.title}</a><small className="learning-progress-attempt-detail">{attempt.completedAt.slice(0, 10)}{attempt.total != null && attempt.correct != null ? ` · ${attempt.correct}/${attempt.total} 题` : ""}</small></li>)}</ul> : <p>还没有提交练习记录。</p>}
        </details>
      </section>

      <section className="learning-progress-category-card">
        <div className="learning-progress-category-heading"><div><p className="eyebrow">查词记录</p><h2>查词汇</h2></div></div>
        <div className="learning-progress-category-stats"><div><span>投入时间</span><strong>{formatDuration(activitySeconds("lookups"))}</strong></div><div><span>查过不同词汇</span><strong>{allTimeLookups.length}<small> 个</small></strong></div></div>
        <details className="learning-progress-details"><summary>查看查过的词汇</summary>
          {allTimeLookups.length ? <ul>{allTimeLookups.map((word) => <li key={word}>{word}</li>)}</ul> : <p>还没有查词记录。</p>}
        </details>
      </section>
    </div>
    <p className="learning-progress-data-note">各类学习时长从分类计时启用后累计；此前保存的时长仍计入总学习时长。</p>
  </section>;
}

export function LearningProgress() {
  const [siteHistory, setSiteHistory] = useState<SiteStudyHistory>({});
  const [vocabularyHistory, setVocabularyHistory] = useState<Record<string, DailySummary>>({});
  const [vocabularyProgress, setVocabularyProgress] = useState<SavedVocabularyProgress>({});

  useEffect(() => {
    const refresh = () => {
      setSiteHistory(readSiteStudyHistory());
      const savedVocabulary = readJson<{ progress?: SavedVocabularyProgress }>(VOCABULARY_PROGRESS_KEY);
      const currentProgress = structuredClone(savedVocabulary?.progress ?? {});
      const activity = readJson<DailyActivityStore>(VOCABULARY_DAILY_ACTIVITY_KEY);
      for (const event of activity?.events ?? []) {
        const entry = currentProgress[event.wordId];
        if (entry && !entry.sourceBooks?.length && event.book && event.book !== "生词本") entry.sourceBooks = [event.book];
      }
      setVocabularyProgress(currentProgress);
      const history = { ...(activity?.history ?? {}) };
      if (activity?.date === localStudyDate() && activity.events.length) {
        history[activity.date] = summarizeDailyStudy(activity, currentProgress, 0);
      }
      setVocabularyHistory(history);
    };
    refresh();
  }, []);

  return <main className="stack learning-progress-page">
    <section className="learning-progress-hero"><p className="eyebrow">学习轨迹</p><h1>学习进度</h1><p>查看打卡日历、学习趋势和四类学习记录。</p></section>
    <LearningActivityOverview siteHistory={siteHistory} vocabularyHistory={vocabularyHistory} vocabularyProgress={vocabularyProgress} />
  </main>;
}
