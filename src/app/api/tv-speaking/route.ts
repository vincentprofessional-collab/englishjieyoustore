import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createTvSpeakingServiceClient,
  normalizeTvSpeakingClips,
  TV_SPEAKING_SECTION_KEY,
  TV_SPEAKING_SLUG,
} from "@/lib/tv-speaking-server";

async function requireAdmin(request: NextRequest, supabase: SupabaseClient) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 }) };
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { response: NextResponse.json({ error: "管理员登录已失效。" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { response: NextResponse.json({ error: "没有管理视频的权限。" }, { status: 403 }) };
  return { user };
}

async function readManagedClips(supabase: SupabaseClient) {
  const { data: page, error: pageError } = await supabase
    .from("managed_content_pages")
    .select("id")
    .eq("slug", TV_SPEAKING_SLUG)
    .eq("module", "training")
    .eq("status", "published")
    .maybeSingle();
  if (pageError) throw pageError;
  if (!page) return { clips: [], pageId: null };
  const { data: section, error: sectionError } = await supabase
    .from("managed_content_page_sections")
    .select("content_json")
    .eq("page_id", page.id)
    .eq("section_key", TV_SPEAKING_SECTION_KEY)
    .eq("is_active", true)
    .maybeSingle();
  if (sectionError) throw sectionError;
  return { clips: normalizeTvSpeakingClips(section?.content_json), pageId: page.id as string };
}

async function writeManagedClips(supabase: SupabaseClient, pageId: string, clips: unknown[]) {
  const { error } = await supabase
    .from("managed_content_page_sections")
    .update({ content_json: { clips }, updated_at: new Date().toISOString() })
    .eq("page_id", pageId)
    .eq("section_key", TV_SPEAKING_SECTION_KEY);
  if (error) throw error;
}

export async function GET() {
  const supabase = createTvSpeakingServiceClient();
  if (!supabase) return NextResponse.json({ clips: [] });
  try {
    const { clips } = await readManagedClips(supabase);
    return NextResponse.json({ clips });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取视频失败。" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createTvSpeakingServiceClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 未配置。" }, { status: 500 });
  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;
  const payload = (await request.json().catch(() => null)) as { id?: string; english?: string; chinese?: string } | null;
  const id = payload?.id?.trim() ?? "";
  const english = payload?.english?.trim() ?? "";
  const chinese = payload?.chinese?.trim() ?? "";
  if (!id || !english || english.length > 600 || chinese.length > 600) {
    return NextResponse.json({ error: "英文不能为空，单项中英文不能超过 600 字符。" }, { status: 400 });
  }
  try {
    const { clips, pageId } = await readManagedClips(supabase);
    if (!pageId) return NextResponse.json({ error: "视频内容尚未初始化。" }, { status: 404 });
    const targetIndex = clips.findIndex((clip) => clip.id === id);
    if (targetIndex < 0) return NextResponse.json({ error: "没有找到这条视频。" }, { status: 404 });
    const next = clips.map((clip, index) => index === targetIndex ? { ...clip, chinese, english } : clip);
    await writeManagedClips(supabase, pageId, next);
    return NextResponse.json({ clip: next[targetIndex], ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败。" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createTvSpeakingServiceClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 未配置。" }, { status: 500 });
  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id) return NextResponse.json({ error: "缺少视频标识。" }, { status: 400 });
  try {
    const { clips, pageId } = await readManagedClips(supabase);
    if (!pageId) return NextResponse.json({ error: "视频内容尚未初始化。" }, { status: 404 });
    const target = clips.find((clip) => clip.id === id);
    if (!target) return NextResponse.json({ error: "没有找到这条视频。" }, { status: 404 });
    const next = clips.filter((clip) => clip.id !== id).map((clip, index) => ({ ...clip, rank: index + 1 }));
    await writeManagedClips(supabase, pageId, next);
    const { error: storageError } = await supabase.storage.from("videos").remove([target.storagePath]);
    return NextResponse.json({ ok: true, storageWarning: storageError?.message ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除失败。" }, { status: 500 });
  }
}
