"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { CommunityInbox } from "@/lib/community/inbox";

type InboxContext = {
  signedIn: boolean; initializing: boolean; inbox: CommunityInbox | null; error: string; loading: boolean;
  refresh: () => Promise<void>; markRead: (until: string) => Promise<void>;
};
export const CommunityInboxContext = createContext<InboxContext>({ signedIn: false, initializing: true, inbox: null, error: "", loading: false, refresh: async () => {}, markRead: async () => {} });
export const useCommunityInbox = () => useContext(CommunityInboxContext);

export function CommunityInboxProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const full = pathname === "/me/posts";
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [result, setResult] = useState<{ owner: string; inbox: CommunityInbox } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const currentOwner = useRef("");
  currentOwner.current = session?.user.id ?? "";
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true, authChanged = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authChanged = true;
      if (active) { setSession(nextSession); setInitializing(false); }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && !authChanged) { setSession(data.session); setInitializing(false); }
    }).catch(() => { if (active) setInitializing(false); });
    return () => { active = false; subscription.unsubscribe(); activeRequest.current?.abort(); };
  }, []);

  const refresh = useCallback(async () => {
    activeRequest.current?.abort();
    if (!session) { setResult(null); setLoading(false); setError(""); return; }
    const owner = session.user.id, controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    try {
      const response = await fetch(`/api/my-community${full ? "" : "?summary=1"}`, { cache: "no-store", headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "留言暂时无法读取。");
      if (currentOwner.current === owner && activeRequest.current === controller) {
        setResult({ owner, inbox: data }); setError("");
      }
    } catch (reason) {
      if (currentOwner.current === owner && activeRequest.current === controller) setError(reason instanceof Error && reason.name !== "AbortError" ? reason.message : "留言读取超时，请重试。");
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current === controller) setLoading(false);
    }
  }, [full, session]);

  useEffect(() => {
    void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(onVisible, 60000);
    window.addEventListener("focus", onVisible); document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onVisible); document.removeEventListener("visibilitychange", onVisible); activeRequest.current?.abort(); };
  }, [refresh]);

  const markRead = useCallback(async (until: string) => {
    if (!session) return;
    const owner = session.user.id;
    const response = await fetch("/api/my-community", { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ until }), signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "已读状态保存失败，请重试。");
    if (currentOwner.current !== owner) return;
    setResult(current => current?.owner === owner && current.inbox.incoming ? { owner, inbox: { ...current.inbox, readAt: data.readAt,
      unread: current.inbox.incoming.filter(item => Date.parse(item.createdAt) > Date.parse(data.readAt)).length } } : current);
    await refresh();
  }, [refresh, session]);
  const inbox = result?.owner === session?.user.id ? result?.inbox ?? null : null;
  return <CommunityInboxContext.Provider value={{ signedIn: Boolean(session), initializing, inbox, error, loading, refresh, markRead }}>{children}</CommunityInboxContext.Provider>;
}

export function UnreadReplyBadge() {
  const { inbox } = useCommunityInbox();
  if (!inbox?.unread) return null;
  return <span aria-label={`${inbox.unread}条未读回复`} className="community-unread-badge">{inbox.unread}</span>;
}
