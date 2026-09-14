"use client";

import Link from "next/link";
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
  page_title?: string | null;
  path: string | null;
  session_id: string | null;
  user_id: string | null;
  visitor_key?: string | null;
};

type AnalyticsState = {
  adminUserIds: string[];
  anonymousPageViewCount: number;
  anonymousSessionCount: number;
  eventRows: ActivityEventRow[];
  profileCount: number;
  registeredToday: number;
  profileRows: ProfileRow[];
  sessionRows: ActivitySessionRow[];
};

const initialAnalyticsState: AnalyticsState = {
  adminUserIds: [],
  anonymousPageViewCount: 0,
  anonymousSessionCount: 0,
  eventRows: [],
  profileCount: 0,
  registeredToday: 0,
  profileRows: [],
  sessionRows: [],
};

const ACTIVITY_PAGE_SIZE = 1000;
const MAX_ACTIVITY_ROWS = 50_000;

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

function formatAveragePageViews(value: number) {
  return `${value.toFixed(1)}页`;
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
  anonymous_page_views_total?: number;
  anonymous_visitors_total?: number;
};

function uniqueVisitorKey(row: {
  session_id?: string | null;
  user_id: string | null;
  visitor_key?: string | null;
}) {
  return row.user_id ?? row.visitor_key ?? row.session_id ?? "";
}

