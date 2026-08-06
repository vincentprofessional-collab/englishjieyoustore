#!/bin/zsh
set -euo pipefail

ROOT_DIR="/Users/shidianjin/ielts-platform"

prompt_text() {
  local message="$1"
  local default_value="${2:-}"
  osascript \
    -e "display dialog \"$message\" default answer \"$default_value\" buttons {\"取消\", \"继续\"} default button \"继续\" with title \"BBC 音频上传到 Cloudflare R2\"" \
    -e "text returned of result"
}

prompt_secret() {
  local message="$1"
  osascript \
    -e "display dialog \"$message\" default answer \"\" buttons {\"取消\", \"继续\"} default button \"继续\" with title \"BBC 音频上传到 Cloudflare R2\" with hidden answer" \
    -e "text returned of result"
}

strip_spaces() {
  tr -d '[:space:]' <<<"$1"
}

account_id="$(strip_spaces "$(prompt_text "请输入 Cloudflare Account ID")")"
bucket="$(strip_spaces "$(prompt_text "请输入 R2 Bucket 名" "englishjieyou-bbc-audio")")"
access_key_id="$(strip_spaces "$(prompt_secret "请输入 R2 Access Key ID")")"
secret_access_key="$(strip_spaces "$(prompt_secret "请输入 R2 Secret Access Key")")"

export R2_ACCOUNT_ID="$account_id"
export R2_BUCKET="$bucket"
export R2_ACCESS_KEY_ID="$access_key_id"
export R2_SECRET_ACCESS_KEY="$secret_access_key"

cd "$ROOT_DIR"
node scripts/upload-bbc-audio-to-r2.mjs
