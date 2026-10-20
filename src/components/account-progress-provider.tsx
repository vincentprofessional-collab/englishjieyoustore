"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { FAVORITE_WORDS_CHANGED_EVENT, FAVORITE_WORDS_STORAGE_KEY } from "@/lib/vocabulary/learning";
import { ACCOUNT_PROGRESS_EVENT, captureAccountChanges, emptyAccountSnapshot, isProgressKey, materializeAccountProgress, mergeAccountSnapshots, readProgressValues, type AccountSnapshot } from "@/lib/learning/account-progress";
const OWNER = "englishjieyou.progress-owner", DEVICE = "englishjieyou.progress-device";
const ACCOUNT_PROGRESS_SYNC_INTERVAL_MS = 5 * 60_000;
const ACCOUNT_PROGRESS_PULL_COOLDOWN_MS = 15 * 60_000;
export function AccountProgressProvider({ children }: { children: ReactNode }) {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    let stopped = false, busy = false, activeId = "", token = "", generation = 0, lastPull = 0, lastSync = Date.now();
    let own = emptyAccountSnapshot(), pending = emptyAccountSnapshot(), remote = emptyAccountSnapshot();
    let baseline: Record<string, any> = {};
    let deviceId: string;
    try {
      deviceId = localStorage.getItem(DEVICE) || (crypto.randomUUID?.() ?? "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)));
      localStorage.setItem(DEVICE, deviceId);
    } catch { return; }
    const cacheKey = (id: string) => `englishjieyou.progress-cache.${id || "guest"}`;
    function persist() { localStorage.setItem(cacheKey(activeId), JSON.stringify({ version: 2, own, pending, visible: baseline })); }
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
    async function sync(pull = false, flushTimes = false) {
      if (stopped || busy || !activeId || !token) return;
      const run = generation;
      const now = Date.now();
      const shouldPull = pull && now - lastPull > ACCOUNT_PROGRESS_PULL_COOLDOWN_MS;
      busy = true;
      try {
        capture();
        const hasEntries = Object.keys(pending.entries).length > 0;
        const hasTimes = Object.keys(pending.times).length > 0;
        const shouldFlushTimes = flushTimes || shouldPull || now - lastSync >= ACCOUNT_PROGRESS_SYNC_INTERVAL_MS;
        if (hasEntries || (hasTimes && shouldFlushTimes)) {
          const sending = pending;
          const body = JSON.stringify({ deviceId, snapshot: sending });
          const saved = await fetch("/api/account-progress", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body, cache: "no-store", keepalive: body.length < 60_000, signal: AbortSignal.timeout(12_000) });
          if (stopped || run !== generation) return;
          if (!saved.ok) throw new Error("save failed");
          pending = emptyAccountSnapshot();
          lastSync = Date.now();
          persist();
        }
        if (shouldPull) {
          const result = await fetch(`/api/account-progress?deviceId=${deviceId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(12_000) });
          if (!result.ok) throw new Error("load failed");
          const cloud = await result.json() as { own: AccountSnapshot; remote: AccountSnapshot };
          if (stopped || run !== generation) return;
          lastPull = Date.now();
          capture();
          own = mergeAccountSnapshots([cloud.own, own], true);
          remote = cloud.remote;
          replaceVisible(materializeAccountProgress(mergeAccountSnapshots([remote, own])));
          persist();
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
        let prior: { own?: AccountSnapshot; pending?: AccountSnapshot; visible?: Record<string, any> } = {};
        try { prior = JSON.parse(localStorage.getItem(cacheKey(previousOwner)) ?? "{}"); } catch { /* Keep the visible records. */ }
        const visible = readProgressValues(localStorage), stored = activeId ? own : prior.own ?? emptyAccountSnapshot();
        const changed = captureAccountChanges(visible, activeId ? baseline : prior.visible ?? visible, stored);
        const savedPending = mergeAccountSnapshots([prior.pending ?? emptyAccountSnapshot(), activeId ? pending : emptyAccountSnapshot(), changed], true);
        localStorage.setItem(cacheKey(previousOwner), JSON.stringify({ version: 2, own: mergeAccountSnapshots([stored, changed], true), pending: savedPending, visible }));
      }
      lastPull = 0; lastSync = Date.now();
      activeId = id;
      own = emptyAccountSnapshot(); pending = emptyAccountSnapshot(); remote = emptyAccountSnapshot();
      let cached: { version?: number; own?: AccountSnapshot; pending?: AccountSnapshot; visible?: Record<string, any> } = {};
      try { cached = JSON.parse(localStorage.getItem(cacheKey(id)) ?? "{}"); } catch { /* Use cloud recovery. */ }
      if (cached.own) own = cached.own;
      const importGuest = Boolean(id && !cached.own && (previousOwner === null || previousOwner === ""));
      if (previousOwner !== null && previousOwner !== id && !importGuest) replaceVisible(cached.visible ?? {});
      baseline = importGuest ? {} : cached.visible ?? readProgressValues(localStorage);
      // Retry saved offline changes. Older caches had no dirty marker, so migrate them once.
      pending = cached.pending ?? (cached.version === 2 ? emptyAccountSnapshot() : cached.own ?? emptyAccountSnapshot());
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
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void sync(); }, ACCOUNT_PROGRESS_SYNC_INTERVAL_MS);
    const focus = () => { void sync(true); };
    const pagehide = () => { void sync(false, true); };
    const visibilityChange = () => { void sync(document.visibilityState === "visible"); };
    const favoriteChanged = () => { void sync(); };
    window.addEventListener("focus", focus); window.addEventListener("online", focus); window.addEventListener("pagehide", pagehide); document.addEventListener("visibilitychange", visibilityChange);
    window.addEventListener(FAVORITE_WORDS_CHANGED_EVENT, favoriteChanged);
    return () => { stopped = true; subscription.unsubscribe(); clearInterval(timer); window.removeEventListener("focus", focus); window.removeEventListener("online", focus); window.removeEventListener("pagehide", pagehide); document.removeEventListener("visibilitychange", visibilityChange); window.removeEventListener(FAVORITE_WORDS_CHANGED_EVENT, favoriteChanged); };
  }, []);
  return <Fragment key={epoch}>{children}</Fragment>;
}
