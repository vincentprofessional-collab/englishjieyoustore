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
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = getNewConceptLessonById(lessonId);

  if (!lesson) {
    notFound();
  }

  const media = getNewConceptMediaUrls(lesson);

  return (
    <NewConceptLessonPage
      audioUrl={media.audioUrl}
      lesson={lesson}
      sentenceAudioUrls={media.sentenceAudioUrls}
      vocabulary={getNewConceptVocabularyItems(lesson)}
    />
  );
}
