create table if not exists public.exam_prep_banks (
  exam text not null check (exam in ('cet4', 'cet6', 'postgraduate', 'ielts', 'gre', 'gmat', 'sat')),
  bank_id text not null check (char_length(bank_id) between 1 and 160),
  status text not null default 'published' check (status in ('draft', 'published')),
  title text not null default '',
  category text not null default '',
  source text not null default '',
  bank_data jsonb,
  is_deleted boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (exam, bank_id, status),
  constraint exam_prep_banks_data_state check (
    (is_deleted and bank_data is null)
    or (not is_deleted and bank_data is not null and jsonb_typeof(bank_data) = 'object')
  )
);

alter table public.exam_prep_banks drop constraint if exists exam_prep_banks_exam_check;
alter table public.exam_prep_banks
  add constraint exam_prep_banks_exam_check
  check (exam in ('cet4', 'cet6', 'postgraduate', 'ielts', 'gre', 'gmat', 'sat'));

create index if not exists idx_exam_prep_banks_exam_updated
  on public.exam_prep_banks(exam, updated_at desc);

create index if not exists idx_exam_prep_banks_status
  on public.exam_prep_banks(exam, status, bank_id);

alter table public.exam_prep_banks enable row level security;

drop policy if exists "Public read exam content overrides" on public.exam_prep_banks;
create policy "Public read exam content overrides"
  on public.exam_prep_banks for select
  using (status = 'published' or public.is_admin());

drop policy if exists "Admins manage exam content overrides" on public.exam_prep_banks;
create policy "Admins manage exam content overrides"
  on public.exam_prep_banks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.exam_prep_banks to anon, authenticated;
grant insert, update, delete on public.exam_prep_banks to authenticated;
