import { NextResponse } from "next/server";

import { getExtendedVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word")?.trim() ?? "";
  const hint = await getExtendedVocabularyEntry(word);

  if (!hint) {
    return NextResponse.json({ hint: null }, { status: 404 });
  }

  return NextResponse.json({ hint });
}
