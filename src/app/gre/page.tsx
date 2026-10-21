import { Suspense } from "react";
import { ExamPrepLibrary } from "@/components/exam-prep/exam-prep-library";

export const metadata = { title: "GRE 题库 | 英文解忧杂货铺" };

export default function GreExamPage() {
  return <Suspense fallback={null}><ExamPrepLibrary exam="gre" /></Suspense>;
}
