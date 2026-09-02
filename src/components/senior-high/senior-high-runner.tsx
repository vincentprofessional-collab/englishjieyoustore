"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import type {
  SeniorHighAssetRef,
  SeniorHighBlock,
  SeniorHighOption,
  SeniorHighQuestion,
  SeniorHighSet,
} from "@/lib/senior-high/v2-types";
import {
  gradeSeniorHighQuestion,
  seniorHighCorrectAnswer,
  seniorHighQuestionAnswered,
  type SeniorHighGrade,
  type SeniorHighV2Answers,
} from "@/lib/senior-high/v2-grading";
import { focusNextSeniorHighInlineAnswer } from "@/lib/senior-high/inline-navigation";

type RunnerProps = { kind: "paper" | "practice"; setId: string };
type BlankBinding = { options: SeniorHighOption[]; question: SeniorHighQuestion };

const TYPE_LABELS: Record<string, string> = {
  error_correction: "短文改错",
  essay: "写作",
  inline_fill: "语法／词汇填空",
  instruction_only: "说明",
  multi_blank: "多空填空",
  multi_choice: "多项选择",
  oral_response: "听说／口语",
  shared_option_matching: "七选五／匹配",
  short_answer: "短答",
  single_choice: "单项选择",
  table_fill: "表格填空",
  translation: "翻译",
};

function plainText(blocks: SeniorHighBlock[] | undefined): string {
  return (blocks || []).map((block) => {
    if (block.type === "heading" || block.type === "notice") return block.text;
    if (block.type === "paragraph" || block.type === "richText") return block.runs.map((run) => run.type === "text" ? run.text : "____").join("");
    if (block.type === "dialogue") return block.turns.map((turn) => `${turn.speaker}: ${plainText(turn.blocks)}`).join(" ");
    if (block.type === "table") return block.rows.map((row) => row.cells.map((cell) => plainText(cell)).join(" ")).join(" ");
    if (block.type === "image") return block.alt;
    return block.label || "";
  }).join(" ").trim();
}

function displayNumber(question: SeniorHighQuestion, _kind: SeniorHighSet["kind"]) {
  return question.displayNumber;
}

