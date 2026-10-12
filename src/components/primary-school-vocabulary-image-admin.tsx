"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import primarySchoolVocabulary from "@/data/vocabulary/primary-school-vocabulary.json";
import { supabase } from "@/lib/supabase/client";
import { getPrimarySchoolVocabularyImageUrl } from "@/lib/vocabulary/primary-school-vocabulary-images";
import styles from "@/components/primary-school-vocabulary-image-admin.module.css";

type VocabularyItem = (typeof primarySchoolVocabulary)[number];
type ImageStatus = "present" | "missing";

const PAGE_SIZE = 24;
const apiPath = "/api/admin-primary-school-vocabulary-image";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function normalizeWord(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

async function toSmallWebp(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("请选用 JPG、PNG 或 WebP 图片。");
  }

  const source = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    source.close();
    throw new Error("无法处理这张图片，请换一张图片再试。");
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
  if (!blob) throw new Error("图片压缩失败，请换一张图片再试。");
  if (blob.size > 350 * 1024) throw new Error("图片压缩后仍超过 350 KB，请换一张更简单的图片。");
  return new File([blob], "vocabulary.webp", { type: "image/webp", lastModified: file.lastModified });
}

async function getAdminToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("管理员登录已失效，请重新登录。");
  return session.access_token;
}

