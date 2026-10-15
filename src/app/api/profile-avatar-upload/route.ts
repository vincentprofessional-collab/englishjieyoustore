import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { uploadPrivateCosMedia } from "@/lib/cos/storage";
import { getManagedMediaUrl } from "@/lib/media/url";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonError("头像服务尚未配置。", 503);
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!accessToken) {
    return jsonError("请先登录。", 401);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonError("登录已失效，请重新登录。", 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const rawDisplayName = formData.get("displayName");
  const displayName = typeof rawDisplayName === "string" ? rawDisplayName.trim() : undefined;
  if (displayName !== undefined && (!displayName || displayName.length > 30)) return jsonError("昵称请填写 1–30 个字符。", 400);
  if (!file && displayName === undefined) return jsonError("请填写昵称或选择头像。", 400);

  if (file !== null && (!(file instanceof File) || !file.type.startsWith("image/"))) {
    return jsonError("请选择图片文件。", 400);
  }

  if (file instanceof File && (file.size <= 0 || file.size > 2 * 1024 * 1024)) {
    return jsonError("头像图片请控制在 2MB 内。", 413);
  }

  let avatarUrl: string | undefined;
  if (file instanceof File) {
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const objectPath = `profiles/${user.id}/avatar-${randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (process.env.COS_MEDIA_ENABLED === "true") {
      try {
        await uploadPrivateCosMedia("images", objectPath, Buffer.from(bytes), file.type);
        avatarUrl = getManagedMediaUrl("images", objectPath);
      } catch (error) {
        return jsonError(`头像上传失败：${error instanceof Error ? error.message : "COS upload failed."}`, 500);
      }
    } else {
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(objectPath, bytes, { contentType: file.type, upsert: false });

      if (uploadError) {
        return jsonError(`头像上传失败：${uploadError.message}`, 500);
      }
      const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(objectPath);
      avatarUrl = publicUrlData.publicUrl;
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ ...(avatarUrl ? { avatar_url: avatarUrl } : {}), ...(displayName !== undefined ? { display_name: displayName } : {}), updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (profileError) {
    return jsonError(`个人资料保存失败：${profileError.message}`, 500);
  }

  const { error: metadataError } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, ...(avatarUrl ? { avatar_url: avatarUrl } : {}), ...(displayName !== undefined ? { display_name: displayName } : {}) },
  });

  if (metadataError) {
    return NextResponse.json({ avatarUrl, displayName, notice: "资料已保存，登录资料同步暂未完成；可稍后重新保存。" });
  }

  return NextResponse.json({ avatarUrl, displayName });
}
