import type { Metadata } from "next";
import { SatKnowledgeHome } from "@/components/sat/sat-knowledge";

export const metadata: Metadata = {
  title: "SAT 知识点｜英文解忧杂货铺",
  description: "按考点分类的 SAT 语法练习。",
};

export default function SatKnowledgePage() {
  return <SatKnowledgeHome />;
}
