import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { buildMembershipSalesReport, type GrantedMembership, type SalesOrder } from "@/lib/payment/membership-sales";

export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });

const getReport = unstable_cache(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("not-configured");
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  async function readAll<T>(table: string, columns: string, filter?: [string, string]): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 500) {
      let query = client.from(table).select(columns).order(table === "access_projects" ? "project_key" : "id").range(offset, offset + 499);
      if (filter) query = query.eq(...filter);
      const { data, error } = await query;
      if (error) throw new Error("unavailable");
      rows.push(...(data ?? []) as T[]);
      if (!data || data.length < 500) return rows;
    }
  }
  const [entitlements, orders, projects] = await Promise.all([
    readAll<GrantedMembership>("user_project_entitlements", "id,user_id,project_key,plan,status,starts_at,expires_at", ["status", "active"]),
    readAll<SalesOrder>("project_payment_requests", "id,user_id,project_key,plan,status,amount_cny,fulfilled_at", ["status", "fulfilled"]),
    readAll<{ project_key: string; title: string }>("access_projects", "project_key,title"),
  ]);
  const userIds = [...new Set(entitlements.map((row) => row.user_id))];
  const profiles: { id: string; email: string | null; display_name: string | null }[] = [];
  for (let offset = 0; offset < userIds.length; offset += 150) {
    const result = await client.from("profiles").select("id,email,display_name").in("id", userIds.slice(offset, offset + 150));
    if (result.error) throw new Error("unavailable");
    profiles.push(...result.data ?? []);
  }
  return buildMembershipSalesReport(entitlements, orders, profiles, projects);
}, ["admin-membership-sales-report-v1"], { revalidate: 15 });

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return json({ error: "会员统计服务尚未配置。" }, 503);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "请先登录管理员账号。" }, 401);
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return json({ error: "登录已失效。" }, 401);
  const role = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (role.error || role.data?.role !== "admin") return json({ error: "没有会员统计权限。" }, 403);
  try {
    const report = await getReport();
    const view = request.nextUrl.searchParams.get("view") ?? "summary";
    if (view === "summary") {
      return json({
        totalMembers: report.totalMembers,
        totalQualifications: report.totalQualifications,
        totalSalesCny: report.totalSalesCny,
        projects: report.projects,
        series: report.series,
      });
    }
    if (view === "members") {
      const parsedOffset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
      const parsedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
      const offset = Number.isFinite(parsedOffset) ? Math.max(0, Math.floor(parsedOffset)) : 0;
      const limit = Number.isFinite(parsedLimit) ? Math.min(20, Math.max(1, Math.floor(parsedLimit))) : 20;
      return json({
        total: report.members.length,
        offset,
        limit,
        hasMore: offset + limit < report.members.length,
        items: report.members.slice(offset, offset + limit),
      });
    }
    return json({ error: "不支持的会员统计视图。" }, 400);
  } catch { return json({ error: "会员与销售统计暂时无法读取，请稍后重试。" }, 503); }
}
