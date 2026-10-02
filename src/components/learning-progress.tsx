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

  const selectedSite = siteHistory[selectedDate] ?? { seconds: 0, studyItems: [] };
  const selectedVocabulary = vocabularyHistory[selectedDate];
  const allTimeItems = new Set(Object.values(siteHistory).flatMap((day) => day.studyItems));
  const trackedWordCount = Object.values(vocabularyProgress).filter((entry) => Object.keys(entry.modeOutcomes ?? {}).length > 0 || Boolean(entry.lastCategory)).length;
  const recentDays = Array.from({ length: 14 }, (_, index) => {
    const date = dayAtOffset(today, index - 13);
    const site = siteHistory[date] ?? { seconds: 0, studyItems: [] };
    return { date, minutes: Math.round(site.seconds / 60), articles: site.studyItems.length, words: vocabularyHistory[date]?.studiedWords ?? 0, outcomes: vocabularyHistory[date]?.modeOutcomes };
  });
  const maxMinutes = Math.max(30, ...recentDays.map((day) => day.minutes));
  const chartPoints = recentDays.map((day, index) => ({
    ...day,
    x: recentDays.length === 1 ? 45 : 42 + (index * 646) / (recentDays.length - 1),
    y: 190 - (day.minutes / maxMinutes) * 150,
  }));
  const linePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
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
    <div className="learning-progress-overview-heading"><div><p className="eyebrow">你的学习足迹</p><h2>每天一点，持续进步</h2></div><span>近 365 天记录</span></div>
    <div className="learning-progress-overview-stats">
      <article><span>连续学习</span><strong>{streak}<small> 天</small></strong></article>
      <article><span>所选日期 · 学习时长</span><strong>{formatDuration(selectedSite.seconds)}</strong></article>
      <article><span>所选日期 · 背过单词</span><strong>{selectedVocabulary?.studiedWords ?? 0}<small> 个</small></strong></article>
      <article><span>所选日期 · 阅读内容</span><strong>{selectedSite.studyItems.length}<small> 篇</small></strong></article>
      <article><span>累计学习词汇</span><strong>{trackedWordCount}<small> 个</small></strong></article>
      <article><span>累计阅读内容</span><strong>{allTimeItems.size}<small> 篇</small></strong></article>
    </div>
    <section className="learning-progress-card learning-progress-today-vocabulary">
      <div className="learning-progress-card-heading"><div><p className="eyebrow">所选日期的词汇记录</p><h2>熟悉程度与学习模式</h2></div><span>{selectedDate}</span></div>
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
      <section className="learning-progress-card learning-progress-trend-card">
        <div className="learning-progress-card-heading"><div><p className="eyebrow">近两周</p><h2>每日学习时长</h2></div><span>单位：分钟</span></div>
        <div aria-label="近14天每日学习时长曲线图" className="learning-progress-activity-chart" role="img">
          <svg viewBox="0 0 720 230" preserveAspectRatio="none">
            {[40, 90, 140, 190].map((y) => <line key={y} x1="42" x2="688" y1={y} y2={y} />)}
            <polyline points={linePoints} />
            {chartPoints.map((point) => <g key={point.date}><circle cx={point.x} cy={point.y} r="4"><title>{point.date}：{point.minutes}分钟，词汇{point.words}个，文章/课文{point.articles}篇；阅读熟悉{point.outcomes?.reading.familiar ?? 0}、听力熟悉{point.outcomes?.listening.familiar ?? 0}、口语熟悉{point.outcomes?.speaking.familiar ?? 0}、写作熟悉{point.outcomes?.writing.familiar ?? 0}</title></circle></g>)}
            {chartPoints.filter((_, index) => index % 2 === 0 || index === 13).map((point) => <text key={`label-${point.date}`} x={point.x} y="220" textAnchor="middle">{point.date.slice(5)}</text>)}
          </svg>
        </div>
        <div className="learning-progress-trend-totals"><span>词汇练习 <strong>{recentDays.reduce((sum, day) => sum + day.words, 0)}</strong> 个</span><span>文章/课文 <strong>{recentDays.reduce((sum, day) => sum + day.articles, 0)}</strong> 篇</span></div>
      </section>
    </div>
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
