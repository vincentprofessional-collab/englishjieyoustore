"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin/request";
import styles from "./admin-comment-inbox.module.css";

type Source = "bbc" | "guide";
type InboxComment = { id: string; source: Source; author: string; body: string; createdAt: string; title: string; href: string };
type Counts = Record<Source, number>;
const emptyCounts: Counts = { bbc: 0, guide: 0 };

export function useAdminCommentInbox(userId: string | null, open: boolean) {
  const [unread, setUnread] = useState<Counts>(emptyCounts);
  const [source, setSource] = useState<Source>("bbc");
  const [page, setPage] = useState(0);
  const [comments, setComments] = useState<InboxComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const seenRef = useRef<Partial<Record<Source, string>>>({});

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!userId) return;
    const query = new URLSearchParams({ source, page: String(page), ...(open ? {} : { summary: "1" }) });
    for (const name of ["bbc", "guide"] as Source[]) if (seenRef.current[name]) query.set(`since_${name}`, seenRef.current[name]!);
    try {
      if (open) setLoading(true);
      const result = await adminRequest(`/api/admin/comments?${query}`, { signal });
      if (signal?.aborted) return;
      setError("");
      const counts = { ...result.unread } as Counts;
      if (open) {
        setComments(result.comments); setTotal(result.total);
        const newest = result.comments[0]?.createdAt;
        if (page === 0 && newest) {
          seenRef.current = { ...seenRef.current, [source]: newest };
          try { localStorage.setItem(`bbc.admin.comment-seen.${userId}`, JSON.stringify(seenRef.current)); } catch { /* Viewing still works when storage is unavailable. */ }
          counts[source] = 0;
        }
      }
      setUnread(counts);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "留言暂时无法读取。");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [userId, open, source, page]);

  useEffect(() => {
    try { seenRef.current = JSON.parse(localStorage.getItem(`bbc.admin.comment-seen.${userId}`) ?? "{}"); } catch { seenRef.current = {}; }
    setUnread(emptyCounts);
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const update = () => { if (document.visibilityState === "visible") void refresh(controller.signal); };
    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { controller.abort(); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, [userId, refresh]);

  async function deleteComment(comment: InboxComment) {
    if (!window.confirm("确定删除这条留言吗？关联回复可能一同删除。")) return;
    setDeleting(comment.id);
    try {
      await adminRequest("/api/admin/comments", { method: "DELETE", body: JSON.stringify({ source: comment.source, id: comment.id }) });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "删除失败。"); }
    finally { setDeleting(null); }
  }
  return { unread, count: unread.bbc + unread.guide, comments, total, page, setPage, source, setSource, loading, error, deleting, refresh, deleteComment };
}

export function AdminCommentNotice({ count, onOpen }: { count: number; onOpen: () => void }) {
  return <button aria-label={`留言管理${count ? `，${count} 条新留言` : ""}`} className={`button secondary ${styles.notice}`} onClick={onOpen} type="button">
    留言{count > 0 ? <span className={styles.badge}>{count > 99 ? "99+" : count}</span> : null}
  </button>;
}

export function AdminCommentInbox({ inbox }: { inbox: ReturnType<typeof useAdminCommentInbox> }) {
  return <section className={styles.panel}>
    <header><h2>留言管理</h2><button className="button secondary" disabled={inbox.loading} onClick={() => void inbox.refresh()} type="button">刷新</button></header>
    <div className={styles.tabs}>{(["bbc", "guide"] as Source[]).map((source) => <button aria-pressed={inbox.source === source} className={`button ${inbox.source === source ? "primary" : "secondary"}`} key={source} onClick={() => { inbox.setSource(source); inbox.setPage(0); }} type="button">{source === "bbc" ? "BBC 文章" : "页面帖子"}{inbox.unread[source] ? ` · ${inbox.unread[source]}` : ""}</button>)}</div>
    {inbox.error ? <p role="alert">{inbox.error}</p> : null}
    {inbox.loading ? <p>正在读取留言…</p> : null}
    {!inbox.loading && !inbox.error && !inbox.comments.length ? <p>目前没有留言。</p> : null}
    <div className={styles.list}>{inbox.comments.map((comment) => <article key={comment.id}>
      <div><header><strong>{comment.author}</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString("zh-CN")}</time></header><Link href={comment.href} target="_blank">{comment.title} ↗</Link><p>{comment.body}</p></div>
      <button className="button danger" disabled={inbox.deleting === comment.id} onClick={() => void inbox.deleteComment(comment)} type="button">{inbox.deleting === comment.id ? "删除中…" : "删除"}</button>
    </article>)}</div>
    <footer><button className="button secondary" disabled={!inbox.page || inbox.loading} onClick={() => inbox.setPage(inbox.page - 1)} type="button">上一页</button><span>第 {inbox.page + 1} 页 · 共 {inbox.total} 条</span><button className="button secondary" disabled={(inbox.page + 1) * 50 >= inbox.total || inbox.loading} onClick={() => inbox.setPage(inbox.page + 1)} type="button">下一页</button></footer>
  </section>;
}