function BlockRenderer({
  answers,
  assets,
  bindings,
  blocks,
  kind,
  onAnswer,
}: {
  answers: SeniorHighV2Answers;
  assets: Map<string, SeniorHighAssetRef>;
  bindings: Map<string, BlankBinding>;
  blocks: SeniorHighBlock[];
  kind: SeniorHighSet["kind"];
  onAnswer: (key: string, value: string) => void;
}) {
  const renderRuns = (runs: Extract<SeniorHighBlock, { type: "paragraph" | "richText" }>["runs"]) => runs.map((run, index) => {
    if (run.type === "text") return <Fragment key={`text-${index}`}>{run.text}</Fragment>;
    const binding = bindings.get(run.blankId);
    if (!binding) return <span className="senior-high-v2-missing-blank" key={run.blankId}>____</span>;
    const { question } = binding;
    const number = displayNumber(question, kind);
    if (["inline_fill", "multi_blank", "table_fill"].includes(question.type)) {
      return <span className="senior-high-v2-inline-control" id={question.id} key={run.blankId}><b>{number}</b><input aria-label={`第 ${number} 题答案`} autoCapitalize="none" autoComplete="off" autoCorrect="off" className="senior-high-inline-answer" data-1p-ignore="true" data-form-type="other" data-lpignore="true" data-senior-high-inline-answer="true" name={`senior-high-${kind}-${run.blankId}`} onChange={(event) => onAnswer(run.blankId, event.target.value)} onKeyDown={(event) => { if (event.key !== "Enter" || event.nativeEvent.isComposing) return; event.preventDefault(); focusNextSeniorHighInlineAnswer(event.currentTarget); }} spellCheck={false} type="text" value={answers[run.blankId] || ""} /></span>;
    }
    if (question.type === "shared_option_matching") {
      return <span className="senior-high-v2-inline-control" id={question.id} key={run.blankId}><b>{number}</b><select aria-label={`第 ${number} 题选项`} onChange={(event) => onAnswer(question.id, event.target.value)} value={answers[question.id] || ""}><option value="">请选择</option>{binding.options.map((option) => <option key={option.id} value={option.id}>{option.id}</option>)}</select></span>;
    }
    return <span className="senior-high-v2-choice-blank" id={question.id} key={run.blankId}><b>{number}</b><span>{answers[question.id] || ""}</span></span>;
  });

  return <>{blocks.map((block, index) => {
    const key = block.id || `${block.type}-${index}`;
    if (block.type === "heading") {
      if (block.level === 1) return <h2 key={key}>{block.text}</h2>;
      if (block.level === 2) return <h3 key={key}>{block.text}</h3>;
      return <h4 key={key}>{block.text}</h4>;
    }
    if (block.type === "paragraph") return <p className="senior-high-v2-paragraph" key={key}>{renderRuns(block.runs)}</p>;
    if (block.type === "richText") return <div className="senior-high-v2-paragraph" key={key}>{renderRuns(block.runs)}</div>;
    if (block.type === "notice") return <div className={`senior-high-v2-notice ${block.tone || "info"}`} key={key}>{block.text}</div>;
    if (block.type === "image") {
      const asset = assets.get(block.assetId);
      return asset ? <figure className="senior-high-v2-figure" key={key}><img alt={block.alt} src={asset.url} />{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure> : null;
    }
    if (block.type === "audio") {
      const asset = assets.get(block.assetId);
      return asset ? <div className="senior-high-v2-media" key={key}><span>{block.label || "听力音频"}</span><audio controls preload="metadata" src={asset.url} /></div> : null;
    }
    if (block.type === "video") {
      const asset = assets.get(block.assetId);
      return asset ? <div className="senior-high-v2-media" key={key}><span>{block.label || "视频"}</span><video controls preload="metadata" src={asset.url} /></div> : null;
    }
    if (block.type === "dialogue") return <div className="senior-high-v2-dialogue" key={key}>{block.turns.map((turn, turnIndex) => <div key={`${turn.speaker}-${turnIndex}`}><strong>{turn.speaker}</strong><div><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={turn.blocks} kind={kind} onAnswer={onAnswer} /></div></div>)}</div>;
    return <div className="senior-high-v2-table-wrap" key={key}><table><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.cells.map((cell, cellIndex) => <td key={cellIndex}><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={cell} kind={kind} onAnswer={onAnswer} /></td>)}</tr>)}</tbody></table></div>;
  })}</>;
}

function Feedback({
  answers,
  assets,
  bindings,
  grade,
  kind,
  onAnswer,
  question,
}: {
  answers: SeniorHighV2Answers;
  assets: Map<string, SeniorHighAssetRef>;
  bindings: Map<string, BlankBinding>;
  grade: SeniorHighGrade;
  kind: SeniorHighSet["kind"];
  onAnswer: (key: string, value: string) => void;
  question: SeniorHighQuestion;
}) {
  const labels: Record<SeniorHighGrade, string> = {
    conflict: "答案存在冲突，待人工复核",
    correct: "✓ 正确",
    incorrect: "✕ 未答对",
    manual: "已提交，待人工评阅",
    none: "已提交，暂无标准答案",
    unanswered: "未作答",
  };
  const answer = seniorHighCorrectAnswer(question);
  const hasReference = question.answerSpec.kind === "reference" && question.answerSpec.referenceAnswer;
  return <div className={`senior-high-feedback ${grade}`}>
    <span>{labels[grade]}</span>
    {answer ? <strong>答案：{answer}</strong> : null}
    {hasReference ? <strong>参考答案／范文见下方</strong> : null}
    {question.explanationBlocks.length === 0 && !hasReference ? <small>{answer ? "暂无解析" : ""}</small> : null}
    {hasReference ? <div className="senior-high-analysis"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={Array.isArray(question.answerSpec.referenceAnswer) ? question.answerSpec.referenceAnswer : [{ type: "paragraph", runs: [{ type: "text", text: question.answerSpec.referenceAnswer || "" }] }]} kind={kind} onAnswer={onAnswer} /></div> : null}
    {question.explanationBlocks.length > 0 ? <div className="senior-high-analysis"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={question.explanationBlocks} kind={kind} onAnswer={onAnswer} /></div> : null}
  </div>;
}

