import { ModulePlaceholder } from "@/components/module-placeholder";
import { getCachedPublishedPageContent } from "@/lib/content/page-content-server";

export const revalidate = 300;

export default async function TrainingPage() {
  const content = await getCachedPublishedPageContent("training");

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
          item,
          title: item.title,
        }))}
      primaryHref={content.primaryHref}
      primaryLabel={content.primaryLabel}
    />
  );
}
