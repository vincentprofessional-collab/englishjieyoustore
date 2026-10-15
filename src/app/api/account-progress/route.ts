import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ACCOUNT_PROGRESS_BUCKET, emptyAccountSnapshot, mergeAccountSnapshots, sanitizeAccountSnapshot, type AccountSnapshot } from "@/lib/learning/account-progress";
export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const response = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
async function context(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return !error && data.user ? { user: data.user, storage: db.storage.from(ACCOUNT_PROGRESS_BUCKET) } : null;
}
async function read(storage: NonNullable<Awaited<ReturnType<typeof context>>>["storage"], path: string) {
  const result = await storage.download(path);
  if (result.error) {
    if (["404", "400"].includes(String((result.error as { statusCode?: string }).statusCode)) && /not found|does not exist/i.test(result.error.message)) return emptyAccountSnapshot();
    throw result.error;
  }
  return sanitizeAccountSnapshot(JSON.parse(await result.data.text()));
}
export async function GET(request: NextRequest) {
  const auth = await context(request); if (!auth) return response({ error: "请先登录。" }, 401);
  const deviceId = request.nextUrl.searchParams.get("deviceId") ?? "";
  if (!uuid.test(deviceId)) return response({ error: "设备编号无效。" }, 400);
  try {
    const listed = await auth.storage.list(auth.user.id, { limit: 100, sortBy: { column: "name", order: "asc" } });
    if (listed.error) throw listed.error;
    const snapshots = await Promise.all((listed.data ?? []).filter(file => file.name.endsWith(".json") && uuid.test(file.name.slice(0, -5))).map(async file => ({ id: file.name.slice(0, -5), snapshot: await read(auth.storage, `${auth.user.id}/${file.name}`) })));
    return response({ own: snapshots.find(item => item.id === deviceId)?.snapshot ?? emptyAccountSnapshot(), remote: mergeAccountSnapshots(snapshots.filter(item => item.id !== deviceId).map(item => item.snapshot)) });
  } catch { return response({ error: "账号进度暂时无法读取，本机记录已保留。" }, 503); }
}
export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return response({ error: "请求来源无效。" }, 403);
  const auth = await context(request); if (!auth) return response({ error: "请先登录。" }, 401);
  const body = await request.json().catch(() => null);
  if (!uuid.test(body?.deviceId ?? "") || !body?.snapshot || JSON.stringify(body.snapshot).length > 3_500_000) return response({ error: "进度记录无效或过大。" }, 400);
  try {
    const path = `${auth.user.id}/${body.deviceId}.json`;
    const snapshot: AccountSnapshot = mergeAccountSnapshots([await read(auth.storage, path), sanitizeAccountSnapshot(body.snapshot)], true);
    const saved = await auth.storage.upload(path, JSON.stringify(snapshot), { upsert: true, contentType: "application/json", cacheControl: "0" });
    if (saved.error) throw saved.error;
    return response({ ok: true });
  } catch { return response({ error: "进度暂未同步，本机记录已保留，将自动重试。" }, 503); }
}
