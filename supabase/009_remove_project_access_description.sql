-- ============================================================
-- Remove project access paywall description copy
-- ============================================================

update access_projects
set
  description = null,
  updated_at = now()
where project_key = 'bbc';

update feature_access_rules
set
  description = null,
  updated_at = now()
where feature_key = 'articles.foreign_article';
