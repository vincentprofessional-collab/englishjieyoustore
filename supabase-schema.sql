-- ============================================================
-- IELTS 听力/阅读/写作 平台 — 完整数据库 Schema
-- 技术栈: Supabase (PostgreSQL) + Next.js
-- 命名约定: CI4_t2_s2_015.mp3 (书_test_section_句子序号)
-- ============================================================

-- 0. 扩展
create extension if not exists "uuid-ossp";

-- 1. 辅助函数
-- 检查当前用户是否为管理员
create or replace function is_admin()
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- PART A: 题库核心结构
-- ============================================================

-- A1. 书 (如 "剑桥雅思4", "剑桥雅思5")
create table books (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  slug        text not null unique,          -- "CI4", "CI5"
  description text,
  created_at  timestamptz default now()
);

-- A2. 测试 (如 "Test 2")
create table tests (
  id          uuid primary key default uuid_generate_v4(),
  book_id     uuid not null references books(id) on delete cascade,
  test_number int  not null check (test_number between 1 and 4),
  test_type   text not null check (test_type in ('listening', 'reading', 'writing')),
  title       text,
  created_at  timestamptz default now(),
  unique (book_id, test_number, test_type)
);

-- A3. Section (听力 Section 1-4 / 阅读 Passage 1-3)
create table sections (
  id                  uuid primary key default uuid_generate_v4(),
  test_id             uuid not null references tests(id) on delete cascade,
  section_number      int  not null check (section_number between 1 and 4),
  title               text,
  section_type        text not null default 'listening'
                      check (section_type in ('listening', 'reading', 'writing')),

  -- 第一版: 题目用图片
  question_image_url  text,

  -- 题目数量 (听力/阅读每题10题 = 固定; 写作无题)
  question_count      int  default 10,

  -- 模考限时 (分钟)
  time_limit_minutes  int  default 30,

  -- 整段完整音频 (仅听力)
  full_audio_file     text,      -- 如 "CI4/t2/s2/CI4_t2_s2_full.mp3"
  full_audio_duration decimal,   -- 秒

  created_at          timestamptz default now(),
  unique (test_id, section_number)
);

-- A4. 题目
create table questions (
  id                  uuid primary key default uuid_generate_v4(),
  section_id          uuid not null references sections(id) on delete cascade,
  question_number     int  not null check (question_number between 1 and 40),
  question_type       text not null
                      check (question_type in (
                        'fill_blank', 'multiple_choice', 'matching',
                        'map', 'form', 'table', 'flowchart',
                        'sentence_completion', 'summary', 'short_answer'
                      )),
  question_text       text,          -- 结构化题干文本 (第二版用)
  correct_answer      text not null, -- 标准答案
  acceptable_answers  text[] default '{}', -- 同义可接受答案
  points              int  default 1,
  sort_order          int  not null,
  created_at          timestamptz default now(),
  unique (section_id, question_number)
);

-- ============================================================
-- PART B: 听力原文 (逐句)
-- ============================================================

create table transcript_sentences (
  id              uuid primary key default uuid_generate_v4(),
  section_id      uuid not null references sections(id) on delete cascade,
  sentence_number int  not null,
  english         text not null,
  chinese         text not null,
  audio_file      text,            -- 如 "CI4/t2/s2/CI4_t2_s2_015.mp3"
  start_timestamp decimal,         -- 在整段音频中的起始秒数
  end_timestamp   decimal,         -- 在整段音频中的结束秒数
  sort_order      int  not null,
  created_at      timestamptz default now(),
  unique (section_id, sentence_number)
);

-- ============================================================
-- PART C: 阅读原文 (段落 + 句子)
-- ============================================================

-- C1. 段落
create table passage_paragraphs (
  id               uuid primary key default uuid_generate_v4(),
  section_id       uuid not null references sections(id) on delete cascade,
  paragraph_number int  not null,
  english          text not null,
  chinese          text not null,
  sort_order       int  not null,
  created_at       timestamptz default now(),
  unique (section_id, paragraph_number)
);

-- C2. 段落内的句子 (对齐高亮)
create table passage_sentences (
  id              uuid primary key default uuid_generate_v4(),
  paragraph_id    uuid not null references passage_paragraphs(id) on delete cascade,
  sentence_number int  not null,
  english         text not null,
  chinese         text not null,
  sort_order      int  not null,
  created_at      timestamptz default now(),
  unique (paragraph_id, sentence_number)
);

