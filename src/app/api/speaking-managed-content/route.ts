import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildSpeakingManagedSections,
  isSpeakingContentSlug,
  normalizeSpeakingEditableContent,
} from "@/lib/ielts/speaking-managed-content";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

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
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      response: NextResponse.json({ error: "这个账号没有编辑口语内容的权限。" }, { status: 403 }),
    };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";

  if (!isSpeakingContentSlug(slug)) {
    return NextResponse.json({ error: "无效的口语页面标识。" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (!supabase) {
    return NextResponse.json({ page: null, sections: [] });
  }

  const { data: page, error: pageError } = await supabase
    .from("managed_content_pages")
    .select("id,title,summary,meta_json")
    .eq("slug", slug)
    .eq("module", "speaking")
    .eq("template_key", "speaking_topic_page")
    .eq("status", "published")
    .maybeSingle();

  if (pageError) {
    return NextResponse.json({ error: pageError.message }, { status: 500 });
  }

  if (!page) {
    return NextResponse.json({ page: null, sections: [] });
  }

  const { data: sections, error: sectionError } = await supabase
    .from("managed_content_page_sections")
    .select("section_key,title,content_json,sort_order")
    .eq("page_id", page.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (sectionError) {
    return NextResponse.json({ error: sectionError.message }, { status: 500 });
  }

  return NextResponse.json({
    page: {
      metaJson: page.meta_json,
      summary: page.summary,
      title: page.title,
    },
    sections: (sections ?? []).map((section) => ({
      contentJson: section.content_json,
      sectionKey: section.section_key,
      sortOrder: section.sort_order,
      title: section.title,
    })),
  });
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

  const payload = (await request.json().catch(() => null)) as { content?: unknown } | null;
  const content = normalizeSpeakingEditableContent(payload?.content);

  if (!content) {
    return NextResponse.json({ error: "提交的口语页面内容无效。" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: page, error: pageError } = await supabase
    .from("managed_content_pages")
    .upsert(
      {
        access_feature_key: null,
        created_by: adminResult.user.id,
        is_paid_only: false,
        meta_json: {
          answerHeading: content.answerHeading,
          band: content.band,
          heroLabel: content.heroLabel,
          partId: content.partId,
          questionId: content.questionId,
          timing: content.timing,
          year: content.year,
        },
        module: "speaking",
        published_at: now,
        slug: content.slug,
        status: "published",
        summary: `${content.partLabel} ${content.answerHeading} 前台编辑内容`,
        template_key: "speaking_topic_page",
        title: content.question,
        updated_at: now,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (pageError || !page) {
    return NextResponse.json({ error: pageError?.message ?? "保存页面失败。" }, { status: 500 });
  }

  const { data: templateSections } = await supabase
    .from("content_page_template_sections")
    .select("id,section_key")
    .eq("template_key", "speaking_topic_page");
  const templateSectionIdByKey = new Map(
    (templateSections ?? []).map((section) => [section.section_key, section.id]),
  );

  const sectionRows = buildSpeakingManagedSections(content).map((section) => ({
    content_json: section.contentJson,
    is_active: true,
    page_id: page.id,
    section_key: section.sectionKey,
    sort_order: section.sortOrder,
    template_section_id: templateSectionIdByKey.get(section.sectionKey) ?? null,
    title: section.title,
    updated_at: now,
  }));

  const { error: sectionError } = await supabase
    .from("managed_content_page_sections")
    .upsert(sectionRows, { onConflict: "page_id,section_key" });

  if (sectionError) {
    return NextResponse.json({ error: sectionError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
