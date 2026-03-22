# Gambit Dev Stack — starts MongoDB, Redis, API, and Frontend
# Usage: .\start.ps1         (start everything)
#        .\start.ps1 -Stop   (stop everything)

param([switch]$Stop)

$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

if ($Stop) {
    Write-Host "`n[GAMBIT] Stopping all services..." -ForegroundColor Yellow
    docker compose down 2>$null
    # Kill API and frontend processes by window title
    Get-Process | Where-Object { $_.MainWindowTitle -match "gambit-api|gambit-frontend" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "[GAMBIT] All services stopped." -ForegroundColor Green
    exit 0
}

Write-Host @"

    ♞  G A M B I T
    Global Intelligence Network

"@ -ForegroundColor Cyan

# ── 1. Docker: MongoDB + Redis + Neo4j + Ollama ─────
Write-Host "[1/3] Starting Docker services..." -ForegroundColor Blue
docker compose up -d mongo redis neo4j ollama
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker failed. Is Docker Desktop running?" -ForegroundColor Red
    exit 1
}

# Wait for MongoDB + Redis healthy
$timeout = 30; $elapsed = 0
while ($elapsed -lt $timeout) {
    $mh = docker inspect --format='{{.State.Health.Status}}' gambit-mongo 2>$null
    $rh = docker inspect --format='{{.State.Health.Status}}' gambit-redis 2>$null
    if ($mh -eq "healthy" -and $rh -eq "healthy") { break }
    Start-Sleep -Seconds 2; $elapsed += 2
}
Write-Host "       MongoDB :27017 + Redis :6380 ready." -ForegroundColor Green

# Wait for Neo4j HTTP (no healthcheck — poll :7474)
Write-Host "       Waiting for Neo4j..." -ForegroundColor DarkGray
$timeout = 60; $elapsed = 0
while ($elapsed -lt $timeout) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:7474" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { break }
    } catch {}
    Start-Sleep -Seconds 2; $elapsed += 2
}
Write-Host "       Neo4j :7474/:7687 ready." -ForegroundColor Green
Write-Host "       Ollama :11434 starting in background..." -ForegroundColor DarkGray

# Detect shell — pwsh (PS Core) or powershell (Windows PS)
$shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }

# ── 2. API Backend (port 3005 to match Vite proxy) ──
Write-Host "[2/3] Starting API on :3005..." -ForegroundColor Blue
Start-Process $shell -ArgumentList "-NoExit", "-Command", `
    "`$Host.UI.RawUI.WindowTitle = 'gambit-api'; Set-Location '$PSScriptRoot\api'; `$env:PORT = '3005'; bun --watch src/index.ts" `
    -WindowStyle Normal

# ── 3. Frontend (Vite on :5200) ─────────────────────
Write-Host "[3/3] Starting Frontend on :5200..." -ForegroundColor Blue
Start-Process $shell -ArgumentList "-NoExit", "-Command", `
    "`$Host.UI.RawUI.WindowTitle = 'gambit-frontend'; Set-Location '$PSScriptRoot\frontend'; bun run dev" `
    -WindowStyle Normal

# ── Summary ─────────────────────────────────────────
Start-Sleep -Seconds 2
Write-Host @"

    ✓ MongoDB       localhost:27017
    ✓ Redis         localhost:6380
    ✓ Neo4j         http://localhost:7474  (bolt://localhost:7687)
    ✓ Ollama        http://localhost:11434 (background)
    ✓ API           http://localhost:3005
    ✓ Frontend      http://localhost:5200

    Stop: .\start.ps1 -Stop

"@ -ForegroundColor Green
