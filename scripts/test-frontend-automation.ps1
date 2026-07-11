param(
    [string]$ProjectRoot = (Get-Location).Path,
    [switch]$InstallDependencies
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

    if ($InstallDependencies) {
        Write-Host "Installing frontend test dependencies..."
        & docker compose @ComposeArgs exec `
            -T `
            -w /app `
            frontend `
            pnpm install --no-frozen-lockfile

        if ($LASTEXITCODE -ne 0) {
            throw "Frontend dependency installation failed."
        }
    }

    Write-Host "Running frontend automation tests..."

    & docker compose @ComposeArgs exec `
        -T `
        -w /app `
        frontend `
        pnpm test:automation

    if ($LASTEXITCODE -ne 0) {
        throw "Frontend automation tests failed."
    }

    Write-Host ""
    Write-Host "FRONTEND AUTOMATION TESTS PASSED"
}
finally {
    Pop-Location
}
