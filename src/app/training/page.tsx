import { ModulePlaceholder } from "@/components/module-placeholder";

export default function TrainingPage() {
  return (
    <ModulePlaceholder
      badge="Paid Module"
      title="英语专项训练"
      description="写作翻译训练一直收费，后期可以继续添加句子合并、语法改写、精听跟读等训练。"
      items={["中文写英文", "两句英文合并", "语法改写", "后续训练入口"]}
    />
  );
}
