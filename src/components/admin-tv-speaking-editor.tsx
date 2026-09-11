"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioSettingsMenus,
  DEFAULT_AUDIO_PLAYER_SETTINGS,
  type AudioPlayerSettings,
} from "@/components/audio-player";
import { BbcSentencePractice } from "@/components/bbc-sentence-practice";
import { supabase } from "@/lib/supabase/client";
import type { TvSpeakingClip } from "@/lib/tv-speaking-types";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function activeWordIndex(text: string, position: number, duration: number) {
  const words = text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [];
  if (!words.length || duration <= 0) return null;
  return Math.min(words.length - 1, Math.floor((position / duration) * words.length));
}

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
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [settings, setSettings] = useState<AudioPlayerSettings>({
    ...DEFAULT_AUDIO_PLAYER_SETTINGS,
    subtitleMode: "bilingual",
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clip = clips[index] ?? null;

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

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = settings.rate;
  }, [settings.rate]);

  function moveTo(nextIndex: number) {
    setIndex(Math.max(0, Math.min(clips.length - 1, nextIndex)));
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video || !clip?.videoUrl) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function seek(next: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration || 0, next));
    setPosition(video.currentTime);
  }

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
      setIndex((current) => Math.max(0, Math.min(current, clips.length - 2)));
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
      {clip ? (
        <article className="tv-speaking-card admin-tv-speaking-card" key={clip.id}>
          <div className="tv-speaking-count"><strong>{index + 1}</strong><span>/ {clips.length}</span></div>
          <div className="tv-video-frame">
            <video
              key={clip.id}
              onDurationChange={(event) => setDuration(event.currentTarget.duration || clip.durationSeconds)}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
              playsInline
              preload="metadata"
              ref={videoRef}
              src={clip.videoUrl ?? undefined}
            />
            <div className="tv-subtitle-mask" aria-label="视频学习字幕">
              <BbcSentencePractice
                activeWordIndex={isPlaying ? activeWordIndex(drafts[clip.id]?.english ?? clip.english, position, duration || clip.durationSeconds) : null}
                isAudioPlaying={isPlaying}
                sentence={{ chinese: drafts[clip.id]?.chinese ?? clip.chinese, english: drafts[clip.id]?.english ?? clip.english, sentenceNo: clip.rank }}
                settings={settings}
              />
            </div>
            <div className="tv-video-progress" aria-label="视频播放进度">
              <span>{formatTime(position)}</span>
              <input aria-label="视频播放进度" max={duration || clip.durationSeconds} min="0" onChange={(event) => seek(Number(event.target.value))} step="0.1" type="range" value={position} />
              <span>{formatTime(duration || clip.durationSeconds)}</span>
            </div>
            <button aria-label="上一条" className="tv-video-nav previous" disabled={index === 0} onClick={() => moveTo(index - 1)} type="button"><span aria-hidden="true">‹</span><strong>上一条</strong></button>
            <button aria-label="下一条" className="tv-video-nav next" disabled={index === clips.length - 1} onClick={() => moveTo(index + 1)} type="button"><strong>下一条</strong><span aria-hidden="true">›</span></button>
            <button aria-label={isPlaying ? "暂停视频" : "播放视频"} className={`tv-center-play ${isPlaying ? "playing" : ""}`} disabled={!clip.videoUrl} onClick={togglePlay} type="button"><span className={`player-play-icon ${isPlaying ? "pause" : "play"}`} aria-hidden="true" /></button>
          </div>

          <AudioSettingsMenus onChange={(next) => setSettings((current) => ({ ...current, ...next }))} settings={settings} />

          <div className="admin-tv-speaking-fields">
            <label>英文<input value={drafts[clip.id]?.english ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [clip.id]: { chinese: current[clip.id]?.chinese ?? "", english: event.target.value } }))} /></label>
            <label>中文翻译<input value={drafts[clip.id]?.chinese ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [clip.id]: { chinese: event.target.value, english: current[clip.id]?.english ?? "" } }))} /></label>
          </div>
          <div className="admin-tv-speaking-actions"><button className="button primary" disabled={busyId === clip.id} onClick={() => void save(clip)} type="button">保存修改</button><button className="button secondary danger" disabled={busyId === clip.id} onClick={() => void remove(clip)} type="button">删除本条视频</button></div>
        </article>
      ) : null}
    </section>
  );
}
