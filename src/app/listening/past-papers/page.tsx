import { ListeningPastPapersHome } from "@/components/listening-past-papers-home";
import { PAST_PAPER_LIST, PAST_PAPERS_SOURCE } from "@/lib/ielts/past-papers";

export default function ListeningPastPapersPage() {
  return <ListeningPastPapersHome papers={PAST_PAPER_LIST} source={PAST_PAPERS_SOURCE} />;
}
