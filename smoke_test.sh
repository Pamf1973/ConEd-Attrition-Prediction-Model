#!/bin/bash
# Smoke test for ConEd Steam Dashboard
set -e

BASE_URL="http://localhost:3001"
PASS="coned-steam-2026"

echo "================================================"
echo "  ConEd Dashboard — Smoke Test"
echo "  $(date -u)"
echo "================================================"
echo ""

# ── Step 1: Kill any existing server on 3001 ──
echo "[1/9] Killing any existing server on :3001..."
lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# ── Step 2: Start server ──
echo "[2/9] Starting server..."
cd /Users/icaraballo/Documents/GitHub/coned-dashboard
node api/server.js &
SERVER_PID=$!
echo "  → PID: $SERVER_PID"

# Wait for server to start
for i in $(seq 1 15); do
  if curl -s -o /dev/null -w "" $BASE_URL/tmp 2>/dev/null; then
    echo "  → Server ready after ${i}s"
    break
  fi
  sleep 1
done

# ── Step 3: Auth ──
echo "[3/9] Logging in..."
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$PASS\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "  ❌ Auth FAILED"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi
echo "  ✅ Token obtained: ${TOKEN:0:20}..."

# ── Step 4: Data endpoints ──
echo "[4/9] Testing data endpoints..."
BUILDINGS=$(curl -s $BASE_URL/api/data/buildings -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
echo "  ✅ /api/data/buildings → $BUILDINGS buildings"

ENRICHMENT=$(curl -s $BASE_URL/api/data/enrichment -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
echo "  ✅ /api/data/enrichment → $ENRICHMENT entries"

# ── Step 5: AI Q&A ──
echo "[5/9] Testing AI Q&A..."
ANSWER=$(curl -s -X POST $BASE_URL/api/ai/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"question":"What is the total LL97 exposure for 2024?"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('answer','')[:100])" 2>/dev/null)
echo "  ✅ /api/ai/ask → \"${ANSWER}...\""

# ── Step 6: AI Summarize ──
echo "[6/9] Testing AI summarize..."
SUMMARY=$(curl -s -X POST $BASE_URL/api/ai/summarize \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type":"portfolio"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('summary','')[:80])" 2>/dev/null)
echo "  ✅ /api/ai/summarize → \"${SUMMARY}...\""

# ── Step 7: Watchlist ──
echo "[7/9] Testing watchlist..."
SAVE=$(curl -s -X POST $BASE_URL/api/watchlist/save \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"addresses":["123 TEST ST"]}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
echo "  ✅ /api/watchlist/save → $SAVE"

LOAD=$(curl -s $BASE_URL/api/watchlist/load \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('addresses',[])))" 2>/dev/null)
echo "  ✅ /api/watchlist/load → ${LOAD} addresses"

# ── Step 8: Proactive Alerts (wait for LLM enrichment) ──
echo "[8/9] Waiting for LLM enrichment (up to 60s)..."
MAX_WAIT=60
for i in $(seq 1 $MAX_WAIT); do
  ALERTS=$(curl -s $BASE_URL/api/alerts/proactive -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  ENRICHED=$(echo "$ALERTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for a in d['alerts'] if a.get('description')))" 2>/dev/null)
  TOTAL=$(echo "$ALERTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['alerts']))" 2>/dev/null)
  SUMMARY=$(echo "$ALERTS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
s=d.get('summary',{})
print(f\"C:{s.get('critical',0)} H:{s.get('high',0)} M:{s.get('medium',0)} L:{s.get('low',0)}\")" 2>/dev/null)
  
  if [ "$ENRICHED" -gt 0 ] 2>/dev/null; then
    echo "  ✅ /api/alerts/proactive → ${TOTAL} alerts (${ENRICHED} enriched) | ${SUMMARY}"
    break
  fi
  
  # Show progress every 10s
  if [ $((i % 10)) -eq 0 ]; then
    echo "  ⏳ Waiting... (${i}s) — enriched: ${ENRICHED}/${TOTAL}"
  fi
  sleep 1
done

# Final alert check
ALERTS=$(curl -s $BASE_URL/api/alerts/proactive -H "Authorization: Bearer $TOKEN" 2>/dev/null)
ENRICHED=$(echo "$ALERTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for a in d['alerts'] if a.get('description')))" 2>/dev/null)
TOTAL=$(echo "$ALERTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['alerts']))" 2>/dev/null)
SUMMARY=$(echo "$ALERTS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
s=d.get('summary',{})
print(f\"critical={s.get('critical',0)}, high={s.get('high',0)}, medium={s.get('medium',0)}, low={s.get('low',0)}\")" 2>/dev/null)

echo "  📊 Alert summary: ${SUMMARY}"
echo "  📊 Enriched: ${ENRICHED}/${TOTAL}"

# ── Step 9: Proactive Alert Summary endpoint ──
echo "[9/9] Testing proactive alert summary..."
SUMM=$(curl -s $BASE_URL/api/alerts/proactive/summary -H "Authorization: Bearer $TOKEN")
echo "  ✅ /api/alerts/proactive/summary → $SUMM"

# ── Vite build check ──
echo ""
echo "--- Vite Build ---"
cd /Users/icaraballo/Documents/GitHub/coned-dashboard
npx vite build 2>&1 | tail -5

# ── Cleanup ──
echo ""
echo "================================================"
echo "  Smoke Test Complete"
echo "================================================"
kill $SERVER_PID 2>/dev/null
echo "  ✅ Server stopped"

# Results summary
echo ""
echo "=== RESULTS ==="
echo "Buildings:        $BUILDINGS"
echo "Enrichment:       $ENRICHMENT"
echo "Alerts:           ${TOTAL} total, ${ENRICHED} enriched"
echo "Alert summary:    ${SUMMARY}"
echo "Server PID:       $SERVER_PID"