param(
    [string]$ProjectRoot = (Get-Location).Path,
    [switch]$BuildImages
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Push-Location $ProjectRoot

try {
    Write-Host "[1/6] Validate development files remain available"
    foreach ($file in @(
        "docker-compose.yml",
        "docker-compose.hardened.yml",
        "apps/backend/Dockerfile.dev",
        "apps/frontend/Dockerfile.dev"
    )) {
        if (-not (Test-Path $file)) { throw "Missing development file: $file" }
    }

    Write-Host "[2/6] Validate production service count"
    $yaml = Get-Content "docker-compose.production.yml" -Raw
    foreach ($service in @("postgres:", "redis:", "api:", "frontend:")) {
        if (-not $yaml.Contains($service)) { throw "Missing service: $service" }
    }
    foreach ($removed in @("  qdrant:", "  worker:", "  migrate:", "  uploads-init:")) {
        if ($yaml.Contains($removed)) { throw "Unexpected production service: $removed" }
    }

    Write-Host "[3/6] Validate Railway JSON"
    Get-Content "apps/backend/railway.json" -Raw | ConvertFrom-Json | Out-Null
    Get-Content "apps/frontend/railway.json" -Raw | ConvertFrom-Json | Out-Null

    Write-Host "[4/6] Validate Python syntax"
    python -m compileall -q apps/backend/src apps/backend/migrations
    if ($LASTEXITCODE -ne 0) { throw "Python compile failed" }

    Write-Host "[5/6] Validate production Compose"
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Copy-Item ".env.production.example" ".env.production" -Force
        try {
            docker compose `
              --env-file ".env.production" `
              -f "docker-compose.production.yml" `
              config -q
            if ($LASTEXITCODE -ne 0) { throw "Production Compose invalid" }
        }
        finally {
            Remove-Item ".env.production" -Force -ErrorAction SilentlyContinue
        }
    }
    else {
        Write-Host "Docker not available; Compose runtime validation skipped."
    }

    Write-Host "[6/6] Optional image builds"
    if ($BuildImages) {
        docker build -f apps/backend/Dockerfile.railway -t dashai-api:railway apps/backend
        if ($LASTEXITCODE -ne 0) { throw "Railway backend image build failed" }

        docker build `
          --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 `
          -f apps/frontend/Dockerfile `
          -t dashai-frontend:production `
          apps/frontend
        if ($LASTEXITCODE -ne 0) { throw "Frontend image build failed" }
    }

    Write-Host "PRODUCTION MODES VALIDATION PASSED" -ForegroundColor Green
}
finally {
    Pop-Location
}
