# Seed Workflow

## Safe Secret Setup

Do not create `.env.seed.local` with `echo "SUPABASE_SERVICE_ROLE_KEY=..."`.
That can save the key in shell history.

Use the interactive script instead:

```bash
npm run seed:env
```

Paste the key only after the prompt appears. The key is written to `.env.seed.local`
with `0600` permissions.

## Run Demo Listening Seed

```bash
npm run seed:listening
```

The script will:

- validate seed data before writing
- upsert book, test, section, questions, answers, and transcript sentences
- verify the final row counts and required fields after writing

## Current Limitation

This script does not yet wrap the whole seed in a database transaction because
PostgREST table upserts are separate requests. The script reduces dirty-state
risk by validating all data before writing and verifying the final result after writing.

For production-grade imports, add a Supabase SQL RPC that accepts one JSON payload
and performs all inserts inside one PL/pgSQL transaction.
