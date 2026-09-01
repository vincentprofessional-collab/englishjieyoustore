import type { ReactNode } from "react";
import { ProjectAccessPaywall } from "@/components/project-access-paywall";
import type { ProjectAccessKey } from "@/lib/access-control";
import { claimPaidContentAccess } from "@/lib/free-preview-access-server";

type ProjectAccessGateProps = {
  children: ReactNode;
  contentKey: string;
  description?: string;
  projectKey: ProjectAccessKey;
  title?: string;
};

export async function ProjectAccessGate({
  children,
  contentKey,
  description,
  projectKey,
  title,
}: ProjectAccessGateProps) {
  const canAccess = await claimPaidContentAccess(projectKey, contentKey);

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
