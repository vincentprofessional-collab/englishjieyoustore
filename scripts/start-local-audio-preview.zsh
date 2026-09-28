#!/bin/zsh
set -euo pipefail

repo_dir="${0:A:h:h}"
cos_env_file="${COS_MEDIA_ENV_FILE:-${repo_dir}/../englishjieyoustore/.env.cos-migration.local}"
bbc_env_file="${BBC_AUDIO_ENV_FILE:-${repo_dir}/.env.bbc-audio.local}"

if [[ -f "$cos_env_file" ]]; then
  set -a
  source "$cos_env_file"
  set +a
  export COS_MEDIA_ENABLED=true
else
  print -u2 'Tencent COS configuration is missing; New Concept audio will use the configured fallback.'
fi

if [[ -f "$bbc_env_file" ]]; then
  set -a
  source "$bbc_env_file"
  set +a
fi

bbc_archive="${BBC_LOCAL_AUDIO_ROOT:-/Volumes/My HDD3/BBC take away english}"
if [[ -d "$bbc_archive" ]]; then
  export BBC_LOCAL_AUDIO_ROOT="$bbc_archive"
  print -u2 "Using local BBC audio archive: $bbc_archive"
elif [[ -z "${R2_ACCOUNT_ID:-}" || -z "${R2_BBC_AUDIO_ACCESS_KEY_ID:-}" || -z "${R2_BBC_AUDIO_SECRET_ACCESS_KEY:-}" ]]; then
  print -u2 'BBC archive and R2 read-only configuration are both unavailable; BBC audio cannot play in this local preview.'
fi

cd "$repo_dir"
exec ./node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port "${1:-3101}"
