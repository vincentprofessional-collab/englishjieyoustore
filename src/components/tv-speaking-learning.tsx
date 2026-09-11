"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioSettingsMenus,
  DEFAULT_AUDIO_PLAYER_SETTINGS,
  type AudioPlayerSettings,
} from "@/components/audio-player";
import { BbcSentencePractice } from "@/components/bbc-sentence-practice";
import type { TvSpeakingManifest } from "@/lib/tv-speaking-types";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function activeWordIndex(text: string, position: number, duration: number) {
  const words = text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [];
  if (!words.length || duration <= 0) return null;
  return Math.min(words.length - 1, Math.floor((position / duration) * words.length));
}

export function TvSpeakingLearning({ manifest }: { manifest: TvSpeakingManifest }) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trainingSeconds, setTrainingSeconds] = useState<number | null>(null);
  const [settings, setSettings] = useState<AudioPlayerSettings>({
    ...DEFAULT_AUDIO_PLAYER_SETTINGS,
    subtitleMode: "bilingual",
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trainingTimerRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const clips = manifest.clips;
  const clip = clips[index] ?? null;

  function clearTraining() {
    if (trainingTimerRef.current != null) window.clearInterval(trainingTimerRef.current);
    if (advanceTimerRef.current != null) window.clearTimeout(advanceTimerRef.current);
    trainingTimerRef.current = null;
    advanceTimerRef.current = null;
    setTrainingSeconds(null);
  }

  function moveTo(nextIndex: number, autoPlay = false) {
    clearTraining();
    const bounded = Math.max(0, Math.min(clips.length - 1, nextIndex));
    setIndex(bounded);
    setPosition(0);
    setIsPlaying(false);
    if (autoPlay) {
      window.setTimeout(() => void videoRef.current?.play(), 0);
    }
  }

  useEffect(() => () => clearTraining(), []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = settings.rate;
  }, [settings.rate]);

  function updateSettings(next: Partial<AudioPlayerSettings>) {
    setSettings((current) => ({ ...current, ...next }));
  }

  function togglePlay() {
    clearTraining();
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

  function playNextByMode() {
    if (settings.playMode === "sentence-loop") {
      seek(0);
      void videoRef.current?.play();
    } else if (index < clips.length - 1) {
      moveTo(index + 1, true);
    }
  }

  function handleEnded() {
    setIsPlaying(false);
    if (settings.speakingMode === "none") {
      playNextByMode();
      return;
    }
    const waitSeconds =
      settings.speakingMode === "shadowing"
        ? 3
        : settings.speakingMode === "sight-translation"
          ? Math.max(duration * 1.5, 1)
          : Math.max(duration, 1);
    const deadline = Date.now() + waitSeconds * 1000;
    setTrainingSeconds(Math.ceil(waitSeconds));
    trainingTimerRef.current = window.setInterval(
      () => setTrainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      250,
    );
    advanceTimerRef.current = window.setTimeout(() => {
      clearTraining();
      playNextByMode();
    }, waitSeconds * 1000);
  }

  if (!clip) {
    return <section className="panel tv-speaking-empty"><h1>看美剧学口语</h1><p>暂时没有可播放的视频。</p></section>;
  }

  return (
    <section className="tv-speaking-page">
      <article className="tv-speaking-card" id={`tv-speaking-${clip.id}`}>
        <div className="tv-speaking-count"><strong>{index + 1}</strong><span>/ {clips.length}</span></div>
        <div className="tv-video-frame">
          {clip.videoUrl ? (
            <video
              key={clip.id}
              onDurationChange={(event) => setDuration(event.currentTarget.duration || clip.durationSeconds)}
              onEnded={handleEnded}
              onPause={() => setIsPlaying(false)}
              onPlay={() => { clearTraining(); setIsPlaying(true); }}
              onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
              playsInline
              preload="metadata"
              ref={videoRef}
              src={clip.videoUrl}
            />
          ) : (
            <div className="tv-video-unavailable">视频媒体正在准备中</div>
          )}
          <div className="tv-subtitle-mask" aria-label="视频学习字幕">
            <BbcSentencePractice
              activeWordIndex={isPlaying ? activeWordIndex(clip.english, position, duration || clip.durationSeconds) : null}
              isAudioPlaying={isPlaying}
              sentence={{ chinese: clip.chinese || "中文翻译待补充", english: clip.english, sentenceNo: clip.rank }}
              settings={settings}
            />
          </div>
          <button
            aria-label={isPlaying ? "暂停视频" : "播放视频"}
            className={`tv-center-play ${isPlaying ? "playing" : ""}`}
            disabled={!clip.videoUrl}
            onClick={togglePlay}
            type="button"
          >
            <span className={`player-play-icon ${isPlaying ? "pause" : "play"}`} aria-hidden="true" />
          </button>
        </div>

        <div className="howler-player tv-video-player">
          <div className="player-main-controls" aria-label="视频控制">
            <button aria-label="倒退 5 秒" className="icon-button" onClick={() => seek(position - 5)} type="button"><span className="player-skip-icon backward" /></button>
            <button className="play-button" disabled={!clip.videoUrl} onClick={togglePlay} type="button"><span className={`player-play-icon ${isPlaying ? "pause" : "play"}`} /><span className="sr-only">{isPlaying ? "暂停" : "播放"}</span></button>
            <button aria-label="前进 5 秒" className="icon-button" onClick={() => seek(position + 5)} type="button"><span className="player-skip-icon forward" /></button>
          </div>
          <div className="player-progress-row" aria-label="视频播放进度">
            <span>{formatTime(position)}</span>
            <input aria-label="视频播放进度" max={duration || clip.durationSeconds} min="0" onChange={(event) => seek(Number(event.target.value))} step="0.1" type="range" value={position} />
            <span>{formatTime(duration || clip.durationSeconds)}</span>
          </div>
        </div>

        <AudioSettingsMenus onChange={updateSettings} settings={settings} />

        {trainingSeconds != null ? (
          <div className="bbc-speaking-training-status practicing" aria-live="polite">
            <span>口语练习</span><strong>{trainingSeconds} 秒</strong><small>后{settings.playMode === "sentence-loop" ? "重播本条" : "播放下一条"}</small>
          </div>
        ) : null}

        <footer className="tv-speaking-navigation">
          <button disabled={index === 0} onClick={() => moveTo(index - 1)} type="button">← 上一条</button>
          <button disabled={index === clips.length - 1} onClick={() => moveTo(index + 1)} type="button">下一条 →</button>
        </footer>
      </article>
    </section>
  );
}