-- ============================================================
-- PART D: 标注/高亮系统 (核心)
-- ============================================================
-- 统一处理三种标注:
--   answer_word    → 答案标红 (需 char_start, char_end, word_text)
--   answer_sentence → 答案句高亮黄 (关联题号)
--   stem_sentence  → 题干句高亮蓝 (关联题号)
-- 听力 → listening_sentence_id; 阅读 → reading_sentence_id

create table annotations (
  id                     uuid primary key default uuid_generate_v4(),
  section_id             uuid not null references sections(id) on delete cascade,
  question_id            uuid not null references questions(id) on delete cascade,

  listening_sentence_id  uuid references transcript_sentences(id) on delete cascade,
  reading_sentence_id    uuid references passage_sentences(id) on delete cascade,

  annotation_type        text not null
                         check (annotation_type in ('answer_word', 'answer_sentence', 'stem_sentence')),

  -- 仅 answer_word 需要以下字段
  char_start             int,    -- 词在句子中的起始字符位置 (0-based)
  char_end               int,    -- 结束字符位置
  word_text              text,   -- 标注的词

  created_at             timestamptz default now(),

  constraint annotations_target_check check (
    (listening_sentence_id is not null and reading_sentence_id is null)
    or (listening_sentence_id is null and reading_sentence_id is not null)
  ),

  unique (listening_sentence_id, reading_sentence_id, question_id, annotation_type, char_start, char_end)
);

create index idx_annotations_section             on annotations(section_id);
create index idx_annotations_question            on annotations(question_id);
create index idx_annotations_listening_sentence  on annotations(listening_sentence_id);
create index idx_annotations_reading_sentence    on annotations(reading_sentence_id);
create index idx_annotations_type                on annotations(annotation_type);

-- ============================================================
-- PART E: 用户系统
-- ============================================================

create table profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text,
  display_name         text,
  avatar_url           text,
  role                 text not null default 'user'
                       check (role in ('user', 'admin')),
  is_member            boolean default false,
  membership_expires_at timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- 用户注册时自动创建 profile
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- PART F: 考试记录
-- ============================================================

-- F1. 答题记录 (一次模考/练习)
create table attempts (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references profiles(id) on delete cascade,
  section_id        uuid not null references sections(id) on delete cascade,
  mode              text not null check (mode in ('mock', 'practice')),
  status            text not null default 'in_progress'
                    check (status in ('in_progress', 'submitted', 'timed_out')),
  started_at        timestamptz not null default now(),
  submitted_at      timestamptz,
  score             int,
  total_questions   int,
  correct_count     int,
  created_at        timestamptz default now()
);

create index idx_attempts_user    on attempts(user_id);
create index idx_attempts_section on attempts(section_id);

-- F2. 每道题的作答
create table responses (
  id           uuid primary key default uuid_generate_v4(),
  attempt_id   uuid not null references attempts(id) on delete cascade,
  question_id  uuid not null references questions(id) on delete cascade,
  user_answer  text,
  is_correct   boolean,
  answered_at  timestamptz default now(),
  unique (attempt_id, question_id)
);

-- ============================================================
-- PART G: 词汇系统
-- ============================================================

create table vocabulary (
  id                 uuid primary key default uuid_generate_v4(),
  word               text not null unique,
  phonetic           text,          -- /ˈeksəmpəl/
  part_of_speech     text,          -- n. / v. / adj.
  definition         text,          -- 英文释义
  chinese_definition text,          -- 中文释义
  example_sentence   text,
  source             text,          -- "IELTS", "BBC", "CET6"
  created_at         timestamptz default now()
);

-- 用户单词本 (付费功能)
create table user_vocabulary (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id) on delete cascade,
  vocabulary_id  uuid not null references vocabulary(id) on delete cascade,
  added_at       timestamptz default now(),
  unique (user_id, vocabulary_id)
);

-- ============================================================
-- PART H: 写作模块
-- ============================================================

create table writing_tasks (
  id               uuid primary key default uuid_generate_v4(),
  test_id          uuid references tests(id) on delete set null,
  type             text not null check (type in ('small', 'large')),
  title            text not null,
  prompt_text      text not null,        -- 题目描述
  prompt_image_url text,                 -- 小作文图表图片
  sort_order       int,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table writing_samples (
  id               uuid primary key default uuid_generate_v4(),
  writing_task_id  uuid not null references writing_tasks(id) on delete cascade,
  title            text,
  content          text not null,
  is_premium       boolean default true, -- true = 需付费才能看
  sort_order       int,
  created_at       timestamptz default now()
);

create table writing_submissions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references profiles(id) on delete cascade,
  writing_task_id  uuid not null references writing_tasks(id) on delete cascade,
  content          text not null,
  word_count       int not null default 0,
  submitted_at     timestamptz default now()
);

