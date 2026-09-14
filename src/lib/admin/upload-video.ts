import { supabase } from "@/lib/supabase/client";

const videoExtensions = new Set(["avi", "m4v", "mkv", "mov", "mp4", "ogv", "webm"]);

function hasAllowedVideoExtension(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return videoExtensions.has(extension);
}

export async function uploadAdminVideo(file: File, folder: string) {
  if (!file.type.startsWith("video/") && !hasAllowedVideoExtension(file.name)) {
    throw new Error("只支持 MP4、WebM、MOV、AVI、MKV 或 OGV 视频。");
  }

  if (file.size > 200 * 1024 * 1024) {
    throw new Error("视频不能超过 200MB。");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("请先登录管理员账号。");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/admin-video-upload", {
    body: formData,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    publicUrl?: string;
  } | null;

  if (!response.ok || !payload?.publicUrl) {
    throw new Error(payload?.error ?? "视频上传失败。");
  }

  return payload.publicUrl;
}
