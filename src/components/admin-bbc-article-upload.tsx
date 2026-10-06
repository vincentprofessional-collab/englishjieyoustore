"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { parseBbcArticleDateFromTitle, splitBbcArticleParagraphs } from "@/lib/articles/bbc-article-upload";
import { supabase } from "@/lib/supabase/client";
import styles from "./admin-bbc-article-upload.module.css";

type UploadTicket = {
  date: string;
  headers: Record<string, string>;
  id: string;
  objectPath: string;
  uploadUrl: string;
  year: number;
};

function readApiError(payload: unknown) {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : "操作失败，请稍后重试。";
}

function uploadToR2(ticket: UploadTicket, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", ticket.uploadUrl);
    Object.entries(ticket.headers).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("无法连接 Cloudflare R2。请检查网络和 R2 bucket 的 CORS 配置。"));
    request.onabort = () => reject(new Error("上传已取消。"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error(`Cloudflare R2 上传失败（HTTP ${request.status}）。请检查 R2 CORS 是否允许当前网站来源和 PUT。`));
    };
    request.send(file);
  });
}

export function AdminBbcArticleUpload() {
  const [title, setTitle] = useState("");
  const [titleChinese, setTitleChinese] = useState("");
  const [english, setEnglish] = useState("");
  const [chinese, setChinese] = useState("");
  const [vocabulary, setVocabulary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [publishedHref, setPublishedHref] = useState("");
  const articleDate = useMemo(() => parseBbcArticleDateFromTitle(title), [title]);

  async function getAccessToken() {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data.session?.access_token) throw new Error("管理员登录已失效，请重新登录后台。");
    return data.session.access_token;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPublishedHref("");
    setError(false);
    setProgress(0);

    if (!articleDate) {
      setError(true);
      setMessage("标题中需要包含有效日期数字，例如 260727 或 20260727。");
      return;
    }
    if (!file || !/\.mp3$/i.test(file.name)) {
      setError(true);
      setMessage("请选择 MP3 音频文件。");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError(true);
      setMessage("MP3 文件不能超过 200 MB。");
      return;
    }
    const englishParagraphs = splitBbcArticleParagraphs(english, "en");
    const chineseParagraphs = splitBbcArticleParagraphs(chinese, "zh");
    if (englishParagraphs.length === 0 || chineseParagraphs.length === 0) {
      setError(true);
      setMessage("请填写英文原文和中文翻译。");
      return;
    }
    if (englishParagraphs.length !== chineseParagraphs.length) {
      setError(true);
      setMessage(`英文原文 ${englishParagraphs.length} 段，中文翻译 ${chineseParagraphs.length} 段；请按段落一一对应，并用空行分隔。`);
      return;
    }
    const vocabularyRows = vocabulary.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (vocabularyRows.some((line) => {
      const [term, ...meaning] = line.split(/[|\t]/);
      return !term.trim() || !meaning.join("|").trim();
    })) {
      setError(true);
      setMessage("词汇与短语请按“英文词汇 | 中文释义”填写，每行一条。");
      return;
    }

    setBusy(true);
    try {
      const token = await getAccessToken();
      const presignResponse = await fetch("/api/admin/bbc-articles", {
        body: JSON.stringify({ action: "presign", filename: file.name, size: file.size, title }),
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        method: "POST",
      });
      const presignPayload = await presignResponse.json();
      if (!presignResponse.ok) throw new Error(readApiError(presignPayload));

      await uploadToR2(presignPayload as UploadTicket, file, setProgress);
      setMessage("音频已上传，正在保存文章并发布到对应年月…");

      const saveResponse = await fetch("/api/admin/bbc-articles", {
        body: JSON.stringify({
          chinese,
          english,
          objectPath: (presignPayload as UploadTicket).objectPath,
          title,
          titleChinese,
          vocabulary,
        }),
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        method: "PUT",
      });
      const savePayload = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(readApiError(savePayload));

      setPublishedHref(savePayload.href);
      setMessage(`已发布：${articleDate.year} 年 ${articleDate.month} 月，文章编号 ${articleDate.id}。它会置于该年份列表顶部。`);
    } catch (uploadError) {
      setError(true);
      setMessage(uploadError instanceof Error ? uploadError.message : "上传失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <span>BBC · R2 AUDIO</span>
          <h2>上传 BBC 文章</h2>
          <p>MP3 直传 Cloudflare R2，文章资料保存后会进入 BBC 文章列表，并可使用现有学习页面。</p>
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.full}>
          <span>英文标题（标题需含日期数字）</span>
          <input
            maxLength={180}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="260727 How to cope with disappointment"
            required
            value={title}
          />
          <small>
            {articleDate
              ? `识别为 ${articleDate.year} 年 ${articleDate.month} 月 ${articleDate.date}；R2 路径 bbc/${articleDate.year}/${articleDate.id}/full.mp3`
              : "支持 YYMMDD 或 YYYYMMDD，例如 260727、20260727。"}
          </small>
        </label>
        <label className={styles.full}>
          <span>中文标题（可选）</span>
          <input maxLength={180} onChange={(event) => setTitleChinese(event.target.value)} value={titleChinese} />
        </label>
        <label>
          <span>英文原文</span>
          <textarea
            onChange={(event) => setEnglish(event.target.value)}
            placeholder="按段落粘贴；段落之间空一行。"
            required
            rows={12}
            value={english}
          />
        </label>
        <label>
          <span>中文翻译</span>
          <textarea
            onChange={(event) => setChinese(event.target.value)}
            placeholder="段落数量和顺序需与英文原文一致；段落之间空一行。"
            required
            rows={12}
            value={chinese}
          />
        </label>
        <label className={styles.full}>
          <span>词汇与短语（每行一条，英文 | 中文释义）</span>
          <textarea
            onChange={(event) => setVocabulary(event.target.value)}
            placeholder={"cope with | 应对\ndisappointment | 失望，沮丧\nmove forward | 继续前进"}
            rows={6}
            value={vocabulary}
          />
          <small>词汇会自动按正文出现顺序展示，并使用 BBC 现有的词汇卡片、收藏和链接功能。</small>
        </label>
        <label className={`${styles.full} ${styles.file}`}>
          <span>文章完整 MP3</span>
          <input accept=".mp3,audio/mpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required type="file" />
          {file ? <small>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</small> : <small>最大 200 MB；浏览器将直接上传到 Cloudflare R2。</small>}
        </label>
        {busy ? (
          <div aria-live="polite" className={`${styles.progress} ${styles.full}`}>
            <span>R2 上传进度</span><strong>{progress}%</strong>
            <progress max="100" value={progress} />
          </div>
        ) : null}
        {message ? <p aria-live="polite" className={`${styles.message} ${error ? styles.error : ""} ${styles.full}`}>{message}</p> : null}
        {publishedHref ? <Link className={`${styles.publishedLink} ${styles.full}`} href={publishedHref} target="_blank">打开刚发布的文章 ↗</Link> : null}
        <div className={`${styles.actions} ${styles.full}`}>
          <button className="button primary" disabled={busy || !articleDate || !file} type="submit">
            {busy ? "上传和发布中…" : "上传 MP3 并发布文章"}
          </button>
        </div>
      </form>
    </section>
  );
}
