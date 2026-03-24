#!/bin/bash
set -e

BASE_URL="${1:-http://localhost:3001}"

echo "=== Gambit Engine Smoke Test ==="

echo -n "Health... "
STATUS=$(curl -sf "$BASE_URL/engine/v1/health" | jq -r '.status')
echo "$STATUS"

echo -n "Entity count... "
TOTAL=$(curl -sf "$BASE_URL/engine/v1/entities?limit=1" | jq -r '.meta.total')
echo "$TOTAL entities"

echo -n "Entity detail... "
NAME=$(curl -sf "$BASE_URL/engine/v1/entities/country:united-states" | jq -r '.data.name' 2>/dev/null || echo "N/A")
echo "$NAME"

echo -n "Resolve USA... "
MATCH=$(curl -sf -X POST "$BASE_URL/engine/v1/entities/resolve" -H 'Content-Type: application/json' -d '{"query":"USA"}' | jq -r '.data.match.id' 2>/dev/null || echo "N/A")
echo "$MATCH"

echo -n "Batch fetch... "
BATCH=$(curl -sf -X POST "$BASE_URL/engine/v1/entities/batch" -H 'Content-Type: application/json' -d '{"ids":["country:united-states","country:china"]}' | jq -r '.meta.total' 2>/dev/null || echo "N/A")
echo "$BATCH entities"

echo "=== Smoke test complete ==="
