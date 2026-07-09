param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$ComposeFile = Join-Path $ProjectRoot "docker-compose.yml"
$FrontendPath = Join-Path $ProjectRoot "apps\frontend"

if (-not (Test-Path $ComposeFile)) {
    throw "Jalankan script dari root project DashAI yang memiliki docker-compose.yml."
}

if (-not (Test-Path $FrontendPath)) {
    throw "Folder frontend tidak ditemukan: $FrontendPath"
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

$FrontendMount = "${FrontendPath}:/frontend:ro"

Run-Step "1. Frontend auth contract" {
    docker compose run --rm --no-deps `
        -v $FrontendMount `
        -e DASHAI_FRONTEND_ROOT=/frontend `
        api `
        pytest `
        src/tests/test_23_frontend_auth_contract_static.py `
        -q
}

Run-Step "2. Backend auth integration" {
    docker compose exec api `
        pytest `
        src/tests/test_10_live_health_auth.py `
        -q
}

Run-Step "3. Frontend TypeScript" {
    docker compose exec frontend `
        pnpm exec tsc --noEmit
}

if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "============================================================"
    Write-Host "4. Frontend production build"
    Write-Host "============================================================"

    docker compose stop frontend

    if ($LASTEXITCODE -ne 0) {
        throw "Gagal menghentikan container frontend."
    }

    try {
        docker compose run --rm --no-deps `
            --entrypoint sh `
            frontend `
            -lc 'find /app/.next -mindepth 1 -maxdepth 1 -exec rm -rf {} +'

        if ($LASTEXITCODE -ne 0) {
            throw "Gagal membersihkan isi .next."
        }

        docker compose run --rm --no-deps `
            --entrypoint sh `
            frontend `
            -lc 'NODE_ENV=production pnpm build'

        if ($LASTEXITCODE -ne 0) {
            throw "Production build gagal."
        }
    }
    finally {
        docker compose up -d frontend
    }
}

Write-Host ""
Write-Host "============================================================"
Write-Host "PROBLEM 6 TEST SUITE SELESAI"
Write-Host "============================================================"
Write-Host "Frontend auth contract : checked"
Write-Host "Backend auth           : checked"
Write-Host "TypeScript             : checked"
Write-Host "Production build       : checked"
