param(
    [switch]$SkipBuild,
    [switch]$SkipFullTests
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = (Get-Location).Path
$ComposeBase = Join-Path $ProjectRoot "docker-compose.yml"
$ComposeHardened = Join-Path $ProjectRoot "docker-compose.hardened.yml"
$ComposeProduction = Join-Path $ProjectRoot "docker-compose.production.yml"

if (-not (Test-Path $ComposeBase)) {
    throw "docker-compose.yml tidak ditemukan. Jalankan script dari root project DashAI."
}

if (-not (Test-Path $ComposeHardened)) {
    throw "docker-compose.hardened.yml tidak ditemukan."
}

$ComposeArgs = @(
    "-f",
    "docker-compose.yml",
    "-f",
    "docker-compose.hardened.yml"
)

function Write-StepHeader {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title
    )

    Write-Host ""
    Write-Host "============================================================"
    Write-Host $Title
    Write-Host "============================================================"
}

function Assert-LastExitCode {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if ($LASTEXITCODE -ne 0) {
        throw $Message
    }
}

function Wait-FrontendRoute {
    param(
        [string]$Url = "http://localhost:3000/login",
        [int]$MaxAttempts = 60
    )

    for ($Attempt = 1; $Attempt -le $MaxAttempts; $Attempt++) {
        $StatusLines = @(
            & curl.exe `
                --silent `
                --show-error `
                --output NUL `
                --write-out "%{http_code}" `
                --max-redirs 0 `
                $Url
        )

        $CurlExitCode = $LASTEXITCODE
        $Status = (
            $StatusLines |
            Select-Object -First 1
        )

        $Status = ([string]$Status).Trim()

        if (
            $CurlExitCode -eq 0 -and
            $Status -ne "000" -and
            $Status -ne "404"
        ) {
            Write-Host "$Url -> $Status"
            return
        }

        Write-Host "Menunggu frontend... $Attempt/$MaxAttempts (status: $Status)"
        Start-Sleep -Seconds 2
    }

    throw "Frontend belum siap atau route /login masih 404."
}

Write-StepHeader "1. Validasi Docker Compose"

& docker compose @ComposeArgs config --quiet
Assert-LastExitCode "Validasi Docker Compose gagal."

Write-StepHeader "2. Jalankan service hardened"

& docker compose @ComposeArgs up -d
Assert-LastExitCode "Gagal menjalankan service hardened."

Write-StepHeader "3. Validasi uploads-init dan permission volume"

$ContainerIdLines = @(
    & docker compose @ComposeArgs ps --all --quiet uploads-init
)
Assert-LastExitCode "Gagal mencari container uploads-init."

$ContainerId = $ContainerIdLines |
    Where-Object {
        -not [string]::IsNullOrWhiteSpace([string]$_)
    } |
    Select-Object -First 1

if ([string]::IsNullOrWhiteSpace([string]$ContainerId)) {
    & docker compose @ComposeArgs ps --all
    throw "Container uploads-init tidak ditemukan."
}

$ContainerId = ([string]$ContainerId).Trim()

$InitStatusLines = @(
    & docker inspect --format "{{.State.Status}}" $ContainerId
)
Assert-LastExitCode "Gagal membaca status uploads-init."

$InitExitCodeLines = @(
    & docker inspect --format "{{.State.ExitCode}}" $ContainerId
)
Assert-LastExitCode "Gagal membaca exit code uploads-init."

$InitStatus = (
    $InitStatusLines |
    Select-Object -First 1
)
$InitExitCode = (
    $InitExitCodeLines |
    Select-Object -First 1
)

$InitStatus = ([string]$InitStatus).Trim()
$InitExitCode = ([string]$InitExitCode).Trim()

Write-Host "uploads-init status    : $InitStatus"
Write-Host "uploads-init exit code : $InitExitCode"

if ($InitStatus -ne "exited") {
    throw "uploads-init belum selesai. Status saat ini: $InitStatus"
}

if ($InitExitCode -ne "0") {
    & docker compose @ComposeArgs logs --tail=100 uploads-init
    throw "uploads-init gagal dengan exit code $InitExitCode."
}

$PermissionCommand = "set -eu; test -w /app/uploads; test -w /app/uploads/public; test -w /app/uploads/private; touch /app/uploads/.permission-check; rm -f /app/uploads/.permission-check"

& docker compose @ComposeArgs exec -T api sh -c $PermissionCommand
Assert-LastExitCode "User runtime API tidak dapat menulis ke /app/uploads."

Write-Host "Upload volume writable oleh user runtime API."

Write-StepHeader "4. Status container"

& docker compose @ComposeArgs ps -a
Assert-LastExitCode "Gagal membaca status container."

Write-StepHeader "5. Backend syntax check"

