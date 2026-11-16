#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"
$ScriptPath = if ($PSCommandPath) { $PSCommandPath } else { $MyInvocation.MyCommand.Path }
$ScriptDir = Split-Path -Parent $ScriptPath
$Entrypoint = Join-Path $ScriptDir "scripts/install-register.mjs"

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
$NodeExe = if ($NodeCmd) {
  $NodeCmd.Source
} elseif ($env:ProgramFiles -and (Test-Path (Join-Path $env:ProgramFiles "nodejs\node.exe"))) {
  Join-Path $env:ProgramFiles "nodejs\node.exe"
} elseif (Test-Path "C:\Program Files\nodejs\node.exe") {
  "C:\Program Files\nodejs\node.exe"
} elseif (${env:ProgramFiles(x86)} -and (Test-Path (Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe"))) {
  Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe"
} else {
  $null
}

if (-not $NodeExe) {
  Write-Error "Node.js (>= 22.0.0) is required but 'node' was not found on PATH or in standard Program Files install locations."
  exit 1
}

& $NodeExe $Entrypoint @args
exit $LASTEXITCODE
