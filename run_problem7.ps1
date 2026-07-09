param(
    [switch]$SkipBuild,
    [switch]$SkipFullTests
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$ComposeBase = Join-Path $ProjectRoot "docker-compose.yml"
$ComposeHardened = Join-Path $ProjectRoot "docker-compose.hardened.yml"
$ComposeProduction = Join-Path $ProjectRoot "docker-compose.production.yml"

if (-not (Test-Path $ComposeBase)) {
    throw "docker-compose.yml tidak ditemukan. Jalankan script dari root project DashAI."
}

if (-not (Test-Path $ComposeHardened)) {
    throw "docker-compose.hardened.yml tidak ditemukan di root project."
}

if (-not (Test-Path ".\apps\backend\src\scripts\syntax_check.py")) {
    throw "apps\backend\src\scripts\syntax_check.py tidak ditemukan."
}

if (-not (Test-Path ".\scripts\fix-upload-permissions.ps1")) {
    throw "scripts\fix-upload-permissions.ps1 tidak ditemukan."
}

function Run-Step {
    param(
        [string]$Title,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "============================================================"
    Write-Host $Title
    Write-Host "============================================================"

    & $Command

    if ($LASTEXITCODE -ne 0) {
        throw "Step gagal: $Title"
    }
}

Run-Step "1. Validasi Docker Compose" {
    docker compose `
        -f docker-compose.yml `
        -f docker-compose.hardened.yml `
        config --quiet
}

Run-Step "2. Jalankan service hardened" {
    docker compose `
        -f docker-compose.yml `
        -f docker-compose.hardened.yml `
        up -d
}

Run-Step "3. Perbaiki permission writable volume" {
    powershell -ExecutionPolicy Bypass `
        -File .\scripts\fix-upload-permissions.ps1
}

Run-Step "4. Status container" {
    docker compose `
        -f docker-compose.yml `
        -f docker-compose.hardened.yml `
        ps
}

Run-Step "5. Backend syntax check tanpa menulis pyc" {
    docker compose `
        -f docker-compose.yml `
        -f docker-compose.hardened.yml `
        exec `
        -w /app `
        -e PYTHONPATH=/app `
        -e PYTHONDONTWRITEBYTECODE=1 `
        api `
        python src/scripts/syntax_check.py
}

if (Test-Path ".\scripts\docker-audit.ps1") {
    Run-Step "6. Docker security audit" {
        powershell -ExecutionPolicy Bypass `
            -File .\scripts\docker-audit.ps1
    }
} else {
    Write-Host ""
    Write-Host "============================================================"
    Write-Host "6. Docker security audit"
    Write-Host "============================================================"
    Write-Host "SKIPPED: scripts\docker-audit.ps1 tidak ditemukan."
}

Run-Step "7. Backend static tests" {
    docker compose `
        -f docker-compose.yml `
        -f docker-compose.hardened.yml `
        exec `
        -w /app `
        -e PYTHONPATH=/app `
        -e PYTHONDONTWRITEBYTECODE=1 `
        api `
        python -m pytest `
        -m static `
        -q `
        -p no:cacheprovider
}

if (-not $SkipFullTests) {
    Run-Step "8. Seluruh backend tests" {
        docker compose `
            -f docker-compose.yml `
            -f docker-compose.hardened.yml `
            exec `
            -w /app `
            -e PYTHONPATH=/app `
            -e PYTHONDONTWRITEBYTECODE=1 `
            api `
            python -m pytest `
            -q `
            -p no:cacheprovider
    }
} else {
    Write-Host ""
    Write-Host "============================================================"
    Write-Host "8. Seluruh backend tests"
    Write-Host "============================================================"
    Write-Host "SKIPPED: parameter -SkipFullTests digunakan."
}

Run-Step "9. Frontend TypeScript" {
    docker compose `
        -f docker-compose.yml `
        -f docker-compose.hardened.yml `
        exec `
        -w /app `
        frontend `
        pnpm exec tsc --noEmit
}

if (-not $SkipBuild) {
    if (-not (Test-Path $ComposeProduction)) {
        throw "docker-compose.production.yml tidak ditemukan untuk production build."
    }

    Run-Step "10. Build production API" {
        docker compose `
            -f docker-compose.production.yml `
            build `
            --progress plain `
            api
    }

    Run-Step "11. Build production frontend" {
        docker compose `
            -f docker-compose.production.yml `
            build `
            --progress plain `
            frontend
    }
} else {
    Write-Host ""
    Write-Host "============================================================"
    Write-Host "10-11. Production image build"
    Write-Host "============================================================"
    Write-Host "SKIPPED: parameter -SkipBuild digunakan."
}

Write-Host ""
Write-Host "============================================================"
Write-Host "PROBLEM 7 VALIDATION SELESAI"
Write-Host "============================================================"
Write-Host "Compose validation     : checked"
Write-Host "Writable volumes       : checked"
Write-Host "Hardened services      : checked"
Write-Host "Backend syntax         : checked"
Write-Host "Docker audit           : checked/skipped"
Write-Host "Backend tests          : checked"
Write-Host "Frontend TypeScript    : checked"
Write-Host "Production build       : checked/skipped"
