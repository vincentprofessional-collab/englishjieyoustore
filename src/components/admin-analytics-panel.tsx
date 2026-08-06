"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ProfileRow = {
  created_at: string | null;
  display_name: string | null;
  email: string | null;
  id: string;
  membership_expires_at: string | null;
  membership_status: "free" | "paid" | "lifetime";
  role: "student" | "admin";
};

type ActivitySessionRow = {
  duration_seconds: number | null;
  first_path: string | null;
  id: string;
  ip_hash?: string | null;
  last_path: string | null;
  last_seen_at: string | null;
  page_view_count?: number | null;
  started_at: string | null;
  user_id: string | null;
  visitor_key?: string | null;
};

type ActivityEventRow = {
  created_at: string;
  duration_seconds: number | null;
  event_type: "page_view" | "login" | "logout" | "registration";
  ip_hash?: string | null;
  path: string | null;
  session_id: string | null;
  user_id: string | null;
  visitor_key?: string | null;
};

type AnalyticsState = {
  adminUserIds: string[];
  anonymousPageViewCount: number;
  anonymousPageViewsToday: number;
  anonymousSessionCount: number;
  anonymousSessionsToday: number;
  anonymousSessionsWeek: number;
  eventRows: ActivityEventRow[];
  profileCount: number;
  profileRows: ProfileRow[];
  sessionRows: ActivitySessionRow[];
};

const initialAnalyticsState: AnalyticsState = {
  adminUserIds: [],
  anonymousPageViewCount: 0,
  anonymousPageViewsToday: 0,
  anonymousSessionCount: 0,
  anonymousSessionsToday: 0,
  anonymousSessionsWeek: 0,
  eventRows: [],
  profileCount: 0,
  profileRows: [],
  sessionRows: [],
};

