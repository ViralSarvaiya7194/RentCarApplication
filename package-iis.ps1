# ==============================================================================
# KIDDIE KRUZZER POS - IIS PACKAGING AND PUBLISHING SCRIPT
# Creates a ready-to-deploy, standalone IIS distribution package
# ==============================================================================

param(
    [string]$OutputDir = "publish",
    [switch]$ZipPackage = $true
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "BUILDING KIDDIE KRUZZER POS IIS DEPLOYMENT PACKAGE" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

$PublishPath = Join-Path $ScriptRoot $OutputDir
$WwwRootPath = Join-Path $PublishPath "wwwroot"
$ServerPath = Join-Path $PublishPath "server"

# Step 1: Ensure clean output folders exist
if (-not (Test-Path $PublishPath)) {
    New-Item -ItemType Directory -Force -Path $PublishPath | Out-Null
}

# Clean wwwroot
if (Test-Path $WwwRootPath) {
    Remove-Item -Path "$WwwRootPath\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Force -Path $WwwRootPath | Out-Null
}

# Clean server
if (Test-Path $ServerPath) {
    Get-ChildItem -Path $ServerPath -Exclude "node_modules" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Force -Path $ServerPath | Out-Null
}

# Step 2: Build Angular production bundle
Write-Host "[2/6] Compiling Angular production bundle (npm run build)..." -ForegroundColor Green
$buildOutput = cmd /c npm run build
Write-Host $buildOutput

# Step 3: Copy Frontend static files and web.config
Write-Host "[3/6] Packaging Angular frontend into wwwroot..." -ForegroundColor Green
$DistBrowserPath = Join-Path $ScriptRoot "dist\applet\browser"
if (-not (Test-Path $DistBrowserPath)) {
    $DistBrowserPath = Join-Path $ScriptRoot "dist\applet"
}
Copy-Item -Path "$DistBrowserPath\*" -Destination $WwwRootPath -Recurse -Force
Copy-Item -Path "$ScriptRoot\iis\web.config" -Destination "$WwwRootPath\web.config" -Force

# Step 4: Copy Backend server files
Write-Host "[4/6] Packaging Node.js Express backend and PostgreSQL schemas..." -ForegroundColor Green
Get-ChildItem -Path "$ScriptRoot\server" -Exclude "node_modules", ".git" | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $ServerPath -Recurse -Force
}
Copy-Item -Path "$ScriptRoot\package.json" -Destination "$ServerPath\package.json" -Force
if (Test-Path "$ScriptRoot\.env") {
    Copy-Item -Path "$ScriptRoot\.env" -Destination "$ServerPath\.env" -Force
} else {
    Copy-Item -Path "$ScriptRoot\.env.example" -Destination "$ServerPath\.env" -Force
}

# Step 5: Copy IIS deployment scripts
Write-Host "[5/6] Adding IIS deployment scripts..." -ForegroundColor Green

$InstallScriptContent = @'
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
'@

$InstallScriptContent | Set-Content -Path "$PublishPath\INSTALL-AND-RUN-IIS.ps1" -Encoding UTF8

$ReadmeLines = @(
    "# Kiddie Kruzzer POS - IIS Deployment Guide",
    "",
    "## Package Contents",
    "- wwwroot/ : Production Angular frontend with web.config URL Rewrite & API Reverse Proxy.",
    "- server/ : Node.js Express server, PostgreSQL schema migrations, thermal printer canvas engine.",
    "- INSTALL-AND-RUN-IIS.ps1 : Automated 1-click PowerShell installer for IIS and Windows Services.",
    "",
    "## System Prerequisites",
    "1. Windows Server 2016/2019/2022 or Windows 10/11 Pro/Enterprise",
    "2. IIS (Internet Information Services) installed",
    "3. URL Rewrite Module 2.1: https://www.iis.net/downloads/microsoft/url-rewrite",
    "4. Application Request Routing (ARR) 3.0: https://www.iis.net/downloads/microsoft/application-request-routing",
    "   - In IIS Manager -> Application Request Routing -> Server Proxy Settings -> Check Enable proxy.",
    "5. Node.js (v18+) and PostgreSQL (v14+)",
    "",
    "## Quick 1-Click Deployment",
    "1. Open PowerShell as Administrator.",
    "2. Run:",
    "   cd <folder_where_package_is_extracted>",
    "   .\\INSTALL-AND-RUN-IIS.ps1",
    "3. Open browser at http://localhost:8080."
)

$ReadmeLines | Set-Content -Path "$PublishPath\README-IIS-DEPLOYMENT.md" -Encoding UTF8

# Step 6: Create ZIP Archive
if ($ZipPackage) {
    Write-Host "[6/6] Creating ZIP archive: KiddieKruzzer-IIS-Package.zip..." -ForegroundColor Green
    $ZipFile = "$ScriptRoot\KiddieKruzzer-IIS-Package.zip"
    if (Test-Path $ZipFile) { Remove-Item -Force $ZipFile }
    Start-Sleep -Milliseconds 500
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($PublishPath, $ZipFile, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    Write-Host "  -> ZIP created successfully: $ZipFile" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=======================================================================" -ForegroundColor Green
Write-Host "IIS PACKAGE CREATED SUCCESSFULLY IN '$OutputDir' DIRECTORY!" -ForegroundColor Green
Write-Host "=======================================================================" -ForegroundColor Green
