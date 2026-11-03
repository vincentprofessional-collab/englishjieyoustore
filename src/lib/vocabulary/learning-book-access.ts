import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const PAID_LEARNING_BOOKS = {
  "雅思听力答案词": {
    projectKey: "vocabulary.ielts-listening-answer-words",
    paywallPath: "/vocabulary/listening-answer-words",
  },
  地道表达: {
    projectKey: "vocabulary.idiomatic-expressions",
    paywallPath: "/vocabulary/idiomatic-expressions",
  },
  俚语俗语: {
    projectKey: "vocabulary.slang-proverbs",
    paywallPath: "/vocabulary/slang-proverbs",
  },
} as const;

export type PaidLearningBook = keyof typeof PAID_LEARNING_BOOKS;

export function getPaidLearningBook(book: string) {
  return Object.prototype.hasOwnProperty.call(PAID_LEARNING_BOOKS, book)
    ? PAID_LEARNING_BOOKS[book as PaidLearningBook]
    : null;
}

export async function hasPaidProjectAccess(projectKey: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return false;

    const { data: profile } = await supabase.from("profiles").select("role,membership_status").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin" || profile?.membership_status === "lifetime") return true;

    const now = new Date().toISOString();
    const { data: entitlement } = await supabase.from("user_project_entitlements")
      .select("id")
      .eq("user_id", user.id)
      .eq("project_key", projectKey)
      .eq("status", "active")
      .lte("starts_at", now)
      .gt("expires_at", now)
      .limit(1)
      .maybeSingle();

    return Boolean(entitlement);
  } catch {
    return false;
  }
}

export async function hasLearningBookAccess(book: string) {
  const paidBook = getPaidLearningBook(book);
  return paidBook ? hasPaidProjectAccess(paidBook.projectKey) : true;
}
