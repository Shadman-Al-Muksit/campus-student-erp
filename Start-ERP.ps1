$ErrorActionPreference = 'Stop'
Push-Location -LiteralPath $PSScriptRoot
try {
    wsl -d Ubuntu -- bash scripts/dev.sh
} finally {
    Pop-Location
}
