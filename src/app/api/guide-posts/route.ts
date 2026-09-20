import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPaidPageContentSlug } from "@/lib/access-control";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

const GUIDE_POST_SELECT =
  "id,slug,title,summary,status,meta_json,published_at,created_at,updated_at";

function createServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdminUser(request: NextRequest, supabase: SupabaseClient) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return {
      response: NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 }),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      response: NextResponse.json({ error: "管理员登录已失效，请重新登录。" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return {
      response: NextResponse.json({ error: "这个账号没有管理首页帖子的权限。" }, { status: 403 }),
    };
  }

  return { user };
}

function readPostPayload(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const post = value as Record<string, unknown>;
  const title = typeof post.title === "string" ? post.title.trim() : "";
  const slug = typeof post.slug === "string" ? post.slug.trim() : "";
  const status = post.status === "published" || post.status === "archived" ? post.status : "draft";
  const blocks = Array.isArray(post.blocks) ? post.blocks : [];

  if (!title || !slug || !blocks.length) {
    return null;
  }

  return {
    author: typeof post.author === "string" ? post.author.trim() : "",
    blocks,
    excerpt: typeof post.excerpt === "string" ? post.excerpt.trim() : "",
    id: typeof post.id === "string" && post.id ? post.id : null,
    publishedAt: typeof post.publishedAt === "string" ? post.publishedAt : null,
    slug,
    status,
    title,
  };
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase service key is not configured." }, { status: 500 });
  }

  const adminResult = await requireAdminUser(request, supabase);
  if ("response" in adminResult) {
    return adminResult.response;
  }

  const isPaidPage = request.nextUrl.searchParams.get("scope") === "paid";
  const projectKey = request.nextUrl.searchParams.get("projectKey")?.trim() ?? "";
  if (isPaidPage && !projectKey) {
    return NextResponse.json({ error: "缺少收费项目标识。" }, { status: 400 });
  }
  const query = supabase.from("managed_content_pages").select(GUIDE_POST_SELECT);
  const { data, error } = isPaidPage
    ? await query
        .eq("slug", getPaidPageContentSlug(projectKey))
        .eq("module", "site")
        .eq("template_key", "site_announcement_page")
        .limit(1)
    : await query.like("slug", "guide-%").order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase service key is not configured." }, { status: 500 });
  }

  const adminResult = await requireAdminUser(request, supabase);
  if ("response" in adminResult) {
    return adminResult.response;
  }

  const body = (await request.json().catch(() => null)) as {
    post?: unknown;
    projectKey?: string;
    scope?: string;
  } | null;
  const post = readPostPayload(body?.post);
  if (!post) {
    return NextResponse.json({ error: "提交的帖子内容无效。" }, { status: 400 });
  }

  const isPaidPage = body?.scope === "paid";
  const projectKey = body?.projectKey?.trim() ?? "";
  if (isPaidPage && !projectKey) {
    return NextResponse.json({ error: "缺少收费项目标识。" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const firstImageBlock = post.blocks.find(
    (block): block is Record<string, unknown> =>
      Boolean(block) &&
      typeof block === "object" &&
      block.type === "image" &&
      typeof block.url === "string" &&
      Boolean(block.url),
  );
  const payload = {
    access_feature_key: null,
    cover_image_url: typeof firstImageBlock?.url === "string" ? firstImageBlock.url : null,
    created_by: adminResult.user.id,
    is_paid_only: false,
    meta_json: {
      author: post.author,
      blocks: post.blocks,
      excerpt: post.excerpt,
      kind: "guide-post",
    },
    module: "site",
    published_at: post.status === "published" ? post.publishedAt ?? now : post.publishedAt,
    slug: isPaidPage ? getPaidPageContentSlug(projectKey) : post.slug,
    status: post.status,
    summary: post.excerpt,
    template_key: "site_announcement_page",
    title: post.title,
    updated_at: now,
  };

  const query = post.id
    ? supabase
        .from("managed_content_pages")
        .update(payload)
        .eq("id", post.id)
        .select(GUIDE_POST_SELECT)
        .maybeSingle()
    : supabase
        .from("managed_content_pages")
        .insert(payload)
        .select(GUIDE_POST_SELECT)
        .single();

  const { data, error } = await query;
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "保存帖子失败。" }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase service key is not configured." }, { status: 500 });
  }

  const adminResult = await requireAdminUser(request, supabase);
  if ("response" in adminResult) {
    return adminResult.response;
  }

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "缺少要删除的帖子。" }, { status: 400 });
  }

  const { error } = await supabase.from("managed_content_pages").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
