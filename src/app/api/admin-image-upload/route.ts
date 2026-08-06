import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

function safeFilename(filename: string) {
  const parts = filename.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : "";
  const stem = parts
    .join(".")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${stem || "admin-image"}${extension}`;
}

function safeFolder(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value.replace(/[^a-zA-Z0-9-_/]+/g, "-").replace(/^\/+|\/+$/g, "")
    : "site/admin";
}

async function ensureImageBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.createBucket("images", {
    allowedMimeTypes: imageMimeTypes,
    fileSizeLimit: 10 * 1024 * 1024,
    public: true,
  });

  if (!error || error.message.toLowerCase().includes("already exists")) {
    if (error) {
      const { error: updateError } = await supabase.storage.updateBucket("images", {
        allowedMimeTypes: imageMimeTypes,
        fileSizeLimit: 10 * 1024 * 1024,
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
    return NextResponse.json({ error: "请选择图片文件。" }, { status: 400 });
  }

  if (!imageMimeTypes.includes(file.type)) {
    return NextResponse.json({ error: "只支持 JPG、PNG、WebP、GIF 或 SVG 图片。" }, { status: 400 });
  }

  const bucketError = await ensureImageBucket(supabase);

  if (bucketError) {
    return NextResponse.json({ error: bucketError }, { status: 500 });
  }

  const objectPath = `${safeFolder(formData.get("folder"))}/${Date.now()}-${randomUUID()}-${safeFilename(
    file.name,
  )}`;
  const { error: uploadError } = await supabase.storage.from("images").upload(objectPath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("images").getPublicUrl(objectPath);
  return NextResponse.json({ publicUrl: data.publicUrl });
}
