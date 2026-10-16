import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { importBbcPdfOnServer } from "@/lib/admin/bbc-pdf-server";

export const runtime = "nodejs";
export const maxDuration = 60;
const maxBytes = 4 * 1024 * 1024;
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: "后台验证服务未配置。" }, { status: 503, headers });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401, headers });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error && (!error.status || error.status >= 500)) return NextResponse.json({ error: "后台登录验证服务暂时无法连接，请稍后重试。", retryable: true }, { status: 503, headers });
  if (error || !user) return NextResponse.json({ error: "管理员登录已失效，请重新登录。" }, { status: 401, headers });
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profileError || profile?.role !== "admin") return NextResponse.json({ error: "只有管理员可以导入 BBC 练习。" }, { status: 403, headers });
  if (Number(request.headers.get("content-length")) > maxBytes + 65536) return NextResponse.json({ error: "兼容模式支持不超过 4 MB 的 PDF。" }, { status: 413, headers });
  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !/\.pdf$/i.test(file.name) || !file.size || file.size > maxBytes) return NextResponse.json({ error: "请选择不超过 4 MB 的 PDF 文件。" }, { status: 400, headers });
    const quiz = await importBbcPdfOnServer(file);
    return NextResponse.json({ quiz }, { headers });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "PDF 无法识别，请核对文件。" }, { status: 400, headers });
  }
}
