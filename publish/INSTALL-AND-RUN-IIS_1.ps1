# KIDDIE KRUZZER POS - AUTOMATED IIS INSTALLATION SCRIPT
# Run this script as Administrator in PowerShell

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error 'This script requires Administrator privileges! Please right-click and Run as Administrator.'
    exit 1
}

 = Split-Path -Parent System.Management.Automation.InvocationInfo.MyCommand.Path
 = 'KiddieKruzzerPOS'
 = 'KiddieKruzzerAppPool'
 = 8080
 = Join-Path  'wwwroot'
 = Join-Path  'server'

Write-Host 'CONFIGURING KIDDIE KRUZZER ON IIS' -ForegroundColor Cyan

Import-Module WebAdministration -ErrorAction SilentlyContinue

Write-Host 'Configuring Application Pool: '  -ForegroundColor Green
if (Test-Path ('IIS:\AppPools\' + )) {
    Stop-WebAppPool -Name  -ErrorAction SilentlyContinue
    Remove-WebAppPool -Name 
}
New-WebAppPool -Name 
Set-ItemProperty ('IIS:\AppPools\' + ) -Name 'managedRuntimeVersion' -Value ''
Set-ItemProperty ('IIS:\AppPools\' + ) -Name 'processModel.idleTimeout' -Value ([TimeSpan]::FromMinutes(0))

Write-Host 'Creating IIS Web Site: '  ' on port '  -ForegroundColor Green
if (Test-Path ('IIS:\Sites\' + )) {
    Stop-WebSite -Name  -ErrorAction SilentlyContinue
    Remove-WebSite -Name 
}
New-WebSite -Name  -Port  -PhysicalPath  -ApplicationPool 
Start-WebSite -Name 

Write-Host 'Opening Firewall Port '  -ForegroundColor Green
New-NetFirewallRule -DisplayName ('Kiddie Kruzzer POS HTTP ' + ) -Direction Inbound -Protocol TCP -LocalPort  -Action Allow -ErrorAction SilentlyContinue | Out-Null

Write-Host 'Starting Node.js Backend Service on Port 3000...' -ForegroundColor Green
Push-Location 
cmd /c npm install --omit=dev
cmd /c npx pm2 start server.ts --name 'kiddie-kruzzer-server' --interpreter 'npx' --interpreter-args 'tsx'
cmd /c npx pm2 save
Pop-Location

Write-Host 'DEPLOYMENT COMPLETE!' -ForegroundColor Green
Write-Host ('Frontend URL: http://localhost:' + ) -ForegroundColor Cyan
Write-Host 'Backend API:  http://localhost:3000/api/session/current' -ForegroundColor Cyan
