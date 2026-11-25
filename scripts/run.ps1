param([string]$Task = 'dev')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $nodeRuntime = $nodeCommand.Source }
else { $nodeRuntime = Join-Path (Split-Path $projectRoot -Parent) 'LinkedIn_Job_Assistant/venv/Lib/site-packages/playwright/driver/node.exe' }
if (-not (Test-Path -LiteralPath $nodeRuntime)) { throw 'Install Node.js 22.12+ first.' }
$env:PATH = (Split-Path $nodeRuntime -Parent) + ';' + $env:PATH
$localNpm = Join-Path $projectRoot '.tools/npm/package/bin/npm-cli.js'
if (Test-Path -LiteralPath $localNpm) { & $nodeRuntime $localNpm run $Task }
else { npm run $Task }
exit $LASTEXITCODE
