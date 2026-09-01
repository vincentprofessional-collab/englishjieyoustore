"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const SESSION_ID_KEY = "ielts-platform.analytics.sessionId";
const SESSION_STARTED_KEY = "ielts-platform.analytics.startedAt";
const LOCAL_STUDY_SECONDS_KEY = "ielts-platform.analytics.studySeconds";
const LOCAL_SESSION_REPORTED_KEY = "ielts-platform.analytics.reportedSeconds";

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
  const lastTrackedPathRef = useRef("");

  useEffect(() => {
    async function trackPageView() {
      const path = `${pathname}${window.location.search}`;

      if (shouldSkipAnalyticsPath(path)) {
        return;
      }

      if (lastTrackedPathRef.current === path) {
        return;
      }

      lastTrackedPathRef.current = path;
      await recordActivity("page_view", path);
    }

    const startTracking = () => {
      void trackPageView();
    };

    const trackingTimer = window.setTimeout(startTracking, 3_000);

    return () => {
      window.clearTimeout(trackingTimer);
    };
  }, [pathname]);

  useEffect(() => {
    const updateCurrentSession = () => {
      const path = `${window.location.pathname}${window.location.search}`;

      if (shouldSkipAnalyticsPath(path)) {
        return;
      }

      void updateSessionActivity(path);
    };
    const intervalId = window.setInterval(updateCurrentSession, 60_000);

    document.addEventListener("visibilitychange", updateCurrentSession);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", updateCurrentSession);
    };
  }, []);

  return null;
}
