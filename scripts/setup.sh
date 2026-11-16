#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_ROOT="${CAMPUS_RUNTIME_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/campus-erp}"
mkdir -p "$RUNTIME_ROOT/downloads" "$PROJECT_ROOT/.runtime"
if ! ls /usr/lib/postgresql/*/bin/initdb >/dev/null 2>&1; then
  echo 'Install prerequisites first: sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib python3-venv python3-pip curl xz-utils' >&2
  exit 1
fi
if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
  python3 - "$PROJECT_ROOT/.env" <<'PY'
import pathlib, secrets, sys
path = pathlib.Path(sys.argv[1])
path.write_text('\n'.join([
    'DJANGO_DEBUG=1', 'DJANGO_SECRET_KEY=' + secrets.token_urlsafe(48),
    'DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,testserver',
    'PGHOST=127.0.0.1', 'PGPORT=55432', 'PGDATABASE=campus_erp',
    'PGUSER=campus_erp', 'PGPASSWORD=' + secrets.token_urlsafe(32), ''
]))
path.chmod(0o600)
PY
fi
if [[ ! -x "$RUNTIME_ROOT/node/bin/node" ]]; then
  cd "$RUNTIME_ROOT/downloads"
  curl -fsS --retry 2 https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o SHASUMS256.txt
  archive="$(awk '/linux-x64.tar.xz$/ {print $2}' SHASUMS256.txt)"
  [[ -n "$archive" ]] || { echo 'Could not determine the Node archive.' >&2; exit 1; }
  curl -fsS --retry 2 "https://nodejs.org/dist/latest-v22.x/$archive" -o "$archive"
  grep " $archive$" SHASUMS256.txt | sha256sum -c -
  mkdir -p "$RUNTIME_ROOT/node"
  tar -xJf "$archive" -C "$RUNTIME_ROOT/node" --strip-components=1
fi
source "$PROJECT_ROOT/scripts/env.sh"
if [[ ! -x "$RUNTIME_ROOT/venv/bin/python" ]]; then
  python3 -m venv --without-pip "$RUNTIME_ROOT/venv"
fi
if ! python -m pip --version >/dev/null 2>&1; then
  if ! python -m ensurepip --upgrade; then
    # Some Ubuntu installations omit ensurepip. Bootstrap only this isolated venv.
    curl -fsS --retry 2 https://bootstrap.pypa.io/get-pip.py -o "$RUNTIME_ROOT/downloads/get-pip.py"
    python "$RUNTIME_ROOT/downloads/get-pip.py"
  fi
fi
python -m pip install -r "$PROJECT_ROOT/requirements.lock.txt"
bash "$PROJECT_ROOT/scripts/database.sh"
cd "$PROJECT_ROOT/backend"
python manage.py migrate --noinput
python manage.py seed_demo
cd "$PROJECT_ROOT/frontend"
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
printf '\nSetup complete. Start the app: bash scripts/dev.sh\n'
