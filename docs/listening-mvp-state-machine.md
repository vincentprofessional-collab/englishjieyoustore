# Listening MVP State Machine

## Phase 1: Current Build

```
/listening
  -> section list
  -> /listening/[sectionId]
     -> mock mode by default
     -> local answers
     -> submit
     -> local scoring
     -> transcript review
```

The current page intentionally does not write to `attempts` yet, because login and user ownership need to be connected first.

## Phase 2: Practice vs Mock

```
enter section
  -> choose mode
     -> practice
        -> no timer
        -> Chinese toggle allowed
        -> sentence-by-sentence transcript allowed
        -> manual submit
        -> scoring
        -> review
     -> mock
        -> countdown starts
        -> no Chinese toggle during answering
        -> no sentence-by-sentence transcript during answering
        -> manual submit or timeout
        -> unanswered questions count as wrong
        -> scoring
        -> review
```

Rule: Chinese translation, E/Chinese toggle, sentence scrolling, and single-sentence audio are learning tools. They are only available in practice mode or after answers are submitted. Mock answering mode shows questions and full audio only.

## Review Layout

Desktop:

```
left: transcript + highlights + Chinese toggle
right: questions + user answers + correct answers
top: full audio player
```

Mobile:

```
top: sticky audio + score
then: questions
then: transcript
```

## Component Boundary

- `ListeningPage`: section list
- `ListeningSectionPage`: server data loading
- `ListeningPractice`: answer state, submit state, local scoring
- `AudioPlayer`: Howler-based playback, speed, volume, seek

## Next State Changes

- Add `mode` state: `practice | mock`
- Add `status` state: `answering | submitted | timed_out`
- Add countdown timer for mock mode
- Add Supabase writes to `attempts` and `attempt_answers` after auth is connected
- Add sentence sync from `start_ms` / `end_ms`
