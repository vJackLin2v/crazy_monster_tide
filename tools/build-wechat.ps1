<#
  build-wechat.ps1 - one-click WeChat mini-game build for this project.

  1) Builds platform=wechatgame into cocos/build/wechatgame
  2) Rewrites project.config.json (libVersion/appid) - newer DevTools rejects libVersion="game"
  3) Optional -Open: launches WeChat DevTools CLI on the same folder (no re-import needed)

  Usage: powershell -ExecutionPolicy Bypass -File tools\build-wechat.ps1 -Open
#>
param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$AppId = 'wx458e7364d6b249cc',
  [string]$LibVersion = '3.17.5',
  [string]$Creator = 'C:\ProgramData\cocos\editors\Creator\3.8.6\CocosCreator.exe',
  [string]$DevToolsCli = '',
  [switch]$Open
)

$ErrorActionPreference = 'Stop'

$cocos = Join-Path $ProjectRoot 'cocos'
$out   = Join-Path $cocos 'build\wechatgame'

if (-not (Test-Path $Creator)) {
  throw "Cocos Creator not found: $Creator (pass -Creator <path>)"
}

Write-Host "[1/3] building wechatgame (~60s)..." -ForegroundColor Cyan
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:ELECTRON_RUN_AS_NODE = ''
# Creator CLI 会往 stderr 打无害的 AxiosError；在 $ErrorActionPreference=Stop 下会被当成异常中止
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$log = & $Creator --project $cocos --build 'platform=wechatgame;debug=false;md5Cache=false' 2>&1 | Out-String
$ErrorActionPreference = $prevEap
if ($log -notmatch 'build success') {
  Write-Host $log
  throw 'build failed (check log above; editor may still be open)'
}
if (-not (Test-Path (Join-Path $out 'game.js'))) { throw "missing output: $out" }

Write-Host "[2/3] patching project.config.json ..." -ForegroundColor Cyan
$cfg = [ordered]@{
  description     = 'crazy-monster-tide (wechat build)'
  miniprogramRoot = './'
  projectname     = 'crazy_monster_tide'
  appid           = $AppId
  libVersion      = $LibVersion
  compileType     = 'game'
  setting         = [ordered]@{
    urlCheck = $true; es6 = $false; enhance = $true; postcss = $true
    minified = $true; minifyWXSS = $true; minifyWXML = $true
    useIsolateContext = $true; ignoreDevUnusedFiles = $true
  }
  condition   = [ordered]@{}
  packOptions = [ordered]@{ ignore = @(); include = @() }
}
$cfg | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $out 'project.config.json') -Encoding utf8
$orient = (Get-Content (Join-Path $out 'game.json') -Raw | ConvertFrom-Json).deviceOrientation
Write-Host ("   appid=$AppId  libVersion=$LibVersion  orientation=$orient")

Write-Host "[3/3] done: $out" -ForegroundColor Green
Write-Host '   In WeChat DevTools press Compile (Ctrl+B). No re-import needed.'

if ($Open) {
  if (-not $DevToolsCli) {
    $cands = @(
      'C:\Program Files (x86)\Tencent\wechat\cli.bat',
      'C:\Program Files\Tencent\wechat\cli.bat'
    )
    $DevToolsCli = $cands | Where-Object { Test-Path $_ } | Select-Object -First 1
  }
  if ($DevToolsCli -and (Test-Path $DevToolsCli)) {
    Write-Host 'opening WeChat DevTools ...' -ForegroundColor Cyan
    & $DevToolsCli open --project $out
  } else {
    Write-Host '   [hint] WeChat DevTools CLI not found; press Compile manually in DevTools.' -ForegroundColor Yellow
  }
}
