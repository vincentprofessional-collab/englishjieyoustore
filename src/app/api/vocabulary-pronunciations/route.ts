import { NextResponse } from "next/server";

import { getVocabularyPronunciationsForWords } from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { pronunciationMode?: unknown; words?: unknown };
  try {
    payload = (await request.json()) as {
      pronunciationMode?: unknown;
      words?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const pronunciationMode = payload.pronunciationMode === "us" ? "us" : payload.pronunciationMode === "uk" ? "uk" : null;
  const words = Array.isArray(payload.words)
    ? payload.words.filter((word): word is string => typeof word === "string").slice(0, 1200)
    : [];

  if (!pronunciationMode || words.length === 0) {
    return NextResponse.json({ pronunciations: {} });
  }

  const pronunciations = await getVocabularyPronunciationsForWords(words, pronunciationMode);
  return NextResponse.json({ pronunciations }, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
