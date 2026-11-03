alter table public.access_projects
  add column if not exists title_font_family text not null default 'serif'
    check (title_font_family in ('serif', 'sans')),
  add column if not exists title_font_size smallint not null default 36
    check (title_font_size between 18 and 72),
  add column if not exists description_font_family text not null default 'serif'
    check (description_font_family in ('serif', 'sans')),
  add column if not exists description_font_size smallint not null default 18
    check (description_font_size between 12 and 40);

create or replace function public.admin_upsert_access_project_with_typography(
  _project_key text,
  _title text,
  _short_title text,
  _gate_title text,
  _description text,
  _is_enabled boolean,
  _sort_order integer,
  _title_font_family text,
  _title_font_size smallint,
  _description_font_family text,
  _description_font_size smallint,
  _plans jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can update project catalog typography.';
  end if;
  if _title_font_family not in ('serif', 'sans')
    or _description_font_family not in ('serif', 'sans')
    or _title_font_size not between 18 and 72
    or _description_font_size not between 12 and 40 then
    raise exception 'Invalid access project typography settings.';
  end if;

  perform public.admin_upsert_access_project(
    _project_key, _title, _short_title, _gate_title, _description,
    _is_enabled, _sort_order, _plans
  );

  update public.access_projects
  set title_font_family = _title_font_family,
      title_font_size = _title_font_size,
      description_font_family = _description_font_family,
      description_font_size = _description_font_size,
      updated_at = now()
  where project_key = lower(trim(_project_key));
end;
$$;

revoke all on function public.admin_upsert_access_project_with_typography(
  text, text, text, text, text, boolean, integer, text, smallint, text, smallint, jsonb
) from public;
grant execute on function public.admin_upsert_access_project_with_typography(
  text, text, text, text, text, boolean, integer, text, smallint, text, smallint, jsonb
) to authenticated;
