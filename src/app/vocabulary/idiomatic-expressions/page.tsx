import { ProjectAccessPaywall } from "@/components/project-access-paywall";
import { hasLearningBookAccess } from "@/lib/vocabulary/learning-book-access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function IdiomaticExpressionsAccessPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  const localPreview = process.env.NODE_ENV === "development" && preview === "1";
  if (!localPreview && await hasLearningBookAccess("地道表达")) {
    redirect("/vocabulary/books?level=%E5%9C%B0%E9%81%93%E8%A1%A8%E8%BE%BE&setup=1");
  }
  return <ProjectAccessPaywall projectKey="vocabulary.idiomatic-expressions" />;
}
