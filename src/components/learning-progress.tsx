"use client";

import { useEffect, useMemo, useState } from "react";
import { localStudyDate, summarizeDailyStudy, type DailyActivityStore, type DailyMode, type DailyOutcome, type DailySummary } from "@/lib/vocabulary/daily-summary";
import { readSiteStudyHistory, type SiteStudyHistory } from "@/lib/learning/site-progress";

type ProgressRow = { correct: number; attempted: number; label: string; total: number };

const STUDY_SECONDS_KEY = "ielts-platform.analytics.studySeconds";
const JUNIOR_HIGH_ATTEMPT_PREFIX = "ielts-platform.juniorHighAttempt:";
const LISTENING_ANSWER_PREFIX = "ielts-platform.listeningReviewAnswers.";
const FAVORITE_QUESTIONS_KEY = "ielts-platform.favoriteQuestions";
const VOCABULARY_PROGRESS_KEY = "ielts-vocabulary-learning-v1";
const VOCABULARY_DAILY_ACTIVITY_KEY = "ielts-vocabulary-daily-activity-v1";

type SavedVocabularyProgress = Record<string, {
  completed?: boolean;
  familiarity?: DailyOutcome | null;
  lastCategory?: DailyMode;
  lastOutcome?: DailyOutcome | "unscored" | null;
  modeOutcomes?: Partial<Record<DailyMode, DailyOutcome>>;
}>;

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

type TrendRange = "7d" | "30d" | "1y" | "3y" | "5y";
type LearningTrendPoint = { articles: number; date: string; label: string; lookups: number; minutes: number; words: number };
const TREND_RANGES: Array<{ key: TrendRange; label: string }> = [
  { key: "7d", label: "7 天" },
  { key: "30d", label: "30 天" },
  { key: "1y", label: "1 年" },
  { key: "3y", label: "3 年" },
  { key: "5y", label: "5 年" },
];

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

