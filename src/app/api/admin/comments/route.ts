import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getBbcArticleById } from "@/lib/articles/bbc";

export const dynamic = "force-dynamic";
type Source = "bbc" | "guide";
const tables = { bbc: "bbc_article_comments", guide: "guide_comments" };

async function authorize(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return { response: NextResponse.json({ error: "留言管理服务尚未配置。" }, { status: 503 }) };
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 }) };
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return { response: NextResponse.json({ error: "登录已失效。" }, { status: 401 }) };
  const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (profileError || profile?.role !== "admin") return { response: NextResponse.json({ error: "没有留言管理权限。" }, { status: 403 }) };
  return { client };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const query = request.nextUrl.searchParams;
  const since = (source: Source) => {
    const value = query.get(`since_${source}`) ?? "1970-01-01T00:00:00Z";
    return /^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? value : "1970-01-01T00:00:00Z";
  };
  const counts = await Promise.all((Object.keys(tables) as Source[]).map(async (source) => {
    const result = await auth.client.from(tables[source]).select("id", { count: "exact", head: true }).gt("created_at", since(source));
    if (result.error) throw new Error("留言数量暂时无法读取。");
    return [source, result.count ?? 0] as const;
  })).catch(() => null);
  if (!counts) return NextResponse.json({ error: "留言数量暂时无法读取。" }, { status: 503 });
  const unread = Object.fromEntries(counts);
  if (query.get("summary") === "1") return NextResponse.json({ unread });
  const source: Source = query.get("source") === "guide" ? "guide" : "bbc";
  const page = Math.max(0, Math.min(10000, Math.floor(Number(query.get("page")) || 0)));
  const result = await auth.client.from(tables[source])
    .select(source === "bbc" ? "id,article_id,author_name,body,created_at" : "id,post_id,display_name,body,created_at", { count: "exact" })
    .order("created_at", { ascending: false }).order("id", { ascending: false }).range(page * 50, page * 50 + 49);
  if (result.error) return NextResponse.json({ error: "留言列表暂时无法读取。" }, { status: 503 });
  const rows = (result.data ?? []) as unknown as Record<string, string>[];
  const titles = new Map<string, string>();
  const hrefs = new Map<string, string>();
  if (source === "guide" && rows.length) {
    const posts = await auth.client.from("managed_content_pages").select("id,title,slug").in("id", rows.map((row) => row.post_id));
    for (const post of posts.data ?? []) { titles.set(post.id, post.title); hrefs.set(post.id, `/#${post.slug}`); }
  }
  return NextResponse.json({
    unread, total: result.count ?? 0,
    comments: rows.map((row) => ({
      id: row.id, source, body: row.body, createdAt: row.created_at,
      author: source === "bbc" ? row.author_name : row.display_name,
      title: source === "bbc" ? getBbcArticleById(row.article_id)?.title ?? `BBC ${row.article_id}` : titles.get(row.post_id) ?? "页面帖子",
      href: source === "bbc" ? `/articles/${row.article_id}` : hrefs.get(row.post_id) ?? "/",
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body || !Object.hasOwn(tables, body.source) || typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) {
    return NextResponse.json({ error: "留言标识无效。" }, { status: 400 });
  }
  const result = await auth.client.from(tables[body.source as Source]).delete().eq("id", body.id).select("id");
  if (result.error) return NextResponse.json({ error: "删除失败，请稍后重试。" }, { status: 503 });
  if (!result.data?.length) return NextResponse.json({ error: "这条留言已不存在。" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
