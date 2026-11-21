# Notification hook: show a Windows tray notification when Claude needs input or permission.
$ErrorActionPreference = 'SilentlyContinue'
$raw = [Console]::In.ReadToEnd()
$msg = 'Claude needs your attention'
try {
    $data = $raw | ConvertFrom-Json
    if ($data.message) { $msg = [string]$data.message }
} catch {}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$icon = New-Object System.Windows.Forms.NotifyIcon
$icon.Icon = [System.Drawing.SystemIcons]::Information
$icon.BalloonTipTitle = 'Claude Code - hackathonpo'
$icon.BalloonTipText = $msg
$icon.Visible = $true
$icon.ShowBalloonTip(5000)
Start-Sleep -Seconds 6
$icon.Dispose()
