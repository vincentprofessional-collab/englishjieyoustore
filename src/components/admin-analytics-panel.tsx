"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Overview = {
  active_now: number;
  login_users_today: number;
  page_views_today: number;
  profile_count: number;
  registered_accounts_today: number;
  registered_logins_today: number;
  registered_today: number;
};

type PageStat = { path: string; title: string; views: number };
type History = {
  anonymous_average_duration: number;
  anonymous_average_page_views: number;
  anonymous_page_view_count: number;
  anonymous_session_count: number;
  average_duration: number;
  first_time_visitors_today: number;
  model_answer_page: PageStat | null;
  popular_pages: PageStat[];
  registered_average_duration: number;
  registered_average_page_views: number;
  returning_anonymous_visitors_today: number;
  returning_registered_visitors_today: number;
  returning_visitors_today: number;
  visitors_today: number;
};

type ProfileRow = {
  created_at: string | null;
  display_name: string | null;
  email: string | null;
  id: string;
  membership_status: "free" | "paid" | "lifetime";
};

type SessionRow = {
  account: string;
  duration_seconds: number | null;
  first_path: string | null;
  id: string;
  last_path: string | null;
  last_seen_at: string | null;
};

type LoginRow = {
  account: string;
  created_at: string;
  id: string;
  path: string | null;
};

type PageResult<T> = {
  has_more: boolean;
  items: T[];
  limit: number;
  offset: number;
  total: number;
};

type Partition<T> = {
  data: T | null;
  error: string;
  lastUpdatedAt: string | null;
  loading: boolean;
};

type PageKey = "profiles" | "sessions" | "anonymous_sessions" | "logins";

function emptyPartition<T>(): Partition<T> {
  return { data: null, error: "", lastUpdatedAt: null, loading: false };
}

function formatDuration(value: number | null | undefined) {
  const seconds = Math.max(0, Math.round(value ?? 0));
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) return `${Math.floor(minutes / 60)}小时${minutes % 60}分`;
  if (minutes > 0) return `${minutes}分${seconds % 60}秒`;
  return `${seconds}秒`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAveragePageViews(value: number | null | undefined) {
  return `${(Number(value) || 0).toFixed(1)}页`;
}

function describeRpcError(error: { code?: string; message?: string }, functionName: string) {
  if (error.code === "PGRST202" || error.code === "42883") {
    return `统计升级尚未启用或 Supabase schema cache 尚未刷新。请管理员在 Supabase SQL Editor 执行 supabase/030_admin_analytics_dashboard.sql；若已执行，请刷新 PostgREST schema cache。出错函数：${functionName}。`;
  }
  if (error.code === "42501" || error.code === "401") {
    return "统计查询权限不足，请使用已登录的管理员账号。";
  }
  return error.message || "数据库查询失败，请检查 SQL 错误详情。";
}

function PartitionStatus<T>({ label, partition }: { label: string; partition: Partition<T> }) {
  if (partition.error) {
    return <p className="admin-card-note" role="alert">
      {label}本次读取失败：{partition.error}
      {partition.lastUpdatedAt ? ` 保留上次成功数据（${formatDateTime(partition.lastUpdatedAt)}）。` : " 暂无成功读取的数据。"}
    </p>;
  }
  if (partition.loading && !partition.data) return <p className="admin-card-note" role="status">正在读取{label}……</p>;
  return partition.lastUpdatedAt
    ? <p className="admin-card-note">{label}更新于 {formatDateTime(partition.lastUpdatedAt)}</p>
    : null;
}

async function rpc<T>(functionName: string, args: Record<string, unknown> | undefined, signal: AbortSignal) {
  const result = await supabase.rpc(functionName, args).abortSignal(signal);
  if (result.error) {
    const error = new Error(result.error.message) as Error & { code?: string; functionName?: string };
    error.code = result.error.code;
    error.functionName = functionName;
    throw error;
  }
  return result.data as T;
}

