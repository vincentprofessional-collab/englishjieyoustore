import type { Metadata } from "next";
import { Suspense } from "react";
import { GlobalStudyInteractions } from "@/components/global-study-interactions";
import { GlobalVocabularySearch } from "@/components/global-vocabulary-search";
import { SiteAnalyticsTracker } from "@/components/site-analytics-tracker";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getCachedPublishedSiteChromeConfig } from "@/lib/content/site-chrome-server";
import { getLegacySessionMigrationScript } from "@/lib/supabase/legacy-session-migration";
import "./globals.css";

export const metadata: Metadata = {
  title: "英文解忧杂货铺",
  description: "雅思听说读写与英语专项训练平台",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteChromeConfig = await getCachedPublishedSiteChromeConfig();
  const legacySessionMigrationScript = getLegacySessionMigrationScript(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  return (
    <html lang="zh-CN">
      <head>
        {legacySessionMigrationScript ? (
          <script dangerouslySetInnerHTML={{ __html: legacySessionMigrationScript }} />
        ) : null}
      </head>
      <body>
        <main className="shell">
          <SiteNav config={siteChromeConfig} />
          <Suspense fallback={null}>
            <GlobalVocabularySearch />
          </Suspense>
          <SiteAnalyticsTracker />
          <GlobalStudyInteractions />
          {children}
          <SiteFooter config={siteChromeConfig} />
        </main>
      </body>
    </html>
  );
}
