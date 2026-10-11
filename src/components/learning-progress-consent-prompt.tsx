"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { buildShareableLearningProgressSnapshot } from "@/lib/learning/shared-progress";

type IncomingRequest = {
  createdAt: string;
  displayName: string;
  id: string;
  memberNumber: number | null;
  userId: string;
};
type SharingResponse = { pendingIncoming?: IncomingRequest[] };

const DISMISSED_REQUESTS_KEY = "ielts-platform.progressSharingDismissed";

function readDismissedRequests() {
  try {
    return new Set(JSON.parse(window.sessionStorage.getItem(DISMISSED_REQUESTS_KEY) ?? "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

export function LearningProgressConsentPrompt() {
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setIncoming([]);
      return;
    }
    const response = await fetch("/api/learning-progress-sharing?mode=sharing", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const payload = await response.json().catch(() => null) as { sharing?: SharingResponse } | null;
    const dismissed = readDismissedRequests();
    setIncoming((payload?.sharing?.pendingIncoming ?? []).filter((item) => !dismissed.has(item.id)));
  }, []);

  useEffect(() => {
    void refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refresh(), 0);
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  async function respond(request: IncomingRequest, decision: "approved" | "declined") {
    setBusyId(request.id);
    setError("");
    const snapshot = decision === "approved" ? buildShareableLearningProgressSnapshot() : undefined;
    const response = await fetch("/api/learning-progress-sharing", {
      body: JSON.stringify({ action: "respond", decision, requestId: request.id, snapshot }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { error?: string } | null;
    if (!response?.ok) {
      setError(payload?.error ?? "暂时无法处理，请稍后重试。");
      setBusyId("");
      return;
    }
    setIncoming((current) => current.filter((item) => item.id !== request.id));
    setBusyId("");
  }

  function postpone(request: IncomingRequest) {
    const dismissed = readDismissedRequests();
    dismissed.add(request.id);
    window.sessionStorage.setItem(DISMISSED_REQUESTS_KEY, JSON.stringify([...dismissed]));
    setIncoming((current) => current.filter((item) => item.id !== request.id));
    setError("");
  }

  const request = incoming[0];
  if (!request) return null;

  return <div className="progress-consent-backdrop" role="presentation">
    <section aria-labelledby="progress-consent-title" aria-modal="true" className="progress-consent-dialog" role="dialog">
      <p className="eyebrow">学习进度共享申请</p>
      <h2 id="progress-consent-title">{request.displayName} 想查看你的学习进度</h2>
      <p>同意后，对方可查看你的学习时长、文章阅读记录、背词掌握统计、查词记录、错题记录和最近登录时间。你可以随时撤回授权。</p>
      <div className="progress-consent-actions">
        <button disabled={busyId === request.id} onClick={() => void respond(request, "declined")} type="button">拒绝</button>
        <button disabled={busyId === request.id} onClick={() => postpone(request)} type="button">稍后处理</button>
        <button className="primary" disabled={busyId === request.id} onClick={() => void respond(request, "approved")} type="button">
          {busyId === request.id ? "处理中…" : "同意并共享"}
        </button>
      </div>
      {error ? <p className="progress-consent-error" role="alert">{error}</p> : null}
      {incoming.length > 1 ? <small>还有 {incoming.length - 1} 条待处理申请。</small> : null}
    </section>
  </div>;
}
