import { NextResponse } from "next/server";

import { getVocabularyHint } from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word")?.trim() ?? "";
  const hint = getVocabularyHint(word);

  if (!hint) {
    return NextResponse.json({ hint: null }, { status: 404 });
  }

  return NextResponse.json({ hint });
}
