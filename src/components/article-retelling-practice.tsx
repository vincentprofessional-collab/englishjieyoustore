"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RetellingTermGroup = {
  label: string;
  terms: string[];
};

export type RetellingSourceType = "bbc" | "new-concept" | "ielts-listening";

export function buildRetellingTermGroups(terms: string[], expressions: string[] = []): RetellingTermGroup[] {
  const uniqueTerms = (values: string[]) => {
    const seen = new Set<string>();
    return values
      .map((value) => value.trim().replace(/^[\s.,;:!?“”‘’"'()]+|[\s.,;:!?“”‘’"'()]+$/g, ""))
      .filter((value) => {
        const key = value.toLowerCase();
        if (!value || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const cleanTerms = uniqueTerms(terms);
  const phraseTerms = uniqueTerms([
    ...cleanTerms.filter((term) => /\s/.test(term)),
    ...expressions.filter((term) => /\s/.test(term)),
  ]);
  const phraseSet = new Set(phraseTerms.map((term) => term.toLowerCase()));
  const vocabularyTerms = cleanTerms.filter((term) => !/\s/.test(term) && !phraseSet.has(term.toLowerCase()));

  return [
    { label: "词汇", terms: vocabularyTerms },
    { label: "短语与地道表达", terms: phraseTerms },
  ];
}

type ArticleRetellingPracticeProps = {
  groups: RetellingTermGroup[];
  onExit: () => void;
  sourceId: string;
  sourceType: RetellingSourceType;
  title: string;
};

type PracticePhase = "idle" | "preparing" | "recording" | "finished" | "error";

const COUNTDOWN_INTERVAL_MS = 200;

function getAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  return ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]
    .find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function getAudioExtension(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("mp4")) return "mp4";
  if (normalized.includes("ogg")) return "ogg";
  return "webm";
}

export function ArticleRetellingPractice({
  groups,
  onExit,
  sourceId,
  sourceType,
  title,
}: ArticleRetellingPracticeProps) {
  const [phase, setPhase] = useState<PracticePhase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "uploading" | "saved" | "local-only">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingBlobRef = useRef<Blob | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const playbackObjectUrlRef = useRef("");
  const mountedRef = useRef(true);
  const hasStartedTakeRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const saveRecording = useCallback(async (blob: Blob) => {
    if (mountedRef.current) {
      setSaveState("uploading");
      setStatusMessage("正在保存到 Supabase…");
    }

    const mimeType = blob.type || "audio/webm";
    const file = new File([blob], `retelling.${getAudioExtension(mimeType)}`, { type: mimeType });
    const formData = new FormData();
    formData.set("recording", file);
    formData.set("sourceType", sourceType);
    formData.set("sourceId", sourceId);

    try {
      const response = await fetch("/api/retelling-recordings", {
        body: formData,
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; signedUrl?: string };
      if (!response.ok || !result.signedUrl) {
        throw new Error(result.error || "录音保存在本机，可登录后重试上传。");
      }

      if (mountedRef.current) {
        setPlaybackUrl(result.signedUrl);
        setSaveState("saved");
        setStatusMessage("录音已保存到 Supabase。可在下方重听。");
      }
    } catch (error) {
      if (mountedRef.current) {
        setSaveState("local-only");
        setStatusMessage(error instanceof Error ? error.message : "录音保存在本机，可稍后重试上传。");
      }
    }
  }, [sourceId, sourceType]);

  const finishRecording = useCallback(() => {
    clearTimers();
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
    }
  }, [clearTimers]);

  const beginRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = getAudioMimeType();
    try {
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (!blob.size) {
          if (mountedRef.current) {
            setPhase("error");
            setStatusMessage("没有录到音频，请检查麦克风后重试。");
          }
          return;
        }

        recordingBlobRef.current = blob;
        const objectUrl = URL.createObjectURL(blob);
        if (playbackObjectUrlRef.current) URL.revokeObjectURL(playbackObjectUrlRef.current);
        playbackObjectUrlRef.current = objectUrl;
        if (mountedRef.current) {
          setPlaybackUrl(objectUrl);
          setPhase("finished");
          setStatusMessage("录音结束，可在下方重听。");
        }
        void saveRecording(blob);
      };

      recorder.start();
      if (mountedRef.current) {
        setPhase("recording");
        setSecondsLeft(60);
        setStatusMessage("已经开始录音，请开始复述。");
      }

      const deadline = Date.now() + 60_000;
      intervalRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1_000));
        if (mountedRef.current) setSecondsLeft(remaining);
      }, COUNTDOWN_INTERVAL_MS);
      timeoutRef.current = window.setTimeout(finishRecording, 60_000);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (mountedRef.current) {
        setPhase("error");
        setStatusMessage("无法启动录音，请检查浏览器的麦克风权限后重试。");
      }
    }
  }, [finishRecording, saveRecording]);

  const startPractice = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setPhase("error");
      setStatusMessage("当前浏览器不支持录音，请使用新版 Safari 或 Chrome。");
      return;
    }

    setSaveState("idle");
    hasStartedTakeRef.current = true;
    setStatusMessage("准备时间 10 秒，请想好文章内容后复述。");
    setPhase("preparing");
    setSecondsLeft(10);

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        return;
      }

      const deadline = Date.now() + 10_000;
      intervalRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1_000));
        setSecondsLeft(remaining);
      }, COUNTDOWN_INTERVAL_MS);
      timeoutRef.current = window.setTimeout(() => {
        clearTimers();
        beginRecording();
      }, 10_000);
    } catch {
      setPhase("error");
      setStatusMessage("请允许使用麦克风后，再开始复述练习。");
    }
  }, [beginRecording, clearTimers]);

  const retrySave = useCallback(() => {
    if (recordingBlobRef.current) void saveRecording(recordingBlobRef.current);
  }, [saveRecording]);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    void fetch(`/api/retelling-recordings?sourceType=${encodeURIComponent(sourceType)}&sourceId=${encodeURIComponent(sourceId)}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { signedUrl?: string };
      })
      .then((result) => {
        if (!cancelled && !hasStartedTakeRef.current && result?.signedUrl) {
          setPlaybackUrl(result.signedUrl);
          setSaveState("saved");
          setStatusMessage("已载入上次保存的录音。");
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearTimers();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      } else {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (playbackObjectUrlRef.current) URL.revokeObjectURL(playbackObjectUrlRef.current);
    };
  }, [clearTimers, sourceId, sourceType]);

  const isRunning = phase === "preparing" || phase === "recording" || saveState === "uploading";

  return (
    <section aria-labelledby="article-retelling-title" className="article-retelling-practice" role="region">
      <header className="article-retelling-heading">
        <button className="article-retelling-exit" disabled={isRunning} onClick={onExit} type="button">
          ← 返回口语模式
        </button>
        <span className="article-retelling-kicker">复述练习</span>
        <h2 id="article-retelling-title" lang="en">{title}</h2>
      </header>

      <div aria-label="文章词汇与表达" className="article-retelling-groups">
        {groups.filter((group) => group.terms.length > 0).map((group) => (
          <section className="article-retelling-group" key={group.label}>
            <h3>{group.label}</h3>
            <ul>
              {group.terms.map((term) => <li key={`${group.label}-${term}`}>{term}</li>)}
            </ul>
          </section>
        ))}
      </div>

      <div aria-live="polite" className={`article-retelling-recorder ${phase}`}>
        {phase === "idle" || phase === "error" ? (
          <button className="article-retelling-start" onClick={() => void startPractice()} type="button">
            开始复述
          </button>
        ) : (
          <>
            <strong className="article-retelling-status">{phase === "preparing" ? "准备复述" : phase === "recording" ? "已经开始录音" : "录音结束"}</strong>
            {phase === "preparing" || phase === "recording" ? (
              <span className="article-retelling-countdown" aria-label={`${secondsLeft} 秒`}>
                {secondsLeft}<small>秒</small>
              </span>
            ) : null}
          </>
        )}
        {statusMessage ? <p className={phase === "error" ? "error" : ""}>{statusMessage}</p> : null}
        {playbackUrl ? (
          <div className="article-retelling-playback">
            <span>我的录音</span>
            <audio controls controlsList="nodownload" preload="metadata" src={playbackUrl} />
          </div>
        ) : null}
        {saveState === "local-only" && recordingBlobRef.current ? (
          <button className="article-retelling-retry" onClick={retrySave} type="button">重试保存到 Supabase</button>
        ) : null}
      </div>
    </section>
  );
}
