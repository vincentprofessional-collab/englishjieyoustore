import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getArticleInlineSourceCatalog,
  getArticleInlineSourceDocument,
} from "@/lib/article-inline-annotation-sources";
import {
  isArticleInlineSourceType,
  normalizeArticleInlineAnnotations,
} from "@/lib/article-inline-annotations";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

function createServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function missingArticleInlineAnnotationsTable(error: { code?: string; message?: string }) {
  return error.code === "PGRST205" || error.code === "42P01" ||
    /could not find the table ['"]?public\.article_inline_annotations['"]? in the schema cache/i.test(error.message ?? "");
}

async function requireAdmin(request: NextRequest, supabase: SupabaseClient) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 }) };

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { response: NextResponse.json({ error: "管理员登录已失效，请重新登录。" }, { status: 401 }) };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || profile?.role !== "admin") {
    return { response: NextResponse.json({ error: "这个账号没有管理文章标注的权限。" }, { status: 403 }) };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  const sourceType = request.nextUrl.searchParams.get("sourceType");
  const sourceId = request.nextUrl.searchParams.get("sourceId") ?? "";
  const mode = request.nextUrl.searchParams.get("mode");

  if (!isArticleInlineSourceType(sourceType)) {
    return NextResponse.json({ error: "文章类型无效。" }, { status: 400 });
  }

  if (mode === "catalog" || mode === "document") {
    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "后台内容服务尚未配置。" }, { status: 500 });
    const admin = await requireAdmin(request, supabase);
    if ("response" in admin) return admin.response;

    if (mode === "catalog") {
      return NextResponse.json({ sources: getArticleInlineSourceCatalog(sourceType) });
    }
    const document = getArticleInlineSourceDocument(sourceType, sourceId);
    return document
      ? NextResponse.json({ document })
      : NextResponse.json({ error: "找不到这篇文章。" }, { status: 404 });
  }

  if (!sourceId || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "文章标识无效。" }, { status: 400 });
  }
  if (!getArticleInlineSourceDocument(sourceType, sourceId)) {
    return NextResponse.json({ error: "找不到这篇文章。" }, { status: 404 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase
    .from("article_inline_annotations")
    .select("annotations")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "暂时无法读取文章标注。" }, { status: 500 });
  const document = getArticleInlineSourceDocument(sourceType, sourceId)!;
  const annotations = normalizeArticleInlineAnnotations(data?.annotations ?? [], document.units);
  return NextResponse.json({ annotations: annotations ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "后台内容服务尚未配置。" }, { status: 500 });
  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const sourceType = payload?.sourceType;
  const sourceId = typeof payload?.sourceId === "string" ? payload.sourceId : "";
  if (!isArticleInlineSourceType(sourceType) || !sourceId) {
    return NextResponse.json({ error: "文章类型或标识无效。" }, { status: 400 });
  }

  const document = getArticleInlineSourceDocument(sourceType, sourceId);
  if (!document) return NextResponse.json({ error: "找不到这篇文章。" }, { status: 404 });
  const annotations = normalizeArticleInlineAnnotations(payload?.annotations, document.units);
  if (!annotations) {
    return NextResponse.json({ error: "标注数据无效：请检查选中文字、线型、必填内容和重叠范围。" }, { status: 400 });
  }

  const { error } = await supabase
    .from("article_inline_annotations")
    .upsert({
      annotations,
      source_id: sourceId,
      source_type: sourceType,
      updated_by: admin.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "source_type,source_id" });

  if (error) {
    const message = missingArticleInlineAnnotationsTable(error)
      ? "保存失败：Supabase 尚未识别 article_inline_annotations 表（表未创建或缓存未刷新）。请先执行 supabase/022_article_inline_annotations.sql，再重新保存。"
      : `保存失败：${error.message}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, annotations });
}
