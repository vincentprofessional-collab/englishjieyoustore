"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type VocabularyVideoItem = {
  likedByMe: boolean;
  likes: number;
  path: string;
  src: string;
};

function formatVideoTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const totalSeconds = Math.floor(value);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes >= 60) {
    return String(Math.floor(minutes / 60)) + ":" + String(minutes % 60).padStart(2, "0") + ":" + seconds;
  }
  return String(minutes).padStart(2, "0") + ":" + seconds;
}

export function VocabularyVideoPlayer({
  entryWord,
  previewMode = false,
  totalVideos,
  votesEnabled,
  videos: initialVideos,
}: {
  entryWord: string;
  previewMode?: boolean;
  totalVideos: number;
  votesEnabled: boolean;
  videos: VocabularyVideoItem[];
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [notice, setNotice] = useState("");
  const [autoplayOnChange, setAutoplayOnChange] = useState(false);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLElement | null>(null);
  const activePathRef = useRef(initialVideos[0]?.path ?? null);
  const currentVideo = videos[activeIndex] ?? null;

  useEffect(() => {
    const preservedIndex = initialVideos.findIndex((video) => video.path === activePathRef.current);
    const nextIndex = preservedIndex >= 0 ? preservedIndex : 0;
    const activeVideoWasRemoved = preservedIndex < 0;

    setVideos(initialVideos);
    setActiveIndex(nextIndex);
    activePathRef.current = initialVideos[nextIndex]?.path ?? null;
    if (activeVideoWasRemoved) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [initialVideos]);

  useEffect(() => {
    if (!autoplayOnChange) return;
    setAutoplayOnChange(false);
    if (previewMode) {
      setIsPlaying(true);
      return;
    }
    void videoRef.current?.play().catch(() => setNotice("视频暂时无法播放，请稍后再试。"));
  }, [activeIndex, autoplayOnChange, previewMode]);

  function selectVideo(index: number, autoplay = false) {
    if (videos.length === 0) return;
    const nextIndex = (index + videos.length) % videos.length;
    activePathRef.current = videos[nextIndex]?.path ?? null;
    setActiveIndex(nextIndex);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setNotice("");
    setAutoplayOnChange(autoplay);
  }

  async function togglePlayback() {
    if (previewMode) {
      setIsPlaying((playing) => !playing);
      return;
    }
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      try {
        await videoRef.current.play();
      } catch {
        setNotice("视频暂时无法播放，请稍后再试。");
      }
    } else {
      videoRef.current.pause();
    }
  }

  async function toggleLike() {
    if (!currentVideo || currentVideo.likedByMe || (!votesEnabled && !previewMode)) return;
    setNotice("");

    if (previewMode) {
      setVideos((current) => current.map((video) => video.path === currentVideo.path
        ? { ...video, likedByMe: true, likes: video.likes + 1 }
        : video));
      return;
    }

    try {
      const response = await fetch("/api/vocabulary-video-votes", {
        body: JSON.stringify({ path: currentVideo.path, word: entryWord }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { error?: string; likes?: number; liked?: boolean };
      if (!response.ok) {
        setNotice(result.error ?? "点赞未成功，请登录后重试。");
        return;
      }
      setVideos((current) => current.map((video) => video.path === currentVideo.path
        ? { ...video, likedByMe: Boolean(result.liked), likes: Number(result.likes ?? video.likes + 1) }
        : video));
      router.refresh();
    } catch {
      setNotice("点赞未成功，请检查网络后重试。");
    }
  }

  async function toggleFullscreen() {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await player.requestFullscreen();
      }
    } catch {
      setNotice("当前浏览器不支持全屏播放。");
    }
  }

  async function togglePictureInPicture() {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) {
      setNotice("当前浏览器不支持小窗播放。");
      return;
    }
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      setNotice("无法打开小窗播放，请先开始播放视频。");
    }
  }

  return (
    <section aria-label="单词视频" className="vocabulary-video-panel" ref={(element) => { playerRef.current = element; }}>
      <header className="vocabulary-video-panel-head">
        <h2>看语境，记单词，学用法</h2>
        <span className="vocabulary-video-count">共 {totalVideos} 个视频</span>
      </header>

      {currentVideo ? (
        <>
          <div className="vocabulary-video-frame">
            {previewMode ? (
              <div className={`vocabulary-video-preview-scene ${isPlaying ? "is-playing" : ""}`}>
                <span className="vocabulary-video-preview-label">播放器效果预览</span>
                <div className="vocabulary-video-preview-orbit vocabulary-video-preview-orbit-one" />
                <div className="vocabulary-video-preview-orbit vocabulary-video-preview-orbit-two" />
                <button
                  aria-label={isPlaying ? "暂停预览" : "播放预览"}
                  className="vocabulary-video-preview-play"
                  onClick={togglePlayback}
                  type="button"
                >
                  {isPlaying ? "Ⅱ" : "▶"}
                </button>
                <span className="vocabulary-video-preview-caption">视频上传完成后在这里播放</span>
              </div>
            ) : (
              <video
                key={currentVideo.path}
                aria-label="单词例句视频"
                onDurationChange={(event) => {
                  if (event.currentTarget === videoRef.current) setDuration(event.currentTarget.duration);
                }}
                onError={() => setNotice("视频尚未上传完成或暂时无法读取，请稍后刷新。")}
                onLoadedMetadata={(event) => {
                  if (event.currentTarget !== videoRef.current) return;
                  setDuration(event.currentTarget.duration);
                  setCurrentTime(event.currentTarget.currentTime);
                }}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onTimeUpdate={(event) => {
                  if (event.currentTarget === videoRef.current) setCurrentTime(event.currentTarget.currentTime);
                }}
                playsInline
                preload="metadata"
                ref={videoRef}
                src={currentVideo.src}
              />
            )}
            {!previewMode ? (
              <div aria-label="画面显示方式" className="vocabulary-video-frame-actions">
                <button
                  aria-label="小窗播放"
                  className="vocabulary-video-frame-action-button"
                  onClick={togglePictureInPicture}
                  title="小窗播放"
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <rect height="14" rx="2" width="18" x="3" y="4" />
                    <path d="M12 12h7v5h-7z" />
                  </svg>
                </button>
                <button
                  aria-label="全屏播放"
                  className="vocabulary-video-frame-action-button"
                  onClick={toggleFullscreen}
                  title="全屏播放"
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>
          <div aria-label="视频控制条" className="vocabulary-video-controls">
            <button
              aria-label="播放上一个视频"
              className="vocabulary-video-control-button"
              onClick={() => selectVideo(activeIndex - 1, true)}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button
              aria-label={isPlaying ? "暂停视频" : "播放视频"}
              className="vocabulary-video-control-button is-play-pause"
              onClick={togglePlayback}
              type="button"
            >
              {isPlaying ? (
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" /></svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z" /></svg>
              )}
            </button>
            <time className="vocabulary-video-time">{formatVideoTime(currentTime)}</time>
            <input
              aria-label="视频时间进度条"
              className="vocabulary-video-seek"
              disabled={duration <= 0 || previewMode}
              max={duration || 0}
              min={0}
              onChange={(event) => {
                const nextTime = Number(event.currentTarget.value);
                if (videoRef.current) videoRef.current.currentTime = nextTime;
                setCurrentTime(nextTime);
              }}
              step={0.1}
              type="range"
              value={Math.min(currentTime, duration)}
            />
            <time className="vocabulary-video-time">{formatVideoTime(duration)}</time>
            <button
              aria-label="播放下一个视频"
              className="vocabulary-video-control-button"
              onClick={() => selectVideo(activeIndex + 1, true)}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
            </button>
            <button
              aria-label={`点赞当前视频，${currentVideo.likes} 个赞`}
              aria-pressed={currentVideo.likedByMe}
              className={`vocabulary-video-action-button vocabulary-video-like-button ${currentVideo.likedByMe ? "is-liked" : ""}`}
              disabled={(!votesEnabled && !previewMode) || currentVideo.likedByMe}
              onClick={toggleLike}
              title={!votesEnabled && !previewMode ? "点赞功能将在数据表启用后开放" : undefined}
              type="button"
            >
              <span aria-hidden="true">{currentVideo.likedByMe ? "♥" : "♡"}</span>
              <span>{currentVideo.likes}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="vocabulary-video-empty">
          <span aria-hidden="true" className="vocabulary-video-empty-icon">▶</span>
          <p>暂时没有匹配的词汇视频</p>
          <small>视频会根据文件名中的完整单词自动匹配。</small>
        </div>
      )}

      {notice ? <p aria-live="polite" className="vocabulary-video-notice">{notice}</p> : null}
    </section>
  );
}
