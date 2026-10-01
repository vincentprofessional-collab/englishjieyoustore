import { NextResponse } from "next/server";

import { getBbcVocabularyDetail } from "@/lib/articles/bbc-vocabulary";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getVocabularyUsageExamples } from "@/lib/vocabulary/examples";
import { getVocabularyPhraseMatches } from "@/lib/vocabulary/phrases";
import { getExtendedVocabularyEntry, getVocabularyEntry, getVocabularyFormationParts } from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word")?.trim() ?? "";
  const isDetailed = searchParams.get("detail") === "1";
  const hint = (!isDetailed && getVocabularyEntry(word)) || await getExtendedVocabularyEntry(word);

  if (!hint) {
    return NextResponse.json({ hint: null }, { status: 404 });
  }

  if (isDetailed) {
    const bbcVocabularyDetail = getBbcVocabularyDetail(word);
    const entry = /\s/.test(word) && bbcVocabularyDetail ? bbcVocabularyDetail.entry : hint;
    const fetchedUsageExamples = bbcVocabularyDetail?.examples.length
      ? bbcVocabularyDetail.examples.slice(0, 5)
      : await Promise.race([
          getVocabularyUsageExamples(entry.word, 5, entry.inflections.map((inflection) => inflection.value)),
          new Promise<Awaited<ReturnType<typeof getVocabularyUsageExamples>>>((resolve) => setTimeout(() => resolve([]), 1500)),
        ]);
    let canAccessBbcExamples = false;
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.rpc("can_access_project", {
        _project_key: "bbc",
      });
      canAccessBbcExamples = !error && data === true;
    } catch {
      // Treat an unavailable membership check as a visitor and hide BBC examples.
    }
    const usageExamples = canAccessBbcExamples
      ? fetchedUsageExamples
      : fetchedUsageExamples.filter((example) => example.bookCode !== "BBC");
    const formationParts = getVocabularyFormationParts(entry).map((part) => ({
      ...part,
      href: part.href ? `${part.href}${part.href.includes("?") ? "&" : "?"}from=lookup` : part.href,
    }));

    return NextResponse.json(
      { entry, formationParts, phrases: getVocabularyPhraseMatches(entry.word), usageExamples },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ hint });
}
