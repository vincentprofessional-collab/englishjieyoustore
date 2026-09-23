import type { Metadata } from "next";
import { Suspense } from "react";
import { Cet4Library } from "@/components/cet4/cet4-library";
import { getCet4Entries, getCet4SetIndex } from "@/lib/cet4/library";

export const metadata: Metadata = {
  title: "大学英语四级｜英文解忧杂货铺",
  description: "大学英语四级知识点、专项题型与历年试卷。",
};

export default function Cet4Page() {
  const knowledge = getCet4Entries().filter((entry) => entry.section === "知识点").map(({ id, title, topic, excerpt }) => ({ id, title, topic, excerpt }));
  return (
    <Suspense fallback={null}>
      <Cet4Library knowledge={knowledge} sets={getCet4SetIndex().entries} />
    </Suspense>
  );
}
