# KIDDIE KRUZZER POS - IIS INSTALLATION / DEPLOYMENT SCRIPT
# Run this script from an elevated PowerShell window (Administrator).

$ErrorActionPreference = 'Stop'

# -----------------------------
# Configuration
# -----------------------------
$ScriptRoot   = Split-Path -Parent $MyInvocation.MyCommand.Path
$SiteName     = 'KiddieKruzzerPOS'
$AppPoolName  = 'KiddieKruzzerAppPool'
$Port         = 8000
$FrontendPath = Join-Path $ScriptRoot 'wwwroot'
$ServerPath   = Join-Path $ScriptRoot 'server'
$BackendPort  = 3000
$BackendName  = 'kiddie-kruzzer-server'

# -----------------------------
# Helpers
# -----------------------------
function Test-CommandExists {
    param([Parameter(Mandatory = $true)][string]$CommandName)
    return $null -ne (Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Stop-ExistingProcess {
    param([string]$Name)
    try {
        Get-Process -Name $Name -ErrorAction SilentlyContinue |
            Stop-Process -Force -ErrorAction SilentlyContinue
    } catch {}
}

# -----------------------------
# Administrator check
# -----------------------------
$principal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent()
)

if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error 'This script requires Administrator privileges. Open PowerShell as Administrator and run it again.'
    exit 1
}

Write-Host ''
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host ' KIDDIE KRUZZER POS - IIS DEPLOYMENT' -ForegroundColor Cyan
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host "Application root : $ScriptRoot"
Write-Host "Frontend path     : $FrontendPath"
Write-Host "Backend path      : $ServerPath"
Write-Host "IIS site          : $SiteName"
Write-Host "Application pool  : $AppPoolName"
Write-Host "Frontend port     : $Port"
Write-Host "Backend port      : $BackendPort"
Write-Host ''

# -----------------------------
# Validate application folders
# -----------------------------
if (-not (Test-Path -LiteralPath $FrontendPath -PathType Container)) {
    throw "Frontend folder not found: $FrontendPath"
}

if (-not (Test-Path -LiteralPath $ServerPath -PathType Container)) {
    throw "Backend folder not found: $ServerPath"
}

# -----------------------------
# Install / enable IIS
# -----------------------------
Write-Host '[1/8] Checking IIS...' -ForegroundColor Green

$iisFeature = Get-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -ErrorAction SilentlyContinue
if ($iisFeature -and $iisFeature.State -ne 'Enabled') {
    Write-Host 'Enabling IIS...' -ForegroundColor Yellow
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All -NoRestart | Out-Null
}

# IIS management scripting tools are required by WebAdministration.
$mgmtFeature = Get-WindowsOptionalFeature -Online -FeatureName IIS-ManagementScriptingTools -ErrorAction SilentlyContinue
if ($mgmtFeature -and $mgmtFeature.State -ne 'Enabled') {
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-ManagementScriptingTools -All -NoRestart | Out-Null
}

Import-Module WebAdministration -ErrorAction Stop

# -----------------------------
# Application Pool
# -----------------------------
Write-Host '[2/8] Configuring IIS Application Pool...' -ForegroundColor Green

if (Test-Path "IIS:\AppPools\$AppPoolName") {
    Stop-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
    Remove-WebAppPool -Name $AppPoolName
}

New-WebAppPool -Name $AppPoolName

# Node/static frontend: IIS does not need ASP.NET CLR.
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ''
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.idleTimeout -Value ([TimeSpan]::Zero)
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name startMode -Value 'AlwaysRunning'

# -----------------------------
# IIS Website
# -----------------------------
Write-Host '[3/8] Creating IIS website...' -ForegroundColor Green

if (Test-Path "IIS:\Sites\$SiteName") {
    Stop-Website -Name $SiteName -ErrorAction SilentlyContinue
    Remove-Website -Name $SiteName
}

