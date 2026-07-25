-- ============================================================
-- IELTS 听说读写平台 — 初始 Schema v1
-- 适用: Supabase (PostgreSQL 15+)
-- 命名: 全小写 + 下划线
-- 音频字段建议存 bucket 内部路径，不带 bucket 名:
-- listening/ci4/t2/s2/sentences/ci4_t2_s2_015.mp3
-- ============================================================

-- 0. 插件
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- ============================================================
-- PART 0B: 功能级付费开关
-- ============================================================
-- 后台一键切换：把 access_level 从 free 改为 paid 即可。
-- 内容表里的 is_paid_only / access_feature_key 用于更细粒度控制。

create table feature_access_rules (
  feature_key     text primary key,                    -- "writing.sample_full"
  module          text not null
                  check (module in ('listening', 'reading', 'speaking', 'writing', 'vocabulary', 'training', 'articles', 'site')),
  title           text not null,                       -- 后台显示名
  description     text,
  access_level    text not null default 'free'
                  check (access_level in ('free', 'paid')),
  is_enabled      boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

insert into feature_access_rules (feature_key, module, title, description, access_level, sort_order)
values
  ('listening.practice',          'listening',  '雅思听力做题',      '模考 / 练习 / 单句精听；第一阶段免费',              'free', 10),
  ('reading.practice',            'reading',    '雅思阅读做题',      '模考 / 练习；第一阶段免费',                       'free', 20),
  ('speaking.question_image',     'speaking',   '口语题目图片',      '题目图片和基础题目信息',                         'free', 30),
  ('speaking.high_score_idea',    'speaking',   '口语高分思路',      '高分思路免费展示',                               'free', 31),
  ('speaking.sentence_patterns',  'speaking',   '口语万能句型',      '从万能句型开始收费',                            'paid', 32),
  ('speaking.premium_content',    'speaking',   '口语付费内容',      '重点词汇、范文、翻译、音频、复述训练等',          'paid', 33),
  ('writing.task_editor',         'writing',    '写作题目和输入框',  '题目、输入框、字数统计',                          'free', 40),
  ('writing.sample_preview',      'writing',    '写作范文预览',      '免费展示范文预览',                               'free', 41),
  ('writing.sample_full',         'writing',    '写作范文全文',      '完整范文内容，默认付费',                          'paid', 42),
  ('writing.lessons',             'writing',    '写作课程内容',      '审题、规划、逻辑图、逐句练习、句子结构分析',      'paid', 43),
  ('training.translation',        'training',   '写作翻译训练',      '中文到英文、改写、合并句子等专项训练；长期收费',    'paid', 50),
  ('vocabulary.dictionary',       'vocabulary', '查单词',            '搜索、模糊匹配、词条详情；第一阶段免费',          'free', 60),
  ('vocabulary.wordbook',         'vocabulary', '生词本',            '收藏和管理生词；第一阶段免费',                    'free', 61),
  ('vocabulary.srs',              'vocabulary', '背单词',            '每日新词和 SRS 复习；第一阶段免费',               'free', 62),
  ('vocabulary.books',            'vocabulary', '词汇书',            '词汇书学习入口；第一阶段免费，后期可单独付费',    'free', 63),
  ('vocabulary.entry_detail',     'vocabulary', '词汇详情页',        '音标、释义、例句、词源树、视频和图片等',          'free', 64),
  ('vocabulary.media',            'vocabulary', '词汇拓展素材',      '词源树、视频、图片、相关词等拓展内容',            'free', 65),
  ('articles.foreign_article',    'articles',   '外刊精读',          '外刊文章、音频、逐句中英、句子音频和高亮',        'free', 68),
  ('site.announcements',          'site',       '信息发布',          '最新消息、公告、文章内容',                        'free', 70),
  ('site.contact',                'site',       '联系我们',          '联系方式、表单、二维码、地图等内容',              'free', 80)
on conflict (feature_key) do nothing;

create index idx_feature_access_rules_module
  on feature_access_rules(module, sort_order);
create index idx_feature_access_rules_access_level
  on feature_access_rules(access_level);

-- 后台网页上传模板：让后台录入表单和前台页面结构保持一致。
create table content_page_templates (
  template_key    text primary key,                    -- "speaking_topic_page"
  module          text not null
                  check (module in ('listening', 'reading', 'speaking', 'writing', 'vocabulary', 'training', 'articles', 'site')),
  title           text not null,
  description     text,
  schema_json     jsonb not null default '{}',          -- 页面级配置/解析提示；区块顺序以 content_page_template_sections.sort_order 为准
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

insert into content_page_templates (template_key, module, title, description, schema_json, sort_order)
values
  (
    'speaking_topic_page',
    'speaking',
    '口语题目页',
    '题目图片和高分思路免费，万能句型及下方内容付费',
    '{"sections":["basic_info","question_image","high_score_idea","sentence_patterns","vocabulary","sample_answer","translation","audio","retell_practice"]}'::jsonb,
    10
  ),
  (
    'writing_task_page',
    'writing',
    '写作题目页',
    '题目、输入框和范文预览免费，范文全文和课程内容付费',
    '{"sections":["task","sample_preview","sample_full","question_analysis","essay_plan","logic_map","sentence_practice","structure_analysis"]}'::jsonb,
    20
  ),
  (
    'listening_section_page',
    'listening',
    '听力 Section 页',
    '题目文本/可选题目图片、整篇音频、逐句音频、原文、高亮和答案',
    '{"sections":["section_info","question_text","question_image","questions","full_audio","transcript_sentences","highlights","answers"]}'::jsonb,
    30
  ),
  (
    'reading_passage_page',
    'reading',
    '阅读 Passage 页',
    '题目文本/可选题目图片、段落句子、中文翻译、高亮和答案',
    '{"sections":["section_info","question_text","question_image","questions","paragraphs","sentences","highlights","answers"]}'::jsonb,
    40
  ),
  (
    'training_translation_page',
    'training',
    '写作翻译训练页',
    '中文到英文、英文改写、两句合并等专项训练',
    '{"sections":["category","prompt","reference_answer","explanation","image"]}'::jsonb,
    50
  ),
  (
    'dictionary_lookup_page',
    'vocabulary',
    '查单词页',
    '搜索框、搜索结果、热门词和查词入口',
    '{"sections":["search_box","result_list","hot_words","recent_lookup","wordbook_entry"]}'::jsonb,
    55
  ),
  (
    'vocabulary_entry_page',
    'vocabulary',
    '词汇详情页',
    '音标、发音、英英解释、中文释义、词源树、视频、图片、例句和相关词',
    '{"sections":["word_header","pronunciation","definition_cn","definition_en","word_forms","etymology_tree","examples","images","videos","related_words","wordbook_action"]}'::jsonb,
    58
  ),
  (
    'vocabulary_book_page',
    'vocabulary',
    '词汇书页',
    '词条、中文夹英文例句、挖空句、封面、视频和 SRS 复习字段',
    '{"sections":["book_info","cover_image","intro_video","vocabulary_entries","examples","cloze","srs_settings"]}'::jsonb,
    60
  ),
  (
    'foreign_article_page',
    'articles',
    '外刊精读页',
    '文章信息、来源、整篇音频、逐句中英、句子音频、高亮和重点词汇',
    '{"sections":["article_meta","source_info","cover_image","full_audio","article_sentences","sentence_audio","highlights","vocabulary","notes"]}'::jsonb,
    68
  ),
  (
    'site_announcement_page',
    'site',
    '信息发布页',
    '最新消息、公告、文章、封面图和附件',
    '{"sections":["announcement_meta","cover_image","content","attachments","publish_settings"]}'::jsonb,
    70
  ),
  (
    'contact_page',
    'site',
    '联系我们页',
    '联系方式、联系表单、二维码、地图和常见问题',
    '{"sections":["contact_methods","contact_form","wechat_qr","map_image","faq"]}'::jsonb,
    80
  )
on conflict (template_key) do nothing;

create index idx_content_page_templates_module
  on content_page_templates(module, sort_order);

-- 后台页面框架区块：支持新增区块、隐藏区块、调整区块顺序。
create table content_page_template_sections (
  id                 uuid primary key default uuid_generate_v4(),
  template_key       text not null references content_page_templates(template_key) on delete cascade,
  section_key        text not null,                    -- "sample_answer", "audio"
  title              text not null,                    -- 后台显示名
  description        text,
  component_type     text not null default 'rich_text'
                     check (component_type in (
                       'text',
                       'rich_text',
                       'image',
                       'audio',
                       'video',
                       'file',
                       'json',
                       'list',
                       'media_gallery',
                       'definition_editor',
                       'etymology_tree',
                       'link_list',
                       'announcement_editor',
                       'contact_form',
                       'question_editor',
                       'answer_editor',
                       'transcript_editor',
                       'highlight_editor',
                       'practice_editor',
                       'vocabulary_editor'
                     )),
  is_required        boolean not null default false,
  is_repeatable      boolean not null default false,
  is_active          boolean not null default true,
  default_collapsed  boolean not null default false,
  is_paid_by_default boolean not null default false,    -- 后台新建正式内容时的默认付费状态
  access_feature_key text references feature_access_rules(feature_key) on delete set null,
  settings_json      jsonb not null default '{}',
  sort_order         int not null default 0,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique (template_key, section_key)
);

insert into content_page_template_sections (
  template_key, section_key, title, component_type,
  is_required, is_repeatable, is_paid_by_default, access_feature_key, sort_order
)
values
  -- 口语：高分思路免费，万能句型以及下方内容付费
  ('speaking_topic_page', 'basic_info',        '基础信息',   'text',      true,  false, false, 'speaking.question_image',    10),
  ('speaking_topic_page', 'question_image',    '题目图片',   'image',     false, false, false, 'speaking.question_image',    20),
  ('speaking_topic_page', 'high_score_idea',   '高分思路',   'rich_text', true,  false, false, 'speaking.high_score_idea',   30),
  ('speaking_topic_page', 'sentence_patterns', '万能句型',   'list',      false, true,  true,  'speaking.sentence_patterns', 40),
  ('speaking_topic_page', 'vocabulary',        '重点词汇',   'list',      false, true,  true,  'speaking.premium_content',   50),
  ('speaking_topic_page', 'sample_answer',     '口语范文',   'rich_text', false, false, true,  'speaking.premium_content',   60),
  ('speaking_topic_page', 'translation',       '中文翻译',   'rich_text', false, false, true,  'speaking.premium_content',   70),
  ('speaking_topic_page', 'audio',             '音频',       'audio',     false, true,  true,  'speaking.premium_content',   80),
  ('speaking_topic_page', 'retell_practice',   '复述训练',   'practice_editor', false, true, true, 'speaking.premium_content', 90),

  -- 写作：题目/输入框/预览免费，范文全文和学习区付费
  ('writing_task_page', 'task',               '题目与输入框', 'text',      true,  false, false, 'writing.task_editor',    10),
  ('writing_task_page', 'sample_preview',     '范文预览',     'rich_text', false, false, false, 'writing.sample_preview', 20),
  ('writing_task_page', 'sample_full',        '范文全文',     'rich_text', false, false, true,  'writing.sample_full',    30),
  ('writing_task_page', 'question_analysis',  '审题分析',     'rich_text', false, false, true,  'writing.lessons',        40),
  ('writing_task_page', 'essay_plan',         '段落规划',     'rich_text', false, false, true,  'writing.lessons',        50),
  ('writing_task_page', 'logic_map',          '逻辑图',       'json',      false, false, true,  'writing.lessons',        60),
  ('writing_task_page', 'sentence_practice',  '逐句练习',     'practice_editor', false, true, true, 'writing.lessons',     70),
  ('writing_task_page', 'structure_analysis', '句子结构分析', 'rich_text', false, false, true,  'writing.lessons',        80),

  -- 听力/阅读：第一阶段免费，但保留功能级开关
  ('listening_section_page', 'section_info',         'Section 信息', 'text', true, false, false, 'listening.practice', 10),
  ('listening_section_page', 'question_text',        '题目文本',     'rich_text', false, false, false, 'listening.practice', 20),
  ('listening_section_page', 'question_image',       '题目图片',     'image', false, false, false, 'listening.practice', 30),
  ('listening_section_page', 'questions',            '结构化题目',   'question_editor', false, true, false, 'listening.practice', 40),
  ('listening_section_page', 'full_audio',           '完整音频',     'audio', false, false, false, 'listening.practice', 50),
  ('listening_section_page', 'transcript_sentences', '逐句原文',     'transcript_editor', true, true, false, 'listening.practice', 60),
  ('listening_section_page', 'highlights',           '答案高亮',     'highlight_editor', false, true, false, 'listening.practice', 70),
  ('listening_section_page', 'answers',              '题目答案',     'answer_editor', false, true, false, 'listening.practice', 80),

  ('reading_passage_page', 'section_info',  'Passage 信息', 'text', true, false, false, 'reading.practice', 10),
  ('reading_passage_page', 'question_text', '题目文本',      'rich_text', false, false, false, 'reading.practice', 20),
  ('reading_passage_page', 'question_image','题目图片',      'image', false, false, false, 'reading.practice', 30),
  ('reading_passage_page', 'questions',     '结构化题目',    'question_editor', false, true, false, 'reading.practice', 40),
  ('reading_passage_page', 'paragraphs',    '阅读段落',      'rich_text', true, true, false, 'reading.practice', 50),
  ('reading_passage_page', 'sentences',     '阅读句子',      'rich_text', false, true, false, 'reading.practice', 60),
  ('reading_passage_page', 'highlights',    '答案高亮',      'highlight_editor', false, true, false, 'reading.practice', 70),
  ('reading_passage_page', 'answers',       '题目答案',      'answer_editor', false, true, false, 'reading.practice', 80),

  -- 写作翻译训练：一直收费
  ('training_translation_page', 'category',         '训练分类',   'text', true, false, true, 'training.translation', 10),
  ('training_translation_page', 'prompt',           '训练题目',   'text', true, false, true, 'training.translation', 20),
  ('training_translation_page', 'reference_answer', '参考答案',   'rich_text', false, false, true, 'training.translation', 30),
  ('training_translation_page', 'explanation',      '答案解析',   'rich_text', false, false, true, 'training.translation', 40),
  ('training_translation_page', 'image',            '配图',       'image', false, false, true, 'training.translation', 50),

  -- 词汇书：第一阶段免费，后期可按词汇书单独收费
  ('dictionary_lookup_page', 'search_box',     '搜索框',     'text', false, false, false, 'vocabulary.dictionary', 10),
  ('dictionary_lookup_page', 'result_list',    '搜索结果',   'list', false, true,  false, 'vocabulary.dictionary', 20),
  ('dictionary_lookup_page', 'hot_words',      '热门词汇',   'list', false, true,  false, 'vocabulary.dictionary', 30),
  ('dictionary_lookup_page', 'recent_lookup',  '最近查词',   'list', false, true,  false, 'vocabulary.dictionary', 40),
  ('dictionary_lookup_page', 'wordbook_entry', '加入生词本', 'text', false, false, false, 'vocabulary.wordbook',    50),

  ('vocabulary_entry_page', 'word_header',     '单词头部',   'text',              true,  false, false, 'vocabulary.entry_detail', 10),
  ('vocabulary_entry_page', 'pronunciation',   '音标与发音', 'audio',             false, true,  false, 'vocabulary.entry_detail', 20),
  ('vocabulary_entry_page', 'definition_cn',   '中文释义',   'definition_editor', true,  true,  false, 'vocabulary.entry_detail', 30),
  ('vocabulary_entry_page', 'definition_en',   '英英解释',   'definition_editor', false, true,  false, 'vocabulary.entry_detail', 40),
  ('vocabulary_entry_page', 'word_forms',      '词形变化',   'json',              false, false, false, 'vocabulary.entry_detail', 50),
  ('vocabulary_entry_page', 'etymology_tree',  '词源树',     'etymology_tree',    false, false, false, 'vocabulary.media',        60),
  ('vocabulary_entry_page', 'examples',        '例句库',     'rich_text',         false, true,  false, 'vocabulary.entry_detail', 70),
  ('vocabulary_entry_page', 'images',          '图片',       'media_gallery',     false, true,  false, 'vocabulary.media',        80),
  ('vocabulary_entry_page', 'videos',          '视频',       'video',             false, true,  false, 'vocabulary.media',        90),
  ('vocabulary_entry_page', 'related_words',   '相关词',     'link_list',         false, true,  false, 'vocabulary.entry_detail', 100),
  ('vocabulary_entry_page', 'wordbook_action', '生词本按钮', 'text',              false, false, false, 'vocabulary.wordbook',     110),

  ('vocabulary_book_page', 'book_info',          '词汇书信息', 'text', true, false, false, 'vocabulary.books', 10),
  ('vocabulary_book_page', 'cover_image',        '封面图',     'image', false, false, false, 'vocabulary.books', 20),
  ('vocabulary_book_page', 'intro_video',        '介绍视频',   'video', false, false, false, 'vocabulary.media', 30),
  ('vocabulary_book_page', 'vocabulary_entries', '词条',       'vocabulary_editor', true, true, false, 'vocabulary.books', 40),
  ('vocabulary_book_page', 'examples',           '例句',       'rich_text', false, true, false, 'vocabulary.books', 50),
  ('vocabulary_book_page', 'cloze',              '挖空句',     'text', false, true, false, 'vocabulary.books', 60),
  ('vocabulary_book_page', 'srs_settings',       '复习设置',   'json', false, false, false, 'vocabulary.srs', 70),

  -- 外刊精读：复用听力逐句逻辑，支持整篇音频、单句音频、中英对照和高亮
  ('foreign_article_page', 'article_meta',      '文章信息',   'text', true, false, false, 'articles.foreign_article', 10),
  ('foreign_article_page', 'source_info',       '来源信息',   'link_list', false, false, false, 'articles.foreign_article', 20),
  ('foreign_article_page', 'cover_image',       '封面图',     'image', false, false, false, 'articles.foreign_article', 30),
  ('foreign_article_page', 'full_audio',        '完整音频',   'audio', false, false, false, 'articles.foreign_article', 40),
  ('foreign_article_page', 'article_sentences', '逐句中英',   'transcript_editor', true, true, false, 'articles.foreign_article', 50),
  ('foreign_article_page', 'sentence_audio',    '单句音频',   'audio', false, true, false, 'articles.foreign_article', 60),
  ('foreign_article_page', 'highlights',        '重点高亮',   'highlight_editor', false, true, false, 'articles.foreign_article', 70),
  ('foreign_article_page', 'vocabulary',        '重点词汇',   'vocabulary_editor', false, true, false, 'articles.foreign_article', 80),
  ('foreign_article_page', 'notes',             '老师备注',   'rich_text', false, true, false, 'articles.foreign_article', 90),

  -- 站点内容：信息发布和联系我们也走框架区块，方便后台维护
  ('site_announcement_page', 'announcement_meta', '文章信息', 'text', false, false, false, 'site.announcements', 10),
  ('site_announcement_page', 'cover_image',       '封面图',   'image', false, false, false, 'site.announcements', 20),
  ('site_announcement_page', 'content',           '正文内容', 'announcement_editor', true, false, false, 'site.announcements', 30),
  ('site_announcement_page', 'attachments',       '附件',     'file', false, true, false, 'site.announcements', 40),
  ('site_announcement_page', 'publish_settings',  '发布设置', 'json', false, false, false, 'site.announcements', 50),

  ('contact_page', 'contact_methods', '联系方式', 'link_list', false, true, false, 'site.contact', 10),
  ('contact_page', 'contact_form',    '联系表单', 'contact_form', false, false, false, 'site.contact', 20),
  ('contact_page', 'wechat_qr',       '微信二维码', 'image', false, true, false, 'site.contact', 30),
  ('contact_page', 'map_image',       '地图/地址图', 'image', false, false, false, 'site.contact', 40),
  ('contact_page', 'faq',             '常见问题', 'rich_text', false, true, false, 'site.contact', 50)
on conflict (template_key, section_key) do nothing;

create index idx_content_page_template_sections_template
  on content_page_template_sections(template_key, sort_order);
create index idx_content_page_template_sections_active
  on content_page_template_sections(is_active, sort_order);

-- ============================================================
-- PART 1: 题库核心
-- ============================================================

-- 1.1 书（如"剑桥雅思 4"）
create table content_books (
  id              uuid primary key default uuid_generate_v4(),
  code            text not null unique,               -- "ci4", "ci18", "og1"
  title           text not null,                      -- "剑桥雅思 4"
  source_type     text not null default 'cambridge'
                  check (source_type in ('cambridge', 'og', 'british_council', 'custom')),
  is_paid_only    boolean default false,               -- 预留：以后整本书可改为付费
  access_feature_key text references feature_access_rules(feature_key) on delete set null,
  is_published    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 1.2 测试（如"Test 2"）
create table tests (
  id              uuid primary key default uuid_generate_v4(),
  book_id         uuid not null references content_books(id) on delete cascade,
  test_no         int  not null check (test_no between 1 and 4),
  module          text not null check (module in ('listening', 'reading', 'writing', 'speaking')),
  title           text,
  is_paid_only    boolean default false,               -- 预留：以后单套题可改为付费
  access_feature_key text references feature_access_rules(feature_key) on delete set null,
  is_published    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (book_id, test_no, module)
);

-- 1.3 Section / Passage
create table test_sections (
  id                  uuid primary key default uuid_generate_v4(),
  test_id             uuid not null references tests(id) on delete cascade,
  section_no          int  not null check (section_no between 1 and 4),
  title               text,
  question_count      int  not null default 10,
  time_limit_seconds  int,                             -- 模考限时
  full_audio_path     text,                            -- 仅听力：完整音频路径
  question_image_path text,                            -- 第一版题目图片
  is_paid_only        boolean default false,            -- 预留：以后单个 Section/Passage 可改为付费
  access_feature_key  text references feature_access_rules(feature_key) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (test_id, section_no)
);

-- 1.4 题目
create table questions (
  id              uuid primary key default uuid_generate_v4(),
  section_id      uuid not null references test_sections(id) on delete cascade,
  question_no     int  not null check (question_no >= 1),
  question_type   text not null
                  check (question_type in (
                    'fill_blank', 'single_choice', 'multiple_choice',
                    'matching', 'map', 'form', 'table', 'flowchart',
                    'sentence_completion', 'summary', 'short_answer'
                  )),
  prompt_text     text,                                -- 题干（第二版结构化）
  sort_order      int  not null default 0,
  points          int  not null default 1,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (section_id, question_no)
);

-- 1.5 答案（支持一题多答案）
create table question_answers (
  id                uuid primary key default uuid_generate_v4(),
  question_id       uuid not null references questions(id) on delete cascade,
  answer_text       text not null,
  normalized_answer text,                              -- 统一格式便于判分
  is_primary        boolean default true,
  accepts_variants  text[] default '{}',               -- 同义可接受答案
  sort_order        int  not null default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (question_id, answer_text)
);

-- ============================================================
-- PART 2: 听力原文（逐句）
-- ============================================================

create table transcript_sentences (
  id              uuid primary key default uuid_generate_v4(),
  section_id      uuid not null references test_sections(id) on delete cascade,
  sentence_no     int  not null,
  speaker         text,                                -- "man", "woman", "narrator"
  english_text    text not null,
  chinese_text    text not null,
  audio_path      text,                                -- "listening/ci4/t2/s2/sentences/ci4_t2_s2_015.mp3"
  start_ms        int,                                 -- 整段音频中起始毫秒
  end_ms          int,                                 -- 结束毫秒
  sort_order      int  not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (section_id, sentence_no)
);

-- ============================================================
-- PART 3: 阅读原文（段落 + 句子）
-- ============================================================

create table reading_paragraphs (
  id              uuid primary key default uuid_generate_v4(),
  section_id      uuid not null references test_sections(id) on delete cascade,
  paragraph_no    int  not null,
  english_text    text not null,
  chinese_text    text not null,
  sort_order      int  not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (section_id, paragraph_no)
);

create table reading_sentences (
  id              uuid primary key default uuid_generate_v4(),
  paragraph_id    uuid not null references reading_paragraphs(id) on delete cascade,
  sentence_no     int  not null,
  english_text    text not null,
  chinese_text    text not null,
  sort_order      int  not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (paragraph_id, sentence_no)
);

-- ============================================================
-- PART 4: 标注 / 高亮系统（统一）
-- ============================================================
-- type:
--   answer_sentence   → 答案句（黄色）
--   question_sentence → 题干对应句（蓝色）
--   answer_word       → 答案词（红色）
-- language: en / zh（支持中文标红）
-- source_type: listening / reading（区分来源）

create table highlights (
  id                uuid primary key default uuid_generate_v4(),
  section_id        uuid not null references test_sections(id) on delete cascade,
  question_id       uuid not null references questions(id) on delete cascade,

  source_type       text not null check (source_type in ('listening', 'reading')),

  -- 听力和阅读各自关联
  listening_sentence_id  uuid references transcript_sentences(id) on delete cascade,
  reading_sentence_id    uuid references reading_sentences(id) on delete cascade,

  type              text not null
                    check (type in ('answer_sentence', 'question_sentence', 'answer_word')),
  language          text not null default 'en' check (language in ('en', 'zh')),
  text              text,
  start_offset      int,                               -- 0-based char offset
  end_offset        int,
  color             text default '#ff0000',             -- 默认红色

  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),

  constraint highlights_target_check check (
    (listening_sentence_id is not null and reading_sentence_id is null)
    or (listening_sentence_id is null and reading_sentence_id is not null)
  )
);

create index idx_highlights_section            on highlights(section_id);
create index idx_highlights_question           on highlights(question_id);
create index idx_highlights_type               on highlights(type);
create index idx_highlights_listening_sentence on highlights(listening_sentence_id);
create index idx_highlights_reading_sentence   on highlights(reading_sentence_id);

-- ============================================================
-- PART 5: 用户系统
-- ============================================================

create table profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text,
  display_name         text,
  avatar_url           text,
  role                 text not null default 'student'
                       check (role in ('student', 'admin')),
  membership_status    text not null default 'free'
                       check (membership_status in ('free', 'paid', 'lifetime')),
  membership_expires_at timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- 注册时自动创建 profile
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
-- PART 5B: 可配置页面内容（信息发布 / 联系我们 / 自定义页）
-- ============================================================

create table managed_content_pages (
  id                 uuid primary key default uuid_generate_v4(),
  template_key       text not null references content_page_templates(template_key) on delete restrict,
  module             text not null
                     check (module in ('listening', 'reading', 'speaking', 'writing', 'vocabulary', 'training', 'articles', 'site')),
  slug               text not null unique,
  title              text not null,
  summary            text,
  cover_image_url    text,
  status             text not null default 'draft'
                     check (status in ('draft', 'published', 'archived')),
  published_at       timestamptz,
  is_paid_only       boolean default false,
  access_feature_key text references feature_access_rules(feature_key) on delete set null,
  meta_json          jsonb not null default '{}',
  created_by         uuid references profiles(id) on delete set null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table managed_content_page_sections (
  id                  uuid primary key default uuid_generate_v4(),
  page_id             uuid not null references managed_content_pages(id) on delete cascade,
  template_section_id uuid references content_page_template_sections(id) on delete set null,
  section_key         text not null,
  title               text,
  content_json        jsonb not null default '{}',
  is_active           boolean not null default true,
  sort_order          int not null default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (page_id, section_key)
);

create table contact_messages (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references profiles(id) on delete set null,
  name           text,
  email          text,
  subject        text,
  message        text not null,
  source_page_id uuid references managed_content_pages(id) on delete set null,
  status         text not null default 'new'
                 check (status in ('new', 'read', 'replied', 'archived')),
  meta_json      jsonb not null default '{}',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index idx_managed_content_pages_template
  on managed_content_pages(template_key, status, published_at desc);
create index idx_managed_content_pages_module
  on managed_content_pages(module, status, published_at desc);
create index idx_managed_content_page_sections_page
  on managed_content_page_sections(page_id, sort_order);
create index idx_contact_messages_status
  on contact_messages(status, created_at desc);

-- ============================================================
-- PART 6: 答题记录
-- ============================================================

-- 6.1 一次作答（模考/练习）
create table attempts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  section_id      uuid not null references test_sections(id) on delete cascade,
  mode            text not null check (mode in ('mock', 'practice')),
  status          text not null default 'in_progress'
                  check (status in ('in_progress', 'submitted', 'timed_out')),
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  score           int,
  total_questions int,
  correct_count   int,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_attempts_user    on attempts(user_id);
create index idx_attempts_section on attempts(section_id);

-- 6.2 每题作答
create table attempt_answers (
  id            uuid primary key default uuid_generate_v4(),
  attempt_id    uuid not null references attempts(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  user_answer   text,
  is_correct    boolean,
  score         int default 0,
  answered_at   timestamptz default now(),
  unique (attempt_id, question_id)
);

-- ============================================================
-- PART 7: 词汇系统
-- ============================================================

-- 7.1 词条
create table vocabulary_entries (
  id                 uuid primary key default uuid_generate_v4(),
  word               text not null unique,
  phonetic           text,                              -- /əˈmɒsfɪə/
  uk_phonetic        text,                              -- 英式音标
  us_phonetic        text,                              -- 美式音标
  part_of_speech     text,                              -- "n." / "v." / "adj."
  definition_cn      text,
  definition_en      text,
  pronunciation_url  text,                              -- 发音音频链接（默认）
  uk_audio_url       text,                              -- 英式发音音频
  us_audio_url       text,                              -- 美式发音音频
  level              text,                              -- "初中","高中","四级","六级","考研","雅思","托福","GRE"
  skill_tags         text[],                            -- ['listening','reading','writing','speaking','academic']
  word_forms         jsonb default '{}',                -- {"plural":"...","third_person":"...","past":"...","past_participle":"...","present_participle":"..."}
  is_paid_only       boolean default false,             -- 预留：第一阶段查词免费，后期可做高级词条
  access_feature_key text default 'vocabulary.dictionary'
                     references feature_access_rules(feature_key) on delete set null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index idx_vocabulary_entries_word_trgm
  on vocabulary_entries using gin (word gin_trgm_ops);
create index idx_vocabulary_entries_definition_cn_trgm
  on vocabulary_entries using gin (definition_cn gin_trgm_ops);
create index idx_vocabulary_entries_level
  on vocabulary_entries(level);
create index idx_vocabulary_entries_skill_tags
  on vocabulary_entries using gin (skill_tags);

-- 7.2 例句（语境记忆 + 挖空复习用）
create table vocabulary_examples (
  id              uuid primary key default uuid_generate_v4(),
  vocabulary_id   uuid not null references vocabulary_entries(id) on delete cascade,
  created_by      uuid references profiles(id) on delete set null, -- null = 官方/导入例句
  sentence_mixed  text not null,                        -- "这家餐厅的 atmosphere 非常好。"
  sentence_cloze  text not null,                        -- "这家餐厅的 ______ 非常好。"
  sentence_en     text,                                 -- "The atmosphere of this restaurant is very good."
  explanation     text,                                 -- 额外解释
  source_type     text not null default 'official'
                  check (source_type in ('official', 'user', 'listening', 'reading', 'writing', 'vocabulary_book')),
  source          text,                                 -- "剑桥真题4-2-2"
  status          text not null default 'approved'
                  check (status in ('pending', 'approved', 'hidden', 'deleted')),
  likes_count     int not null default 0 check (likes_count >= 0),
  dislikes_count  int not null default 0 check (dislikes_count >= 0),
  sort_order      int not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  deleted_at      timestamptz,
  unique (vocabulary_id, sentence_mixed)
);

-- 7.3 词汇书
create table vocabulary_books (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,                        -- "雅思核心 3000"
  slug            text not null unique,
  description     text,
  cover_image_url text,
  level           text default 'intermediate'
                  check (level in ('basic', 'intermediate', 'advanced')),
  exam_module     text default 'general'
                  check (exam_module in ('listening', 'reading', 'writing', 'speaking', 'general')),
  is_published    boolean default false,
  is_paid_only    boolean default false,                -- 预留：第一阶段词汇书免费，后期可做付费词汇书
  access_feature_key text default 'vocabulary.books'
                  references feature_access_rules(feature_key) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 7.4 词汇书-词条关联
create table vocabulary_book_entries (
  id              uuid primary key default uuid_generate_v4(),
  book_id         uuid not null references vocabulary_books(id) on delete cascade,
  vocabulary_id   uuid not null references vocabulary_entries(id) on delete cascade,
  example_id      uuid references vocabulary_examples(id) on delete set null,
  unit_no         int,                                  -- 第几单元
  order_index     int not null default 0,
  note            text,                                 -- 本书内额外备注
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (book_id, vocabulary_id)
);

-- 7.5 例句点赞/点踩
create table vocabulary_example_votes (
  id              uuid primary key default uuid_generate_v4(),
  example_id      uuid not null references vocabulary_examples(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  vote_type       text not null check (vote_type in ('up', 'down')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (example_id, user_id)
);

-- 7.6 用户单词本
create table user_vocabulary (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  vocabulary_id   uuid not null references vocabulary_entries(id) on delete cascade,
  source          text,                                 -- "listening_highlight", "reading_highlight", "manual"
  source_id       uuid,                                 -- 来源 sentence id
  added_at        timestamptz default now(),
  unique (user_id, vocabulary_id)
);

-- 7.7 SRS 复习进度（每个词每用户每本书的复习状态）
create table user_vocabulary_reviews (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  vocabulary_id   uuid not null references vocabulary_entries(id) on delete cascade,
  book_id         uuid references vocabulary_books(id) on delete set null,
  status          text not null default 'new'
                  check (status in ('new', 'learning', 'reviewing', 'mastered')),
  ease_factor     decimal default 2.5,                  -- SRS 难度系数
  interval_days   int default 0,                        -- 距下次复习天数
  due_at          timestamptz default now(),            -- 下次复习时间
  review_count    int default 0,
  last_reviewed_at timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, vocabulary_id, book_id)
);

-- 7.8 复习日志
create table user_vocabulary_review_logs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  vocabulary_id   uuid not null references vocabulary_entries(id) on delete cascade,
  book_id         uuid references vocabulary_books(id) on delete set null,
  result          text not null check (result in ('forgot', 'hard', 'good', 'easy')),
  reviewed_at     timestamptz default now()
);

-- 7.9 查词记录
create table vocabulary_lookup_logs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles(id) on delete cascade,
  vocabulary_id   uuid references vocabulary_entries(id) on delete set null,
  query_text      text not null,
  source          text not null default 'search'
                  check (source in ('search', 'listening', 'reading', 'writing', 'vocabulary_book', 'wordbook')),
  source_id       uuid,
  created_at      timestamptz default now()
);

-- 7.10 用户背词设置
create table user_vocabulary_settings (
  user_id             uuid primary key references profiles(id) on delete cascade,
  active_book_id      uuid references vocabulary_books(id) on delete set null,
  daily_new_count     int not null default 20 check (daily_new_count >= 1),
  daily_review_count  int not null default 20 check (daily_review_count >= 1),
  order_mode          text not null default 'book_order'
                      check (order_mode in ('book_order', 'alphabetical', 'random')),
  auto_pronounce      boolean not null default true,
  accent              text not null default 'uk'
                      check (accent in ('uk', 'us', 'both')),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- 7.11 每日背词任务快照
create table vocabulary_study_sessions (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references profiles(id) on delete cascade,
  book_id             uuid references vocabulary_books(id) on delete set null,
  session_date        date not null default current_date,
  mode                text not null default 'mixed'
                      check (mode in ('new', 'review', 'mixed', 'wordbook')),
  status              text not null default 'in_progress'
                      check (status in ('in_progress', 'completed', 'abandoned')),
  daily_new_count     int not null default 0,
  daily_review_count  int not null default 0,
  started_at          timestamptz default now(),
  completed_at        timestamptz,
  created_at          timestamptz default now(),
  unique (user_id, book_id, session_date, mode)
);

create table vocabulary_study_session_items (
  id              uuid primary key default uuid_generate_v4(),
  session_id      uuid not null references vocabulary_study_sessions(id) on delete cascade,
  vocabulary_id   uuid not null references vocabulary_entries(id) on delete cascade,
  review_id       uuid references user_vocabulary_reviews(id) on delete set null,
  item_type       text not null check (item_type in ('new', 'review')),
  status          text not null default 'pending'
                  check (status in ('pending', 'shown', 'answered', 'skipped')),
  result          text check (result in ('forgot', 'hard', 'good', 'easy')),
  sort_order      int not null default 0,
  shown_at        timestamptz,
  answered_at     timestamptz,
  created_at      timestamptz default now(),
  unique (session_id, vocabulary_id)
);

create index idx_uvr_user       on user_vocabulary_reviews(user_id);
create index idx_uvr_due        on user_vocabulary_reviews(due_at);
create index idx_uvrl_user      on user_vocabulary_review_logs(user_id);
create index idx_uvrl_vocab     on user_vocabulary_review_logs(vocabulary_id);
create index idx_vocab_lookup_user_time on vocabulary_lookup_logs(user_id, created_at desc);
create index idx_vocab_lookup_query_trgm on vocabulary_lookup_logs using gin (query_text gin_trgm_ops);
create index idx_vocab_study_sessions_user_date on vocabulary_study_sessions(user_id, session_date desc);
create index idx_vocab_study_items_session on vocabulary_study_session_items(session_id, sort_order);
create index idx_vocab_examples_latest on vocabulary_examples(vocabulary_id, created_at desc)
  where status = 'approved';
create index idx_vocab_examples_top on vocabulary_examples(vocabulary_id, likes_count desc, created_at desc)
  where status = 'approved';
create index idx_vocab_examples_pending on vocabulary_examples(created_at desc)
  where status = 'pending';
create index idx_vocab_examples_downs on vocabulary_examples(dislikes_count)
  where status = 'approved';
create index idx_vev_example on vocabulary_example_votes(example_id);
create index idx_vev_user    on vocabulary_example_votes(user_id);

-- 例句展示查询（前端直接套用）
-- 1. 默认展示（点赞最高）
--    select * from vocabulary_examples
--    where vocabulary_id = :vid and status = 'approved'
--    order by likes_count desc, created_at desc
--    limit 1;
--
-- 2. 点赞最高 5 条
--    select * from vocabulary_examples
--    where vocabulary_id = :vid and status = 'approved'
--    order by likes_count desc, created_at desc
--    limit 5 offset 1;  -- offset 1 跳过第一条（默认展示的）
--
-- 3. 最新 5 条
--    select * from vocabulary_examples
--    where vocabulary_id = :vid and status = 'approved'
--    order by created_at desc
--    limit 5;
--
-- 4. 用户上传
--    insert into vocabulary_examples
--      (vocabulary_id, created_by, sentence_mixed, sentence_cloze, sentence_en, source_type, status)
--    values (:vid, :uid, :mixed, :cloze, :en, 'user', 'pending');

-- 例句投票后同步计数；点踩超过 50 次自动从例句库隐藏。
create or replace function sync_vocabulary_example_vote_counts()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  affected_example_id uuid;
  down_count int;
begin
  affected_example_id := coalesce(new.example_id, old.example_id);

  update vocabulary_examples
  set
    likes_count = (
      select count(*) from vocabulary_example_votes
      where example_id = affected_example_id and vote_type = 'up'
    ),
    dislikes_count = (
      select count(*) from vocabulary_example_votes
      where example_id = affected_example_id and vote_type = 'down'
    ),
    updated_at = now()
  where id = affected_example_id;

  select dislikes_count into down_count
  from vocabulary_examples
  where id = affected_example_id;

  if down_count > 50 then
    update vocabulary_examples
    set status = 'deleted', deleted_at = coalesce(deleted_at, now()), updated_at = now()
    where id = affected_example_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger on_vocabulary_example_vote_changed
  after insert or update or delete on vocabulary_example_votes
  for each row execute function sync_vocabulary_example_vote_counts();

-- ============================================================
-- PART 8: 写作模块
-- ============================================================

-- 8.1 写作任务（题目）
create table writing_tasks (
  id              uuid primary key default uuid_generate_v4(),
  test_id         uuid references tests(id) on delete set null,
  task_type       text not null check (task_type in ('task1', 'task2')),
  title           text not null,
  prompt_text     text not null,
  image_path      text,                                -- 小作文图表
  word_limit      int default 250,                     -- 建议字数
  is_published    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 8.2 范文
create table writing_samples (
  id              uuid primary key default uuid_generate_v4(),
  task_id         uuid not null references writing_tasks(id) on delete cascade,
  title           text,
  preview_content text,                                -- 免费预览；不要放完整范文
  content         text not null,
  band_score      decimal check (band_score >= 0 and band_score <= 9),
  is_paid_only    boolean default true,                 -- 范文全文默认付费
  access_feature_key text default 'writing.sample_full'
                  references feature_access_rules(feature_key) on delete set null,
  sort_order      int not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 8.3 学生作文提交
create table writing_submissions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  task_id         uuid not null references writing_tasks(id) on delete cascade,
  content         text not null,
  word_count      int not null default 0,
  submitted_at    timestamptz default now()
);

-- 8.4 写作课程（每道题对应一个完整课件）
create table writing_lessons (
  id              uuid primary key default uuid_generate_v4(),
  task_id         uuid not null references writing_tasks(id) on delete cascade,
  title           text not null,
  is_published    boolean default false,
  is_paid_only    boolean default true,                -- 审题/规划/逻辑图/逐句练习默认付费
  access_feature_key text default 'writing.lessons'
                  references feature_access_rules(feature_key) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (task_id)
);

-- 8.5 课程区块定义（分析/规划/逻辑图/逐句练习/范文……）
create table writing_lesson_sections (
  id                uuid primary key default uuid_generate_v4(),
  lesson_id         uuid not null references writing_lessons(id) on delete cascade,
  section_type      text not null
                    check (section_type in (
                      'question_analysis',    -- 题目分析
                      'essay_plan',           -- 段落规划
                      'logic_map',           -- 逻辑梳理 / 思维导图
                      'sentence_practice',   -- 逐句练习
                      'vocabulary',          -- 重点词汇
                      'structure_analysis',  -- 句子结构分析
                      'full_essay'           -- 完整范文
                    )),
  title             text not null,
  sort_order        int not null default 0,
  default_collapsed boolean default true,             -- 默认折叠
  is_paid_only      boolean default true,             -- 写作学习区默认付费
  access_feature_key text default 'writing.lessons'
                    references feature_access_rules(feature_key) on delete set null,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- 8.6 区块内部内容块（支持灵活组合）
-- content_json 示例:
--   text:       {"type": "text", "content": "<p>...</p>"}
--   list:       {"type": "list", "items": ["...", "..."]}
--   logic_map:  {"type": "logic_map", "nodes": [{"id": 1, "text": "...", "children": [2,3]}]}
--   highlight:  {"type": "highlight", "text": "...", "words": [{"w": "atmosphere", "color": "red"}]}
--   foldable:   {"type": "foldable", "title": "点击展开", "content": "..."}
create table writing_lesson_blocks (
  id              uuid primary key default uuid_generate_v4(),
  section_id      uuid not null references writing_lesson_sections(id) on delete cascade,
  block_type      text not null
                  check (block_type in ('text', 'list', 'logic_map', 'highlight', 'foldable', 'divider')),
  content_json    jsonb not null default '{}',
  sort_order      int not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 8.7 逐句练习（sentence_practice 区块专用）
create table writing_practice_items (
  id                uuid primary key default uuid_generate_v4(),
  lesson_id         uuid not null references writing_lessons(id) on delete cascade,
  paragraph_no      int not null,                      -- 第几段
  chinese_prompt    text not null,                     -- "经济发展导致了环境恶化"
  vocab_hints       text[] default '{}',               -- ["economic growth", "deterioration"]
  reference_answer  text not null,                     -- "Economic growth has led to the deterioration of the environment."
  structure_note    text,                              -- "主语 + 谓语动词 + 宾语 + 定语"
  sort_order        int not null default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ============================================================
-- PART 8B: 口语模块
-- ============================================================

create table speaking_topics (
  id              uuid primary key default uuid_generate_v4(),
  test_id         uuid references tests(id) on delete set null,
  slug            text not null unique,
  title           text not null,                       -- "01_who-do-you-talk-to..."
  question_text   text not null,
  question_cn     text,
  part            text not null check (part in ('part1', 'part2', 'part3')),
  season          text,                                -- "2020-2026"
  scene           text,                                -- "人物"
  image_path      text,                                -- 可展示题目图片/资料图
  audio_path      text,
  is_published    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table speaking_topic_sections (
  id                uuid primary key default uuid_generate_v4(),
  topic_id          uuid not null references speaking_topics(id) on delete cascade,
  section_type      text not null
                    check (section_type in (
                      'high_score_idea',   -- 高分思路：免费
                      'sentence_patterns', -- 万能句型：付费
                      'vocabulary',        -- 万能句型下方内容：付费
                      'sample_answer',     -- 范文：付费
                      'translation',       -- 中文翻译：付费
                      'audio',             -- 音频：付费
                      'retell_practice'    -- 复述训练：付费
                    )),
  title             text not null,
  content_json      jsonb not null default '{}',
  sort_order        int not null default 0,
  is_paid_only      boolean default false,            -- 由触发器按 section_type 自动设置
  access_feature_key text references feature_access_rules(feature_key) on delete set null,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- 口语区块收费规则：
--   high_score_idea 免费；
--   sentence_patterns 以及下方内容（vocabulary/sample_answer/translation/audio/retell_practice）付费。
create or replace function apply_speaking_topic_section_access_defaults()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.section_type = 'high_score_idea' then
    new.is_paid_only := false;
    new.access_feature_key := 'speaking.high_score_idea';
  elsif new.section_type = 'sentence_patterns' then
    new.is_paid_only := true;
    new.access_feature_key := 'speaking.sentence_patterns';
  else
    new.is_paid_only := true;
    new.access_feature_key := 'speaking.premium_content';
  end if;

  return new;
end;
$$;

create trigger on_speaking_topic_section_access_defaults
  before insert or update of section_type on speaking_topic_sections
  for each row execute function apply_speaking_topic_section_access_defaults();

create index idx_speaking_topics_part on speaking_topics(part);
create index idx_speaking_topics_published on speaking_topics(is_published);
create index idx_speaking_topic_sections_topic on speaking_topic_sections(topic_id, sort_order);

-- ============================================================
-- PART 8C: 英语专项训练
-- ============================================================

create table training_categories (
  id              uuid primary key default uuid_generate_v4(),
  slug            text not null unique,
  title           text not null,                       -- "写作翻译训练", "长难句", "伴随状语"
  description     text,
  sort_order      int not null default 0,
  is_published    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table training_items (
  id              uuid primary key default uuid_generate_v4(),
  category_id     uuid not null references training_categories(id) on delete cascade,
  title           text not null,
  item_type       text not null
                  check (item_type in (
                    'cn_to_en_translation',
                    'en_rewrite',
                    'sentence_combination',
                    'grammar_drill',
                    'long_sentence',
                    'custom'
                  )),
  prompt_text     text,                                -- 中文题干或说明
  prompt_json     jsonb not null default '{}',         -- 可存两句英文、图片、选项等复杂题干
  reference_answer text,
  explanation     text,
  image_path      text,
  sort_order      int not null default 0,
  is_published    boolean default false,
  is_paid_only    boolean default true,                 -- 写作翻译训练一直收费
  access_feature_key text default 'training.translation'
                  references feature_access_rules(feature_key) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table training_attempts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  item_id         uuid not null references training_items(id) on delete cascade,
  answer_text     text,
  score           int,
  feedback_json   jsonb not null default '{}',
  submitted_at    timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_training_categories_order on training_categories(sort_order);
create index idx_training_items_category on training_items(category_id, sort_order);
create index idx_training_items_type on training_items(item_type);
create index idx_training_attempts_user on training_attempts(user_id, submitted_at desc);

-- ============================================================
-- PART 8D: 自动维护 updated_at
-- ============================================================

create or replace function set_updated_at()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'updated_at'
  loop
    execute format('drop trigger if exists set_updated_at on %I', t);
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ============================================================
-- PART 9: 行级安全策略（RLS）
-- ============================================================

-- 9.1 内容表 RLS
alter table feature_access_rules enable row level security;
alter table content_page_templates enable row level security;
alter table content_page_template_sections enable row level security;
alter table managed_content_pages enable row level security;
alter table managed_content_page_sections enable row level security;
alter table content_books        enable row level security;
alter table tests                enable row level security;
alter table test_sections        enable row level security;
alter table questions            enable row level security;
alter table question_answers     enable row level security;
alter table transcript_sentences enable row level security;
alter table reading_paragraphs   enable row level security;
alter table reading_sentences    enable row level security;
alter table highlights           enable row level security;
alter table vocabulary_entries   enable row level security;
alter table vocabulary_examples  enable row level security;
alter table vocabulary_example_votes enable row level security;
alter table vocabulary_books     enable row level security;
alter table vocabulary_book_entries enable row level security;
alter table writing_tasks             enable row level security;
alter table writing_samples           enable row level security;
alter table writing_lessons           enable row level security;
alter table writing_lesson_sections   enable row level security;
alter table writing_lesson_blocks     enable row level security;
alter table writing_practice_items    enable row level security;
alter table speaking_topics           enable row level security;
alter table speaking_topic_sections   enable row level security;
alter table training_categories        enable row level security;
alter table training_items             enable row level security;

-- 用户数据表 RLS
alter table profiles             enable row level security;
alter table attempts             enable row level security;
alter table attempt_answers      enable row level security;
alter table user_vocabulary      enable row level security;
alter table user_vocabulary_reviews     enable row level security;
alter table user_vocabulary_review_logs enable row level security;
alter table vocabulary_lookup_logs       enable row level security;
alter table user_vocabulary_settings     enable row level security;
alter table vocabulary_study_sessions    enable row level security;
alter table vocabulary_study_session_items enable row level security;
alter table training_attempts         enable row level security;
alter table writing_submissions  enable row level security;
alter table contact_messages     enable row level security;

-- 9.2 管理员函数
create or replace function is_admin()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function has_active_membership()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and (
        role = 'admin'
        or membership_status = 'lifetime'
        or (
          membership_status = 'paid'
          and (membership_expires_at is null or membership_expires_at > now())
        )
      )
  );
$$;

create or replace function can_access_feature(_feature_key text)
returns boolean
language sql security definer set search_path = public
as $$
  select coalesce((
    select
      is_enabled
      and (
        access_level = 'free'
        or public.has_active_membership()
      )
    from feature_access_rules
    where feature_key = _feature_key
  ), false);
$$;

create or replace function can_access_paid_content(
  _is_paid_only boolean,
  _feature_key text default null
)
returns boolean
language sql security definer set search_path = public
as $$
  select
    (
      not coalesce(_is_paid_only, false)
      or public.has_active_membership()
    )
    and (
      _feature_key is null
      or public.can_access_feature(_feature_key)
    );
$$;

-- 9.3 第一阶段公开读策略
-- 当前先让内容公开可读，方便开发和导入内容。
-- 正式收费上线前，需要把付费内容查询切到 API/RPC，或把 select policy 改为 can_access_paid_content(...)。
do $$
declare
  pub_tables text[] := array[
    'feature_access_rules', 'content_page_templates', 'content_page_template_sections',
    'content_books', 'tests', 'test_sections', 'questions', 'question_answers',
    'transcript_sentences', 'reading_paragraphs', 'reading_sentences', 'highlights',
    'vocabulary_entries', 'vocabulary_books', 'vocabulary_book_entries',
    'writing_tasks', 'writing_samples',
    'writing_lessons', 'writing_lesson_sections', 'writing_lesson_blocks', 'writing_practice_items',
    'speaking_topics', 'speaking_topic_sections',
    'training_categories', 'training_items'
  ];
  t text;
begin
  foreach t in array pub_tables loop
    execute format('create policy "公开读" on %I for select using (true)', t);
  end loop;
end;
$$;

-- 9.4 管理员增删改（所有内容表）
do $$
declare
  admin_tables text[] := array[
    'feature_access_rules', 'content_page_templates', 'content_page_template_sections',
    'managed_content_pages', 'managed_content_page_sections', 'contact_messages',
    'content_books', 'tests', 'test_sections', 'questions', 'question_answers',
    'transcript_sentences', 'reading_paragraphs', 'reading_sentences', 'highlights',
    'vocabulary_entries', 'vocabulary_examples', 'vocabulary_example_votes', 'vocabulary_books', 'vocabulary_book_entries',
    'writing_tasks', 'writing_samples',
    'writing_lessons', 'writing_lesson_sections', 'writing_lesson_blocks', 'writing_practice_items',
    'speaking_topics', 'speaking_topic_sections',
    'training_categories', 'training_items'
  ];
  t text;
begin
  foreach t in array admin_tables loop
    execute format('create policy "管理员增" on %I for insert with check (is_admin())', t);
    execute format('create policy "管理员改" on %I for update using (is_admin())', t);
    execute format('create policy "管理员删" on %I for delete using (is_admin())', t);
  end loop;
end;
$$;

-- 9.4B 可配置页面内容：公开只读已发布，后台可管理草稿和发布
create policy "公开读已发布页面" on managed_content_pages for select using (
  status = 'published' or is_admin()
);
create policy "公开读已发布页面区块" on managed_content_page_sections for select using (
  page_id in (select id from managed_content_pages where status = 'published')
  or is_admin()
);
create policy "任何人提交联系表单" on contact_messages for insert with check (true);
create policy "管理员看联系表单" on contact_messages for select using (is_admin());

-- 9.5 用户资料：自己读/改，管理员读所有
create policy "用户看自己"   on profiles for select using (auth.uid() = id or is_admin());
create policy "管理员改会员" on profiles for update using (is_admin());
  -- 注意：普通用户不能改自己的 role / membership_status！

-- 9.6 答题：用户只读自己
create policy "用户看自己答题"     on attempts        for select using (user_id = auth.uid());
create policy "用户创建答题"       on attempts        for insert with check (user_id = auth.uid());
create policy "用户更新自己答题"   on attempts        for update using (user_id = auth.uid());
create policy "用户看自己作答"     on attempt_answers for select using (
  attempt_id in (select id from attempts where user_id = auth.uid())
);
create policy "用户创建作答"       on attempt_answers for insert with check (
  attempt_id in (select id from attempts where user_id = auth.uid())
);

-- 9.7 单词本
create policy "公开读已审核例句" on vocabulary_examples for select using (
  status = 'approved' or created_by = auth.uid() or is_admin()
);
create policy "用户新增例句" on vocabulary_examples for insert with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and source_type = 'user'
  and status = 'pending'
  and likes_count = 0
  and dislikes_count = 0
);
create policy "用户看自己例句投票" on vocabulary_example_votes for select using (
  user_id = auth.uid() or is_admin()
);
create policy "用户新增例句投票" on vocabulary_example_votes for insert with check (
  user_id = auth.uid()
);
create policy "用户修改自己例句投票" on vocabulary_example_votes for update using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid()
);
create policy "用户删除自己例句投票" on vocabulary_example_votes for delete using (
  user_id = auth.uid()
);

create policy "用户管理单词本"         on user_vocabulary              for all using (user_id = auth.uid());
create policy "用户管理复习进度"       on user_vocabulary_reviews      for all using (user_id = auth.uid());
create policy "用户管理复习日志"       on user_vocabulary_review_logs  for all using (user_id = auth.uid());
create policy "用户管理查词记录"       on vocabulary_lookup_logs       for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy "用户管理背词设置"       on user_vocabulary_settings     for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy "用户管理背词任务"       on vocabulary_study_sessions    for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy "用户管理背词任务词项"   on vocabulary_study_session_items for all using (
  session_id in (select id from vocabulary_study_sessions where user_id = auth.uid())
  or is_admin()
) with check (
  session_id in (select id from vocabulary_study_sessions where user_id = auth.uid())
  or is_admin()
);

-- 9.8 作文
create policy "用户管自己作文" on writing_submissions for all using (user_id = auth.uid());

-- 9.9 专项训练作答
create policy "用户管自己专项训练作答" on training_attempts for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- PART 10: 存储桶规范（需手动在 Supabase Dashboard 创建）
-- ============================================================
-- audio (public)
--   listening/{book_code}/t{test}/s{section}/sentences/{audio_name}.mp3
--   listening/{book_code}/t{test}/s{section}/full/{section_full}.mp3
--   listening/{book_code}/t{test}/full/{test_full}.mp3
--   articles/{article_slug}/sentences/{article_slug}_001.mp3
--   articles/{article_slug}/full/{article_slug}_full.mp3
--
-- images (public)
--   listening/{book_code}/t{test}/s{section}/questions/page-1.png
--   writing/{book_code}/t{test}/{filename}.png
--   speaking/{topic_slug}/{filename}.png
--   vocabulary/{word}/{filename}.png
--   articles/{article_slug}/{filename}.png
--   site/{page_slug}/{filename}.png
--
-- videos (public, 后期需要时创建)
--   speaking/{topic_slug}/{filename}.mp4
--   vocabulary/{word}/{filename}.mp4
--   writing/{task_slug}/{filename}.mp4
--
-- documents (public/private 均可，按业务决定)
--   site/{page_slug}/{filename}.pdf
--   imports/{module}/{filename}.zip
--
-- Storage bucket RLS:
--   SELECT: public（第一阶段方便开发；正式收费内容可改为 signed URL）
--   INSERT/UPDATE/DELETE: is_admin()

-- ============================================================
-- 完成
-- ============================================================
