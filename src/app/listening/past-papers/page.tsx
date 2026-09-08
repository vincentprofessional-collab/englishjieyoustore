import { ListeningPastPapersHome } from "@/components/listening-past-papers-home";
import { PAST_PAPERS, PAST_PAPERS_SOURCE } from "@/lib/ielts/past-papers";

export default function ListeningPastPapersPage() {
  return <ListeningPastPapersHome papers={PAST_PAPERS} source={PAST_PAPERS_SOURCE} />;
}
