import type { Metadata } from "next";
import { Suspense } from "react";
import { GlobalStudyInteractions } from "@/components/global-study-interactions";
import { GlobalVocabularySearch } from "@/components/global-vocabulary-search";
import { SiteAnalyticsTracker } from "@/components/site-analytics-tracker";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { DEFAULT_SITE_CHROME_CONFIG } from "@/lib/content/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "英文解忧杂货铺",
  description: "雅思听说读写与英语专项训练平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="shell">
          <SiteNav config={DEFAULT_SITE_CHROME_CONFIG} />
          <Suspense fallback={null}>
            <GlobalVocabularySearch />
          </Suspense>
          <SiteAnalyticsTracker />
          <GlobalStudyInteractions />
          {children}
          <SiteFooter config={DEFAULT_SITE_CHROME_CONFIG} />
        </main>
      </body>
    </html>
  );
}
