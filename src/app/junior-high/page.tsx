import { JuniorHighDemo } from "@/components/junior-high/junior-high-demo";

export default async function JuniorHighPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return <JuniorHighDemo initialMode={mode} />;
}
