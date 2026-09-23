-- Transactional database publication for versioned IELTS Listening bundles.
-- Storage objects are uploaded and hash-verified under a content version before
-- this RPC atomically switches database paths to that immutable version.

create table if not exists listening_section_publications (
  manifest_id       text primary key check (manifest_id ~ '^ci[0-9]+:t[1-4]:s[1-4]$'),
  section_id        uuid not null unique references test_sections(id) on delete cascade,
  version           text not null check (version ~ '^[a-f0-9]{64}$'),
  storage_prefix    text not null,
  payload_sha256    text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  payload           jsonb not null,
  published_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table listening_section_publications enable row level security;
revoke all on listening_section_publications from anon, authenticated;

create or replace function publish_listening_section_v1(
  p_payload jsonb,
  p_expected_version text,
  p_new_version text,
  p_payload_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_manifest_id text := p_payload->>'manifestId';
  v_book jsonb := p_payload->'book';
  v_test jsonb := p_payload->'test';
  v_section jsonb := p_payload->'section';
  v_questions jsonb := p_payload->'questions';
  v_transcript jsonb := p_payload->'transcriptSentences';
  v_book_no int;
  v_test_no int;
  v_section_no int;
  v_first_question_no int;
  v_book_id uuid;
  v_test_id uuid;
  v_section_id uuid;
  v_existing_section_id uuid;
  v_current_version text;
  v_version_prefix text;
  v_expected_prefix text;
  v_question jsonb;
  v_question_id uuid;
  v_question_no int;
  v_question_index int := 0;
  v_sentence jsonb;
  v_sentence_no int;
  v_sentence_index int := 0;
  v_question_image_path text;
  v_media_path text;
begin
  if v_manifest_id is null or v_manifest_id !~ '^ci[0-9]+:t[1-4]:s[1-4]$' then
    raise exception 'Invalid Listening manifest id.' using errcode = '22023';
  end if;
  if p_new_version is null or p_new_version !~ '^[a-f0-9]{64}$'
    or p_payload_sha256 is null or p_payload_sha256 !~ '^[a-f0-9]{64}$'
    or (p_expected_version is not null and p_expected_version !~ '^[a-f0-9]{64}$')
  then
    raise exception 'Listening publication versions and payload hash must be lowercase SHA-256 values.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_book) <> 'object'
    or jsonb_typeof(v_test) <> 'object'
    or jsonb_typeof(v_section) <> 'object'
    or jsonb_typeof(v_questions) <> 'array'
    or jsonb_typeof(v_transcript) <> 'array'
  then
    raise exception 'Listening publication payload shape is invalid.' using errcode = '22023';
  end if;

  v_book_no := (v_book->>'bookNo')::int;
  v_test_no := (v_test->>'testNo')::int;
  v_section_no := (v_section->>'sectionNo')::int;
  if v_book_no < 4 or v_book_no > 21
    or v_test_no not between 1 and 4
    or v_section_no not between 1 and 4
    or v_manifest_id <> format('ci%s:t%s:s%s', v_book_no, v_test_no, v_section_no)
    or v_book->>'code' <> format('cambridge-%s', v_book_no)
  then
    raise exception 'Listening publication natural key is invalid.' using errcode = '22023';
  end if;

  v_expected_prefix := format(
    'listening/ci%s/t%s/s%s/versions/%s',
    v_book_no,
    v_test_no,
    v_section_no,
    left(p_new_version, 32)
  );
  v_version_prefix := p_payload->>'versionPrefix';
  if v_version_prefix is distinct from v_expected_prefix
    or v_version_prefix like '%..%'
    or position(E'\\' in v_version_prefix) > 0
    or v_version_prefix like '%//%'
  then
    raise exception 'Listening versioned Storage prefix is invalid.' using errcode = '22023';
  end if;

  if coalesce(v_section->>'fullAudioPath', '') <> (v_expected_prefix || '/full.mp3') then
    raise exception 'Listening full-audio path is outside the immutable version.' using errcode = '22023';
  end if;
  v_question_image_path := v_section->>'questionImagePath';
  if v_question_image_path is not null then
    for v_media_path in select unnest(string_to_array(v_question_image_path, E'\n'))
    loop
      if v_media_path not like (v_expected_prefix || '/questions/%')
        or v_media_path like '%..%'
        or position(E'\\' in v_media_path) > 0
        or v_media_path !~ '\.(png|jpe?g)$'
      then
        raise exception 'Listening question-image path is outside the immutable version.' using errcode = '22023';
      end if;
    end loop;
  end if;
  for v_sentence in select value from jsonb_array_elements(v_transcript)
  loop
    if coalesce(v_sentence->>'audioPath', '') not like (v_expected_prefix || '/sentences/%')
      or (v_sentence->>'audioPath') like '%..%'
      or position(E'\\' in (v_sentence->>'audioPath')) > 0
    then
      raise exception 'Listening transcript audio path is outside the immutable version.' using errcode = '22023';
    end if;
  end loop;

  -- The transaction-scoped lock serializes every writer for this natural Section.
  perform pg_advisory_xact_lock(hashtextextended('listening:' || v_manifest_id, 0));

  select publication.version
  into v_current_version
  from listening_section_publications publication
  where publication.manifest_id = v_manifest_id;

  if p_expected_version is distinct from v_current_version then
    raise exception 'LISTENING_EXPECTED_VERSION_MISMATCH expected %, found %',
      coalesce(p_expected_version, 'null'),
      coalesce(v_current_version, 'null')
      using errcode = '40001';
  end if;

  select section.id
  into v_existing_section_id
  from test_sections section
  join tests test_row on test_row.id = section.test_id
  join content_books book_row on book_row.id = test_row.book_id
  where book_row.code = v_book->>'code'
    and test_row.module = 'listening'
    and test_row.test_no = v_test_no
    and section.section_no = v_section_no;

  if v_existing_section_id is not null and v_current_version is null then
    raise exception 'LISTENING_LEGACY_TARGET_UNVERSIONED: exact legacy adoption is required before overwrite.'
      using errcode = '55000';
  end if;

  insert into content_books (
    code,
    title,
    source_type,
    is_paid_only,
    access_feature_key,
    is_published
  ) values (
    v_book->>'code',
    v_book->>'title',
    'cambridge',
    coalesce((v_book->>'isPaidOnly')::boolean, false),
    coalesce(v_book->>'accessFeatureKey', 'listening.practice'),
    coalesce((v_book->>'isPublished')::boolean, true)
  ) on conflict (code) do nothing;

  select id into strict v_book_id
  from content_books
  where code = v_book->>'code';

  insert into tests (
    book_id,
    test_no,
    module,
    title,
    is_paid_only,
    access_feature_key,
    is_published
  ) values (
    v_book_id,
    v_test_no,
    'listening',
    coalesce(v_test->>'title', format('Test %s', v_test_no)),
    coalesce((v_test->>'isPaidOnly')::boolean, false),
    coalesce(v_test->>'accessFeatureKey', 'listening.practice'),
    coalesce((v_test->>'isPublished')::boolean, true)
  ) on conflict (book_id, test_no, module) do nothing;

  select id into strict v_test_id
  from tests
  where book_id = v_book_id and test_no = v_test_no and module = 'listening';

  insert into test_sections (
    test_id,
    section_no,
    title,
    question_count,
    time_limit_seconds,
    full_audio_path,
    question_image_path,
    is_paid_only,
    access_feature_key
  ) values (
    v_test_id,
    v_section_no,
    coalesce(v_section->>'title', format('Section %s', v_section_no)),
    10,
    coalesce((v_section->>'timeLimitSeconds')::int, 600),
    v_section->>'fullAudioPath',
    v_question_image_path,
    coalesce((v_section->>'isPaidOnly')::boolean, false),
    coalesce(v_section->>'accessFeatureKey', 'listening.practice')
  )
  on conflict (test_id, section_no) do update set
    title = excluded.title,
    question_count = excluded.question_count,
    time_limit_seconds = excluded.time_limit_seconds,
    full_audio_path = excluded.full_audio_path,
    question_image_path = excluded.question_image_path,
    is_paid_only = excluded.is_paid_only,
    access_feature_key = excluded.access_feature_key,
    updated_at = now()
  returning id into v_section_id;

  if jsonb_array_length(v_questions) <> 10 then
    raise exception 'Listening Section must contain exactly ten questions.' using errcode = '22023';
  end if;
  v_first_question_no := (v_section_no - 1) * 10 + 1;
  for v_question in select value from jsonb_array_elements(v_questions)
  loop
    v_question_index := v_question_index + 1;
    v_question_no := (v_question->>'questionNo')::int;
    if v_question_no <> v_first_question_no + v_question_index - 1 then
      raise exception 'Listening question numbers must be continuous and ordered.' using errcode = '22023';
    end if;
    if coalesce(v_question->>'questionType', '') not in (
      'fill_blank', 'single_choice', 'multiple_choice', 'matching', 'map', 'form',
      'table', 'flowchart', 'sentence_completion', 'summary', 'short_answer'
    ) or nullif(trim(v_question->>'promptText'), '') is null
      or nullif(trim(v_question->>'answerText'), '') is null
    then
      raise exception 'Listening question payload is incomplete at Q%.', v_question_no using errcode = '22023';
    end if;

    insert into questions (
      section_id,
      question_no,
      question_type,
      prompt_text,
      sort_order,
      points
    ) values (
      v_section_id,
      v_question_no,
      v_question->>'questionType',
      v_question->>'promptText',
      coalesce((v_question->>'sortOrder')::int, v_question_index),
      coalesce((v_question->>'points')::int, 1)
    )
    on conflict (section_id, question_no) do update set
      question_type = excluded.question_type,
      prompt_text = excluded.prompt_text,
      sort_order = excluded.sort_order,
      points = excluded.points,
      updated_at = now()
    returning id into v_question_id;

    delete from question_answers answer_row
    where answer_row.question_id = v_question_id
      and answer_row.answer_text <> v_question->>'answerText';

    insert into question_answers (
      question_id,
      answer_text,
      normalized_answer,
      is_primary,
      accepts_variants,
      sort_order
    ) values (
      v_question_id,
      v_question->>'answerText',
      v_question->>'normalizedAnswer',
      true,
      coalesce(
        array(select jsonb_array_elements_text(coalesce(v_question->'normalizedVariants', '[]'::jsonb))),
        '{}'::text[]
      ),
      coalesce((v_question->>'answerSortOrder')::int, 1)
    )
    on conflict (question_id, answer_text) do update set
      normalized_answer = excluded.normalized_answer,
      is_primary = excluded.is_primary,
      accepts_variants = excluded.accepts_variants,
      sort_order = excluded.sort_order,
      updated_at = now();
  end loop;

  if exists (
    select 1
    from questions question_row
    where question_row.section_id = v_section_id
      and not exists (
        select 1
        from jsonb_array_elements(v_questions) expected_question
        where (expected_question->>'questionNo')::int = question_row.question_no
      )
  ) then
    raise exception 'LISTENING_STALE_QUESTION_REQUIRES_MANUAL_RECONCILIATION.' using errcode = '55000';
  end if;

  for v_sentence in select value from jsonb_array_elements(v_transcript)
  loop
    v_sentence_index := v_sentence_index + 1;
    v_sentence_no := (v_sentence->>'sentenceNo')::int;
    if v_sentence_no <> v_sentence_index
      or nullif(trim(v_sentence->>'englishText'), '') is null
      or (
        nullif(trim(v_sentence->>'chineseText'), '') is null
        and coalesce(v_section->>'transcriptEnglishOnly', 'false') <> 'true'
      )
      or v_sentence->>'audioPath' <> format(
        '%s/sentences/ci%s_t%s_s%s_%s.mp3',
        v_expected_prefix,
        v_book_no,
        v_test_no,
        v_section_no,
        lpad(v_sentence_index::text, 3, '0')
      )
    then
      raise exception 'Listening transcript sentences must be complete, continuous and ordered.' using errcode = '22023';
    end if;
    insert into transcript_sentences (
      section_id,
      sentence_no,
      speaker,
      english_text,
      chinese_text,
      audio_path,
      start_ms,
      end_ms,
      sort_order
    ) values (
      v_section_id,
      v_sentence_no,
      nullif(v_sentence->>'speaker', ''),
      v_sentence->>'englishText',
      v_sentence->>'chineseText',
      v_sentence->>'audioPath',
      (v_sentence->>'startMs')::int,
      (v_sentence->>'endMs')::int,
      coalesce((v_sentence->>'sortOrder')::int, v_sentence_index)
    )
    on conflict (section_id, sentence_no) do update set
      speaker = excluded.speaker,
      english_text = excluded.english_text,
      chinese_text = excluded.chinese_text,
      audio_path = excluded.audio_path,
      start_ms = excluded.start_ms,
      end_ms = excluded.end_ms,
      sort_order = excluded.sort_order,
      updated_at = now();
  end loop;

  if exists (
    select 1
    from transcript_sentences sentence_row
    join highlights highlight_row on highlight_row.listening_sentence_id = sentence_row.id
    where sentence_row.section_id = v_section_id
      and not exists (
        select 1
        from jsonb_array_elements(v_transcript) expected_sentence
        where (expected_sentence->>'sentenceNo')::int = sentence_row.sentence_no
      )
  ) then
    raise exception 'LISTENING_STALE_TRANSCRIPT_HAS_HIGHLIGHTS.' using errcode = '55000';
  end if;

  delete from transcript_sentences sentence_row
  where sentence_row.section_id = v_section_id
    and not exists (
      select 1
      from jsonb_array_elements(v_transcript) expected_sentence
      where (expected_sentence->>'sentenceNo')::int = sentence_row.sentence_no
    );

  insert into listening_section_publications (
    manifest_id,
    section_id,
    version,
    storage_prefix,
    payload_sha256,
    payload,
    published_at,
    updated_at
  ) values (
    v_manifest_id,
    v_section_id,
    p_new_version,
    v_expected_prefix,
    p_payload_sha256,
    p_payload,
    now(),
    now()
  )
  on conflict (manifest_id) do update set
    section_id = excluded.section_id,
    version = excluded.version,
    storage_prefix = excluded.storage_prefix,
    payload_sha256 = excluded.payload_sha256,
    payload = excluded.payload,
    published_at = excluded.published_at,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'manifestId', v_manifest_id,
    'previousVersion', v_current_version,
    'sectionId', v_section_id,
    'version', p_new_version
  );
end;
$$;

create or replace function compensate_listening_section_publication_v1(
  p_manifest_id text,
  p_expected_version text,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_publication listening_section_publications%rowtype;
begin
  if p_manifest_id is null or p_manifest_id !~ '^ci[0-9]+:t[1-4]:s[1-4]$'
    or p_expected_version is null or p_expected_version !~ '^[a-f0-9]{64}$'
  then
    raise exception 'Invalid Listening compensation identity or expected version.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('listening:' || p_manifest_id, 0));
  select * into v_publication
  from listening_section_publications
  where manifest_id = p_manifest_id;

  if v_publication.version is distinct from p_expected_version then
    raise exception 'LISTENING_EXPECTED_VERSION_MISMATCH during compensation.' using errcode = '40001';
  end if;

  if p_snapshot is null then
    if exists (
      select 1
      from attempt_answers answer_row
      join questions question_row on question_row.id = answer_row.question_id
      where question_row.section_id = v_publication.section_id
    ) or exists (
      select 1 from highlights where section_id = v_publication.section_id
    ) then
      raise exception 'LISTENING_COMPENSATION_DELETE_HAS_LEARNER_DEPENDENCIES.' using errcode = '55000';
    end if;
    delete from listening_section_publications where manifest_id = p_manifest_id;
    delete from test_sections where id = v_publication.section_id;
    return jsonb_build_object('manifestId', p_manifest_id, 'restoredVersion', null);
  end if;

  if p_snapshot->>'version' is null
    or p_snapshot->>'payloadSha256' is null
    or jsonb_typeof(p_snapshot->'payload') <> 'object'
  then
    raise exception 'Listening compensation snapshot is incomplete.' using errcode = '22023';
  end if;

  return publish_listening_section_v1(
    p_snapshot->'payload',
    p_expected_version,
    p_snapshot->>'version',
    p_snapshot->>'payloadSha256'
  );
end;
$$;

revoke all on function publish_listening_section_v1(jsonb, text, text, text) from public, anon, authenticated;
revoke all on function compensate_listening_section_publication_v1(text, text, jsonb) from public, anon, authenticated;
grant execute on function publish_listening_section_v1(jsonb, text, text, text) to service_role;
grant execute on function compensate_listening_section_publication_v1(text, text, jsonb) to service_role;
