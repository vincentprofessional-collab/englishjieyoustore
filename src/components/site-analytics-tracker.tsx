"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { getFirstOpenedAt } from "@/lib/visitor-identity";
import { recordDailyLearningSeconds, recordStudyPage } from "@/lib/learning/site-progress";

const SESSION_ID_KEY = "ielts-platform.analytics.sessionId";
const SESSION_STARTED_KEY = "ielts-platform.analytics.startedAt";
const SESSION_FIRST_PATH_KEY = "ielts-platform.analytics.firstPath";
const LOCAL_STUDY_SECONDS_KEY = "ielts-platform.analytics.studySeconds";
const LOCAL_SESSION_REPORTED_KEY = "ielts-platform.analytics.reportedSeconds";
const DAILY_TICK_AT_KEY = "ielts-platform.analytics.dailyTickAt";
const DAILY_TICK_VISIBLE_KEY = "ielts-platform.analytics.dailyTickVisible";

function recordLocalStudySeconds(durationSeconds: number) {
  const previousDuration = Number(window.sessionStorage.getItem(LOCAL_SESSION_REPORTED_KEY) ?? "0");
  const delta = Math.max(0, durationSeconds - previousDuration);
  if (!delta) return;
  const total = Number(window.localStorage.getItem(LOCAL_STUDY_SECONDS_KEY) ?? "0");
  window.localStorage.setItem(LOCAL_STUDY_SECONDS_KEY, String(total + delta));
  window.sessionStorage.setItem(LOCAL_SESSION_REPORTED_KEY, String(durationSeconds));
}

function getSessionId() {
  const existingId = window.sessionStorage.getItem(SESSION_ID_KEY);

  if (existingId) {
    return existingId;
  }

  const nextId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.sessionStorage.setItem(SESSION_ID_KEY, nextId);
  window.sessionStorage.setItem(SESSION_STARTED_KEY, new Date().toISOString());
  return nextId;
}

function getStartedAt() {
  const value = window.sessionStorage.getItem(SESSION_STARTED_KEY);

  if (value) {
    return value;
  }

  const nextValue = new Date().toISOString();
  window.sessionStorage.setItem(SESSION_STARTED_KEY, nextValue);
  return nextValue;
}

function getFirstPath(path: string) {
  const existingPath = window.sessionStorage.getItem(SESSION_FIRST_PATH_KEY);

  if (existingPath) {
    return existingPath;
  }

  window.sessionStorage.setItem(SESSION_FIRST_PATH_KEY, path);
  return path;
}

function getDurationSeconds(startedAt: string) {
  return Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function shouldSkipAnalyticsPath(path: string) {
  return path.startsWith("/admin") || path.startsWith("/debug");
}

async function updateSessionActivity(path: string) {
  const { supabase } = await import("@/lib/supabase/client");
  const sessionId = getSessionId();
  const startedAt = getStartedAt();
  const durationSeconds = getDurationSeconds(startedAt);
  recordLocalStudySeconds(durationSeconds);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  try {
    await fetch("/api/site-activity", {
      body: JSON.stringify({
        durationSeconds,
        firstPath: getFirstPath(path),
        path,
        referrer: document.referrer || null,
        sessionId,
        startedAt,
      }),
      headers,
      keepalive: true,
      method: "POST",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Analytics should never block learning pages.
  }
}

async function recordActivity(
  eventType: "page_view" | "login" | "logout",
  path: string,
) {
  const { supabase } = await import("@/lib/supabase/client");
  const sessionId = getSessionId();
  const startedAt = getStartedAt();
  const durationSeconds = getDurationSeconds(startedAt);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  try {
    await fetch("/api/site-activity", {
      body: JSON.stringify({
        durationSeconds,
        eventType,
        firstPath: getFirstPath(path),
        pageTitle: document.title,
        path,
        referrer: document.referrer || null,
        sessionId,
        startedAt,
      }),
      headers,
      keepalive: true,
      method: "POST",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Analytics should never block learning pages.
  }
}

export function SiteAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const lastTrackedPathRef = useRef("");

  useEffect(() => {
    getFirstOpenedAt();

    async function trackPageView() {
      const path = `${pathname}${queryString ? `?${queryString}` : ""}`;

      if (shouldSkipAnalyticsPath(path)) {
        return;
      }

      if (lastTrackedPathRef.current === path) {
        return;
      }

      lastTrackedPathRef.current = path;
      recordStudyPage(path.split("?")[0]);
      await recordActivity("page_view", path);
    }

    void trackPageView();
  }, [pathname, queryString]);

  useEffect(() => {
    const updateCurrentSession = () => {
      const path = `${window.location.pathname}${window.location.search}`;

      if (shouldSkipAnalyticsPath(path)) {
        return;
      }

      void updateSessionActivity(path);
    };
    const updateDailyLearningTime = (forceHidden = false) => {
      const now = Date.now();
      const previousAt = Number(window.sessionStorage.getItem(DAILY_TICK_AT_KEY) ?? "0");
      const wasVisible = window.sessionStorage.getItem(DAILY_TICK_VISIBLE_KEY) === "true";
      if (wasVisible && previousAt > 0) recordDailyLearningSeconds((now - previousAt) / 1000);
      const visible = !forceHidden && document.visibilityState === "visible";
      window.sessionStorage.setItem(DAILY_TICK_AT_KEY, visible ? String(now) : "0");
      window.sessionStorage.setItem(DAILY_TICK_VISIBLE_KEY, String(visible));
    };
    const updateVisibleActivity = () => {
      updateDailyLearningTime();
      updateCurrentSession();
    };
    const updateOnPageHide = () => {
      updateDailyLearningTime(true);
      updateCurrentSession();
    };
    const resumeVisibleActivity = () => updateDailyLearningTime();

    window.sessionStorage.setItem(DAILY_TICK_AT_KEY, document.visibilityState === "visible" ? String(Date.now()) : "0");
    window.sessionStorage.setItem(DAILY_TICK_VISIBLE_KEY, String(document.visibilityState === "visible"));
    const intervalId = window.setInterval(updateCurrentSession, 60_000);
    const dailyIntervalId = window.setInterval(updateDailyLearningTime, 30_000);

    document.addEventListener("visibilitychange", updateVisibleActivity);
    window.addEventListener("pagehide", updateOnPageHide);
    window.addEventListener("pageshow", resumeVisibleActivity);

    return () => {
      window.clearInterval(intervalId);
      window.clearInterval(dailyIntervalId);
      document.removeEventListener("visibilitychange", updateVisibleActivity);
      window.removeEventListener("pagehide", updateOnPageHide);
      window.removeEventListener("pageshow", resumeVisibleActivity);
    };
  }, []);

  return null;
}
