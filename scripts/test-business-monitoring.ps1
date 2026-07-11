param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Push-Location $ProjectRoot

try {
    $ComposeArgs = @(
        "-f",
        "docker-compose.yml",
        "-f",
        "docker-compose.hardened.yml"
    )

    Write-Host "[1/3] Backend automation + payment monitoring tests"
    & docker compose @ComposeArgs exec `
        -T `
        -w /app `
        -e PYTHONPATH=/app `
        api `
        python -m pytest `
        src/tests/test_30_sales_order_automation.py `
        src/tests/test_31_invoice_automation.py `
        src/tests/test_32_business_event_outbox.py `
        src/tests/test_33_automation_idempotency.py `
        src/tests/test_34_automation_payment_monitoring.py `
        -q `
        -p no:cacheprovider

    if ($LASTEXITCODE -ne 0) {
        throw "Backend business monitoring tests failed."
    }

    Write-Host ""
    Write-Host "[2/3] Frontend automation and UI refinement tests"
    & docker compose @ComposeArgs exec `
        -T `
        -w /app `
        frontend `
        pnpm test:automation

    if ($LASTEXITCODE -ne 0) {
        throw "Frontend automation tests failed."
    }

    Write-Host ""
    Write-Host "[3/3] Frontend generated types and TypeScript"
    & docker compose @ComposeArgs exec `
        -T `
        -w /app `
        frontend `
        pnpm exec next typegen

    if ($LASTEXITCODE -ne 0) {
        throw "Next.js type generation failed."
    }

    & docker compose @ComposeArgs exec `
        -T `
        -w /app `
        frontend `
        pnpm exec tsc --noEmit

    if ($LASTEXITCODE -ne 0) {
        throw "Frontend TypeScript check failed."
    }

    Write-Host ""
    Write-Host "BUSINESS MONITORING AND UI REFINEMENT TESTS PASSED"
}
finally {
    Pop-Location
}
