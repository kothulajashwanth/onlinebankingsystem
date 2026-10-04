# ==============================================================================
# SECURE ONLINE BANKING SYSTEM - POWERSHELL RUNNER
# ==============================================================================

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  SECURE ONLINE BANKING AND FUND TRANSFER SYSTEM" -ForegroundColor Yellow
Write-Host "  Java Backend + JDBC + MySQL Architecture" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$baseDir = $PSScriptRoot
Set-Location $baseDir

# 1. Ensure lib and bin directories exist
if (-not (Test-Path "lib")) { New-Item -ItemType Directory -Path "lib" | Out-Null }
if (-not (Test-Path "bin")) { New-Item -ItemType Directory -Path "bin" | Out-Null }

# 2. Check for MySQL Connector/J driver
$mysqlJar = Get-ChildItem -Path "lib" -Filter "*mysql*.jar" -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $mysqlJar) {
    Write-Host "[Setup] MySQL Connector/J driver not found in lib\ folder." -ForegroundColor Yellow
    Write-Host "[Setup] Downloading mysql-connector-j-8.4.0.jar from Maven Central..." -ForegroundColor Gray
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $url = "https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.4.0/mysql-connector-j-8.4.0.jar"
        $dest = Join-Path "lib" "mysql-connector-j-8.4.0.jar"
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
        $mysqlJar = Get-Item $dest
        Write-Host "[Setup] Driver downloaded successfully: $($mysqlJar.Name)" -ForegroundColor Green
    } catch {
        Write-Host "[Warning] Download failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 3. Compile Java Sources
Write-Host "`n[Build] Compiling Java sources with javac..." -ForegroundColor Gray
$cp = "bin"
if ($mysqlJar) { $cp = "bin;$($mysqlJar.FullName)" }

$javaFiles = Get-ChildItem -Path "src\main\java" -Filter "*.java" -Recurse | ForEach-Object { $_.FullName }

if (-not $javaFiles) {
    Write-Host "[Error] No Java source files found in src\main\java!" -ForegroundColor Red
    exit 1
}

$sourcesFile = "sources.txt"
$javaFiles | Set-Content $sourcesFile

& javac -d bin -cp $cp "@$sourcesFile"
$compileStatus = $LASTEXITCODE
Remove-Item $sourcesFile -ErrorAction SilentlyContinue

if ($compileStatus -ne 0) {
    Write-Host "[Error] Compilation failed! Review errors above." -ForegroundColor Red
    exit $compileStatus
}

Write-Host "[Build] Compilation successful!" -ForegroundColor Green

# 4. Port 8080 Check & Safe Release
Write-Host "`n[Port 8080] Inspecting port 8080..." -ForegroundColor Gray
$port = 8080
$occupiedPid = $null

try {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) { $occupiedPid = $conn.OwningProcess }
} catch {}

if (-not $occupiedPid) {
    try {
        $netstatLine = netstat -ano | Select-String ":8080\s+.*LISTENING\s+(\d+)" | Select-Object -First 1
        if ($netstatLine -and $netstatLine.Line -match "LISTENING\s+(\d+)") {
            $occupiedPid = [int]$matches[1]
        }
    } catch {}
}

if ($occupiedPid -and $occupiedPid -ne 0) {
    $proc = Get-Process -Id $occupiedPid -ErrorAction SilentlyContinue
    $procName = if ($proc) { $proc.ProcessName } else { "Unknown" }
    Write-Host "[Port 8080] Port $port is occupied by PID $occupiedPid ($procName)." -ForegroundColor Yellow
    if ($procName -match "java|python") {
        Write-Host "[Port 8080] Safely stopping earlier instance of banking server (PID $occupiedPid - $procName)..." -ForegroundColor Cyan
        Stop-Process -Id $occupiedPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 1200
        Write-Host "[Port 8080] Port 8080 successfully freed." -ForegroundColor Green
    } else {
        Write-Host "[Port 8080] Stopping PID $occupiedPid ($procName) to free port 8080..." -ForegroundColor Yellow
        Stop-Process -Id $occupiedPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 1200
        Write-Host "[Port 8080] Port 8080 is now available." -ForegroundColor Green
    }
} else {
    Write-Host "[Port 8080] Port 8080 is available." -ForegroundColor Green
}

# 5. Launch Application
Write-Host "`n[Launch] Starting Java Banking Server on port 8080..." -ForegroundColor Cyan
Write-Host "[Launch] Localhost URL: http://localhost:8080/" -ForegroundColor Green
Write-Host "[Launch] Press Ctrl+C in this terminal to stop the server.`n" -ForegroundColor Gray

& java -cp $cp com.banking.Main
