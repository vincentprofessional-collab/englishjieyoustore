"use client";

import { useState } from "react";
import {
  BBC_ARTICLES,
  getBbcArticleById,
  mergeBbcVocabularyItems,
  type BbcArticle,
  type BbcVocabularyItem,
} from "@/lib/articles/bbc";
import { getBbcArticleContentOverride } from "@/lib/articles/bbc-content-overrides";
import { supabase } from "@/lib/supabase/client";

type EditableBbcVocabularyItem = BbcVocabularyItem & {
  definition?: string;
  partOfSpeech?: string;
  phonetic?: string;
  highlight: boolean;
};

function copyVocabulary(items: BbcVocabularyItem[] | undefined): EditableBbcVocabularyItem[] {
  return (items ?? []).map((item, index) => ({
    ...item,
    entry: item.entry ?? "",
    example: item.example ?? "",
    highlight: item.highlight !== false,
    number: item.number || index + 1,
    term: item.term ?? "",
    translation: item.translation ?? "",
  }));
}

function copyChineseParagraphs(article: BbcArticle, paragraphs?: string[]) {
  return article.body.map((_, index) => paragraphs?.[index] ?? "");
}

function createVocabularyItem(number: number): EditableBbcVocabularyItem {
  return {
    definition: "",
    entry: "",
    example: "",
    highlight: true,
    highlightTerm: "",
    lemma: "",
    number,
    partOfSpeech: "",
    phonetic: "",
    sourceLevel: "后台添加",
    term: "新词汇或短语",
    translation: "",
    ukPhonetic: "",
    usPhonetic: "",
  };
}

function bbcArticleSlug(articleId: string) {
  return `bbc-article-${articleId}`;
}

function updateItem(
  items: EditableBbcVocabularyItem[],
  index: number,
  patch: Partial<EditableBbcVocabularyItem>,
) {
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...patch } : item,
  );
}