-- ============================================================
-- PART I: 行级安全策略 (Row Level Security)
-- ============================================================

-- 题库内容: 所有人可读
alter table books               enable row level security;
alter table tests               enable row level security;
alter table sections            enable row level security;
alter table questions           enable row level security;
alter table transcript_sentences enable row level security;
alter table passage_paragraphs  enable row level security;
alter table passage_sentences   enable row level security;
alter table annotations         enable row level security;
alter table vocabulary          enable row level security;
alter table writing_tasks       enable row level security;
alter table writing_samples     enable row level security;

-- 用户数据
alter table profiles            enable row level security;
alter table attempts            enable row level security;
alter table responses           enable row level security;
alter table user_vocabulary     enable row level security;
alter table writing_submissions enable row level security;

-- I1. 公共读
create policy "内容公开读" on books               for select using (true);
create policy "内容公开读" on tests               for select using (true);
create policy "内容公开读" on sections            for select using (true);
create policy "内容公开读" on questions           for select using (true);
create policy "内容公开读" on transcript_sentences for select using (true);
create policy "内容公开读" on passage_paragraphs  for select using (true);
create policy "内容公开读" on passage_sentences   for select using (true);
create policy "内容公开读" on annotations         for select using (true);
create policy "词汇公开读" on vocabulary          for select using (true);
create policy "写作题目公开读" on writing_tasks     for select using (true);
create policy "范文公开读"   on writing_samples   for select using (true); -- 付费检查在应用层

-- I2. 管理员写
do $$
declare
  tables_with_admin_rls text[] := array[
    'books', 'tests', 'sections', 'questions',
    'transcript_sentences', 'passage_paragraphs', 'passage_sentences',
    'annotations', 'vocabulary', 'writing_tasks', 'writing_samples'
  ];
  t text;
begin
  foreach t in array tables_with_admin_rls
  loop
    execute format('create policy "管理员增" on %I for insert with check (is_admin())', t);
    execute format('create policy "管理员改" on %I for update using (is_admin())', t);
    execute format('create policy "管理员删" on %I for delete using (is_admin())', t);
  end loop;
end;
$$;

-- I3. 用户自己管理自己的 profile
create policy "用户看自己" on profiles for select using (auth.uid() = id or is_admin());
create policy "用户改自己" on profiles for update using (auth.uid() = id);
create policy "管理员看所有" on profiles for select using (is_admin());

-- I4. 答题记录
create policy "用户管理自己的答题" on attempts  for all using (user_id = auth.uid());
create policy "管理员看所有答题"   on attempts  for select using (is_admin());
create policy "用户管理自己的作答" on responses for all using (
  attempt_id in (select id from attempts where user_id = auth.uid())
);

-- I5. 单词本
create policy "用户管理自己的单词本" on user_vocabulary for all using (user_id = auth.uid());

-- I6. 写作提交
create policy "用户管理自己的作文" on writing_submissions for all using (user_id = auth.uid());

-- ============================================================
-- PART J: 存储桶结构 (手动在 Supabase Dashboard 创建)
-- ============================================================
-- 需要创建以下 Storage Buckets:
--
-- 1. audio (公开读)
--    结构:  {book_slug}/t{test}/s{section}/{filename}
--    示例:  CI4/t2/s2/CI4_t2_s2_015.mp3
--           CI4/t2/s2/CI4_t2_s2_full.mp3
--
-- 2. images (公开读)
--    结构:  questions/{book_slug}_t{test}_s{section}.png
--           writing/{filename}.png
--
-- RLS for Storage:
--   Bucket 'audio': 公开读, 仅管理员上传/删除
--   Bucket 'images': 公开读, 仅管理员上传/删除

-- ============================================================
-- PART K: 初始管理员设置 (首次部署后执行)
-- ============================================================
-- 1. 在 Supabase Auth 创建一个用户 (邮箱/密码)
-- 2. 在 profiles 表将该用户 role 设为 'admin':
--    update profiles set role = 'admin' where id = 'your-auth-user-id';

-- ============================================================
-- 完成
-- ============================================================
