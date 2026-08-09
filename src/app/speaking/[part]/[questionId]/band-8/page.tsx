import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSpeakingModelAnswer,
  getSpeakingScoreNotes,
  speakingModelAnswers,
} from "@/data/ielts/speaking-model-answers";
import { getSpeakingPart } from "@/lib/ielts/speaking";
import styles from "../speaking-model-answer.module.css";

type SpeakingBand8PageProps = {
  params: Promise<{ part: string; questionId: string }>;
};

export function generateStaticParams() {
  return speakingModelAnswers
    .filter((answer) => Boolean(answer.band8Answer?.length))
    .map((answer) => ({
      part: answer.partId,
      questionId: answer.questionId,
    }));
}

export async function generateMetadata({
  params,
}: SpeakingBand8PageProps): Promise<Metadata> {
  const { part: partId, questionId } = await params;
  const part = getSpeakingPart(partId);
  const question = part?.questions.find((item) => item.id === questionId);
  const modelAnswer = getSpeakingModelAnswer(questionId);

  if (!part || !question || !modelAnswer?.band8Answer?.length) {
    return {};
  }

  return {
    description: `${question.question} 雅思口语 ${part.label} 8 分范文、中文翻译与地道词汇短语。`,
    title: `${question.question}｜雅思口语 8 分范文`,
  };
}

export default async function SpeakingBand8Page({ params }: SpeakingBand8PageProps) {
  const { part: partId, questionId } = await params;
  const part = getSpeakingPart(partId);
  const question = part?.questions.find((item) => item.id === questionId);
  const modelAnswer = getSpeakingModelAnswer(questionId);

  if (
    !part ||
    !question ||
    !modelAnswer ||
    modelAnswer.partId !== part.id ||
    !modelAnswer.band8Answer?.length
  ) {
    notFound();
  }

  const scoreNotes = getSpeakingScoreNotes(part.id);
  const band8Approach = modelAnswer.band8Approach ?? modelAnswer.approach;
  const band8Frames = modelAnswer.band8Frames ?? modelAnswer.frames;

  return (
    <article className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="面包屑">
        <Link href="/speaking">IELTS Speaking</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/speaking/${part.id}`}>{part.label}</Link>
        <span aria-hidden="true">/</span>
        <strong>8 分范文</strong>
      </nav>

      <header className={styles.hero}>
        <span>BAND 8 MODEL ANSWER</span>
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
        <p>{band8Approach}</p>
      </section>

      <section className={styles.section}>
        <h2>万能句型</h2>
        <ul className={styles.frames}>
          {band8Frames.map((frame) => (
            <li key={frame}>{frame}</li>
          ))}
        </ul>
      </section>

      {modelAnswer.band8Vocabulary?.length ? (
        <section className={styles.section}>
          <h2>重点词汇和短语</h2>
          <dl className={styles.vocabulary}>
            {modelAnswer.band8Vocabulary.map((item) => (
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
      ) : null}

      <section className={`${styles.section} ${styles.answerSection}`}>
        <h2>8 分范文</h2>
        <div className={styles.answer}>
          {modelAnswer.band8Answer.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        {modelAnswer.band8AnswerTranslation?.length ? (
          <div className={styles.translationBlock}>
            <h3>中文翻译</h3>
            <div className={styles.translation}>
              {modelAnswer.band8AnswerTranslation.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
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
  );
}
