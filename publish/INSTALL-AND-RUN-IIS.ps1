# KIDDIE KRUZZER POS - AUTOMATED IIS INSTALLATION SCRIPT
# Run this script as Administrator in PowerShell

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error 'This script requires Administrator privileges! Please right-click and Run as Administrator.'
    exit 1
}

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SiteName = 'KiddieKruzzerPOS'
$AppPoolName = 'KiddieKruzzerAppPool'
$SitePort = 8080
$PhysicalPath = Join-Path $CurrentDir 'wwwroot'
$ServerDir = Join-Path $CurrentDir 'server'

Write-Host '=====================================================' -ForegroundColor Cyan
Write-Host 'CONFIGURING KIDDIE KRUZZER ON IIS' -ForegroundColor Cyan
Write-Host '=====================================================' -ForegroundColor Cyan

Import-Module WebAdministration -ErrorAction SilentlyContinue

Write-Host "Configuring Application Pool: $AppPoolName" -ForegroundColor Green
if (Test-Path ("IIS:\AppPools\" + $AppPoolName)) {
    Stop-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
    Remove-WebAppPool -Name $AppPoolName
}
New-WebAppPool -Name $AppPoolName
Set-ItemProperty ("IIS:\AppPools\" + $AppPoolName) -Name 'managedRuntimeVersion' -Value ''
Set-ItemProperty ("IIS:\AppPools\" + $AppPoolName) -Name 'processModel.idleTimeout' -Value ([TimeSpan]::FromMinutes(0))

Write-Host "Creating IIS Web Site: $SiteName on port $SitePort" -ForegroundColor Green
if (Test-Path ("IIS:\Sites\" + $SiteName)) {
    Stop-WebSite -Name $SiteName -ErrorAction SilentlyContinue
    Remove-WebSite -Name $SiteName
}
New-WebSite -Name $SiteName -Port $SitePort -PhysicalPath $PhysicalPath -ApplicationPool $AppPoolName
Start-WebSite -Name $SiteName

Write-Host "Opening Firewall Port $SitePort" -ForegroundColor Green
New-NetFirewallRule -DisplayName ("Kiddie Kruzzer POS HTTP " + $SitePort) -Direction Inbound -Protocol TCP -LocalPort $SitePort -Action Allow -ErrorAction SilentlyContinue | Out-Null

Write-Host 'Configuring and Starting Node.js Backend Service on Port 3000...' -ForegroundColor Green
Push-Location $ServerDir
cmd /c npm install --omit=dev

# Stop any existing PM2 process or stale node.exe holding port 3000 so updated server.ts & thermal-printer.ts load fresh
Write-Host 'Stopping any existing backend process on Port 3000...' -ForegroundColor Yellow
cmd /c npx pm2 delete kiddie-kruzzer-server 2>$null
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess -gt 0) {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1

# Run database schema migrations (only runs pending migrations once, skips on future runs)
Write-Host 'Checking and applying database schema migrations (one-time execution)...' -ForegroundColor Green
cmd /c npx tsx migrate.ts

cmd /c npx pm2 start server.ts --name 'kiddie-kruzzer-server' --interpreter 'npx' --interpreter-args 'tsx'
cmd /c npx pm2 restart kiddie-kruzzer-server --update-env
cmd /c npx pm2 save
Pop-Location

Write-Host '=====================================================' -ForegroundColor Green
Write-Host 'DEPLOYMENT COMPLETE!' -ForegroundColor Green
Write-Host "Frontend URL: http://localhost:$SitePort" -ForegroundColor Cyan
Write-Host 'Backend API:  http://localhost:3000/api/session/current' -ForegroundColor Cyan
Write-Host '=====================================================' -ForegroundColor Green
