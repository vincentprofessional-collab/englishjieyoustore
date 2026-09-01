import { NextResponse } from "next/server";
import { getBbcEffectiveVocabularyById } from "@/lib/articles/bbc-vocabulary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId")?.trim() ?? "";
  const vocabulary = getBbcEffectiveVocabularyById(articleId);

  if (!vocabulary) {
    return NextResponse.json({ vocabulary: null }, { status: 404 });
  }

  return NextResponse.json({ vocabulary });
}
