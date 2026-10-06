create table if not exists public.bbc_uploaded_articles (
  id text primary key check (id ~ '^[0-9]{6}$'),
  year integer not null check (year between 2015 and 2099),
  month integer not null check (month between 1 and 12),
  article jsonb not null check (jsonb_typeof(article) = 'object'),
  published boolean not null default true,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists bbc_uploaded_articles_year_month_order_idx
  on public.bbc_uploaded_articles (year desc, month desc, created_at desc);

alter table public.bbc_uploaded_articles enable row level security;

drop policy if exists "管理员维护上传的 BBC 文章" on public.bbc_uploaded_articles;
create policy "管理员维护上传的 BBC 文章" on public.bbc_uploaded_articles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant all on public.bbc_uploaded_articles to service_role;

notify pgrst, 'reload schema';
