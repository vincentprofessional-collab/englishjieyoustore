import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPaidPageContentSlug } from "@/lib/access-control";
import {
  mergeSiteChromeConfig,
  SITE_CHROME_SLUG,
  SITE_CHROME_VERSION,
} from "@/lib/content/site-chrome";
import { syncGuidePostNavigation } from "@/lib/content/guide-post-navigation";
import type { GuideMenuPlacement } from "@/lib/guide/posts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const GUIDE_POST_SELECT =
  "id,slug,title,summary,status,meta_json,published_at,created_at,updated_at";

type GuidePostStatus = "archived" | "draft" | "published";

type GuidePostPayload = {
  author: string;
  blocks: unknown[];
  excerpt: string;
  id: string | null;
  menuPlacement: GuideMenuPlacement | null;
  publishedAt: string | null;
  slug: string;
  status: GuidePostStatus;
  title: string;
};

function createServiceClient(request: NextRequest) {
  const key = supabaseServiceKey ?? supabaseAnonKey;
  if (!supabaseUrl || !key) {
    return null;
  }

  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global:
      !supabaseServiceKey && accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
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

function readPostPayload(value: unknown): GuidePostPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const post = value as Record<string, unknown>;
  const meta = post.meta_json && typeof post.meta_json === "object"
    ? (post.meta_json as Record<string, unknown>)
    : {};
  const title = typeof post.title === "string" ? post.title.trim() : "";
  const slug = typeof post.slug === "string" ? post.slug.trim() : "";
  const status = post.status === "published" || post.status === "archived" ? post.status : "draft";
  const blocks = Array.isArray(post.blocks)
    ? post.blocks
    : Array.isArray(meta.blocks)
      ? meta.blocks
      : [];

  if (!title || !slug || !blocks.length) {
    return null;
  }

  return {
    author: typeof post.author === "string"
      ? post.author.trim()
      : typeof meta.author === "string"
        ? meta.author.trim()
        : "",
    blocks,
    excerpt: typeof post.excerpt === "string"
      ? post.excerpt.trim()
      : typeof meta.excerpt === "string"
        ? meta.excerpt.trim()
        : "",
    id: typeof post.id === "string" && post.id ? post.id : null,
    menuPlacement: readMenuPlacement(meta.menuPlacement ?? post.menuPlacement),
    publishedAt: typeof post.publishedAt === "string"
      ? post.publishedAt
      : typeof post.published_at === "string"
        ? post.published_at
        : null,
    slug,
    status,
    title,
  };
}

function readMenuPlacement(value: unknown): GuideMenuPlacement | null {
  if (!value || typeof value !== "object") return null;
  const placement = value as Record<string, unknown>;

  if (placement.kind === "top") {
    return { kind: "top", parentId: null };
  }

  if (placement.kind === "sidebar" && typeof placement.parentId === "string" && placement.parentId) {
    return { kind: "sidebar", parentId: placement.parentId };
  }

  return null;
}

async function syncSiteChromeForPost(
  supabase: SupabaseClient,
  adminUserId: string,
  post: {
    menuPlacement: GuideMenuPlacement | null;
    slug: string;
    status: "archived" | "draft" | "published";
    title: string;
  },
) {
  const { data: chromeRow, error: chromeReadError } = await supabase
    .from("managed_content_pages")
    .select("id,meta_json")
    .eq("slug", SITE_CHROME_SLUG)
    .maybeSingle();

  if (chromeReadError) {
    throw new Error(`读取导航配置失败：${chromeReadError.message}`);
  }

  const config = mergeSiteChromeConfig(chromeRow?.meta_json);
  const nextConfig = syncGuidePostNavigation(
    config,
    post.slug,
    post.title,
    post.status,
    post.menuPlacement,
  );
  const now = new Date().toISOString();
  const configPayload = {
    meta_json: { ...nextConfig, version: SITE_CHROME_VERSION },
    published_at: now,
    status: "published",
    updated_at: now,
  };

  const result = chromeRow?.id
    ? await supabase
        .from("managed_content_pages")
        .update(configPayload)
        .eq("id", chromeRow.id)
    : await supabase.from("managed_content_pages").insert({
        ...configPayload,
        access_feature_key: null,
        created_by: adminUserId,
        is_paid_only: false,
        module: "site",
        slug: SITE_CHROME_SLUG,
        summary: "网站导航栏、品牌信息、底部链接、社交入口和二维码广告设置。",
        template_key: "site_announcement_page",
        title: "导航与底部",
      });

  if (result.error) {
    throw new Error(`更新导航配置失败：${result.error.message}`);
  }

  revalidateTag("published-site-chrome", "max");
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient(request);

  if (!supabase) {
    return NextResponse.json({ error: "Supabase server configuration is incomplete." }, { status: 500 });
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
  const supabase = createServiceClient(request);

  if (!supabase) {
    return NextResponse.json({ error: "Supabase server configuration is incomplete." }, { status: 500 });
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
    (block): block is Record<string, unknown> => {
      if (!block || typeof block !== "object") {
        return false;
      }
      const candidate = block as Record<string, unknown>;
      return candidate.type === "image" && typeof candidate.url === "string" && Boolean(candidate.url);
    },
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
      menuPlacement: post.menuPlacement,
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

  if (!isPaidPage) {
    try {
      await syncSiteChromeForPost(supabase, adminResult.user.id, post);
    } catch (navigationError) {
      return NextResponse.json(
        { error: navigationError instanceof Error ? navigationError.message : "帖子已保存，但菜单更新失败。" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient(request);

  if (!supabase) {
    return NextResponse.json({ error: "Supabase server configuration is incomplete." }, { status: 500 });
  }

  const adminResult = await requireAdminUser(request, supabase);
  if ("response" in adminResult) {
    return adminResult.response;
  }

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "缺少要删除的帖子。" }, { status: 400 });
  }

  const { data: post } = await supabase
    .from("managed_content_pages")
    .select("slug,title")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("managed_content_pages").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (post?.slug?.startsWith("guide-")) {
    try {
      await syncSiteChromeForPost(supabase, adminResult.user.id, {
        menuPlacement: null,
        slug: post.slug,
        status: "archived",
        title: post.title,
      });
    } catch (navigationError) {
      return NextResponse.json(
        { error: navigationError instanceof Error ? navigationError.message : "帖子已删除，但菜单移除失败。" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
