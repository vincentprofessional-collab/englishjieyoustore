import type { Metadata } from "next";
import { Suspense } from "react";
import { GlobalStudyInteractions } from "@/components/global-study-interactions";
import { GlobalVocabularySearch } from "@/components/global-vocabulary-search";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
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
          <SiteNav />
          <Suspense fallback={null}>
            <GlobalVocabularySearch />
          </Suspense>
          <GlobalStudyInteractions />
          {children}
          <SiteFooter />
        </main>
      </body>
    </html>
  );
}
