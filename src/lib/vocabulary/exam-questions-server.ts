import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import {
  extractDocumentExamQuestions, extractJuniorExamQuestions, extractSatExamQuestions, extractIeltsReadingQuestions,
  indexExamQuestions, selectExamQuestions, type VocabularyExam, type VocabularyExamQuestion,
} from "@/lib/vocabulary/exam-questions";

const indexes = new Map<VocabularyExam, { expires: number; value: Promise<ReturnType<typeof indexExamQuestions>> }>();
const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));
const isRealPaper = (title: string) => !/模拟|押题|预测|仿真|simulation|mock/i.test(title);

async function loadQuestions(exam: VocabularyExam): Promise<VocabularyExamQuestion[]> {
  if (exam === "ielts") {
    const { READING_TESTS } = await import("@/lib/ielts/reading");
    return extractIeltsReadingQuestions(READING_TESTS);
  }
  if (exam === "junior") {
    const { JUNIOR_HIGH_PAPER_CATALOG } = await import("@/lib/junior-high/paper-catalog");
    return JUNIOR_HIGH_PAPER_CATALOG.flatMap(paper => isRealPaper(`${paper.label} ${paper.fileName}`)
      ? extractJuniorExamQuestions(paper, { exam, title: paper.displayTitle ?? `${paper.year} ${paper.region} 中考真题`, href: `/junior-high?mode=mock&paper=${encodeURIComponent(`${paper.year}-${paper.region}-${paper.label}`)}` }) : []);
  }
  if (exam === "gre" || exam === "gmat") return []; // Current catalogs contain practice banks, not verified past papers.
  const base = exam === "senior" ? "senior-high" : exam === "postgraduate" ? "kaoyan" : exam;
  const root = path.join(process.cwd(), "public", base);
  const catalog = await readJson(path.join(root, exam === "sat" ? "papers/index.json" : "index.json"));
  const papers = exam === "sat" ? catalog.papers : catalog.entries.filter((row: any) => row.kind === "paper" && row.quality?.structureStatus === "approved");
  const result: VocabularyExamQuestion[] = [];
  // One matching exam, initialized only on first expansion; bounded sequential reads avoid bank-wide I/O bursts.
  for (const paper of papers) {
    if (!isRealPaper(paper.title ?? "") || !/^[a-z0-9-]+$/i.test(paper.id)) continue;
    const document = await readJson(path.join(root, "papers", `${paper.id}.json`));
    const source = { exam, title: paper.title, href: exam === "sat" ? `/sat/past-papers/${paper.id}` : exam === "senior" ? `/senior-high/papers/${paper.id}` : `/${base}/${paper.id}` };
    result.push(...(exam === "sat" ? extractSatExamQuestions(document, source) : extractDocumentExamQuestions(document, source)));
  }
  return result;
}

export async function getVocabularyExamQuestions(exam: VocabularyExam, forms: string[], page: number) {
  let cached = indexes.get(exam);
  if (!cached || cached.expires <= Date.now()) {
    const value = loadQuestions(exam).then(indexExamQuestions).catch(error => { indexes.delete(exam); throw error; });
    cached = { expires: Date.now() + 5 * 60_000, value };
    indexes.set(exam, cached);
  }
  return selectExamQuestions(await cached.value, forms, exam, page);
}
