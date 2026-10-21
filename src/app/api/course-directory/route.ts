import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { COURSE_DIRECTORY_SLUG, parseCourseDirectory } from "@/lib/courses/course-directory";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createServiceClient(request: NextRequest) {
  const key = supabaseServiceKey ?? supabaseAnonKey;
  if (!supabaseUrl || !key) return null;
  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: !supabaseServiceKey && accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

async function requireAdmin(request: NextRequest, supabase: SupabaseClient) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 }) };

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return { response: NextResponse.json({ error: "管理员登录已失效，请重新登录。" }, { status: 401 }) };

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error || profile?.role !== "admin") {
    return { response: NextResponse.json({ error: "这个账号没有管理课程目录的权限。" }, { status: 403 }) };
  }
  return { user };
}

export async function PUT(request: NextRequest) {
  const supabase = createServiceClient(request);
  if (!supabase) return NextResponse.json({ error: "Supabase server configuration is incomplete." }, { status: 500 });

  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;

  const body = await request.json().catch(() => null) as { directory?: unknown } | null;
  const directory = parseCourseDirectory(body?.directory);
  if (!directory) return NextResponse.json({ error: "课程目录无效，请检查页面名称、路径和层级。" }, { status: 400 });

  const now = new Date().toISOString();
  const { error } = await supabase.from("managed_content_pages").upsert({
    access_feature_key: null,
    created_by: admin.user.id,
    is_paid_only: false,
    meta_json: directory,
    module: "site",
    published_at: now,
    slug: COURSE_DIRECTORY_SLUG,
    status: "published",
    summary: "英语课程栏目与子页面目录。",
    template_key: "site_announcement_page",
    title: "英语课程目录",
    updated_at: now,
  }, { onConflict: "slug" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("published-course-directory", { expire: 0 });
  revalidatePath("/courses");
  revalidatePath("/courses/[...slug]", "page");
  return NextResponse.json({ directory });
}