function isModelAnswerPath(path: string) {
  const pathname = path.split("?", 1)[0];

  return (
    (pathname === "/speaking" || pathname.startsWith("/speaking/")) &&
      !pathname.includes("/practice") &&
      !pathname.includes("/mock") ||
    (pathname === "/writing" || pathname.startsWith("/writing/")) &&
      !pathname.includes("/practice") &&
      !pathname.includes("/mock")
  );
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

async function fetchActivityPages<T>(
  loadPage: (from: number, to: number) => Promise<{
    data: T[] | null;
    error: { code?: string; message?: string } | null;
  }>,
) {
  const rows: T[] = [];

  for (let from = 0; from < MAX_ACTIVITY_ROWS; from += ACTIVITY_PAGE_SIZE) {
    const result = await loadPage(from, from + ACTIVITY_PAGE_SIZE - 1);

    if (result.error) {
      return { data: null, error: result.error };
    }

    const page = result.data ?? [];
    rows.push(...page);

    if (page.length < ACTIVITY_PAGE_SIZE) {
      break;
    }
  }

  return { data: rows, error: null };
}

async function fetchActivitySessions() {
  const fullResult = await fetchActivityPages<ActivitySessionRow>(async (from, to) =>
    supabase
      .from("site_activity_sessions")
      .select(
        "id,user_id,visitor_key,ip_hash,started_at,last_seen_at,duration_seconds,first_path,last_path,page_view_count",
      )
      .order("last_seen_at", { ascending: false })
      .range(from, to),
  );

  if (!isMissingActivityColumn(fullResult.error)) {
    return fullResult;
  }

  return fetchActivityPages<ActivitySessionRow>(async (from, to) =>
    supabase
      .from("site_activity_sessions")
      .select("id,user_id,started_at,last_seen_at,duration_seconds,first_path,last_path")
      .order("last_seen_at", { ascending: false })
      .range(from, to),
  );
}

async function fetchActivityEvents() {
  const fullResult = await fetchActivityPages<ActivityEventRow>(async (from, to) =>
    supabase
      .from("site_activity_events")
      .select(
        "event_type,path,page_title,user_id,visitor_key,ip_hash,session_id,duration_seconds,created_at",
      )
      .order("created_at", { ascending: false })
      .range(from, to),
  );

  if (!isMissingActivityColumn(fullResult.error)) {
    return fullResult;
  }

  return fetchActivityPages<ActivityEventRow>(async (from, to) =>
    supabase
      .from("site_activity_events")
      .select("event_type,path,user_id,session_id,duration_seconds,created_at")
      .order("created_at", { ascending: false })
      .range(from, to),
  );
}

export function AdminAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<AnalyticsState>(initialAnalyticsState);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadAnalytics() {
    setIsLoading(true);
    setMessage("");
    const today = startOfToday().toISOString();

    const [
      adminProfilesResult,
      profilesResult,
      sessionsResult,
      eventsResult,
      anonymousSessionsResult,
      anonymousPageViewsResult,
      anonymousMetricsResult,
      registeredTodayResult,
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
        .from("site_activity_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "page_view")
        .is("user_id", null),
      supabase.rpc("get_admin_anonymous_visitor_metrics"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .neq("role", "admin")
        .gte("created_at", today),
    ]);

    const firstError =
      adminProfilesResult.error ??
      profilesResult.error ??
      sessionsResult.error ??
      eventsResult.error ??
      anonymousSessionsResult.error ??
      anonymousPageViewsResult.error ??
      registeredTodayResult.error;

    if (firstError) {
      const firstErrorMessage = firstError.message ?? "未知错误";
      setMessage(
        firstErrorMessage.includes("site_activity") ||
          firstErrorMessage.includes("visitor_key")
          ? "统计表还没有创建。需要在 Supabase SQL Editor 执行 supabase/005_admin_tracking_and_upload_fixes.sql，然后刷新后台。"
          : `无法读取后台统计：${firstErrorMessage}`,
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
      anonymousSessionCount: readMetricValue(
        anonymousMetrics?.anonymous_visitors_total,
        anonymousSessionsResult.count ?? 0,
      ),
      eventRows: (eventsResult.data ?? []) as ActivityEventRow[],
      profileCount: profilesResult.count ?? profilesResult.data?.length ?? 0,
      registeredToday: registeredTodayResult.count ?? 0,
      profileRows: (profilesResult.data ?? []) as ProfileRow[],
      sessionRows: (sessionsResult.data ?? []) as ActivitySessionRow[],
    });
    setIsLoading(false);
  }

  useEffect(() => {
    void loadAnalytics();

    const refreshTimer = window.setInterval(() => {
      void loadAnalytics();
    }, 30_000);

    return () => window.clearInterval(refreshTimer);
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
    const pageViewEvents = eventRows.filter((event) => event.event_type === "page_view");
    const todayPageViewEvents = pageViewEvents.filter((event) => isAfter(event.created_at, today));
    const todayVisitorKeys = new Set(todayPageViewEvents.map(uniqueVisitorKey).filter(Boolean));
    const firstSeenByVisitor = new Map<string, number>();

    pageViewEvents.forEach((event) => {
      const visitorKey = uniqueVisitorKey(event);
      const timestamp = new Date(event.created_at).getTime();

      if (!visitorKey || !Number.isFinite(timestamp)) {
        return;
      }

      const firstSeen = firstSeenByVisitor.get(visitorKey);

      if (firstSeen === undefined || timestamp < firstSeen) {
        firstSeenByVisitor.set(visitorKey, timestamp);
      }
    });

    const anonymousTodayCounts = new Map<string, number>();
    todayPageViewEvents
      .filter((event) => !event.user_id)
      .forEach((event) => {
        const visitorKey = uniqueVisitorKey(event);

        if (visitorKey) {
          anonymousTodayCounts.set(visitorKey, (anonymousTodayCounts.get(visitorKey) ?? 0) + 1);
        }
      });
    const firstTimeVisitorKeys = new Set(
      todayPageViewEvents
        .map(uniqueVisitorKey)
        .filter((visitorKey) => visitorKey && firstSeenByVisitor.get(visitorKey) !== undefined)
        .filter((visitorKey) => (firstSeenByVisitor.get(visitorKey) ?? 0) >= today.getTime()),
    );
    const returningAnonymousVisitorKeys = new Set(
      [...anonymousTodayCounts.keys()].filter((visitorKey) => {
        const firstSeen = firstSeenByVisitor.get(visitorKey);
        return (anonymousTodayCounts.get(visitorKey) ?? 0) >= 2 && firstSeen !== undefined && firstSeen < today.getTime();
      }),
    );
    const registeredVisitorsToday = new Set(
      todayPageViewEvents.map((event) => event.user_id).filter(Boolean),
    );
    const activeNow = sessionRows.filter((session) =>
      isAfter(session.last_seen_at, fiveMinutesAgo),
    );
    const pageViewsBySession = new Map<string, number>();
    pageViewEvents.forEach((event) => {
      if (event.session_id) {
        pageViewsBySession.set(
          event.session_id,
          (pageViewsBySession.get(event.session_id) ?? 0) + 1,
        );
      }
    });
    const pageViewCountForSession = (session: ActivitySessionRow) =>
      pageViewsBySession.get(session.id) ?? Math.max(0, session.page_view_count ?? 0);
    const averagePageViewsForSessions = (sessions: ActivitySessionRow[]) => {
      const pageViewCounts = sessions
        .map(pageViewCountForSession)
        .filter((count) => count > 0);

      return pageViewCounts.length
        ? pageViewCounts.reduce((total, count) => total + count, 0) / pageViewCounts.length
        : 0;
    };
    const averageDurationForSessions = (sessions: ActivitySessionRow[]) => {
      const sessionsWithDuration = sessions.filter(
        (session) => (session.duration_seconds ?? 0) > 0,
      );

      return sessionsWithDuration.length
        ? sessionsWithDuration.reduce(
            (total, session) => total + (session.duration_seconds ?? 0),
            0,
          ) / sessionsWithDuration.length
        : 0;
    };
    const registeredSessions = sessionRows.filter((session) => Boolean(session.user_id));
    const anonymousSessions = sessionRows.filter((session) => !session.user_id);
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
    const pageStats = new Map<
      string,
      { durationTotal: number; durationCount: number; path: string; title: string; views: number }
    >();

    pageViewEvents
      .filter((event) => isAfter(event.created_at, sevenDaysAgo))
      .forEach((event) => {
        const path = event.path ?? "未知页面";
        const current = pageStats.get(path) ?? {
          durationCount: 0,
          durationTotal: 0,
          path,
          title: event.page_title?.trim() || path,
          views: 0,
        };
        current.views += 1;
        if (!current.title || current.title === path) {
          current.title = event.page_title?.trim() || path;
        }
        pageStats.set(path, current);
      });

    sessionRows
      .filter((session) => isAfter(session.last_seen_at, sevenDaysAgo))
      .forEach((session) => {
        const path = session.last_path ?? session.first_path;
        const duration = session.duration_seconds ?? 0;

        if (!path || duration <= 0) {
          return;
        }

        const current = pageStats.get(path) ?? {
          durationCount: 0,
          durationTotal: 0,
          path,
          title: path,
          views: 0,
        };
        current.durationCount += 1;
        current.durationTotal += duration;
        pageStats.set(path, current);
      });

    const toPageStat = (page: {
      durationCount: number;
      durationTotal: number;
      path: string;
      title: string;
      views: number;
    }) => ({
      averageDuration: page.durationCount ? page.durationTotal / page.durationCount : 0,
      path: page.path,
      title: page.title,
      views: page.views,
    });
    const sortedPages = [...pageStats.values()].sort((left, right) => right.views - left.views);
    const popularPages = sortedPages.slice(0, 8).map(toPageStat);
    const modelAnswerPage = sortedPages.filter((page) => isModelAnswerPath(page.path))[0];

    return {
      activeNow: activeNow.length,
      averageDuration,
      pageViewsToday: todayPageViewEvents.length,
      firstTimeVisitorsToday: firstTimeVisitorKeys.size,
      modelAnswerPage: modelAnswerPage ? toPageStat(modelAnswerPage) : null,
      popularPages,
      registeredAverageDuration: averageDurationForSessions(registeredSessions),
      registeredAveragePageViews: averagePageViewsForSessions(registeredSessions),
      registeredToday: analytics.registeredToday,
      registeredVisitorsToday: registeredVisitorsToday.size,
      anonymousAverageDuration: averageDurationForSessions(anonymousSessions),
      anonymousAveragePageViews: averagePageViewsForSessions(anonymousSessions),
      returningAnonymousVisitorsToday: returningAnonymousVisitorKeys.size,
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
          <p className="admin-analytics-refresh-note">每 30 秒自动刷新；也可手动刷新</p>
        </div>
        <button className="button secondary" disabled={isLoading} type="button" onClick={loadAnalytics}>
          {isLoading ? "刷新中..." : "刷新数据"}
        </button>
      </header>

      {message ? <p className="admin-form-message error">{message}</p> : null}

      <div className="admin-analytics-groups">
        <section className="admin-analytics-group">
          <header className="admin-analytics-group-heading">
            <h3>访问规模</h3>
            <span>累计访问人数与用户构成</span>
          </header>
          <div className="admin-stat-grid admin-analytics-stat-row-3">
            <div>
              <span>累计访问人数</span>
              <strong>{metrics.totalKnownVisitors}</strong>
              <small>注册用户 + 匿名访客去重估算</small>
            </div>
            <div>
              <span>已注册用户</span>
              <strong>{analytics.profileCount}</strong>
              <small>当前普通注册用户</small>
            </div>
            <div>
              <span>未注册用户</span>
              <strong>{analytics.anonymousSessionCount}</strong>
              <small>累计匿名访客会话</small>
            </div>
          </div>
        </section>

        <section className="admin-analytics-group">
          <header className="admin-analytics-group-heading">
            <h3>今日访客行为</h3>
            <span>今日访问、回访与首次访客</span>
          </header>
          <div className="admin-stat-grid admin-analytics-stat-row-5">
            <div>
              <span>今日打开网站人数</span>
              <strong>{metrics.visitorsToday}</strong>
              <small>今日去重访问人数</small>
            </div>
            <div>
              <span>今日注册用户回访</span>
              <strong>{metrics.registeredVisitorsToday}</strong>
              <small>今日有页面访问的已注册用户</small>
            </div>
            <div>
              <span>今日匿名回访用户</span>
              <strong>{metrics.returningAnonymousVisitorsToday}</strong>
              <small>此前未注册，今日再次打开</small>
            </div>
            <div>
              <span>今日注册人数</span>
              <strong>{metrics.registeredToday}</strong>
              <small>按 profiles 创建时间</small>
            </div>
            <div>
              <span>今日首次打开网站访客</span>
              <strong>{metrics.firstTimeVisitorsToday}</strong>
              <small>历史首次识别到的访客</small>
            </div>
          </div>
        </section>

        <section className="admin-analytics-group">
          <header className="admin-analytics-group-heading">
            <h3>停留与浏览</h3>
            <span>平均会话表现</span>
          </header>
          <div className="admin-stat-grid admin-analytics-stat-row-5">
            <div>
              <span>平均停留时间</span>
              <strong>{formatDuration(metrics.averageDuration)}</strong>
              <small>全部已记录会话</small>
            </div>
            <div>
              <span>注册用户平均浏览页数</span>
              <strong>{formatAveragePageViews(metrics.registeredAveragePageViews)}</strong>
              <small>按有页面访问的会话计算</small>
            </div>
            <div>
              <span>注册用户平均停留时间</span>
              <strong>{formatDuration(metrics.registeredAverageDuration)}</strong>
              <small>注册用户已记录会话</small>
            </div>
            <div>
              <span>访客平均浏览页数</span>
              <strong>{formatAveragePageViews(metrics.anonymousAveragePageViews)}</strong>
              <small>按有页面访问的匿名会话计算</small>
            </div>
            <div>
              <span>访客平均停留时间</span>
              <strong>{formatDuration(metrics.anonymousAverageDuration)}</strong>
              <small>匿名访客已记录会话</small>
            </div>
          </div>
        </section>
      </div>

      <div className="admin-analytics-grid">
        <section className="admin-editor-card">
          <header className="admin-compact-heading">
            <h3>已注册用户</h3>
            <span>共 {analytics.profileCount} 人 · 最多显示 200 个</span>
          </header>
          <div className="admin-table admin-registered-user-list">
            {analytics.profileRows.length ? analytics.profileRows.map((profile) => (
              <div key={profile.id}>
                <span>{profile.email ?? profile.display_name ?? "未命名用户"}</span>
                <small>{profile.membership_status}</small>
                <small>{formatDateTime(profile.created_at)}</small>
              </div>
            )) : <p className="admin-empty-text">暂无注册用户。</p>}
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
            <span>最近 7 天 · 浏览量 / 平均停留</span>
          </header>
          <div className="admin-table">
            {metrics.popularPages.length ? (
              metrics.popularPages.map((page) => (
                <div key={page.path}>
                  <div className="admin-page-link-cell">
                    <Link href={page.path} title={page.path}>
                      {page.path}
                    </Link>
                  </div>
                  <small>{page.views} 次浏览</small>
                  <small>平均 {formatDuration(page.averageDuration)}</small>
                </div>
              ))
            ) : (
              <p className="admin-empty-text">暂无页面访问记录。</p>
            )}
          </div>
        </section>

        <section className="admin-editor-card">
          <header className="admin-compact-heading">
            <h3>热门范文页面</h3>
            <span>最近 7 天按浏览量</span>
          </header>
          {metrics.modelAnswerPage ? (
            <div className="admin-featured-page-stat">
              <strong>{metrics.modelAnswerPage.title}</strong>
              <span>{metrics.modelAnswerPage.path}</span>
              <small>
                {metrics.modelAnswerPage.views} 次浏览 · 平均停留 {formatDuration(metrics.modelAnswerPage.averageDuration)}
              </small>
            </div>
          ) : (
            <p className="admin-empty-text">暂无范文页面访问记录。</p>
          )}
          <p className="admin-card-note">范文页面按 speaking / writing 路径识别，排序依据为页面浏览量。</p>
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
