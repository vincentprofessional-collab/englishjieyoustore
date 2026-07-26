"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  TASK2_MODEL_ESSAYS,
  TASK2_TYPE_LABELS,
  TASK2_TYPE_ORDER,
  type Task2ModelEssay,
  type Task2VocabularyItem,
} from "@/data/writing/task2-model-essays";

type Task2FoldProps = {
  children: ReactNode;
  summary: ReactNode;
  variant?: "essay" | "module";
};

const CONNECTOR_EXPRESSIONS: Task2VocabularyItem[] = [
  { term: "however", meaningCn: "然而；用于转折", useCase: "转折连接" },
  { term: "therefore", meaningCn: "因此；推出结果", useCase: "结果连接" },
  { term: "as a result", meaningCn: "结果是", useCase: "因果连接" },
  { term: "in other words", meaningCn: "换句话说", useCase: "解释说明" },
  { term: "for instance", meaningCn: "例如", useCase: "举例展开" },
  { term: "to illustrate", meaningCn: "举例来说", useCase: "举例展开" },
  { term: "in conclusion", meaningCn: "总之", useCase: "结尾收束" },
  { term: "on the other hand", meaningCn: "另一方面", useCase: "对比论证" },
  { term: "firstly", meaningCn: "首先", useCase: "分点展开" },
  { term: "secondly", meaningCn: "其次", useCase: "分点展开" },
];

