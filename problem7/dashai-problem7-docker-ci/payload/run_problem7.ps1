param(
    [switch]$SkipBuild,
    [switch]$SkipIntegration
)

$ErrorActionPreference = "Stop"
$Root = (Get-Location).Path

if (-not (Test-Path (Join-Path $Root "docker-compose.yml"))) {
    throw "Jalankan dari root project DashAI."
}

Write-Host "Validating hardened Compose..."
docker compose `
    -f docker-compose.yml `
    -f docker-compose.hardened.yml `
    config --quiet

if ($LASTEXITCODE -ne 0) {
    throw "docker-compose.hardened.yml tidak valid terhadap compose utama."
}

Write-Host "Starting services with hardening override..."
docker compose `
    -f docker-compose.yml `
    -f docker-compose.hardened.yml `
    up -d --build

if ($LASTEXITCODE -ne 0) {
    throw "Gagal menjalankan service."
}

powershell -ExecutionPolicy Bypass `
    -File .\scripts\docker-audit.ps1

if ($LASTEXITCODE -ne 0) {
    throw "Docker audit gagal."
}

$TestArgs = @(
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    ".\scripts\test-all.ps1"
)

if ($SkipBuild) {
    $TestArgs += "-SkipBuild"
}

if ($SkipIntegration) {
    $TestArgs += "-SkipIntegration"
}

powershell @TestArgs

if ($LASTEXITCODE -ne 0) {
    throw "Problem 7 test suite gagal."
}

Write-Host ""
Write-Host "Problem 7 selesai."
Write-Host "Jangan jalankan cleanup -Apply sebelum git commit."
