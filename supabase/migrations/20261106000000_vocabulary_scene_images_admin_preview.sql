-- Scene images are admin-only for this release. Retain future pricing data,
-- but do not accept purchases or grant paid access until explicitly opened.
update public.access_projects
set is_enabled = false, updated_at = now()
where project_key = 'vocabulary.scene-images';

update public.access_project_plans
set is_enabled = false, updated_at = now()
where project_key = 'vocabulary.scene-images';
