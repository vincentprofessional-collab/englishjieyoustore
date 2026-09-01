import { notFound } from "next/navigation";
import { SeniorHighRunner } from "@/components/senior-high/senior-high-runner";
import { getSeniorHighV2Entry, getSeniorHighV2Index } from "@/lib/senior-high/v2-library";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSeniorHighV2Index().entries.filter((entry) => entry.kind === "practice").map((entry) => ({ setId: entry.id }));
}

export default async function SeniorHighPracticePage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  if (!getSeniorHighV2Entry("practice", setId)) notFound();
  return <SeniorHighRunner kind="practice" setId={setId} />;
}
