-- Keep scene-image access behind its own lifetime entitlement.
-- Administrators have free access; other users need this project entitlement.

insert into public.access_projects (
  project_key,
  title,
  short_title,
  gate_title,
  description,
  is_enabled,
  sort_order,
  updated_at
)
values (
  'vocabulary.scene-images',
  '场景图片词汇学习',
  '场景图片',
  '一次性开通场景图片记忆',
  '一次支付 29.9 元，终身使用场景图片记忆模式。',
  true,
  18,
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
where project_key = 'vocabulary.scene-images';

insert into public.access_project_plans (
  project_key,
  plan,
  label,
  duration_label,
  price_cny,
  is_enabled,
  sort_order,
  updated_at
)
values (
  'vocabulary.scene-images',
  'lifetime',
  '一次性开通',
  '永久',
  29.9,
  true,
  10,
  now()
)
on conflict (project_key, plan) do update set
  label = excluded.label,
  duration_label = excluded.duration_label,
  price_cny = excluded.price_cny,
  is_enabled = true,
  sort_order = excluded.sort_order,
  updated_at = now();
