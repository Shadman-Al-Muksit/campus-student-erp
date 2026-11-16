#!/usr/bin/env bash
# Restore only into a NEW, separately named database. Existing databases are refused.
set -euo pipefail
source "$(dirname "$0")/env.sh"
[[ $# -eq 2 ]] || { echo 'Usage: bash scripts/restore.sh backup.dump new_database_name' >&2; exit 1; }
[[ -f "$1" ]] || { echo 'Backup file does not exist.' >&2; exit 1; }
[[ "$2" =~ ^campus_restore_[a-z0-9_]+$ ]] || { echo 'Target name must start campus_restore_ and use lowercase letters, digits, underscores.' >&2; exit 1; }
bash "$PROJECT_ROOT/scripts/database.sh"
createdb "$2"
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$2" "$1"
echo "Restored into separate database $2. Live campus_erp was not changed."
