insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'retelling-recordings',
  'retelling-recordings',
  false,
  10485760,
  array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg']
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "用户读取自己的复述录音" on storage.objects;
create policy "用户读取自己的复述录音" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'retelling-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "用户上传自己的复述录音" on storage.objects;
create policy "用户上传自己的复述录音" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'retelling-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "用户更新自己的复述录音" on storage.objects;
create policy "用户更新自己的复述录音" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'retelling-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'retelling-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
