param(
  [Parameter(Mandatory = $true)][string]$Keep,
  [switch]$Execute
)
# 清理 deliverables：只保留指定交付目录/文件。
# 默认 dry-run；确认后加 -Execute。
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\deliverables')).Path
$keepPath = (Resolve-Path (Join-Path $root $Keep)).Path
if (-not $keepPath.StartsWith($root + [IO.Path]::DirectorySeparatorChar)) {
  throw "Keep 路径不在 deliverables 下：$keepPath"
}
$removed = 0
foreach ($item in Get-ChildItem -LiteralPath $root -Force) {
  if ($item.FullName -eq $keepPath) { continue }
  if ($Execute) {
    Remove-Item -LiteralPath $item.FullName -Recurse -Force
    Write-Output ("REMOVED " + $item.Name)
  } else {
    Write-Output ("WOULD REMOVE " + $item.Name)
  }
  $removed++
}
Write-Output ("KEEP " + $keepPath)
Write-Output ("COUNT " + $removed + " " + ($(if ($Execute) { 'removed' } else { 'would be removed' })))
