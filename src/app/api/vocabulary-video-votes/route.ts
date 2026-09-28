import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getExtendedVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";
import { isEligibleVocabularyVideo } from "@/lib/vocabulary/videos";

export async function POST(request: NextRequest) {
  let body: { path?: unknown; word?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "点赞请求格式不正确。" }, { status: 400 });
  }

  const word = typeof body.word === "string" ? body.word.trim().toLowerCase() : "";
  const path = typeof body.path === "string" ? body.path : "";
  if (!word || !path || word.length > 100 || path.length > 1024) {
    return NextResponse.json({ error: "点赞内容不完整。" }, { status: 400 });
  }

  const entry = await getExtendedVocabularyEntry(word);
  if (!entry || entry.normalizedWord.toLowerCase() !== word || !isEligibleVocabularyVideo(entry, path)) {
    return NextResponse.json({ error: "这个视频不属于当前词条。" }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return NextResponse.json({ error: "请先登录后再点赞。" }, { status: 401 });

    const { data: existing, error: existingError } = await supabase
      .from("vocabulary_video_votes")
      .select("video_path")
      .eq("word", word)
      .eq("video_path", path)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (!existing) {
      const { error: insertError } = await supabase.from("vocabulary_video_votes").insert({
        user_id: user.id,
        video_path: path,
        word,
      });
      if (insertError && insertError.code !== "23505") throw insertError;
    }

    const { data: countRows, error: countError } = await supabase.rpc("get_vocabulary_video_ranking_counts", {
      target_paths: [path],
      target_word: word,
    });
    if (countError) throw countError;

    const likes = Number((countRows as Array<{ likes: number | string }> | null)?.[0]?.likes ?? 0);
    return NextResponse.json({ liked: true, likes });
  } catch {
    return NextResponse.json({ error: "点赞服务暂不可用，请稍后重试。" }, { status: 503 });
  }
}
