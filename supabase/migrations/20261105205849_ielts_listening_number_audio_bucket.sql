-- Store paid IELTS listening number clips in a private Supabase bucket.
-- No storage.objects policies are added; uploads/signing stay server-only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vocabulary-answer-audio',
  'vocabulary-answer-audio',
  false,
  12000000,
  array['audio/mpeg']
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
