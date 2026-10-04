"use client";

import { Howl } from "howler";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getLikelyProperNounWords } from "@/lib/audio-pronunciation";
import type { AudioPronunciationScope } from "@/lib/audio-pronunciation";

export type AudioPlayMode = "sequential" | "sentence-loop";
export type AudioSubtitleMode = "english" | "bilingual" | "chinese";
export type AudioSpeakingMode = "none" | "imitation" | "shadowing" | "sight-translation";
export type AudioDictationMode =
  | "none"
  | "blank-dictation"
  | "sentence-dictation"
  | "sentence-order"
  | "translation-training";
export type AudioPronunciationMode = "hidden" | "us" | "uk";
export type { AudioPronunciationScope } from "@/lib/audio-pronunciation";

export type AudioPlayerSettings = {
  dictationMode: AudioDictationMode;
  playMode: AudioPlayMode;
  pronunciationMode: AudioPronunciationMode;
  pronunciationScope: AudioPronunciationScope;
  rate: number;
  speakingMode: AudioSpeakingMode;
  subtitleMode: AudioSubtitleMode;
};

export const DEFAULT_AUDIO_PLAYER_SETTINGS: AudioPlayerSettings = {
  dictationMode: "none",
  playMode: "sequential",
  pronunciationMode: "hidden",
  pronunciationScope: "high-school-plus",
  rate: 1,
  speakingMode: "none",
  subtitleMode: "chinese",
};

