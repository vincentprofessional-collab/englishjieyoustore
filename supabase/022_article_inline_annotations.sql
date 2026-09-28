create table if not exists public.article_inline_annotations (
  source_type text not null check (source_type in ('bbc', 'new-concept', 'ielts-reading')),
  source_id text not null,
  annotations jsonb not null default '[]'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (source_type, source_id),
  check (jsonb_typeof(annotations) = 'array')
);

alter table public.article_inline_annotations enable row level security;

drop policy if exists "公开读文章词汇标注" on public.article_inline_annotations;
create policy "公开读文章词汇标注" on public.article_inline_annotations
  for select using (true);

drop policy if exists "管理员增文章词汇标注" on public.article_inline_annotations;
create policy "管理员增文章词汇标注" on public.article_inline_annotations
  for insert with check (is_admin());

drop policy if exists "管理员改文章词汇标注" on public.article_inline_annotations;
create policy "管理员改文章词汇标注" on public.article_inline_annotations
  for update using (is_admin()) with check (is_admin());

drop policy if exists "管理员删文章词汇标注" on public.article_inline_annotations;
create policy "管理员删文章词汇标注" on public.article_inline_annotations
  for delete using (is_admin());
