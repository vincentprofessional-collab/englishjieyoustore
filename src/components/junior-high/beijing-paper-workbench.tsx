"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { StudyAnnotationTools } from "@/components/study-annotation-tools";
import beijing2024Paper from "@/lib/junior-high/beijing-2024-simulation.json";
import type { JuniorHighBlock, JuniorHighBook, JuniorHighPaper, JuniorHighQuestion, JuniorHighQuestionGroup, JuniorHighPart } from "@/lib/junior-high/paper-types";

const defaultPaper = beijing2024Paper as unknown as JuniorHighPaper;
type PaperQuestion = JuniorHighQuestion;
type BookCard = JuniorHighBook;

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function PaperTimer({ running, seconds, onToggle }: { running: boolean; seconds: number; onToggle: () => void }) {
  const negative = seconds < 0;
  const absolute = Math.abs(seconds);
  const text = `${negative ? "-" : ""}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
  return <button aria-label="中考英语模拟卷计时器" className={`junior-high-timer ${negative ? "is-over" : ""}`} onClick={onToggle} type="button">{text} · {running ? "暂停" : "开始"}</button>;
}

function QuestionNavigation({ paper, current, onSelect }: { paper: JuniorHighPaper; current: number; onSelect: (index: number) => void }) {
  return <nav aria-label="试卷题号导航" className="junior-high-paper-nav">{paper.questions.map((question, index) => <button className={current === index ? "selected" : ""} key={question.id} onClick={() => onSelect(index)} type="button"><span>{question.displayNumber ?? question.number}</span>{question.sectionId ? <small>{question.sectionId.replace("section-", "")}</small> : null}</button>)}</nav>;
}

function renderContext(text: string): ReactNode {
  return text.split(/(?<!\d)(13|14|15|16|17|18|19|20)(?!\d)/g).map((part, index) => {
    if (/^(13|14|15|16|17|18|19|20)$/.test(part)) {
      return <span className="junior-high-inline-blank" key={`${part}-${index}`}>{part}</span>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderInlineBlanks(text: string): ReactNode {
  return text.split(/(_{2,}\s*\d{0,3}\s*_{2,}|[A-Za-z]\s{2,}\d{1,3}\b)/g).map((part, index) => {
    if (!part) return null;
    const clue = part.match(/^([A-Za-z])\s{2,}(\d{1,3})$/);
    if (clue) {
      return <span key={`${part}-${index}`}><span>{clue[1]}</span><span className="junior-high-inline-blank">{clue[2]}</span></span>;
    }
    if (/_{2,}/.test(part)) {
      const blankClassName = part.replace(/_/g, "").trim().length >= 8 ? "junior-high-inline-blank junior-high-inline-blank-wide" : "junior-high-inline-blank";
      return <span className={blankClassName} key={`${part}-${index}`}>{part.replace(/_/g, "").trim() || " "}</span>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

const QUESTION_BLANK_PATTERN = /_{2,}\s*\d{0,3}\s*_{2,}|_{2,}\s*\d{1,3}\s*_{2,}|\s{2,}\d{1,3}\s{2,}/g;

function renderQuestionPrompt(text: string, value: string, onAnswer: (value: string) => void): ReactNode {
  const parts = text.split(QUESTION_BLANK_PATTERN);
  const blanks = text.match(QUESTION_BLANK_PATTERN) ?? [];
  if (!blanks.length) return text;
  return parts.flatMap((part, index) => [
    <span key={`prompt-${index}`}>{part}</span>,
    index < blanks.length ? <input aria-label="填空答案" className="junior-high-inline-answer" key={`blank-${index}`} onChange={(event) => onAnswer(event.target.value)} value={value} /> : null,
  ]);
}

function compactBlankPrompt(text: string): string {
  const marker = text.search(/_{2,}/);
  if (marker < 0 || text.length <= 180) return text;
  const start = Math.max(0, marker - 78);
  const end = Math.min(text.length, marker + 100);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function PaperQuestionCard({ question, value, submitted, onAnswer, cloze }: { question: PaperQuestion; value: string; submitted: boolean; onAnswer: (value: string) => void; cloze?: boolean }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const isOpenResponse = question.inputKind === "blank" || question.inputKind === "text" || question.inputKind === "writing" || (!question.inputKind && !question.options.length);
  const isCorrect = !isOpenResponse && value === question.answer;
  return (
    <article className={`junior-high-question-card ${cloze ? "junior-high-cloze-question" : ""}`} data-question-number={question.number} id={`junior-high-question-${question.id}`}>
      <div className="junior-high-question-heading"><strong>第 {question.displayNumber ?? question.number} 题</strong></div>
      {question.image ? <img alt="题目配图" className="junior-high-question-image" src={question.image} /> : null}{cloze && question.options.length ? null : <p className="junior-high-question-prompt">{question.inputKind === "blank" ? renderQuestionPrompt(compactBlankPrompt(question.prompt), value, onAnswer) : question.prompt}</p>}
      {isOpenResponse && !(question.inputKind === "blank" && Boolean(question.prompt.match(QUESTION_BLANK_PATTERN))) ? <textarea value={value} onChange={(event) => onAnswer(event.target.value)} placeholder="请输入答案……" rows={question.number === 37 ? 4 : 2} /> : isOpenResponse ? null : <div className="junior-high-options">{question.options.map((option) => <button className={value === option[0] ? "selected" : ""} key={option} onClick={() => onAnswer(option[0])} type="button">{option}</button>)}</div>}
      {submitted ? <div className="junior-high-feedback"><span>你的答案：{value || "未作答"}</span><span>{isOpenResponse ? "参考答案" : "正确答案"}：{question.answer || "—"}</span><span className={isOpenResponse ? "manual" : isCorrect ? "correct" : "incorrect"}>{isOpenResponse ? "人工复核" : isCorrect ? "✓ 正确" : "✕ 请查看解析"}</span><button onClick={() => setShowAnalysis(!showAnalysis)} type="button">解析</button>{showAnalysis ? <div className="junior-high-analysis"><strong>解析</strong><button onClick={() => setShowAnalysis(false)} type="button">关闭</button><p>{question.analysis || "原解析文件未提供本题的独立解析。"}</p></div> : null}</div> : null}
    </article>
  );
}

function BookTable({ books }: { books: BookCard[] }) {
  return <div className="junior-high-book-table" aria-label="阅读理解 A 课程或书籍介绍">{books.map((book: BookCard) => <article className="junior-high-book-card" key={book.letter}><div className="junior-high-book-letter">{book.letter}</div>{book.image ? <img alt={`${book.title} 配图`} src={book.image} /> : null}<div className="junior-high-book-copy"><h3>{book.title}</h3>{book.author || book.site ? <p className="junior-high-book-meta">{book.author}{book.author && book.site ? <br /> : null}{book.site}</p> : null}{book.format || book.price ? <p className="junior-high-book-meta">{book.format}{book.format && book.price ? <br /> : null}{book.price}</p> : null}<p>{book.description}</p></div></article>)}</div>;
}

function PassageGroup({ title, context, questions, answers, submitted, onAnswer, variant = "text", image, books }: { title: string; context: string; questions: PaperQuestion[]; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void; variant?: "text" | "cloze" | "readingA" | "readingResponse"; image?: string | string[]; books?: BookCard[] }) {
  const images = image ? (Array.isArray(image) ? image : [image]) : [];
  return <section className="junior-high-passage-layout"><div className="junior-high-passage-column"><h3>{title}</h3>{variant === "readingA" ? <><>{images.map((src) => <img alt={`${title} 原文配图`} className="junior-high-context-image" key={src} src={src} />)}</><BookTable books={books ?? []} /></> : <><>{images.map((src) => <img alt={`${title} 原文配图`} className="junior-high-context-image" key={src} src={src} />)}</><div className="junior-high-passage-text">{variant === "cloze" ? renderContext(context) : context}</div></>}{variant === "cloze" ? <p className="junior-high-passage-note">文中题号后的虚线为填空位置，请结合上下文选择答案。</p> : null}</div><div className="junior-high-passage-questions">{questions.map((question) => <PaperQuestionCard cloze={variant === "cloze"} key={question.id} onAnswer={(value) => onAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div></section>;
}

function WritingTask({ label, prompt, requirements, opening, closing, value, onChange, children }: { label: string; prompt: string; requirements: string; opening?: string; closing?: string; value: string; onChange: (value: string) => void; children?: ReactNode }) {
  const wordCount = countWords(value);
  return <section className="junior-high-writing-task"><h3>{label}</h3><p className="junior-high-writing-prompt">{prompt}</p>{children}<p className="junior-high-writing-requirements">{requirements}</p>{opening ? <p className="junior-high-writing-opening">{opening}</p> : null}<textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="请在此处完成作文……" rows={9} /><div className="junior-high-writing-word-count">字数：{wordCount}</div>{closing ? <p className="junior-high-writing-closing">{closing}</p> : null}</section>;
}

function GenericPaperContent({ paper, answers, submitted, onAnswer, writingA, writingB, onWritingA, onWritingB }: { paper: JuniorHighPaper; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void; writingA: string; writingB: string; onWritingA: (value: string) => void; onWritingB: (value: string) => void }) {
  return <>
    <section className="junior-high-paper-section"><h2>原卷内容</h2><div className="junior-high-generic-source">{paper.assets?.audio?.length ? <div className="junior-high-audio-list"><strong>听力音频</strong>{paper.assets.audio.map((src, index) => <label key={src}>音频 {index + 1}<audio controls preload="metadata" src={src} /></label>)}</div> : null}{paper.assets?.all?.map((src) => <img alt="原卷配图" className="junior-high-context-image" key={src} src={src} />)}<p>该试卷正在转换为结构化版式，请稍后查看分节内容。</p></div></section>
    <section className="junior-high-paper-section"><h2>题目</h2><div className="junior-high-question-stack">{paper.questions.map((question) => <PaperQuestionCard key={question.id} onAnswer={(value) => onAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div></section>
    <section className="junior-high-paper-section"><h2>{paper.writing.title ?? "写作"}</h2><div className="junior-high-paper-writing"><WritingTask label="A." prompt={paper.writing.promptA} requirements={paper.writing.requirementsA} value={writingA} onChange={onWritingA} /><WritingTask label="B." prompt={paper.writing.promptB} requirements={paper.writing.requirementsB} value={writingB} onChange={onWritingB} />{submitted ? <div className="junior-high-feedback"><span>作文：已提交</span><span className="manual">人工评分</span></div> : null}</div></section>
  </>;
}

function renderStructuredBlock(block: JuniorHighBlock, section: { title: string }): ReactNode {
  if (block.kind === "paragraph") {
    if (!block.text || block.text === section.title) return null;
    return <p className="junior-high-source-paragraph">{renderInlineBlanks(block.text)}</p>;
  }
  if (block.kind === "image" && block.src) {
    return <img alt={block.alt ?? `${section.title} 原卷图片`} className="junior-high-source-image" src={block.src} />;
  }
  if (block.kind === "audio" && block.src) {
    return <audio className="junior-high-source-audio" controls preload="metadata" src={block.src} />;
  }
  if (block.kind === "table" && block.rows?.length) {
    return <div className="junior-high-source-table-wrap"><table className="junior-high-source-table"><tbody>{block.rows.map((row, rowIndex) => <tr key={`${block.id}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${block.id}-${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
  }
  return null;
}

