import { getBbcArticleById } from "@/lib/articles/bbc";
import { getUploadedBbcArticle } from "@/lib/articles/bbc-uploaded-content";
import { claimPaidContentAccess } from "@/lib/free-preview-access-server";
import { getPaidContentKey } from "@/lib/access-control";
import { isFreeBbc2015ArticleUnlocked } from "@/lib/articles/bbc-free-access.mjs";

function time(milliseconds: number) {
  return new Date(milliseconds).toISOString().slice(11, 23).replace(".", ",");
}

export async function GET(_request: Request, { params }: { params: Promise<{ articleId: string }> }) {
  const { articleId } = await params;
  const article = getBbcArticleById(articleId) ?? await getUploadedBbcArticle(articleId);
  if (!article?.sentences?.length || article.sentences.some((sentence) => sentence.endMs <= sentence.startMs)) return new Response("字幕尚未生成。", { status: 404 });
  if (!(article.year === 2015 && isFreeBbc2015ArticleUnlocked(article.id)) && !await claimPaidContentAccess("bbc", getPaidContentKey("bbc-article", article.id), 1)) return new Response("请先开通本篇文章的访问权限。", { status: 403 });
  const text = article.sentences.map((sentence) => `${sentence.sentenceNo}\n${time(sentence.startMs)} --> ${time(sentence.endMs)}\n${sentence.english}\n${sentence.chinese}`).join("\n\n") + "\n";
  return new Response(text, { headers: { "Content-Type": "application/x-subrip; charset=utf-8", "Cache-Control": "private, no-store" } });
}
