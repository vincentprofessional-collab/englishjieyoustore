"use client";

import Link from "next/link";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WritingQuestion } from "@/lib/ielts/writing";
import { WritingModelAnswer } from "@/components/writing-model-answer";
import { StudyAnnotationTools } from "@/components/study-annotation-tools";

type WritingWorkspaceProps = {
  mode: "mock" | "practice";
  questions: WritingQuestion[];
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function getWritingCountdownSeconds(mode: WritingWorkspaceProps["mode"], question?: WritingQuestion) {
  if (mode === "mock") {
    return 60 * 60;
  }

  return question?.task === "task1" ? 20 * 60 : 40 * 60;
}

export function WritingWorkspace({ mode, questions }: WritingWorkspaceProps) {
  const [activeId, setActiveId] = useState(questions[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [seconds, setSeconds] = useState(() => getWritingCountdownSeconds(mode, questions[0]));
  const [splitPercent, setSplitPercent] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isResizingRef = useRef(false);
  const pageRef = useRef<HTMLElement | null>(null);
  const splitRef = useRef<HTMLDivElement>(null);

  const activeQuestion = useMemo(
    () => questions.find((question) => question.id === activeId) ?? questions[0],
    [activeId, questions],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mode === "practice") {
      setSeconds(getWritingCountdownSeconds(mode, activeQuestion));
    }
  }, [activeQuestion, mode]);

  useEffect(() => {
    document.documentElement.classList.toggle("ielts-fullscreen-active", isFullscreen);

    return () => {
      document.documentElement.classList.remove("ielts-fullscreen-active");
    };
  }, [isFullscreen]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!activeQuestion) {
    return null;
  }

  const answer = answers[activeQuestion.id] ?? "";
  const wordCount = countWords(answer);
  const isUrgent = seconds <= 600;
  const isCritical = seconds <= 300;

  async function enterWritingFullscreen() {
    setIsFullscreen(true);

    if (!document.fullscreenElement && pageRef.current?.requestFullscreen) {
      try {
        await pageRef.current.requestFullscreen();
      } catch {
        // Keep the CSS fullscreen fallback if the browser blocks native fullscreen.
      }
    }
  }

  async function exitWritingFullscreen() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // CSS fullscreen fallback will still be cleared below.
      }
    }

    setIsFullscreen(false);
  }

  function toggleWritingFullscreen() {
    if (isFullscreen) {
      void exitWritingFullscreen();
      return;
    }

    void enterWritingFullscreen();
  }

  function updateSplitFromPointer(clientX: number) {
    const split = splitRef.current;
    if (!split) {
      return;
    }

    const bounds = split.getBoundingClientRect();
    const nextPercent = ((clientX - bounds.left) / bounds.width) * 100;
    setSplitPercent(Math.min(70, Math.max(30, nextPercent)));
  }

  function startSplitResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    isResizingRef.current = true;
    setIsResizing(true);
    updateSplitFromPointer(event.clientX);
  }

  function moveSplitResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (isResizingRef.current) {
      updateSplitFromPointer(event.clientX);
    }
  }

  function stopSplitResize(event: ReactPointerEvent<HTMLDivElement>) {
    isResizingRef.current = false;
    setIsResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function resizeSplitWithKeyboard(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    setSplitPercent((current) => {
      const next = current + (event.key === "ArrowLeft" ? -2 : 2);
      return Math.min(70, Math.max(30, next));
    });
  }

  return (
    <section
      className={`stack writing-practice-page writing-exam-page ${isFullscreen ? "fullscreen" : ""}`}
      ref={pageRef}
    >
      <div className={`writing-workspace-toolbar ${mode}`}>
        <Link href="/writing">← 返回</Link>
        {mode === "practice" ? (
          <div
            aria-label="雅思写作倒计时"
            className={`bbc-reading-timer ielts-practice-center-timer ${isUrgent ? "urgent" : ""} ${
              isCritical ? "critical" : ""
            }`}
            role="timer"
          >
            <span>{formatTime(seconds)}</span>
          </div>
        ) : (
          <div className="writing-workspace-mode">
            <span>MOCK TEST</span>
            <strong>完整模考</strong>
          </div>
        )}
        <div className="writing-toolbar-actions">
          {mode === "mock" ? (
            <div
              className={`ielts-exam-timer writing-timer ${isUrgent ? "urgent" : ""} ${
                isCritical ? "critical" : ""
              }`}
              aria-label="雅思写作倒计时"
              role="timer"
            >
              <strong>{formatTime(seconds)}</strong>
            </div>
          ) : null}
          <button
            className={`annotation-toggle ielts-exam-action ielts-fullscreen-toggle writing-fullscreen-toggle ${
              isFullscreen ? "active" : ""
            }`}
            type="button"
            onClick={toggleWritingFullscreen}
          >
            {isFullscreen ? "退出全屏" : "全屏"}
          </button>
          <StudyAnnotationTools
            sourceHref={`/writing/${mode === "mock" ? "mock" : `practice/${activeQuestion.id}`}`}
            sourceId={`writing:${mode}:${activeQuestion.id}`}
            sourceTitle={`writing ${activeQuestion.title}`}
            surfaceRef={pageRef}
          />
        </div>
      </div>

      <div className="writing-exam-panel">
        <div className="writing-exam-instruction">
          <strong>{activeQuestion.task === "task1" ? "Part 1" : "Part 2"}</strong>
          <span>
            You should spend about {activeQuestion.task === "task1" ? "20" : "40"} minutes on this task. Write at least {activeQuestion.wordTarget} words.
          </span>
        </div>

        <div
          className={`writing-exam-split ${isResizing ? "resizing" : ""}`}
          ref={splitRef}
          style={{ "--writing-question-width": `${splitPercent}%` } as CSSProperties}
        >
          <div
            className="writing-split-handle"
            role="separator"
            aria-label="Resize question and answer panels"
            aria-orientation="vertical"
            aria-valuemin={30}
            aria-valuemax={70}
            aria-valuenow={Math.round(splitPercent)}
            tabIndex={0}
            onDoubleClick={() => setSplitPercent(50)}
            onKeyDown={resizeSplitWithKeyboard}
            onPointerCancel={stopSplitResize}
            onPointerDown={startSplitResize}
            onPointerMove={moveSplitResize}
            onPointerUp={stopSplitResize}
          >
            ↔
          </div>
          <div className="writing-question-pane">
            <h1>{activeQuestion.title}</h1>
            <p>{activeQuestion.prompt}</p>
            {activeQuestion.image ? (
              <div className="writing-question-image-frame">
                <img src={activeQuestion.image} alt={`${activeQuestion.title} 题图`} />
              </div>
            ) : null}
          </div>

          <div className="writing-response-pane">
            <label htmlFor="writing-answer">Your answer</label>
            <textarea
              id="writing-answer"
              value={answer}
              placeholder="Start writing here..."
              spellCheck
              onChange={(event) => {
                setAnswers((current) => ({
                  ...current,
                  [activeQuestion.id]: event.target.value,
                }));
                setIsCompleted(false);
              }}
            />
            <div className="writing-response-meta">
              <span className={wordCount >= activeQuestion.wordTarget ? "reached" : ""}>
                Words: {wordCount}
              </span>
            </div>
          </div>
        </div>

        <div className={`writing-exam-footer ${questions.length === 1 ? "single-task" : ""}`}>
          {questions.length > 1 ? (
            <div className="writing-bottom-part-switcher" aria-label="写作任务切换">
              {questions.map((question) => (
                <button
                  className={question.id === activeQuestion.id ? "active" : ""}
                  type="button"
                  key={question.id}
                  onClick={() => {
                    setActiveId(question.id);
                    setIsCompleted(false);
                  }}
                >
                  {question.task === "task1" ? "Part 1" : "Part 2"}
                </button>
              ))}
            </div>
          ) : null}
          <button
            className={`writing-complete-button ${isCompleted ? "completed" : ""}`}
            type="button"
            aria-label="完成本次写作"
            title="完成本次写作"
            onClick={() => {
              setIsCompleted(true);
              if (isFullscreen) {
                void exitWritingFullscreen();
              }
            }}
          >
            ✓
          </button>
        </div>
      </div>

      {isCompleted ? (
        <div className="writing-after-practice-panel">
          <div className="writing-after-practice-grid">
            <article>
              <strong>查看范文</strong>
              <p>对照自己的结构、概括重点与论证顺序。</p>
              <span>内容入口已预留</span>
            </article>
            <article>
              <strong>整理表达</strong>
              <p>把能够借鉴的词汇和句型收入个人素材本。</p>
              <span>收藏入口已预留</span>
            </article>
            <article>
              <strong>提交反馈</strong>
              <p>后续可接入批改、评分与逐段反馈。</p>
              <span>批改入口已预留</span>
            </article>
          </div>
          <WritingModelAnswer question={activeQuestion} />
        </div>
      ) : null}
    </section>
  );
}
