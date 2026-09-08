import { notFound } from "next/navigation";
import { ListeningPastPaperPage } from "@/components/listening-past-paper-page";
import { getPastPaperById, PAST_PAPERS } from "@/lib/ielts/past-papers";
import { getPublicStorageUrl } from "@/lib/supabase/storage";

export const dynamicParams = false;

export function generateStaticParams() {
  return PAST_PAPERS.map((paper) => ({ paperId: paper.sourceId }));
}

export default async function PastPaperPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  const paper = getPastPaperById(paperId);

  if (!paper) {
    notFound();
  }

  return (
    <ListeningPastPaperPage
      audioUrl={getPublicStorageUrl("audio", paper.audioPath)}
      paper={paper}
    />
  );
}