function QuestionCard({
  answers,
  assets,
  bindings,
  kind,
  onAnswer,
  question,
  submitted,
}: {
  answers: SeniorHighV2Answers;
  assets: Map<string, SeniorHighAssetRef>;
  bindings: Map<string, BlankBinding>;
  kind: SeniorHighSet["kind"];
  onAnswer: (key: string, value: string) => void;
  question: SeniorHighQuestion;
  submitted: boolean;
}) {
  const inlineOnly = ["inline_fill", "multi_blank", "table_fill", "shared_option_matching"].includes(question.type) && question.promptBlocks.length === 0 && question.options.length === 0;
  const grade = gradeSeniorHighQuestion(question, answers);
  if (inlineOnly) return submitted ? <div className="senior-high-v2-inline-feedback" key={question.id}><b>第 {displayNumber(question, kind)} 题</b><Feedback answers={answers} assets={assets} bindings={bindings} grade={grade} kind={kind} onAnswer={onAnswer} question={question} /></div> : null;
  const value = answers[question.id] || "";
  const selected = new Set(value.split(",").filter(Boolean));
  const choose = (optionId: string) => {
    if (question.type !== "multi_choice") return onAnswer(question.id, optionId);
    const next = new Set(selected);
    if (next.has(optionId)) next.delete(optionId); else next.add(optionId);
    onAnswer(question.id, [...next].sort().join(","));
  };
  const textInput = ["short_answer", "translation", "error_correction", "essay", "oral_response"].includes(question.type);
  return <article className="senior-high-question-card" id={question.id}>
    <div className="senior-high-question-meta"><span>第 {displayNumber(question, kind)} 题</span>{question.sourceQuestionNumber && question.sourceQuestionNumber !== question.displayNumber ? <small>{kind === "paper" ? "原卷题号" : "原资料题号"} {question.sourceQuestionNumber}</small> : null}<small>{TYPE_LABELS[question.type] || question.type}</small></div>
    {question.promptBlocks.length > 0 ? <div className="senior-high-v2-question-prompt"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={question.promptBlocks} kind={kind} onAnswer={onAnswer} /></div> : null}
    {question.options.length > 0 ? <div className="senior-high-options">{question.options.map((option) => <button aria-pressed={selected.has(option.id)} className={selected.has(option.id) ? "selected" : ""} key={option.id} onClick={() => choose(option.id)} type="button"><b>{option.label}.</b><span>{plainText(option.blocks)}</span></button>)}</div> : null}
    {textInput ? <><textarea aria-label={`第 ${displayNumber(question, kind)} 题答案`} className="senior-high-answer-input" onChange={(event) => onAnswer(question.id, event.target.value)} placeholder={question.type === "essay" ? "请在这里完成写作…" : question.type === "oral_response" ? "可在此记录口语回答要点（录音不会上传）…" : "请输入答案…"} rows={question.type === "essay" ? 12 : 5} value={value} />{question.type === "essay" ? <small className="senior-high-v2-word-count">当前 {value.trim() ? value.trim().split(/\s+/).length : 0} 词</small> : null}</> : null}
    {submitted && question.type !== "instruction_only" ? <Feedback answers={answers} assets={assets} bindings={bindings} grade={grade} kind={kind} onAnswer={onAnswer} question={question} /> : null}
  </article>;
}

