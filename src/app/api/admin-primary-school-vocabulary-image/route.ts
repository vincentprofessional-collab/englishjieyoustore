import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import primarySchoolVocabulary from "@/data/vocabulary/primary-school-vocabulary.json";
import { getPrimarySchoolVocabularyImagePath, normalizePrimarySchoolVocabularyWord } from "@/lib/vocabulary/primary-school-vocabulary-images";
import { encodeVocabularyImage } from "@/lib/admin/vocabulary-image";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 4 * 1024 * 1024;
const primarySchoolWords = new Set(primarySchoolVocabulary.map(({ word }) => word.toLowerCase()));

async function getAdminStorageClient(request: NextRequest) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return { error: NextResponse.json({ error: "图片存储服务未配置。" }, { status: 500 }) };
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { error: NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return { error: NextResponse.json({ error: "管理员登录已失效，请重新登录。" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "这个账号没有管理词汇图片的权限。" }, { status: 403 }) };
  }

  return { supabase: supabase as SupabaseClient };
}

function getImagePath(word: unknown) {
  if (typeof word !== "string") return null;
  const normalized = normalizePrimarySchoolVocabularyWord(word);
  return normalized && primarySchoolWords.has(normalized)
    ? getPrimarySchoolVocabularyImagePath(normalized)
    : null;
}

async function ensureImageBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.createBucket("images", {
    allowedMimeTypes: imageMimeTypes,
    fileSizeLimit: 10 * 1024 * 1024,
    public: true,
  });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
}

export async function POST(request: NextRequest) {
  const authorization = await getAdminStorageClient(request);
  if ("error" in authorization) return authorization.error;

  const formData = await request.formData();
  const file = formData.get("file");
  const path = getImagePath(formData.get("word"));
  if (!path) return NextResponse.json({ error: "请选择小学词库中的词条。" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择图片文件。" }, { status: 400 });
  if (!imageMimeTypes.includes(file.type) || file.size > maxImageSize) {
    return NextResponse.json({ error: "请上传 JPG、PNG 或 WebP 图片（不超过 4 MB）。" }, { status: 400 });
  }

  let bytes: Buffer;
  try { bytes = await encodeVocabularyImage(Buffer.from(await file.arrayBuffer())); }
  catch { return NextResponse.json({ error: "无法处理这张图片，请确认文件是有效的 JPG、PNG 或 WebP。" }, { status: 400 }); }

  try {
    await ensureImageBucket(authorization.supabase);
    const { error } = await authorization.supabase.storage.from("images").upload(path, bytes, {
      cacheControl: "300",
      contentType: "image/webp",
      upsert: true,
    });
    if (error) throw error;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "图片上传失败。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}

export async function DELETE(request: NextRequest) {
  const authorization = await getAdminStorageClient(request);
  if ("error" in authorization) return authorization.error;

  const body = await request.json().catch(() => null) as { word?: unknown } | null;
  const path = getImagePath(body?.word);
  if (!path) return NextResponse.json({ error: "请选择小学词库中的词条。" }, { status: 400 });

  try {
    const { error } = await authorization.supabase.storage.from("images").remove([path]);
    if (error) throw error;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "图片删除失败。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
