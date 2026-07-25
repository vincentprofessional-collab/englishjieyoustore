import { ModulePlaceholder } from "@/components/module-placeholder";

export default function VocabularyBooksPage() {
  return (
    <ModulePlaceholder
      badge="Vocabulary"
      title="背单词"
      description="这里会放词汇书、每日任务和 SRS 复习。初期免费，后期可以一键接付费开关。"
      items={["词汇书选择", "每日新词", "复习队列", "记得/模糊/不记得"]}
      primaryHref="/vocabulary"
      primaryLabel="先去词典页"
    />
  );
}
