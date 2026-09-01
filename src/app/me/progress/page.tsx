import type { Metadata } from "next";
import { LearningProgress } from "@/components/learning-progress";

export const metadata: Metadata = { title: "学习进度 | 英文解忧杂货铺" };

export default function LearningProgressPage() {
  return <LearningProgress />;
}
