import { AdminContentManager } from "@/components/admin-content-manager";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <AdminContentManager initialView={view} />;
}
