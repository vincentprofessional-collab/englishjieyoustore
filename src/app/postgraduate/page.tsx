import { Suspense } from "react";
import { ExamPrepLibrary } from "@/components/exam-prep/exam-prep-library";

export const metadata = { title: "考研英语题库 | 英文解忧杂货铺" };

export default function PostgraduateExamPage() {
  return <Suspense fallback={null}><ExamPrepLibrary exam="postgraduate" /></Suspense>;
}