export function useArticlePronunciations(
  text: string,
  pronunciationMode: AudioPronunciationMode,
  enabled = true,
) {
  const [pronunciations, setPronunciations] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    if (!enabled || pronunciationMode === "hidden" || !text.trim()) {
      setPronunciations(new Map());
      return;
    }

    const controller = new AbortController();
    const properNounWords = getLikelyProperNounWords(text);
    const words = [...new Set(
      (text.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) ?? [])
        .map((word) => word.toLowerCase().replace(/[’]/g, "'")),
    )].slice(0, 1200);
    const lookupWords = words.filter((word) => !properNounWords.has(word));

    setPronunciations(new Map());
    void fetch("/api/vocabulary-pronunciations", {
      body: JSON.stringify({ pronunciationMode, words: lookupWords }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { pronunciations?: Record<string, string> };
      })
      .then((payload) => {
        if (!controller.signal.aborted && payload?.pronunciations) {
          const nextPronunciations = new Map(Object.entries(payload.pronunciations));
          properNounWords.forEach((word) => nextPronunciations.set(word, ""));
          setPronunciations(nextPronunciations);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [enabled, pronunciationMode, text]);

  return pronunciations;
}

export function formatArticlePhonetic(value?: string) {
  const phonetic = (value ?? "").trim().replace(/^[\[\s/]+|[\]\s/]+$/g, "").trim();
  return phonetic ? `[${phonetic}]` : "";
}

type AudioPlayerProps = {
  autoPlaySignal?: number;
  compactControls?: boolean;
  controls?: "full" | "hidden";
  deferSentenceLoop?: boolean;
  hasSelectedRate?: boolean;
  html5?: boolean;
  preload?: boolean;
  leadingControls?: ReactNode;
  loopSegment?: { endSeconds: number; startSeconds: number } | null;
  onDurationChange?: (durationSeconds: number) => void;
  onEnded?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onSettingsChange?: (nextSettings: Partial<AudioPlayerSettings>) => void;
  onStopAtEnd?: () => void;
  onTimeChange?: (positionSeconds: number) => void;
  trailingControls?: ReactNode;
  settings?: AudioPlayerSettings;
  settingsPlacement?: "inside" | "none";
  seekRequest?: { id: number; play?: boolean; positionSeconds: number } | null;
  skipSeconds?: number;
  showRate?: boolean;
  src: string;
  startAtSeconds?: number;
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

function inferAudioFormat(src: string) {
  const pathname = src.split(/[?#]/, 1)[0] ?? src;
  const extension = pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return [extension || "mp3"];
}

const rateOptions = [
  { label: "0.75", value: 0.75 },
  { label: "正常", value: 1 },
  { label: "1.25", value: 1.25 },
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
  { label: "语序排列", value: "sentence-order" },
  { label: "听写填空", value: "blank-dictation" },
  { label: "整句听写", value: "sentence-dictation" },
  { label: "翻译训练", value: "translation-training" },
] satisfies { label: string; value: AudioDictationMode }[];

const speakingModeOptions = [
  { label: "模仿朗读", value: "imitation" },
  { label: "视译训练", value: "sight-translation" },
  { label: "影子练习", value: "shadowing" },
] satisfies { label: string; value: Exclude<AudioSpeakingMode, "none"> }[];

const pronunciationModeOptions = [
  { label: "隐藏", value: "hidden" },
  { label: "美音", value: "us" },
  { label: "英音", value: "uk" },
] satisfies { label: string; value: AudioPronunciationMode }[];

const activeAudioPlayers = new Set<Howl>();
const pendingAudioPlaybackRequests = new WeakMap<Howl, number>();
const audioPlayerStopHandlers = new WeakMap<Howl, () => void>();
let latestAudioPlaybackRequestId = 0;

type PitchPreservingAudioElement = HTMLMediaElement & {
  mozPreservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
};

function enablePitchPreservation(sound: Howl) {
  const sounds = (sound as Howl & { _sounds?: Array<{ _node?: unknown }> })._sounds ?? [];

  sounds.forEach(({ _node }) => {
    if (typeof HTMLMediaElement === "undefined" || !(_node instanceof HTMLMediaElement)) {
      return;
    }

    const media = _node as PitchPreservingAudioElement;
    media.preservesPitch = true;
    media.mozPreservesPitch = true;
    media.webkitPreservesPitch = true;
    media.setAttribute("playsinline", "true");
    media.setAttribute("webkit-playsinline", "true");
  });
}

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
  compactControls = false,
  controls = "full",
  deferSentenceLoop = false,
  hasSelectedRate,
  html5 = true,
  preload = true,
  leadingControls,
  loopSegment = null,
  onDurationChange,
  onEnded,
  onPlayingChange,
  onSettingsChange,
  onStopAtEnd,
  onTimeChange,
  trailingControls,
  seekRequest = null,
  settings,
  settingsPlacement = "inside",
  skipSeconds = 5,
  src,
  startAtSeconds = 0,
  stopAtSeconds = null,
  showRate = true,
  title = "音频",
}: AudioPlayerProps) {
  const soundRef = useRef<Howl | null>(null);
  const onDurationChangeRef = useRef(onDurationChange);
  const onEndedRef = useRef(onEnded);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onStopAtEndRef = useRef(onStopAtEnd);
  const onTimeChangeRef = useRef(onTimeChange);
  const loopSegmentRef = useRef(loopSegment);
  const deferSentenceLoopRef = useRef(deferSentenceLoop);
  const playModeRef = useRef<AudioPlayMode>(settings?.playMode ?? DEFAULT_AUDIO_PLAYER_SETTINGS.playMode);
  const stopAtSecondsRef = useRef(stopAtSeconds);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
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
    onDurationChangeRef.current = onDurationChange;
  }, [onDurationChange]);

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
    deferSentenceLoopRef.current = deferSentenceLoop;
  }, [deferSentenceLoop]);

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
    let startPositionApplied = false;

    setIsReady(false);
    setIsPlaying(false);
    setIsPlayRequested(false);
    onPlayingChangeRef.current?.(false);
    onTimeChangeRef.current?.(0);
    setPosition(0);
    setDraftPosition(0);

    const isMobilePlayback = window.matchMedia("(max-width: 820px)").matches;
    const shouldPreload = preload;
    const sound = new Howl({
      src: [src],
      html5: html5 || isMobilePlayback,
      preload: shouldPreload,
      format: inferAudioFormat(src),
      rate: playerSettings.rate,
      volume: 1,
      onload: () => {
        if (isDisposed || soundRef.current !== sound) {
          return;
        }

        enablePitchPreservation(sound);
        loadRetryCount = 0;
        const loadedDuration = sound.duration();
        setDuration(loadedDuration);
        onDurationChangeRef.current?.(loadedDuration);
        if (!startPositionApplied && startAtSeconds > 0) {
          const startPosition = Math.min(startAtSeconds, loadedDuration || startAtSeconds);
          sound.seek(startPosition);
          setPosition(startPosition);
          setDraftPosition(startPosition);
          onTimeChangeRef.current?.(startPosition);
          startPositionApplied = true;
        }
        setIsReady(true);
      },
      onloaderror: () => {
        if (isDisposed || soundRef.current !== sound) {
          return;
        }

        if (loadRetryCount < 2) {
          const retryDelay = loadRetryCount === 0 ? 350 : 900;
          loadRetryCount += 1;
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

        if (
          playModeRef.current === "sentence-loop" &&
          !loopSegmentRef.current &&
          !deferSentenceLoopRef.current
        ) {
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
    enablePitchPreservation(sound);
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
  }, [html5, preload, src, startAtSeconds]);

  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) {
      return;
    }

    enablePitchPreservation(sound);
    sound.rate(playerSettings.rate);
  }, [playerSettings.rate]);

  useEffect(() => {
    if (!autoPlaySignal || !soundRef.current) {
      return;
    }

    setIsPlayRequested(true);
    requestAudioPlayback(soundRef.current);
  }, [autoPlaySignal, src]);

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

  function startPlayback() {
    const sound = soundRef.current;
    if (!sound) {
      return;
    }

    if (sound.playing() || isPlayRequested) {
      return;
    }

    setIsPlayRequested(true);
    if (sound.state() === "unloaded") {
      sound.load();
    }
    requestAudioPlayback(sound);
  }

  function pausePlayback() {
    const sound = soundRef.current;
    if (!sound) {
      return;
    }

    clearAudioPlaybackRequest(sound);
    sound.pause();
    setIsPlayRequested(false);
  }

  function togglePlay() {
    if (isPlaying || isPlayRequested) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }

  const displayPosition = isScrubbing ? draftPosition : position;
  const mainPlayerControls = (
    <div className={`player-main-controls ${compactControls ? "compact-player-controls" : ""}`} aria-label={`${title} 控制`}>
      <button aria-label={`倒退 ${skipSeconds} 秒`} className="icon-button" type="button" onClick={() => seekTo(position - skipSeconds)}>
        <span className="player-skip-icon backward" aria-hidden="true" />
      </button>
      <button aria-label={!compactControls && isPlaying ? "暂停" : "播放"} className="play-button" type="button" onClick={compactControls ? startPlayback : togglePlay}>
        <span className={`player-play-icon ${!compactControls && isPlaying ? "pause" : "play"}`} aria-hidden="true" />
      </button>
      {compactControls ? (
        <button aria-label="暂停" className="compact-pause-button" type="button" onClick={pausePlayback}>
          <span className="player-play-icon pause" aria-hidden="true" />
        </button>
      ) : null}
      <button aria-label={`前进 ${skipSeconds} 秒`} className="icon-button" type="button" onClick={() => seekTo(position + skipSeconds)}>
        <span className="player-skip-icon forward" aria-hidden="true" />
      </button>
    </div>
  );

  if (controls === "hidden") {
    return null;
  }

  return (
    <div className="howler-player">
      {leadingControls || trailingControls ? (
        <div className="player-controls-row">
          <div className="player-controls-leading">{leadingControls}</div>
          {mainPlayerControls}
          <div className="player-controls-trailing">{trailingControls}</div>
        </div>
      ) : mainPlayerControls}

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
  modeLabels,
  onChange,
  onModeSelect,
  onRetellingSelect,
  playModeLabel = "听力模式",
  preserveModeSettings = false,
  settings,
  showRate = true,
  variant = "full",
}: {
  className?: string;
  hasSelectedRate?: boolean;
  modeLabels?: { listening?: string; speaking?: string; writing?: string };
  onChange: (nextSettings: Partial<AudioPlayerSettings>) => void;
  onModeSelect?: (mode: "listening" | "speaking" | "writing") => void;
  onRetellingSelect?: () => void;
  playModeLabel?: string;
  preserveModeSettings?: boolean;
  settings: AudioPlayerSettings;
  showRate?: boolean;
  variant?: "basic" | "full" | "rate-only" | "subtitle-only" | "listening-only" | "speaking-writing";
}) {
  function exitPracticeMode(nextSettings: Partial<AudioPlayerSettings> = {}) {
    const isLeavingPractice =
      settings.dictationMode !== "none" || settings.speakingMode !== "none";
    if (!isLeavingPractice) {
      return nextSettings;
    }

    return {
      dictationMode: "none" as const,
      speakingMode: "none" as const,
      subtitleMode: "bilingual" as const,
      ...nextSettings,
    };
  }

  const menuItems = [
    ...(showRate && variant !== "subtitle-only" && variant !== "listening-only" && variant !== "speaking-writing"
      ? [
          {
            selectedLabel: hasSelectedRate
              ? variant === "rate-only" && settings.rate === 1
                ? "速度"
                : currentLabel(rateOptions, settings.rate)
              : "倍速",
            selectedValue: settings.rate,
            options: rateOptions,
            onSelect: (value: string | number) => onChange({ rate: Number(value) }),
          },
        ]
      : []),
    ...(variant === "basic" || variant === "full" || variant === "subtitle-only"
      ? [
          {
            selectedLabel: currentLabel(subtitleModeOptions, settings.subtitleMode),
            selectedValue: settings.subtitleMode,
            options: subtitleModeOptions,
            onSelect: (value: string | number) =>
              onChange({ subtitleMode: String(value) as AudioSubtitleMode }),
          },
        ]
      : []),
    ...(variant === "basic" || variant === "full" || variant === "listening-only"
      ? [
          {
            selectedLabel: playModeLabel,
            selectedValue: settings.playMode,
            options: playModeOptions,
            onOpen: onModeSelect
              ? () => {
                  if (!preserveModeSettings) {
                    onChange(exitPracticeMode({ subtitleMode: "bilingual" }));
                  }
                  onModeSelect("listening");
                }
              : undefined,
            onSelect: (value: string | number) => {
              onChange(preserveModeSettings
                ? { playMode: String(value) as AudioPlayMode }
                : exitPracticeMode({ playMode: String(value) as AudioPlayMode }));
              onModeSelect?.("listening");
            },
          },
        ]
      : []),
    ...(variant === "full" || variant === "speaking-writing"
      ? [
          {
            selectedLabel: modeLabels?.writing ?? "写作模式",
            selectedValue: settings.dictationMode,
            options: dictationModeOptions,
            onOpen: onModeSelect
              ? () => {
                  onChange({
                    ...(!preserveModeSettings ? { playMode: "sequential" as const, speakingMode: "none" as const } : {}),
                    dictationMode: settings.dictationMode === "none" ? "sentence-order" : settings.dictationMode,
                    subtitleMode: "bilingual",
                  });
                  onModeSelect("writing");
                }
              : undefined,
            onSelect: (value: string | number) => {
              onChange({
                ...(!preserveModeSettings ? { playMode: "sequential" as const, speakingMode: "none" as const } : {}),
                dictationMode: String(value) as AudioDictationMode,
                subtitleMode: "bilingual",
              });
              onModeSelect?.("writing");
            },
          },
          {
            selectedLabel: modeLabels?.speaking ?? "口语模式",
            selectedValue: settings.speakingMode,
            options: onRetellingSelect
              ? [...speakingModeOptions, { label: "复述练习", value: "retelling" }]
              : speakingModeOptions,
            onOpen: onModeSelect
              ? () => {
                  const speakingMode = settings.speakingMode === "none" ? "imitation" : settings.speakingMode;
                  onChange({
                    ...(!preserveModeSettings ? { dictationMode: "none" as const, playMode: "sequential" as const } : {}),
                    speakingMode,
                    subtitleMode: speakingMode === "sight-translation" ? "chinese" : "bilingual",
                  });
                  onModeSelect("speaking");
                }
              : undefined,
            onSelect: (value: string | number) => {
              if (value === "retelling") {
                onRetellingSelect?.();
                return;
              }
              const speakingMode = String(value) as Exclude<AudioSpeakingMode, "none">;
              onChange({
                ...(!preserveModeSettings ? { dictationMode: "none" as const, playMode: "sequential" as const } : {}),
                speakingMode,
                subtitleMode: speakingMode === "sight-translation" ? "chinese" : "bilingual",
              });
              onModeSelect?.("speaking");
            },
          },
        ]
      : []),
  ];

  return (
    <div className={`player-settings exam-player-settings ${className}`}>
      {menuItems.map((menu, index) => (
        <PlayerMenu key={`${variant}-${index}`} menu={menu} />
      ))}
    </div>
  );
}

