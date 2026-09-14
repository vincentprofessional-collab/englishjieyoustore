import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const videoMimeTypes = [
  "video/avi",
  "video/mp4",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/x-msvideo",
];
const videoExtensions = new Set(["avi", "m4v", "mkv", "mov", "mp4", "ogv", "webm"]);

function safeFilename(filename: string) {
  const parts = filename.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : ".mp4";
  const stem = parts
    .join(".")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${stem || "guide-video"}${extension}`;
}

function safeFolder(value: FormDataEntryValue | null) {
  const folder =
    typeof value === "string"
      ? value.replace(/[^a-zA-Z0-9-_/]+/g, "-").replace(/^\/+|\/+$/g, "")
      : "";

  return folder || "site/guide";
}

function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function isAllowedVideo(file: File) {
  return videoMimeTypes.includes(file.type) || videoExtensions.has(getExtension(file.name));
}

function getContentType(file: File) {
  if (videoMimeTypes.includes(file.type)) {
    return file.type;
  }

  const extension = getExtension(file.name);
  if (extension === "webm") return "video/webm";
  if (extension === "mov") return "video/quicktime";
  if (extension === "ogv") return "video/ogg";
  if (extension === "avi") return "video/x-msvideo";
  if (extension === "m4v") return "video/x-m4v";
  return "video/mp4";
}

async function ensureVideoBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.createBucket("video", {
    allowedMimeTypes: videoMimeTypes,
    fileSizeLimit: 200 * 1024 * 1024,
    public: true,
  });

  if (!error || error.message.toLowerCase().includes("already exists")) {
    if (error) {
      const { error: updateError } = await supabase.storage.updateBucket("video", {
        allowedMimeTypes: videoMimeTypes,
        fileSizeLimit: 200 * 1024 * 1024,
        public: true,
      });

      return updateError?.message ?? null;
    }

    return null;
  }

  return error.message;
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase service key is not configured." }, { status: 500 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "管理员登录已失效，请重新登录。" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ error: "这个账号没有上传权限。" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择视频文件。" }, { status: 400 });
  }

  if (!isAllowedVideo(file)) {
    return NextResponse.json({ error: "只支持 MP4、WebM、MOV、AVI、MKV 或 OGV 视频。" }, { status: 400 });
  }

  if (file.size > 200 * 1024 * 1024) {
    return NextResponse.json({ error: "视频不能超过 200MB。" }, { status: 400 });
  }

  const bucketError = await ensureVideoBucket(supabase);
  if (bucketError) {
    return NextResponse.json({ error: bucketError }, { status: 500 });
  }

  const objectPath = `${safeFolder(formData.get("folder"))}/${Date.now()}-${randomUUID()}-${safeFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("video").upload(objectPath, file, {
    cacheControl: "31536000",
    contentType: getContentType(file),
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("video").getPublicUrl(objectPath);
  return NextResponse.json({ publicUrl: data.publicUrl });
}
