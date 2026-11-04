import { NextResponse } from "next/server";
import { getVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";
import { EXAM_BY_LEVEL } from "@/lib/vocabulary/exam-questions";
import { getVocabularyExamQuestions } from "@/lib/vocabulary/exam-questions-server";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const word = query.get("word")?.trim() ?? "";
  const page = Number(query.get("page") ?? 1);
  if (!word || word.length > 120 || !Number.isSafeInteger(page) || page < 1 || page > 10000) {
    return NextResponse.json({ error: "词条或页码无效。" }, { status: 400 });
  }
  const entry = getVocabularyEntry(word);
  if (!entry) return NextResponse.json({ error: "词条未收录。" }, { status: 404 });
  // Never accept an exam/level supplied by the browser: the word's own level is authoritative.
  const exam = EXAM_BY_LEVEL[entry.level];
  if (!exam) return NextResponse.json({ total: 0, page: 1, pageSize: 5, questions: [] });
  try {
    const result = await getVocabularyExamQuestions(exam, [entry.word, ...entry.inflections.map(form => form.value)], page);
    // These are existing public exam sources. Member-only BBC/answer-word banks are deliberately absent.
    return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ error: "真题暂时无法载入，请稍后重试。" }, { status: 503 });
  }
}
