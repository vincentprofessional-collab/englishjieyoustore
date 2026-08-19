import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const audioMimeTypes = [
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
];
const audioExtensions = new Set(["aac", "flac", "m4a", "mp3", "mp4", "ogg", "wav", "webm"]);

function safeFilename(filename: string) {
  const parts = filename.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : ".mp3";
  const stem = parts
    .join(".")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${stem || "speaking-audio"}${extension}`;
}

function safeFolder(value: FormDataEntryValue | null) {
  const folder =
    typeof value === "string"
      ? value.replace(/[^a-zA-Z0-9-_/]+/g, "-").replace(/^\/+|\/+$/g, "")
      : "";

  return folder || "speaking/audio";
}

function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function isAllowedAudio(file: File) {
  const extension = getExtension(file.name);
  return audioMimeTypes.includes(file.type) || audioExtensions.has(extension);
}

function getContentType(file: File) {
  if (audioMimeTypes.includes(file.type)) {
    return file.type;
  }

  const extension = getExtension(file.name);

  if (extension === "m4a" || extension === "mp4") {
    return "audio/mp4";
  }

  if (extension === "wav") {
    return "audio/wav";
  }

  if (extension === "ogg") {
    return "audio/ogg";
  }

  if (extension === "webm") {
    return "audio/webm";
  }

  if (extension === "flac") {
    return "audio/flac";
  }

  if (extension === "aac") {
    return "audio/aac";
  }

  return "audio/mpeg";
}

async function ensureAudioBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.createBucket("audio", {
    allowedMimeTypes: audioMimeTypes,
    fileSizeLimit: 80 * 1024 * 1024,
    public: true,
  });

  if (!error || error.message.toLowerCase().includes("already exists")) {
    if (error) {
      const { error: updateError } = await supabase.storage.updateBucket("audio", {
        allowedMimeTypes: audioMimeTypes,
        fileSizeLimit: 80 * 1024 * 1024,
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
    return NextResponse.json({ error: "这个账号没有上传音频的权限。" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择音频文件。" }, { status: 400 });
  }

  if (!isAllowedAudio(file)) {
    return NextResponse.json(
      { error: "只支持 MP3、M4A、WAV、AAC、FLAC、OGG 或 WebM 音频。" },
      { status: 400 },
    );
  }

  if (file.size > 80 * 1024 * 1024) {
    return NextResponse.json({ error: "音频不能超过 80MB。" }, { status: 400 });
  }

  const bucketError = await ensureAudioBucket(supabase);

  if (bucketError) {
    return NextResponse.json({ error: bucketError }, { status: 500 });
  }

  const objectPath = `${safeFolder(formData.get("folder"))}/${Date.now()}-${randomUUID()}-${safeFilename(
    file.name,
  )}`;
  const contentType = getContentType(file);
  const { error: uploadError } = await supabase.storage.from("audio").upload(objectPath, file, {
    cacheControl: "31536000",
    contentType,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("audio").getPublicUrl(objectPath);
  return NextResponse.json({ publicUrl: data.publicUrl });
}
