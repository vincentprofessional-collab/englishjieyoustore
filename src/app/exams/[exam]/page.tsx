import { notFound } from "next/navigation";
import { Cet4Library } from "@/components/cet4/cet4-library";
import { getCetExamEntries, getCetExamSetIndex, type CetExam } from "@/lib/cet4/library";

export default async function CollegeExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ exam: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { exam } = await params;
  const { section } = await searchParams;
  if (exam !== "cet4" && exam !== "cet6") notFound();
  const typedExam = exam as CetExam;
  const entry = section === "types" ? "practice" : section === "papers" ? "papers" : "knowledge";
  const knowledge = getCetExamEntries(typedExam)
    .filter((item) => item.section === "知识点")
    .map(({ id, title, topic, excerpt }) => ({ id, title, topic, excerpt }));
  return <Cet4Library exam={typedExam} initialEntry={entry} knowledge={knowledge} sets={getCetExamSetIndex(typedExam).entries} />;
}
