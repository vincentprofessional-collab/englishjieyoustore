"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./admin-bbc-article-upload.module.css";
import { readBbcRichPaste, serializeBbcArticlePaste } from "@/lib/articles/bbc-paste-markup";
import { adminRequest } from "@/lib/admin/request";
import { analyzeBbcAudio } from "@/lib/admin/bbc-audio-alignment";
import type { BbcArticle } from "@/lib/articles/bbc";

type UploadTicket = { headers: Record<string, string>; objectPath: string; uploadUrl: string };
type SentenceUploadTicket = UploadTicket & { sentenceNo: number };
type AudioPreparation = Awaited<ReturnType<typeof analyzeBbcAudio>>;

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
  const [existingAudio, setExistingAudio] = useState<{ objectPath: string } | null>(null);
  const [articles, setArticles] = useState<{ id: string; published: boolean; title: string; year: number }[]>([]);
  const audioJob = useRef<{ file: File; sentenceKey: string; preparation?: AudioPreparation; objectPath?: string; uploaded: Map<number, string> } | null>(null);

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
      audioJob.current = null;
      setExistingAudio(result.article.fullAudioUrl ? { objectPath: result.objectPath } : null);
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
    if (!audioFile && !existingAudio) { setError(true); setMessage("请选择本篇 MP3，以自动切分逐句小音频。"); return; }

    setBusy(true);
    setAudioProgress(0);
    setAudioStatus(audioFile ? "analyzing" : "waiting");
    try {
      setMessage(audioFile ? "正在解析文章并生成词性、句子成分标注……" : "正在保存文章修改并保留原有音频时间轴……");
      const prepared = await adminRequest("/api/admin/bbc-articles", { method: "POST", body: JSON.stringify({ action: "prepare", text }) }) as {
        article: BbcArticle;
        pastedSyntaxCount?: number;
        pastedSyntaxTotalCount?: number;
        unmatchedSyntaxSentenceNos?: number[];
      };
      if (editingId && editingId !== prepared.article.id) throw new Error("编辑文章时请保留原日期编号。");
      if (prepared.unmatchedSyntaxSentenceNos?.length) throw new Error(`第 ${prepared.unmatchedSyntaxSentenceNos.join("、")} 句的语法标注未匹配，请核对输入内容。`);
      let objectPath: string | undefined = existingAudio?.objectPath;
      let alignment: AudioPreparation | undefined;
      let sentenceAudioFiles: { sentenceNo: number; objectPath: string }[] | undefined;
      if (audioFile) {
        const sentenceKey = JSON.stringify((prepared.article.sentences ?? []).map((sentence) => sentence.english));
        if (audioJob.current?.file !== audioFile || audioJob.current.sentenceKey !== sentenceKey) {
          audioJob.current = { file: audioFile, sentenceKey, uploaded: new Map() };
        }
        const job = audioJob.current;
        alignment = job.preparation ?? await analyzeBbcAudio(audioFile, prepared.article.sentences ?? [], setMessage);
        job.preparation = alignment;
        const title = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((line) => line.trim())?.replace(/^\s*#{1,6}\s*/, "").trim() ?? "";
        const totalBytes = audioFile.size + alignment.clips.reduce((total, clip) => total + clip.file.size, 0);
        setAudioStatus("uploading");
        if (!job.objectPath) {
          const ticket = await adminRequest("/api/admin/bbc-articles", {
            body: JSON.stringify({ action: "presign", filename: audioFile.name, size: audioFile.size, title }), method: "POST",
          }) as UploadTicket;
          setMessage("正在上传完整原声……");
          await uploadToR2(ticket, audioFile, (progress) => setAudioProgress(Math.round(progress * audioFile.size / totalBytes)));
          job.objectPath = ticket.objectPath;
        }
        objectPath = job.objectPath;
        const { tickets } = await adminRequest("/api/admin/bbc-articles", {
          body: JSON.stringify({ action: "presign-sentences", title, objectPath, files: alignment.clips.map((clip) => ({ sentenceNo: clip.sentenceNo, size: clip.file.size })) }),
          method: "POST",
        }) as { tickets: SentenceUploadTicket[] };
        if (tickets.length !== alignment.clips.length) throw new Error("独立小音频上传清单不完整，请重试。");
        let completedBytes = audioFile.size + alignment.clips.filter((clip) => job.uploaded.has(clip.sentenceNo)).reduce((total, clip) => total + clip.file.size, 0);
        for (let index = 0; index < alignment.clips.length; index++) {
          const clip = alignment.clips[index];
          const ticket = tickets[index];
          if (ticket.sentenceNo !== clip.sentenceNo) throw new Error("小音频顺序与正文不一致，请重试。");
          if (job.uploaded.get(clip.sentenceNo) === ticket.objectPath) continue;
          setMessage(`正在上传小音频 ${index + 1}/${alignment.clips.length}……`);
          await uploadToR2(ticket, clip.file, (progress) => setAudioProgress(Math.round((completedBytes + clip.file.size * progress / 100) / totalBytes * 100)));
          completedBytes += clip.file.size;
          job.uploaded.set(clip.sentenceNo, ticket.objectPath);
        }
        sentenceAudioFiles = alignment.clips.map((clip) => ({ sentenceNo: clip.sentenceNo, objectPath: job.uploaded.get(clip.sentenceNo)! }));
        setAudioProgress(100);
        setAudioStatus("uploaded");
      }
      setMessage("正在核对小音频并保存文章与语法标注……");
      const payload = await adminRequest("/api/admin/bbc-articles", {
        body: JSON.stringify({ text, objectPath, ...(alignment ? { durationMs: alignment.durationMs, timings: alignment.timings, sentenceAudioFiles } : {}) }),
        method: "PUT",
      });

      const articleId = typeof payload.articleId === "string" ? payload.articleId : prepared.article.id;
      const isPublished = payload.published === true;
      setEditingId(articleId);
      if (objectPath) setExistingAudio({ objectPath });
      setAudioFile(null);
      audioJob.current = null;
      setPublishedHref(`/articles/${articleId}${isPublished ? "" : "?preview=draft"}`);
      const reviewSentenceNos = alignment?.reviewSentenceNos ?? [];
      const pastedSyntaxTotalCount = prepared.pastedSyntaxTotalCount ?? 0;
      const unmatchedSyntaxSentenceNos = prepared.unmatchedSyntaxSentenceNos ?? [];
      const syntaxMessage = pastedSyntaxTotalCount
        ? `已按输入框中的内容应用 ${prepared.pastedSyntaxCount ?? 0}/${pastedSyntaxTotalCount} 句词性与成分标注。${unmatchedSyntaxSentenceNos.length ? `第 ${unmatchedSyntaxSentenceNos.join("、")} 句未匹配；请核对后再继续。` : ""}`
        : /全文逐句词性\s*[+＋]\s*句子成分标注/i.test(text)
          ? "检测到语法标注标题，但没有解析到句子标注；请检查是否按“## 句1”单独分行。"
          : "";
      setMessage(
        `${isPublished ? `已更新 ${payload.year} 年 ${payload.month} 月的已发布文章` : `已保存为 ${payload.year} 年 ${payload.month} 月的草稿，用户暂时看不到`}；${payload.paragraphCount} 段正文、${payload.sentenceCount} 句、${payload.vocabularyCount} 条词汇、${payload.sentenceAudioCount ?? 0} 个独立小音频。${syntaxMessage}未提供标注的句子已自动分析；可打开前端预览检查。${reviewSentenceNos.length ? `第 ${reviewSentenceNos.join("、")} 句识别词与原文存在差异，请试听核对。` : ""}`,
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
          <p>上传后自动整理中英文与词汇、完成词性和语法成分标注，并按原声切分独立小音频。新文章先保存为草稿，可预览后发布。</p>
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
          <small>首行是标题，英文与中文逐段对应，编号词条自动归入右侧词汇栏。粘贴带格式的原文会保留波浪线；纯文本也可用 ~~词语~~ 标记波浪线。可在文章内容后追加“# 全文逐句词性+句子成分标注”及“## 句1”格式的标注。已提供的标注会严格按原文映射；词句匹配失败时会提示并阻止保存，避免退回错误的自动标注。未提供标注的句子才由系统自动分析。</small>
        </label>
        <label className={styles.full}>
          <span>MP3 音频{existingAudio ? "（已有关联音频，可替换）" : ""}</span>
          <input accept=".mp3,audio/mpeg" disabled={busy} onChange={(event) => { setAudioFile(event.target.files?.[0] ?? null); audioJob.current = null; setAudioProgress(0); setAudioStatus("waiting"); }} type="file" />
          <small>{audioFile ? `${audioFile.name} · ${(audioFile.size / 1024 / 1024).toFixed(1)} MB` : existingAudio ? "已关联原音频；只改词汇、中文或语法时保留原有小音频。修改英文句子后请重新选择 MP3。" : "最大 200 MB；自动按句间停顿切分 MP3，并逐句上传。"}</small>
        </label>
        {audioFile ? (
          <div aria-label="MP3 音频上传进度" aria-valuemax={100} aria-valuemin={0} aria-valuenow={audioProgress} className={styles.progress} role="progressbar">
            <span>{audioStatus === "uploaded" ? "原声和独立小音频已上传" : audioStatus === "analyzing" ? "正在识别原声并切分小音频" : audioStatus === "analysis-failed" ? "音频处理失败，请核对原文与 MP3" : audioStatus === "uploading" ? `音频上传中 ${audioProgress}%` : audioStatus === "failed" ? "音频上传失败，请重试" : "等待上传"}</span>
            <div className={styles.progressTrack}><i style={{ width: `${audioProgress}%` }} /></div>
          </div>
        ) : null}
        {message ? <p aria-live="polite" className={`${styles.message} ${error ? styles.error : ""} ${styles.full}`}>{message}</p> : null}
        {publishedHref ? <Link className={`${styles.publishedLink} ${styles.full}`} href={publishedHref} target="_blank">{publishedHref.includes("preview=draft") ? "打开草稿前端校改 ↗" : "打开文章前端 ↗"}</Link> : null}
        <div className={`${styles.actions} ${styles.full}`}>
          {editingId ? <button className="button secondary" disabled={busy} onClick={() => { setEditingId(null); setExistingAudio(null); setText(""); setAudioFile(null); setMessage(""); setPublishedHref(""); }} type="button">新建文章</button> : null}
          <button className="button primary" disabled={busy || !text.trim()} type="submit">
            {busy ? "解析并保存中…" : editingId ? "解析并保存修改" : "解析并保存为草稿"}
          </button>
        </div>
      </form>
      {articles.length ? <section className={styles.articleList}><h3>已上传文章</h3>{articles.map((article) => <div key={article.id}><span>{article.id} · {article.title} · {article.published ? "已发布" : "草稿"}</span><button className="button secondary" disabled={busy} onClick={() => void editArticle(article.id)} type="button">修改正文</button><Link className="button secondary" href={`/articles/${article.id}${article.published ? "" : "?preview=draft"}`} target="_blank">{article.published ? "打开前端 ↗" : "前端校改 ↗"}</Link></div>)}</section> : null}
    </section>
  );
}
