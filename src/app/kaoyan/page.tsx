import type { Metadata } from "next";
import { Suspense } from "react";
import { Cet4Library } from "@/components/cet4/cet4-library";
import { getKaoyanSetIndex } from "@/lib/kaoyan/library";

export const metadata: Metadata = {
  title: "考研英语｜英文解忧杂货铺",
  description: "考研英语 2020–2026 历年真题与 1980–2019 题型训练。",
};

export default function KaoyanPage() {
  return (
    <Suspense fallback={null}>
      <Cet4Library exam="kaoyan" knowledge={[]} sets={getKaoyanSetIndex().entries} initialEntry="papers" />
    </Suspense>
  );
}
