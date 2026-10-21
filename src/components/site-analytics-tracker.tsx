"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { activityForLearningPath, recordDailyLearningSeconds, recordStudyPage } from "@/lib/learning/site-progress";
import { getOrCreateVisitorKey, hasVisitedBeforeToday } from "@/lib/visitor-identity";

const DAILY_TICK_AT_KEY = "ielts-platform.analytics.dailyTickAt";
const DAILY_TICK_VISIBLE_KEY = "ielts-platform.analytics.dailyTickVisible";
const PROGRESS_SHARING_SYNCED_AT_KEY = "ielts-platform.progressSharingSyncedAt";
let progressSyncInFlight = false;

function shouldSkipAnalyticsPath(path: string) {
  return path.startsWith("/admin") || path.startsWith("/debug");
}

async function recordPageView(path: string) {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("site_activity_events").insert({
      event_type: "page_view",
      path: path.split(/[?#]/, 1)[0],
      user_id: session?.user?.id ?? null,
      visitor_key: getOrCreateVisitorKey(),
      metadata: { returning_visitor: hasVisitedBeforeToday() },
    });
  } catch {
    // Popular-page tracking should never block learning pages.
  }
}

async function syncProgressSnapshotIfAuthorized() {
  if (progressSyncInFlight) return;
  progressSyncInFlight = true;
  try {
    const now = Date.now();
    const lastSync = Number(window.localStorage.getItem(PROGRESS_SHARING_SYNCED_AT_KEY) ?? "0");
    if (now - lastSync < 5 * 60_000) return;

    const { supabase } = await import("@/lib/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const access = await fetch("/api/learning-progress-sharing?mode=sharing", { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!access.ok) return;
    const overview = await access.json() as { sharing?: { approvedIncoming?: unknown[] } };
    if (!overview.sharing?.approvedIncoming?.length) {
      window.localStorage.setItem(PROGRESS_SHARING_SYNCED_AT_KEY, String(now));
      return;
    }

    const { buildShareableLearningProgressSnapshot } = await import("@/lib/learning/shared-progress");
    const response = await fetch("/api/learning-progress-sharing", {
      body: JSON.stringify({ action: "sync", snapshot: buildShareableLearningProgressSnapshot() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok) window.localStorage.setItem(PROGRESS_SHARING_SYNCED_AT_KEY, String(now));
  } catch {
    // Progress sharing must never interrupt the learning experience.
  } finally {
    progressSyncInFlight = false;
  }
}

export function SiteAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const lastTrackedPathRef = useRef("");

  useEffect(() => {
    async function trackPageView() {
      const path = `${pathname}${queryString ? `?${queryString}` : ""}`;
      const pagePath = path.split(/[?#]/, 1)[0];

      if (shouldSkipAnalyticsPath(path)) {
        return;
      }

      if (lastTrackedPathRef.current === pagePath) {
        return;
      }

      lastTrackedPathRef.current = pagePath;
      recordStudyPage(pagePath);
      await recordPageView(pagePath);
    }

    void trackPageView();
  }, [pathname, queryString]);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => {};
    const syncIfVisible = () => {
      if (document.visibilityState === "visible") void syncProgressSnapshotIfAuthorized();
    };
    void import("@/lib/supabase/client").then(({ supabase }) => {
      if (!active) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN") return;
        if (event === "SIGNED_IN") window.localStorage.removeItem(PROGRESS_SHARING_SYNCED_AT_KEY);
        window.setTimeout(syncIfVisible, 0);
      });
      unsubscribe = () => subscription.unsubscribe();
    });
    syncIfVisible();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const updateDailyLearningTime = (forceHidden = false) => {
      const now = Date.now();
      const previousAt = Number(window.sessionStorage.getItem(DAILY_TICK_AT_KEY) ?? "0");
      const wasVisible = window.sessionStorage.getItem(DAILY_TICK_VISIBLE_KEY) === "true";
      if (wasVisible && previousAt > 0) {
        recordDailyLearningSeconds((now - previousAt) / 1000, window.localStorage, new Date(), activityForLearningPath(window.location.pathname));
      }
      const visible = !forceHidden && document.visibilityState === "visible";
      window.sessionStorage.setItem(DAILY_TICK_AT_KEY, visible ? String(now) : "0");
      window.sessionStorage.setItem(DAILY_TICK_VISIBLE_KEY, String(visible));
    };
    const updateVisibleActivity = () => {
      updateDailyLearningTime();
    };
    const updateOnPageHide = () => {
      updateDailyLearningTime(true);
    };
    const resumeVisibleActivity = () => updateDailyLearningTime();

    window.sessionStorage.setItem(DAILY_TICK_AT_KEY, document.visibilityState === "visible" ? String(Date.now()) : "0");
    window.sessionStorage.setItem(DAILY_TICK_VISIBLE_KEY, String(document.visibilityState === "visible"));
    const dailyIntervalId = window.setInterval(updateDailyLearningTime, 30_000);

    document.addEventListener("visibilitychange", updateVisibleActivity);
    window.addEventListener("pagehide", updateOnPageHide);
    window.addEventListener("pageshow", resumeVisibleActivity);

    return () => {
      window.clearInterval(dailyIntervalId);
      document.removeEventListener("visibilitychange", updateVisibleActivity);
      window.removeEventListener("pagehide", updateOnPageHide);
      window.removeEventListener("pageshow", resumeVisibleActivity);
    };
  }, []);

  return null;
}
