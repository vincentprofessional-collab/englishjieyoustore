import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { getExtendedVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";
import { createVocabularyVideoStorageClient, getVocabularyVideos, isEligibleVocabularyVideo, isPlayableVocabularyVideoFilename, VOCABULARY_VIDEO_FILES_TAG } from "@/lib/vocabulary/videos";
import { toSupabaseSafeStoragePath } from "@/lib/media/url";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "删除请求来源不正确。" }, { status: 403 });
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 });
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError || profile?.role !== "admin") return NextResponse.json({ error: "只有管理员可以删除视频。" }, { status: 403 });

    const body = await request.json().catch(() => null) as { path?: unknown; word?: unknown } | null;
    const word = typeof body?.word === "string" ? body.word.trim().toLowerCase() : "";
    const path = typeof body?.path === "string" ? body.path : "";
    if (!word || word.length > 100 || !isPlayableVocabularyVideoFilename(path)) {
      return NextResponse.json({ error: "请选择有效的词汇视频。" }, { status: 400 });
    }
    const entry = await getExtendedVocabularyEntry(word);
    if (!entry || entry.normalizedWord.toLowerCase() !== word || !isEligibleVocabularyVideo(entry, path)) {
      return NextResponse.json({ error: "这个视频不属于当前词条。" }, { status: 400 });
    }
    const storage = createVocabularyVideoStorageClient();
    if (!storage) return NextResponse.json({ error: "视频存储服务未配置。" }, { status: 503 });
    const { error } = await storage.storage.from("videos").remove([toSupabaseSafeStoragePath(`vocabulary/${path}`)]);
    if (error) throw error;
    revalidateTag(VOCABULARY_VIDEO_FILES_TAG, { expire: 0 });
    return NextResponse.json({ ok: true, path }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "视频删除失败，请稍后重试。" }, { status: 503 });
  }
}
