#!/usr/bin/env bash
# Direct API authorization evidence for Lab 3 Part 7.
# Prereqs: database seeded (`npx prisma db seed` in server/) and the API running on :3000.
# Usage:   bash scripts/api-authorization-evidence.sh
set -euo pipefail
API=${API:-http://localhost:3000/api}

json_field() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String($1)))"; }
login() {
  curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | json_field "JSON.parse(s).token||''"
}
req() {
  local label=$1; shift
  local out code body
  out=$(curl -s -w '\n%{http_code}' "$@")
  code=$(echo "$out" | tail -1)
  body=$(echo "$out" | head -1 | cut -c1-80)
  printf '%-60s -> %s %s\n' "$label" "$code" "$body"
}

D=$(login david.lee@example.com 'Password123!')
J=$(login jennifer.anderson@example.com 'Password123!')
S=$(login sarah.connor@example.com 'Password123!')
TID=$(curl -s "$API/staff/tickets?search=TKT-2026-000001" -H "Authorization: Bearer $S" | json_field "JSON.parse(s).tickets[0].id")

echo "# Ticket TKT-2026-000001 (id=$TID) belongs to David Lee (Requester)"
req "GET   /api/tickets (no token)" "$API/tickets"
req "GET   /api/tickets (only header X-Requester-Id: 1)" -H 'X-Requester-Id: 1' "$API/tickets"
req "GET   /api/tickets/$TID (Jennifer, not the owner)" -H "Authorization: Bearer $J" "$API/tickets/$TID"
req "GET   /api/tickets/$TID/comments (Jennifer, not the owner)" -H "Authorization: Bearer $J" "$API/tickets/$TID/comments"
req "GET   /api/tickets/$TID/internal-notes (David, Requester)" -H "Authorization: Bearer $D" "$API/tickets/$TID/internal-notes"
req "GET   /api/staff/tickets (David, Requester)" -H "Authorization: Bearer $D" "$API/staff/tickets"
req "PATCH /api/staff/tickets/$TID/status (David, Requester)" -X PATCH -H "Authorization: Bearer $D" \
  -H 'Content-Type: application/json' -d '{"status":"Closed"}' "$API/staff/tickets/$TID/status"
req "GET   /api/admin/users (Sarah, IT Staff)" -H "Authorization: Bearer $S" "$API/admin/users"
req "POST  /api/tickets/$TID/indicate-resolved (Sarah, IT Staff)" -X POST -H "Authorization: Bearer $S" "$API/tickets/$TID/indicate-resolved"
req "GET   /api/tickets/$TID/internal-notes (Sarah, IT Staff)" -H "Authorization: Bearer $S" "$API/tickets/$TID/internal-notes"
req "POST  /api/auth/logout (David)" -X POST -H "Authorization: Bearer $D" "$API/auth/logout"
req "GET   /api/tickets (David's old token after logout)" -H "Authorization: Bearer $D" "$API/tickets"
