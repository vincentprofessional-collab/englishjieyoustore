#!/bin/zsh
set -euo pipefail

cd /Users/shidianjin/ielts-platform

export HOST=0.0.0.0
export PORT=3000
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

exec /usr/local/bin/npm run dev