& docker compose @ComposeArgs exec `
    -T `
    -w /app `
    -e PYTHONPATH=/app `
    -e PYTHONDONTWRITEBYTECODE=1 `
    api `
    python src/scripts/syntax_check.py

Assert-LastExitCode "Backend syntax check gagal."

Write-StepHeader "6. Docker security audit"

if (Test-Path ".\scripts\docker-audit.ps1") {
    & powershell -ExecutionPolicy Bypass `
        -File ".\scripts\docker-audit.ps1"

    Assert-LastExitCode "Docker security audit gagal."
}
else {
    Write-Host "SKIPPED: scripts\docker-audit.ps1 tidak ditemukan."
}

Write-StepHeader "7. Backend static tests"

& docker compose @ComposeArgs exec `
    -T `
    -w /app `
    -e PYTHONPATH=/app `
    -e PYTHONDONTWRITEBYTECODE=1 `
    api `
    python -m pytest `
    -m static `
    -q `
    -p no:cacheprovider

Assert-LastExitCode "Backend static tests gagal."

Write-StepHeader "8. Seluruh backend tests"

if ($SkipFullTests) {
    Write-Host "SKIPPED: parameter -SkipFullTests digunakan."
}
else {
    & docker compose @ComposeArgs exec `
        -T `
        -w /app `
        -e PYTHONPATH=/app `
        -e PYTHONDONTWRITEBYTECODE=1 `
        api `
        python -m pytest `
        -q `
        -p no:cacheprovider

    Assert-LastExitCode "Seluruh backend tests gagal."
}

Write-StepHeader "9. Frontend type generation dan TypeScript"

$FrontendWasStopped = $false
$TypeCheckFailed = $false
$TypeCheckMessage = ""

try {
    Write-Host "Menghentikan frontend agar .next tidak ditulis bersamaan..."

    & docker compose @ComposeArgs stop frontend
    Assert-LastExitCode "Gagal menghentikan frontend."
    $FrontendWasStopped = $true

    Write-Host "Membersihkan generated types dan menjalankan typegen..."

    $TypeCheckCommand = "set -eu; rm -rf /app/.next/*; pnpm exec next typegen; pnpm exec tsc --noEmit"

    & docker compose @ComposeArgs run `
        --rm `
        --no-deps `
        -T `
        frontend `
        sh `
        -ec `
        $TypeCheckCommand

    if ($LASTEXITCODE -ne 0) {
        $TypeCheckFailed = $true
        $TypeCheckMessage = "Frontend typegen atau TypeScript check gagal."
    }
}
finally {
    if ($FrontendWasStopped) {
        Write-Host "Menyalakan kembali frontend..."

        & docker compose @ComposeArgs up -d frontend

        if ($LASTEXITCODE -ne 0) {
            throw "Frontend type-check selesai, tetapi frontend gagal dinyalakan kembali."
        }
    }
}

if ($TypeCheckFailed) {
    throw $TypeCheckMessage
}

Write-Host "Frontend type generation dan TypeScript check berhasil."

Write-StepHeader "10. Frontend route smoke test"

Wait-FrontendRoute

if (Test-Path ".\scripts\check-frontend-routes.ps1") {
    & powershell -ExecutionPolicy Bypass `
        -File ".\scripts\check-frontend-routes.ps1"

    Assert-LastExitCode "Frontend route smoke test gagal."
}
else {
    Write-Host "SKIPPED: scripts\check-frontend-routes.ps1 tidak ditemukan."
}

Write-StepHeader "11-12. Production image build"

if ($SkipBuild) {
    Write-Host "SKIPPED: parameter -SkipBuild digunakan."
}
else {
    if (-not (Test-Path $ComposeProduction)) {
        throw "docker-compose.production.yml tidak ditemukan."
    }

    & docker compose `
        -f docker-compose.production.yml `
        build `
        --progress plain `
        api

    Assert-LastExitCode "Production API build gagal."

    & docker compose `
        -f docker-compose.production.yml `
        build `
        --progress plain `
        frontend

    Assert-LastExitCode "Production frontend build gagal."
}

Write-Host ""
Write-Host "============================================================"
Write-Host "PROBLEM 7 + P1 VALIDATION SELESAI"
Write-Host "============================================================"
Write-Host "Compose validation     : checked"
Write-Host "uploads-init           : checked"
Write-Host "Writable upload volume : checked"
Write-Host "Hardened services      : checked"
Write-Host "Backend syntax         : checked"
Write-Host "Docker audit           : checked/skipped"
Write-Host "Backend tests          : checked"
Write-Host "Frontend typegen       : checked"
Write-Host "Frontend TypeScript    : checked"
Write-Host "Frontend routes        : checked/skipped"
Write-Host "Production build       : checked/skipped"