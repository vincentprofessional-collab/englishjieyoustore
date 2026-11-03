-- Offer lifetime access to the IELTS listening answer-word practice for a one-time CNY 9.9 payment.
insert into public.access_projects (
  project_key, title, short_title, gate_title, description, is_enabled, sort_order, updated_at
)
values (
  'vocabulary.ielts-listening-answer-words',
  '雅思听力答案词',
  '雅思听力答案词',
  '一次性开通雅思听力答案词',
  '一次支付 9.9 元，永久练习超核心词汇、核心答案词和数字听写。',
  true,
  15,
  now()
)
on conflict (project_key) do update set
  title = excluded.title,
  short_title = excluded.short_title,
  gate_title = excluded.gate_title,
  description = excluded.description,
  is_enabled = true,
  updated_at = now();

update public.access_project_plans
set is_enabled = false, updated_at = now()
where project_key = 'vocabulary.ielts-listening-answer-words'
  and plan <> 'lifetime';

insert into public.access_project_plans (
  project_key, plan, label, duration_label, price_cny, is_enabled, sort_order, updated_at
)
values (
  'vocabulary.ielts-listening-answer-words',
  'lifetime',
  '一次性开通',
  '永久',
  9.9,
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
