"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import styles from "./admin-bbc-article-upload.module.css";
import { readBbcRichPaste, serializeBbcArticlePaste } from "@/lib/articles/bbc-paste-markup";
import { adminRequest } from "@/lib/admin/request";
import { analyzeBbcAudio } from "@/lib/admin/bbc-audio-alignment";
import type { BbcArticle } from "@/lib/articles/bbc";

type UploadTicket = { headers: Record<string, string>; objectPath: string; uploadUrl: string };

function uploadToR2(ticket: UploadTicket, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", ticket.uploadUrl);
    Object.entries(ticket.headers).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => reject(new Error("音频上传未完成，可能是存储服务拒绝请求或传输中断。请重试或检查后台上传权限。"));
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

export function AdminBbcArticleUpload() {
  const [text, setText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioStatus, setAudioStatus] = useState<
    "waiting" | "analyzing" | "analysis-failed" | "uploading" | "uploaded" | "failed"
  >("waiting");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [publishedHref, setPublishedHref] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingAudio, setExistingAudio] = useState<{ url: string; objectPath: string } | null>(null);
  const [articles, setArticles] = useState<{ id: string; title: string; year: number }[]>([]);

  async function loadArticles() {
    const result = await adminRequest("/api/admin/bbc-articles");
    setArticles(result.articles);
  }
  useEffect(() => { void loadArticles().catch(() => undefined); }, []);
  async function editArticle(id: string) {
    setBusy(true); setError(false); setMessage("");
    try {
      const result = await adminRequest(`/api/admin/bbc-articles?articleId=${encodeURIComponent(id)}`);
      setText(serializeBbcArticlePaste(result.article));
      setEditingId(id); setAudioFile(null); setAudioProgress(0); setAudioStatus("waiting");
      setExistingAudio(result.audioReadUrl ? { url: result.audioReadUrl, objectPath: result.objectPath } : null);
      setPublishedHref(`/articles/${id}`);
      setMessage("正在编辑已上传文章。修改正文后会自动重新分析时间轴；语法标注可在下方追加后由系统识别，也可在前端精读页面直接修改。");
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "文章无法读取。"); }
    finally { setBusy(false); }
  }

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
    if (!audioFile && !existingAudio) { setError(true); setMessage("请选择本篇 MP3，以自动生成逐句原声时间轴。"); return; }

    setBusy(true);
    setAudioProgress(0);
    setAudioStatus(audioFile ? "analyzing" : "waiting");
    try {
      setMessage("正在解析文章并生成词性、句子成分标注……");
      const prepared = await adminRequest("/api/admin/bbc-articles", { method: "POST", body: JSON.stringify({ action: "prepare", text }) }) as {
        article: BbcArticle;
        pastedSyntaxCount?: number;
        pastedSyntaxTotalCount?: number;
        unmatchedSyntaxSentenceNos?: number[];
      };
      if (editingId && editingId !== prepared.article.id) throw new Error("编辑文章时请保留原日期编号。");
      let audioBlob: Blob = audioFile!;
      let objectPath: string | undefined = existingAudio?.objectPath;
      if (!audioFile && existingAudio) {
        const current = await adminRequest(`/api/admin/bbc-articles?articleId=${encodeURIComponent(editingId!)}`);
        objectPath = current.objectPath;
        const response = await fetch(current.audioReadUrl, { headers: { "Content-Type": "audio/mpeg" } });
        if (!response.ok) throw new Error("无法读取现有 MP3，请重新选择本篇音频。");
        audioBlob = await response.blob();
      }
      const alignment = await analyzeBbcAudio(audioBlob, prepared.article.sentences ?? [], setMessage);
      if (audioFile) {
        const title = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((line) => line.trim())?.replace(/^\s*#{1,6}\s*/, "").trim() ?? "";
        const ticket = await adminRequest("/api/admin/bbc-articles", {
          body: JSON.stringify({ action: "presign", filename: audioFile.name, size: audioFile.size, title }),
          method: "POST",
        }) as UploadTicket;
        setAudioStatus("uploading");
        await uploadToR2(ticket, audioFile, setAudioProgress);
        setAudioStatus("uploaded");
        objectPath = ticket.objectPath;
      }
      const payload = await adminRequest("/api/admin/bbc-articles", {
        body: JSON.stringify({ text, objectPath, ...alignment }),
        method: "PUT",
      });

      setPublishedHref(payload.href);
      const pastedSyntaxTotalCount = prepared.pastedSyntaxTotalCount ?? 0;
      const unmatchedSyntaxSentenceNos = prepared.unmatchedSyntaxSentenceNos ?? [];
      const syntaxMessage = pastedSyntaxTotalCount
        ? `已应用后台粘贴的 ${prepared.pastedSyntaxCount ?? 0}/${pastedSyntaxTotalCount} 句词性与成分标注。${unmatchedSyntaxSentenceNos.length ? `第 ${unmatchedSyntaxSentenceNos.join("、")} 句未匹配，将显示自动标注；请核对该句编号和英文原句。` : ""}`
        : /全文逐句词性\s*[+＋]\s*句子成分标注/i.test(text)
          ? "检测到语法标注标题，但没有解析到句子标注；请检查是否按“## 句1”单独分行。"
          : "";
      setMessage(
        `已发布到 ${payload.year} 年 ${payload.month} 月；${payload.paragraphCount} 段正文、${payload.sentenceCount} 句、${payload.vocabularyCount} 条词汇。${syntaxMessage}其余句子已自动生成词性和句子成分，前端精读页面可继续修改。${alignment.reviewSentenceNos.length ? `第 ${alignment.reviewSentenceNos.join("、")} 句为低置信度估时，请在前端试听并微调。` : ""}`,
      );
      void loadArticles().catch(() => undefined);
    } catch (uploadError) {
      setAudioStatus((status) => status === "uploading" ? "failed" : status === "analyzing" ? "analysis-failed" : status);
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
          <h2>{editingId ? "修改 BBC 文章" : "上传 BBC 文章"}</h2>
          <p>粘贴原文并选择 MP3，自动生成逐句音频时间轴和双语字幕；附加逐句语法标注会自动匹配到前端精读页面。</p>
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.full}>
          <span>文章全文</span>
          <textarea
            maxLength={700_000}
            readOnly={busy}
            onChange={(event) => setText(event.target.value)}
            onPaste={(event) => {
              const richText = readBbcRichPaste(event.clipboardData.getData("text/html"));
              if (!richText) return;
              event.preventDefault();
              const input = event.currentTarget;
              const start = input.selectionStart;
              const end = input.selectionEnd;
              setText((current) => current.slice(0, start) + richText + current.slice(end));
              requestAnimationFrame(() => input.setSelectionRange(start + richText.length, start + richText.length));
            }}
            placeholder={"260202-Protecting your photos in a digital age 如何在数字时代保管你的照片\n\nEnglish paragraph...\n中文段落……\n\n词汇表\n1. **term** /phonetic/ n. 中文释义\n   例句：An English example.\n   翻译：对应的中文翻译。"}
            required
            rows={24}
            value={text}
          />
          <small>首行是标题，英文与中文逐段对应，编号词条自动归入右侧词汇栏。粘贴带格式的原文会保留波浪线；纯文本也可用 ~~词语~~ 标记波浪线。可在文章内容后追加“# 全文逐句词性+句子成分标注”及“## 句1”格式的标注，系统按英文原句自动匹配；未匹配的句子仍会自动分析。</small>
        </label>
        <label className={styles.full}>
          <span>MP3 音频{existingAudio ? "（已有关联音频，可替换）" : ""}</span>
          <input accept=".mp3,audio/mpeg" disabled={busy} onChange={(event) => { setAudioFile(event.target.files?.[0] ?? null); setAudioProgress(0); setAudioStatus("waiting"); }} type="file" />
          <small>{audioFile ? `${audioFile.name} · ${(audioFile.size / 1024 / 1024).toFixed(1)} MB` : "最大 200 MB；浏览器直接上传到 Cloudflare R2，不经过文章接口传输音频内容。"}</small>
        </label>
        {audioFile ? (
          <div aria-label="MP3 音频上传进度" aria-valuemax={100} aria-valuemin={0} aria-valuenow={audioProgress} className={styles.progress} role="progressbar">
            <span>{audioStatus === "uploaded" ? "音频已上传" : audioStatus === "analyzing" ? "正在识别并生成时间轴" : audioStatus === "analysis-failed" ? "时间轴生成失败，音频尚未上传" : audioStatus === "uploading" ? `音频上传中 ${audioProgress}%` : audioStatus === "failed" ? "R2 音频上传失败，请重试" : "等待上传"}</span>
            <div className={styles.progressTrack}><i style={{ width: `${audioProgress}%` }} /></div>
          </div>
        ) : null}
        {message ? <p aria-live="polite" className={`${styles.message} ${error ? styles.error : ""} ${styles.full}`}>{message}</p> : null}
        {publishedHref ? <Link className={`${styles.publishedLink} ${styles.full}`} href={publishedHref} target="_blank">打开刚发布的文章 ↗</Link> : null}
        <div className={`${styles.actions} ${styles.full}`}>
          {editingId ? <button className="button secondary" disabled={busy} onClick={() => { setEditingId(null); setExistingAudio(null); setText(""); setAudioFile(null); setMessage(""); setPublishedHref(""); }} type="button">新建文章</button> : null}
          <button className="button primary" disabled={busy || !text.trim()} type="submit">
            {busy ? "解析并发布中…" : "解析并发布文章"}
          </button>
        </div>
      </form>
      {articles.length ? <section className={styles.articleList}><h3>已上传文章</h3>{articles.map((article) => <div key={article.id}><span>{article.id} · {article.title}</span><button className="button secondary" disabled={busy} onClick={() => void editArticle(article.id)} type="button">修改</button><Link className="button secondary" href={`/articles/${article.id}`} target="_blank">打开前端 ↗</Link></div>)}</section> : null}
    </section>
  );
}
