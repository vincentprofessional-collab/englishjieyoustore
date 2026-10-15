"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCommunityInbox } from "@/components/community-inbox-provider";
import type { CommunityItem } from "@/lib/community/inbox";

export default function MyPostsPage() {
  const { signedIn, initializing, inbox, error, loading, refresh, markRead } = useCommunityInbox();
  const [tab, setTab] = useState<"incoming" | "authored">("incoming");
  const [saveError, setSaveError] = useState("");
  const acknowledged = useRef("");
  useEffect(() => {
    if (tab !== "incoming" || !inbox?.incoming || !inbox.unread || !inbox.latestReplyAt || document.visibilityState !== "visible") return;
    const until = inbox.latestReplyAt;
    if (acknowledged.current === until) return;
    acknowledged.current = until;
    void markRead(until).catch(() => { setSaveError("已读状态未能保存，请点击“标为已读”重试。"); });
  }, [inbox, markRead, tab]);
  const items = (tab === "incoming" ? inbox?.incoming : inbox?.authored) ?? [];
  return <section className="my-community-page">
    <header><Link href="/me">← 我的</Link><h1>我发的帖子及留言</h1></header>
    {initializing ? <p role="status">正在读取登录状态……</p> : !signedIn ? <p>登录后查看自己的帖子、留言和收到的回复。<Link className="button primary" href="/login?redirect=%2Fme%2Fposts">登录 / 注册</Link></p> : <>
      <nav aria-label="帖子与留言" className="my-community-tabs">
        <button aria-pressed={tab === "incoming"} onClick={() => setTab("incoming")} type="button">收到的回复 {inbox?.incoming?.length ?? 0}</button>
        <button aria-pressed={tab === "authored"} onClick={() => setTab("authored")} type="button">我发的帖子及留言 {inbox?.authored?.length ?? 0}</button>
        <button disabled={loading} onClick={() => void refresh()} type="button">{loading ? "刷新中……" : "刷新"}</button>
      </nav>
      {error ? <p role="alert">{error}</p> : null}
      {saveError ? <p role="alert">{saveError} <button onClick={() => { if (inbox?.latestReplyAt) void markRead(inbox.latestReplyAt).then(() => setSaveError("")).catch(() => {}); }} type="button">标为已读</button></p> : null}
      {!inbox?.incoming ? <p role="status">{loading ? "正在读取帖子与留言……" : "点击刷新读取留言。"}</p> : items.length ? <div className="my-community-list">{items.map(item => <CommunityCard item={item} key={`${item.source}:${item.kind}:${item.id}`} />)}</div> : <p>{tab === "incoming" ? "目前还没有收到回复。" : "你还没有发表帖子或留言。"}</p>}
    </>}
  </section>;
}

function CommunityCard({ item }: { item: CommunityItem }) {
  return <article className="my-community-card">
    <header><span>{item.source === "bbc" ? "BBC 随身英语" : "网站帖子"} · {item.kind === "post" ? "原帖" : "留言"}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}</time></header>
    <h2>{item.title}</h2><strong>{item.author}</strong>
    <p>{item.body}</p><Link href={item.href}>查看原帖并回复 →</Link>
  </article>;
}
