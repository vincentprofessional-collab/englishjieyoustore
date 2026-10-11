"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  LearningActivityOverview,
  type SavedVocabularyProgress,
} from "@/components/learning-progress";
import type { ShareableLearningProgressSnapshot } from "@/lib/learning/shared-progress";
import type { SiteStudyHistory } from "@/lib/learning/site-progress";
import type { DailySummary } from "@/lib/vocabulary/daily-summary";

type Person = { createdAt: string; displayName: string; id: string; memberNumber: number | null; userId: string };
type SharingOverview = {
  approvedIncoming: Person[];
  approvedOutgoing: Person[];
  pendingIncoming: Person[];
  pendingOutgoing: Person[];
};
type SharedProgress = {
  displayName: string;
  loginTimes: string[];
  requestId: string;
  snapshot: ShareableLearningProgressSnapshot;
  updatedAt: string | null;
};
type SearchUser = { display_name: string; member_number: number | null; user_id: string };

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
}

function OverviewList({ items, emptyText, onRevoke, onView, title }: {
  emptyText: string;
  items: Person[];
  onRevoke: (item: Person) => void;
  onView?: (item: Person) => void;
  title: string;
}) {
  return <section className="progress-sharing-list-card">
    <h2>{title}</h2>
    {items.length ? <ul>{items.map((item) => <li key={item.id}>
      <span><strong>{item.displayName}</strong>{item.memberNumber ? <small>会员编号 {item.memberNumber}</small> : null}</span>
      <div>{onView ? <button onClick={() => onView(item)} type="button">查看进度</button> : null}<button className="secondary" onClick={() => onRevoke(item)} type="button">{title.includes("待处理") ? "取消申请" : "撤回授权"}</button></div>
    </li>)}</ul> : <p>{emptyText}</p>}
  </section>;
}

