#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
bash "$PROJECT_ROOT/scripts/database.sh"
cd "$PROJECT_ROOT/backend"
python manage.py check
python manage.py makemigrations --check --dry-run
python -m pytest -q
cd "$PROJECT_ROOT"
python -m unittest discover -s research/tests -v
cd "$PROJECT_ROOT/frontend"
npm run build
if [[ "${1:-}" == '--browser' ]]; then
  # Both app servers must already be running. Install Chromium with npx playwright install chromium.
  npm run test:e2e
fi
