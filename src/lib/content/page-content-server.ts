import "server-only";

import { unstable_cache } from "next/cache";
import { getPublishedPageContent, type ManagedPageSlug } from "@/lib/content/page-content";

const getCachedManagedPageContent = unstable_cache(
  getPublishedPageContent,
  ["published-managed-page-content"],
  { revalidate: 300, tags: ["published-managed-page-content"] },
);

export function getCachedPublishedPageContent(slug: ManagedPageSlug) {
  return getCachedManagedPageContent(slug);
}