function countWords(paragraphs: string[]) {
  return paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function formatNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

function Task2Fold({ children, summary, variant = "module" }: Task2FoldProps) {
  return (
    <details className={`task2-fold ${variant}`}>
      <summary>{summary}</summary>
      <div className="task2-fold-body">{children}</div>
    </details>
  );
}

function splitIntoSentences(paragraph: string) {
  const matches = paragraph.match(/[^.!?]+[.!?]+(?:["”’])?/g);

  if (!matches) {
    return paragraph.trim() ? [paragraph.trim()] : [];
  }

  return matches.map((sentence) => sentence.trim());
}

function getChineseCue(essay: Task2ModelEssay, paragraphIndex: number, sentenceIndex: number) {
  const paragraphPlan = essay.paragraphPlan[paragraphIndex];
  const point = paragraphPlan?.points[sentenceIndex] ?? paragraphPlan?.points.at(-1);
  const sentenceRoles = ["主题句", "解释句", "例证句", "延伸句", "收束句"];

  if (!paragraphPlan) {
    return `总结全文：${essay.positionCn}`;
  }

  if (paragraphIndex === 0 && sentenceIndex === 0) {
    return `背景句：${point ?? essay.thesisCn}`;
  }

  if (paragraphIndex === 0) {
    return `立场句：${essay.positionCn}`;
  }

  return `${sentenceRoles[sentenceIndex] ?? "补充句"}：围绕“${paragraphPlan.role}”展开，重点写清楚“${point ?? essay.thesisCn}”。`;
}

function getSentenceVocabulary(sentence: string, essay: Task2ModelEssay, paragraphIndex: number, sentenceIndex: number) {
  const lowerSentence = sentence.toLowerCase();
  const matchedTopicVocabulary = essay.vocabulary.filter((item) =>
    lowerSentence.includes(item.term.toLowerCase()),
  );
  const matchedConnectors = CONNECTOR_EXPRESSIONS.filter((item) =>
    lowerSentence.includes(item.term.toLowerCase()),
  );
  const matched = [...matchedTopicVocabulary, ...matchedConnectors];

  if (matched.length > 0) {
    return matched.slice(0, 3);
  }

  const fallback = essay.vocabulary[(paragraphIndex + sentenceIndex) % essay.vocabulary.length];
  return fallback ? [fallback] : [];
}

function Task2StageTitle({ index, title }: { index: string; title: string }) {
  return (
    <span className="task2-stage-title">
      <b>{index}</b> {title}
    </span>
  );
}

export function WritingTask2Library() {
  const groupedEssays = useMemo(
    () =>
      TASK2_TYPE_ORDER.map((type) => ({
        essays: TASK2_MODEL_ESSAYS.filter((essay) => essay.taskType === type),
        type,
      })).filter((group) => group.essays.length > 0),
    [],
  );

  return (
    <section className="stack writing-home-page writing-task2-page task2-index-page">
      <div className="task2-backbar">
        <Link className="back-link" href="/writing">
          ← 返回雅思写作
        </Link>
      </div>

      <nav className="task2-type-menu" aria-label="Task 2 essay types">
        {groupedEssays.map((group, index) => {
          const label = TASK2_TYPE_LABELS[group.type];

          return (
            <a className="task2-type-menu-card" href={`#task2-${group.type}`} key={group.type}>
              <span className="task2-type-menu-index">{formatNumber(index)}</span>
              <strong>
                <b>{label.en}</b>
                <em>{label.cn}</em>
              </strong>
              <small>{group.essays.length}</small>
              <i aria-hidden="true">›</i>
            </a>
          );
        })}
      </nav>

      {groupedEssays.map((group) => {
        const label = TASK2_TYPE_LABELS[group.type];

        return (
          <section className="task2-type-section" id={`task2-${group.type}`} key={group.type}>
            <header className="task2-type-head task2-type-head-simple">
              <div>
                <span>{label.en}</span>
                <h2>{label.cn}</h2>
              </div>
            </header>

            <div className="task2-topic-list">
              {group.essays.map((essay, index) => (
                <Link className="task2-topic-link" href={`/writing/task2/${essay.id}`} key={essay.id}>
                  <span className="task2-essay-number">{formatNumber(index)}</span>
                  <span>
                    <strong>{essay.shortTitleCn}</strong>
                    <small>
                      {label.en} · {essay.categoryCn} · {countWords(essay.essay)} words
                    </small>
                  </span>
                  <i aria-hidden="true">+</i>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

export function WritingTask2EssayDetail({ essay }: { essay: Task2ModelEssay }) {
  const [submittedSentenceIds, setSubmittedSentenceIds] = useState<Set<string>>(() => new Set());
  const typeLabel = TASK2_TYPE_LABELS[essay.taskType];
  const sentenceGroups = useMemo(() => essay.essay.map(splitIntoSentences), [essay.essay]);

  function submitSentence(event: FormEvent<HTMLFormElement>, sentenceId: string) {
    event.preventDefault();
    setSubmittedSentenceIds((current) => {
      const next = new Set(current);
      next.add(sentenceId);
      return next;
    });
  }

  return (
    <section className="stack writing-home-page writing-task2-page task2-detail-page">
      <div className="task2-backbar">
        <Link className="back-link" href="/writing/task2">
          ← 返回大作文题目
        </Link>
      </div>

      <article className="task2-detail-shell">
        <header className="task2-detail-head">
          <span className="task2-essay-number">01</span>
          <div>
            <h1>{essay.shortTitleCn}</h1>
            <p>
              {typeLabel.en} · {essay.categoryCn} · {countWords(essay.essay)} words
            </p>
          </div>
        </header>

        <div className="task2-question-box task2-question-box-open">
          <span>QUESTION</span>
          <p>{essay.prompt}</p>
        </div>

        <div className="task2-stage-grid">
          <Task2Fold summary={<Task2StageTitle index="01" title="审题" />}>
            <div className="task2-analysis-grid task2-analysis-grid-compact">
              <article>
                <span>核心问题</span>
                <strong>{essay.categoryCn}</strong>
                <p>{essay.thesisCn}</p>
              </article>
              <article>
                <span>推荐立场</span>
                <strong>{essay.positionCn}</strong>
              </article>
            </div>
          </Task2Fold>

          <Task2Fold summary={<Task2StageTitle index="02" title="规划段落" />}>
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

          <Task2Fold summary={<Task2StageTitle index="03" title="组织语言" />}>
            <div className="task2-sentence-practice-list">
              {sentenceGroups.map((sentences, paragraphIndex) => {
                const paragraphPlan = essay.paragraphPlan[paragraphIndex];

                return (
                  <section className="task2-paragraph-practice" key={`${essay.id}-paragraph-${paragraphIndex}`}>
                    <header>
                      <span>{paragraphPlan?.heading ?? "结尾"}</span>
                      <strong>{paragraphPlan?.role ?? "总结全文并重申立场"}</strong>
                    </header>

                    {sentences.map((sentence, sentenceIndex) => {
                      const sentenceId = `${essay.id}-${paragraphIndex}-${sentenceIndex}`;
                      const vocabulary = getSentenceVocabulary(sentence, essay, paragraphIndex, sentenceIndex);
                      const isSubmitted = submittedSentenceIds.has(sentenceId);

                      return (
                        <form
                          className="task2-sentence-card"
                          key={sentenceId}
                          onSubmit={(event) => submitSentence(event, sentenceId)}
                        >
                          <div className="task2-sentence-order">
                            P{paragraphIndex + 1} · Sentence {sentenceIndex + 1}
                          </div>

                          <div className="task2-sentence-cn">
                            <span>中文整理</span>
                            <p>{getChineseCue(essay, paragraphIndex, sentenceIndex)}</p>
                          </div>

                          <div className="task2-sentence-vocabulary">
                            <span>重点词汇与表达</span>
                            <div>
                              {vocabulary.map((item) => (
                                <article key={`${sentenceId}-${item.term}`}>
                                  <strong>{item.term}</strong>
                                  <small>
                                    {item.meaningCn} · {item.useCase}
                                  </small>
                                </article>
                              ))}
                            </div>
                          </div>

                          <label className="task2-sentence-practice">
                            <span>学生英文练习</span>
                            <textarea placeholder="根据上方中文和词汇提示，在这里写出英文句子。" />
                          </label>

                          <button type="submit">提交</button>

                          {isSubmitted ? (
                            <div className="task2-reference-answer">
                              <span>英文语言组织</span>
                              <p>{sentence}</p>
                            </div>
                          ) : null}
                        </form>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          </Task2Fold>

          <Task2Fold summary={<Task2StageTitle index="04" title="完整范文" />}>
            {essay.examinerNote ? <p className="task2-examiner-note">{essay.examinerNote}</p> : null}
            <div className="task2-model-answer-text">
              {essay.essay.map((paragraph, paragraphIndex) => (
                <p key={`${essay.id}-paragraph-${paragraphIndex}`}>{paragraph}</p>
              ))}
            </div>
          </Task2Fold>
        </div>
      </article>
    </section>
  );
}
