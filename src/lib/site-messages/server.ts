import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

export async function getRequester(client: SupabaseClient, request: NextRequest): Promise<User | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

export async function requireAdmin(request: NextRequest) {
  const client = getServiceClient();
  if (!client) return { response: json({ error: "站内信服务暂时不可用。" }, 503) };
  const user = await getRequester(client, request);
  if (!user) return { response: json({ error: "请先登录管理员账号。" }, 401) };
  const { data: profile, error } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (error || profile?.role !== "admin") return { response: json({ error: "没有站内信管理权限。" }, 403) };
  return { client, user };
}

export type SiteMessageRecipientType = "user" | "visitor";

export async function recipientExists(client: SupabaseClient, type: SiteMessageRecipientType, id: string) {
  const result = type === "user"
    ? await client.from("profiles").select("id").eq("id", id).maybeSingle()
    : await client.from("site_message_visitors").select("visitor_id").eq("visitor_id", id).maybeSingle();
  return !result.error && Boolean(result.data);
}
