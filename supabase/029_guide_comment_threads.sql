alter table public.guide_comments
  add column if not exists parent_comment_id uuid
    references public.guide_comments(id) on delete cascade,
  add column if not exists reply_to_comment_id uuid
    references public.guide_comments(id) on delete set null;

create index if not exists guide_comments_thread_created_idx
  on public.guide_comments (post_id, parent_comment_id, created_at asc);

drop policy if exists "任何人发布使用说明留言" on public.guide_comments;
create policy "任何人发布使用说明留言"
  on public.guide_comments for insert
  with check (
    status = 'published'
    and (user_id = auth.uid() or (auth.uid() is null and user_id is null))
    and post_id in (
      select id
      from public.managed_content_pages
      where status = 'published' and slug like 'guide-%'
    )
    and (
      (parent_comment_id is null and reply_to_comment_id is null)
      or (
        parent_comment_id is not null
        and reply_to_comment_id is not null
        and exists (
          select 1
          from public.guide_comments root
          where root.id = guide_comments.parent_comment_id
            and root.post_id = guide_comments.post_id
            and root.parent_comment_id is null
            and root.status = 'published'
        )
        and exists (
          select 1
          from public.guide_comments target
          where target.id = guide_comments.reply_to_comment_id
            and target.post_id = guide_comments.post_id
            and target.status = 'published'
            and (
              target.id = guide_comments.parent_comment_id
              or target.parent_comment_id = guide_comments.parent_comment_id
            )
        )
      )
    )
  );
