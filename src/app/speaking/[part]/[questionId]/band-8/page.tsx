import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectAccessGate } from "@/components/project-access-gate";
import {
  getSpeakingModelAnswer,
  getSpeakingScoreNotes,
  speakingModelAnswers,
} from "@/data/ielts/speaking-model-answers";
import { getPaidContentKey } from "@/lib/access-control";
import { getSpeakingPart } from "@/lib/ielts/speaking";
import {
  getSpeakingContentSlug,
  type SpeakingEditableContent,
} from "@/lib/ielts/speaking-managed-content";
import SpeakingModelAnswerContent from "../speaking-model-answer-content";
import styles from "../speaking-model-answer.module.css";

export const dynamic = "force-dynamic";

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
  const initialContent: SpeakingEditableContent = {
    answer: modelAnswer.band8Answer,
    answerHeading: "8 分范文",
    answerTranslation: modelAnswer.band8AnswerTranslation ?? [],
    approach: band8Approach,
    audioUrl: "",
    band: "band-8",
    followUp: question.followUp,
    frames: band8Frames,
    heroLabel: "BAND 8 MODEL ANSWER",
    partId: part.id,
    partLabel: part.label,
    question: question.question,
    questionId: question.id,
    questionTranslation: question.translation,
    slug: getSpeakingContentSlug(part.id, question.id, "band-8"),
    timing: part.timing,
    vocabulary: modelAnswer.band8Vocabulary ?? modelAnswer.vocabulary,
    year: question.year,
  };

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
          <strong>8 分范文</strong>
        </nav>
        <SpeakingModelAnswerContent initialContent={initialContent} scoreNotes={scoreNotes} />
      </article>
    </ProjectAccessGate>
  );
}
