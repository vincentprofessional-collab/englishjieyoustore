import { notFound } from "next/navigation";
import ArticleDetailPage from "@/components/bbc-article-detail-page";
import { BbcArticleComments } from "@/components/bbc-article-comments";
import { ProjectAccessPaywall } from "@/components/project-access-paywall";
import { BBC_ARTICLES, getBbcArticleById } from "@/lib/articles/bbc";
import { getUploadedBbcArticle, getUploadedBbcArticleForAdmin } from "@/lib/articles/bbc-uploaded-content";
import { getPaidContentKey } from "@/lib/access-control";
import { claimPaidContentAccess } from "@/lib/free-preview-access-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isFreeBbc2015ArticleUnlocked } from "@/lib/articles/bbc-free-access.mjs";
import syntax2026 from "@/data/bbc/2026-syntax.json";
import { normalizeBbcSyntaxSentenceEdits } from "@/lib/bbc-syntax-annotation-edits";
import type { BbcSyntaxSentenceData } from "@/components/bbc-syntax-sentence";
import { buildAutomaticBbcSyntax } from "@/lib/articles/bbc-automatic-syntax";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return BBC_ARTICLES.map((article) => ({ articleId: article.id }));
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ articleId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { articleId } = await params;
  const { preview } = await searchParams;
  const builtinArticle = getBbcArticleById(articleId);
  let adminDraftRecord: Awaited<ReturnType<typeof getUploadedBbcArticleForAdmin>> = null;
  if (!builtinArticle && preview === "draft") {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role === "admin") adminDraftRecord = await getUploadedBbcArticleForAdmin(articleId);
    }
  }
  const article = builtinArticle ?? adminDraftRecord?.article ?? await getUploadedBbcArticle(articleId);
  const adminPreview = Boolean(adminDraftRecord);
  const draftPreview = Boolean(adminDraftRecord && !adminDraftRecord.published);

  if (!article) {
    notFound();
  }

  const canonicalSyntaxSentences = (article.year === 2026 ? (syntax2026 as Record<string, BbcSyntaxSentenceData[]>)[article.id] : undefined)
    ?? article.syntaxSentences
    ?? (!builtinArticle ? article.sentences?.map((sentence) => buildAutomaticBbcSyntax(sentence.english)) : undefined);

  if (process.env.NODE_ENV === "development" && preview === "mobile") {
    return <ArticleDetailPage key={article.id} article={article} isUploadedArticle={!builtinArticle} syntaxSentences={canonicalSyntaxSentences} />;
  }

  const hasPublicRelease = article.year === 2015 && isFreeBbc2015ArticleUnlocked(article.id);
  const hasAccess = hasPublicRelease || await claimPaidContentAccess(
    "bbc",
    getPaidContentKey("bbc-article", article.id),
    1,
  );

  if (!hasAccess && !adminPreview) {
    return (
      <>
        <ProjectAccessPaywall projectKey="bbc" />
        <BbcArticleComments articleId={article.id} />
      </>
    );
  }

  let syntaxSentences = canonicalSyntaxSentences;
  if (canonicalSyntaxSentences) {
    const supabase = await createServerSupabaseClient();
    const { data: syntaxOverride } = await supabase
      .from("bbc_article_syntax_overrides")
      .select("sentences,updated_at")
      .eq("article_id", article.id)
      .maybeSingle();
    if (syntaxOverride && (builtinArticle || !article.contentUpdatedAt || !syntaxOverride.updated_at
      || Date.parse(syntaxOverride.updated_at) >= Date.parse(article.contentUpdatedAt))) {
      syntaxSentences = normalizeBbcSyntaxSentenceEdits(syntaxOverride.sentences, canonicalSyntaxSentences) ?? canonicalSyntaxSentences;
    }
  }

  return <ArticleDetailPage key={article.id} adminPreview={adminPreview} article={article} draftPreview={draftPreview} isUploadedArticle={!builtinArticle} syntaxSentences={syntaxSentences} />;
}
