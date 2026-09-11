"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { TvSpeakingClip } from "@/lib/tv-speaking-types";

async function adminHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("管理员登录已失效，请重新登录。");
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

export function AdminTvSpeakingEditor() {
  const [clips, setClips] = useState<TvSpeakingClip[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { chinese: string; english: string }>>({});
  const [message, setMessage] = useState("正在读取视频…");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/tv-speaking", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "读取失败。");
        setClips(payload.clips ?? []);
        setDrafts(Object.fromEntries((payload.clips ?? []).map((clip: TvSpeakingClip) => [clip.id, { chinese: clip.chinese, english: clip.english }])));
        setMessage(payload.clips?.length ? `共 ${payload.clips.length} 条视频` : "视频内容尚未初始化。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "读取失败。"));
  }, []);

  async function save(clip: TvSpeakingClip) {
    const draft = drafts[clip.id];
    if (!draft) return;
    setBusyId(clip.id);
    setMessage("正在保存…");
    try {
      const response = await fetch("/api/tv-speaking", { body: JSON.stringify({ id: clip.id, ...draft }), headers: await adminHeaders(), method: "PATCH" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "保存失败。");
      setClips((current) => current.map((item) => item.id === clip.id ? payload.clip : item));
      setMessage(`已保存第 ${clip.rank} 条。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(clip: TvSpeakingClip) {
    if (!window.confirm(`确定删除第 ${clip.rank} 条视频“${clip.english}”吗？视频文件也会从存储中删除。`)) return;
    setBusyId(clip.id);
    setMessage("正在删除…");
    try {
      const response = await fetch(`/api/tv-speaking?id=${encodeURIComponent(clip.id)}`, { headers: await adminHeaders(), method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "删除失败。");
      setClips((current) => current.filter((item) => item.id !== clip.id).map((item, index) => ({ ...item, rank: index + 1 })));
      setMessage(payload.storageWarning ? `条目已删除；存储清理提示：${payload.storageWarning}` : "视频和条目已删除。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败。");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-editor-panel">
      <div className="admin-editor-heading"><div><span>TV SPEAKING</span><h2>看美剧学口语</h2></div><a className="button secondary" href="/tv-speaking" target="_blank">查看前台 ↗</a></div>
      <p className="admin-form-message">{message}</p>
      <div className="admin-tv-speaking-list">
        {clips.map((clip) => (
          <article className="admin-tv-speaking-row" key={clip.id}>
            <div className="admin-tv-speaking-rank">#{clip.rank}</div>
            <video controls playsInline preload="metadata" src={clip.videoUrl ?? undefined} />
            <label>英文<input value={drafts[clip.id]?.english ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [clip.id]: { chinese: current[clip.id]?.chinese ?? "", english: event.target.value } }))} /></label>
            <label>中文翻译<input value={drafts[clip.id]?.chinese ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [clip.id]: { chinese: event.target.value, english: current[clip.id]?.english ?? "" } }))} /></label>
            <div className="admin-tv-speaking-actions"><button className="button primary" disabled={busyId === clip.id} onClick={() => void save(clip)} type="button">保存</button><button className="button secondary danger" disabled={busyId === clip.id} onClick={() => void remove(clip)} type="button">删除</button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
