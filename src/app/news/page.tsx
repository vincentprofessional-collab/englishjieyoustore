import { ModulePlaceholder } from "@/components/module-placeholder";

export default function NewsPage() {
  return (
    <ModulePlaceholder
      badge="Site"
      title="最新消息"
      description="用于发布课程更新、题库更新、活动通知和产品公告。"
      items={["课程更新", "题库更新", "活动通知", "产品公告"]}
    />
  );
}
