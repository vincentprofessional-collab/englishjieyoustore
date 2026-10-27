create table public.site_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  image_urls text[] not null default '{}',
  recipient_type text not null check (recipient_type in ('user', 'visitor')),
  recipient_id uuid not null,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index site_messages_recipient_published_idx
  on public.site_messages (recipient_type, recipient_id, created_at desc)
  where is_published;

create table public.site_message_visitors (
  visitor_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index site_message_visitors_last_seen_idx
  on public.site_message_visitors (last_seen_at desc);

create table public.site_message_reads (
  message_id uuid not null references public.site_messages(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('user', 'visitor')),
  recipient_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (message_id, recipient_type, recipient_id)
);

create index site_message_reads_recipient_idx
  on public.site_message_reads (recipient_type, recipient_id, message_id);

alter table public.site_messages enable row level security;
alter table public.site_message_visitors enable row level security;
alter table public.site_message_reads enable row level security;

revoke all on table public.site_messages, public.site_message_visitors, public.site_message_reads from anon, authenticated;
grant select, insert, update, delete on table public.site_messages, public.site_message_visitors, public.site_message_reads to service_role;
