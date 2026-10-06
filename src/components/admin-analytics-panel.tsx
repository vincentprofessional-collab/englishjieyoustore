"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type IpVisitorMetricsRow = {
  first_time_visitors_today?: number;
  returning_anonymous_visitors_today?: number;
  visitors_today?: number;
};

type DailyMetrics = {
  firstTimeVisitors: number | null;
  returningRegisteredUsers: number;
  returningUnregisteredVisitors: number | null;
  averagePageViews: number | null;
  newAccounts: number;
};

const initialMetrics: DailyMetrics = {
  firstTimeVisitors: null,
  returningRegisteredUsers: 0,
  returningUnregisteredVisitors: null,
  averagePageViews: null,
  newAccounts: 0,
};

const PAGE_SIZE = 1000;
const MAX_LOGIN_ROWS = 50_000;

function startOfToday() {
  const shanghaiOffset = 8 * 60 * 60 * 1000;
  const shanghaiNow = new Date(Date.now() + shanghaiOffset);
  shanghaiNow.setUTCHours(0, 0, 0, 0);
  return new Date(shanghaiNow.getTime() - shanghaiOffset);
}

function readMetricValue(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

async function fetchTodayLoginUserIds(start: string, end: string) {
  const userIds = new Set<string>();

  for (let from = 0; from < MAX_LOGIN_ROWS; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("site_activity_events")
      .select("user_id")
      .eq("event_type", "login")
      .not("user_id", "is", null)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    rows.forEach((row) => {
      if (row.user_id) userIds.add(row.user_id);
    });

    if (rows.length < PAGE_SIZE) break;
  }

  return [...userIds];
}

async function countReturningRegisteredUsers(userIds: string[], today: string) {
  let count = 0;
  const batchSize = 200;

  for (let index = 0; index < userIds.length; index += batchSize) {
    const batch = userIds.slice(index, index + batchSize);
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .in("id", batch)
      .lt("created_at", today)
      .neq("role", "admin");

    if (error) {
      throw new Error(error.message);
    }

    count += data?.length ?? 0;
  }

  return count;
}

export function AdminAnalyticsPanel() {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadAnalytics() {
    setIsLoading(true);
    setMessage("");

    const today = startOfToday();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const todayIso = today.toISOString();
    const tomorrowIso = tomorrow.toISOString();

    try {
      const [ipMetricsResult, pageViewsResult, newAccountsResult, loginUserIds] =
        await Promise.all([
          supabase.rpc("get_admin_ip_visitor_metrics"),
          supabase
            .from("site_activity_events")
            .select("id", { count: "exact", head: true })
            .eq("event_type", "page_view")
            .gte("created_at", todayIso)
            .lt("created_at", tomorrowIso),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .neq("role", "admin")
            .gte("created_at", todayIso)
            .lt("created_at", tomorrowIso),
          fetchTodayLoginUserIds(todayIso, tomorrowIso),
        ]);

      if (pageViewsResult.error) throw new Error(pageViewsResult.error.message);
      if (newAccountsResult.error) throw new Error(newAccountsResult.error.message);

      const missingVisitorMetrics = Boolean(
        ipMetricsResult.error &&
          (ipMetricsResult.error.code === "42883" ||
            ipMetricsResult.error.message?.includes("get_admin_ip_visitor_metrics")),
      );
      if (ipMetricsResult.error && !missingVisitorMetrics) {
        throw new Error(ipMetricsResult.error.message);
      }

      const returningRegisteredUsers = await countReturningRegisteredUsers(loginUserIds, todayIso);
      const ipMetrics = Array.isArray(ipMetricsResult.data)
        ? (ipMetricsResult.data[0] as IpVisitorMetricsRow | undefined)
        : undefined;
      const visitorsToday = ipMetrics?.visitors_today;
      const pageViewsToday = pageViewsResult.count ?? 0;
      const visitorMetricsAvailable = Boolean(ipMetrics && !missingVisitorMetrics);

      setMetrics({
        firstTimeVisitors: visitorMetricsAvailable
          ? readMetricValue(ipMetrics?.first_time_visitors_today)
          : null,
        returningRegisteredUsers,
        returningUnregisteredVisitors: visitorMetricsAvailable
          ? readMetricValue(ipMetrics?.returning_anonymous_visitors_today)
          : null,
        averagePageViews: visitorMetricsAvailable
          ? pageViewsToday / Math.max(1, readMetricValue(visitorsToday))
          : null,
        newAccounts: newAccountsResult.count ?? 0,
      });

      if (missingVisitorMetrics) {
        setMessage("访客去重统计暂不可用；请在 Supabase 执行 supabase/018_ip_visitor_metrics.sql。");
      }
    } catch (error) {
      setMessage(`无法读取今日统计：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();

    const refreshTimer = window.setInterval(() => {
      void loadAnalytics();
    }, 30_000);

    return () => window.clearInterval(refreshTimer);
  }, []);

  const averagePageViews =
    metrics.averagePageViews === null ? "—" : `${metrics.averagePageViews.toFixed(1)} 页`;

  return (
    <section className="admin-analytics-panel">
      <header className="admin-editor-heading">
        <div>
          <span>Analytics</span>
          <h2>今日访客行为</h2>
          <p className="admin-analytics-refresh-note">上海时区 · 每 30 秒自动刷新</p>
        </div>
        <button className="button secondary" disabled={isLoading} type="button" onClick={loadAnalytics}>
          {isLoading ? "刷新中..." : "刷新数据"}
        </button>
      </header>

      {message ? <p className="admin-form-message error">{message}</p> : null}

      <div className="admin-analytics-groups">
        <section className="admin-analytics-group">
          <div className="admin-stat-grid admin-analytics-stat-row-5">
            <div>
              <span>今天首次打开网站</span>
              <strong>{metrics.firstTimeVisitors ?? "—"}</strong>
              <small>按 IP 识别的新访客</small>
            </div>
            <div>
              <span>已注册用户今天登录</span>
              <strong>{metrics.returningRegisteredUsers}</strong>
              <small>去重账户；不含今天新注册</small>
            </div>
            <div>
              <span>匿名访客今天回访</span>
              <strong>{metrics.returningUnregisteredVisitors ?? "—"}</strong>
              <small>按 IP 估算；未登录访客无法确认是否注册</small>
            </div>
            <div>
              <span>今日平均页面浏览量</span>
              <strong>{averagePageViews}</strong>
              <small>页面浏览总数 ÷ 今日访客数</small>
            </div>
            <div>
              <span>今日注册账户</span>
              <strong>{metrics.newAccounts}</strong>
              <small>按账户创建时间统计</small>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
