import "server-only";

import { unstable_cache } from "next/cache";
import { getPublishedSiteChromeConfig } from "@/lib/content/site-chrome";

export const getCachedPublishedSiteChromeConfig = unstable_cache(
  getPublishedSiteChromeConfig,
  ["published-site-chrome"],
  { revalidate: 60 },
);
