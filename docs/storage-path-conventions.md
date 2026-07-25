# Storage Path Conventions

Supabase Storage already has bucket names, so database fields should store paths inside the bucket.

## Audio Bucket

Bucket: `audio`

Store this in database:

```text
listening/ci4/t1/s1/full.mp3
listening/ci4/t1/s1/sentences/ci4_t1_s1_001.mp3
```

Do not store this in database:

```text
audio/listening/ci4/t1/s1/full.mp3
https://...
/Users/...
```

## Images Bucket

Bucket: `images`

Store this in database:

```text
listening/ci4/t1/s1/questions/page-1.png
writing/task1/bar-chart-001.png
speaking/part1/advice/question.png
```

## Why

The frontend helper already knows which bucket to use. Keeping only the object path avoids duplicated paths like:

```text
/storage/v1/object/public/audio/audio/listening/...
```

The seed script rejects paths that start with `audio/`, `images/`, `http://`, `https://`, or `/`.
