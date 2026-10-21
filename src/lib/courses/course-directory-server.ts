import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { COURSE_DIRECTORY_SLUG, normalizeCourseDirectory } from "@/lib/courses/course-directory";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const getPublishedCourseDirectory = unstable_cache(
  async () => {
    if (!supabaseUrl || !supabaseAnonKey) return normalizeCourseDirectory(null);

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await supabase
        .from("managed_content_pages")
        .select("meta_json")
        .eq("slug", COURSE_DIRECTORY_SLUG)
        .eq("status", "published")
        .maybeSingle();

      return normalizeCourseDirectory(error ? null : data?.meta_json);
    } catch {
      return normalizeCourseDirectory(null);
    }
  },
  ["published-course-directory"],
  { revalidate: 1800, tags: ["published-course-directory"] },
);

export async function getCachedPublishedCourseDirectory() {
  return getPublishedCourseDirectory();
}
