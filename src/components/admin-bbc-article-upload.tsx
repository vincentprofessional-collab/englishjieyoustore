"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "./admin-bbc-article-upload.module.css";

function readApiError(payload: unknown) {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : "操作失败，请稍后重试。";
}

export function AdminBbcArticleUpload() {
  const [text, setText] = useState("");
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

    setBusy(true);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) throw new Error("管理员登录已失效，请重新登录后台。");
      const response = await fetch("/api/admin/bbc-articles", {
        body: JSON.stringify({ text }),
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
          <p>粘贴包含日期标题、英文正文、中文翻译和词汇表的全文；后台会自动拆分并发布到对应年份和月份。</p>
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
