import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { BbcArticle } from "@/lib/articles/bbc";

export type UploadedBbcArticleRecord = {
  article: BbcArticle;
  createdAt: string;
};

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;

  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function normalizeRecord(value: unknown, createdAt: unknown): UploadedBbcArticleRecord | null {
  if (!value || typeof value !== "object") return null;
  const article = value as BbcArticle;
  if (
    typeof article.id !== "string" ||
    !/^\d{6}$/.test(article.id) ||
    typeof article.year !== "number" ||
    typeof article.date !== "string" ||
    typeof article.title !== "string" ||
    !Array.isArray(article.body) ||
    !Array.isArray(article.chineseParagraphs) ||
    !Array.isArray(article.sentences) ||
    !Array.isArray(article.vocabulary) ||
    typeof article.fullAudioUrl !== "string"
  ) {
    return null;
  }

  return {
    article,
    createdAt: typeof createdAt === "string" ? createdAt : "",
  };
}

export async function getUploadedBbcArticles(): Promise<UploadedBbcArticleRecord[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("bbc_uploaded_articles")
    .select("article, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data
    .map((row) => normalizeRecord(row.article, row.created_at))
    .filter((record): record is UploadedBbcArticleRecord => record !== null);
}

export async function getUploadedBbcArticle(articleId: string): Promise<BbcArticle | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("bbc_uploaded_articles")
    .select("article, created_at")
    .eq("id", articleId)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeRecord(data.article, data.created_at)?.article ?? null;
}
