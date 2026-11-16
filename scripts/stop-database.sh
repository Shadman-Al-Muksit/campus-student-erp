#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
if pg_ctl -D "$RUNTIME_ROOT/pgdata" status >/dev/null 2>&1; then
  pg_ctl -D "$RUNTIME_ROOT/pgdata" -m fast -w stop
else
  echo 'The project database is already stopped.'
fi
