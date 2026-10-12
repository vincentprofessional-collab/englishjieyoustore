import { supabase } from "@/lib/supabase/client";

async function getAccessToken(refresh = false) {
  if (refresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) throw new Error("本地管理员登录状态已过期，请重新登录本地后台。");
    return data.session.access_token;
  }

  const { data, error } = await supabase.auth.getSession();
  if (!error && data.session?.access_token) return data.session.access_token;

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session?.access_token) throw new Error("本地管理员登录状态已过期，请重新登录本地后台。");
  return refreshed.session.access_token;
}

async function sendAdminRequest(path: string, options: RequestInit, accessToken: string) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...options, headers, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  return { response, result };
}

export async function adminRequest(path: string, options: RequestInit = {}) {
  let accessToken = await getAccessToken();
  let { response, result } = await sendAdminRequest(path, options, accessToken);

  if (response.status === 401 && /登录已失效|请先登录管理员账号/.test(String(result.error ?? ""))) {
    accessToken = await getAccessToken(true);
    ({ response, result } = await sendAdminRequest(path, options, accessToken));
  }

  if (response.status === 503 && result.retryable === true) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    ({ response, result } = await sendAdminRequest(path, options, accessToken));
  }

  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "操作失败，请稍后重试。");
  return result;
}