export function AdminBbcArticleEditor({ adminUserId }: { adminUserId: string }) {
  const [articleId, setArticleId] = useState("150720");
  const [article, setArticle] = useState<BbcArticle | null>(null);
  const [draftTitleChinese, setDraftTitleChinese] = useState("");
  const [draftChineseParagraphs, setDraftChineseParagraphs] = useState<string[]>([]);
  const [draft, setDraft] = useState<EditableBbcVocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadArticle() {
    const normalizedId = articleId.trim();
    const nextArticle = getBbcArticleById(normalizedId);
    if (!nextArticle) {
      setArticle(null);
      setDraft([]);
      setMessage("没有找到这篇 BBC 文章，请检查文章编号。 ");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setArticle(nextArticle);
    setDraftTitleChinese(nextArticle.titleChinese ?? "");
    setDraftChineseParagraphs(copyChineseParagraphs(nextArticle, nextArticle.chineseParagraphs));
    setDraft(copyVocabulary(nextArticle.vocabulary));

    const [automaticResponse, overrideResult] = await Promise.all([
      fetch(`/api/bbc-vocabulary?articleId=${encodeURIComponent(nextArticle.id)}`),
      supabase
        .from("managed_content_pages")
        .select("meta_json")
        .eq("slug", bbcArticleSlug(nextArticle.id))
        .maybeSingle(),
    ]);

    let automaticVocabulary: BbcVocabularyItem[] = [];
    if (automaticResponse.ok) {
      const payload = (await automaticResponse.json()) as { vocabulary?: BbcVocabularyItem[] };
      automaticVocabulary = payload.vocabulary ?? [];
    }

    const { data, error } = overrideResult;

    if (error) {
      setDraft(copyVocabulary(mergeBbcVocabularyItems(nextArticle.vocabulary, automaticVocabulary)));
      setMessage(`读取前台覆盖内容失败，将使用自动分级词汇：${error.message}`);
    } else {
      const override = getBbcArticleContentOverride(data?.meta_json);
      if (override) {
        if (override.titleChinese !== undefined) {
          setDraftTitleChinese(override.titleChinese);
        }
        if (override.chineseParagraphs !== undefined) {
          setDraftChineseParagraphs(copyChineseParagraphs(nextArticle, override.chineseParagraphs));
        }
        if (override.vocabulary !== undefined) {
          setDraft(copyVocabulary(override.vocabulary));
        } else {
          setDraft(copyVocabulary(mergeBbcVocabularyItems(nextArticle.vocabulary, automaticVocabulary)));
        }
      } else {
        setDraft(copyVocabulary(mergeBbcVocabularyItems(nextArticle.vocabulary, automaticVocabulary)));
      }
      setMessage(override ? "已载入后台保存的文章翻译和词汇设置。" : "已载入原始翻译和自动分级词汇，可直接编辑。 ");
    }

    setIsLoading(false);
  }

  function patchItem(index: number, patch: Partial<EditableBbcVocabularyItem>) {
    setDraft((current) => updateItem(current, index, patch));
    setMessage("");
  }

  function addItem() {
    setDraft((current) => [...current, createVocabularyItem(current.length + 1)]);
    setMessage("");
  }

  function removeItem(index: number) {
    setDraft((current) =>
      current
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({ ...item, number: itemIndex + 1 })),
    );
    setMessage("");
  }

  async function publishContent() {
    if (!article) {
      setMessage("请先载入一篇 BBC 文章。 ");
      return;
    }

    setIsSaving(true);
    setMessage("");
    const now = new Date().toISOString();
    const { error } = await supabase.from("managed_content_pages").upsert(
      {
        access_feature_key: "articles.foreign_article",
        created_by: adminUserId,
        is_paid_only: false,
        meta_json: {
          chineseParagraphs: draftChineseParagraphs.slice(0, article.body.length).map((paragraph) => paragraph.trim()),
          contentVersion: 2,
          source: "bbc-content-editor",
          titleChinese: draftTitleChinese.trim(),
          vocabulary: draft,
        },
        module: "articles",
        published_at: now,
        slug: bbcArticleSlug(article.id),
        status: "published",
        summary: draftTitleChinese.trim() || article.lead,
        template_key: "foreign_article_page",
        title: article.title,
        updated_at: now,
      },
      { onConflict: "slug" },
    );

    if (error) {
      setMessage(`发布失败：${error.message}`);
    } else {
      setMessage("已保存：前台会显示最新的文章翻译和词汇设置。 ");
    }
    setIsSaving(false);
  }

  const suggestions = articleId.trim()
    ? BBC_ARTICLES.filter((item) =>
        `${item.id} ${item.title}`.toLowerCase().includes(articleId.trim().toLowerCase()),
      ).slice(0, 6)
    : [];

  return (
    <div className="admin-editor-column admin-bbc-vocabulary-editor">
      <section className="admin-publish-card">
        <strong>BBC 文章内容与词汇管理</strong>
        <small>
          可以修改文章中文标题和逐段翻译，也可以增加、删除词汇，修改右侧词汇卡片的例句、释义和翻译。保存后前台刷新生效；原始 BBC 数据不会被覆盖。
        </small>
        <div className="bbc-admin-article-picker">
          <label>
            <span>文章编号或标题</span>
            <input
              value={articleId}
              onChange={(event) => setArticleId(event.target.value)}
              placeholder="例如 150720"
            />
          </label>
          <button className="button primary" disabled={isLoading} type="button" onClick={loadArticle}>
            {isLoading ? "读取中…" : "载入文章"}
          </button>
        </div>
        {suggestions.length ? (
          <div className="bbc-admin-suggestions">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setArticleId(item.id);
                  setMessage(`已选择 ${item.id}，点击“载入文章”读取。`);
                }}
              >
                <strong>{item.id}</strong>
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="bbc-admin-publish-actions">
          <button className="button primary" disabled={!article || isSaving} type="button" onClick={publishContent}>
            {isSaving ? "保存中…" : "保存 BBC 文章内容"}
          </button>
          {message ? <p className={`admin-form-message ${message.includes("失败") || message.includes("没有") ? "error" : ""}`}>{message}</p> : null}
        </div>
      </section>

      {article ? (
        <section className="admin-editor-card">
          <header className="admin-editor-heading">
            <div>
              <span>BBC · {article.id}</span>
              <h2>{article.title}</h2>
            </div>
            <span className="admin-status">{draft.filter((item) => item.highlight).length} 项高亮</span>
          </header>

          <section className="bbc-admin-translation-editor">
            <div className="admin-editor-section-heading">
              <strong>文章翻译</strong>
              <small>标题和段落翻译会显示在前台中英对照原文区域。</small>
            </div>
            <div className="admin-field-grid compact">
              <label className="admin-field-wide">
                <span>中文标题</span>
                <input
                  value={draftTitleChinese}
                  onChange={(event) => {
                    setDraftTitleChinese(event.target.value);
                    setMessage("");
                  }}
                  placeholder="输入文章中文标题"
                />
              </label>
              {article.body.map((paragraph, index) => (
                <label className="admin-field-wide" key={`${article.id}-paragraph-translation-${index}`}>
                  <span>第 {index + 1} 段中文翻译</span>
                  <small className="bbc-admin-source-paragraph">{paragraph}</small>
                  <textarea
                    rows={5}
                    value={draftChineseParagraphs[index] ?? ""}
                    onChange={(event) => {
                      setDraftChineseParagraphs((current) => {
                        const next = [...current];
                        next[index] = event.target.value;
                        return next;
                      });
                      setMessage("");
                    }}
                    placeholder="输入这一段中文翻译"
                  />
                </label>
              ))}
            </div>
          </section>

          <div className="bbc-admin-vocabulary-list">
            {draft.map((item, index) => (
              <article className={`bbc-admin-vocabulary-item ${item.highlight ? "active" : ""}`} key={`${item.number}-${index}`}>
                <div className="bbc-admin-vocabulary-item-heading">
                  <label className="admin-checkbox-field">
                    <input
                      checked={item.highlight}
                      type="checkbox"
                      onChange={(event) => patchItem(index, { highlight: event.target.checked })}
                    />
                    <span>原文高亮并下划线</span>
                  </label>
                  <button className="admin-list-actions-button danger" type="button" onClick={() => removeItem(index)}>
                    删除
                  </button>
                </div>
                <div className="admin-field-grid compact">
                  <label>
                    <span>词汇或短语</span>
                    <input
                      value={item.term}
                      onChange={(event) =>
                        patchItem(index, {
                          highlightTerm: event.target.value,
                          lemma: event.target.value,
                          term: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>原形</span>
                    <input
                      value={item.lemma ?? item.term}
                      onChange={(event) => patchItem(index, { lemma: event.target.value, term: event.target.value })}
                      placeholder="词汇原形"
                    />
                  </label>
                  <label>
                    <span>英式音标</span>
                    <input value={item.ukPhonetic ?? item.phonetic ?? ""} onChange={(event) => patchItem(index, { ukPhonetic: event.target.value })} placeholder="/ˈ.../" />
                  </label>
                  <label>
                    <span>美式音标</span>
                    <input value={item.usPhonetic ?? item.phonetic ?? ""} onChange={(event) => patchItem(index, { usPhonetic: event.target.value })} placeholder="/ˈ.../" />
                  </label>
                  <label>
                    <span>词性</span>
                    <input value={item.partOfSpeech ?? ""} onChange={(event) => patchItem(index, { partOfSpeech: event.target.value })} placeholder="n. / v. / phrase" />
                  </label>
                  <label>
                    <span>释义</span>
                    <input value={item.definition ?? ""} onChange={(event) => patchItem(index, { definition: event.target.value })} />
                  </label>
                  <label>
                    <span>词汇等级</span>
                    <input value={item.sourceLevel ?? ""} onChange={(event) => patchItem(index, { sourceLevel: event.target.value })} placeholder="高中 / 四级 / 六级 / 考研…" />
                  </label>
                  <label className="admin-field-wide">
                    <span>例句</span>
                    <textarea rows={2} value={item.example} onChange={(event) => patchItem(index, { example: event.target.value })} />
                  </label>
                  <label className="admin-field-wide">
                    <span>翻译</span>
                    <textarea rows={2} value={item.translation} onChange={(event) => patchItem(index, { translation: event.target.value })} />
                  </label>
                </div>
              </article>
            ))}
          </div>
          <div className="bbc-admin-editor-footer">
            <button className="button secondary" type="button" onClick={addItem}>
              增加词汇或短语
            </button>
          </div>
        </section>
      ) : (
        <section className="admin-editor-card">
          <p className="lead">先输入文章编号并载入文章，再编辑需要高亮的词汇和短语。</p>
        </section>
      )}
    </div>
  );
}
