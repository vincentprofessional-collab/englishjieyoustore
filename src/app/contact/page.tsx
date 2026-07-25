import { ModulePlaceholder } from "@/components/module-placeholder";

export default function ContactPage() {
  return (
    <ModulePlaceholder
      badge="Site"
      title="联系我们"
      description="第一阶段可以放邮箱、微信二维码和简单说明；后期再接表单提交到 contact_messages。"
      items={["联系方式", "微信二维码", "常见问题", "留言表单"]}
    />
  );
}
