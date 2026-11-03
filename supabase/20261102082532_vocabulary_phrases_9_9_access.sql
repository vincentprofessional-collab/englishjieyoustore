insert into public.access_projects (
  project_key, title, short_title, gate_title, description, is_enabled, sort_order, updated_at
)
values
  (
    'vocabulary.idiomatic-expressions',
    '地道表达词汇书',
    '地道表达',
    '一次性开通地道表达',
    '一次支付 9.9 元，永久学习地道英语表达、搭配和例句。',
    true,
    16,
    now()
  ),
  (
    'vocabulary.slang-proverbs',
    '俚语俗语词汇书',
    '俚语俗语',
    '一次性开通俚语俗语',
    '一次支付 9.9 元，永久学习英语俚语、俗语和常见习语。',
    true,
    17,
    now()
  )
on conflict (project_key) do update set
  title = excluded.title,
  short_title = excluded.short_title,
  gate_title = excluded.gate_title,
  description = excluded.description,
  is_enabled = true,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.access_project_plans
set is_enabled = (plan = 'lifetime'), updated_at = now()
where project_key in ('vocabulary.idiomatic-expressions', 'vocabulary.slang-proverbs');

insert into public.access_project_plans (
  project_key, plan, label, duration_label, price_cny, is_enabled, sort_order, updated_at
)
values
  ('vocabulary.idiomatic-expressions', 'lifetime', '一次性开通', '永久', 9.9, true, 10, now()),
  ('vocabulary.slang-proverbs', 'lifetime', '一次性开通', '永久', 9.9, true, 10, now())
on conflict (project_key, plan) do update set
  label = excluded.label,
  duration_label = excluded.duration_label,
  price_cny = excluded.price_cny,
  is_enabled = true,
  sort_order = excluded.sort_order,
  updated_at = now();
