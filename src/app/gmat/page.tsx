import { Suspense } from "react";
import { ExamPrepLibrary } from "@/components/exam-prep/exam-prep-library";

export const metadata = { title: "GMAT 题库 | 英文解忧杂货铺" };

export default function GmatExamPage() {
  return <Suspense fallback={null}><ExamPrepLibrary exam="gmat" /></Suspense>;
}
