-- 跨设备学习进度由已验证用户的服务端 API 读写；桶保持私有，不开放客户端直连。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'account-learning-progress',
  'account-learning-progress',
  false,
  12000000,
  array['application/json']
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
