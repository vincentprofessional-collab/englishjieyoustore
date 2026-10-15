import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { currentBbcEntitlements, publicBbcMembers, type BbcEntitlement } from "@/lib/payment/granted-members";

export const dynamic = "force-dynamic";
async function loadMembers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("unavailable");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows: BbcEntitlement[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("user_project_entitlements")
      .select("user_id,plan,status,project_key,starts_at,expires_at")
      .eq("project_key", "bbc").eq("status", "active").order("id").range(offset, offset + 499);
    if (error) throw new Error("unavailable");
    rows.push(...(data ?? []) as BbcEntitlement[]);
    if (!data || data.length < 500) break;
  }
  const now = Date.now(), current = currentBbcEntitlements(rows, now), accounts = new Map<string, string>();
  for (let offset = 0; offset < current.length; offset += 150) {
    const { data, error } = await client.from("profiles").select("id,email").in("id", current.slice(offset, offset + 150).map(row => row.user_id));
    if (error) throw new Error("unavailable");
    for (const row of data ?? []) accounts.set(row.id, row.email ?? "");
  }
  // Only anonymized rows enter the public cache or HTTP response.
  return publicBbcMembers(current, accounts, now);
}

export async function GET(request: NextRequest) {
  const page = Math.max(0, Math.min(10000, Math.floor(Number(request.nextUrl.searchParams.get("page")) || 0)));
  try {
    const members = await loadMembers();
    return NextResponse.json({ total: members.length, page, pageSize: 20, members: members.slice(page * 20, (page + 1) * 20) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "会员记录暂时无法读取。" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
