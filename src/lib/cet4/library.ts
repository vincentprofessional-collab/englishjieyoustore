import libraryData from "@/data/cet4/library.json";

export type Cet4Section = "知识点" | "题型" | "试卷";

export type Cet4Entry = {
  id: string;
  title: string;
  section: Cet4Section;
  topic: string;
  sourceFiles: string[];
  sourceHash: string;
  excerpt: string;
  body: string;
  answers: string;
  audioUrl: string;
};

const entries = libraryData.entries as Cet4Entry[];

export function getCet4Entries() {
  return entries;
}

export function getCet4Entry(id: string) {
  return entries.find((entry) => entry.id === id) ?? null;
}
