$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ReportDir = Join-Path $Root ".problem7-reports"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Report = Join-Path $ReportDir "docker-audit-$Timestamp.txt"

New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null

function Write-Report {
    param([string]$Text)

    $Text | Tee-Object -FilePath $Report -Append
}

Push-Location $Root
try {
    Write-Report "DashAI Problem 7 Docker Audit"
    Write-Report "Generated: $(Get-Date -Format o)"
    Write-Report ""

    Write-Report "=== Docker version ==="
    docker version 2>&1 | Out-String | Write-Report

    Write-Report "=== Docker Compose version ==="
    docker compose version 2>&1 | Out-String | Write-Report

    Write-Report "=== Compose validation ==="
    docker compose `
        -f docker-compose.yml `
        -f docker-compose.hardened.yml `
        config 2>&1 | Out-String | Write-Report

    Write-Report "=== Running containers ==="
    docker compose ps 2>&1 | Out-String | Write-Report

    Write-Report "=== Images ==="
    docker images `
        --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" `
        2>&1 | Out-String | Write-Report

    Write-Report "=== Container users ==="
    foreach ($Service in @("api", "frontend")) {
        Write-Report "--- $Service ---"

        docker compose exec -T $Service `
            sh -lc "id && pwd" `
            2>&1 | Out-String | Write-Report
    }

    Write-Report "=== Health endpoints ==="
    try {
        Invoke-WebRequest `
            -Uri "http://localhost:8000/ready" `
            -UseBasicParsing `
            -TimeoutSec 10 |
            Select-Object StatusCode, Content |
            Out-String |
            Write-Report
    }
    catch {
        Write-Report $_.Exception.Message
    }

    try {
        Invoke-WebRequest `
            -Uri "http://localhost:3000" `
            -UseBasicParsing `
            -TimeoutSec 10 |
            Select-Object StatusCode |
            Out-String |
            Write-Report
    }
    catch {
        Write-Report $_.Exception.Message
    }

    Write-Report "=== Git ignored secret/cache check ==="
    git status --short 2>&1 |
        Out-String |
        Write-Report

    Write-Host ""
    Write-Host "Audit report: $Report"
}
finally {
    Pop-Location
}