function LearningActivityOverview({
  siteHistory,
  vocabularyHistory,
  vocabularyProgress,
}: {
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

  const selectedSite = siteHistory[selectedDate] ?? { lookedUpWords: [], seconds: 0, studyItems: [] };
  const selectedVocabulary = vocabularyHistory[selectedDate];
  const allTimeItems = new Set(Object.values(siteHistory).flatMap((day) => day.studyItems));
  const allTimeLookups = new Set(Object.values(siteHistory).flatMap((day) => day.lookedUpWords));
  const trackedWordCount = Object.values(vocabularyProgress).filter((entry) => Object.keys(entry.modeOutcomes ?? {}).length > 0 || Boolean(entry.lastCategory)).length;
  const checkedInDays = Object.keys(siteHistory).length;
  const totalLearningSeconds = Object.values(siteHistory).reduce((sum, day) => sum + day.seconds, 0);
  const trendPoints = buildLearningTrend(trendRange, siteHistory, vocabularyHistory, today);
  const modes: Array<[DailyMode, string]> = [["reading", "阅读"], ["listening", "听力"], ["speaking", "口语"], ["writing", "写作"]];
  const mastery = Object.fromEntries(modes.map(([mode]) => [mode, { familiar: 0, vague: 0, unfamiliar: 0 }])) as Record<DailyMode, Record<DailyOutcome, number>>;
  for (const entry of Object.values(vocabularyProgress)) {
    for (const [mode] of modes) {
      const outcome = entry.modeOutcomes?.[mode] ?? (entry.lastCategory === mode
        ? entry.familiarity ?? (entry.lastOutcome && entry.lastOutcome !== "unscored" ? entry.lastOutcome : null)
        : null);
      if (outcome) mastery[mode][outcome] += 1;
    }
  }

  return <section className="learning-progress-overview">
    <div className="learning-progress-overview-heading"><div><p className="eyebrow">你的学习足迹</p><h2>每天一点，持续进步</h2></div><span>学习记录最多保留 5 年</span></div>
    <div className="learning-progress-overview-stats">
      <article><span>连续学习</span><strong>{streak}<small> 天</small></strong></article>
      <article><span>累计学习天数</span><strong>{checkedInDays}<small> 天</small></strong></article>
      <article><span>累计学习时长</span><strong>{formatDuration(totalLearningSeconds)}</strong></article>
      <article><span>累计阅读文章</span><strong>{allTimeItems.size}<small> 篇</small></strong></article>
      <article><span>累计背过词汇</span><strong>{trackedWordCount}<small> 个</small></strong></article>
      <article><span>查过不同单词</span><strong>{allTimeLookups.size}<small> 个</small></strong></article>
    </div>
    <section className="learning-progress-card learning-progress-today-vocabulary">
      <div className="learning-progress-card-heading"><div><p className="eyebrow">所选日期的词汇记录</p><h2>熟悉程度与学习模式</h2></div><span>{selectedDate}</span></div>
      <div className="learning-progress-selected-day-stats">
        <article><span>学习时间</span><strong>{formatDuration(selectedSite.seconds)}</strong></article>
        <article><span>背过词汇</span><strong>{selectedVocabulary?.studiedWords ?? 0}<small> 个</small></strong></article>
        <article><span>阅读文章</span><strong>{selectedSite.studyItems.length}<small> 篇</small></strong></article>
        <article><span>查过单词</span><strong>{selectedSite.lookedUpWords.length}<small> 个</small></strong></article>
      </div>
      <div className="learning-progress-today-outcomes">
        <article><span>熟悉</span><strong className="success">{selectedVocabulary?.familiar ?? 0}</strong></article>
        <article><span>模糊</span><strong>{selectedVocabulary?.vague ?? 0}</strong></article>
        <article><span>生僻</span><strong className="error">{selectedVocabulary?.unfamiliar ?? 0}</strong></article>
        <article><span>阅读</span><strong>{selectedVocabulary?.modes.reading ?? 0}</strong></article>
        <article><span>听力</span><strong>{selectedVocabulary?.modes.listening ?? 0}</strong></article>
        <article><span>口语</span><strong>{selectedVocabulary?.modes.speaking ?? 0}</strong></article>
        <article><span>写作</span><strong>{selectedVocabulary?.modes.writing ?? 0}</strong></article>
      </div>
      <div className="learning-progress-table learning-progress-day-modes">
        <div className="learning-progress-table-row learning-progress-table-head"><span>学习模式</span><span>熟悉</span><span>模糊</span><span>生僻</span></div>
        {modes.map(([mode, label]) => <div className="learning-progress-table-row" key={mode}><span>{label}</span><span className="success">{selectedVocabulary?.modeOutcomes[mode].familiar ?? 0}</span><span>{selectedVocabulary?.modeOutcomes[mode].vague ?? 0}</span><span className="error">{selectedVocabulary?.modeOutcomes[mode].unfamiliar ?? 0}</span></div>)}
      </div>
    </section>
    <div className="learning-progress-overview-grid">
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
        <p className="learning-progress-calendar-note">访问或学习网站当天即记录打卡；学习时长按页面在前台显示的时间累计。</p>
      </section>
    </div>
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
      <p className="learning-progress-calendar-note">7 天、30 天按日统计；1 年、3 年、5 年按月汇总。时长按页面在前台显示的时间累计，背词和查词会累计每日记录。</p>
    </section>
    <section className="learning-progress-card learning-progress-mastery-card">
      <div className="learning-progress-card-heading"><div><p className="eyebrow">词汇掌握情况</p><h2>按记忆模式查看熟悉程度</h2></div><span>按每个单词各模式最近记录统计</span></div>
      <div className="learning-progress-table learning-progress-mastery-table">
        <div className="learning-progress-table-row learning-progress-table-head"><span>模式</span><span>熟悉</span><span>模糊</span><span>生僻</span></div>
        {modes.map(([mode, label]) => <div className="learning-progress-table-row" key={mode}><span>{label}</span><span className="success">{mastery[mode].familiar}</span><span>{mastery[mode].vague}</span><span className="error">{mastery[mode].unfamiliar}</span></div>)}
      </div>
    </section>
  </section>;
}

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function questionTypeFromKey(key: string) {
  if (/cloze/i.test(key)) return "完形填空";
  if (/reading/i.test(key)) return "阅读理解";
  if (/listening/i.test(key)) return "听力";
  if (/dialogue/i.test(key)) return "补全对话";
  return "中考综合题型";
}

function ProgressLineChart({ rows }: { rows: ProgressRow[] }) {
  const points = rows.map((row, index) => ({
    x: rows.length === 1 ? 50 : 10 + (index * 80) / (rows.length - 1),
    y: 92 - Math.min(78, row.attempted ? (row.correct / row.attempted) * 78 : 0),
  }));
  return <div className="learning-progress-chart" aria-label="各题型成功率曲线图" role="img">
    <div className="learning-progress-chart-grid"><span>100%</span><span>50%</span><span>0%</span></div>
    <div className="learning-progress-plot">{points.map((point, index) => <span className="learning-progress-point" key={rows[index].label} style={{ left: `${point.x}%`, top: `${point.y}%` }} title={`${rows[index].label} ${rows[index].attempted ? Math.round((rows[index].correct / rows[index].attempted) * 100) : 0}%`} />)}{points.slice(1).map((point, index) => { const previous = points[index]; const dx = point.x - previous.x; const dy = point.y - previous.y; const length = Math.sqrt(dx * dx + dy * dy); const angle = Math.atan2(dy, dx) * (180 / Math.PI); return <span className="learning-progress-segment" key={`segment-${rows[index + 1].label}`} style={{ left: `${previous.x}%`, top: `${previous.y}%`, width: `${length}%`, transform: `rotate(${angle}deg)` }} />; })}</div>
    <div className="learning-progress-chart-labels">{rows.map((row) => <span key={row.label}>{row.label}</span>)}</div>
  </div>;
}

export function LearningProgress() {
  const [seconds, setSeconds] = useState(0);
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [siteHistory, setSiteHistory] = useState<SiteStudyHistory>({});
  const [vocabularyHistory, setVocabularyHistory] = useState<Record<string, DailySummary>>({});
  const [vocabularyProgress, setVocabularyProgress] = useState<SavedVocabularyProgress>({});

  useEffect(() => {
    const refresh = () => {
      setSeconds(Number(window.localStorage.getItem(STUDY_SECONDS_KEY) ?? "0"));
      setSiteHistory(readSiteStudyHistory());
      const savedVocabulary = readJson<{ progress?: SavedVocabularyProgress }>(VOCABULARY_PROGRESS_KEY);
      const currentProgress = savedVocabulary?.progress ?? {};
      setVocabularyProgress(currentProgress);
      const activity = readJson<DailyActivityStore>(VOCABULARY_DAILY_ACTIVITY_KEY);
      const history = { ...(activity?.history ?? {}) };
      if (activity?.date === localStudyDate() && activity.events.length) {
        history[activity.date] = summarizeDailyStudy(activity, currentProgress, 0);
      }
      setVocabularyHistory(history);
      const aggregates = new Map<string, ProgressRow>();
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index) ?? "";
        if (key.startsWith(JUNIOR_HIGH_ATTEMPT_PREFIX)) {
          const saved = readJson<{ answers?: Record<string, string> }>(key);
          const attempted = Object.values(saved?.answers ?? {}).filter((value) => value.trim()).length;
          const label = questionTypeFromKey(key);
          const current = aggregates.get(label) ?? { label, total: 0, attempted: 0, correct: 0 };
          current.total += attempted;
          current.attempted += attempted;
          aggregates.set(label, current);
        }
        if (key.startsWith(LISTENING_ANSWER_PREFIX)) {
          const saved = readJson<Record<string, string>>(key) ?? {};
          const attempted = Object.values(saved).filter((value) => String(value).trim()).length;
          const current = aggregates.get("听力") ?? { label: "听力", total: 0, attempted: 0, correct: 0 };
          current.total += attempted;
          current.attempted += attempted;
          aggregates.set("听力", current);
        }
      }
      const wrong = readJson<Array<{ origin?: string; category?: string }>>(FAVORITE_QUESTIONS_KEY) ?? [];
      const juniorWrong = wrong.filter((item) => item.origin === "junior-high" || item.category === "wrong").length;
      if (juniorWrong) {
        const current = aggregates.get("中考综合题型");
        if (current) current.correct = Math.max(0, current.attempted - juniorWrong);
      }
      setRows([...aggregates.values()].map((row) => ({ ...row, total: Math.max(row.total, row.attempted) })));
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const totals = useMemo(() => rows.reduce((result, row) => ({ total: result.total + row.total, attempted: result.attempted + row.attempted, correct: result.correct + row.correct }), { total: 0, attempted: 0, correct: 0 }), [rows]);
  const minutes = Math.floor(seconds / 60);

  return <main className="stack learning-progress-page"><section className="learning-progress-hero"><p className="eyebrow">学习轨迹</p><h1>学习进度</h1><p>记录打卡、背词、阅读内容和练习变化。</p></section><LearningActivityOverview siteHistory={siteHistory} vocabularyHistory={vocabularyHistory} vocabularyProgress={vocabularyProgress} /><section className="learning-progress-summary"><article><strong>{minutes}</strong><span>累计学习分钟</span></article><article><strong>{totals.total}</strong><span>记录题目</span></article><article><strong>{totals.attempted}</strong><span>已作答</span></article><article><strong>{totals.correct}</strong><span>成功题目</span></article><article><strong>{Math.max(0, totals.attempted - totals.correct)}</strong><span>错误题目</span></article></section><section className="learning-progress-card"><div className="learning-progress-card-heading"><div><p className="eyebrow">题型表现</p><h2>各题型成功率</h2></div><span>按已有作答记录计算</span></div>{rows.length ? <ProgressLineChart rows={rows} /> : <p className="learning-progress-empty">完成题目后，这里会显示你的题型统计和成功率曲线。</p>}</section><section className="learning-progress-card"><div className="learning-progress-card-heading"><div><p className="eyebrow">考试与题型</p><h2>练习明细</h2></div></div>{rows.length ? <div className="learning-progress-table"><div className="learning-progress-table-row learning-progress-table-head"><span>题型</span><span>题目数</span><span>已作答</span><span>成功</span><span>错误</span></div>{rows.map((row) => <div className="learning-progress-table-row" key={row.label}><span>{row.label}</span><span>{row.total}</span><span>{row.attempted}</span><span className="success">{row.correct}</span><span className="error">{Math.max(0, row.attempted - row.correct)}</span></div>)}</div> : <p className="learning-progress-empty">暂时没有可汇总的作答记录。</p>}</section></main>;
}
