#!/usr/bin/env bash
# ============================================================================
# Suzi Edge Function smoke tests — run these any time, no need to ask.
#
#   ./smoke.sh status                           # how many products are embedded
#   ./smoke.sh text "oversized wool coat" [n]   # text search (default n=5)
#   ./smoke.sh image "<https image url>" [n]     # image / visual search
#   ./smoke.sh reembed [batchSize]              # backfill stale embeddings (admin)
#
# Config:
#   - URL + anon key are read from mobile/.env (already there).
#   - ADMIN_TASK_SECRET (only reembed needs it) is read from the environment, or
#     from a gitignored sibling file `smoke.env` (ADMIN_TASK_SECRET=...).
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env"     # mobile/.env
SECRET_FILE="$SCRIPT_DIR/smoke.env"  # gitignored local secret (optional)

[ -f "$ENV_FILE" ] || { echo "❌ mobile/.env not found at $ENV_FILE"; exit 1; }
URL=$(grep -E '^EXPO_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d ' "')
KEY=$(grep -E '^EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d ' "')
[ -n "${ADMIN_TASK_SECRET:-}" ] || { [ -f "$SECRET_FILE" ] && . "$SECRET_FILE" || true; }

# search a deck, then resolve product ids -> titles for a readable result.
# NOTE: curl output is piped to python's stdin; the script comes from -c (not
# stdin), so both coexist. URL/KEY are passed as argv.
search_and_show() { # $1 = json body
  curl -sS -X POST "$URL/functions/v1/search" \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -d "$1" | python3 -c '
import sys, json, urllib.request
url, key = sys.argv[1], sys.argv[2]
data = json.load(sys.stdin)
deck = data.get("deck", [])
if not deck:
    print("  (empty deck) reason:", data.get("reason")); sys.exit(0)
ids = ",".join(d["productId"] for d in deck)
req = urllib.request.Request(url + "/rest/v1/products?id=in.(" + ids + ")&select=id,title,category",
                             headers={"apikey": key, "Authorization": "Bearer " + key})
rows = {r["id"]: r for r in json.load(urllib.request.urlopen(req))}
for d in deck:
    r = rows.get(d["productId"], {})
    print("  %.3f  %-35.35s  [%s]" % (d["score"], r.get("title", "?"), r.get("category", "?")))
' "$URL" "$KEY"
}

case "${1:-help}" in
  text)
    q="${2:?usage: ./smoke.sh text \"query\" [limit]}"; lim="${3:-5}"
    echo "🔎 text: \"$q\""
    search_and_show "$(python3 -c 'import json,sys;print(json.dumps({"text":sys.argv[1],"limit":int(sys.argv[2])}))' "$q" "$lim")"
    ;;
  image)
    u="${2:?usage: ./smoke.sh image \"https url\" [limit]}"; lim="${3:-5}"
    echo "🖼  image: $u"
    search_and_show "$(python3 -c 'import json,sys;print(json.dumps({"imageUrl":sys.argv[1],"limit":int(sys.argv[2])}))' "$u" "$lim")"
    ;;
  reembed)
    bs="${2:-25}"
    [ -n "${ADMIN_TASK_SECRET:-}" ] || { echo "❌ ADMIN_TASK_SECRET not set (export it or create smoke.env)"; exit 1; }
    echo "♻️  reembed (batchSize=$bs)"
    curl -sS -X POST "$URL/functions/v1/reembed" \
      -H "Authorization: Bearer $KEY" -H "x-admin-secret: $ADMIN_TASK_SECRET" \
      -H "Content-Type: application/json" -d "{\"batchSize\":$bs}" \
      | python3 -m json.tool
    ;;
  status)
    echo "📊 products by embedding_model:"
    curl -sS "$URL/rest/v1/products?select=embedding_model" \
      -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
      | python3 -c 'import sys,json,collections;c=collections.Counter((r.get("embedding_model") or "— (none)") for r in json.load(sys.stdin));[print(f"  {k}: {v}") for k,v in c.items()]'
    ;;
  *)
    cat <<'EOF'
Suzi Edge Function smoke tests:
  ./smoke.sh status                          # how many products are embedded, by model
  ./smoke.sh text "oversized wool coat" [n]  # text search (default n=5)
  ./smoke.sh image "<https image url>" [n]   # image / visual search
  ./smoke.sh reembed [batchSize]             # backfill stale embeddings (admin only)
EOF
    ;;
esac
