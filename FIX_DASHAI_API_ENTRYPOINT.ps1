param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-WarnMessage {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$BackendRoot = Join-Path $ProjectRoot "apps\backend"
$DockerfilePath = Join-Path $BackendRoot "Dockerfile"
$EntrypointPath = Join-Path $BackendRoot "docker-entrypoint.sh"

Write-Step "Memeriksa struktur project"

if (-not (Test-Path (Join-Path $ProjectRoot "docker-compose.yml"))) {
    throw "docker-compose.yml tidak ditemukan di: $ProjectRoot"
}

if (-not (Test-Path $DockerfilePath)) {
    throw "Dockerfile backend tidak ditemukan di: $DockerfilePath"
}

if (-not (Test-Path $EntrypointPath)) {
    throw "docker-entrypoint.sh tidak ditemukan di: $EntrypointPath"
}

Write-Ok "File backend ditemukan"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dockerfileBackup = "$DockerfilePath.backup-$timestamp"
$entrypointBackup = "$EntrypointPath.backup-$timestamp"

Copy-Item $DockerfilePath $dockerfileBackup
Copy-Item $EntrypointPath $entrypointBackup

Write-Ok "Backup dibuat:"
Write-Host "     $dockerfileBackup"
Write-Host "     $entrypointBackup"

Write-Step "Menormalisasi docker-entrypoint.sh ke format Linux"

$entrypointContent = [System.IO.File]::ReadAllText($EntrypointPath)
$entrypointContent = $entrypointContent -replace "`r`n", "`n"
$entrypointContent = $entrypointContent -replace "`r", "`n"

if (-not $entrypointContent.StartsWith("#!/bin/sh")) {
    Write-WarnMessage "Shebang #!/bin/sh tidak ditemukan di baris pertama. Menambahkan shebang."
    $entrypointContent = "#!/bin/sh`n" + $entrypointContent.TrimStart()
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    $EntrypointPath,
    $entrypointContent,
    $utf8NoBom
)

Write-Ok "Line ending diubah ke LF dan encoding menjadi UTF-8 tanpa BOM"

Write-Step "Memperbaiki Dockerfile backend"

$dockerfile = [System.IO.File]::ReadAllText($DockerfilePath)

$oldEntrypoint = 'ENTRYPOINT ["/app/docker-entrypoint.sh"]'
$newEntrypoint = 'ENTRYPOINT ["/usr/local/bin/dashai-entrypoint"]'

if ($dockerfile.Contains($oldEntrypoint)) {
    $dockerfile = $dockerfile.Replace($oldEntrypoint, $newEntrypoint)
    Write-Ok "ENTRYPOINT dipindahkan dari /app ke /usr/local/bin"
}
elseif ($dockerfile.Contains($newEntrypoint)) {
    Write-Ok "ENTRYPOINT sudah menggunakan /usr/local/bin/dashai-entrypoint"
}
else {
    throw "Baris ENTRYPOINT backend tidak dikenali. Backup sudah dibuat; Dockerfile tidak dilanjutkan."
}

$oldRunPattern = '(?m)^\s*RUN\s+chmod\s+\+x\s+/app/docker-entrypoint\.sh\s*$'
$newCopyBlock = @'
# Simpan entrypoint di luar /app agar tidak tertimpa bind mount Docker Compose.
COPY docker-entrypoint.sh /usr/local/bin/dashai-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/dashai-entrypoint \
    && chmod 0755 /usr/local/bin/dashai-entrypoint
'@

if ($dockerfile -match $oldRunPattern) {
    $dockerfile = [regex]::Replace(
        $dockerfile,
        $oldRunPattern,
        $newCopyBlock.TrimEnd(),
        1
    )
    Write-Ok "Instruksi chmod lama diganti dengan copy entrypoint yang aman"
}
elseif ($dockerfile -notmatch 'COPY\s+docker-entrypoint\.sh\s+/usr/local/bin/dashai-entrypoint') {
    $copyAppPattern = '(?m)^\s*COPY\s+--chown=app:app\s+\.\s+/app\s*$'

    if ($dockerfile -match $copyAppPattern) {
        $replacement = $newCopyBlock.TrimEnd() + "`n`n" + '$0'
        $dockerfile = [regex]::Replace(
            $dockerfile,
            $copyAppPattern,
            $replacement,
            1
        )
        Write-Ok "Instruksi entrypoint ditambahkan sebelum COPY source backend"
    }
    else {
        throw "Lokasi penyisipan entrypoint di Dockerfile tidak ditemukan. Backup sudah dibuat."
    }
}
else {
    Write-Ok "Instruksi COPY entrypoint sudah tersedia"
}

[System.IO.File]::WriteAllText(
    $DockerfilePath,
    $dockerfile,
    $utf8NoBom
)

Write-Step "Memvalidasi hasil patch"

$patchedDockerfile = [System.IO.File]::ReadAllText($DockerfilePath)

$requiredContracts = @(
    'COPY docker-entrypoint.sh /usr/local/bin/dashai-entrypoint',
    'chmod 0755 /usr/local/bin/dashai-entrypoint',
    'ENTRYPOINT ["/usr/local/bin/dashai-entrypoint"]'
)

foreach ($contract in $requiredContracts) {
    if (-not $patchedDockerfile.Contains($contract)) {
        throw "Contract '$contract' tidak ditemukan setelah patch."
    }
}

Write-Ok "Dockerfile berhasil dipatch"

Write-Step "Membangun ulang service API saja"

Push-Location $ProjectRoot

try {
    docker compose stop api
    docker compose rm -sf api
    docker compose build --no-cache api

    if ($LASTEXITCODE -ne 0) {
        throw "Build service api gagal."
    }

    docker compose up -d --force-recreate api

    if ($LASTEXITCODE -ne 0) {
        throw "Service api gagal dijalankan."
    }

    Write-Step "Menampilkan log API terbaru"
    docker compose logs --tail=120 api

    Write-Step "Memeriksa entrypoint di dalam image"
    docker compose run --rm --no-deps `
        --entrypoint sh api `
        -lc "test -x /usr/local/bin/dashai-entrypoint && head -n 2 /usr/local/bin/dashai-entrypoint"

    if ($LASTEXITCODE -ne 0) {
        throw "Entrypoint belum valid di dalam image."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Perbaikan backend selesai." -ForegroundColor Green
Write-Host "Script hanya mengubah:" -ForegroundColor Green
Write-Host "  - apps/backend/Dockerfile"
Write-Host "  - apps/backend/docker-entrypoint.sh"
Write-Host "  - container service api"
Write-Host ""
Write-Host "Frontend dan volume database tidak diubah."
