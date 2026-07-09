param(
    [switch]$SkipBuild,
    [switch]$SkipIntegration
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-Step {
    param(
        [string]$Title,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "============================================================"
    Write-Host $Title
    Write-Host "============================================================"

    Push-Location $Root
    try {
        & $Command

        if ($LASTEXITCODE -ne 0) {
            throw "Step gagal: $Title"
        }
    }
    finally {
        Pop-Location
    }
}

Invoke-Step "Validate Docker Compose" {
    docker compose `
        -f docker-compose.yml `
        -f docker-compose.hardened.yml `
        config --quiet
}

Invoke-Step "Compile backend" {
    docker compose exec api `
        python -m compileall src migrations
}

Invoke-Step "Static and unit tests" {
    docker compose exec api `
        pytest -m "static or unit" -q
}

if (-not $SkipIntegration) {
    Invoke-Step "Integration tests" {
        docker compose exec api `
            pytest -m integration -q
    }
}

Invoke-Step "Frontend TypeScript" {
    docker compose exec frontend `
        pnpm exec tsc --noEmit
}

if (-not $SkipBuild) {
    Invoke-Step "Backend production image" {
        docker build `
            -f apps/backend/Dockerfile `
            -t dashai-api:problem7 `
            apps/backend
    }

    Invoke-Step "Frontend production image" {
        docker build `
            --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 `
            -f apps/frontend/Dockerfile `
            -t dashai-frontend:problem7 `
            apps/frontend
    }
}

Write-Host ""
Write-Host "Problem 7 test suite selesai."