New-Website `
    -Name $SiteName `
    -Port $Port `
    -IPAddress '*' `
    -PhysicalPath $FrontendPath `
    -ApplicationPool $AppPoolName

Start-Website -Name $SiteName

# -----------------------------
# Ensure static content MIME / default document support
# -----------------------------
Write-Host '[4/8] Configuring IIS static content...' -ForegroundColor Green

# web.config is optional. If the application already has one, preserve it.
$webConfig = Join-Path $FrontendPath 'web.config'

# SPA fallback configuration for React/Vue/Angular-style frontend.
# Only create web.config when one does not already exist.
if (-not (Test-Path -LiteralPath $webConfig)) {
    @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
    </staticContent>

    <defaultDocument enabled="true">
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>

    <rewrite>
      <rules>
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
'@ | Set-Content -LiteralPath $webConfig -Encoding UTF8
    Write-Host "Created: $webConfig" -ForegroundColor Yellow
}

# -----------------------------
# Firewall
# -----------------------------
Write-Host '[5/8] Configuring firewall...' -ForegroundColor Green

$firewallName = 'Kiddie Kruzzer POS HTTP'
if (-not (Get-NetFirewallRule -DisplayName $firewallName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule `
        -DisplayName $firewallName `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $Port `
        -Action Allow `
        -Profile Any | Out-Null
}

# Backend is normally accessed through the server itself / reverse proxy.
# Do not expose port 3000 externally unless the application specifically requires it.
$backendRuleName = 'Kiddie Kruzzer POS Backend'
if (-not (Get-NetFirewallRule -DisplayName $backendRuleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule `
        -DisplayName $backendRuleName `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $BackendPort `
        -Action Allow `
        -Profile Private | Out-Null
}

# -----------------------------
# Node.js / npm / PM2 checks
# -----------------------------
Write-Host '[6/8] Checking Node.js and PM2...' -ForegroundColor Green

if (-not (Test-CommandExists 'node')) {
    throw 'Node.js is not installed or is not available in PATH. Install the current Node.js LTS version, reopen PowerShell, and run this script again.'
}

if (-not (Test-CommandExists 'npm')) {
    throw 'npm is not installed or is not available in PATH.'
}

Write-Host "Node.js: $(node --version)"
Write-Host "npm    : $(npm --version)"

Set-Location -LiteralPath $ServerPath

if (-not (Test-Path -LiteralPath (Join-Path $ServerPath 'package.json'))) {
    throw "Backend package.json not found in: $ServerPath"
}

Write-Host 'Installing backend production dependencies...' -ForegroundColor Yellow
npm install --omit=dev

# Check whether PM2 is available globally; otherwise use npx.
$pm2Command = $null
if (Test-CommandExists 'pm2') {
    $pm2Command = 'pm2'
} else {
    Write-Host 'PM2 not found globally. Installing PM2 globally...' -ForegroundColor Yellow
    npm install -g pm2
    if (-not (Test-CommandExists 'pm2')) {
        throw 'PM2 installation completed but pm2 is still not available in PATH. Reopen PowerShell and run the script again.'
    }
    $pm2Command = 'pm2'
}

# -----------------------------
# Start backend
# -----------------------------
Write-Host '[7/8] Starting backend service...' -ForegroundColor Green

$serverTs = Join-Path $ServerPath 'server.ts'
$serverJs = Join-Path $ServerPath 'server.js'

if (Test-Path -LiteralPath $serverTs) {
    $tsxPackage = Join-Path $ServerPath 'node_modules\tsx\package.json'

    if (-not (Test-Path -LiteralPath $tsxPackage)) {
        Write-Host 'tsx is required to run server.ts. Installing tsx...' -ForegroundColor Yellow
        npm install tsx
    }

    # Run one-time database schema migrations
    Write-Host 'Checking and applying database schema migrations (runs once on first start)...' -ForegroundColor Green
    & "$ServerPath\node_modules\.bin\tsx.cmd" "$ServerPath\migrate.ts"

    & $pm2Command delete $BackendName 2>$null
    & $pm2Command start $serverTs --name $BackendName --interpreter "$ServerPath\node_modules\.bin\tsx.cmd"
}
elseif (Test-Path -LiteralPath $serverJs) {
    & $pm2Command delete $BackendName 2>$null
    & $pm2Command start $serverJs --name $BackendName
}
else {
    throw "Neither server.ts nor server.js was found in $ServerPath"
}

& $pm2Command save

# -----------------------------
# Final validation
# -----------------------------
Write-Host '[8/8] Validating deployment...' -ForegroundColor Green

Start-Sleep -Seconds 3

$site = Get-Website -Name $SiteName
if ($site.State -ne 'Started') {
    Start-Website -Name $SiteName
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
    Write-Warning "IIS is not listening on port $Port. Check IIS bindings and Windows Event Viewer."
}

$backendListener = Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue
if (-not $backendListener) {
    Write-Warning "Backend is not listening on port $BackendPort. Check PM2 logs with: pm2 logs $BackendName"
}

Write-Host ''
Write-Host '=============================================' -ForegroundColor Green
Write-Host ' DEPLOYMENT COMPLETE' -ForegroundColor Green
Write-Host '=============================================' -ForegroundColor Green
Write-Host "Frontend URL : http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Backend API  : http://localhost:$BackendPort/api/session/current" -ForegroundColor Cyan
Write-Host "IIS Site     : $SiteName" -ForegroundColor Cyan
Write-Host "App Pool     : $AppPoolName" -ForegroundColor Cyan
Write-Host ''
Write-Host 'Useful commands:' -ForegroundColor Yellow
Write-Host "  pm2 status"
Write-Host "  pm2 logs $BackendName"
Write-Host "  Get-Website -Name '$SiteName'"
Write-Host "  Get-WebAppPoolState -Name '$AppPoolName'"
Write-Host ''
