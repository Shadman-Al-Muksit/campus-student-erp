#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
bash "$PROJECT_ROOT/scripts/database.sh"
cleanup() { kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(cd "$PROJECT_ROOT/backend" && python manage.py runserver 127.0.0.1:8000 --noreload) &
BACKEND_PID=$!
(cd "$PROJECT_ROOT/frontend" && npm run dev -- --host 127.0.0.1 --port 5173 --strictPort) &
FRONTEND_PID=$!
echo 'Campus ERP: http://localhost:5173 — Ctrl+C stops both app servers.'
wait -n "$BACKEND_PID" "$FRONTEND_PID"
