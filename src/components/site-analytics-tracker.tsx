"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

const SESSION_ID_KEY = "ielts-platform.analytics.sessionId";
const SESSION_STARTED_KEY = "ielts-platform.analytics.startedAt";

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
        path,
        referrer: document.referrer || null,
        sessionId,
        startedAt,
      }),
      headers,
      method: "POST",
    });
  } catch {
    // Analytics should never block learning pages.
  }
}

async function recordActivity(
  eventType: "page_view" | "login" | "logout",
  path: string,
) {
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
      method: "POST",
    });
  } catch {
    // Analytics should never block learning pages.
  }
}

export function SiteAnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef("");
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function trackPageView() {
      const path = `${pathname}${window.location.search}`;

      if (shouldSkipAnalyticsPath(path)) {
        return;
      }

      if (lastTrackedPathRef.current === path) {
        return;
      }

      lastTrackedPathRef.current = path;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      currentUserRef.current = user;
      await recordActivity("page_view", path);
    }

    void trackPageView();

    return () => {
      isMounted = false;
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      currentUserRef.current = session?.user ?? null;
      const path = `${window.location.pathname}${window.location.search}`;

      if (shouldSkipAnalyticsPath(path)) {
        return;
      }

      if (event === "SIGNED_IN") {
        void recordActivity("login", path);
      }

      if (event === "SIGNED_OUT") {
        void recordActivity("logout", path);
      }
    });

    document.addEventListener("visibilitychange", updateCurrentSession);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", updateCurrentSession);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
