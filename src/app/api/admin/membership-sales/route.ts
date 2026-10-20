import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });

type RpcError = { code?: string; message: string };

function rpcFailure(error: RpcError) {
  if (error.code === "PGRST202" || error.code === "42883") {
    return json({ error: "会员统计升级尚未启用或 Supabase schema cache 尚未刷新。请管理员在 Supabase SQL Editor 执行 supabase/030_admin_analytics_dashboard.sql；若已执行，请刷新 PostgREST schema cache。" }, 503);
  }
  if (error.code === "PGRST301" || error.code === "401") return json({ error: "登录已失效。" }, 401);
  if (error.code === "42501") return json({ error: "没有会员统计权限，请使用管理员账号重新登录。" }, 403);
  return json({ error: `会员统计数据库查询失败：${error.message}` }, 503);
}

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "请先登录管理员账号。" }, 401);
  if (!url || !anonKey) return json({ error: "会员统计服务尚未配置。" }, 503);

  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const view = request.nextUrl.searchParams.get("view") ?? "summary";

  if (view === "summary") {
    const { data, error } = await userClient.rpc("get_admin_membership_sales_summary").abortSignal(request.signal);
    if (error) return rpcFailure(error);
    const summary = data as {
      total_members: number;
      total_qualifications: number;
      total_sales_cny: number;
      projects: { key: string; title: string; members: number }[];
      series: Record<string, { label: string; amount_cny: number }[]>;
    };
    return json({
      totalMembers: summary.total_members,
      totalQualifications: summary.total_qualifications,
      totalSalesCny: Number(summary.total_sales_cny),
      projects: summary.projects,
      series: Object.fromEntries(Object.entries(summary.series).map(([period, points]) => [
        period,
        points.map((point) => ({ label: point.label, amountCny: Number(point.amount_cny) })),
      ])),
    });
  }

  if (view === "members") {
    const parsedOffset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
    const parsedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
    const offset = Number.isFinite(parsedOffset) ? Math.max(0, Math.floor(parsedOffset)) : 0;
    const limit = Number.isFinite(parsedLimit) ? Math.min(20, Math.max(1, Math.floor(parsedLimit))) : 20;
    const { data, error } = await userClient.rpc("get_admin_membership_sales_page", {
      p_offset: offset,
      p_limit: limit,
    }).abortSignal(request.signal);
    if (error) return rpcFailure(error);
    const page = data as {
      total: number;
      offset: number;
      limit: number;
      has_more: boolean;
      items: { id: string; account: string; project: string; plan: string; price_cny: number | null; purchased_at: string | null; expires_at: string }[];
    };
    return json({
      total: page.total,
      offset: page.offset,
      limit: page.limit,
      hasMore: page.has_more,
      items: page.items.map((member) => ({
        id: member.id,
        account: member.account,
        project: member.project,
        plan: member.plan,
        priceCny: member.price_cny === null ? null : Number(member.price_cny),
        purchasedAt: member.purchased_at,
        expiresAt: member.expires_at,
      })),
    });
  }

  return json({ error: "不支持的会员统计视图。" }, 400);
}
