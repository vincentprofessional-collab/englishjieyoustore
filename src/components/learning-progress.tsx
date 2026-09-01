"use client";

import { useEffect, useMemo, useState } from "react";

type ProgressRow = { correct: number; attempted: number; label: string; total: number };

const STUDY_SECONDS_KEY = "ielts-platform.analytics.studySeconds";
const JUNIOR_HIGH_ATTEMPT_PREFIX = "ielts-platform.juniorHighAttempt:";
const LISTENING_ANSWER_PREFIX = "ielts-platform.listeningReviewAnswers.";
const FAVORITE_QUESTIONS_KEY = "ielts-platform.favoriteQuestions";

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

  useEffect(() => {
    const refresh = () => {
      setSeconds(Number(window.localStorage.getItem(STUDY_SECONDS_KEY) ?? "0"));
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

  return <main className="stack learning-progress-page"><section className="learning-progress-hero"><p className="eyebrow">学习轨迹</p><h1>学习进度</h1><p>查看学习时长、练习题型与正确率变化。</p></section><section className="learning-progress-summary"><article><strong>{minutes}</strong><span>学习分钟</span></article><article><strong>{totals.total}</strong><span>记录题目</span></article><article><strong>{totals.attempted}</strong><span>已作答</span></article><article><strong>{totals.correct}</strong><span>成功题目</span></article><article><strong>{Math.max(0, totals.attempted - totals.correct)}</strong><span>错误题目</span></article></section><section className="learning-progress-card"><div className="learning-progress-card-heading"><div><p className="eyebrow">题型表现</p><h2>各题型成功率</h2></div><span>按已有作答记录计算</span></div>{rows.length ? <ProgressLineChart rows={rows} /> : <p className="learning-progress-empty">完成题目后，这里会显示你的题型统计和成功率曲线。</p>}</section><section className="learning-progress-card"><div className="learning-progress-card-heading"><div><p className="eyebrow">考试与题型</p><h2>练习明细</h2></div></div>{rows.length ? <div className="learning-progress-table"><div className="learning-progress-table-row learning-progress-table-head"><span>题型</span><span>题目数</span><span>已作答</span><span>成功</span><span>错误</span></div>{rows.map((row) => <div className="learning-progress-table-row" key={row.label}><span>{row.label}</span><span>{row.total}</span><span>{row.attempted}</span><span className="success">{row.correct}</span><span className="error">{Math.max(0, row.attempted - row.correct)}</span></div>)}</div> : <p className="learning-progress-empty">暂时没有可汇总的作答记录。</p>}</section></main>;
}
