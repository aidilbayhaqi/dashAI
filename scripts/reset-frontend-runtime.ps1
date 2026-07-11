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

    Write-Host "Stopping and removing frontend container..."
    & docker compose @ComposeArgs stop frontend
    & docker compose @ComposeArgs rm -f frontend

    $FrontendNextVolumes = @(
        & docker volume ls `
            --quiet `
            --filter "label=com.docker.compose.volume=frontend_next"
    ) | Where-Object {
        -not [string]::IsNullOrWhiteSpace($_)
    }

    foreach ($Volume in $FrontendNextVolumes) {
        Write-Host "Removing stale Next.js cache volume: $Volume"
        & docker volume rm $Volume
    }

    Write-Host "Rebuilding frontend..."
    & docker compose @ComposeArgs build --no-cache frontend

    if ($LASTEXITCODE -ne 0) {
        throw "Frontend image build gagal."
    }

    Write-Host "Starting frontend..."
    & docker compose @ComposeArgs up -d --force-recreate frontend

    if ($LASTEXITCODE -ne 0) {
        throw "Frontend container gagal dijalankan."
    }

    Write-Host "Waiting for Next.js route /login..."
    $Ready = $false

    for ($Attempt = 1; $Attempt -le 60; $Attempt++) {
        Start-Sleep -Seconds 2

        $Status = (
            & curl.exe `
                --silent `
                --show-error `
                --output NUL `
                --write-out "%{http_code}" `
                --max-redirs 0 `
                "http://localhost:3000/login"
        ).Trim()

        if (
            $LASTEXITCODE -eq 0 -and
            $Status -ne "000" -and
            $Status -ne "404"
        ) {
            Write-Host "/login -> $Status"
            $Ready = $true
            break
        }

        Write-Host "Waiting... $Attempt/60 (status: $Status)"
    }

    if (-not $Ready) {
        & docker compose @ComposeArgs logs --tail=180 frontend
        throw "Frontend belum menyediakan route /login."
    }

    Write-Host "Frontend runtime reset completed."
}
finally {
    Pop-Location
}
