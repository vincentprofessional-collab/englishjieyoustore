import { ModulePlaceholder } from "@/components/module-placeholder";
import { getPublishedPageContent } from "@/lib/content/page-content";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const content = await getPublishedPageContent("news");

  return (
    <ModulePlaceholder
      badge={content.eyebrow}
      title={content.title}
      description={content.summary}
      items={content.items
        .filter((item) => item.enabled)
        .map((item) => ({
          description: item.description,
          href: item.href,
          title: item.title,
        }))}
      primaryHref={content.primaryHref}
      primaryLabel={content.primaryLabel}
    />
  );
}
