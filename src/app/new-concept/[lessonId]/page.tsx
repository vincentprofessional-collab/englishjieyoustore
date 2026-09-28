import { notFound } from "next/navigation";
import { NewConceptLessonPage } from "@/components/new-concept-lesson-page";
import { NEW_CONCEPT_LESSONS, getNewConceptLessonById } from "@/lib/new-concept";
import { getNewConceptVocabularyItems } from "@/lib/new-concept-vocabulary";
import { getNewConceptMediaUrls } from "@/lib/new-concept-media";

export const dynamicParams = false;
export const revalidate = 60;

export function generateStaticParams() {
  return NEW_CONCEPT_LESSONS.map((lesson) => ({ lessonId: lesson.id }));
}

export default async function NewConceptLessonRoute({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ edition?: string }>;
}) {
  const { lessonId } = await params;
  const { edition: requestedEdition } = await searchParams;
  const audioEdition = requestedEdition === "uk" ? "uk" : "us";
  const lesson = getNewConceptLessonById(lessonId);

  if (!lesson) {
    notFound();
  }

  const media = getNewConceptMediaUrls(lesson, audioEdition);

  return (
    <NewConceptLessonPage
      audioUrl={media.audioUrl}
      audioEdition={audioEdition}
      lesson={lesson}
      sentenceAudioUrls={media.sentenceAudioUrls}
      vocabulary={getNewConceptVocabularyItems(lesson)}
    />
  );
}