export function PrimarySchoolVocabularyImageAdmin() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [imageStatuses, setImageStatuses] = useState<Record<string, ImageStatus>>({});
  const [imageVersions, setImageVersions] = useState<Record<string, number>>({});
  const [busyWord, setBusyWord] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ completed: number; total: number } | null>(null);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const normalizedQuery = normalizeWord(query);
  const filteredWords = useMemo(() => primarySchoolVocabulary.filter((item) =>
    !normalizedQuery || normalizeWord(item.word).includes(normalizedQuery) || item.def.toLowerCase().includes(query.trim().toLowerCase()),
  ), [normalizedQuery, query]);
  const pageCount = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const visibleWords = filteredWords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const wordSet = useMemo(() => new Set(primarySchoolVocabulary.map(({ word }) => normalizeWord(word))), []);
  const busy = Boolean(busyWord || bulkProgress);

  function markImage(word: string, status: ImageStatus) {
    setImageStatuses((current) => ({ ...current, [word]: status }));
  }

  function bumpImageVersion(word: string) {
    setImageVersions((current) => ({ ...current, [word]: Date.now() }));
  }

  async function uploadOne(word: string, file: File, accessToken: string) {
    const prepared = await toSmallWebp(file);
    const body = new FormData();
    body.append("word", word);
    body.append("file", prepared);
    const response = await fetch(apiPath, {
      body,
      headers: { Authorization: `Bearer ${accessToken}` },
      method: "POST",
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "图片上传失败。");
    bumpImageVersion(word);
    markImage(word, "present");
  }

  async function handleSingleUpload(word: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setBusyWord(word);
    setMessage("");
    try {
      await uploadOne(word, file, await getAdminToken());
      setMessage(`已保存 ${word} 的图片。`);
      setMessageIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片上传失败。");
      setMessageIsError(true);
    } finally {
      setBusyWord(null);
    }
  }

  async function handleBulkUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;

    const matched: { word: string; file: File }[] = [];
    const unmatched: string[] = [];
    for (const file of files) {
      const word = normalizeWord(file.name.replace(/\.[^.]+$/, ""));
      if (wordSet.has(word)) matched.push({ word, file });
      else unmatched.push(file.name);
    }
    if (matched.length === 0) {
      setMessage("没有匹配到词条。请把图片文件名设为词条，例如 air-conditioner.webp。");
      setMessageIsError(true);
      return;
    }

    setMessage("");
    setBulkProgress({ completed: 0, total: matched.length });
    let succeeded = 0;
    const failed: string[] = [];
    try {
      const accessToken = await getAdminToken();
      for (const [index, item] of matched.entries()) {
        setBulkProgress({ completed: index, total: matched.length });
        try {
          await uploadOne(item.word, item.file, accessToken);
          succeeded += 1;
        } catch (error) {
          failed.push(`${item.file.name}: ${error instanceof Error ? error.message : "上传失败"}`);
        }
      }
      setMessage(`批量处理完成：成功 ${succeeded} 张，失败 ${failed.length} 张，未匹配 ${unmatched.length} 张。${failed.length ? ` ${failed.slice(0, 3).join("；")}` : ""}`);
      setMessageIsError(failed.length > 0 || unmatched.length > 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "批量上传失败。");
      setMessageIsError(true);
    } finally {
      setBulkProgress(null);
    }
  }

  async function handleDelete(word: string) {
    if (!window.confirm(`删除“${word}”的图片？词条本身不会删除。`)) return;
    setBusyWord(word);
    setMessage("");
    try {
      const accessToken = await getAdminToken();
      const response = await fetch(apiPath, {
        body: JSON.stringify({ word }),
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "图片删除失败。");
      markImage(word, "missing");
      bumpImageVersion(word);
      setMessage(`已删除 ${word} 的图片。`);
      setMessageIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片删除失败。");
      setMessageIsError(true);
    } finally {
      setBusyWord(null);
    }
  }

  return (
    <section className={styles.manager}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>词汇图卡 · 小学</span>
          <h2>小学词汇图片</h2>
          <p>共 {primarySchoolVocabulary.length} 个词条。建议选用童趣、色彩明快、主体清晰的插画；上传时会压缩为最长边 512 像素的 WebP。</p>
        </div>
        <label className={styles.bulkButton}>
          {bulkProgress ? `批量上传 ${bulkProgress.completed}/${bulkProgress.total}` : "批量上传图片"}
          <input
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            multiple
            onChange={(event) => void handleBulkUpload(event)}
            type="file"
          />
        </label>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span>搜索词条</span>
          <input
            onChange={(event) => { setQuery(event.target.value); setPage(0); }}
            placeholder="输入英文或中文释义"
            type="search"
            value={query}
          />
        </label>
        <p className={styles.count}>显示 {visibleWords.length} / {filteredWords.length} 个词条</p>
        <div className={styles.pagination}>
          <button disabled={page === 0 || busy} onClick={() => setPage((current) => current - 1)} type="button">上一页</button>
          <span>{page + 1} / {pageCount}</span>
          <button disabled={page + 1 >= pageCount || busy} onClick={() => setPage((current) => current + 1)} type="button">下一页</button>
        </div>
      </div>

      {message ? <p className={`${styles.message}${messageIsError ? ` ${styles.error}` : ""}`} role="status">{message}</p> : null}

      <div className={styles.grid}>
        {visibleWords.map((item: VocabularyItem) => {
          const word = normalizeWord(item.word);
          const imageUrl = getPrimarySchoolVocabularyImageUrl(word);
          const version = imageVersions[word] ?? 0;
          const imageStatus = imageStatuses[word];
          return (
            <article className={styles.card} key={word}>
              <div className={styles.preview}>
                {imageStatus !== "present" ? <span>{imageStatus === "missing" ? "未添加" : "🎨"}</span> : null}
                {imageUrl ? (
                  <img
                    alt={`${word} 词汇图片预览`}
                    className={imageStatus === "present" ? styles.image : styles.imageChecking}
                    loading="lazy"
                    onError={() => markImage(word, "missing")}
                    onLoad={() => markImage(word, "present")}
                    src={`${imageUrl}&v=${version}`}
                  />
                ) : null}
              </div>
              <div className={styles.details}>
                <strong>{item.word}</strong>
                <p>{item.def.replace(/\s+/g, " ").slice(0, 62)}</p>
                <div className={styles.actions}>
                  <label className={styles.replaceButton}>
                    {imageStatus === "present" ? "替换" : "上传"}
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy}
                      onChange={(event) => void handleSingleUpload(word, event)}
                      type="file"
                    />
                  </label>
                  {imageStatus === "present" ? (
                    <button
                      className={styles.deleteButton}
                      disabled={busy}
                      onClick={() => void handleDelete(word)}
                      type="button"
                    >删除</button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {visibleWords.length === 0 ? <p className={styles.empty}>没有找到匹配词条。</p> : null}
    </section>
  );
}
