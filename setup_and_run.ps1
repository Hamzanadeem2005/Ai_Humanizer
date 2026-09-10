# =====================================================================
#  HUMANIZE AI - AUTOMATED ONE-CLICK SETUP AND LAUNCH SCRIPT
# =====================================================================

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         HUMANIZE AI - AUTOMATED STARTUP SCRIPT            " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------
# 1. CHECK AND INSTALL .NET SDK IF MISSING
# ---------------------------------------------------------------------
Write-Host "[1/5] Checking .NET SDK..." -ForegroundColor Cyan

$dotnetInstalled = $false
try {
    $dotnetVer = & dotnet --version 2>$null
    if ($dotnetVer) {
        Write-Host "  .NET SDK is installed (Version: $dotnetVer)" -ForegroundColor Green
        $dotnetInstalled = $true
    }
} catch {
    $dotnetInstalled = $false
}

if (-not $dotnetInstalled) {
    Write-Host "  ! .NET SDK not detected. Installing .NET SDK automatically..." -ForegroundColor Yellow
    
    $wingetPath = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetPath) {
        Write-Host "  --> Installing via winget..." -ForegroundColor Gray
        Start-Process winget -ArgumentList "install --id Microsoft.DotNet.SDK.9 --accept-package-agreements --accept-source-agreements --silent" -Wait -NoNewWindow
    } else {
        Write-Host "  --> Downloading .NET SDK installer..." -ForegroundColor Gray
        $installerPath = Join-Path $env:TEMP "dotnet-sdk-installer.exe"
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://dotnetcli.azureedge.net/dotnet/Sdk/10.0.100/dotnet-sdk-10.0.100-win-x64.exe" -OutFile $installerPath
        Write-Host "  --> Running installer silently..." -ForegroundColor Gray
        Start-Process -FilePath $installerPath -ArgumentList "/quiet /norestart" -Wait
    }

    try {
        $dotnetVer = & dotnet --version 2>$null
        Write-Host "  .NET SDK successfully installed! (Version: $dotnetVer)" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to verify .NET installation automatically. Please restart your terminal." -ForegroundColor Red
    }
}

# ---------------------------------------------------------------------
# 2. CHECK AND SETUP MYSQL SERVER
# ---------------------------------------------------------------------
Write-Host ""
Write-Host "[2/5] Checking MySQL Server..." -ForegroundColor Cyan

$mysqlExe = $null
$possiblePaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MariaDB 10.11\bin\mysql.exe",
    "C:\Program Files\MariaDB 11.4\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe"
)

if (Get-Command mysql.exe -ErrorAction SilentlyContinue) {
    $mysqlExe = (Get-Command mysql.exe).Source
} else {
    foreach ($p in $possiblePaths) {
        if (Test-Path $p) {
            $mysqlExe = $p
            break
        }
    }
}

$mysqlService = Get-Service -Name "*mysql*", "*mariadb*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($mysqlService) {
    Write-Host "  Found MySQL Service: $($mysqlService.DisplayName)" -ForegroundColor Green
    if ($mysqlService.Status -ne 'Running') {
        Write-Host "  --> Starting MySQL service..." -ForegroundColor Yellow
        Start-Service $mysqlService.Name -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    Write-Host "  MySQL Service status: RUNNING" -ForegroundColor Green
} else {
    if ($mysqlExe) {
        Write-Host "  Found MySQL binary at: $mysqlExe" -ForegroundColor Green
    } else {
        Write-Host "  ! MySQL Server was not found on this PC." -ForegroundColor Yellow
        Write-Host "  --> Attempting to install MySQL Server via winget..." -ForegroundColor Yellow
        
        $wingetPath = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetPath) {
            Start-Process winget -ArgumentList "install --id Oracle.MySQL --accept-package-agreements --accept-source-agreements --silent" -Wait -NoNewWindow
            $mysqlService = Get-Service -Name "*mysql*" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($mysqlService) {
                Start-Service $mysqlService.Name -ErrorAction SilentlyContinue
            }
        } else {
            Write-Host "  MySQL is required. Please install MySQL Server and set password for 'root' to 'root1234'." -ForegroundColor Red
        }
    }
}

# ---------------------------------------------------------------------
# 3. INITIALIZE DATABASE SCHEMA (schema.sql)
# ---------------------------------------------------------------------
Write-Host ""
Write-Host "[3/5] Initializing Database Schema (schema.sql)..." -ForegroundColor Cyan

$schemaPath = Join-Path $ScriptDir "Backeend\HumanizeAI_Project\schema.sql"

if (Test-Path $schemaPath) {
    if ($mysqlExe) {
        try {
            $normalizedSchema = $schemaPath.Replace('\','/')
            $proc = Start-Process -FilePath $mysqlExe -ArgumentList "-u root -proot1234 -e ""source $normalizedSchema""" -NoNewWindow -Wait -PassThru
            if ($proc.ExitCode -eq 0) {
                Write-Host "  Database 'humanizeai_db' initialized successfully!" -ForegroundColor Green
            } else {
                Write-Host "  MySQL script returned code $($proc.ExitCode). Proceeding..." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  Note: Could not run schema.sql automatically via mysql.exe: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  mysql.exe CLI not found in standard path to run schema.sql. Ensure database 'humanizeai_db' exists." -ForegroundColor Yellow
    }
} else {
    Write-Host "  schema.sql not found at $schemaPath" -ForegroundColor Yellow
}

# ---------------------------------------------------------------------
# 4. SYNCHRONIZE FRONTEND ASSETS TO BACKEND WWWROOT
# ---------------------------------------------------------------------
Write-Host ""
Write-Host "[4/5] Synchronizing Frontend Files to Web Server (wwwroot)..." -ForegroundColor Cyan

$frontendDir = Join-Path $ScriptDir "Fronteend"
$wwwrootDir = Join-Path $ScriptDir "Backeend\HumanizeAI_Project\wwwroot"

if (Test-Path $frontendDir) {
    if (-not (Test-Path $wwwrootDir)) {
        New-Item -ItemType Directory -Path $wwwrootDir -Force | Out-Null
    }
    Copy-Item -Path "$frontendDir\*" -Destination $wwwrootDir -Recurse -Force
    Write-Host "  Frontend files synced to wwwroot successfully." -ForegroundColor Green
} else {
    Write-Host "  Frontend directory $frontendDir not found." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------
# 5. LAUNCH BACKEND AND OPEN BROWSER
# ---------------------------------------------------------------------
Write-Host ""
Write-Host "[5/5] Building and Launching HumanizeAI Application..." -ForegroundColor Cyan

$backendDir = Join-Path $ScriptDir "Backeend\HumanizeAI_Project"
Set-Location $backendDir

# Launch background process to open browser once port 5000 is open
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 4
    for ($i = 0; $i -lt 15; $i++) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 5000)
            if ($client.Connected) {
                $client.Close()
                Start-Process "http://localhost:5000"
                break
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }
} | Out-Null

Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  SERVER RUNNING AT: http://localhost:5000" -ForegroundColor Green
Write-Host "  Opening web browser automatically..." -ForegroundColor Cyan
Write-Host "  (Press Ctrl+C in this window anytime to stop the server)" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""

& dotnet run --urls "http://localhost:5000"
