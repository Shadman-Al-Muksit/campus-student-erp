$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot.Replace('\','/').Replace('D:', '/mnt/d')
wsl -d Ubuntu -- bash -lc "cd '$projectPath' && bash scripts/dev.sh"
