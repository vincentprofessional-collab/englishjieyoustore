import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSpeakingModelAnswer,
  getSpeakingScoreNotes,
  speakingModelAnswers,
} from "@/data/ielts/speaking-model-answers";
import { getSpeakingPart } from "@/lib/ielts/speaking";
import styles from "./speaking-model-answer.module.css";

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

  const bandLabel = modelAnswer.band8Answer?.length ? "7/8 分范文" : "7 分范文";

  return {
    description: `${question.question} 雅思口语 ${part.label} ${bandLabel}、万能句型与重点词汇。`,
    title: `${question.question}｜雅思口语 ${bandLabel}`,
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
    <article className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="面包屑">
        <Link href="/speaking">IELTS Speaking</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/speaking/${part.id}`}>{part.label}</Link>
        <span aria-hidden="true">/</span>
        <strong>范文对照</strong>
      </nav>

      <header className={styles.hero}>
        <span>BAND 7 · 8 MODEL ANSWERS</span>
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
        <h2>口语范文对照</h2>
        <div className={styles.answerGrid}>
          <section className={styles.answerCard}>
            <header>
              <span>Band 7</span>
              <h3>7 分范文</h3>
              <p>自然、清楚、适合先背熟的高分版本。</p>
            </header>
            <div className={styles.answer}>
              {modelAnswer.answer.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className={styles.translationBlock}>
              <h4>中文翻译</h4>
              <div className={styles.translation}>
                {modelAnswer.answerTranslation.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            {modelAnswer.audioUrl ? (
              <div className={styles.audioBlock}>
                <h4>范文音频</h4>
                <audio controls preload="none" src={modelAnswer.audioUrl}>
                  您的浏览器暂不支持音频播放。
                </audio>
              </div>
            ) : null}
          </section>

          <section className={`${styles.answerCard} ${styles.band8Card}`} id="band-8">
            <header>
              <span>Band 8</span>
              <h3>8 分范文</h3>
              <p>更精准、更地道，避免 Chinglish 的升级版本。</p>
            </header>
            {modelAnswer.band8Answer?.length ? (
              <>
                <div className={styles.answer}>
                  {modelAnswer.band8Answer.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                <div className={styles.translationBlock}>
                  <h4>中文翻译</h4>
                  <div className={styles.translation}>
                    {modelAnswer.band8AnswerTranslation?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>

                {modelAnswer.band8Vocabulary?.length ? (
                  <div className={styles.bandVocabularyBlock}>
                    <h4>8 分词汇与短语</h4>
                    <dl>
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
                  </div>
                ) : null}
              </>
            ) : (
              <div className={styles.placeholderCard}>
                <strong>8 分范文分批更新中</strong>
                <p>本题会按同一标准补充：自然英语表达、准确搭配、丰富但可说出口的句式。</p>
              </div>
            )}
          </section>

          <section className={`${styles.answerCard} ${styles.futureCard}`}>
            <header>
              <span>Band 9</span>
              <h3>9 分范文</h3>
              <p>预留给后续更高阶表达版本。</p>
            </header>
            <div className={styles.placeholderCard}>
              <strong>9 分范文预留</strong>
              <p>后续可加入更强的语义控制、语域变化和近母语级表达。</p>
            </div>
          </section>
        </div>
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
