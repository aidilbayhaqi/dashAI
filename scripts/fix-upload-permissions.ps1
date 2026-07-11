param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path $ProjectRoot).Path

Push-Location $ProjectRoot

try {
    $ComposeArgs = @(
        "-f",
        "docker-compose.yml",
        "-f",
        "docker-compose.hardened.yml"
    )

    & docker compose @ComposeArgs up -d uploads-init api

    if ($LASTEXITCODE -ne 0) {
        throw "Gagal menjalankan uploads-init dan api."
    }

    $ContainerId = (
        & docker compose @ComposeArgs ps -q uploads-init
    ).Trim()

    if (-not $ContainerId) {
        throw "Container uploads-init tidak ditemukan."
    }

    $ExitCode = (
        & docker inspect `
            --format "{{.State.ExitCode}}" `
            $ContainerId
    ).Trim()

    if ($ExitCode -ne "0") {
        & docker compose @ComposeArgs logs --tail=100 uploads-init
        throw "uploads-init gagal dengan exit code $ExitCode."
    }

    & docker compose @ComposeArgs exec -T api sh -c `
        'set -eu; test -w /app/uploads; test -w /app/uploads/public; test -w /app/uploads/private; touch /app/uploads/.permission-check; rm -f /app/uploads/.permission-check'

    if ($LASTEXITCODE -ne 0) {
        throw "Volume upload belum writable oleh user runtime API."
    }

    Write-Host "Upload permission valid melalui uploads-init."
}
finally {
    Pop-Location
}
