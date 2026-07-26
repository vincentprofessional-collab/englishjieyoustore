"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useRef, useState } from "react";
import {
  TASK2_MODEL_ESSAYS,
  TASK2_TYPE_LABELS,
  TASK2_TYPE_ORDER,
  type Task2ModelEssay,
} from "@/data/writing/task2-model-essays";

type Task2FoldProps = {
  children: ReactNode;
  onToggle: () => void;
  summary: ReactNode;
  variant?: "essay" | "module";
};

function countWords(paragraphs: string[]) {
  return paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function Task2Fold({ children, onToggle, summary, variant = "module" }: Task2FoldProps) {
  return (
    <details className={`task2-fold ${variant}`} onToggle={onToggle}>
      <summary>{summary}</summary>
      <div className="task2-fold-body">{children}</div>
    </details>
  );
}

function Task2EssayCard({
  essay,
  index,
  isPracticeSubmitted,
  onPracticeSubmit,
  onToggle,
}: {
  essay: Task2ModelEssay;
  index: number;
  isPracticeSubmitted: boolean;
  onPracticeSubmit: () => void;
  onToggle: () => void;
}) {
  const typeLabel = TASK2_TYPE_LABELS[essay.taskType];
  const wordCount = countWords(essay.essay);

  return (
    <Task2Fold
      onToggle={onToggle}
      summary={
        <span className="task2-essay-summary">
          <span className="task2-essay-number">{String(index + 1).padStart(2, "0")}</span>
          <span>
            <strong>{essay.shortTitleCn}</strong>
            <small>
              {typeLabel.en} · {essay.categoryCn} · {wordCount} words
            </small>
          </span>
        </span>
      }
      variant="essay"
    >
      <article className="task2-essay-detail" id={essay.id}>
        <div className="task2-question-box">
          <span>QUESTION</span>
          <p>{essay.prompt}</p>
        </div>

        <div className="task2-stage-grid">
          <Task2Fold
            onToggle={onToggle}
            summary={
              <span className="task2-stage-title">
                <b>01</b> 审题
              </span>
            }
          >
            <div className="task2-analysis-grid">
              <article>
                <span>题型</span>
                <strong>{typeLabel.cn}</strong>
                <p>{typeLabel.en}</p>
              </article>
              <article>
                <span>核心问题</span>
                <strong>{essay.categoryCn}</strong>
                <p>{essay.thesisCn}</p>
              </article>
              <article>
                <span>推荐立场</span>
                <strong>{essay.positionCn}</strong>
              </article>
              <article>
                <span>材料来源</span>
                <strong>{essay.source}</strong>
              </article>
            </div>
          </Task2Fold>

          <Task2Fold
            onToggle={onToggle}
            summary={
              <span className="task2-stage-title">
                <b>02</b> 规划段落
              </span>
            }
          >
            <div className="task2-plan-list">
              {essay.paragraphPlan.map((paragraph) => (
                <article key={`${essay.id}-${paragraph.heading}`}>
                  <div>
                    <span>{paragraph.heading}</span>
                    <strong>{paragraph.role}</strong>
                  </div>
                  <ul>
                    {paragraph.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Task2Fold>

          <Task2Fold
            onToggle={onToggle}
            summary={
              <span className="task2-stage-title">
                <b>03</b> 逻辑梳理 → 展开话题 → 组织语言
              </span>
            }
          >
            <div className="task2-logic-list">
              {essay.logicSteps.map((step) => (
                <article key={`${essay.id}-${step.label}`}>
                  <span>{step.label}</span>
                  <p>{step.contentCn}</p>
                  <strong>{step.languageFocus}</strong>
                </article>
              ))}
            </div>

            <div className="task2-vocabulary-panel">
              <h3>重点词汇与短语</h3>
              <div className="task2-vocabulary-grid">
                {essay.vocabulary.map((item) => (
                  <article key={`${essay.id}-${item.term}`}>
                    <strong>{item.term}</strong>
                    <span>{item.meaningCn}</span>
                    <small>{item.useCase}</small>
                  </article>
                ))}
              </div>
            </div>

            <div className="task2-tips-panel">
              <h3>作文 tips</h3>
              <ul>
                {essay.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </Task2Fold>

          <Task2Fold
            onToggle={onToggle}
            summary={
              <span className="task2-stage-title">
                <b>04</b> 完整范文
              </span>
            }
          >
            {essay.examinerNote ? <p className="task2-examiner-note">{essay.examinerNote}</p> : null}
            <div className="task2-model-answer-text">
              {essay.essay.map((paragraph, paragraphIndex) => (
                <p key={`${essay.id}-paragraph-${paragraphIndex}`}>{paragraph}</p>
              ))}
            </div>
          </Task2Fold>
        </div>

        <div className="task2-practice-box">
          <div>
            <span>跟写练习</span>
            <strong>用同一立场和段落规划写一版自己的开头或主体段。</strong>
          </div>
          <label>
            <span>你的练习</span>
            <textarea placeholder="先写中文具化内容，再尝试组织英文句子。" />
          </label>
          <button type="button" onClick={onPracticeSubmit}>
            提交
          </button>
          {isPracticeSubmitted ? <p>AI修改模块正在开发中</p> : null}
        </div>
      </article>
    </Task2Fold>
  );
}

export function WritingTask2Library() {
  const rootRef = useRef<HTMLElement | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [submittedPracticeIds, setSubmittedPracticeIds] = useState<Set<string>>(() => new Set());

  const groupedEssays = useMemo(
    () =>
      TASK2_TYPE_ORDER.map((type) => ({
        essays: TASK2_MODEL_ESSAYS.filter((essay) => essay.taskType === type),
        type,
      })).filter((group) => group.essays.length > 0),
    [],
  );

  function syncAllOpen() {
    window.requestAnimationFrame(() => {
      const folds = Array.from(
        rootRef.current?.querySelectorAll<HTMLDetailsElement>("details.task2-fold") ?? [],
      );
      setAllOpen(folds.length > 0 && folds.every((fold) => fold.open));
    });
  }

  function toggleAllFolds() {
    const folds = Array.from(
      rootRef.current?.querySelectorAll<HTMLDetailsElement>("details.task2-fold") ?? [],
    );
    const nextOpen = !allOpen;

    folds.forEach((fold) => {
      fold.open = nextOpen;
    });
    setAllOpen(nextOpen);
  }

  function markPracticeSubmitted(id: string) {
    setSubmittedPracticeIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }

  return (
    <section className="stack writing-home-page writing-task2-page" ref={rootRef}>
      <div className="writing-hero-panel ielts-module-hero task2-hero-panel">
        <div className="writing-hero-copy">
          <span className="writing-kicker">IELTS WRITING TASK 2</span>
          <h1>大作文题目</h1>
          <p>按本地互动网页的学习形式整理：先审题，再规划段落，再看逻辑与语言，最后读完整范文。</p>
        </div>
      </div>

      <div className="task2-toolbar">
        <Link className="back-link" href="/writing">
          ← 返回雅思写作
        </Link>
        <button className="task2-expand-all" type="button" onClick={toggleAllFolds}>
          <span>{allOpen ? "−" : "＋"}</span>
          {allOpen ? "折叠全部" : "展开全部"}
        </button>
      </div>

      <div className="task2-source-strip">
        <strong>整理来源</strong>
        <span>《雅思大作文范文.docx》提供题目与范文；ideas、作文 tips、剑桥高分范文用于提炼审题、段落规划和写作提醒。</span>
      </div>

      <div className="task2-type-overview">
        {groupedEssays.map((group) => {
          const label = TASK2_TYPE_LABELS[group.type];

          return (
            <a href={`#task2-${group.type}`} key={group.type}>
              <span>{label.en}</span>
              <strong>{label.cn}</strong>
              <small>{group.essays.length} 篇</small>
            </a>
          );
        })}
      </div>

      {groupedEssays.map((group) => {
        const label = TASK2_TYPE_LABELS[group.type];

        return (
          <section className="task2-type-section" id={`task2-${group.type}`} key={group.type}>
            <header className="task2-type-head">
              <div>
                <span>{label.en}</span>
                <h2>{label.cn}</h2>
              </div>
              <p>所有教学内容默认折叠；展开后按照审题、规划、逻辑、范文四步学习。</p>
            </header>

            <div className="task2-essay-list">
              {group.essays.map((essay, index) => (
                <Task2EssayCard
                  essay={essay}
                  index={index}
                  isPracticeSubmitted={submittedPracticeIds.has(essay.id)}
                  key={essay.id}
                  onPracticeSubmit={() => markPracticeSubmitted(essay.id)}
                  onToggle={syncAllOpen}
                />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
