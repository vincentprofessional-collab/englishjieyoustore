import { supabase } from "@/lib/supabase/client";

export type ExamContentId = "cet4" | "cet6" | "postgraduate" | "ielts" | "gre" | "gmat" | "sat";

export type ExamContentOverride = {
  bank_id: string;
  title: string;
  category: string;
  source: string;
  bank_data: Record<string, unknown> | null;
  is_deleted: boolean;
  updated_at: string;
};

export async function getExamContentOverride(exam: ExamContentId, bankId: string) {
  const { data, error } = await supabase
    .from("exam_prep_banks")
    .select("bank_id,title,category,source,bank_data,is_deleted,updated_at")
    .eq("exam", exam)
    .eq("bank_id", bankId)
    .maybeSingle();
  return { override: (data as ExamContentOverride | null) ?? null, error };
}

export async function listExamContentOverrides(exam: ExamContentId) {
  const { data, error } = await supabase
    .from("exam_prep_banks")
    .select("bank_id,title,category,source,bank_data,is_deleted,updated_at")
    .eq("exam", exam);
  return { overrides: (data as ExamContentOverride[] | null) ?? [], error };
}
