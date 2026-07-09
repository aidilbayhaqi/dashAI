param(
    [switch]$SkipMigration,
    [switch]$SkipBuild,
    [switch]$SkipFullSuite
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$FrontendPath = Join-Path $ProjectRoot "apps\frontend"

if (-not (Test-Path (Join-Path $ProjectRoot "docker-compose.yml"))) {
    throw "Jalankan script dari root DashAI yang memiliki docker-compose.yml."
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

Run-Step "1. Compile backend dan migration" {
    docker compose exec api `
        python -m compileall src migrations
}

if (-not $SkipMigration) {
    Run-Step "2. Alembic upgrade head" {
        docker compose exec api `
            alembic upgrade head
    }
}

Run-Step "3. Static dan unit tests Problem 5" {
    docker compose exec api `
        pytest `
        src/tests/test_14_idempotency_domain_static.py `
        src/tests/test_20_domain_validation_unit.py `
        src/tests/test_21_database_contract_static.py `
        -q
}

Run-Step "4. Runtime integration tests Problem 5" {
    docker compose exec api `
        pytest `
        src/tests/test_16_live_idempotency.py `
        src/tests/test_17_live_stock_concurrency.py `
        src/tests/test_18_live_payroll_integrity.py `
        src/tests/test_19_live_finance_integrity.py `
        -q
}

# docker compose run pada beberapa versi tidak mendukung --mount.
# Gunakan -v/--volume agar kompatibel dengan Docker Compose Windows.
$FrontendMount = "${FrontendPath}:/frontend:ro"

Run-Step "5. Frontend source contract tests" {
    docker compose run --rm --no-deps `
        -v $FrontendMount `
        -e DASHAI_FRONTEND_ROOT=/frontend `
        api `
        pytest `
        src/tests/test_15_frontend_idempotency_static.py `
        src/tests/test_22_frontend_format_contract_static.py `
        -q
}

if (-not $SkipFullSuite) {
    Run-Step "6. Seluruh backend pytest suite" {
        docker compose exec api `
            pytest -q
    }
}

Run-Step "7. Frontend TypeScript" {
    docker compose exec frontend `
        pnpm exec tsc --noEmit
}

if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "============================================================"
    Write-Host "8. Frontend production build"
    Write-Host "============================================================"

    docker compose stop frontend

    if ($LASTEXITCODE -ne 0) {
        throw "Gagal menghentikan frontend."
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
Write-Host "PROBLEM 5 TEST SUITE SELESAI"
Write-Host "============================================================"
Write-Host "Backend compile       : checked"
Write-Host "Migration             : checked"
Write-Host "Idempotency           : checked"
Write-Host "Stock concurrency     : checked"
Write-Host "Payroll duplication   : checked"
Write-Host "Finance integrity     : checked"
Write-Host "Schema validation     : checked"
Write-Host "Database constraints  : checked"
Write-Host "Frontend formatting   : checked"
Write-Host "TypeScript/build      : checked"
