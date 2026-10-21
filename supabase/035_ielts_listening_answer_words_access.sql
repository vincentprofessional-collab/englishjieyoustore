-- Add a separately payable project for the IELTS listening answer-word writing drills.
-- The existing admin project-access screen edits the gate copy/prices and grants entitlements.

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
  'vocabulary.ielts-listening-answer-words',
  '雅思听力答案词',
  '雅思听力答案词',
  '开通雅思听力答案词写作训练',
  '开通后可练习剑雅听力答案词、超核心高频词，以及数字与拼写特辑。按原词表顺序听音并完成拼写。',
  true,
  15,
  now()
)
on conflict (project_key) do nothing;

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
values
  ('vocabulary.ielts-listening-answer-words', 'monthly', '月卡', '一个月', 9, true, 10, now()),
  ('vocabulary.ielts-listening-answer-words', 'quarterly', '季卡', '三个月', 19, true, 20, now()),
  ('vocabulary.ielts-listening-answer-words', 'yearly', '年卡', '一年', 69, true, 30, now()),
  ('vocabulary.ielts-listening-answer-words', 'lifetime', '终身', '永久', 199, true, 40, now())
on conflict (project_key, plan) do nothing;
