import { NextRequest, NextResponse } from "next/server";
import { getBbcArticleById } from "@/lib/articles/bbc";
import { getUploadedBbcArticle } from "@/lib/articles/bbc-uploaded-content";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("article") ?? "";
  const year = Number(request.nextUrl.searchParams.get("year"));
  const sentenceNo = Number(request.nextUrl.searchParams.get("sentence"));
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/i.test(id) || !Number.isInteger(year) || year < 2000 || year > 2100
    || !Number.isInteger(sentenceNo) || sentenceNo < 1 || sentenceNo > 1000) {
    return new NextResponse("Invalid example", { status: 400 });
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("can_access_project", { _project_key: "bbc" });
    if (error || data !== true) return new NextResponse("BBC membership required", { status: 403 });
    const article = await getUploadedBbcArticle(id) ?? getBbcArticleById(id);
    if (!article || article.year !== year) return new NextResponse("Example not found", { status: 404 });
    const audioUrl = article.sentences?.find((sentence) => sentence.sentenceNo === sentenceNo)?.audioUrl;
    if (!audioUrl) return new NextResponse("Example audio unavailable", { status: 404 });
    return NextResponse.redirect(new URL(audioUrl, request.url), { headers: { "Cache-Control": "private, no-store" } });
  } catch { return new NextResponse("Example audio unavailable", { status: 503 }); }
}
