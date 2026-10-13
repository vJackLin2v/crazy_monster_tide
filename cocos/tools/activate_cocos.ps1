# Activate the Cocos Creator editor window (bring to front).
# Why: the editor does NOT compile scripts while its window is in the background
# (Windows file-watch throttling). Bringing it to front triggers compilation
# (measured: done within ~5 seconds). No restart needed.
# Output: the editor PID (0 if not found).
$p = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.ProcessName -like 'CocosCreator*' } | Select-Object -First 1
if (-not $p) { Write-Output '0'; exit 1 }
$sig = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n); [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);'
$t = Add-Type -MemberDefinition $sig -Name WinAct2 -Namespace CocosTool2 -PassThru
$h = $p.MainWindowHandle
[void]$t::ShowWindow($h, 9)
[void]$t::BringWindowToTop($h)
[void]$t::SetForegroundWindow($h)
Write-Output $p.Id
