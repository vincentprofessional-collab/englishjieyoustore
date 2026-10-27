import { NextRequest } from "next/server";
import { getRequester, getServiceClient, isUuid, json } from "@/lib/site-messages/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const client = getServiceClient();
  if (!client) return json({ error: "站内信服务暂时不可用。" }, 503);
  const visitorId = request.nextUrl.searchParams.get("visitorId");
  if (visitorId && !isUuid(visitorId)) return json({ error: "访客编号无效。" }, 400);

  const user = await getRequester(client, request);
  if (visitorId) {
    const { error } = await client.from("site_message_visitors").upsert(
      { visitor_id: visitorId, last_seen_at: new Date().toISOString() }, { onConflict: "visitor_id" },
    );
    if (error) return json({ error: "访客信息暂时无法保存。" }, 503);
  }

  const identities = [
    ...(user ? [{ type: "user" as const, id: user.id }] : []),
    ...(visitorId ? [{ type: "visitor" as const, id: visitorId }] : []),
  ];
  const groups = await Promise.all(identities.map(async (identity) => {
    const { data, error } = await client.from("site_messages")
      .select("id,title,body,image_urls,recipient_type,recipient_id,created_at")
      .eq("recipient_type", identity.type).eq("recipient_id", identity.id).eq("is_published", true)
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
  })).catch(() => null);
  if (!groups) return json({ error: "站内信暂时无法载入。" }, 503);
  const messages = [...new Map(groups.flat().map((message) => [message.id, message])).values()];
  if (!messages.length) return json({ messages: [] });

  const messageIds = messages.map((message) => message.id);
  const readGroups = await Promise.all(identities.map(async (identity) => {
    const { data, error } = await client.from("site_message_reads").select("message_id")
      .eq("recipient_type", identity.type).eq("recipient_id", identity.id).in("message_id", messageIds);
    if (error) throw error;
    return data ?? [];
  })).catch(() => null);
  if (!readGroups) return json({ error: "站内信已读状态暂时无法载入。" }, 503);
  const readIds = new Set(readGroups.flat().map((row) => row.message_id));
  return json({ messages: messages.filter((message) => !readIds.has(message.id)).map((message) => ({
    id: message.id,
    title: message.title,
    body: message.body,
    imageUrls: message.image_urls,
    recipientType: message.recipient_type,
    recipientId: message.recipient_id,
    createdAt: message.created_at,
  })) });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "请求来源无效。" }, 403);
  const client = getServiceClient();
  if (!client) return json({ error: "站内信服务暂时不可用。" }, 503);
  const body = await request.json().catch(() => null);
  if (!isUuid(body?.messageId) || !isUuid(body?.recipientId) || !["user", "visitor"].includes(body?.recipientType)) {
    return json({ error: "站内信信息无效。" }, 400);
  }
  const type = body.recipientType as "user" | "visitor";
  const user = await getRequester(client, request);
  if (type === "user" && user?.id !== body.recipientId) return json({ error: "不能修改其他用户的已读状态。" }, 403);
  if (type === "visitor" && body.visitorId !== body.recipientId) return json({ error: "访客编号无效。" }, 403);

  const { data: message, error: lookupError } = await client.from("site_messages").select("id")
    .eq("id", body.messageId).eq("recipient_type", type).eq("recipient_id", body.recipientId).eq("is_published", true).maybeSingle();
  if (lookupError) return json({ error: "站内信暂时无法载入。" }, 503);
  if (!message) return json({ error: "这条站内信不存在或已撤回。" }, 404);
  const { error } = await client.from("site_message_reads").upsert({
    message_id: body.messageId, recipient_type: type, recipient_id: body.recipientId, read_at: new Date().toISOString(),
  }, { onConflict: "message_id,recipient_type,recipient_id" });
  return error ? json({ error: "已读状态暂时无法保存。" }, 503) : json({ ok: true });
}
