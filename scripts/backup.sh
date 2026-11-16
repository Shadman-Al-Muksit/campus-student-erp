#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
bash "$PROJECT_ROOT/scripts/database.sh"
mkdir -p "$PROJECT_ROOT/backups"
target="$PROJECT_ROOT/backups/campus-erp-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --format=custom --file="$target" "$PGDATABASE"
echo "Backup created: $target"
