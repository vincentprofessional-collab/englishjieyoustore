"use client";

import { Howl } from "howler";
import { useEffect, useRef, useState } from "react";

export type AudioPlayMode = "sequential" | "sentence-loop";
export type AudioSubtitleMode = "english" | "bilingual" | "chinese";
export type AudioSpeakingMode = "read-aloud" | "shadowing" | "sight-translation";
export type AudioDictationMode =
  | "none"
  | "blank-dictation"
  | "sentence-dictation"
  | "sentence-order"
  | "translation-training";

export type AudioPlayerSettings = {
  dictationMode: AudioDictationMode;
  playMode: AudioPlayMode;
  rate: number;
  speakingMode: AudioSpeakingMode;
  subtitleMode: AudioSubtitleMode;
};

export const DEFAULT_AUDIO_PLAYER_SETTINGS: AudioPlayerSettings = {
  dictationMode: "none",
  playMode: "sequential",
  rate: 1,
  speakingMode: "shadowing",
  subtitleMode: "chinese",
};

type AudioPlayerProps = {
  autoPlaySignal?: number;
  controls?: "full" | "hidden";
  hasSelectedRate?: boolean;
  html5?: boolean;
  loopSegment?: { endSeconds: number; startSeconds: number } | null;
  onEnded?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onSettingsChange?: (nextSettings: Partial<AudioPlayerSettings>) => void;
  onStopAtEnd?: () => void;
  onTimeChange?: (positionSeconds: number) => void;
  settings?: AudioPlayerSettings;
  settingsPlacement?: "inside" | "none";
  seekRequest?: { id: number; play?: boolean; positionSeconds: number } | null;
  showRate?: boolean;
  src: string;
  stopAtSeconds?: number | null;
  title?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

const rateOptions = [
  { label: "0.5", value: 0.5 },
  { label: "正常", value: 1 },
  { label: "1.5", value: 1.5 },
  { label: "2.0", value: 2 },
];

const playModeOptions = [
  { label: "顺序播放", value: "sequential" },
  { label: "单句循环", value: "sentence-loop" },
] satisfies { label: string; value: AudioPlayMode }[];

const subtitleModeOptions = [
  { label: "英文", value: "english" },
  { label: "中英", value: "bilingual" },
  { label: "中文", value: "chinese" },
] satisfies { label: string; value: AudioSubtitleMode }[];

const dictationModeOptions = [
  { label: "听写填空", value: "blank-dictation" },
  { label: "整句听写", value: "sentence-dictation" },
  { label: "语序排列", value: "sentence-order" },
  { label: "翻译训练", value: "translation-training" },
] satisfies { label: string; value: AudioDictationMode }[];

const activeAudioPlayers = new Set<Howl>();
const pendingAudioPlaybackRequests = new WeakMap<Howl, number>();
const audioPlayerStopHandlers = new WeakMap<Howl, () => void>();
let latestAudioPlaybackRequestId = 0;

function stopOtherAudioPlayers(currentSound: Howl) {
  activeAudioPlayers.forEach((sound) => {
    if (sound !== currentSound) {
      pendingAudioPlaybackRequests.delete(sound);
      audioPlayerStopHandlers.get(sound)?.();
      sound.stop();
    }
  });
}

function requestAudioPlayback(sound: Howl) {
  const hadPendingRequest = pendingAudioPlaybackRequests.has(sound);
  latestAudioPlaybackRequestId += 1;
  pendingAudioPlaybackRequests.set(sound, latestAudioPlaybackRequestId);
  stopOtherAudioPlayers(sound);

  if (sound.playing()) {
    pendingAudioPlaybackRequests.delete(sound);
    return;
  }

  if (hadPendingRequest) {
    sound.stop();
  }

  sound.play();
}

function isLatestAudioPlaybackRequest(sound: Howl) {
  return pendingAudioPlaybackRequests.get(sound) === latestAudioPlaybackRequestId;
}

function clearAudioPlaybackRequest(sound: Howl) {
  pendingAudioPlaybackRequests.delete(sound);
}

function currentLabel<T extends string | number>(options: { label: string; value: T }[], value: T) {
  return options.find((option) => option.value === value)?.label ?? String(value);
}

export function AudioPlayer({
  autoPlaySignal = 0,
  controls = "full",
  hasSelectedRate,
  html5 = true,
  loopSegment = null,
  onEnded,
  onPlayingChange,
  onSettingsChange,
  onStopAtEnd,
  onTimeChange,
  seekRequest = null,
  settings,
  settingsPlacement = "inside",
  src,
  stopAtSeconds = null,
  showRate = true,
  title = "音频",
}: AudioPlayerProps) {
  const soundRef = useRef<Howl | null>(null);
  const onEndedRef = useRef(onEnded);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onStopAtEndRef = useRef(onStopAtEnd);
  const onTimeChangeRef = useRef(onTimeChange);
  const loopSegmentRef = useRef(loopSegment);
  const playModeRef = useRef<AudioPlayMode>(settings?.playMode ?? DEFAULT_AUDIO_PLAYER_SETTINGS.playMode);
  const stopAtSecondsRef = useRef(stopAtSeconds);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPlayRequested, setIsPlayRequested] = useState(false);
  const [position, setPosition] = useState(0);
  const [draftPosition, setDraftPosition] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [internalSettings, setInternalSettings] = useState<AudioPlayerSettings>(
    DEFAULT_AUDIO_PLAYER_SETTINGS,
  );
  const [localHasSelectedRate, setLocalHasSelectedRate] = useState(false);
  const playerSettings = settings ?? internalSettings;
  const displayHasSelectedRate = hasSelectedRate ?? localHasSelectedRate;

  function updatePlayerSettings(nextSettings: Partial<AudioPlayerSettings>) {
    if (nextSettings.rate != null) {
      setLocalHasSelectedRate(true);
    }

    if (onSettingsChange) {
      onSettingsChange(nextSettings);
      return;
    }

    setInternalSettings((current) => ({ ...current, ...nextSettings }));
  }

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange;
  }, [onPlayingChange]);

  useEffect(() => {
    onStopAtEndRef.current = onStopAtEnd;
  }, [onStopAtEnd]);

  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  useEffect(() => {
    loopSegmentRef.current = loopSegment;
  }, [loopSegment]);

  useEffect(() => {
    stopAtSecondsRef.current = stopAtSeconds;
  }, [stopAtSeconds]);

  useEffect(() => {
    playModeRef.current = playerSettings.playMode;
  }, [playerSettings.playMode]);

  useEffect(() => {
    let isDisposed = false;
    let loadRetryCount = 0;
    let loadRetryTimer: number | null = null;

    setIsReady(false);
    setIsPlaying(false);
    setIsPlayRequested(false);
    setLoadError(null);
    onPlayingChangeRef.current?.(false);
    onTimeChangeRef.current?.(0);
    setPosition(0);
    setDraftPosition(0);

    const sound = new Howl({
      src: [src],
      html5,
      rate: playerSettings.rate,
      volume: 1,
      onload: () => {
        if (isDisposed || soundRef.current !== sound) {
          return;
        }

        loadRetryCount = 0;
        setLoadError(null);
        setDuration(sound.duration());
        setIsReady(true);
      },
      onloaderror: () => {
        if (isDisposed || soundRef.current !== sound) {
          return;
        }

        if (loadRetryCount < 2) {
          const retryDelay = loadRetryCount === 0 ? 350 : 900;
          loadRetryCount += 1;
          setLoadError(null);
          loadRetryTimer = window.setTimeout(() => {
            if (!isDisposed && soundRef.current === sound) {
              sound.load();
            }
          }, retryDelay);
          return;
        }

        clearAudioPlaybackRequest(sound);
        setIsReady(false);
        setIsPlaying(false);
        setIsPlayRequested(false);
        setLoadError("音频暂时未能加载，请点击播放按钮重试。");
        onPlayingChangeRef.current?.(false);
      },
      onplay: () => {
        if (isDisposed || soundRef.current !== sound) {
          return;
        }

        if (!isLatestAudioPlaybackRequest(sound)) {
          sound.stop();
          return;
        }

        clearAudioPlaybackRequest(sound);
        setLoadError(null);
        setIsPlayRequested(false);
        setIsPlaying(true);
        onPlayingChangeRef.current?.(true);
      },
      onplayerror: () => {
        if (isDisposed || soundRef.current !== sound) {
          return;
        }

        clearAudioPlaybackRequest(sound);
        setIsPlaying(false);
        setIsPlayRequested(false);
        setLoadError("浏览器暂时阻止播放，请再点击一次播放按钮。");
        onPlayingChangeRef.current?.(false);
      },
      onpause: () => {
        if (isDisposed || soundRef.current !== sound) {
          return;
        }

        clearAudioPlaybackRequest(sound);
        setIsPlaying(false);
        setIsPlayRequested(false);
        onPlayingChangeRef.current?.(false);
      },
      onstop: () => {
        if (isDisposed || soundRef.current !== sound) {
          return;
        }

        clearAudioPlaybackRequest(sound);
        setIsPlaying(false);
        setIsPlayRequested(false);
        onPlayingChangeRef.current?.(false);
      },
      onend: () => {
        if (isDisposed || soundRef.current !== sound) {
          return;
        }

        if (playModeRef.current === "sentence-loop" && !loopSegmentRef.current) {
          pendingAudioPlaybackRequests.set(sound, latestAudioPlaybackRequestId);
          sound.seek(0);
          sound.play();
          return;
        }

        setIsPlaying(false);
        setIsPlayRequested(false);
        onPlayingChangeRef.current?.(false);
        onTimeChangeRef.current?.(0);
        setPosition(0);
        setDraftPosition(0);
        onEndedRef.current?.();
      },
    });

    soundRef.current = sound;
    activeAudioPlayers.add(sound);
    audioPlayerStopHandlers.set(sound, () => {
      if (isDisposed || soundRef.current !== sound) {
        return;
      }

      setIsPlaying(false);
      setIsPlayRequested(false);
      onPlayingChangeRef.current?.(false);
    });

    return () => {
      isDisposed = true;
      if (loadRetryTimer != null) {
        window.clearTimeout(loadRetryTimer);
      }
      activeAudioPlayers.delete(sound);
      clearAudioPlaybackRequest(sound);
      audioPlayerStopHandlers.delete(sound);
      if (soundRef.current === sound) {
        soundRef.current = null;
      }
      sound.unload();
    };
  }, [html5, src]);

  useEffect(() => {
    soundRef.current?.rate(playerSettings.rate);
  }, [playerSettings.rate]);

  useEffect(() => {
    if (!autoPlaySignal || !soundRef.current) {
      return;
    }

    setIsPlayRequested(true);
    requestAudioPlayback(soundRef.current);
  }, [autoPlaySignal]);

  useEffect(() => {
    if (!seekRequest || !soundRef.current) {
      return;
    }

    const boundedPosition = Math.min(Math.max(seekRequest.positionSeconds, 0), duration || seekRequest.positionSeconds);
    soundRef.current.seek(boundedPosition);
    setPosition(boundedPosition);
    setDraftPosition(boundedPosition);
    onTimeChangeRef.current?.(boundedPosition);

    if (seekRequest.play) {
      setIsPlayRequested(true);
      requestAudioPlayback(soundRef.current);
    }
  }, [duration, seekRequest]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const interval = window.setInterval(() => {
      const currentPosition = soundRef.current?.seek();
      if (typeof currentPosition === "number" && !isScrubbing) {
        const activeLoopSegment = loopSegmentRef.current;
        if (
          playModeRef.current === "sentence-loop" &&
          activeLoopSegment &&
          currentPosition >= activeLoopSegment.endSeconds
        ) {
          soundRef.current?.seek(activeLoopSegment.startSeconds);
          setPosition(activeLoopSegment.startSeconds);
          setDraftPosition(activeLoopSegment.startSeconds);
          onTimeChangeRef.current?.(activeLoopSegment.startSeconds);
          return;
        }

        const activeStopAtSeconds = stopAtSecondsRef.current;
        if (activeStopAtSeconds != null && currentPosition >= activeStopAtSeconds) {
          soundRef.current?.pause();
          soundRef.current?.seek(activeStopAtSeconds);
          setPosition(activeStopAtSeconds);
          setDraftPosition(activeStopAtSeconds);
          onTimeChangeRef.current?.(activeStopAtSeconds);
          onStopAtEndRef.current?.();
          return;
        }

        setPosition(currentPosition);
        setDraftPosition(currentPosition);
        onTimeChangeRef.current?.(currentPosition);
      }
    }, 300);

    return () => window.clearInterval(interval);
  }, [isPlaying, isScrubbing]);

  function seekTo(nextPosition: number) {
    const boundedPosition = Math.min(Math.max(nextPosition, 0), duration || nextPosition);
    soundRef.current?.seek(boundedPosition);
    setPosition(boundedPosition);
    setDraftPosition(boundedPosition);
    onTimeChangeRef.current?.(boundedPosition);
  }

  function togglePlay() {
    const sound = soundRef.current;
    if (!sound) {
      return;
    }

    if (sound.playing() || isPlayRequested) {
      clearAudioPlaybackRequest(sound);
      sound.pause();
      setIsPlayRequested(false);
      return;
    }

    setLoadError(null);
    setIsPlayRequested(true);
    if (sound.state() === "unloaded") {
      sound.load();
    }
    requestAudioPlayback(sound);
  }

  const displayPosition = isScrubbing ? draftPosition : position;

  if (controls === "hidden") {
    return null;
  }

  return (
    <div className="howler-player">
      <div className="player-main-controls" aria-label={`${title} 控制`}>
        <button aria-label="倒退 5 秒" className="icon-button" type="button" onClick={() => seekTo(position - 5)}>
          <span className="player-skip-icon backward" aria-hidden="true" />
        </button>
        <button className="play-button" type="button" onClick={togglePlay}>
          <span className={`player-play-icon ${isPlaying || isPlayRequested ? "pause" : "play"}`} aria-hidden="true" />
          <span className="sr-only">{isPlaying || isPlayRequested ? "暂停" : "播放"}</span>
        </button>
        <button aria-label="前进 5 秒" className="icon-button" type="button" onClick={() => seekTo(position + 5)}>
          <span className="player-skip-icon forward" aria-hidden="true" />
        </button>
      </div>

      {loadError ? <p className="audio-load-error">{loadError}</p> : null}

      <div className="player-progress-row" aria-label={title}>
        <span>{formatTime(displayPosition)}</span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={displayPosition}
          onChange={(event) => setDraftPosition(Number(event.target.value))}
          onPointerDown={() => setIsScrubbing(true)}
          onPointerUp={() => {
            setIsScrubbing(false);
            seekTo(draftPosition);
          }}
        />
        <span>{formatTime(duration)}</span>
      </div>

      {settingsPlacement === "inside" ? (
        <AudioSettingsMenus
          hasSelectedRate={displayHasSelectedRate}
          showRate={showRate}
          settings={playerSettings}
          onChange={updatePlayerSettings}
        />
      ) : null}
    </div>
  );
}

