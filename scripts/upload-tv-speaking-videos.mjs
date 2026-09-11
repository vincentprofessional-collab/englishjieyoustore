import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const sourceRoot = process.env.TV_SPEAKING_SOURCE_ROOT ?? "/Volumes/My HDD3/影视视频";
const outputRoot = process.env.TV_SPEAKING_OUTPUT_ROOT ?? "/Users/shidianjin/outputs/tv-speaking-100";
const manifestPath = path.join(process.cwd(), "data", "tv-speaking", "clips.json");
const checkpointPath = path.join(outputRoot, "checkpoint.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

mkdirSync(outputRoot, { recursive: true });
const prepared = [];
for (const clip of manifest.clips) {
  const sourcePath = path.join(sourceRoot, clip.sourceFilename);
  const outputPath = path.join(outputRoot, path.basename(clip.storagePath));
  if (!existsSync(outputPath) || statSync(outputPath).size === 0) {
    execFileSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        sourcePath,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-vf",
        "scale='min(960,iw)':-2",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "30",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "64k",
        "-movflags",
        "+faststart",
        "-y",
        outputPath,
      ],
      { stdio: "inherit" },
    );
  }
  prepared.push({ ...clip, outputBytes: statSync(outputPath).size, outputPath });
  writeFileSync(
    checkpointPath,
    `${JSON.stringify({ prepared: prepared.map(({ id, outputBytes }) => ({ id, outputBytes })) }, null, 2)}\n`,
  );
}

const preparedBytes = prepared.reduce((sum, clip) => sum + clip.outputBytes, 0);
console.log(JSON.stringify({ apply, count: prepared.length, preparedMiB: Number((preparedBytes / 2 ** 20).toFixed(2)) }));
if (!apply) process.exit(0);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase URL or service key.");
const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
if (bucketListError) throw bucketListError;
if (!(buckets ?? []).some((bucket) => bucket.id === "videos")) {
  const { error } = await supabase.storage.createBucket("videos", { public: true });
  if (error) throw error;
}

const uploaded = [];
for (const clip of prepared) {
  const bytes = readFileSync(clip.outputPath);
  const { error } = await supabase.storage.from("videos").upload(clip.storagePath, bytes, {
    cacheControl: "31536000",
    contentType: "video/mp4",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${clip.storagePath}: ${error.message}`);
  const { data } = supabase.storage.from("videos").getPublicUrl(clip.storagePath);
  uploaded.push({ ...clip, sizeBytes: clip.outputBytes, videoUrl: data.publicUrl });
  writeFileSync(
    checkpointPath,
    `${JSON.stringify({ uploaded: uploaded.map(({ id, storagePath, videoUrl }) => ({ id, storagePath, videoUrl })) }, null, 2)}\n`,
  );
  console.log(`uploaded ${uploaded.length}/${prepared.length}`);
}

const publicClips = uploaded.map(({ outputBytes: _outputBytes, outputPath: _outputPath, ...clip }) => clip);
manifest.clips = publicClips;
manifest.publishedAt = new Date().toISOString();
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const now = new Date().toISOString();
const { error: templateError } = await supabase.from("content_page_templates").upsert({
  description: "看美剧学口语视频练习与后台编辑",
  is_active: true,
  module: "training",
  schema_json: { sections: ["clips"] },
  sort_order: 75,
  template_key: "tv_speaking_page",
  title: "看美剧学口语",
  updated_at: now,
});
if (templateError) throw templateError;

const { error: templateSectionError } = await supabase.from("content_page_template_sections").upsert(
  {
    component_type: "media_gallery",
    description: "可编辑英文、中文翻译并删除单条视频",
    is_active: true,
    is_repeatable: true,
    section_key: "clips",
    sort_order: 10,
    template_key: "tv_speaking_page",
    title: "视频列表",
    updated_at: now,
  },
  { onConflict: "template_key,section_key" },
);
if (templateSectionError) throw templateSectionError;

const { data: page, error: pageError } = await supabase.from("managed_content_pages").upsert(
  {
    is_paid_only: false,
    meta_json: { count: publicClips.length, source: "My HDD3/影视视频" },
    module: "training",
    published_at: now,
    slug: "tv-speaking",
    status: "published",
    summary: "短台词视频口语专项训练",
    template_key: "tv_speaking_page",
    title: "看美剧学口语",
    updated_at: now,
  },
  { onConflict: "slug" },
).select("id").single();
if (pageError || !page) throw pageError ?? new Error("Failed to create managed page.");

const { data: templateSection } = await supabase.from("content_page_template_sections")
  .select("id").eq("template_key", "tv_speaking_page").eq("section_key", "clips").single();
const { error: sectionError } = await supabase.from("managed_content_page_sections").upsert(
  {
    content_json: { clips: publicClips },
    is_active: true,
    page_id: page.id,
    section_key: "clips",
    sort_order: 10,
    template_section_id: templateSection?.id ?? null,
    title: "视频列表",
    updated_at: now,
  },
  { onConflict: "page_id,section_key" },
);
if (sectionError) throw sectionError;
console.log(JSON.stringify({ uploaded: publicClips.length, seeded: true }));
