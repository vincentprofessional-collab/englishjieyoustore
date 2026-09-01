"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { seniorHighCategoryLabel } from "@/lib/senior-high/catalog";
import type { SeniorHighItem } from "@/lib/senior-high/types";

const TOPIC_ORDER = ["词汇与短语", "名词", "冠词", "代词", "数词", "形容词和副词", "介词", "构词法", "动词时态和语态", "非谓语动词", "情态动词和虚拟语气", "定语从句", "名词性从句", "状语从句和并列句", "特殊句式", "主谓一致", "听说表达", "综合语法"];
const BLANK_PATTERN = /_{2,}/g;

function normalize(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\s+/g, " ").replace(/[.,!?;:，。！？；：]+$/u, "");
}

function correct(item: SeniorHighItem, value: string) {
  const blankCount = item.stem.match(BLANK_PATTERN)?.length || 0;
  if (blankCount > 1) {
    const expected = item.answer.split(/\s*[;；]\s*/);
    const actual = value.split(/\s*[;；]\s*/);
    if (expected.length === blankCount && actual.length === blankCount) return expected.every((part, index) => part.split(/[／/]/).some((answer) => normalize(answer) === normalize(actual[index] || "")));
  }
  return item.answer.split(/[／/]/).some((answer) => normalize(answer) === normalize(value));
}

function InlineStem({ item, onChange, value }: { item: SeniorHighItem; onChange: (value: string) => void; value: string }) {
  const blanks = item.stem.match(BLANK_PATTERN) || [];
  const parts = item.stem.split(BLANK_PATTERN);
  const values = blanks.length > 1 ? value.split(/\s*[;；]\s*/) : [value];
  const update = (index: number, next: string) => {
    const result = Array.from({ length: Math.max(1, blanks.length) }, (_, position) => values[position] || "");
    result[index] = next;
    onChange(result.join("; "));
  };
  if (blanks.length === 0) return <>{item.stem}<input aria-label={`第 ${item.question_number} 题答案`} autoComplete="off" className="senior-high-inline-answer" onChange={(event) => update(0, event.target.value)} value={values[0] || ""} /></>;
  return parts.flatMap((part, index) => [<Fragment key={`text-${index}`}>{part}</Fragment>, index < blanks.length ? <input aria-label={`第 ${item.question_number} 题第 ${index + 1} 空`} autoComplete="off" className="senior-high-inline-answer" key={`blank-${index}`} onChange={(event) => update(index, event.target.value)} value={values[index] || ""} /> : null]) as ReactNode;
}

export function SeniorHighKnowledge() {
  const [items, setItems] = useState<SeniorHighItem[] | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/senior-high/knowledge.json").then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ knowledge: SeniorHighItem[] }>;
    }).then((payload) => setItems(payload.knowledge)).catch(() => setError("知识点题库暂时无法载入。"));
  }, []);

  const groups = useMemo(() => {
    const grouped = new Map<string, SeniorHighItem[]>();
    for (const item of items || []) {
      const key = item.knowledge_topic || "综合语法";
      grouped.set(key, [...(grouped.get(key) || []), item]);
    }
    return [...grouped.entries()].sort(([left], [right]) => {
      const a = TOPIC_ORDER.indexOf(left);
      const b = TOPIC_ORDER.indexOf(right);
      return (a < 0 ? TOPIC_ORDER.length : a) - (b < 0 ? TOPIC_ORDER.length : b) || left.localeCompare(right, "zh-CN");
    });
  }, [items]);
  const questions = groups.find(([name]) => name === topic)?.[1] || [];

  const openTopic = (name: string) => {
    setTopic(name);
    setExpanded({});
    try {
      const saved = JSON.parse(window.localStorage.getItem(`senior-high:knowledge:${name}`) || "null") as { answers?: Record<string, string>; submitted?: boolean } | null;
      setAnswers(saved?.answers || {});
      setSubmitted(Boolean(saved?.submitted));
    } catch {
      setAnswers({});
      setSubmitted(false);
    }
  };
  const updateAnswer = (id: string, value: string) => {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSubmitted(false);
  };
  const submit = () => {
    if (!topic) return;
    setSubmitted(true);
    window.localStorage.setItem(`senior-high:knowledge:${topic}`, JSON.stringify({ answers, submitted: true }));
  };

  if (error) return <div className="senior-high-alert">{error}</div>;
  if (!items) return <div className="senior-high-loading">正在按语法主题载入知识点…</div>;
  if (!topic) return <div className="senior-high-section"><h2>知识点</h2><p className="senior-high-muted">点击“名词、冠词、代词”等主题后进入连续题目；填空直接写在原句虚线上，不再显示多余的下方输入框。</p><div className="senior-high-topic-grid">{groups.map(([name, topicItems]) => <button className="senior-high-topic-card" key={name} onClick={() => openTopic(name)} type="button"><strong>{name}</strong><span>{topicItems.length} 题</span></button>)}</div></div>;

  const answered = questions.filter((item) => Boolean(answers[item.id]?.trim())).length;
  const correctCount = submitted ? questions.filter((item) => correct(item, answers[item.id] || "")).length : 0;
  return <div className="senior-high-session">
    <div className="senior-high-session-toolbar"><button className="senior-high-back" onClick={() => setTopic(null)} type="button">← 返回知识点</button><div><span>知识点</span><strong>{topic}</strong></div><span>{answered}/{questions.length} 已作答</span></div>
    {submitted ? <div className="senior-high-result"><strong>{correctCount}/{questions.length}</strong> 自动判分正确</div> : null}
    <div className="senior-high-question-list">{questions.map((item, index) => {
      const value = answers[item.id] || "";
      const isCorrect = submitted && correct(item, value);
      return <article className="senior-high-question-card" id={item.id} key={item.id}>
        <div className="senior-high-question-meta"><span>第 {index + 1} 题</span><small>{seniorHighCategoryLabel(item.category)}</small></div>
        <p className="senior-high-question-stem">{item.options.length ? item.stem : <InlineStem item={item} onChange={(next) => updateAnswer(item.id, next)} value={value} />}</p>
        {item.options.length ? <div className="senior-high-options">{item.options.map((option) => <button className={value === option.letter ? "selected" : ""} key={option.letter} onClick={() => updateAnswer(item.id, option.letter)} type="button"><b>{option.letter}.</b><span>{option.text}</span></button>)}</div> : null}
        {submitted ? <div className={`senior-high-feedback ${isCorrect ? "correct" : "incorrect"}`}><span>{isCorrect ? "✓ 正确" : "✕ 未答对"}</span><strong>答案：{item.answer}</strong>{item.analysis ? <button onClick={() => setExpanded((current) => ({ ...current, [item.id]: !current[item.id] }))} type="button">{expanded[item.id] ? "收起解析" : "查看解析"}</button> : <small>暂无解析</small>}{expanded[item.id] && item.analysis ? <div className="senior-high-analysis"><p>{item.analysis}</p><small>来源：{item.source_relpath}</small></div> : null}</div> : null}
      </article>;
    })}</div>
    <div className="senior-high-submit-row"><button className="senior-high-submit" onClick={submit} type="button">{submitted ? "重新提交" : "提交并查看答案"}</button></div>
  </div>;
}
