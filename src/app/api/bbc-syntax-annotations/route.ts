import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import syntax2026 from "@/data/bbc/2026-syntax.json";
import { getBbcArticleById } from "@/lib/articles/bbc";
import { normalizeBbcSyntaxSentenceEdits } from "@/lib/bbc-syntax-annotation-edits";
import type { BbcSyntaxSentenceData } from "@/components/bbc-syntax-sentence";

const sourceSentences = syntax2026 as Record<string, BbcSyntaxSentenceData[]>;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

function createServiceClient() {
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function requireAdmin(request: NextRequest, supabase: SupabaseClient) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 }) };
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { response: NextResponse.json({ error: "管理员登录已失效，请重新登录。" }, { status: 401 }) };
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profileError || profile?.role !== "admin") {
    return { response: NextResponse.json({ error: "这个账号没有管理 BBC 语法标注的权限。" }, { status: 403 }) };
  }
  return { user };
}

function getCanonical(articleId: string) {
  const article = getBbcArticleById(articleId);
  const sentences = sourceSentences[articleId];
  return article?.year === 2026 && sentences ? { article, sentences } : null;
}

export async function PUT(request: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "后台内容服务尚未配置。" }, { status: 500 });
  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const articleId = typeof payload?.articleId === "string" ? payload.articleId : "";
  const canonical = getCanonical(articleId);
  if (!canonical) return NextResponse.json({ error: "文章标识无效。" }, { status: 400 });
  const sentences = normalizeBbcSyntaxSentenceEdits(payload?.sentences, canonical.sentences);
  if (!sentences) return NextResponse.json({ error: "标注范围无效：请检查标签、词汇范围和嵌套成分。" }, { status: 400 });

  const { error } = await supabase.from("bbc_article_syntax_overrides").upsert({
    article_id: articleId,
    sentences,
    updated_by: admin.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "article_id" });
  if (error) return NextResponse.json({ error: `保存失败：${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true });
}
