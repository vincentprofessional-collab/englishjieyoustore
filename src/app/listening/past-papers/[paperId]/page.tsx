import { notFound } from "next/navigation";
import { ListeningPastPaperPage } from "@/components/listening-past-paper-page";
import { getPastPaperBySlug, PAST_PAPERS } from "@/lib/ielts/past-papers";
import { getPublicStorageUrl } from "@/lib/supabase/storage";

export const dynamicParams = false;

export function generateStaticParams() {
  return PAST_PAPERS.map((paper) => ({ paperId: paper.slug }));
}

export default async function PastPaperPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  const paper = getPastPaperBySlug(paperId);

  if (!paper) {
    notFound();
  }

  return (
    <ListeningPastPaperPage
      audioUrl={getPublicStorageUrl("audio", paper.audioPath)}
      paper={{
        slug: paper.slug,
        title: paper.title,
        transcriptBlocks: paper.transcriptBlocks,
      }}
    />
  );
}