export function AudioChoiceMenu({
  className = "",
  label,
  onSelect,
  options,
  selectedValue,
}: {
  className?: string;
  label: string;
  onSelect: (value: string) => void;
  options: { label: string; value: string }[];
  selectedValue: string;
}) {
  return (
    <div className={`player-menu ${className}`}>
      <button aria-label={`${label}显示设置`} className="player-menu-trigger" type="button">
        <span>{label}</span>
      </button>
      <div className="player-menu-panel">
        {options.map((option) => (
          <button
            aria-pressed={selectedValue === option.value}
            className={selectedValue === option.value ? "active" : ""}
            key={option.value}
            onClick={() => onSelect(option.value)}
            type="button"
          >
            <span>{option.label}</span>
            <span aria-hidden="true" className="player-menu-option-switch" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function AudioReadingMenu({
  className = "",
  label = "泛读模式",
  isActive,
  isOriginalVisible,
  isVocabularyVisible,
  onActivate,
  onOriginalVisibilityChange,
  onVocabularyVisibilityChange,
}: {
  className?: string;
  label?: string;
  isActive: boolean;
  isOriginalVisible: boolean;
  isVocabularyVisible: boolean;
  onActivate?: () => void;
  onOriginalVisibilityChange: (visible: boolean) => void;
  onVocabularyVisibilityChange: (visible: boolean) => void;
}) {
  const groups = [
    {
      label: "原文",
      isVisible: isOriginalVisible,
      onToggle: (visible: boolean) => onOriginalVisibilityChange(visible),
    },
    {
      label: "词汇",
      isVisible: isVocabularyVisible,
      onToggle: (visible: boolean) => onVocabularyVisibilityChange(visible),
    },
  ];

  return (
    <div className={`player-menu audio-reading-mode-menu ${className}`}>
      <button
        aria-haspopup="true"
        aria-pressed={isActive}
        className={`player-menu-trigger bbc-fullscreen-toggle ${isActive ? "active" : ""}`}
        onClick={onActivate}
        type="button"
      >
        <span>{label}</span>
      </button>
      <div className="player-menu-panel audio-reading-mode-panel">
        {groups.map((group) => (
          <div aria-label={group.label} className="audio-reading-menu-group" key={group.label} role="group">
            <button
              aria-checked={group.isVisible}
              className={group.isVisible ? "active" : ""}
              onClick={() => group.onToggle(!group.isVisible)}
              role="switch"
              type="button"
            >
              <span>{group.label}</span>
              <span aria-hidden="true" className="player-menu-option-switch" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AudioPronunciationMenu({
  className = "",
  onChange,
  value,
}: {
  className?: string;
  onChange: (pronunciationMode: AudioPronunciationMode) => void;
  value: AudioPronunciationMode;
}) {
  return (
    <div className={`player-settings audio-pronunciation-control ${className}`}>
      <div className="player-menu audio-pronunciation-menu">
        <button aria-haspopup="true" className="player-menu-trigger" type="button">
          <span>音标</span>
        </button>
        <div className="player-menu-panel audio-pronunciation-menu-panel">
          <div aria-label="音标类型" className="audio-pronunciation-menu-group" role="group">
            <strong>音标类型</strong>
            {pronunciationModeOptions.map((option) => (
              <button
                aria-pressed={(value ?? "hidden") === option.value}
                className={(value ?? "hidden") === option.value ? "active" : ""}
                key={option.value}
                onClick={() => onChange(option.value)}
                type="button"
              >
                <span>{option.label}</span>
                <span aria-hidden="true" className="player-menu-option-switch" />
              </button>
            ))}
          </div>
        </div>
      </div>
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
    onOpen?: () => void;
    onSelect: (value: string | number) => void;
  };
}) {
  return (
    <div className="player-menu">
      <button className="player-menu-trigger" onClick={menu.onOpen} type="button">
        <span>{menu.selectedLabel}</span>
      </button>
      <div className="player-menu-panel">
        {menu.options.map((option) => (
          <button
            aria-pressed={String(option.value) === String(menu.selectedValue)}
            className={String(option.value) === String(menu.selectedValue) ? "active" : ""}
            key={String(option.value)}
            type="button"
            onClick={() => menu.onSelect(option.value)}
          >
            <span>{option.label}</span>
            <span aria-hidden="true" className="player-menu-option-switch" />
          </button>
        ))}
      </div>
    </div>
  );
}
