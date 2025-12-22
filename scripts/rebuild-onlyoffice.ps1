#!/usr/bin/env pwsh
# OnlyOffice Document Server rebuild script
# Fixes broken container by doing a clean restart

Write-Host "=== OnlyOffice Document Server Rebuild ===" -ForegroundColor Cyan
Write-Host ""

# Stop and remove container
Write-Host "1. Stopping OnlyOffice container..." -ForegroundColor Yellow
docker compose down onlyoffice
Write-Host "   Done." -ForegroundColor Green

# Remove corrupt data
Write-Host "2. Removing old data..." -ForegroundColor Yellow
if (Test-Path ".\uploads\onlyoffice-data") {
    Remove-Item -Recurse -Force ".\uploads\onlyoffice-data"
    Write-Host "   Data removed." -ForegroundColor Green
} else {
    Write-Host "   No old data found." -ForegroundColor Green
}

# Pull fresh image
Write-Host "3. Pulling fresh image..." -ForegroundColor Yellow
docker pull onlyoffice/documentserver:8.1.1
Write-Host "   Done." -ForegroundColor Green

# Start container
Write-Host "4. Starting OnlyOffice container..." -ForegroundColor Yellow
docker compose up -d onlyoffice
Write-Host "   Container started." -ForegroundColor Green

# Wait for initialization
Write-Host "5. Waiting 90 seconds for initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 90
Write-Host "   Done." -ForegroundColor Green

# Verify health
Write-Host "6. Verifying health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://127.0.0.1:8082/healthcheck" -UseBasicParsing -TimeoutSec 10
    Write-Host "   Health check: $($health.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Verify script
Write-Host "7. Verifying API script..." -ForegroundColor Yellow
try {
    $script = Invoke-WebRequest -Uri "http://127.0.0.1:8082/web-apps/apps/api/documents/api.js" -Method Head -UseBasicParsing -TimeoutSec 10
    Write-Host "   Script available: $($script.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   Script not available: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Rebuild Complete ===" -ForegroundColor Cyan
Write-Host "If both checks passed, reload your Documents panel." -ForegroundColor White
Write-Host "If checks failed, run: docker logs onlyoffice-docserver --tail 100" -ForegroundColor White
