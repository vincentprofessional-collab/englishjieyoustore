import { SeniorHighLibrary } from "@/components/senior-high/senior-high-library";

export default async function SeniorHighPage({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string }>;
}) {
  const { entry } = await searchParams;
  return <SeniorHighLibrary initialEntry={entry} />;
}
