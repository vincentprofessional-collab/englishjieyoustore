-- Safely adopt old Listening Section shells that contain only legacy transcript
-- rows and no learner/question data before the versioned publisher overwrites them.

create or replace function adopt_listening_legacy_shell_v1(
  p_manifest_id text,
  p_adoption_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_book_no int;
  v_test_no int;
  v_section_no int;
  v_book_id uuid;
  v_test_id uuid;
  v_section test_sections%rowtype;
  v_publication listening_section_publications%rowtype;
  v_question_count int;
  v_attempt_count int;
  v_highlight_count int;
  v_payload jsonb;
begin
  if p_manifest_id is null or p_manifest_id !~ '^ci[0-9]+:t[1-4]:s[1-4]$'
    or p_adoption_version is null or p_adoption_version !~ '^[a-f0-9]{64}$'
  then
    raise exception 'Invalid Listening legacy adoption identity.' using errcode = '22023';
  end if;

  v_book_no := substring(p_manifest_id from '^ci([0-9]+):')::int;
  v_test_no := substring(p_manifest_id from ':t([1-4]):')::int;
  v_section_no := substring(p_manifest_id from ':s([1-4])$')::int;
  if v_book_no not between 4 and 21 then
    raise exception 'Listening legacy adoption book number is invalid.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('listening:' || p_manifest_id, 0));

  select * into v_publication
  from listening_section_publications
  where manifest_id = p_manifest_id;
  if v_publication.manifest_id is not null then
    return jsonb_build_object(
      'adopted', false,
      'manifestId', p_manifest_id,
      'sectionId', v_publication.section_id,
      'version', v_publication.version
    );
  end if;

  select id into v_book_id from content_books where code = format('cambridge-%s', v_book_no);
  if v_book_id is null then
    return jsonb_build_object('adopted', false, 'manifestId', p_manifest_id, 'version', null);
  end if;
  select id into v_test_id
  from tests
  where book_id = v_book_id and test_no = v_test_no and module = 'listening';
  if v_test_id is null then
    return jsonb_build_object('adopted', false, 'manifestId', p_manifest_id, 'version', null);
  end if;
  select * into v_section
  from test_sections
  where test_id = v_test_id and section_no = v_section_no;
  if v_section.id is null then
    return jsonb_build_object('adopted', false, 'manifestId', p_manifest_id, 'version', null);
  end if;

  select count(*) into v_question_count from questions where section_id = v_section.id;
  select count(*) into v_attempt_count
  from attempt_answers answer_row
  join questions question_row on question_row.id = answer_row.question_id
  where question_row.section_id = v_section.id;
  select count(*) into v_highlight_count from highlights where section_id = v_section.id;
  if coalesce(v_section.question_count, 0) <> 0
    or v_question_count <> 0
    or v_attempt_count <> 0
    or v_highlight_count <> 0
  then
    raise exception 'LISTENING_LEGACY_TARGET_NOT_EMPTY: adoption requires an empty Section shell.'
      using errcode = '55000';
  end if;

  select jsonb_build_object(
    'legacyShell', true,
    'manifestId', p_manifest_id,
    'legacySection', jsonb_build_object(
      'accessFeatureKey', v_section.access_feature_key,
      'fullAudioPath', v_section.full_audio_path,
      'isPaidOnly', v_section.is_paid_only,
      'questionCount', v_section.question_count,
      'questionImagePath', v_section.question_image_path,
      'sectionNo', v_section.section_no,
      'testId', v_section.test_id,
      'timeLimitSeconds', v_section.time_limit_seconds,
      'title', v_section.title
    ),
    'legacyTranscript', coalesce(
      jsonb_agg(jsonb_build_object(
        'audioPath', sentence.audio_path,
        'chineseText', sentence.chinese_text,
        'endMs', sentence.end_ms,
        'englishText', sentence.english_text,
        'sectionId', sentence.section_id,
        'sentenceNo', sentence.sentence_no,
        'sortOrder', sentence.sort_order,
        'speaker', sentence.speaker,
        'startMs', sentence.start_ms
      ) order by sentence.sentence_no) filter (where sentence.id is not null),
      '[]'::jsonb
    )
  ) into v_payload
  from transcript_sentences sentence
  where sentence.section_id = v_section.id;

  insert into listening_section_publications (
    manifest_id, section_id, version, storage_prefix, payload_sha256, payload
  ) values (
    p_manifest_id,
    v_section.id,
    p_adoption_version,
    format('listening/legacy/%s', p_manifest_id),
    p_adoption_version,
    v_payload
  );

  return jsonb_build_object(
    'adopted', true,
    'manifestId', p_manifest_id,
    'sectionId', v_section.id,
    'version', p_adoption_version
  );
end;
$$;

create or replace function restore_listening_legacy_shell_v1(
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
  v_section jsonb := p_snapshot->'payload'->'legacySection';
  v_transcript jsonb := p_snapshot->'payload'->'legacyTranscript';
  v_question_count int;
  v_attempt_count int;
  v_highlight_count int;
begin
  if p_manifest_id is null or p_manifest_id !~ '^ci[0-9]+:t[1-4]:s[1-4]$'
    or p_expected_version is null or p_expected_version !~ '^[a-f0-9]{64}$'
    or coalesce((p_snapshot->'payload'->>'legacyShell')::boolean, false) <> true
    or jsonb_typeof(v_section) <> 'object'
    or jsonb_typeof(v_transcript) <> 'array'
  then
    raise exception 'Invalid Listening legacy restoration snapshot.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('listening:' || p_manifest_id, 0));
  select * into v_publication
  from listening_section_publications
  where manifest_id = p_manifest_id;
  if v_publication.version is distinct from p_expected_version then
    raise exception 'LISTENING_EXPECTED_VERSION_MISMATCH during legacy restoration.' using errcode = '40001';
  end if;

  select count(*) into v_question_count from questions where section_id = v_publication.section_id;
  select count(*) into v_attempt_count
  from attempt_answers answer_row
  join questions question_row on question_row.id = answer_row.question_id
  where question_row.section_id = v_publication.section_id;
  select count(*) into v_highlight_count from highlights where section_id = v_publication.section_id;
  if v_attempt_count <> 0 or v_highlight_count <> 0 then
    raise exception 'LISTENING_LEGACY_RESTORE_HAS_LEARNER_DEPENDENCIES.' using errcode = '55000';
  end if;

  delete from questions where section_id = v_publication.section_id;
  delete from transcript_sentences where section_id = v_publication.section_id;
  update test_sections set
    access_feature_key = v_section->>'accessFeatureKey',
    full_audio_path = v_section->>'fullAudioPath',
    is_paid_only = (v_section->>'isPaidOnly')::boolean,
    question_count = (v_section->>'questionCount')::int,
    question_image_path = v_section->>'questionImagePath',
    section_no = (v_section->>'sectionNo')::int,
    time_limit_seconds = nullif(v_section->>'timeLimitSeconds', '')::int,
    title = v_section->>'title',
    updated_at = now()
  where id = v_publication.section_id;

  insert into transcript_sentences (
    audio_path, chinese_text, end_ms, english_text, section_id,
    sentence_no, sort_order, speaker, start_ms
  )
  select
    item->>'audioPath', item->>'chineseText', (item->>'endMs')::int,
    item->>'englishText', v_publication.section_id, (item->>'sentenceNo')::int,
    (item->>'sortOrder')::int, nullif(item->>'speaker', ''), (item->>'startMs')::int
  from jsonb_array_elements(v_transcript) item;

  delete from listening_section_publications where manifest_id = p_manifest_id;
  return jsonb_build_object('manifestId', p_manifest_id, 'restoredVersion', null);
end;
$$;

revoke all on function adopt_listening_legacy_shell_v1(text, text) from public, anon, authenticated;
revoke all on function restore_listening_legacy_shell_v1(text, text, jsonb) from public, anon, authenticated;
grant execute on function adopt_listening_legacy_shell_v1(text, text) to service_role;
grant execute on function restore_listening_legacy_shell_v1(text, text, jsonb) to service_role;
