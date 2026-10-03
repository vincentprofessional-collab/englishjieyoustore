import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "retelling-recordings";
const MAX_RECORDING_BYTES = 10 * 1024 * 1024;
const SOURCE_TYPES = new Set(["bbc", "new-concept", "ielts-listening"]);
const MIME_EXTENSIONS: Record<string, string> = {
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
};

function validSource(sourceType: string, sourceId: string) {
  return SOURCE_TYPES.has(sourceType) && /^[A-Za-z0-9_-]{1,100}$/.test(sourceId);
}

async function getUserSupabase() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { response: NextResponse.json({ error: "请先登录，才能将录音保存到 Supabase。" }, { status: 401 }) };
    return { supabase, user: data.user };
  } catch {
    return { response: NextResponse.json({ error: "Supabase 暂不可用，请稍后重试。" }, { status: 503 }) };
  }
}

export async function GET(request: NextRequest) {
  const sourceType = request.nextUrl.searchParams.get("sourceType")?.trim() ?? "";
  const sourceId = request.nextUrl.searchParams.get("sourceId")?.trim() ?? "";
  if (!validSource(sourceType, sourceId)) {
    return NextResponse.json({ error: "文章标识无效。" }, { status: 400 });
  }

  const auth = await getUserSupabase();
  if ("response" in auth) return auth.response;

  const folder = `${auth.user.id}/${sourceType}/${sourceId}`;
  const { data: recordings, error: listError } = await auth.supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 1, sortBy: { column: "created_at", order: "desc" } });
  if (listError) {
    return NextResponse.json({ error: "读取录音失败，请稍后重试。" }, { status: 503 });
  }

  const latestRecording = recordings?.find((recording) => recording.id);
  if (!latestRecording) return NextResponse.json({ recording: null });

  const path = `${folder}/${latestRecording.name}`;
  const { data, error } = await auth.supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "无法打开已保存的录音。" }, { status: 503 });
  }

  return NextResponse.json({ createdAt: latestRecording.created_at, signedUrl: data.signedUrl });
}

export async function POST(request: NextRequest) {
  const auth = await getUserSupabase();
  if ("response" in auth) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "录音文件无法读取。" }, { status: 400 });
  }

  const sourceType = String(formData.get("sourceType") ?? "").trim();
  const sourceId = String(formData.get("sourceId") ?? "").trim();
  const recording = formData.get("recording");
  if (!validSource(sourceType, sourceId)) {
    return NextResponse.json({ error: "文章标识无效。" }, { status: 400 });
  }
  if (!(recording instanceof File) || recording.size === 0) {
    return NextResponse.json({ error: "没有收到录音文件。" }, { status: 400 });
  }
  if (recording.size > MAX_RECORDING_BYTES) {
    return NextResponse.json({ error: "录音文件不能超过 10 MB。" }, { status: 413 });
  }

  const mimeType = recording.type.split(";", 1)[0].trim().toLowerCase();
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension) {
    return NextResponse.json({ error: "当前录音格式不受支持，请使用 Safari 或 Chrome 重新录制。" }, { status: 415 });
  }

  const folder = `${auth.user.id}/${sourceType}/${sourceId}`;
  const path = `${folder}/latest`;
  const { error: uploadError } = await auth.supabase.storage.from(BUCKET).upload(path, recording, {
    cacheControl: "60",
    contentType: mimeType,
    upsert: true,
  });
  if (uploadError) {
    return NextResponse.json({ error: "录音上传失败，请稍后重试。" }, { status: 503 });
  }

  const { data, error } = await auth.supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "录音已上传，但暂时无法生成回放地址。" }, { status: 503 });
  }

  return NextResponse.json({ createdAt: new Date().toISOString(), signedUrl: data.signedUrl });
}
