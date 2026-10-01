import { ProjectAccessGate } from "@/components/project-access-gate";
import { WritingTask1VocabularyPage } from "@/components/writing-task1-vocabulary-page";
import { getPaidContentKey } from "@/lib/access-control";
import {
  WRITING_TASK1_VOCABULARY_CATEGORIES,
  type WritingTask1VocabularyEntry,
} from "@/lib/ielts/writing-task1-vocabulary";
import { getVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";

function enrichEntry(entry: WritingTask1VocabularyEntry): WritingTask1VocabularyEntry {
  const vocabularyEntry = getVocabularyEntry(entry.term);

  return {
    ...entry,
    level: vocabularyEntry?.level,
    ukAudioUrl: vocabularyEntry?.ukAudioUrl,
    ukPhonetic: vocabularyEntry?.ukPhonetic || entry.phonetic,
    usAudioUrl: vocabularyEntry?.usAudioUrl,
    usPhonetic: vocabularyEntry?.usPhonetic || entry.phonetic,
  };
}

export default function Task1VocabularyPage() {
  const categories = WRITING_TASK1_VOCABULARY_CATEGORIES.map((category) => ({
    ...category,
    entries: category.entries.map(enrichEntry),
  }));

  return (
    <ProjectAccessGate
      contentKey={getPaidContentKey("writing-practice", "task1-vocabulary")}
      projectKey="writing"
      title="雅思写作词汇训练需要单独开通"
    >
      <WritingTask1VocabularyPage categories={categories} />
    </ProjectAccessGate>
  );
}
