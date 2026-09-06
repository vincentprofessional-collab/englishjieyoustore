import "server-only";

import { cookies } from "next/headers";
import {
  FREE_PREVIEW_VISITOR_COOKIE,
  isFreePreviewVisitorId,
} from "@/lib/free-preview-visitor";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function claimPaidContentAccess(projectKey: string, contentKey: string) {
  const cookieStore = await cookies();
  const visitorId = cookieStore.get(FREE_PREVIEW_VISITOR_COOKIE)?.value;

  if (!isFreePreviewVisitorId(visitorId)) {
    return false;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("claim_paid_content_access", {
    _content_key: contentKey,
    _free_limit: 1,
    _project_key: projectKey,
    _visitor_id: visitorId,
  });

  if (error) {
    console.error("Paid content access check failed", { code: error.code });
    return false;
  }

  return data === true;
}
