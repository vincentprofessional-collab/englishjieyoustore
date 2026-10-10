"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "./admin-bbc-article-upload.module.css";

type UploadTicket = { headers: Record<string, string>; objectPath: string; uploadUrl: string };

function uploadToR2(ticket: UploadTicket, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", ticket.uploadUrl);
    Object.entries(ticket.headers).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("无法连接 Cloudflare R2，请检查网络和 bucket 的 CORS 配置。"));
    request.onabort = () => reject(new Error("音频上传已取消。"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error(`Cloudflare R2 音频上传失败（HTTP ${request.status}）。`));
    };
    request.send(file);
  });
}

function readApiError(payload: unknown) {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : "操作失败，请稍后重试。";
}

export function AdminBbcArticleUpload() {
  const [text, setText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [publishedHref, setPublishedHref] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPublishedHref("");
    setError(false);
    if (!text.trim()) {
      setError(true);
      setMessage("请粘贴 BBC 文章全文。");
      return;
    }
    if (audioFile && !/\.mp3$/i.test(audioFile.name)) {
      setError(true);
      setMessage("请选择 MP3 音频文件。");
      return;
    }
    if (audioFile && audioFile.size > 200 * 1024 * 1024) {
      setError(true);
      setMessage("MP3 文件不能超过 200 MB。");
      return;
    }

    setBusy(true);
    setAudioProgress(0);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) throw new Error("管理员登录已失效，请重新登录后台。");
      let objectPath: string | undefined;
      if (audioFile) {
        const title = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((line) => line.trim())?.replace(/^\s*#{1,6}\s*/, "").trim() ?? "";
        const presignResponse = await fetch("/api/admin/bbc-articles", {
          body: JSON.stringify({ action: "presign", filename: audioFile.name, size: audioFile.size, title }),
          headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
          method: "POST",
        });
        const presignPayload = await presignResponse.json();
        if (!presignResponse.ok) throw new Error(readApiError(presignPayload));
        const ticket = presignPayload as UploadTicket;
        await uploadToR2(ticket, audioFile, setAudioProgress);
        objectPath = ticket.objectPath;
      }
      const response = await fetch("/api/admin/bbc-articles", {
        body: JSON.stringify({ text, objectPath }),
        headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(readApiError(payload));

      setPublishedHref(payload.href);
      setMessage(
        `已发布到 ${payload.year} 年 ${payload.month} 月，文章编号 ${payload.articleId}；识别 ${payload.paragraphCount} 段正文、${payload.vocabularyCount} 条词汇与短语。${payload.audioIncluded ? "已关联音频。" : "粘贴内容未包含 MP3，文章页面将不显示音频播放器。"}`,
      );
    } catch (uploadError) {
      setError(true);
      setMessage(uploadError instanceof Error ? uploadError.message : "发布失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <span>BBC · ARTICLE PUBLISHING</span>
          <h2>上传 BBC 文章</h2>
          <p>粘贴包含日期标题、英文正文、中文翻译和词汇表的全文；可同时选择 MP3 音频，音频将从浏览器直传到 R2。</p>
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.full}>
          <span>文章全文</span>
          <textarea
            maxLength={700_000}
            onChange={(event) => setText(event.target.value)}
            placeholder={"260202-Protecting your photos in a digital age 如何在数字时代保管你的照片\n\nEnglish paragraph...\n中文段落……\n\n词汇表\n1. **term** /phonetic/ n. 中文释义\n   例句：An English example.\n   翻译：对应的中文翻译。"}
            required
            rows={24}
            value={text}
          />
          <small>词汇条目可编号排列；词条间允许空行，也支持 Markdown 加粗。英文与中文正文按段落顺序对应。</small>
        </label>
        <label className={styles.full}>
          <span>MP3 音频（可选）</span>
          <input accept=".mp3,audio/mpeg" disabled={busy} onChange={(event) => { setAudioFile(event.target.files?.[0] ?? null); setAudioProgress(0); }} type="file" />
          <small>{audioFile ? `${audioFile.name} · ${(audioFile.size / 1024 / 1024).toFixed(1)} MB` : "最大 200 MB；浏览器直接上传到 Cloudflare R2，不经过文章接口传输音频内容。"}</small>
        </label>
        {audioFile ? (
          <div aria-label="MP3 音频上传进度" aria-valuemax={100} aria-valuemin={0} aria-valuenow={audioProgress} className={styles.progress} role="progressbar">
            <span>{audioProgress >= 100 ? "音频已上传" : busy ? `音频上传中 ${audioProgress}%` : "等待上传"}</span>
            <div className={styles.progressTrack}><i style={{ width: `${audioProgress}%` }} /></div>
          </div>
        ) : null}
        {message ? <p aria-live="polite" className={`${styles.message} ${error ? styles.error : ""} ${styles.full}`}>{message}</p> : null}
        {publishedHref ? <Link className={`${styles.publishedLink} ${styles.full}`} href={publishedHref} target="_blank">打开刚发布的文章 ↗</Link> : null}
        <div className={`${styles.actions} ${styles.full}`}>
          <button className="button primary" disabled={busy || !text.trim()} type="submit">
            {busy ? "解析并发布中…" : "解析并发布文章"}
          </button>
        </div>
      </form>
    </section>
  );
}
