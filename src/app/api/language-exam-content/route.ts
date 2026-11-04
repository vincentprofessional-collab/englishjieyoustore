import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_EXAM_PAGE_COPY,
  DEFAULT_LANGUAGE_EXAM_NAVIGATION,
  LANGUAGE_EXAM_CONTENT_SLUG,
  normalizeLanguageExamContent,
} from "@/lib/language-exam-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ navigation: DEFAULT_LANGUAGE_EXAM_NAVIGATION, pages: DEFAULT_EXAM_PAGE_COPY }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.from("managed_content_pages").select("meta_json").eq("slug", LANGUAGE_EXAM_CONTENT_SLUG).eq("status", "published").maybeSingle();
    if (error) throw error;
    return NextResponse.json(normalizeLanguageExamContent(data?.meta_json), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ navigation: DEFAULT_LANGUAGE_EXAM_NAVIGATION, pages: DEFAULT_EXAM_PAGE_COPY }, { headers: { "Cache-Control": "no-store" } });
  }
}
