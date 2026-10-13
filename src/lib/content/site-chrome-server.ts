import "server-only";

import { unstable_cache } from "next/cache";
import { getPublishedSiteChromeConfig, mergeSiteChromeConfig } from "@/lib/content/site-chrome";

const getCachedSiteChromeConfig = unstable_cache(
  getPublishedSiteChromeConfig,
  ["published-site-chrome"],
  { revalidate: 3600, tags: ["published-site-chrome"] },
);

export async function getCachedPublishedSiteChromeConfig() {
  return mergeSiteChromeConfig(await getCachedSiteChromeConfig());
}
