import type { ReactNode } from "react";
import { headers } from "next/headers";
import { ProjectAccessPaywall } from "@/components/project-access-paywall";
import type { ProjectAccessKey } from "@/lib/access-control";
import { claimPaidContentAccess } from "@/lib/free-preview-access-server";

type ProjectAccessGateProps = {
  children: ReactNode;
  contentKey: string;
  description?: string;
  freePreviewLimit?: number;
  allowLocalPreview?: boolean;
  projectKey: ProjectAccessKey;
  title?: string;
};

export async function ProjectAccessGate({
  children,
  contentKey,
  description,
  freePreviewLimit,
  allowLocalPreview = false,
  projectKey,
  title,
}: ProjectAccessGateProps) {
  if (allowLocalPreview && process.env.NODE_ENV === "development") {
    const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return <>{children}</>;
    }
  }

  const canAccess = await claimPaidContentAccess(projectKey, contentKey, freePreviewLimit);

  if (canAccess) {
    return <>{children}</>;
  }

  return (
    <ProjectAccessPaywall
      description={description}
      projectKey={projectKey}
      title={title}
    />
  );
}