export function SeniorHighRunner({ kind, setId }: RunnerProps) {
  const [data, setData] = useState<SeniorHighSet | null>(null);
  const [answers, setAnswers] = useState<SeniorHighV2Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedGroups, setSubmittedGroups] = useState<Record<string, boolean>>({});
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState("");
  const storageKey = `senior-high:v2:2:${kind}:${setId}`;

  useEffect(() => {
    fetch(`/senior-high/${kind === "paper" ? "papers" : "practice"}/${setId}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<SeniorHighSet>;
      })
      .then((payload) => setData(payload))
      .catch(() => setError("这套资料暂时无法载入，请返回后重试。"));
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null") as { answers?: SeniorHighV2Answers; submitted?: boolean; submittedGroups?: Record<string, boolean> } | null;
      setAnswers(saved?.answers || {});
      setSubmitted(Boolean(saved?.submitted));
      setSubmittedGroups(saved?.submittedGroups || {});
    } catch {
      setAnswers({});
    } finally {
      setRestored(true);
    }
  }, [setId, storageKey]);

  useEffect(() => {
    if (restored) window.localStorage.setItem(storageKey, JSON.stringify({ answers, submitted, submittedGroups }));
  }, [answers, restored, storageKey, submitted, submittedGroups]);

  const questions = useMemo(() => data?.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).filter((question) => question.type !== "instruction_only") || [], [data]);
  const questionGroupKeys = useMemo(() => {
    const keys = new Map<string, string>();
    for (const section of data?.sections || []) for (const group of section.groups) for (const question of group.questions) keys.set(question.id, `${section.id}:${group.id}`);
    return keys;
  }, [data]);
  const assets = useMemo(() => new Map((data?.assetRefs || []).map((asset) => [asset.assetId, asset])), [data]);
  const answeredCount = questions.filter((question) => seniorHighQuestionAnswered(question, answers)).length;
  const grades = submitted ? questions.map((question) => gradeSeniorHighQuestion(question, answers)) : [];
  const correctCount = grades.filter((grade) => grade === "correct").length;
  const incorrectCount = grades.filter((grade) => grade === "incorrect").length;
  const manualCount = grades.filter((grade) => grade === "manual").length;
  const noneCount = grades.filter((grade) => grade === "none" || grade === "conflict").length;
  const unansweredCount = grades.filter((grade) => grade === "unanswered").length;

  const onAnswer = (key: string, value: string, groupKey?: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setSubmitted(false);
    if (groupKey) setSubmittedGroups((current) => {
      if (!current[groupKey]) return current;
      const next = { ...current };
      delete next[groupKey];
      return next;
    });
  };

  if (error) return <section className="senior-high-page"><div className="senior-high-alert">{error}</div></section>;
  if (!data) return <section className="senior-high-page"><div className="senior-high-loading">正在载入真实题目与作答结构…</div></section>;

  return <section className="senior-high-page senior-high-v2-runner">
    <header className="senior-high-v2-runner-header">
      <Link className="senior-high-back" href="/senior-high">← 返回高考英语</Link>
      <div><span>{data.kind === "paper" ? "历年真题" : "题型训练"} · {data.year} · {data.region}</span><h1>{data.title}</h1><p>{data.variant}{data.timeLimit ? ` · ${data.timeLimit} 分钟` : ""}{data.score ? ` · ${data.score} 分` : ""}</p></div>
      <div className="senior-high-v2-progress"><strong>{answeredCount}/{questions.length}</strong><span>已作答</span></div>
    </header>
    {data.instructions.length > 0 ? <div className="senior-high-v2-instructions"><BlockRenderer answers={answers} assets={assets} bindings={new Map()} blocks={data.instructions} kind={data.kind} onAnswer={onAnswer} /></div> : null}
    {submitted ? <div className="senior-high-result"><strong>{correctCount}</strong> 正确 · <strong>{incorrectCount}</strong> 错误{unansweredCount ? ` · ${unansweredCount} 题未作答` : ""}{manualCount ? ` · ${manualCount} 题待人工评阅` : ""}{noneCount ? ` · ${noneCount} 题暂无标准答案` : ""}</div> : null}
    <div className="senior-high-v2-sections">{data.sections.map((section) => <section className="senior-high-v2-section" key={section.id}><header><h2>{section.title}</h2>{section.score ? <span>{section.score} 分</span> : null}</header>{section.instructions.length > 0 ? <BlockRenderer answers={answers} assets={assets} bindings={new Map()} blocks={section.instructions} kind={data.kind} onAnswer={onAnswer} /> : null}<div className="senior-high-v2-groups">{section.groups.map((group) => {
      const bindings = new Map<string, BlankBinding>();
      for (const question of group.questions) for (const blank of question.blanks) bindings.set(blank.blankId, { options: group.sharedOptions, question });
      const inlineQuestions = group.questions.filter((question) => ["inline_fill", "multi_blank", "table_fill", "shared_option_matching"].includes(question.type) && question.promptBlocks.length === 0 && question.options.length === 0);
      const standaloneQuestions = group.questions.filter((question) => !inlineQuestions.includes(question));
      const groupKey = `${section.id}:${group.id}`;
      const hasStimulusQuestions = group.stimulusBlocks.length > 0 && group.questions.length > 0;
      const groupSubmitted = submitted || Boolean(submittedGroups[groupKey]);
      const groupAnswered = group.questions.filter((question) => seniorHighQuestionAnswered(question, answers)).length;
      const answerGroup = (key: string, value: string) => onAnswer(key, value, groupKey);
      return <article className={`senior-high-v2-group ${section.layout}${hasStimulusQuestions ? " with-stimulus-questions" : ""}`} key={group.id}>
        {group.title ? <h3>{group.title}</h3> : null}
        {group.instructions.length > 0 ? <BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={group.instructions} kind={data.kind} onAnswer={answerGroup} /> : null}
        <div className="senior-high-v2-group-body">
          {group.stimulusBlocks.length > 0 ? <div className="senior-high-v2-stimulus"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={group.stimulusBlocks} kind={data.kind} onAnswer={answerGroup} />{group.sharedOptions.length > 0 ? <div className="senior-high-v2-shared-options"><strong>共用选项</strong>{group.sharedOptions.map((option) => <p key={option.id}><b>{option.label}.</b> {plainText(option.blocks)}</p>)}</div> : null}</div> : null}
          <div className="senior-high-v2-question-column">
            {standaloneQuestions.map((question) => <QuestionCard answers={answers} assets={assets} bindings={bindings} key={question.id} kind={data.kind} onAnswer={answerGroup} question={question} submitted={groupSubmitted} />)}
            {hasStimulusQuestions ? <div className="senior-high-v2-group-submit"><span>{groupAnswered}/{group.questions.length} 已作答</span><button onClick={() => setSubmittedGroups((current) => ({ ...current, [groupKey]: true }))} type="button">{groupSubmitted ? "重新提交本篇" : "提交本篇"}</button></div> : null}
            {groupSubmitted && inlineQuestions.length > 0 ? <div className="senior-high-v2-inline-results">{inlineQuestions.map((question) => <QuestionCard answers={answers} assets={assets} bindings={bindings} key={question.id} kind={data.kind} onAnswer={answerGroup} question={question} submitted />)}</div> : null}
          </div>
        </div>
      </article>;
    })}</div></section>)}</div>
    <footer className="senior-high-v2-submit-bar"><nav aria-label="题号导航">{questions.map((question) => { const groupKey = questionGroupKeys.get(question.id); const grade = submitted || (groupKey && submittedGroups[groupKey]) ? gradeSeniorHighQuestion(question, answers) : null; return <button className={grade || (seniorHighQuestionAnswered(question, answers) ? "answered" : "")} key={question.id} onClick={() => document.getElementById(question.id)?.scrollIntoView({ behavior: "smooth", block: "center" })} type="button">{displayNumber(question, data.kind)}</button>; })}</nav><button className="senior-high-submit" onClick={() => setSubmitted(true)} type="button">{submitted ? "重新提交全部" : "提交全部答案"}</button></footer>
  </section>;
}
