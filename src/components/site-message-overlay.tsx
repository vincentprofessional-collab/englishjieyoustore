"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getSiteVisitorId } from "@/lib/site-messages/visitor";
import styles from "./site-message-overlay.module.css";

type SiteMessage = {
  id: string;
  title: string;
  body: string;
  imageUrls: string[];
  recipientType: "user" | "visitor";
  recipientId: string;
};

export function SiteMessageOverlay() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<SiteMessage[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const message = messages[0];

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    void supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session); }).catch(() => {});
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const visitorId = getSiteVisitorId();
        const response = await fetch(`/api/site-messages?visitorId=${encodeURIComponent(visitorId)}`, {
          cache: "no-store",
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "站内信暂时无法载入。");
        if (active) { setMessages(data.messages ?? []); setError(""); }
      } catch {
        if (active) setMessages([]);
      }
    })();
    return () => { active = false; };
  }, [pathname, session?.access_token]);

  const closeMessage = useCallback(async () => {
    if (!message || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const visitorId = getSiteVisitorId();
      const response = await fetch("/api/site-messages", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ messageId: message.id, recipientType: message.recipientType, recipientId: message.recipientId, visitorId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "暂时无法保存已读状态。");
      setMessages((current) => current.filter((item) => item.id !== message.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暂时无法保存已读状态。");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, message, session?.access_token]);

  useEffect(() => {
    if (message) closeRef.current?.focus();
  }, [message?.id]);

  if (!message) return null;
  return <div className={styles.backdrop}>
    <section aria-labelledby="site-message-title" aria-modal="true" className={styles.dialog} role="dialog">
      <header className={styles.header}>
        <div className={styles.kicker}>站内信</div>
        <button aria-label="关闭站内信" className={styles.close} disabled={isSaving} onClick={() => void closeMessage()} ref={closeRef} type="button">×</button>
      </header>
      <h2 id="site-message-title">{message.title}</h2>
      {message.body ? <div className={styles.body}>{message.body}</div> : null}
      {message.imageUrls.length ? <div className={styles.images}>{message.imageUrls.map((url, index) =>
        <Image alt={`${message.title} 配图 ${index + 1}`} className={styles.image} height={640} key={`${url}-${index}`} src={url} unoptimized width={960} />,
      )}</div> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <footer className={styles.footer}>
        <span>关闭后不再显示这条消息</span>
        <button className="button primary" disabled={isSaving} onClick={() => void closeMessage()} type="button">{isSaving ? "保存中…" : "我知道了"}</button>
      </footer>
    </section>
  </div>;
}
