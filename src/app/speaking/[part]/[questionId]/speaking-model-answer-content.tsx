"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import type {
  SpeakingScoreNote,
  SpeakingVocabulary,
} from "@/data/ielts/speaking-model-answers";
import { uploadAdminAudio } from "@/lib/admin/upload-audio";
import {
  applySpeakingManagedContent,
  type SpeakingEditableContent,
  type SpeakingManagedContentResponse,
} from "@/lib/ielts/speaking-managed-content";
import { supabase } from "@/lib/supabase/client";
import styles from "./speaking-model-answer.module.css";

type SpeakingModelAnswerContentProps = {
  initialContent: SpeakingEditableContent;
  scoreNotes: SpeakingScoreNote[];
};

type SpeakingEditorDraft = Omit<
  SpeakingEditableContent,
  "answer" | "answerTranslation" | "frames"
> & {
  answerText: string;
  answerTranslationText: string;
  framesText: string;
};

type AdminStatus = {
  tone: "info" | "error" | "success";
  text: string;
};

function paragraphText(paragraphs: string[]) {
  return paragraphs.join("\n\n");
}

function splitParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(text: string) {
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cloneVocabulary(vocabulary: SpeakingVocabulary[]) {
  return vocabulary.map((item) => ({ ...item }));
}

function createEditorDraft(content: SpeakingEditableContent): SpeakingEditorDraft {
  const { answer, answerTranslation, frames, ...rest } = content;

  return {
    ...rest,
    answerText: paragraphText(answer),
    answerTranslationText: paragraphText(answerTranslation),
    framesText: frames.join("\n"),
    vocabulary: cloneVocabulary(content.vocabulary),
  };
}

function createContentFromDraft(draft: SpeakingEditorDraft): SpeakingEditableContent {
  const { answerText, answerTranslationText, framesText, ...rest } = draft;

  return {
    ...rest,
    answer: splitParagraphs(answerText),
    answerTranslation: splitParagraphs(answerTranslationText),
    frames: splitLines(framesText),
    vocabulary: cloneVocabulary(draft.vocabulary).filter(
      (item) => item.phrase || item.translation || item.note,
    ),
  };
}

export default function SpeakingModelAnswerContent({
  initialContent,
  scoreNotes,
}: SpeakingModelAnswerContentProps) {
  const [content, setContent] = useState(initialContent);
  const [canEdit, setCanEdit] = useState(false);
  const [editorDraft, setEditorDraft] = useState<SpeakingEditorDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<AdminStatus | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadManagedContent() {
      try {
        const response = await fetch(
          `/api/speaking-managed-content?slug=${encodeURIComponent(initialContent.slug)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as SpeakingManagedContentResponse;
        const mergedContent = applySpeakingManagedContent(initialContent, payload);

        if (isMounted) {
          setContent(mergedContent);
        }
      } catch {
        // Static content remains available if the managed-content API is unavailable.
      }
    }

    loadManagedContent();

    return () => {
      isMounted = false;
    };
  }, [initialContent]);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted && profile?.role === "admin") {
          setCanEdit(true);
        }
      } catch {
        // Non-admin users should not see editor controls.
      }
    }

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  function openEditor() {
    setEditorDraft(createEditorDraft(content));
    setStatus(null);
  }

  function closeEditor() {
    setEditorDraft(null);
    setStatus(null);
  }

  function updateDraft(values: Partial<SpeakingEditorDraft>) {
    setEditorDraft((current) => (current ? { ...current, ...values } : current));
  }

  function updateVocabularyItem(
    index: number,
    field: keyof SpeakingVocabulary,
    value: string,
  ) {
    setEditorDraft((current) => {
      if (!current) {
        return current;
      }

      const nextVocabulary = cloneVocabulary(current.vocabulary);
      nextVocabulary[index] = {
        ...nextVocabulary[index],
        [field]: value,
      };

      return {
        ...current,
        vocabulary: nextVocabulary,
      };
    });
  }

  function addVocabularyItem() {
    setEditorDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        vocabulary: [...current.vocabulary, { note: "", phrase: "", translation: "" }],
      };
    });
  }

  function removeVocabularyItem(index: number) {
    setEditorDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        vocabulary: current.vocabulary.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editorDraft) {
      return;
    }

    const nextContent = createContentFromDraft(editorDraft);
    setIsSaving(true);
    setStatus({ tone: "info", text: "正在保存..." });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("请先登录管理员账号。");
      }

      const response = await fetch("/api/speaking-managed-content", {
        body: JSON.stringify({ content: nextContent }),
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "保存失败。");
      }

      setContent(nextContent);
      setEditorDraft(createEditorDraft(nextContent));
      setStatus({ tone: "success", text: "已保存，前台用户刷新后会读取最新内容。" });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "保存失败。",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file || !editorDraft) {
      return;
    }

    setIsUploading(true);
    setStatus({ tone: "info", text: "正在上传音频..." });

    try {
      const publicUrl = await uploadAdminAudio(
        file,
        `speaking/${editorDraft.partId}/${editorDraft.questionId}/${editorDraft.band}`,
      );
      updateDraft({ audioUrl: publicUrl });
      setStatus({ tone: "success", text: "音频已上传并填入 URL，请保存本页。" });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "音频上传失败。",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
      <header className={styles.hero}>
        <span>{content.heroLabel}</span>
        <h1>{content.question}</h1>
        <div className={styles.questionPrompt}>
          <p>
            <span>中文提示</span>
            <strong>{content.questionTranslation}</strong>
          </p>
          <p>
            <span>真实题目 / 常见追问</span>
            <strong>{content.followUp}</strong>
          </p>
        </div>
        <dl>
          <div>
            <dt>题型</dt>
            <dd>{content.partLabel}</dd>
          </div>
          <div>
            <dt>建议时长</dt>
            <dd>{content.timing}</dd>
          </div>
          <div>
            <dt>题目来源</dt>
            <dd>{content.year}</dd>
          </div>
        </dl>
      </header>

      {canEdit ? (
        <section className={styles.adminInlinePanel} aria-label="管理员前台编辑">
          <div className={styles.adminInlineHeader}>
            <div>
              <span>ADMIN EDIT</span>
              <h2>前台编辑当前口语页面</h2>
              <p>保存后会写入已发布覆盖内容，不会改动代码里的原始题库。</p>
            </div>
            {editorDraft ? (
              <button className={styles.adminSecondaryButton} type="button" onClick={closeEditor}>
                收起编辑
              </button>
            ) : (
              <button className={styles.adminPrimaryButton} type="button" onClick={openEditor}>
                编辑本页
              </button>
            )}
          </div>

          {status ? (
            <p className={`${styles.adminStatus} ${styles[status.tone]}`}>{status.text}</p>
          ) : null}

          {editorDraft ? (
            <form className={styles.adminEditor} onSubmit={saveContent}>
              <div className={styles.adminEditorGrid}>
                <label className={styles.adminField}>
                  <span>题目标题</span>
                  <input
                    value={editorDraft.question}
                    onChange={(event) => updateDraft({ question: event.target.value })}
                  />
                </label>
                <label className={styles.adminField}>
                  <span>中文提示</span>
                  <input
                    value={editorDraft.questionTranslation}
                    onChange={(event) =>
                      updateDraft({ questionTranslation: event.target.value })
                    }
                  />
                </label>
                <label className={styles.adminField}>
                  <span>题目来源</span>
                  <input
                    value={editorDraft.year}
                    onChange={(event) => updateDraft({ year: event.target.value })}
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>真实题目 / 常见追问</span>
                  <textarea
                    rows={3}
                    value={editorDraft.followUp}
                    onChange={(event) => updateDraft({ followUp: event.target.value })}
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>高分思路</span>
                  <textarea
                    rows={4}
                    value={editorDraft.approach}
                    onChange={(event) => updateDraft({ approach: event.target.value })}
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>万能句型（一行一句）</span>
                  <textarea
                    rows={5}
                    value={editorDraft.framesText}
                    onChange={(event) => updateDraft({ framesText: event.target.value })}
                  />
                </label>
              </div>

              <div className={styles.adminVocabularyEditor}>
                <div className={styles.adminVocabularyHeader}>
                  <h3>重点词汇和短语</h3>
                  <button type="button" onClick={addVocabularyItem}>
                    添加词汇
                  </button>
                </div>
                {editorDraft.vocabulary.length ? (
                  editorDraft.vocabulary.map((item, index) => (
                    <div className={styles.adminVocabularyRow} key={`${item.phrase}-${index}`}>
                      <input
                        aria-label={`第 ${index + 1} 个词汇`}
                        placeholder="词汇 / 短语"
                        value={item.phrase}
                        onChange={(event) =>
                          updateVocabularyItem(index, "phrase", event.target.value)
                        }
                      />
                      <input
                        aria-label={`第 ${index + 1} 个中文释义`}
                        placeholder="中文释义"
                        value={item.translation}
                        onChange={(event) =>
                          updateVocabularyItem(index, "translation", event.target.value)
                        }
                      />
                      <input
                        aria-label={`第 ${index + 1} 个使用说明`}
                        placeholder="使用说明"
                        value={item.note}
                        onChange={(event) =>
                          updateVocabularyItem(index, "note", event.target.value)
                        }
                      />
                      <button type="button" onClick={() => removeVocabularyItem(index)}>
                        删除
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={styles.adminHint}>暂无词汇，可点击“添加词汇”。</p>
                )}
              </div>

              <div className={styles.adminEditorGrid}>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>{content.answerHeading}（空一行分段）</span>
                  <textarea
                    rows={9}
                    value={editorDraft.answerText}
                    onChange={(event) => updateDraft({ answerText: event.target.value })}
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>中文翻译（空一行分段）</span>
                  <textarea
                    rows={9}
                    value={editorDraft.answerTranslationText}
                    onChange={(event) =>
                      updateDraft({ answerTranslationText: event.target.value })
                    }
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>音频 URL</span>
                  <input
                    value={editorDraft.audioUrl}
                    onChange={(event) => updateDraft({ audioUrl: event.target.value })}
                    placeholder="可直接填写现有音频地址，也可上传后自动填入"
                  />
                </label>
                <label className={`${styles.adminField} ${styles.adminWideField}`}>
                  <span>上传音频</span>
                  <input
                    accept="audio/*,.aac,.flac,.m4a,.mp3,.mp4,.ogg,.wav,.webm"
                    disabled={isUploading}
                    type="file"
                    onChange={uploadAudio}
                  />
                </label>
              </div>

              {editorDraft.audioUrl ? (
                <div className={styles.adminAudioPreview}>
                  <span>当前音频预览</span>
                  <audio controls preload="none" src={editorDraft.audioUrl}>
                    您的浏览器暂不支持音频播放。
                  </audio>
                </div>
              ) : null}

              <div className={styles.adminActions}>
                <button
                  className={styles.adminPrimaryButton}
                  disabled={isSaving || isUploading}
                  type="submit"
                >
                  {isSaving ? "保存中..." : "保存本页"}
                </button>
                <button
                  className={styles.adminSecondaryButton}
                  disabled={isSaving || isUploading}
                  type="button"
                  onClick={closeEditor}
                >
                  取消
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className={styles.section}>
        <h2>高分思路</h2>
        <p>{content.approach}</p>
      </section>

      <section className={styles.section}>
        <h2>万能句型</h2>
        <ul className={styles.frames}>
          {content.frames.map((frame, index) => (
            <li key={`${frame}-${index}`}>{frame}</li>
          ))}
        </ul>
      </section>

      {content.vocabulary.length ? (
        <section className={styles.section}>
          <h2>重点词汇和短语</h2>
          <dl className={styles.vocabulary}>
            {content.vocabulary.map((item, index) => (
              <div key={`${item.phrase}-${index}`}>
                <dt>{item.phrase}</dt>
                <dd>
                  <strong>{item.translation}</strong>
                  <span>{item.note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className={`${styles.section} ${styles.answerSection}`}>
        <h2>{content.answerHeading}</h2>
        <div className={styles.answer}>
          {content.answer.map((paragraph, index) => (
            <p key={`${paragraph}-${index}`}>{paragraph}</p>
          ))}
        </div>

        {content.answerTranslation.length ? (
          <div className={styles.translationBlock}>
            <h3>中文翻译</h3>
            <div className={styles.translation}>
              {content.answerTranslation.map((paragraph, index) => (
                <p key={`${paragraph}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </div>
        ) : null}

        {content.audioUrl ? (
          <div className={styles.audioBlock}>
            <h3>范文音频</h3>
            <audio controls preload="none" src={content.audioUrl}>
              您的浏览器暂不支持音频播放。
            </audio>
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2>IELTS 评分对照</h2>
        <div className={styles.scoreNotes}>
          {scoreNotes.map((item) => (
            <div key={item.code}>
              <span>{item.code}</span>
              <strong>{item.label}</strong>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
