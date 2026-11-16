#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
if [[ ! -f "$RUNTIME_ROOT/pgdata/PG_VERSION" ]]; then
  initdb -D "$RUNTIME_ROOT/pgdata" --username="$PGUSER" \
    --pwfile=<(printf '%s\n' "$PGPASSWORD") --auth-local=scram-sha-256 --auth-host=scram-sha-256
fi
if ! pg_ctl -D "$RUNTIME_ROOT/pgdata" status >/dev/null 2>&1; then
  pg_ctl -D "$RUNTIME_ROOT/pgdata" -l "$PROJECT_ROOT/.runtime/postgres.log" \
    -o "-p $PGPORT -h 127.0.0.1 -k $RUNTIME_ROOT/socket" -w start
fi
database_exists="$(psql -d postgres --set=db_name="$PGDATABASE" -At <<'SQL'
SELECT 1 FROM pg_database WHERE datname = :'db_name';
SQL
)"
if [[ "$database_exists" != '1' ]]; then
  createdb "$PGDATABASE"
fi
