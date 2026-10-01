create table if not exists public.bbc_article_syntax_overrides (
  article_id text primary key,
  sentences jsonb not null check (jsonb_typeof(sentences) = 'array'),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.bbc_article_syntax_overrides enable row level security;

drop policy if exists "公开读 BBC 语法标注" on public.bbc_article_syntax_overrides;
drop policy if exists "BBC 会员读语法标注" on public.bbc_article_syntax_overrides;
create policy "BBC 会员读语法标注" on public.bbc_article_syntax_overrides
  for select to authenticated using (public.can_access_project('bbc'));

drop policy if exists "管理员改 BBC 语法标注" on public.bbc_article_syntax_overrides;
create policy "管理员改 BBC 语法标注" on public.bbc_article_syntax_overrides
  for all using (is_admin()) with check (is_admin());

notify pgrst, 'reload schema';
