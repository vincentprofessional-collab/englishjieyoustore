"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type PopularPage = { path: string; views: number };
type DailyVisitor = {
  date: string;
  registered_visitors: number;
  returning_anonymous_visitors: number;
  first_time_visitors: number;
  registrations: number;
};
type DashboardSnapshot = {
  daily_visitors?: DailyVisitor[];
  lifetime_audience?: LifetimeAudienceMetrics;
  popular_pages?: PopularPage[];
};
type LifetimeAudienceMetrics = {
  registered_users_total: number;
  visitors_total: number;
  visitors_over_five_visits: number;
};

function getShanghaiToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function AdminAnalyticsPanel() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loadInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (loadInFlight.current || document.visibilityState === "hidden") return;
    loadInFlight.current = true;
    setIsLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("get_admin_dashboard_with_lifetime", { p_days: 1 });

      if (error) {
        if (error.code === "PGRST202") {
          throw new Error("Supabase API 缓存暂未识别累计统计函数（PGRST202）。请刷新页面后重试；若仍失败，请确认网站连接的 Supabase 项目已执行 supabase/038_admin_lifetime_audience_metrics.sql。");
        }
        if (error.code === "42883") {
          throw new Error("累计用户统计函数尚未启用；请在 Supabase 执行 supabase/038_admin_lifetime_audience_metrics.sql。");
        }
        throw error;
      }

      const result = data as DashboardSnapshot | null;
      if (!result?.daily_visitors?.some((row) => Object.hasOwn(row, "first_time_visitors"))) {
        throw new Error("每日首次访问统计尚未启用；请在 Supabase 执行 supabase/034_admin_first_time_visitors.sql。");
      }
      setSnapshot({
        daily_visitors: (result?.daily_visitors ?? []).map((row) => ({
          ...row,
          registered_visitors: Number(row.registered_visitors),
          returning_anonymous_visitors: Number(row.returning_anonymous_visitors),
          first_time_visitors: Number(row.first_time_visitors ?? 0),
          registrations: Number(row.registrations),
        })),
        lifetime_audience: result?.lifetime_audience ? {
          registered_users_total: Number(result.lifetime_audience.registered_users_total),
          visitors_total: Number(result.lifetime_audience.visitors_total),
          visitors_over_five_visits: Number(result.lifetime_audience.visitors_over_five_visits),
        } : undefined,
        popular_pages: (result?.popular_pages ?? []).map((row) => ({ ...row, views: Number(row.views) })),
      });
      if (!result?.lifetime_audience) throw new Error("返回结果缺少累计用户统计；请检查 supabase/038_admin_lifetime_audience_metrics.sql 是否已执行。");
    } catch (error) {
      setMessage(`无法读取网站统计：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      loadInFlight.current = false;
      setIsLoading(false);
    }
  }, []);

  const today = getShanghaiToday();
  const dailyVisitors = snapshot?.daily_visitors ?? [];
  const todayVisitors = dailyVisitors.find((row) => row.date === today) ?? dailyVisitors[0];
  const lifetimeMetrics = snapshot?.lifetime_audience ?? null;
  const pages = snapshot?.popular_pages ?? [];

  return (
    <section className="admin-analytics-panel">
      <header className="admin-editor-heading">
        <div>
          <span>Analytics</span>
          <h2>网站数据后台</h2>
          <p className="admin-analytics-refresh-note">累计用户与回访、今日访客和近 7 天热门页面。点击刷新时读取统计数据。</p>
        </div>
        <button className="button secondary" disabled={isLoading} type="button" onClick={() => void refresh()}>
          {isLoading ? "读取中..." : "刷新数据"}
        </button>
      </header>

      {message ? <p className="admin-form-message error">{message}</p> : null}

      <section className="admin-editor-card">
        <header className="admin-compact-heading">
          <h3>累计用户与回访</h3>
          <span>网站全部记录</span>
        </header>
        {lifetimeMetrics ? (
          <div className="admin-daily-metric-grid">
            <article className="admin-daily-metric-card">
              <span>注册用户总数</span>
              <strong>{lifetimeMetrics.registered_users_total}</strong>
            </article>
            <article className="admin-daily-metric-card">
              <span>曾经打开网站的访客</span>
              <strong>{lifetimeMetrics.visitors_total}</strong>
            </article>
            <article className="admin-daily-metric-card">
              <span>回访超过 5 次</span>
              <strong>{lifetimeMetrics.visitors_over_five_visits}</strong>
            </article>
          </div>
        ) : (
          <p className="admin-empty-text">{isLoading ? "正在读取累计用户统计…" : "点击右上角“刷新数据”查看统计。"}</p>
        )}
        <p className="admin-analytics-refresh-note">注册用户排除管理员；访客按浏览器标识估算，清除浏览器数据或更换设备可能重复计数。回访按 30 分钟无活动划分访问会话，历史记录按不同访问日期估算。</p>
      </section>

      <section className="admin-editor-card">
        <header className="admin-compact-heading">
          <h3>今日访客与注册</h3>
          <span>中国标准时间</span>
        </header>
        {snapshot ? (
          <div className="admin-daily-metric-grid">
            <article className="admin-daily-metric-card">
              <span>已注册用户今日访问</span>
              <strong>{todayVisitors?.registered_visitors ?? 0}</strong>
            </article>
            <article className="admin-daily-metric-card">
              <span>曾来访匿名用户今日回访</span>
              <strong>{todayVisitors?.returning_anonymous_visitors ?? 0}</strong>
            </article>
            <article className="admin-daily-metric-card">
              <span>今日首次打开网站</span>
              <strong>{todayVisitors?.first_time_visitors ?? 0}</strong>
            </article>
            <article className="admin-daily-metric-card">
              <span>今日新注册用户</span>
              <strong>{todayVisitors?.registrations ?? 0}</strong>
            </article>
          </div>
        ) : (
          <p className="admin-empty-text">{isLoading ? "正在读取每日统计…" : "点击右上角“刷新数据”查看统计。"}</p>
        )}
        <p className="admin-analytics-refresh-note">首次打开和匿名回访按浏览器本地标识估算；清除浏览器数据或更换设备后会按新访客统计。</p>
      </section>

      <section className="admin-editor-card">
        <header className="admin-compact-heading">
          <h3>近 7 天热门页面 Top 20</h3>
          <span>最近 7 天</span>
        </header>
        <div className="admin-table">
          {pages.length ? pages.map((page, index) => (
            <div key={page.path}>
              <span>{index + 1}</span>
              <div className="admin-page-link-cell">
                <Link href={page.path} title={page.path}>{page.path}</Link>
              </div>
              <small>{page.views} 次访问</small>
            </div>
          )) : (
            <p className="admin-empty-text">
              {isLoading ? "正在读取热门页面…" : snapshot ? "暂无页面访问记录。" : "点击右上角“刷新数据”查看统计。"}
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
