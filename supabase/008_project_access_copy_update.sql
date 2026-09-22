-- ============================================================
-- Update project access display copy
-- ============================================================

update access_projects
set
  title = '《BBC随身英语》',
  description = null,
  updated_at = now()
where project_key = 'bbc';

update feature_access_rules
set
  title = 'BBC随身英语',
  access_level = 'paid',
  description = null,
  updated_at = now()
where feature_key = 'articles.foreign_article';
