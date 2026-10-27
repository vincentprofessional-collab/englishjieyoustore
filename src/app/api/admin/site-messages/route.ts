import { NextRequest } from "next/server";
import { isUuid, json, recipientExists, requireAdmin, type SiteMessageRecipientType } from "@/lib/site-messages/server";

export const dynamic = "force-dynamic";

function parseMessage(body: Record<string, unknown> | null) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.body === "string" ? body.body.trim() : "";
  const type = body?.recipientType;
  const id = body?.recipientId;
  const imageUrls = body?.imageUrls;
  if (!title || title.length > 120 || content.length > 10000) return null;
  if ((type !== "user" && type !== "visitor") || !isUuid(id)) return null;
  if (!Array.isArray(imageUrls) || imageUrls.length > 8 || !imageUrls.every((url) => {
    if (typeof url !== "string" || url.length > 2048) return false;
    try { return ["http:", "https:"].includes(new URL(url).protocol); } catch { return url.startsWith("/"); }
  })) return null;
  if (!content && imageUrls.length === 0) return null;
  return {
    title,
    body: content,
    image_urls: imageUrls as string[],
    recipient_type: type as SiteMessageRecipientType,
    recipient_id: id,
    is_published: body?.isPublished === true,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const query = request.nextUrl.searchParams;
  const kind = query.get("kind");
  if (kind === "users") {
    const search = (query.get("q") ?? "").trim().replace(/[%_]/g, "").slice(0, 100);
    let lookup = auth.client.from("profiles").select("id,email,display_name,created_at").order("created_at", { ascending: false }).limit(30);
    if (search) lookup = lookup.ilike("email", `%${search}%`);
    const { data, error } = await lookup;
    return error ? json({ error: "用户列表暂时无法载入。" }, 503) : json({ users: (data ?? []).map((row) => ({
      id: row.id, label: row.email || row.display_name || row.id,
    })) });
  }
  if (kind === "visitors") {
    const { data, error } = await auth.client.from("site_message_visitors")
      .select("visitor_id,first_seen_at,last_seen_at").order("last_seen_at", { ascending: false }).limit(100);
    return error ? json({ error: "访客列表暂时无法载入。" }, 503) : json({ visitors: (data ?? []).map((row) => ({
      id: row.visitor_id, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at,
    })) });
  }

  const { data, error } = await auth.client.from("site_messages")
    .select("id,title,body,image_urls,recipient_type,recipient_id,is_published,created_at,updated_at")
    .order("updated_at", { ascending: false }).limit(150);
  if (error) return json({ error: "站内信列表暂时无法载入。" }, 503);
  const rows = data ?? [];
  const userIds = [...new Set(rows.filter((row) => row.recipient_type === "user").map((row) => row.recipient_id))];
  const visitorIds = [...new Set(rows.filter((row) => row.recipient_type === "visitor").map((row) => row.recipient_id))];
  const [users, visitors] = await Promise.all([
    userIds.length ? auth.client.from("profiles").select("id,email,display_name").in("id", userIds) : Promise.resolve({ data: [], error: null }),
    visitorIds.length ? auth.client.from("site_message_visitors").select("visitor_id,last_seen_at").in("visitor_id", visitorIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (users.error || visitors.error) return json({ error: "收件人信息暂时无法载入。" }, 503);
  const userLabels = new Map((users.data ?? []).map((row) => [row.id, row.email || row.display_name || "注册用户"]));
  const visitorLabels = new Map((visitors.data ?? []).map((row) => [row.visitor_id, `访客 ${row.visitor_id.slice(0, 8)} · 最近访问 ${new Date(row.last_seen_at).toLocaleString("zh-CN")}`]));
  return json({ messages: rows.map((row) => ({
    id: row.id, title: row.title, body: row.body, imageUrls: row.image_urls,
    recipientType: row.recipient_type, recipientId: row.recipient_id,
    recipientLabel: row.recipient_type === "user" ? userLabels.get(row.recipient_id) ?? "已注册用户" : visitorLabels.get(row.recipient_id) ?? `访客 ${row.recipient_id.slice(0, 8)}`,
    isPublished: row.is_published, createdAt: row.created_at, updatedAt: row.updated_at,
  })) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const message = parseMessage(body);
  if (!message || !await recipientExists(auth.client, message.recipient_type, message.recipient_id)) {
    return json({ error: "请填写标题、正文或图片，并选择有效的收件人。" }, 400);
  }
  const { data, error } = await auth.client.from("site_messages").insert({ ...message, created_by: auth.user.id })
    .select("id").single();
  return error ? json({ error: "站内信保存失败，请重试。" }, 503) : json({ id: data.id }, 201);
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!isUuid(body?.id)) return json({ error: "站内信编号无效。" }, 400);
  const message = parseMessage(body);
  if (!message || !await recipientExists(auth.client, message.recipient_type, message.recipient_id)) {
    return json({ error: "请填写标题、正文或图片，并选择有效的收件人。" }, 400);
  }
  const { data, error } = await auth.client.from("site_messages").update({ ...message, updated_at: new Date().toISOString() })
    .eq("id", body.id).select("id").maybeSingle();
  if (error) return json({ error: "站内信保存失败，请重试。" }, 503);
  return data ? json({ id: data.id }) : json({ error: "站内信不存在。" }, 404);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null);
  if (!isUuid(body?.id)) return json({ error: "站内信编号无效。" }, 400);
  const { data, error } = await auth.client.from("site_messages").delete().eq("id", body.id).select("id");
  if (error) return json({ error: "站内信删除失败，请重试。" }, 503);
  return data?.length ? json({ ok: true }) : json({ error: "站内信不存在。" }, 404);
}
