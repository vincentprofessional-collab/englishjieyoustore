import pastPaperBundle from "../../../data/ielts/past-papers.json";

export type PastPaperTranscriptBlock = {
  blockNo: number;
  english: string;
  chinese: string;
};

export type PastPaperRecord = {
  audioKind: "m4a" | "mp3" | null;
  audioMimeType: string | null;
  audioPath: string | null;
  audioSourceFile: string | null;
  audioStatus: "available" | "missing";
  sectionNo: 1 | 2 | 3 | 4;
  slug: string;
  sourceId: string;
  sourceNumber: number;
  title: string;
  transcriptBlocks: PastPaperTranscriptBlock[];
};

export const PAST_PAPERS_SOURCE = pastPaperBundle.source;
export const PAST_PAPERS = pastPaperBundle.records as PastPaperRecord[];

export function getPastPaperBySlug(slug: string) {
  return PAST_PAPERS.find((paper) => paper.slug === slug);
}

export function getPastPaperDetailHref(slug: string) {
  return `/listening/past-papers/${slug}`;
}
