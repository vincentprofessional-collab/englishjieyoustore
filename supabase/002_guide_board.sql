-- 使用说明帖子沿用 managed_content_pages（slug 以 guide- 开头）。
-- 本迁移只增加公开留言与登录用户点赞所需的数据表。

create table if not exists guide_comments (
  id           uuid primary key default uuid_generate_v4(),
  post_id      uuid not null references managed_content_pages(id) on delete cascade,
  user_id      uuid references profiles(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 30),
  body         text not null check (char_length(body) between 1 and 800),
  status       text not null default 'published'
               check (status in ('published', 'hidden')),
  created_at   timestamptz not null default now()
);

create table if not exists guide_post_likes (
  post_id    uuid not null references managed_content_pages(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_guide_comments_post
  on guide_comments(post_id, created_at);
create index if not exists idx_guide_post_likes_post
  on guide_post_likes(post_id, created_at);

alter table guide_comments enable row level security;
alter table guide_post_likes enable row level security;

create policy "公开读使用说明留言"
  on guide_comments for select
  using (
    status = 'published'
    and post_id in (
      select id
      from managed_content_pages
      where status = 'published' and slug like 'guide-%'
    )
  );

create policy "任何人发布使用说明留言"
  on guide_comments for insert
  with check (
    status = 'published'
    and (user_id = auth.uid() or (auth.uid() is null and user_id is null))
    and post_id in (
      select id
      from managed_content_pages
      where status = 'published' and slug like 'guide-%'
    )
  );

create policy "用户删除自己的使用说明留言"
  on guide_comments for delete
  using (user_id = auth.uid());

create policy "管理员管理使用说明留言"
  on guide_comments for all
  using (is_admin())
  with check (is_admin());

create policy "公开读取使用说明点赞"
  on guide_post_likes for select
  using (
    post_id in (
      select id
      from managed_content_pages
      where status = 'published' and slug like 'guide-%'
    )
  );

create policy "登录用户点赞使用说明帖子"
  on guide_post_likes for insert
  with check (
    user_id = auth.uid()
    and post_id in (
      select id
      from managed_content_pages
      where status = 'published' and slug like 'guide-%'
    )
  );

create policy "登录用户取消自己的点赞"
  on guide_post_likes for delete
  using (user_id = auth.uid());

create policy "管理员管理使用说明点赞"
  on guide_post_likes for all
  using (is_admin())
  with check (is_admin());

grant select, insert on guide_comments to anon, authenticated;
grant delete on guide_comments to authenticated;
grant select on guide_post_likes to anon, authenticated;
grant insert, delete on guide_post_likes to authenticated;
