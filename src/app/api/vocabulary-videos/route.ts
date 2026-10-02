import { NextRequest, NextResponse } from "next/server";

import { getExtendedVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";
import { getVocabularyVideos } from "@/lib/vocabulary/videos";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word")?.trim() ?? "";
  if (!word || word.length > 100) {
    return NextResponse.json({ error: "请提供有效的单词。" }, { status: 400 });
  }

  const entry = await getExtendedVocabularyEntry(word);
  if (!entry) return NextResponse.json({ error: "未找到该单词。" }, { status: 404 });

  const result = await getVocabularyVideos(entry);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
