import type { Metadata } from "next";
import { Cet4Library } from "@/components/cet4/cet4-library";
import { getCetExamEntries, getCetExamSetIndex } from "@/lib/cet4/library";

export const metadata: Metadata = {
  title: "大学英语六级｜英文解忧杂货铺",
  description: "大学英语六级知识点、专项题型与历年试卷。",
};

export default function Cet6Page() {
  const knowledge = getCetExamEntries("cet6")
    .filter((entry) => entry.section === "知识点")
    .map(({ id, title, topic, excerpt }) => ({ id, title, topic, excerpt }));
  return <Cet4Library exam="cet6" knowledge={knowledge} sets={getCetExamSetIndex("cet6").entries} />;
}
