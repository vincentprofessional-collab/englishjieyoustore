export const AUTH_REQUEST_TIMEOUT_MS = 20_000;
const AUTH_REQUEST_TIMEOUT_MESSAGE = "Authentication request timed out.";

// Keep the project's original SDK URL (and cookie name), but send browser JSON requests through our site.
export function createBrowserSupabaseFetch(supabaseUrl: string): typeof fetch {
  const upstreamOrigin = new URL(supabaseUrl).origin;
  return (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (typeof window !== "undefined" && url.origin === upstreamOrigin && /^\/(auth|rest)\/v1\//.test(url.pathname)) {
      const target = new URL(`/api/supabase${url.pathname}${url.search}`, window.location.origin);
      input = input instanceof Request ? new Request(target, input) : target;
    }
    return fetchWithAuthTimeout(input, init);
  };
}

// Only Auth's small JSON responses use this deadline; media and database requests keep their own behavior.
export const fetchWithAuthTimeout: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!/^(?:\/api\/supabase)?\/auth\/v1\//.test(new URL(url, "https://local.invalid").pathname)) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const sourceSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const abortFromCaller = () => controller.abort(sourceSignal?.reason);
  if (sourceSignal?.aborted) abortFromCaller();
  else sourceSignal?.addEventListener("abort", abortFromCaller, { once: true });

  let timedOut = false;
  const timer = setTimeout(() => {
    if (!controller.signal.aborted) {
      timedOut = true;
      controller.abort();
    }
  }, AUTH_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    // Include a stalled response body in the deadline, before the SDK can save a session.
    const body = await response.arrayBuffer();
    return new Response(body.byteLength ? body : null, response);
  } catch (error) {
    if (timedOut) throw new Error(AUTH_REQUEST_TIMEOUT_MESSAGE);
    throw error;
  } finally {
    clearTimeout(timer);
    sourceSignal?.removeEventListener("abort", abortFromCaller);
  }
};

export function getAuthErrorFeedback(error: unknown) {
  const details = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown; name?: unknown; status?: unknown }
    : {};
  const code = typeof details.code === "string" ? details.code : "";
  const message = typeof details.message === "string" ? details.message : "";
  const status = typeof details.status === "number" ? details.status : null;

  if (message.includes(AUTH_REQUEST_TIMEOUT_MESSAGE) || details.name === "TimeoutError") {
    return { kind: "timeout", message: "连接登录服务超时，请切换 Wi-Fi 或手机流量后重试。" };
  }
  if (status === 429 || code.startsWith("over_") || /too many requests|rate limit/i.test(message)) {
    return { kind: "rate-limit", message: "操作过于频繁，请稍后再试，暂时不要连续点击或重复发送邮件。" };
  }
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
    return { kind: "unconfirmed", message: "邮箱尚未验证，请先打开注册确认邮件中的链接；未收到时可重新发送确认邮件。" };
  }
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return { kind: "credentials", message: "邮箱或密码不正确，请检查后重试。" };
  }
  if (status !== null && status >= 500) {
    return { kind: "server", message: "登录服务暂时不可用，请稍后重试。" };
  }
  if (details.name === "SecurityError" || details.name === "QuotaExceededError") {
    return { kind: "storage", message: "浏览器未能保存登录状态，请允许本站使用 Cookie，或更换浏览器后重试。" };
  }
  if ((details.name === "AuthRetryableFetchError" && status === 0) ||
      /failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(message)) {
    return { kind: "network", message: "连接登录服务失败，请切换 Wi-Fi 或手机流量后重试；仍失败时可换用其他浏览器。" };
  }
  if (code === "weak_password") {
    return { kind: "password", message: "密码强度不足，请换用更长且不常见的密码。" };
  }
  return { kind: "unknown", message: "操作未完成，请刷新页面后重试；仍失败时请反馈提示截图和发生时间。" };
}

export function reportAuthFailure(operation: string, error: unknown, startedAt: number) {
  const status = error && typeof error === "object" && "status" in error && typeof error.status === "number"
    ? error.status : null;
  // Keep credentials, user identity and raw server messages out of diagnostics.
  console.warn("auth_request_failed", {
    operation,
    category: getAuthErrorFeedback(error).kind,
    status,
    elapsedMs: Math.max(0, Date.now() - startedAt),
    occurredAt: new Date().toISOString(),
  });
}