export function LearningProgressSharing() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [sharing, setSharing] = useState<SharingOverview | null>(null);
  const [shared, setShared] = useState<SharedProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function refreshSharing() {
    const response = await fetch("/api/learning-progress-sharing?mode=sharing", { cache: "no-store" }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { error?: string; sharing?: SharingOverview } | null;
    if (!response?.ok) {
      setError(payload?.error ?? "请先登录后管理进度共享。" );
      return;
    }
    setSharing(payload?.sharing ?? null);
    setError("");
  }

  useEffect(() => { void refreshSharing(); }, []);

  async function searchUsers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    const response = await fetch("/api/learning-progress-sharing", {
      body: JSON.stringify({ action: "search", email: query.trim() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { error?: string; users?: SearchUser[] } | null;
    setBusy(false);
    if (!response?.ok) {
      setError(payload?.error ?? "查找失败，请稍后重试。");
      return;
    }
    setUsers(payload?.users ?? []);
    if (!payload?.users?.length) setStatus("没有找到匹配账号，请核对对方的注册邮箱。");
  }

  async function sendRequest(user: SearchUser) {
    setBusy(true);
    setError("");
    const response = await fetch("/api/learning-progress-sharing", {
      body: JSON.stringify({ action: "request", targetUserId: user.user_id }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { error?: string; request?: { status?: string } } | null;
    setBusy(false);
    if (!response?.ok) {
      setError(payload?.error ?? "申请失败，请稍后重试。");
      return;
    }
    setStatus(payload?.request?.status === "approved" ? `${user.display_name} 已授权，你现在可以查看他的进度。` : `已向 ${user.display_name} 发送站内授权申请。`);
    await refreshSharing();
  }

  async function revoke(item: Person) {
    setBusy(true);
    setError("");
    const response = await fetch("/api/learning-progress-sharing", {
      body: JSON.stringify({ action: "revoke", requestId: item.id }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { error?: string } | null;
    setBusy(false);
    if (!response?.ok) {
      setError(payload?.error ?? "撤回失败，请稍后重试。");
      return;
    }
    if (shared?.requestId === item.id) setShared(null);
    setStatus(`已撤回与 ${item.displayName} 的进度共享。`);
    await refreshSharing();
  }

  async function viewProgress(item: Person) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/learning-progress-sharing?mode=shared&requestId=${encodeURIComponent(item.id)}`, { cache: "no-store" }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { error?: string; shared?: SharedProgress } | null;
    setBusy(false);
    if (!response?.ok || !payload?.shared) {
      setError(payload?.error ?? "暂时无法读取共享记录。");
      return;
    }
    setShared(payload.shared);
  }

  return <main className="stack learning-sharing-page">
    <section className="learning-progress-hero"><p className="eyebrow">隐私授权</p><h1>查看他人学习进度</h1><p>申请发送站内询问；对方同意后才会开放进度。任何一方都可以撤回授权。</p></section>
    {error ? <p className="learning-sharing-message error" role="alert">{error}</p> : null}
    {status ? <p className="learning-sharing-message" role="status">{status}</p> : null}

    <section className="learning-sharing-search-card">
      <h2>申请查看</h2>
      <form onSubmit={(event) => void searchUsers(event)}>
        <label htmlFor="learning-sharing-query">对方的注册邮箱</label>
        <div><input autoComplete="off" id="learning-sharing-query" minLength={5} onChange={(event) => setQuery(event.target.value)} placeholder="输入对方注册时使用的邮箱" type="email" value={query} /><button disabled={busy || query.trim().length < 5 || !query.includes("@")} type="submit">{busy ? "处理中…" : "查找用户"}</button></div>
      </form>
      {users.length ? <ul className="learning-sharing-search-results">{users.map((user) => {
        const alreadyPending = sharing?.pendingOutgoing.some((item) => item.userId === user.user_id);
        const alreadyApproved = sharing?.approvedOutgoing.some((item) => item.userId === user.user_id);
        return <li key={user.user_id}><span><strong>{user.display_name}</strong>{user.member_number ? <small>会员编号 {user.member_number}</small> : null}</span><button disabled={busy || alreadyPending || alreadyApproved} onClick={() => void sendRequest(user)} type="button">{alreadyApproved ? "已授权" : alreadyPending ? "等待同意" : "申请查看"}</button></li>;
      })}</ul> : null}
      <p className="learning-sharing-privacy-note">系统仅用邮箱精确匹配并向对方发送站内授权询问。对方同意前，学习数据不会开放；无需管理员逐条处理。</p>
    </section>

    {sharing ? <div className="learning-sharing-lists">
      <OverviewList emptyText="暂无待处理申请。" items={sharing.pendingOutgoing} onRevoke={(item) => void revoke(item)} title="我发出的待处理申请" />
      <OverviewList emptyText="暂无已获授权的用户。" items={sharing.approvedOutgoing} onRevoke={(item) => void revoke(item)} onView={(item) => void viewProgress(item)} title="我可以查看的进度" />
      <OverviewList emptyText="你还没有授权其他用户查看。" items={sharing.approvedIncoming} onRevoke={(item) => void revoke(item)} title="已获准查看我进度的用户" />
    </div> : null}

    {shared ? <section className="shared-learning-progress">
      <header><div><p className="eyebrow">已授权共享</p><h2>{shared.displayName} 的学习进度</h2><p>数据更新时间：{shared.updatedAt ? formatDateTime(shared.updatedAt) : "等待对方同步"}</p></div><button onClick={() => setShared(null)} type="button">关闭</button></header>
      <section className="progress-sharing-logins"><h3>最近登录时间</h3>{shared.loginTimes.length ? <ul>{shared.loginTimes.map((time, index) => <li key={`${time}-${index}`}>{formatDateTime(time)}</li>)}</ul> : <p>暂无登录记录。</p>}</section>
      <section className="progress-sharing-wrongs"><h3>错题记录（{shared.snapshot.wrongQuestions.length}）</h3>{shared.snapshot.wrongQuestions.length ? <ul>{shared.snapshot.wrongQuestions.map((question, index) => <li key={`${question.href ?? question.title}-${index}`}>
        <div><strong>{question.title ?? "错题"}</strong>{question.sourceTitle ? <small>{question.sourceTitle}</small> : null}</div>
        {question.prompt ? <p>{question.prompt}</p> : null}
        {question.userAnswer ? <p>作答：{question.userAnswer}</p> : null}
        {question.correctAnswer ? <p>参考答案：{question.correctAnswer}</p> : null}
        {question.href ? <Link href={question.href}>打开题目</Link> : null}
      </li>)}</ul> : <p>目前没有已记录的错题。</p>}</section>
      <LearningActivityOverview
        ownerName={shared.displayName}
        siteHistory={shared.snapshot.siteHistory as SiteStudyHistory}
        vocabularyHistory={shared.snapshot.vocabularyHistory as Record<string, DailySummary>}
        vocabularyProgress={shared.snapshot.vocabularyProgress as SavedVocabularyProgress}
      />
    </section> : null}
  </main>;
}
