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

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return jsonError("请选择图片文件。", 400);
  }

  if (file.size > 2 * 1024 * 1024) {
    return jsonError("头像图片请控制在 2MB 内。", 413);
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `profiles/${user.id}/avatar-${randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  let avatarUrl: string;
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

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (profileError) {
    return jsonError(`头像资料保存失败：${profileError.message}`, 500);
  }

  const { error: metadataError } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: avatarUrl },
  });

  if (metadataError) {
    return jsonError(`头像资料同步失败：${metadataError.message}`, 500);
  }

  return NextResponse.json({ avatarUrl });
}
