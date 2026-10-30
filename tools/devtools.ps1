<#
  devtools.ps1 - drive WeChat DevTools from the command line.

  Requires: DevTools -> Settings -> Security Settings -> Service Port = On
  (the CLI refuses to work while the service port is disabled)

  Usage:
    powershell -ExecutionPolicy Bypass -File tools\devtools.ps1 -Open
    powershell -ExecutionPolicy Bypass -File tools\devtools.ps1 -Preview
    powershell -ExecutionPolicy Bypass -File tools\devtools.ps1 -Upload -Version 1.0.3 -Desc "note"
    powershell -ExecutionPolicy Bypass -File tools\devtools.ps1 -Login
#>
param(
  [string]$Cli = 'H:\微信web开发者工具\cli.bat',
  [string]$Project = 'H:\AI-game\crazy_monster_tide\cocos\build\wechatgame',
  [switch]$Open,
  [switch]$Preview,
  [switch]$Upload,
  [switch]$Login,
  [string]$Version = '1.0.0',
  [string]$Desc = 'build'
)

$ErrorActionPreference = 'Continue'
if (-not (Test-Path $Cli)) { throw "DevTools CLI not found: $Cli" }
if (-not (Test-Path $Project)) { throw "project not found: $Project" }

function Run-Cli([string[]]$argv) {
  Write-Host ('> cli ' + ($argv -join ' ')) -ForegroundColor Cyan
  $out = & $Cli @argv 2>&1 | Out-String
  Write-Host $out
  if ($out -match 'service port disabled|服务端口已关闭') {
    Write-Host '[!] Turn on DevTools -> Settings -> Security Settings -> Service Port, then retry.' -ForegroundColor Yellow
  }
}

if ($Login) { Run-Cli @('login') }
if ($Open) { Run-Cli @('open', '--project', $Project) }
if ($Preview) { Run-Cli @('preview', '--project', $Project) }
if ($Upload) { Run-Cli @('upload', '--project', $Project, '-v', $Version, '-d', $Desc) }
if (-not ($Login -or $Open -or $Preview -or $Upload)) {
  Write-Host 'Nothing to do. Pass -Open / -Preview / -Upload / -Login.' -ForegroundColor Yellow
}
