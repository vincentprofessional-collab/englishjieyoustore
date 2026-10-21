import type { Metadata } from "next";
import { Suspense } from "react";
import { Cet4Library } from "@/components/cet4/cet4-library";
import { getCetExamSetIndex } from "@/lib/cet4/library";

export const metadata: Metadata = {
  title: "大学英语六级｜英文解忧杂货铺",
  description: "大学英语六级题型训练与历年真题，在线作答并查看答案和解析。",
};

export default function Cet6Page() {
  return (
    <Suspense fallback={null}>
      <Cet4Library exam="cet6" initialEntry="papers" knowledge={[]} sets={getCetExamSetIndex("cet6").entries} />
    </Suspense>
  );
}
