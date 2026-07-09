param(
    [switch]$Apply,
    [switch]$IncludeBackups
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$Patterns = @(
    "problem-4*",
    "problem-5*",
    "problem-6*",
    "problem-7*",
    "dashai-problem-5*",
    "dashai-problem5*",
    "dashai-problem6*",
    "dashai-problem7*",
    "fix_*.py",
    "apply_*.py",
    "force_replace_*.py",
    "run_problem5_tests.ps1",
    "run_problem6_tests.ps1"
)

$Protected = @(
    "apps",
    ".git",
    ".github",
    "scripts",
    "docker-compose.yml",
    "docker-compose.hardened.yml",
    "docker-compose.production.yml"
)

$Candidates = @()

foreach ($Pattern in $Patterns) {
    $Candidates += Get-ChildItem `
        -Path $Root `
        -Filter $Pattern `
        -Force `
        -ErrorAction SilentlyContinue
}

if ($IncludeBackups) {
    $Candidates += Get-ChildItem `
        -Path $Root `
        -Directory `
        -Force `
        -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -like ".problem*-backups"
        }
}

$Candidates = $Candidates |
    Sort-Object FullName -Unique |
    Where-Object {
        $Protected -notcontains $_.Name
    }

if (-not $Candidates) {
    Write-Host "Tidak ada file installer sementara yang ditemukan."
    exit 0
}

Write-Host "File/folder kandidat cleanup:"
$Candidates |
    Select-Object FullName, Length, LastWriteTime |
    Format-Table -AutoSize

if (-not $Apply) {
    Write-Host ""
    Write-Host "Dry-run saja. Tidak ada file yang dihapus."
    Write-Host "Jalankan ulang dengan -Apply setelah Git commit dan test berhasil."
    exit 0
}

foreach ($Item in $Candidates) {
    Remove-Item `
        -LiteralPath $Item.FullName `
        -Recurse `
        -Force

    Write-Host "Deleted: $($Item.FullName)"
}

Write-Host "Cleanup selesai."
