"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "./admin-site-message-manager.module.css";

type RecipientType = "user" | "visitor";
type Recipient = { id: string; label: string; firstSeenAt?: string; lastSeenAt?: string };
type SiteMessage = {
  id: string; title: string; body: string; imageUrls: string[]; recipientType: RecipientType;
  recipientId: string; recipientLabel: string; isPublished: boolean; updatedAt: string;
};

async function adminRequest<T>(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("管理员登录已失效，请重新登录。");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "操作失败，请重试。");
  return data as T;
}

export function AdminSiteMessageManager() {
  const [messages, setMessages] = useState<SiteMessage[]>([]);
  const [messageId, setMessageId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [recipientType, setRecipientType] = useState<RecipientType>("user");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const reloadMessages = useCallback(async () => {
    const result = await adminRequest<{ messages: SiteMessage[] }>("/api/admin/site-messages");
    setMessages(result.messages);
  }, []);

  const loadRecipients = useCallback(async (type: RecipientType, query = "") => {
    if (type === "user") {
      const result = await adminRequest<{ users: Recipient[] }>(`/api/admin/site-messages?kind=users&q=${encodeURIComponent(query)}`);
      setRecipients(result.users);
    } else {
      const result = await adminRequest<{ visitors: Recipient[] }>("/api/admin/site-messages?kind=visitors");
      setRecipients(result.visitors);
    }
  }, []);

  useEffect(() => { void reloadMessages().catch((reason) => setError(reason instanceof Error ? reason.message : "站内信列表载入失败。")); }, [reloadMessages]);
  useEffect(() => { void loadRecipients(recipientType).catch((reason) => setError(reason instanceof Error ? reason.message : "收件人列表载入失败。")); }, [loadRecipients, recipientType]);

  const options = useMemo(() => {
    const all = recipient ? [recipient, ...recipients] : recipients;
    return [...new Map(all.map((item) => [item.id, item])).values()];
  }, [recipient, recipients]);

  function resetForm() {
    setMessageId(""); setTitle(""); setBody(""); setImageUrls([]);
    setRecipientType("user"); setRecipient(null); setRecipientSearch(""); setIsPublished(false);
    setError(""); setNotice("");
  }

  function editMessage(message: SiteMessage) {
    setMessageId(message.id); setTitle(message.title); setBody(message.body); setImageUrls(message.imageUrls ?? []);
    setRecipientType(message.recipientType); setRecipient({ id: message.recipientId, label: message.recipientLabel });
    setRecipientSearch(""); setIsPublished(message.isPublished); setError(""); setNotice("");
  }

  async function searchRecipients() {
    setBusy(true); setError("");
    try { await loadRecipients(recipientType, recipientType === "user" ? recipientSearch.trim() : ""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "收件人列表载入失败。"); }
    finally { setBusy(false); }
  }

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (imageUrls.length + files.length > 8) { setError("一条站内信最多添加 8 张图片。"); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      for (const file of files) {
        const form = new FormData(); form.append("file", file); form.append("folder", "site-messages");
        const result = await adminRequest<{ publicUrl: string }>("/api/admin-image-upload", { method: "POST", body: form });
        setImageUrls((current) => [...current, result.publicUrl]);
      }
      setNotice("图片已上传，可在发送前移除不需要的图片。");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "图片上传失败。"); }
    finally { setBusy(false); }
  }

  async function saveMessage(publish: boolean) {
    if (!title.trim() || (!body.trim() && !imageUrls.length) || !recipient) {
      setError("请填写标题、正文或图片，并选择一位收件人。"); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...(messageId ? { id: messageId } : {}), title, body, imageUrls, recipientType, recipientId: recipient.id, isPublished: publish };
      const result = await adminRequest<{ id: string }>("/api/admin/site-messages", {
        method: messageId ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      setMessageId(result.id); setIsPublished(publish);
      await reloadMessages();
      setNotice(publish ? "站内信已发送，收件人下次打开网站时会看到弹窗。" : "草稿已保存，收件人暂时看不到。");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "站内信保存失败。"); }
    finally { setBusy(false); }
  }

  async function deleteMessage(id: string) {
    if (!window.confirm("删除这条站内信？收件人之后将无法看到它。")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminRequest("/api/admin/site-messages", { method: "DELETE", body: JSON.stringify({ id }) });
      if (messageId === id) resetForm();
      await reloadMessages(); setNotice("站内信已删除。");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "删除失败。"); }
    finally { setBusy(false); }
  }

  return <section className={`admin-editor-card ${styles.workspace}`}>
    <header className={styles.heading}>
      <div><span className="eyebrow">SITE MESSAGES</span><h2>站内信</h2><p>编辑文字和配图，定向发送给已注册用户或最近访问的访客；发送后会在对方打开网站时弹出。</p></div>
      <button className="button secondary" disabled={busy} onClick={resetForm} type="button">新建站内信</button>
    </header>
    <div className={styles.layout}>
      <aside className={styles.list} aria-label="站内信列表">
        <h3>已保存的站内信</h3>
        {messages.length ? messages.map((message) => <article className={`${styles.listItem} ${message.id === messageId ? styles.selected : ""}`} key={message.id}>
          <button className={styles.selectMessage} disabled={busy} onClick={() => editMessage(message)} type="button">
            <strong>{message.title}</strong><span>{message.recipientLabel}</span>
            <small>{message.isPublished ? "已发送" : "草稿"} · {new Date(message.updatedAt).toLocaleDateString("zh-CN")}</small>
          </button>
          <button aria-label={`删除${message.title}`} className={styles.delete} disabled={busy} onClick={() => void deleteMessage(message.id)} type="button">删除</button>
        </article>) : <p className={styles.empty}>还没有站内信。</p>}
      </aside>
      <div className={styles.form}>
        <label><span>标题</span><input maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="输入站内信标题" value={title} /></label>
        <label><span>收件人类型</span><select onChange={(event) => { const next = event.target.value as RecipientType; setRecipientType(next); setRecipient(null); }} value={recipientType}>
          <option value="user">已注册用户</option><option value="visitor">访客</option>
        </select></label>
        <div className={styles.recipientSearch}>
          {recipientType === "user" ? <input autoComplete="off" onChange={(event) => setRecipientSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchRecipients(); } }} placeholder="按注册邮箱搜索" value={recipientSearch} /> : <span>选择最近访问网站的访客</span>}
          <button className="button secondary" disabled={busy} onClick={() => void searchRecipients()} type="button">{recipientType === "user" ? "搜索用户" : "刷新访客"}</button>
        </div>
        <label><span>收件人</span><select onChange={(event) => setRecipient(options.find((item) => item.id === event.target.value) ?? null)} value={recipient?.id ?? ""}>
          <option value="">请选择收件人</option>{options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
        <label><span>正文</span><textarea maxLength={10000} onChange={(event) => setBody(event.target.value)} placeholder="输入消息内容，支持换行" rows={8} value={body} /></label>
        <label className={styles.upload}><span>配图（最多 8 张）</span><input accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" disabled={busy || imageUrls.length >= 8} multiple onChange={(event) => void uploadImages(event)} type="file" /></label>
        {imageUrls.length ? <div className={styles.imageGrid}>{imageUrls.map((url, index) => <div className={styles.imageCard} key={`${url}-${index}`}>
          <Image alt={`站内信配图 ${index + 1}`} height={180} src={url} unoptimized width={240} />
          <button aria-label={`移除第 ${index + 1} 张图片`} disabled={busy} onClick={() => setImageUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">移除</button>
        </div>)}</div> : null}
        {messageId ? <p className={styles.status}>当前状态：{isPublished ? "已发送" : "草稿"}</p> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
        <footer className={styles.actions}>
          <button className="button secondary" disabled={busy} onClick={() => void saveMessage(false)} type="button">{busy ? "保存中…" : "保存草稿"}</button>
          <button className="button primary" disabled={busy} onClick={() => void saveMessage(true)} type="button">{busy ? "保存中…" : "保存并发送"}</button>
        </footer>
      </div>
    </div>
  </section>;
}
