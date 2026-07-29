import { GuideBoard } from "@/components/guide-board";
import { getManagedPageDefinition } from "@/lib/content/page-content";

export default function ContactPage() {
  const content = getManagedPageDefinition("contact").content;

  return (
    <GuideBoard
      eyebrow={content.eyebrow}
      summary={content.summary}
      title={content.title}
    />
  );
}
