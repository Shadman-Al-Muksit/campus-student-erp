#!/usr/bin/env bash
# Source this file from another script; it never prints credentials.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_ROOT="${CAMPUS_RUNTIME_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/campus-erp}"
if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
  echo 'Missing .env. Run bash scripts/setup.sh first.' >&2
  return 1
fi
set -a
source "$PROJECT_ROOT/.env"
set +a
export PATH="$RUNTIME_ROOT/node/bin:$RUNTIME_ROOT/venv/bin:$PATH"
PG_BIN="$(dirname "$(ls -1 /usr/lib/postgresql/*/bin/initdb 2>/dev/null | sort -V | tail -n 1)")"
export PATH="$PG_BIN:$PATH"
mkdir -p "$PROJECT_ROOT/.runtime" "$RUNTIME_ROOT/socket"