function formatDuration(value: number | null | undefined) {
  const seconds = Math.max(0, Math.round(value ?? 0));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}小时${minutes % 60}分`;
  }

  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }

  return `${remainingSeconds}秒`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isAfter(value: string | null, date: Date) {
  return Boolean(value && new Date(value).getTime() >= date.getTime());
}

type AnonymousMetricsRow = {
  anonymous_page_views_today?: number;
  anonymous_page_views_total?: number;
  anonymous_visitors_today?: number;
  anonymous_visitors_total?: number;
  anonymous_visitors_week?: number;
};

function uniqueVisitorKey(row: {
  session_id?: string | null;
  user_id: string | null;
  visitor_key?: string | null;
}) {
  return row.user_id ?? row.visitor_key ?? row.session_id ?? "";
}

function readMetricValue(value: unknown, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function isMissingActivityColumn(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.message?.includes("visitor_key") ||
        error.message?.includes("ip_hash") ||
        error.message?.includes("page_view_count")),
  );
}

async function fetchActivitySessions() {
  const fullResult = await supabase
    .from("site_activity_sessions")
    .select(
      "id,user_id,visitor_key,ip_hash,started_at,last_seen_at,duration_seconds,first_path,last_path,page_view_count",
    )
    .order("last_seen_at", { ascending: false })
    .limit(500);

  if (!isMissingActivityColumn(fullResult.error)) {
    return fullResult;
  }

  return supabase
    .from("site_activity_sessions")
    .select("id,user_id,started_at,last_seen_at,duration_seconds,first_path,last_path")
    .order("last_seen_at", { ascending: false })
    .limit(500);
}

async function fetchActivityEvents() {
  const fullResult = await supabase
    .from("site_activity_events")
    .select("event_type,path,user_id,visitor_key,ip_hash,session_id,duration_seconds,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!isMissingActivityColumn(fullResult.error)) {
    return fullResult;
  }

  return supabase
    .from("site_activity_events")
    .select("event_type,path,user_id,session_id,duration_seconds,created_at")
    .order("created_at", { ascending: false })
    .limit(500);
}

export function AdminAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<AnalyticsState>(initialAnalyticsState);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadAnalytics() {
    setIsLoading(true);
    setMessage("");
    const today = startOfToday().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      adminProfilesResult,
      profilesResult,
      sessionsResult,
      eventsResult,
      anonymousSessionsResult,
      anonymousSessionsTodayResult,
      anonymousSessionsWeekResult,
      anonymousPageViewsResult,
      anonymousPageViewsTodayResult,
      anonymousMetricsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("id").eq("role", "admin"),
      supabase
        .from("profiles")
        .select(
          "id,email,display_name,role,membership_status,membership_expires_at,created_at",
          { count: "exact" },
        )
        .neq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(200),
      fetchActivitySessions(),
      fetchActivityEvents(),
      supabase
        .from("site_activity_sessions")
        .select("id", { count: "exact", head: true })
        .is("user_id", null),
      supabase
        .from("site_activity_sessions")
        .select("id", { count: "exact", head: true })
        .is("user_id", null)
        .gte("last_seen_at", today),
      supabase
        .from("site_activity_sessions")
        .select("id", { count: "exact", head: true })
        .is("user_id", null)
        .gte("last_seen_at", sevenDaysAgo),
      supabase
        .from("site_activity_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "page_view")
        .is("user_id", null),
      supabase
        .from("site_activity_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "page_view")
        .is("user_id", null)
        .gte("created_at", today),
      supabase.rpc("get_admin_anonymous_visitor_metrics"),
    ]);

    const firstError =
      adminProfilesResult.error ??
      profilesResult.error ??
      sessionsResult.error ??
      eventsResult.error ??
      anonymousSessionsResult.error ??
      anonymousSessionsTodayResult.error ??
      anonymousSessionsWeekResult.error ??
      anonymousPageViewsResult.error ??
      anonymousPageViewsTodayResult.error;

    if (firstError) {
      setMessage(
        firstError.message.includes("site_activity") ||
          firstError.message.includes("visitor_key")
          ? "统计表还没有创建。需要在 Supabase SQL Editor 执行 supabase/005_admin_tracking_and_upload_fixes.sql，然后刷新后台。"
          : `无法读取后台统计：${firstError.message}`,
      );
      setIsLoading(false);
      return;
    }

    const anonymousMetrics = Array.isArray(anonymousMetricsResult.data)
      ? (anonymousMetricsResult.data[0] as AnonymousMetricsRow | undefined)
      : undefined;

    setAnalytics({
      adminUserIds: (adminProfilesResult.data ?? []).map((profile) => profile.id),
      anonymousPageViewCount: readMetricValue(
        anonymousMetrics?.anonymous_page_views_total,
        anonymousPageViewsResult.count ?? 0,
      ),
      anonymousPageViewsToday: readMetricValue(
        anonymousMetrics?.anonymous_page_views_today,
        anonymousPageViewsTodayResult.count ?? 0,
      ),
      anonymousSessionCount: readMetricValue(
        anonymousMetrics?.anonymous_visitors_total,
        anonymousSessionsResult.count ?? 0,
      ),
      anonymousSessionsToday: readMetricValue(
        anonymousMetrics?.anonymous_visitors_today,
        anonymousSessionsTodayResult.count ?? 0,
      ),
      anonymousSessionsWeek: readMetricValue(
        anonymousMetrics?.anonymous_visitors_week,
        anonymousSessionsWeekResult.count ?? 0,
      ),
      eventRows: (eventsResult.data ?? []) as ActivityEventRow[],
      profileCount: profilesResult.count ?? profilesResult.data?.length ?? 0,
      profileRows: (profilesResult.data ?? []) as ProfileRow[],
      sessionRows: (sessionsResult.data ?? []) as ActivitySessionRow[],
    });
    setIsLoading(false);
  }

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const metrics = useMemo(() => {
    const today = startOfToday();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const adminUserIds = new Set(analytics.adminUserIds);
    const eventRows = analytics.eventRows.filter(
      (event) => !event.user_id || !adminUserIds.has(event.user_id),
    );
    const sessionRows = analytics.sessionRows.filter(
      (session) => !session.user_id || !adminUserIds.has(session.user_id),
    );
    const todayEvents = eventRows.filter((event) => isAfter(event.created_at, today));
    const todayVisitorKeys = new Set(
      todayEvents
        .filter((event) => event.event_type === "page_view")
        .map(uniqueVisitorKey)
        .filter(Boolean),
    );
    const activeNow = sessionRows.filter((session) =>
      isAfter(session.last_seen_at, fiveMinutesAgo),
    );
    const sessionsWithDuration = sessionRows.filter(
      (session) => (session.duration_seconds ?? 0) > 0,
    );
    const averageDuration =
      sessionsWithDuration.length === 0
        ? 0
        : sessionsWithDuration.reduce(
            (total, session) => total + (session.duration_seconds ?? 0),
            0,
          ) / sessionsWithDuration.length;
    const pageCounts = new Map<string, number>();

    eventRows
      .filter((event) => event.event_type === "page_view" && isAfter(event.created_at, sevenDaysAgo))
      .forEach((event) => {
        const path = event.path ?? "未知页面";
        pageCounts.set(path, (pageCounts.get(path) ?? 0) + 1);
      });

    return {
      activeNow: activeNow.length,
      averageDuration,
      loginToday: todayEvents.filter((event) => event.event_type === "login").length,
      pageViewsToday: todayEvents.filter((event) => event.event_type === "page_view").length,
      popularPages: [...pageCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8),
      registeredToday: analytics.profileRows.filter((profile) =>
        isAfter(profile.created_at, today),
      ).length,
      totalKnownVisitors: analytics.profileCount + analytics.anonymousSessionCount,
      visitorsToday: todayVisitorKeys.size,
    };
  }, [analytics]);

  const anonymousSessions = useMemo(
    () => analytics.sessionRows.filter((session) => !session.user_id),
    [analytics.sessionRows],
  );

  const profileMap = useMemo(() => {
    return new Map(analytics.profileRows.map((profile) => [profile.id, profile]));
  }, [analytics.profileRows]);

  return (
    <section className="admin-analytics-panel">
      <header className="admin-editor-heading">
        <div>
          <span>Analytics</span>
          <h2>网站数据后台</h2>
        </div>
        <button className="button secondary" disabled={isLoading} type="button" onClick={loadAnalytics}>
          {isLoading ? "刷新中..." : "刷新数据"}
        </button>
      </header>

      {message ? <p className="admin-form-message error">{message}</p> : null}

      <div className="admin-stat-grid">
        <div>
          <span>累计打开网页人数</span>
          <strong>{metrics.totalKnownVisitors}</strong>
          <small>注册用户 + 未注册访客</small>
        </div>
        <div>
          <span>注册用户</span>
          <strong>{analytics.profileCount}</strong>
          <small>今日新增 {metrics.registeredToday}</small>
        </div>
        <div>
          <span>今日登录</span>
          <strong>{metrics.loginToday}</strong>
          <small>按登录事件统计</small>
        </div>
        <div>
          <span>今日访客</span>
          <strong>{metrics.visitorsToday}</strong>
          <small>今日页面访问用户/会话</small>
        </div>
        <div>
          <span>今日未注册访客</span>
          <strong>{analytics.anonymousSessionsToday}</strong>
          <small>未登录/未注册会话</small>
        </div>
        <div>
          <span>7 天未注册访客</span>
          <strong>{analytics.anonymousSessionsWeek}</strong>
          <small>最近 7 天匿名会话</small>
        </div>
        <div>
          <span>在线会话</span>
          <strong>{metrics.activeNow}</strong>
          <small>最近 5 分钟活跃</small>
        </div>
        <div>
          <span>今日浏览</span>
          <strong>{metrics.pageViewsToday}</strong>
          <small>页面打开次数</small>
        </div>
        <div>
          <span>未注册浏览</span>
          <strong>{analytics.anonymousPageViewsToday}</strong>
          <small>今日匿名打开次数</small>
        </div>
        <div>
          <span>平均停留</span>
          <strong>{formatDuration(metrics.averageDuration)}</strong>
          <small>按最近 500 个会话</small>
        </div>
      </div>

      <div className="admin-analytics-grid">
        <section className="admin-editor-card">
          <header className="admin-compact-heading">
            <h3>最近注册用户</h3>
            <span>最多显示 200 个</span>
          </header>
          <div className="admin-table">
            {analytics.profileRows.slice(0, 10).map((profile) => (
              <div key={profile.id}>
                <span>{profile.email ?? profile.display_name ?? "未命名用户"}</span>
                <small>{profile.membership_status}</small>
                <small>{formatDateTime(profile.created_at)}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-editor-card">
          <header className="admin-compact-heading">
            <h3>最近访问</h3>
            <span>会话与停留时间</span>
          </header>
          <div className="admin-table">
            {analytics.sessionRows.slice(0, 10).map((session) => {
              const profile = session.user_id ? profileMap.get(session.user_id) : null;

              return (
                <div key={session.id}>
                  <span>{profile?.email ?? session.user_id ?? "匿名访问"}</span>
                  <small>{session.last_path ?? session.first_path ?? "未知页面"}</small>
                  <small>{formatDuration(session.duration_seconds)}</small>
                </div>
              );
            })}
          </div>
        </section>

        <section className="admin-editor-card">
          <header className="admin-compact-heading">
            <h3>未注册访问</h3>
            <span>累计 {analytics.anonymousSessionCount} 个匿名会话</span>
          </header>
          <div className="admin-table">
            {anonymousSessions.length ? (
              anonymousSessions.slice(0, 10).map((session) => (
                <div key={session.id}>
                  <span>匿名访问</span>
                  <small>{session.last_path ?? session.first_path ?? "未知页面"}</small>
                  <small>{formatDuration(session.duration_seconds)}</small>
                </div>
              ))
            ) : (
              <p className="admin-empty-text">暂无未注册访问记录。</p>
            )}
          </div>
          <p className="admin-card-note">
            有 IP 统计字段时优先按 IP 哈希去重；字段缺失时先按匿名浏览器会话兜底。
            累计匿名浏览 {analytics.anonymousPageViewCount} 次。
          </p>
        </section>

        <section className="admin-editor-card">
          <header className="admin-compact-heading">
            <h3>热门页面</h3>
            <span>最近 7 天</span>
          </header>
          <div className="admin-table">
            {metrics.popularPages.length ? (
              metrics.popularPages.map(([path, count]) => (
                <div key={path}>
                  <span>{path}</span>
                  <small>{count} 次浏览</small>
                </div>
              ))
            ) : (
              <p className="admin-empty-text">暂无页面访问记录。</p>
            )}
          </div>
        </section>

        <section className="admin-editor-card">
          <header className="admin-compact-heading">
            <h3>最近登录</h3>
            <span>登录事件</span>
          </header>
          <div className="admin-table">
            {analytics.eventRows
              .filter((event) => event.event_type === "login")
              .slice(0, 10)
              .map((event) => {
                const profile = event.user_id ? profileMap.get(event.user_id) : null;

                return (
                  <div key={`${event.user_id ?? event.session_id}-${event.created_at}`}>
                    <span>{profile?.email ?? event.user_id ?? "未知用户"}</span>
                    <small>{event.path ?? "未知页面"}</small>
                    <small>{formatDateTime(event.created_at)}</small>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </section>
  );
}
