import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { ExamPrepRunner } from "@/components/exam-prep/exam-prep-runner";

type ExamId = "postgraduate" | "gre" | "gmat";
const exams: ExamId[] = ["postgraduate", "gre", "gmat"];

function getIndex(exam: ExamId) {
  const file = path.join(process.cwd(), "public", "exam-prep", exam, "index.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as { entries: { id: string; dataPath: string }[] };
}

function getEntry(exam: ExamId, setId: string) {
  return getIndex(exam).entries.find((entry) => entry.id === setId);
}

export const dynamicParams = true;

export function generateStaticParams() {
  return exams.flatMap((exam) => getIndex(exam).entries.map((entry) => ({ exam, setId: entry.id })));
}

export async function generateMetadata({ params }: { params: Promise<{ exam: ExamId; setId: string }> }) {
  const { exam, setId } = await params;
  if (!exams.includes(exam)) return { title: "题目 | 英文解忧杂货铺" };
  const entry = getEntry(exam, setId);
  if (!entry) return { title: "题目 | 英文解忧杂货铺" };
  const setPath = path.join(process.cwd(), "public", "exam-prep", exam, entry.dataPath);
  const set = JSON.parse(fs.readFileSync(setPath, "utf8")) as { title: string };
  return { title: `${set.title} | 英文解忧杂货铺` };
}

export default async function ExamPracticePage({ params }: { params: Promise<{ exam: ExamId; setId: string }> }) {
  const { exam, setId } = await params;
  if (!exams.includes(exam)) notFound();
  const entry = getEntry(exam, setId);
  if (entry && !fs.existsSync(path.join(process.cwd(), "public", "exam-prep", exam, entry.dataPath))) notFound();
  return <ExamPrepRunner dataPath={entry?.dataPath || ""} exam={exam} setId={setId} />;
}
