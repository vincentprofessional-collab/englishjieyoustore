import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const expectedTokenHash = "0fe7260318d1a77797b76c93dcc35dc4ba113cc14ff0220d7fdd2e0d9eac83fa";

function validToken(value: string | null) {
  if (!value) return false;
  const actual = Buffer.from(createHash("sha256").update(value).digest("hex"));
  const expected = Buffer.from(expectedTokenHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function removeTvSpeakingNav(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => {
        if (!item || typeof item !== "object") return true;
        const entry = item as { href?: unknown; id?: unknown };
        return entry.href !== "/tv-speaking" && entry.id !== "tv-speaking";
      })
      .map(removeTvSpeakingNav);
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, removeTvSpeakingNav(item)]),
  );
}

export async function POST(request: NextRequest) {
  if (!validToken(request.headers.get("x-cleanup-token"))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: objects, error: listError } = await supabase.storage.from("videos").list("tv-speaking", { limit: 1000 });
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
  const storagePaths = (objects ?? []).filter((item) => item.name).map((item) => `tv-speaking/${item.name}`);
  for (let index = 0; index < storagePaths.length; index += 100) {
    const { error } = await supabase.storage.from("videos").remove(storagePaths.slice(index, index + 100));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: page } = await supabase.from("managed_content_pages").select("id").eq("slug", "tv-speaking").maybeSingle();
  if (page?.id) {
    const { error: sectionError } = await supabase.from("managed_content_page_sections").delete().eq("page_id", page.id);
    if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 });
    const { error: pageError } = await supabase.from("managed_content_pages").delete().eq("id", page.id);
    if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 });
  }

  const { error: templateSectionError } = await supabase.from("content_page_template_sections").delete().eq("template_key", "tv_speaking_page");
  if (templateSectionError) return NextResponse.json({ error: templateSectionError.message }, { status: 500 });
  const { error: templateError } = await supabase.from("content_page_templates").delete().eq("template_key", "tv_speaking_page");
  if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 });

  const { data: chrome } = await supabase.from("managed_content_pages").select("id,meta_json").eq("slug", "site-chrome").maybeSingle();
  if (chrome?.id) {
    const { error: chromeError } = await supabase
      .from("managed_content_pages")
      .update({ meta_json: removeTvSpeakingNav(chrome.meta_json), updated_at: new Date().toISOString() })
      .eq("id", chrome.id);
    if (chromeError) return NextResponse.json({ error: chromeError.message }, { status: 500 });
  }

  return NextResponse.json({ deletedDatabasePage: Boolean(page?.id), deletedStorageObjects: storagePaths.length, ok: true });
}
