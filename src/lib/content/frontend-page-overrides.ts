import { supabase } from "@/lib/supabase/client";

export type FrontendPageElementPatch = {
  alt?: string;
  hidden?: boolean;
  href?: string;
  selector: string;
  src?: string;
  text?: string;
};

export type FrontendPageAddedBlock = {
  hidden?: boolean;
  href?: string;
  id: string;
  kind: "heading" | "image" | "link" | "paragraph";
  text: string;
};

export type FrontendPageOverride = {
  blocks: FrontendPageAddedBlock[];
  contentVersion: 1;
  patches: FrontendPageElementPatch[];
  pathname: string;
};

function pathnameHash(pathname: string) {
  let hash = 2166136261;
  for (const char of pathname) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function frontendPageOverrideSlug(pathname: string) {
  return `frontend-page-${pathnameHash(pathname)}`;
}

export async function loadFrontendPageOverride(pathname: string): Promise<FrontendPageOverride> {
  const fallback: FrontendPageOverride = {
    blocks: [],
    contentVersion: 1,
    patches: [],
    pathname,
  };
  const { data } = await supabase
    .from("managed_content_pages")
    .select("meta_json")
    .eq("slug", frontendPageOverrideSlug(pathname))
    .eq("status", "published")
    .maybeSingle();
  const meta = data?.meta_json;

  if (!meta || typeof meta !== "object" || !("pathname" in meta) || meta.pathname !== pathname) {
    return fallback;
  }

  return {
    blocks: Array.isArray(meta.blocks) ? (meta.blocks as FrontendPageAddedBlock[]) : [],
    contentVersion: 1,
    patches: Array.isArray(meta.patches) ? (meta.patches as FrontendPageElementPatch[]) : [],
    pathname,
  };
}

export async function saveFrontendPageOverride(
  adminUserId: string,
  content: FrontendPageOverride,
) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("managed_content_pages").upsert(
    {
      created_by: adminUserId,
      meta_json: content,
      module: "site",
      published_at: now,
      slug: frontendPageOverrideSlug(content.pathname),
      status: "published",
      summary: `前台页面 ${content.pathname} 的管理员覆盖内容`,
      template_key: "site_announcement_page",
      title: `页面内容：${content.pathname}`,
      updated_at: now,
    },
    { onConflict: "slug" },
  );

  return error;
}
