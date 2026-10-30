<#
  build-wechat.ps1 - one-click WeChat mini-game build.

  1) Builds platform=wechatgame into cocos/build/wechatgame
  2) Rewrites project.config.json as BOM-less UTF-8 with libVersion/appid (DevTools rejects libVersion="game")
  3) Verifies the JSON parses, checks package sizes, optionally opens DevTools via -Open

  Usage (change code, then):
    powershell -ExecutionPolicy Bypass -File tools\build-wechat.ps1 -Open

  Keep this file ASCII-only: Windows PowerShell 5.1 reads .ps1 as ANSI when there is no BOM,
  and non-ASCII text breaks the parser.
#>
param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$AppId = 'wx8a25bc49632e9b92',
  [string]$LibVersion = '3.17.5',
  [string]$Creator = 'C:\ProgramData\cocos\editors\Creator\3.8.6\CocosCreator.exe',
  [string]$DevToolsCli = '',
  [switch]$Open
)

$ErrorActionPreference = 'Stop'

$cocos = Join-Path $ProjectRoot 'cocos'
$out   = Join-Path $cocos 'build\wechatgame'

if (-not (Test-Path $Creator)) { throw "Cocos Creator not found: $Creator (pass -Creator <path>)" }

Write-Host '[1/3] building wechatgame (~60s) ...' -ForegroundColor Cyan
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:ELECTRON_RUN_AS_NODE = ''
# Creator CLI writes a harmless AxiosError to stderr; with ErrorActionPreference=Stop that aborts us.
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$log = & $Creator --project $cocos --build 'platform=wechatgame;debug=false;md5Cache=false' 2>&1 | Out-String
$ErrorActionPreference = $prevEap
if ($log -notmatch 'build success') { Write-Host $log; throw 'build failed (see log above; is the editor still open?)' }
if (-not (Test-Path (Join-Path $out 'game.js'))) { throw "missing output: $out" }

Write-Host '[2/3] writing project.config.json (BOM-less UTF-8) ...' -ForegroundColor Cyan
$cfg = [ordered]@{
  description     = 'crazy-monster-tide (wechat build)'
  miniprogramRoot = './'
  projectname     = 'crazy_pigeon_king'
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
$cfgPath = Join-Path $out 'project.config.json'
$json = $cfg | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($cfgPath, $json, (New-Object System.Text.UTF8Encoding($false)))

# Self-check: no BOM, parses as JSON (this exact failure broke DevTools once).
$bytes = [System.IO.File]::ReadAllBytes($cfgPath)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
  throw 'project.config.json still has a UTF-8 BOM; WeChat DevTools cannot parse it'
}
try { Get-Content $cfgPath -Raw | ConvertFrom-Json | Out-Null } catch {
  throw ('project.config.json is not valid JSON: ' + $_.Exception.Message)
}

$orient = (Get-Content (Join-Path $out 'game.json') -Raw | ConvertFrom-Json).deviceOrientation
Write-Host ('   appid=' + $AppId + '  libVersion=' + $LibVersion + '  orientation=' + $orient)

$all = Get-ChildItem $out -Recurse -File | Measure-Object Length -Sum
$sub = Get-ChildItem (Join-Path $out 'subpackages') -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum
$mainMB = [math]::Round(($all.Sum - $sub.Sum) / 1MB, 2)
$allMB = [math]::Round($all.Sum / 1MB, 2)
$sizeLine = '   main package ' + $mainMB + 'MB (limit 4MB)   total ' + $allMB + 'MB (limit 20MB)'
if ($mainMB -gt 4) {
  Write-Host $sizeLine -ForegroundColor Red
  Write-Host '   [warn] main package exceeds 4MB - split into subpackages before upload' -ForegroundColor Red
} else {
  Write-Host $sizeLine -ForegroundColor Green
}

Write-Host ('[3/3] done: ' + $out) -ForegroundColor Green
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
