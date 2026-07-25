import { ModulePlaceholder } from "@/components/module-placeholder";

export default function AdminPage() {
  return (
    <ModulePlaceholder
      badge="Admin"
      title="后台管理"
      description="后台最终会支持网页式上传、按框架编辑内容、调整区块顺序，以及一键切换免费/付费。"
      items={["内容上传", "区块排序", "付费开关", "素材管理"]}
      primaryHref="/debug/supabase"
      primaryLabel="查看 Supabase 连接"
    />
  );
}
