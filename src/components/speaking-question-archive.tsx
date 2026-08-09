"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getSpeakingModelAnswer } from "@/data/ielts/speaking-model-answers";
import { SpeakingQuestionFavoriteButton } from "@/components/speaking-question-favorite-button";
import type { SpeakingPart, SpeakingQuestion } from "@/lib/ielts/speaking";
import styles from "./speaking-question-archive.module.css";

type ArchiveView = "all" | "latest";

type SpeakingQuestionGroup = {
  questions: SpeakingQuestion[];
  scene: string;
};

const LATEST_YEAR_LABELS = new Set(["2026/1-4", "2026/5-8", "必考", "保留"]);

function isLatestQuestion(question: SpeakingQuestion) {
  return LATEST_YEAR_LABELS.has(question.year);
}

function groupQuestions(questions: SpeakingQuestion[]) {
  const groups = new Map<string, SpeakingQuestion[]>();

  for (const question of questions) {
    const currentQuestions = groups.get(question.scene) ?? [];
    currentQuestions.push(question);
    groups.set(question.scene, currentQuestions);
  }

  return Array.from(groups, ([scene, groupedQuestions]) => ({
    questions: groupedQuestions,
    scene,
  }));
}

function getSceneId(group: SpeakingQuestionGroup) {
  return `scene-${group.questions[0].id}`;
}

export function SpeakingQuestionArchive({ part }: { part: SpeakingPart }) {
  const [view, setView] = useState<ArchiveView>("all");
  const latestQuestions = useMemo(
    () => part.questions.filter(isLatestQuestion),
    [part.questions],
  );
  const visibleQuestions = view === "latest" ? latestQuestions : part.questions;
  const groups = useMemo(() => groupQuestions(visibleQuestions), [visibleQuestions]);

  return (
    <>
      <section className="speaking-scene-index" aria-label={`${part.label} 真题筛选`}>
        <div className="speaking-archive-switch" role="tablist" aria-label="真题范围">
          <button
            aria-selected={view === "all"}
            className={view === "all" ? "active" : ""}
            onClick={() => setView("all")}
            role="tab"
            type="button"
          >
            <span>历年真题</span>
            <small>{part.count}</small>
          </button>
          <button
            aria-selected={view === "latest"}
            className={view === "latest" ? "active" : ""}
            onClick={() => setView("latest")}
            role="tab"
            type="button"
          >
            <span>最新真题</span>
            <small>{latestQuestions.length}</small>
          </button>
        </div>

        {groups.length > 0 ? (
          <div className="speaking-scene-filter">
            <header>
              <span>{view === "all" ? "全部场景" : "最近半年场景"}</span>
              <small>{visibleQuestions.length} 道题</small>
            </header>
            <nav className="speaking-scene-links" aria-label={`${part.label} 场景`}>
              {groups.map((group) => (
                <a href={`#${getSceneId(group)}`} key={group.scene}>
                  {group.scene}
                  <small>{group.questions.length}</small>
                </a>
              ))}
            </nav>
          </div>
        ) : null}
      </section>

      {groups.length > 0 ? (
        <div className="speaking-scene-list" aria-live="polite">
          {groups.map((group) => (
            <section
              className="speaking-scene-section"
              id={getSceneId(group)}
              key={group.scene}
            >
              <header>
                <h2>{group.scene}</h2>
                <span>{group.questions.length} 道题</span>
              </header>

              <ol>
                {group.questions.map((question, questionIndex) => {
                  const modelAnswer = getSpeakingModelAnswer(question.id);
                  const hasModelAnswer = Boolean(modelAnswer);
                  const hasBand8Answer = Boolean(modelAnswer?.band8Answer?.length);

                  return (
                    <li id={question.id} key={question.id}>
                      <span className="speaking-question-number">
                        {String(questionIndex + 1).padStart(2, "0")}
                      </span>
                      <div className="speaking-question-copy">
                        <strong>{question.question}</strong>
                        <span>{question.translation}</span>
                        {question.followUp ? (
                          <small>常见追问：{question.followUp}</small>
                        ) : null}
                        {hasModelAnswer ? (
                          <div className={styles.answerLinks}>
                            <Link
                              className={styles.answerLink}
                              href={`/speaking/${part.id}/${question.id}`}
                            >
                              查看 7 分范文 <span aria-hidden="true">→</span>
                            </Link>
                            {hasBand8Answer ? (
                              <Link
                                className={`${styles.answerLink} ${styles.band8Link}`}
                                href={`/speaking/${part.id}/${question.id}/band-8`}
                              >
                                查看 8 分范文 <span aria-hidden="true">→</span>
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="speaking-question-actions">
                        <span>{question.year}</span>
                        <SpeakingQuestionFavoriteButton
                          partId={part.id}
                          partLabel={part.label}
                          question={question}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <section className="speaking-archive-empty" aria-live="polite">
          <strong>暂无最近半年题目</strong>
          <p>当前题库没有带有明确最近半年标记的题目，请先查看历年真题。</p>
          <button onClick={() => setView("all")} type="button">
            返回历年真题
          </button>
        </section>
      )}
    </>
  );
}