export function AudioSettingsMenus({
  className = "",
  hasSelectedRate = true,
  onChange,
  settings,
  showRate = true,
  variant = "full",
}: {
  className?: string;
  hasSelectedRate?: boolean;
  onChange: (nextSettings: Partial<AudioPlayerSettings>) => void;
  settings: AudioPlayerSettings;
  showRate?: boolean;
  variant?: "basic" | "full" | "rate-only";
}) {
  function exitWritingMode(nextSettings: Partial<AudioPlayerSettings> = {}) {
    if (settings.dictationMode === "none") {
      return nextSettings;
    }

    return {
      dictationMode: "none" as const,
      subtitleMode: "bilingual" as const,
      ...nextSettings,
    };
  }

  const menuItems = [
    ...(showRate
      ? [
          {
            selectedLabel: hasSelectedRate ? currentLabel(rateOptions, settings.rate) : "倍速",
            selectedValue: settings.rate,
            options: rateOptions,
            onSelect: (value: string | number) => onChange({ rate: Number(value) }),
          },
        ]
      : []),
    ...(variant !== "rate-only"
      ? [
          {
            selectedLabel: currentLabel(subtitleModeOptions, settings.subtitleMode),
            selectedValue: settings.subtitleMode,
            options: subtitleModeOptions,
            onSelect: (value: string | number) =>
              onChange({ subtitleMode: String(value) as AudioSubtitleMode }),
          },
          {
            selectedLabel: "听力模式",
            selectedValue: settings.playMode,
            options: playModeOptions,
            onSelect: (value: string | number) =>
              onChange(exitWritingMode({ playMode: String(value) as AudioPlayMode })),
          },
        ]
      : []),
    ...(variant === "full"
      ? [
          {
            selectedLabel: "口语模式",
            selectedValue: settings.speakingMode,
            options: [{ label: "待后续开发", value: settings.speakingMode }],
            onSelect: () => {
              if (settings.dictationMode !== "none") {
                onChange(exitWritingMode());
              }
            },
          },
          {
            selectedLabel: "写作模式",
            selectedValue: settings.dictationMode,
            options: dictationModeOptions,
            onSelect: (value: string | number) =>
              onChange({ dictationMode: String(value) as AudioDictationMode }),
          },
        ]
      : []),
  ];

  return (
    <div className={`player-settings exam-player-settings ${className}`}>
      {menuItems.map((menu) => (
        <PlayerMenu key={`${menu.selectedLabel}-${String(menu.selectedValue)}`} menu={menu} />
      ))}
    </div>
  );
}

function PlayerMenu({
  menu,
}: {
  menu: {
    selectedLabel: string;
    selectedValue: string | number;
    options: { label: string; value: string | number }[];
    onSelect: (value: string | number) => void;
  };
}) {
  return (
    <div className="player-menu">
      <button className="player-menu-trigger" type="button">
        <span>{menu.selectedLabel}</span>
      </button>
      <div className="player-menu-panel">
        {menu.options.map((option) => (
          <button
            className={String(option.value) === String(menu.selectedValue) ? "active" : ""}
            key={String(option.value)}
            type="button"
            onClick={() => menu.onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
