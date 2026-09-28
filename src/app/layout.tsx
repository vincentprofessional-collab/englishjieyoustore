import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { GlobalStudyInteractions } from "@/components/global-study-interactions";
import { GlobalVocabularySearch } from "@/components/global-vocabulary-search";
import { IeltsSectionShell } from "@/components/ielts-section-shell";
import { SiteAnalyticsTracker } from "@/components/site-analytics-tracker";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getCachedPublishedSiteChromeConfig } from "@/lib/content/site-chrome-server";
import { getLegacySessionMigrationScript } from "@/lib/supabase/legacy-session-migration";
import "./globals.css";
import "./ielts-section-shell.css";

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
  const renderedSiteChromeConfig = process.env.VOCABULARY_VIDEO_PREVIEW === "true"
    ? { ...siteChromeConfig, brand: { ...siteChromeConfig.brand, imageUrl: "" } }
    : siteChromeConfig;
  const legacySessionMigrationScript = getLegacySessionMigrationScript(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  return (
    <html lang="zh-CN">
      <head>
        {legacySessionMigrationScript ? (
          <Script id="legacy-session-migration" strategy="beforeInteractive">
            {legacySessionMigrationScript}
          </Script>
        ) : null}
      </head>
      <body>
        <main className="shell">
          <SiteNav config={renderedSiteChromeConfig} />
          <Suspense fallback={null}>
            <GlobalVocabularySearch />
          </Suspense>
          <Suspense fallback={null}>
            <SiteAnalyticsTracker />
          </Suspense>
          <GlobalStudyInteractions />
          <IeltsSectionShell siteChromeConfig={siteChromeConfig}>{children}</IeltsSectionShell>
          <SiteFooter config={siteChromeConfig} />
        </main>
      </body>
    </html>
  );
}
