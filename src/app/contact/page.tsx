import { GuideBoard } from "@/components/guide-board";
import { ProjectOpenRequestBanner } from "@/components/project-open-request-banner";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <>
      <ProjectOpenRequestBanner />
      <GuideBoard />
    </>
  );
}
