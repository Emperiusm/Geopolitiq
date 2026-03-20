#!/usr/bin/env bash
set -euo pipefail

OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
MODEL="mxbai-embed-large"

echo "Checking for $MODEL on $OLLAMA_URL..."

if curl -sf "$OLLAMA_URL/api/tags" | grep -q "$MODEL"; then
  echo "$MODEL already loaded."
else
  echo "Pulling $MODEL..."
  curl -X POST "$OLLAMA_URL/api/pull" -d "{\"name\": \"$MODEL\"}" --no-buffer
  echo "$MODEL pulled successfully."
fi
