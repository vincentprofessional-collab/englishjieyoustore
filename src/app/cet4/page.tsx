import type { Metadata } from "next";
import { Suspense } from "react";
import { Cet4Library } from "@/components/cet4/cet4-library";
import { getCet4SetIndex } from "@/lib/cet4/library";

export const metadata: Metadata = {
  title: "大学英语四级｜英文解忧杂货铺",
  description: "大学英语四级历年真题作答、答案与解析。",
};

export default function Cet4Page() {
  return (
    <Suspense fallback={null}>
      <Cet4Library knowledge={[]} sets={getCet4SetIndex().entries} initialEntry="papers" />
    </Suspense>
  );
}
