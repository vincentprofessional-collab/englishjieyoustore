import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectAccessGate } from "@/components/project-access-gate";
import {
  getSpeakingModelAnswer,
  getSpeakingScoreNotes,
  speakingModelAnswers,
} from "@/data/ielts/speaking-model-answers";
import { getSpeakingPart } from "@/lib/ielts/speaking";
import { getPaidContentKey } from "@/lib/access-control";
import styles from "./speaking-model-answer.module.css";

export const dynamic = "force-dynamic";

type SpeakingModelAnswerPageProps = {
  params: Promise<{ part: string; questionId: string }>;
};

export function generateStaticParams() {
  return speakingModelAnswers.map((answer) => ({
    part: answer.partId,
    questionId: answer.questionId,
  }));
}

export async function generateMetadata({
  params,
}: SpeakingModelAnswerPageProps): Promise<Metadata> {
  const { part: partId, questionId } = await params;
  const part = getSpeakingPart(partId);
  const question = part?.questions.find((item) => item.id === questionId);
  const modelAnswer = getSpeakingModelAnswer(questionId);

  if (!part || !question || !modelAnswer) {
    return {};
  }

  return {
    description: `${question.question} 雅思口语 ${part.label} 7 分范文、万能句型与重点词汇。`,
    title: `${question.question}｜雅思口语 7 分范文`,
  };
}

export default async function SpeakingModelAnswerPage({
  params,
}: SpeakingModelAnswerPageProps) {
  const { part: partId, questionId } = await params;
  const part = getSpeakingPart(partId);
  const question = part?.questions.find((item) => item.id === questionId);
  const modelAnswer = getSpeakingModelAnswer(questionId);

  if (!part || !question || !modelAnswer || modelAnswer.partId !== part.id) {
    notFound();
  }

  const scoreNotes = getSpeakingScoreNotes(part.id);
  return (
    <ProjectAccessGate
      contentKey={getPaidContentKey("speaking-question", `${part.id}:${questionId}`)}
      projectKey="speaking"
      title="雅思口语范文需要单独开通"
    >
      <article className={styles.page}>
        <nav className={styles.breadcrumb} aria-label="面包屑">
          <Link href="/speaking">IELTS Speaking</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/speaking/${part.id}`}>{part.label}</Link>
          <span aria-hidden="true">/</span>
          <strong>7 分范文</strong>
        </nav>

        <header className={styles.hero}>
          <span>BAND 7 MODEL ANSWER</span>
          <h1>{question.question}</h1>
          <div className={styles.questionPrompt}>
            <p>
              <span>中文提示</span>
              <strong>{question.translation}</strong>
            </p>
            <p>
              <span>真实题目 / 常见追问</span>
              <strong>{question.followUp}</strong>
            </p>
          </div>
          <dl>
            <div>
              <dt>题型</dt>
              <dd>{part.label}</dd>
            </div>
            <div>
              <dt>建议时长</dt>
              <dd>{part.timing}</dd>
            </div>
            <div>
              <dt>题目来源</dt>
              <dd>{question.year}</dd>
            </div>
          </dl>
        </header>

        <section className={styles.section}>
          <h2>高分思路</h2>
          <p>{modelAnswer.approach}</p>
        </section>

        <section className={styles.section}>
          <h2>万能句型</h2>
          <ul className={styles.frames}>
            {modelAnswer.frames.map((frame) => (
              <li key={frame}>{frame}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2>重点词汇和短语</h2>
          <dl className={styles.vocabulary}>
            {modelAnswer.vocabulary.map((item) => (
              <div key={item.phrase}>
                <dt>{item.phrase}</dt>
                <dd>
                  <strong>{item.translation}</strong>
                  <span>{item.note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={`${styles.section} ${styles.answerSection}`}>
          <h2>7 分范文</h2>
          <div className={styles.answer}>
            {modelAnswer.answer.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className={styles.translationBlock}>
            <h3>中文翻译</h3>
            <div className={styles.translation}>
              {modelAnswer.answerTranslation.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          {modelAnswer.audioUrl ? (
            <div className={styles.audioBlock}>
              <h3>范文音频</h3>
              <audio controls preload="none" src={modelAnswer.audioUrl}>
                您的浏览器暂不支持音频播放。
              </audio>
            </div>
          ) : null}
        </section>

        <section className={styles.section}>
          <h2>IELTS 评分对照</h2>
          <div className={styles.scoreNotes}>
            {scoreNotes.map((item) => (
              <div key={item.code}>
                <span>{item.code}</span>
                <strong>{item.label}</strong>
                <p>{item.note}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </ProjectAccessGate>
  );
}