function isStructuredReadingSection(title: string) {
  return /阅读理解|阅读表达|任务型阅读|完形填空|部分\s*阅读|^阅读下面|请通读下面|根据短文内容|根据材料内容|语法和上下文/.test(title);
}

function StructuredPaperContent({ paper, answers, submitted, onAnswer, writingA, writingB, onWritingA, onWritingB }: { paper: JuniorHighPaper; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void; writingA: string; writingB: string; onWritingA: (value: string) => void; onWritingB: (value: string) => void }) {
  const parts = paper.parts ?? [];
  const sections = paper.sections ?? [];
  const questionsById = new Map(paper.questions.map((question) => [question.id, question]));
  const writingTasks = paper.writingTasks?.length ? paper.writingTasks : [{ id: "writing-1", label: "写作", prompt: paper.writing.promptA, requirements: paper.writing.requirementsA }];
  return <>
    {(parts.length ? parts : sections.map((section) => ({ id: section.id, title: section.title, instructions: section.instructions, groups: [{ id: `${section.id}-group-1`, title: section.title, instructions: section.instructions, blocks: section.blocks, displayBlocks: section.displayBlocks, questionIds: section.questionIds }] } as JuniorHighPart))).map((part) => <section className="junior-high-paper-section junior-high-structured-part" key={part.id}>
      <h2>{part.title}</h2>
      {part.instructions.filter((instruction) => instruction.trim() !== part.title.trim()).slice(0, 2).map((instruction) => <p className="junior-high-paper-intro" key={`${part.id}-${instruction}`}>{instruction}</p>)}
      {part.groups.map((group: JuniorHighQuestionGroup) => {
        const groupQuestions = group.questionIds.map((id) => questionsById.get(id)).filter((question): question is PaperQuestion => Boolean(question));
        const displayBlocks = group.displayBlocks ?? group.blocks;
        const readingTitle = `${part.title} ${group.title}`;
        const useReadingLayout = isStructuredReadingSection(readingTitle) && groupQuestions.length > 0 && displayBlocks.length > 0;
        const groupInstructionSet = new Set(group.instructions.map((instruction) => instruction.trim()));
        const visibleBlocks = displayBlocks.filter((block) => block.kind !== "paragraph" || (!groupInstructionSet.has((block.text ?? "").trim()) && (block.text ?? "").trim() !== part.title.trim()));
        const sourceBlocks = <div className="junior-high-structured-blocks">{visibleBlocks.map((block) => <div className="junior-high-structured-block" key={block.id}>{renderStructuredBlock(block, group)}</div>)}</div>;
        const questionBlocks = <div className="junior-high-question-stack">{groupQuestions.map((question) => <PaperQuestionCard cloze={group.inputMode === "inline-blank"} key={question.id} onAnswer={(value) => onAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div>;
        return <section className="junior-high-question-group" key={group.id}>
          <h3>{group.title}</h3>
          {group.instructions.filter((instruction) => instruction.trim() !== group.title.trim() && instruction.trim() !== part.title.trim()).slice(0, 2).map((instruction) => <p className="junior-high-paper-intro" key={`${group.id}-${instruction}`}>{instruction}</p>)}
          {group.audio?.map((src, index) => <label className="junior-high-inline-audio" key={src}>听力音频 {index + 1}<audio controls preload="metadata" src={src} /></label>)}
          {useReadingLayout ? <div className="junior-high-passage-layout junior-high-structured-reading-layout"><div className="junior-high-passage-column">{sourceBlocks}</div><div className="junior-high-passage-questions">{questionBlocks}</div></div> : <>{sourceBlocks}{groupQuestions.length ? questionBlocks : null}</>}
        </section>;
      })}
    </section>)}
    <section className="junior-high-paper-section"><h2>{paper.writing.title ?? "写作"}</h2><div className="junior-high-paper-writing">{writingTasks.map((task, index) => {
      const value = index === 0 ? writingA : writingB;
      const onChange = index === 0 ? onWritingA : onWritingB;
      return <WritingTask key={task.id} label={task.label} prompt={task.prompt} requirements={task.requirements} value={value} onChange={onChange}>{task.table?.length ? <table className="junior-high-writing-table"><tbody>{task.table.map((row, rowIndex) => <tr key={`${task.id}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${task.id}-${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table> : null}{task.image ? <img alt={`${task.label} 写作配图`} className="junior-high-writing-diagram" src={task.image} /> : null}</WritingTask>;
    })}{submitted ? <div className="junior-high-feedback"><span>作文：已提交</span><span className="manual">人工评分</span></div> : null}</div></section>
  </>;
}

export function JuniorHighPaperWorkbench({ paper, onBack, autoStart = true, timerMode = "countdown" }: { paper: JuniorHighPaper; onBack: () => void; autoStart?: boolean; timerMode?: "countdown" | "stopwatch" }) {
  const [running, setRunning] = useState(autoStart);
  const [seconds, setSeconds] = useState(autoStart ? paper.durationMinutes * 60 : 0);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [writingA, setWritingA] = useState("");
  const [writingB, setWritingB] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => timerMode === "countdown" ? value - 1 : value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running, timerMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("ielts-fullscreen-active", isFullscreen);
    return () => document.documentElement.classList.remove("ielts-fullscreen-active");
  }, [isFullscreen]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) setIsFullscreen(false);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function selectQuestion(index: number) {
    setCurrent(index);
    document.getElementById(`junior-high-question-${paper.questions[index].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function toggleFullscreen() {
    if (isFullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setIsFullscreen(false);
      return;
    }
    setIsFullscreen(true);
    if (!document.fullscreenElement && pageRef.current?.requestFullscreen) await pageRef.current.requestFullscreen().catch(() => undefined);
  }

  const beijingRange = (from: number, to: number) => paper.questions.filter((question) => question.number >= from && question.number <= to);
  const handleAnswer = (question: PaperQuestion, value: string) => setAnswers((previous) => ({ ...previous, [question.id]: value }));

  return <section className={`stack junior-high-page junior-high-exam-page ${isFullscreen ? "fullscreen" : ""}`} data-local-selection-actions="true" ref={pageRef}>
    <div className="junior-high-exam-toolbar"><button className="junior-high-back" onClick={onBack} type="button">← 返回选择</button><div className="junior-high-exam-toolbar-title"><strong>{paper.displayTitle ?? `中考英语 ${paper.year}年${paper.region}${paper.label}`}</strong></div><PaperTimer onToggle={() => setRunning(!running)} running={running} seconds={seconds} /><div className="junior-high-toolbar-actions"><button className={`annotation-toggle ielts-exam-action ielts-fullscreen-toggle ${isFullscreen ? "active" : ""}`} onClick={() => void toggleFullscreen()} type="button">{isFullscreen ? "退出全屏" : "全屏"}</button><StudyAnnotationTools buttonClassName="annotation-toggle ielts-exam-action" sourceHref="/junior-high" sourceId={`junior-high:${paper.year}-${paper.region}-${paper.label}`} sourceTitle={paper.fileName} surfaceRef={pageRef} /></div></div>
    <QuestionNavigation paper={paper} current={current} onSelect={selectQuestion} />
    <div className="junior-high-paper-content">
      {paper.layout === "generic" ? <GenericPaperContent answers={answers} onAnswer={handleAnswer} onWritingA={setWritingA} onWritingB={setWritingB} paper={paper} submitted={submitted} writingA={writingA} writingB={writingB} /> : paper.layout === "structured" ? <StructuredPaperContent answers={answers} onAnswer={handleAnswer} onWritingA={setWritingA} onWritingB={setWritingB} paper={paper} submitted={submitted} writingA={writingA} writingB={writingB} /> : <>
      <section className="junior-high-paper-section"><h2>第一部分</h2><p className="junior-high-paper-intro">本部分共33题，共40分。在每题列出的四个选项中，选出最符合题目要求的一项。</p><h3 className="junior-high-section-subtitle">一、单项填空（每题0. 5分，共6分）</h3><p className="junior-high-paper-intro">从下面各题所给的A、B、C、D四个选项中，选择可以填入空白处的最佳选项。</p><div className="junior-high-question-stack">{beijingRange(1, 12).map((question) => <PaperQuestionCard key={question.id} onAnswer={(value) => handleAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div></section>
      <section className="junior-high-paper-section"><h2>二、完形填空（每题1分，共8分）</h2><p className="junior-high-paper-intro">阅读下面的短文，掌握其大意，然后从短文后各题所给的A、B、C、D四个选项中，选择最佳选项。</p><PassageGroup context={paper.questions.find((question) => question.number === 13)?.context ?? ""} image={paper.assets?.cloze} questions={beijingRange(13, 20)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="完形填空原文" variant="cloze" /></section>
      <section className="junior-high-paper-section"><h2>三、阅读理解（每题2分，共26分）</h2><p className="junior-high-paper-intro">阅读下列短文或课程介绍，根据题目要求选择最佳选项。</p><p className="junior-high-paper-intro junior-high-paper-intro-muted">{paper.readingA.instructions}</p><PassageGroup books={paper.readingA.books} context={paper.questions.find((question) => question.number === 21)?.context ?? ""} image={paper.assets?.readingA} questions={beijingRange(21, 23)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · A" variant="readingA" /><PassageGroup context={paper.questions.find((question) => question.number === 24)?.context ?? ""} image={paper.assets?.readingB} questions={beijingRange(24, 26)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · B" /><PassageGroup context={paper.questions.find((question) => question.number === 27)?.context ?? ""} image={paper.assets?.readingC} questions={beijingRange(27, 29)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · C" /><PassageGroup context={paper.questions.find((question) => question.number === 30)?.context ?? ""} image={paper.assets?.readingD} questions={beijingRange(30, 33)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · D" /></section>
      <section className="junior-high-paper-section junior-high-reading-response-section"><h2>第二部分</h2><p className="junior-high-paper-intro">本部分共5题，共20分。根据题目要求，完成相应任务。</p><h3 className="junior-high-section-subtitle">四、阅读表达（第34—36题每题2分，第37题4分，共10分）</h3><p className="junior-high-paper-intro">阅读短文，根据短文内容回答问题。</p><PassageGroup context={paper.questions.find((question) => question.number === 34)?.context ?? ""} image={paper.assets?.readingResponse} questions={beijingRange(34, 37)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读表达原文" variant="readingResponse" /></section>
      <section className="junior-high-paper-section"><h2>{paper.writing.title ?? "五、文段表达（10分）"}</h2><div className="junior-high-paper-writing"><WritingTask label="A." closing={paper.writing.closingA} opening={paper.writing.openingA} prompt={paper.writing.promptA} requirements={paper.writing.requirementsA} value={writingA} onChange={setWritingA}>{paper.writing.tableA?.length ? <table className="junior-high-writing-table"><tbody>{paper.writing.tableA.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table> : null}</WritingTask><WritingTask label="B." closing={paper.writing.closingB} opening={paper.writing.openingB} prompt={paper.writing.promptB} requirements={`${paper.writing.contentPointsB ? `${paper.writing.contentPointsB}\n` : ""}${paper.writing.requirementsB}`} value={writingB} onChange={setWritingB}>{paper.writing.diagram ? <img alt="写作任务图示" className="junior-high-writing-diagram" src={paper.writing.diagram} /> : null}</WritingTask>{submitted ? <div className="junior-high-feedback"><span>作文：已提交</span><span className="manual">人工评分</span></div> : null}</div></section>
      </>}
    </div>
    <QuestionNavigation paper={paper} current={current} onSelect={selectQuestion} />
    <footer><span>{submitted ? `已提交 ${paper.questions.length} 道题` : `共 ${paper.questions.length} 道题 · 文段表达 2 题`}</span><button className="junior-high-submit" onClick={() => { setSubmitted(true); setRunning(false); }} type="button">提交答卷</button></footer>
  </section>;
}

export function BeijingPaperWorkbench({ onBack }: { onBack: () => void }) {
  return <JuniorHighPaperWorkbench onBack={onBack} paper={defaultPaper} />;
}
