import { getBbcArticleById } from "@/lib/articles/bbc";
import { getUploadedBbcArticle, getUploadedBbcArticleForAdmin } from "@/lib/articles/bbc-uploaded-content";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { claimPaidContentAccess } from "@/lib/free-preview-access-server";
import { getPaidContentKey } from "@/lib/access-control";
import { isFreeBbc2015ArticleUnlocked } from "@/lib/articles/bbc-free-access.mjs";

function time(milliseconds: number) {
  return new Date(milliseconds).toISOString().slice(11, 23).replace(".", ",");
}

export async function GET(_request: Request, { params }: { params: Promise<{ articleId: string }> }) {
  const { articleId } = await params;
  const builtinArticle = getBbcArticleById(articleId);
  let article = builtinArticle ?? await getUploadedBbcArticle(articleId);
  let adminDraftPreview = false;
  if (!builtinArticle && !article) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (profile?.role === "admin") {
          const record = await getUploadedBbcArticleForAdmin(articleId);
          article = record?.article ?? null;
          adminDraftPreview = Boolean(record && !record.published);
        }
      }
    } catch {
      article = null;
    }
  }
  if (!article?.sentences?.length || article.sentences.some((sentence) => sentence.endMs <= sentence.startMs)) return new Response("字幕尚未生成。", { status: 404 });
  if (!adminDraftPreview && !(article.year === 2015 && isFreeBbc2015ArticleUnlocked(article.id)) && !await claimPaidContentAccess("bbc", getPaidContentKey("bbc-article", article.id), 1)) return new Response("请先开通本篇文章的访问权限。", { status: 403 });
  const text = article.sentences.map((sentence) => `${sentence.sentenceNo}\n${time(sentence.startMs)} --> ${time(sentence.endMs)}\n${sentence.english}\n${sentence.chinese}`).join("\n\n") + "\n";
  return new Response(text, { headers: { "Content-Type": "application/x-subrip; charset=utf-8", "Cache-Control": "private, no-store" } });
}
