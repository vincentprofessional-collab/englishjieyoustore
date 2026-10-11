import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function authenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return user && !error ? { supabase, user } : null;
}

function failure(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function rpcError(error: { message?: string } | null) {
  if (!error) return null;
  return failure(error.message ?? "操作失败，请稍后重试。", /请先登录/.test(error.message ?? "") ? 401 : 400);
}

export async function GET(request: NextRequest) {
  const auth = await authenticatedClient();
  if (!auth) return failure("请先登录后使用进度共享。", 401);

  const mode = request.nextUrl.searchParams.get("mode") ?? "sharing";
  if (mode === "shared") {
    const requestId = request.nextUrl.searchParams.get("requestId");
    if (!requestId) return failure("授权记录无效。");
    const { data, error } = await auth.supabase.rpc("get_shared_learning_progress", { p_request_id: requestId });
    const errorResponse = rpcError(error);
    return errorResponse ?? NextResponse.json({ shared: data });
  }

  const { data, error } = await auth.supabase.rpc("get_my_learning_progress_sharing");
  const errorResponse = rpcError(error);
  return errorResponse ?? NextResponse.json({ sharing: data });
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedClient();
  if (!auth) return failure("请先登录后使用进度共享。", 401);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") return failure("请求内容无效。");

  if (body.action === "search") {
    const query = typeof body.email === "string" ? body.email.trim() : "";
    if (query.length < 5 || !query.includes("@")) return NextResponse.json({ users: [] });
    const { data, error } = await auth.supabase.rpc("search_learning_progress_users", { p_query: query });
    const errorResponse = rpcError(error);
    return errorResponse ?? NextResponse.json({ users: data ?? [] });
  }

  if (body.action === "request") {
    if (typeof body.targetUserId !== "string") return failure("请选择要查看的用户。");
    const { data, error } = await auth.supabase.rpc("request_learning_progress_access", { p_target_user_id: body.targetUserId });
    const errorResponse = rpcError(error);
    return errorResponse ?? NextResponse.json({ request: data });
  }

  if (body.action === "respond") {
    if (typeof body.requestId !== "string" || (body.decision !== "approved" && body.decision !== "declined")) {
      return failure("授权选择无效。");
    }
    const snapshot = body.decision === "approved" && body.snapshot && typeof body.snapshot === "object"
      ? body.snapshot
      : {};
    if (JSON.stringify(snapshot).length > 200_000) return failure("学习进度记录过大，请先清理本地缓存后重试。", 413);
    const { data, error } = await auth.supabase.rpc("respond_learning_progress_access", {
      p_decision: body.decision,
      p_request_id: body.requestId,
      p_snapshot: snapshot,
    });
    const errorResponse = rpcError(error);
    return errorResponse ?? NextResponse.json({ request: data });
  }

  if (body.action === "revoke") {
    if (typeof body.requestId !== "string") return failure("授权记录无效。");
    const { data, error } = await auth.supabase.rpc("revoke_learning_progress_access", { p_request_id: body.requestId });
    const errorResponse = rpcError(error);
    return errorResponse ?? NextResponse.json({ request: data });
  }

  if (body.action === "sync") {
    const snapshot = body.snapshot && typeof body.snapshot === "object" ? body.snapshot : null;
    if (!snapshot) return failure("学习进度记录无效。");
    if (JSON.stringify(snapshot).length > 200_000) return failure("学习进度记录过大，请稍后重试。", 413);
    const { data, error } = await auth.supabase.rpc("sync_my_learning_progress_snapshot", { p_snapshot: snapshot });
    const errorResponse = rpcError(error);
    return errorResponse ?? NextResponse.json({ result: data });
  }

  return failure("不支持的操作。");
}
