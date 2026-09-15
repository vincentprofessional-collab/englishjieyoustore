import { notFound } from "next/navigation";
import { ListeningPractice } from "@/components/listening-practice";
import { ListeningContentAdminEditor } from "@/components/listening-content-admin-editor";
import { getListeningSection } from "@/lib/ielts/listening";
import { getVocabularyHintsForTexts } from "@/lib/vocabulary/local-vocabulary";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";

export const dynamic = "force-dynamic";

export default async function ListeningSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ attempt?: string; mode?: string; review?: string }>;
}) {
  const { sectionId } = await params;
  const { attempt, mode, review } = await searchParams;
  const isAdmin = await isCurrentUserAdmin();
  const { section, error } = await getListeningSection(sectionId, { includeDrafts: isAdmin });

  if (error) {
    return (
      <section className="panel">
        <div className="eyebrow">Listening</div>
        <h1>读取失败</h1>
        <p className="lead">这套听力内容暂时无法读取：{error}</p>
      </section>
    );
  }

  if (!section) {
    notFound();
  }

  const siblingResults = await Promise.all(
    section.partLinks.map((partLink) =>
      partLink.id === section.id
        ? Promise.resolve({ section, error: null })
        : getListeningSection(partLink.id, { includeDrafts: isAdmin }),
    ),
  );
  const testSections = siblingResults
    .map((result) => result.section)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => left.sectionNo - right.sectionNo);
  const vocabularyHints = getVocabularyHintsForTexts(
    testSections.flatMap((testSection) => [
      ...testSection.transcriptSentences.map((sentence) => sentence.englishText),
      ...testSection.questions.map((question) => question.promptText ?? ""),
    ]),
  );
  const isTranscriptOnlySection =
    section.questions.length === 0 && section.transcriptSentences.length > 0;
  const normalizedMode = mode === "practice" || isTranscriptOnlySection ? "practice" : "mock";
  const initialSubmitted = !isTranscriptOnlySection && review === "1";

  return (
    <>
      {isAdmin ? <ListeningContentAdminEditor initialSection={section} /> : null}
      <ListeningPractice
        key={`${section.id}:${normalizedMode}:${initialSubmitted ? "review" : "answer"}`}
        initialAttemptId={attempt}
        initialSubmitted={initialSubmitted}
        initialMode={normalizedMode}
        section={section}
        testSections={testSections}
        vocabularyHints={vocabularyHints}
      />
    </>
  );
}
