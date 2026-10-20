"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { FAVORITE_WORDS_CHANGED_EVENT, FAVORITE_WORDS_STORAGE_KEY } from "@/lib/vocabulary/learning";
import { ACCOUNT_PROGRESS_EVENT, captureAccountChanges, emptyAccountSnapshot, isProgressKey, materializeAccountProgress, mergeAccountSnapshots, readProgressValues, type AccountSnapshot } from "@/lib/learning/account-progress";
const OWNER = "englishjieyou.progress-owner", DEVICE = "englishjieyou.progress-device";
export function AccountProgressProvider({ children }: { children: ReactNode }) {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    let stopped = false, busy = false, activeId = "", token = "", generation = 0, lastPull = 0;
    let own = emptyAccountSnapshot(), pending = emptyAccountSnapshot(), remote = emptyAccountSnapshot();
    let baseline: Record<string, any> = {};
    let deviceId: string;
    try {
      deviceId = localStorage.getItem(DEVICE) || (crypto.randomUUID?.() ?? "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)));
      localStorage.setItem(DEVICE, deviceId);
    } catch { return; }
    const cacheKey = (id: string) => `englishjieyou.progress-cache.${id || "guest"}`;
    function persist() { localStorage.setItem(cacheKey(activeId), JSON.stringify({ own, visible: baseline })); }
    function replaceVisible(values: Record<string, any>) {
      const previousFavorites = localStorage.getItem(FAVORITE_WORDS_STORAGE_KEY);
      for (const key of Object.keys(readProgressValues(localStorage))) if (!(key in values)) localStorage.removeItem(key);
      for (const [key, value] of Object.entries(values)) if (isProgressKey(key)) localStorage.setItem(key, JSON.stringify(value));
      baseline = readProgressValues(localStorage);
      if (previousFavorites !== localStorage.getItem(FAVORITE_WORDS_STORAGE_KEY)) window.dispatchEvent(new Event(FAVORITE_WORDS_CHANGED_EVENT));
      window.dispatchEvent(new Event(ACCOUNT_PROGRESS_EVENT));
    }
    function capture() {
      const values = readProgressValues(localStorage);
      const delta = captureAccountChanges(values, baseline, own);
      own = mergeAccountSnapshots([own, delta], true);
      pending = mergeAccountSnapshots([pending, delta], true);
      baseline = values;
      persist();
    }
    async function sync(pull = false) {
      if (stopped || busy || !activeId || !token) return;
      const run = generation;
      busy = true;
      try {
        capture();
        if (Object.keys(pending.entries).length || Object.keys(pending.times).length) {
          const sending = pending;
          const body = JSON.stringify({ deviceId, snapshot: sending });
          const saved = await fetch("/api/account-progress", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body, cache: "no-store", keepalive: body.length < 60_000, signal: AbortSignal.timeout(12_000) });
          if (stopped || run !== generation) return;
          if (!saved.ok) throw new Error("save failed");
          pending = emptyAccountSnapshot();
        }
        if (pull || Date.now() - lastPull > 30_000) {
          const result = await fetch(`/api/account-progress?deviceId=${deviceId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(12_000) });
          if (!result.ok) throw new Error("load failed");
          const cloud = await result.json() as { own: AccountSnapshot; remote: AccountSnapshot };
          if (stopped || run !== generation) return;
          capture();
          own = mergeAccountSnapshots([cloud.own, own], true);
          remote = cloud.remote;
          replaceVisible(materializeAccountProgress(mergeAccountSnapshots([remote, own])));
          lastPull = Date.now(); persist();
        }
        document.documentElement.dataset.accountProgressSync = "saved";
      } catch {
        if (!stopped && run === generation) document.documentElement.dataset.accountProgressSync = "offline";
      } finally { if (run === generation) busy = false; }
    }
    async function selectAccount(id: string, accessToken: string) {
      token = accessToken;
      if (id === activeId && activeId) { void sync(true); return; }
      const run = ++generation;
      const previousOwner = localStorage.getItem(OWNER);
      if (previousOwner !== null) {
        let prior: { own?: AccountSnapshot; visible?: Record<string, any> } = {};
        try { prior = JSON.parse(localStorage.getItem(cacheKey(previousOwner)) ?? "{}"); } catch { /* Keep the visible records. */ }
        const visible = readProgressValues(localStorage), stored = activeId ? own : prior.own ?? emptyAccountSnapshot();
        const changed = captureAccountChanges(visible, activeId ? baseline : prior.visible ?? visible, stored);
        localStorage.setItem(cacheKey(previousOwner), JSON.stringify({ own: mergeAccountSnapshots([stored, changed], true), visible }));
      }
      activeId = id;
      own = emptyAccountSnapshot(); pending = emptyAccountSnapshot(); remote = emptyAccountSnapshot(); lastPull = 0;
      let cached: { own?: AccountSnapshot; visible?: Record<string, any> } = {};
      try { cached = JSON.parse(localStorage.getItem(cacheKey(id)) ?? "{}"); } catch { /* Use cloud recovery. */ }
      if (cached.own) own = cached.own;
      const importGuest = Boolean(id && !cached.own && (previousOwner === null || previousOwner === ""));
      if (previousOwner !== null && previousOwner !== id && !importGuest) replaceVisible(cached.visible ?? {});
      baseline = importGuest ? {} : cached.visible ?? readProgressValues(localStorage);
      pending = own;
      localStorage.setItem(OWNER, id);
      document.documentElement.dataset.accountProgressSync = id ? "loading" : "guest";
      setEpoch(value => value + 1);
      if (id) {
        // Import existing records with their original review dates before merging cloud data.
        busy = false;
        await sync(true);
        if (!stopped && generation === run) setEpoch(value => value + 1);
      }
    }
    void supabase.auth.getSession().then(({ data }) => selectAccount(data.session?.user.id ?? "", data.session?.access_token ?? "")).catch(() => undefined);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { void selectAccount(session?.user.id ?? "", session?.access_token ?? "").catch(() => undefined); });
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void sync(); }, 5000);
    const focus = () => { void sync(true); };
    const hide = () => { if (document.visibilityState === "hidden") void sync(); };
    const favoriteChanged = () => { void sync(); };
    window.addEventListener("focus", focus); window.addEventListener("online", focus); window.addEventListener("pagehide", hide); document.addEventListener("visibilitychange", hide);
    window.addEventListener(FAVORITE_WORDS_CHANGED_EVENT, favoriteChanged);
    return () => { stopped = true; subscription.unsubscribe(); clearInterval(timer); window.removeEventListener("focus", focus); window.removeEventListener("online", focus); window.removeEventListener("pagehide", hide); document.removeEventListener("visibilitychange", hide); window.removeEventListener(FAVORITE_WORDS_CHANGED_EVENT, favoriteChanged); };
  }, []);
  return <Fragment key={epoch}>{children}</Fragment>;
}
