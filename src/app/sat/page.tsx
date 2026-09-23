import type { Metadata } from "next";
import { SatHome } from "@/components/sat/sat-home";

export const metadata: Metadata = {
  title: "SAT 题库｜英文解忧杂货铺",
  description: "SAT 题组练习。",
};

export default function SatPage() {
  return <SatHome />;
}
