import { supabase } from "@/lib/supabase/client";

export const DEFAULT_PAYMENT_INSTRUCTIONS = {
  heading: "微信扫码支付",
  orderLabel: "订单号",
  accountLabel: "开通账号",
  selectionLabel: "当前选择",
  note: "付款后20分钟内开通权限，如有问题，请联系我的微信号：13432086750",
};
export type PaymentInstructions = typeof DEFAULT_PAYMENT_INSTRUCTIONS;
const slug = "payment-instructions";

export function normalizePaymentInstructions(value: unknown): PaymentInstructions {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(DEFAULT_PAYMENT_INSTRUCTIONS).map(([key, fallback]) => [
    key, typeof source[key] === "string" && source[key].trim() ? source[key].trim().slice(0, key === "note" ? 2000 : 80) : fallback,
  ])) as PaymentInstructions;
}

export async function loadPaymentInstructions() {
  const { data } = await supabase.from("managed_content_pages").select("meta_json")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  return normalizePaymentInstructions(data?.meta_json);
}

export async function savePaymentInstructions(adminUserId: string, content: PaymentInstructions) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("managed_content_pages").upsert({
    created_by: adminUserId, meta_json: normalizePaymentInstructions(content), module: "site",
    published_at: now, slug, status: "published", summary: "付款二维码左侧说明",
    template_key: "site_announcement_page", title: "付款说明", updated_at: now,
  }, { onConflict: "slug" });
  return error;
}
