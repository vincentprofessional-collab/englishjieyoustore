import type { Metadata } from "next";
import { Cet4Library } from "@/components/cet4/cet4-library";
import { getCet4Entries } from "@/lib/cet4/library";

export const metadata: Metadata = {
  title: "大学英语四级｜英文解忧杂货铺",
  description: "大学英语四级知识点、专项题型与历年试卷。",
};

export default function Cet4Page() {
  const entries = getCet4Entries().map(({ id, title, section, topic, excerpt }) => ({ id, title, section, topic, excerpt }));
  return <Cet4Library entries={entries} />;
}
