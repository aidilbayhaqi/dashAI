#requires -Version 5.1

$ErrorActionPreference = "Stop"
$ProjectRoot = "D:\Documents\CODING\DashAI\DashAI"
$BackupRoot = "D:\Documents\CODING\DashAI\DashAI\.patch-backups\github-ci-fix-20260715-115714"

Get-ChildItem -LiteralPath $BackupRoot -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($BackupRoot.Length).TrimStart("\", "/")
    $targetFile = Join-Path $ProjectRoot $relativePath
    New-Item -ItemType Directory -Path (Split-Path -Parent $targetFile) -Force | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $targetFile -Force
    Write-Host ("RESTORED " + $relativePath) -ForegroundColor Green
}

Write-Host "Rollback completed." -ForegroundColor Green
