import { supabase } from "@/lib/supabase/client";

const audioExtensions = new Set(["aac", "flac", "m4a", "mp3", "mp4", "ogg", "wav", "webm"]);

function hasAllowedAudioExtension(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return audioExtensions.has(extension);
}

export async function uploadAdminAudio(file: File, folder: string) {
  if (!file.type.startsWith("audio/") && !hasAllowedAudioExtension(file.name)) {
    throw new Error("只支持 MP3、M4A、WAV、AAC、FLAC、OGG 或 WebM 音频。");
  }

  if (file.size > 80 * 1024 * 1024) {
    throw new Error("音频不能超过 80MB。");
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

  const response = await fetch("/api/admin-audio-upload", {
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
    throw new Error(payload?.error ?? "音频上传失败。");
  }

  return payload.publicUrl;
}
