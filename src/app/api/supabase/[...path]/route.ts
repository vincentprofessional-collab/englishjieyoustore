export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};
const failure = (status: number, message: string) => Response.json({ message }, { status, headers: privateHeaders });
const maxBodyBytes = 3_500_000;

async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (
    !["auth", "rest"].includes(path[0]) || path[1] !== "v1" || path.length < 3 ||
    path.some(part => !/^[a-zA-Z0-9._~-]+$/.test(part) || part === "." || part === "..") ||
    (path[0] === "auth" && path[2] === "admin")
  ) return failure(404, "接口不存在。");

  const requestUrl = new URL(request.url);
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (request.headers.has("origin") && request.headers.get("origin") !== requestUrl.origin)
  ) return failure(403, "请求来源无效。");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return failure(503, "服务暂时不可用。");

  if (Number(request.headers.get("content-length")) > maxBodyBytes) return failure(413, "请求内容过大。");
  const headers = new Headers({ apikey: anonKey });
  for (const name of ["authorization", "content-type", "accept", "prefer", "range", "range-unit", "accept-profile", "content-profile", "x-client-info", "x-supabase-api-version"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const body = ["GET", "HEAD"].includes(request.method) ? null : await request.arrayBuffer();
    if (body && body.byteLength > maxBodyBytes) return failure(413, "请求内容过大。");
    // The upstream is fixed server configuration. Never forward site cookies, arbitrary destinations or a privileged key.
    const target = new URL(`/${path.join("/")}${requestUrl.search}`, supabaseUrl);
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(path[0] === "auth" ? 15_000 : 30_000)]),
    });
    if (upstream.status >= 300 && upstream.status < 400) return failure(502, "服务返回了无效的跳转。");

    const responseHeaders = new Headers(privateHeaders);
    for (const name of ["content-type", "content-range", "range-unit", "preference-applied", "retry-after", "www-authenticate", "x-request-id"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    return failure(error instanceof Error && error.name === "TimeoutError" ? 504 : 502, "服务连接暂时失败，请稍后重试。");
  }
}

export { forward as GET, forward as HEAD, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