export function AdminAnalyticsPanel() {
  const [overview, setOverview] = useState<Partition<Overview>>(emptyPartition);
  const [history, setHistory] = useState<Partition<History>>(emptyPartition);
  const [profiles, setProfiles] = useState<Partition<PageResult<ProfileRow>>>(emptyPartition);
  const [sessions, setSessions] = useState<Partition<PageResult<SessionRow>>>(emptyPartition);
  const [anonymousSessions, setAnonymousSessions] = useState<Partition<PageResult<SessionRow>>>(emptyPartition);
  const [logins, setLogins] = useState<Partition<PageResult<LoginRow>>>(emptyPartition);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeControllers = useRef(new Set<AbortController>());
  const pageControllers = useRef(new Map<PageKey, AbortController>());
  const refreshInFlight = useRef(false);
  const resumeAfterVisibility = useRef(false);
  const refreshRef = useRef<(includeDetails: boolean) => Promise<void>>(async () => {});
  const mounted = useRef(false);
  const offsets = useRef<Record<PageKey, number>>({ profiles: 0, sessions: 0, anonymous_sessions: 0, logins: 0 });

  const loadPage = useCallback(async (kind: PageKey, offset: number, signal?: AbortSignal) => {
    if (pageControllers.current.has(kind)) return;
    const controller = new AbortController();
    const parentSignal = signal;
    const abortChild = () => controller.abort();
    if (parentSignal?.aborted) controller.abort();
    else parentSignal?.addEventListener("abort", abortChild, { once: true });
    const activeSignal = controller.signal;
    pageControllers.current.set(kind, controller);
    activeControllers.current.add(controller);
    const setters = { profiles: setProfiles, sessions: setSessions, anonymous_sessions: setAnonymousSessions, logins: setLogins };
    const setter = setters[kind] as (update: (current: Partition<PageResult<unknown>>) => Partition<PageResult<unknown>>) => void;
    setter((current) => ({ ...current, error: "", loading: true }));
    try {
      const data = await rpc<PageResult<ProfileRow | SessionRow | LoginRow>>(
        "get_admin_analytics_page",
        { p_kind: kind, p_offset: offset, p_limit: 10 },
        activeSignal,
      );
      if (activeSignal.aborted || !mounted.current) return;
      offsets.current[kind] = data.offset;
      setter((current) => ({ ...current, data: data as PageResult<unknown>, error: "", lastUpdatedAt: new Date().toISOString(), loading: false }));
    } catch (reason) {
      if (activeSignal.aborted || !mounted.current) return;
      const error = reason as Error & { code?: string; functionName?: string };
      const message = error.code
        ? describeRpcError(error, error.functionName ?? "get_admin_analytics_page")
        : error.message || "读取失败，请重试。";
      setter((current) => ({ ...current, error: message, loading: false }));
    } finally {
      parentSignal?.removeEventListener("abort", abortChild);
      activeControllers.current.delete(controller);
      if (pageControllers.current.get(kind) === controller) pageControllers.current.delete(kind);
      if (resumeAfterVisibility.current && document.visibilityState === "visible" && mounted.current && !refreshInFlight.current) {
        resumeAfterVisibility.current = false;
        queueMicrotask(() => void refreshRef.current(true));
      }
    }
  }, []);

  const refresh = useCallback(async (includeDetails: boolean) => {
    if (!mounted.current || document.visibilityState === "hidden" || refreshInFlight.current) return;
    refreshInFlight.current = true;
    setIsRefreshing(true);
    const controller = new AbortController();
    activeControllers.current.add(controller);

    const loadPartition = async <T,>(setter: (update: (current: Partition<T>) => Partition<T>) => void, functionName: string) => {
      setter((current) => ({ ...current, error: "", loading: true }));
      try {
        const data = await rpc<T>(functionName, undefined, controller.signal);
        if (controller.signal.aborted || !mounted.current) return;
        setter(() => ({ data, error: "", lastUpdatedAt: new Date().toISOString(), loading: false }));
      } catch (reason) {
        if (controller.signal.aborted || !mounted.current) return;
        const error = reason as Error & { code?: string; functionName?: string };
        setter((current) => ({ ...current, error: error.code ? describeRpcError(error, functionName) : error.message || "读取失败，请重试。", loading: false }));
      }
    };

    const tasks: Promise<void>[] = [
      loadPartition(setOverview, "get_admin_analytics_overview"),
      loadPartition(setHistory, "get_admin_analytics_history"),
    ];
    if (includeDetails) {
      tasks.push(
        loadPage("profiles", offsets.current.profiles, controller.signal),
        loadPage("sessions", offsets.current.sessions, controller.signal),
        loadPage("anonymous_sessions", offsets.current.anonymous_sessions, controller.signal),
        loadPage("logins", offsets.current.logins, controller.signal),
      );
    }

    try {
      await Promise.all(tasks);
    } finally {
      activeControllers.current.delete(controller);
      refreshInFlight.current = false;
      if (mounted.current) setIsRefreshing(false);
      if (resumeAfterVisibility.current && pageControllers.current.size === 0 && document.visibilityState === "visible" && mounted.current) {
        resumeAfterVisibility.current = false;
        queueMicrotask(() => void refreshRef.current(true));
      }
    }
  }, [loadPage]);
  refreshRef.current = refresh;

  useEffect(() => {
    mounted.current = true;
    const cancelRequests = () => {
      for (const controller of activeControllers.current) controller.abort();
      activeControllers.current.clear();
      pageControllers.current.clear();
      if (mounted.current) {
        setIsRefreshing(false);
        setOverview((current) => ({ ...current, loading: false }));
        setHistory((current) => ({ ...current, loading: false }));
        setProfiles((current) => ({ ...current, loading: false }));
        setSessions((current) => ({ ...current, loading: false }));
        setAnonymousSessions((current) => ({ ...current, loading: false }));
        setLogins((current) => ({ ...current, loading: false }));
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (activeControllers.current.size > 0) resumeAfterVisibility.current = true;
        cancelRequests();
      }
      else void refresh(true);
    };
    void refresh(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(false);
    }, 30_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      for (const controller of activeControllers.current) controller.abort();
      activeControllers.current.clear();
      pageControllers.current.clear();
      refreshInFlight.current = false;
    };
  }, [refresh]);

  const overviewData = overview.data;
  const historyData = history.data;
  const pages: { key: PageKey; title: string; partition: Partition<PageResult<unknown>> }[] = [
    { key: "profiles", title: "已注册用户", partition: profiles as Partition<PageResult<unknown>> },
    { key: "sessions", title: "最近访问", partition: sessions as Partition<PageResult<unknown>> },
    { key: "anonymous_sessions", title: "未注册访问", partition: anonymousSessions as Partition<PageResult<unknown>> },
    { key: "logins", title: "最近登录", partition: logins as Partition<PageResult<unknown>> },
  ];

  return (
    <section className="admin-analytics-panel">
      <header className="admin-editor-heading">
        <div>
          <span>Analytics</span>
          <h2>网站数据后台</h2>
          <p className="admin-analytics-refresh-note">汇总每 30 秒刷新；明细按页读取，每页 10 条</p>
        </div>
        <button className="button secondary" disabled={isRefreshing} type="button" onClick={() => void refresh(true)}>
          {isRefreshing ? "刷新中..." : "刷新数据"}
        </button>
      </header>

      <div className="admin-analytics-groups">
        <section className="admin-analytics-group">
          <header className="admin-analytics-group-heading">
            <h3>账号与匿名访问</h3>
            <span>上海时区；排除管理员；匿名访客标识不等于自然人数</span>
          </header>
          <PartitionStatus label="账号汇总" partition={overview} />
          <PartitionStatus label="匿名访问与历史汇总" partition={history} />
          <div className="admin-stat-grid admin-analytics-stat-row-3">
            <div><span>累计注册账号</span><strong>{overviewData?.profile_count ?? "—"}</strong><small>不含管理员，按 profiles 表统计</small></div>
            <div><span>累计匿名访客标识</span><strong>{historyData?.anonymous_session_count ?? "—"}</strong><small>优先按 IP 哈希或访客字段去重</small></div>
            <div><span>匿名页面浏览量</span><strong>{historyData?.anonymous_page_view_count ?? "—"}</strong><small>全历史匿名 page_view 事件</small></div>
          </div>
        </section>

        <section className="admin-analytics-group">
          <header className="admin-analytics-group-heading"><h3>今日访客行为</h3><span>完整历史用于识别今天首次访问或回访；日界线采用 Asia/Shanghai</span></header>
          <div className="admin-stat-grid admin-analytics-stat-row-5">
            <div><span>今天首次打开网站</span><strong>{historyData?.first_time_visitors_today ?? "—"}</strong><small>按访客标识统计</small></div>
            <div><span>已注册用户今天登录</span><strong>{overviewData?.registered_logins_today ?? "—"}</strong><small>去重账号，不含今天新注册账号</small></div>
            <div><span>匿名访客今天回访</span><strong>{historyData?.returning_anonymous_visitors_today ?? "—"}</strong><small>今日再次访问且未关联注册账号</small></div>
            <div><span>今日平均页面浏览量</span><strong>{formatAveragePageViews((overviewData?.page_views_today ?? 0) / Math.max(1, historyData?.visitors_today ?? 0))}</strong><small>今日浏览量 ÷ 今日访客标识</small></div>
            <div><span>今日注册账户</span><strong>{overviewData?.registered_today ?? "—"}</strong><small>按账号创建时间统计</small></div>
          </div>
          <p className="admin-card-note">今日回访：{historyData?.returning_visitors_today ?? "—"} 个访客标识，其中注册访问 {historyData?.returning_registered_visitors_today ?? "—"} 个；今日访问的注册账号 {overviewData?.registered_accounts_today ?? "—"} 个。</p>
        </section>

        <section className="admin-analytics-group">
          <header className="admin-analytics-group-heading"><h3>停留与浏览</h3><span>数据库全历史汇总；平均会话时间可能包含浏览器后台闲置</span></header>
          <PartitionStatus label="会话时长与浏览量" partition={history} />
          <div className="admin-stat-grid admin-analytics-stat-row-5">
            <div><span>当前活跃会话</span><strong>{overviewData?.active_now ?? "—"}</strong><small>最近 5 分钟有活动</small></div>
            <div><span>平均会话经过时间</span><strong>{formatDuration(historyData?.average_duration)}</strong><small>按有记录时长的会话计算</small></div>
            <div><span>注册用户平均浏览页数</span><strong>{formatAveragePageViews(historyData?.registered_average_page_views)}</strong><small>按有页面访问的会话计算</small></div>
            <div><span>注册账号平均会话时间</span><strong>{formatDuration(historyData?.registered_average_duration)}</strong><small>可能包含浏览器后台闲置</small></div>
            <div><span>访客平均浏览页数 / 时长</span><strong>{formatAveragePageViews(historyData?.anonymous_average_page_views)} · {formatDuration(historyData?.anonymous_average_duration)}</strong><small>按匿名会话计算</small></div>
          </div>
        </section>
      </div>

      <div className="admin-analytics-grid">
        {pages.map(({ key, title, partition }) => {
          const page = partition.data;
          return <section className="admin-editor-card" key={key}>
            <header className="admin-compact-heading">
              <h3>{title}</h3>
              <span>{page ? `共 ${page.total} 条 · 每页 ${page.limit} 条` : "每页读取 10 条"}</span>
            </header>
            <PartitionStatus label={title} partition={partition} />
            <div className={key === "profiles" ? "admin-table admin-registered-user-list" : "admin-table"}>
              {key === "profiles" && (page?.items as ProfileRow[] | undefined)?.map((row) => <div key={row.id}><span>{row.email ?? row.display_name ?? "未命名用户"}</span><small>{row.membership_status}</small><small>{formatDateTime(row.created_at)}</small></div>)}
              {(key === "sessions" || key === "anonymous_sessions") && (page?.items as SessionRow[] | undefined)?.map((row) => <div key={row.id}><span>{key === "anonymous_sessions" ? "匿名访问" : row.account}</span><small>{row.last_path ?? row.first_path ?? "未知页面"}</small><small>{formatDuration(row.duration_seconds)}</small></div>)}
              {key === "logins" && (page?.items as LoginRow[] | undefined)?.map((row) => <div key={row.id}><span>{row.account}</span><small>{row.path ?? "未知页面"}</small><small>{formatDateTime(row.created_at)}</small></div>)}
              {page && !page.items.length ? <p className="admin-empty-text">暂无记录。</p> : null}
              {!page && !partition.error && !partition.loading ? <p className="admin-empty-text">等待首次读取。</p> : null}
            </div>
            {page && page.total > page.limit ? <nav aria-label={`${title}翻页`} className="admin-membership-pagination">
              <button disabled={partition.loading || page.offset === 0} onClick={() => void loadPage(key, Math.max(0, page.offset - page.limit))} type="button">上一页</button>
              <span>{Math.floor(page.offset / page.limit) + 1} / {Math.ceil(page.total / page.limit)}</span>
              <button disabled={partition.loading || !page.has_more} onClick={() => void loadPage(key, page.offset + page.limit)} type="button">下一页</button>
            </nav> : null}
          </section>;
        })}

        <section className="admin-editor-card">
          <header className="admin-compact-heading"><h3>热门页面</h3><span>最近 7 天 · 数据库汇总</span></header>
          <PartitionStatus label="热门页面" partition={history} />
          <div className="admin-table">{historyData?.popular_pages.length ? historyData.popular_pages.map((page) => <div key={page.path}><div className="admin-page-link-cell"><Link href={page.path} title={page.title}>{page.path}</Link></div><small>{page.views} 次浏览</small></div>) : <p className="admin-empty-text">暂无页面访问记录。</p>}</div>
        </section>

        <section className="admin-editor-card">
          <header className="admin-compact-heading"><h3>热门范文页面</h3><span>最近 7 天按浏览量</span></header>
          <PartitionStatus label="范文页面" partition={history} />
          {historyData?.model_answer_page ? <div className="admin-featured-page-stat"><strong>{historyData.model_answer_page.title}</strong><span>{historyData.model_answer_page.path}</span><small>{historyData.model_answer_page.views} 次浏览</small></div> : <p className="admin-empty-text">暂无范文页面访问记录。</p>}
          <p className="admin-card-note">按 speaking / writing 路径识别。</p>
        </section>
      </div>
    </section>
  );
}
