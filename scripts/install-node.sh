#!/usr/bin/env bash
set -euo pipefail
runtime="${CAMPUS_RUNTIME_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/campus-erp}"
mkdir -p "$runtime/downloads" "$runtime/node"
cd "$runtime/downloads"
curl -fsS --retry 2 https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o SHASUMS256.txt
archive="$(awk '/linux-x64.tar.xz$/ {print $2}' SHASUMS256.txt)"
[[ -n "$archive" ]] || exit 1
curl -fsS --retry 2 "https://nodejs.org/dist/latest-v22.x/$archive" -o "$archive"
grep " $archive$" SHASUMS256.txt | sha256sum -c -
tar -xJf "$archive" -C "$runtime/node" --strip-components=1
"$runtime/node/bin/node" --version
