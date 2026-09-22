import { NextResponse } from "next/server";
import {
  getAllVocabularyEntries,
} from "@/lib/vocabulary/local-vocabulary";
import {
  getLearningBookEntries,
  toLearningWord,
  type LearningBookKey,
} from "@/lib/vocabulary/learning";

export const dynamic = "force-dynamic";

const validBookKeys = new Set<LearningBookKey | "全部">([
  "小学",
  "初中",
  "高中",
  "四级",
  "六级",
  "考研",
  "托雅",
  "SAT",
  "GMAT",
  "GRE",
  "未分级",
  "全部",
]);

export function GET(request: Request) {
  const requestedBook = new URL(request.url).searchParams.get("book") ?? "小学";
  const book = validBookKeys.has(requestedBook as LearningBookKey | "全部")
    ? (requestedBook as LearningBookKey | "全部")
    : "小学";
  const entries = getAllVocabularyEntries();
  const words = getLearningBookEntries(entries, book).map(toLearningWord);

  return NextResponse.json(
    {
      book,
      sourceCount: entries.length,
      words,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
