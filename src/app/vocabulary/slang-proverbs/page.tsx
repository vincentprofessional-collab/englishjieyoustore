import { ProjectAccessPaywall } from "@/components/project-access-paywall";
import { hasLearningBookAccess } from "@/lib/vocabulary/learning-book-access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SlangProverbsAccessPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  const localPreview = process.env.NODE_ENV === "development" && preview === "1";
  if (!localPreview && await hasLearningBookAccess("俚语俗语")) {
    redirect("/vocabulary/books?level=%E4%BF%9A%E8%AF%AD%E4%BF%97%E8%AF%AD&setup=1");
  }
  return <ProjectAccessPaywall projectKey="vocabulary.slang-proverbs" />;
}
