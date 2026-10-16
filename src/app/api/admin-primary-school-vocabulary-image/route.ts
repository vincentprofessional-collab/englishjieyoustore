import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import primarySchoolVocabulary from "@/data/vocabulary/primary-school-vocabulary.json";
import {
  getPrimarySchoolVocabularyImagePath,
  getVocabularyImageLevel,
  getVocabularyImagePath,
  normalizePrimarySchoolVocabularyWord,
} from "@/lib/vocabulary/primary-school-vocabulary-images";
import { encodeVocabularyImage } from "@/lib/admin/vocabulary-image";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 4 * 1024 * 1024;
const vocabularySourcePath = resolve(process.cwd(), "src/data/vocabulary/flat-vocabulary.json");

type VocabularyImageItem = { word: string; def: string };
type FlatVocabularyItem = { word?: string; def?: string; level?: string };

let flatVocabulary: FlatVocabularyItem[] | null = null;
const itemsByLevel = new Map<string, VocabularyImageItem[]>();
const wordsByLevel = new Map<string, Set<string>>();

function getVocabularyItems(levelId: string) {
  const cached = itemsByLevel.get(levelId);
  if (cached) return cached;

  const level = getVocabularyImageLevel(levelId);
  if (!level) return null;

  let items: VocabularyImageItem[];
  if (level.id === "primary") {
    items = primarySchoolVocabulary.map(({ word, def }) => ({ word, def }));
  } else {
    flatVocabulary ??= JSON.parse(readFileSync(vocabularySourcePath, "utf8")) as FlatVocabularyItem[];
    const byWord = new Map<string, VocabularyImageItem>();
    for (const entry of flatVocabulary) {
      if (entry.level?.trim() !== level.sourceLevel) continue;
      const word = normalizePrimarySchoolVocabularyWord(entry.word ?? "");
      if (!word || byWord.has(word)) continue;
      byWord.set(word, { word, def: (entry.def ?? "").replace(/\s+/g, " ").trim() });
    }
    items = [...byWord.values()].sort((a, b) => a.word.localeCompare(b.word));
  }

  itemsByLevel.set(levelId, items);
  wordsByLevel.set(levelId, new Set(items.map(({ word }) => word)));
  return items;
}

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

function getImagePath(levelId: unknown, wordValue: unknown) {
  if (typeof levelId !== "string" || typeof wordValue !== "string") return null;
  const items = getVocabularyItems(levelId);
  const word = normalizePrimarySchoolVocabularyWord(wordValue);
  return items && word && wordsByLevel.get(levelId)?.has(word)
    ? levelId === "primary" ? getPrimarySchoolVocabularyImagePath(word) : getVocabularyImagePath(levelId, word)
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

export async function GET(request: NextRequest) {
  const authorization = await getAdminStorageClient(request);
  if ("error" in authorization) return authorization.error;

  const levelId = request.nextUrl.searchParams.get("level");
  const items = levelId ? getVocabularyItems(levelId) : null;
  if (!items) return NextResponse.json({ error: "请选择有效的词库等级。" }, { status: 400 });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const authorization = await getAdminStorageClient(request);
  if ("error" in authorization) return authorization.error;

  const formData = await request.formData();
  const file = formData.get("file");
  const levelId = formData.get("level");
  const word = normalizePrimarySchoolVocabularyWord(String(formData.get("word") ?? ""));
  const path = getImagePath(levelId, word);
  if (!path || !word) return NextResponse.json({ error: "请选择当前词库中的有效词条。" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择图片文件。" }, { status: 400 });
  if (!imageMimeTypes.includes(file.type) || file.size > maxImageSize) {
    return NextResponse.json({ error: "请上传 JPG、PNG 或 WebP 图片（不超过 4 MB）。" }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = await encodeVocabularyImage(Buffer.from(await file.arrayBuffer()), word);
  } catch {
    return NextResponse.json({ error: "无法处理这张图片，请确认文件是有效的 JPG、PNG 或 WebP。" }, { status: 400 });
  }

  try {
    await ensureImageBucket(authorization.supabase);
    const { error } = await authorization.supabase.storage.from("images").upload(path, bytes, {
      cacheControl: "300",
      contentType: "image/webp",
      upsert: true,
      metadata: { vocabularyLabel: "filename-word-v1" },
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

  const body = await request.json().catch(() => null) as { level?: unknown; word?: unknown } | null;
  const path = getImagePath(body?.level, body?.word);
  if (!path) return NextResponse.json({ error: "请选择当前词库中的有效词条。" }, { status: 400 });

  try {
    const { error } = await authorization.supabase.storage.from("images").remove([path]);
    if (error) throw error;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "图片删除失败。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
