import type { Metadata } from "next";
import { LearningProgressSharing } from "@/components/learning-progress-sharing";

export const metadata: Metadata = { title: "查看他人学习进度 | 英文解忧杂货铺" };

export default function LearningProgressSharingPage() {
  return <LearningProgressSharing />;
}
