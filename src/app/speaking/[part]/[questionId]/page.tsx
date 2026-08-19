import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSpeakingModelAnswer,
  getSpeakingScoreNotes,
  speakingModelAnswers,
} from "@/data/ielts/speaking-model-answers";
import { getSpeakingPart } from "@/lib/ielts/speaking";
import {
  getSpeakingContentSlug,
  type SpeakingEditableContent,
} from "@/lib/ielts/speaking-managed-content";
import SpeakingModelAnswerContent from "./speaking-model-answer-content";
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
  const initialContent: SpeakingEditableContent = {
    answer: modelAnswer.answer,
    answerHeading: "7 分范文",
    answerTranslation: modelAnswer.answerTranslation,
    approach: modelAnswer.approach,
    audioUrl: modelAnswer.audioUrl ?? "",
    band: "band-7",
    followUp: question.followUp,
    frames: modelAnswer.frames,
    heroLabel: "BAND 7 MODEL ANSWER",
    partId: part.id,
    partLabel: part.label,
    question: question.question,
    questionId: question.id,
    questionTranslation: question.translation,
    slug: getSpeakingContentSlug(part.id, question.id, "band-7"),
    timing: part.timing,
    vocabulary: modelAnswer.vocabulary,
    year: question.year,
  };

  return (
    <article className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="面包屑">
        <Link href="/speaking">IELTS Speaking</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/speaking/${part.id}`}>{part.label}</Link>
        <span aria-hidden="true">/</span>
        <strong>7 分范文</strong>
      </nav>

      <SpeakingModelAnswerContent initialContent={initialContent} scoreNotes={scoreNotes} />
    </article>
  );
}
