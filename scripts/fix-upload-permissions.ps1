$ErrorActionPreference = "Stop"

$ComposeArgs = @(
    "-f",
    "docker-compose.yml",
    "-f",
    "docker-compose.hardened.yml"
)

function Invoke-Compose {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    & docker compose @ComposeArgs @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose command gagal: $($Arguments -join ' ')"
    }
}

Write-Host "Mendeteksi UID/GID user aplikasi..."

$AppUid = (
    & docker compose @ComposeArgs exec -T -u 0 api `
        sh -lc "id -u app"
).Trim()

if ($LASTEXITCODE -ne 0 -or -not $AppUid) {
    throw "Tidak dapat mendeteksi UID user 'app'."
}

$AppGid = (
    & docker compose @ComposeArgs exec -T -u 0 api `
        sh -lc "id -g app"
).Trim()

if ($LASTEXITCODE -ne 0 -or -not $AppGid) {
    throw "Tidak dapat mendeteksi GID user 'app'."
}

Write-Host "App UID:GID = ${AppUid}:${AppGid}"
Write-Host "Memperbaiki ownership folder uploads dan logs..."

Invoke-Compose exec -T -u 0 api sh -lc @"
set -eu

mkdir -p \
  /app/uploads/public \
  /app/uploads/private \
  /app/logs

chown -R ${AppUid}:${AppGid} \
  /app/uploads \
  /app/logs

chmod -R u+rwX,g+rwX,o-rwx \
  /app/uploads \
  /app/logs
"@

Write-Host "Memverifikasi user non-root dapat menulis..."

Invoke-Compose exec -T -u "${AppUid}:${AppGid}" api sh -lc @"
set -eu

test -w /app/uploads
test -w /app/uploads/public
test -w /app/uploads/private

touch /app/uploads/.permission-check
rm -f /app/uploads/.permission-check
"@

Write-Host ""
Write-Host "Upload permission berhasil diperbaiki."
Write-Host "API tetap berjalan sebagai user non-root."
