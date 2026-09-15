import fs from "node:fs";
import path from "node:path";
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

export type Cet4SetSummary = {
  id: string;
  kind: "paper" | "practice";
  title: string;
  year: string;
  region: string;
  variant: string;
  questionCount: number;
  answeredCount: number;
  explanationCount: number;
  answerStatus: "answered" | "partial" | "none" | "conflict";
  questionTypes: string[];
  href: string;
  quality: { structureStatus: string; structureConfidence: number; issueCount: number };
};

export type Cet4SetIndex = { schemaVersion: 2; generatedAt: string; entries: Cet4SetSummary[] };

const entries = libraryData.entries as Cet4Entry[];

export function getCet4Entries() {
  return entries;
}

export function getCet4Entry(id: string) {
  return entries.find((entry) => entry.id === id) ?? null;
}

export function getCet4SetIndex(): Cet4SetIndex {
  const filePath = path.join(process.cwd(), "public", "cet4", "index.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Cet4SetIndex;
}
