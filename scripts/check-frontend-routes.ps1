param(
    [string]$ProjectRoot = (Get-Location).Path,
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$AppDirectory = Join-Path $ProjectRoot "apps\frontend\app"

if (-not (Test-Path $AppDirectory)) {
    throw "Folder frontend App Router tidak ditemukan: $AppDirectory"
}

$NormalizedAppDirectory = [System.IO.Path]::GetFullPath(
    $AppDirectory
).TrimEnd([char[]]@('\', '/'))

function Convert-PageFileToRoute {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PageFile
    )

    $PageDirectory = Split-Path $PageFile -Parent
    $NormalizedPageDirectory = [System.IO.Path]::GetFullPath(
        $PageDirectory
    ).TrimEnd([char[]]@('\', '/'))

    if (
        -not $NormalizedPageDirectory.StartsWith(
            $NormalizedAppDirectory,
            [System.StringComparison]::OrdinalIgnoreCase
        )
    ) {
        throw "Page file berada di luar folder app: $PageFile"
    }

    $RelativeDirectory = $NormalizedPageDirectory.Substring(
        $NormalizedAppDirectory.Length
    )

    $RelativeDirectory = $RelativeDirectory `
        -replace '^[\\/]+', ''

    if (
        [string]::IsNullOrWhiteSpace($RelativeDirectory) -or
        $RelativeDirectory -eq "."
    ) {
        return "/"
    }

    $Segments = $RelativeDirectory -split "[\\/]"
    $RouteSegments = @()

    foreach ($Segment in $Segments) {
        # Route groups seperti (auth) dan (dashboard)
        # tidak menjadi bagian URL.
        if ($Segment -match "^\(.+\)$") {
            continue
        }

        # Parallel route dan private folder bukan URL segment normal.
        if (
            $Segment.StartsWith("@") -or
            $Segment.StartsWith("_")
        ) {
            continue
        }

        # Dynamic route memerlukan nilai parameter nyata.
        if ($Segment -match "^\[.*\]$") {
            return $null
        }

        $RouteSegments += $Segment
    }

    if ($RouteSegments.Count -eq 0) {
        return "/"
    }

    return "/" + ($RouteSegments -join "/")
}

$PageFiles = Get-ChildItem `
    -Path $AppDirectory `
    -Recurse `
    -File `
    -Filter "page.tsx"

if (-not $PageFiles) {
    throw "Tidak ada file page.tsx di $AppDirectory"
}

$Routes = @()
$SkippedDynamicRoutes = @()

foreach ($PageFile in $PageFiles) {
    $Route = Convert-PageFileToRoute `
        -PageFile $PageFile.FullName

    if ($null -eq $Route) {
        $SkippedDynamicRoutes += $PageFile.FullName
        continue
    }

    $Routes += $Route
}

$Routes = $Routes |
    Sort-Object -Unique

Write-Host "Ditemukan $($Routes.Count) frontend routes."
Write-Host ""

$Passed = 0
$Failed = 0
$Results = @()

foreach ($Route in $Routes) {
    $Url = "$BaseUrl$Route"

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

    $StatusNumber = 0
    [void][int]::TryParse(
        $Status,
        [ref]$StatusNumber
    )

    # 2xx/3xx valid. 401/403 juga membuktikan route tersedia.
    $IsValid = (
        $CurlExitCode -eq 0 -and
        (
            (
                $StatusNumber -ge 200 -and
                $StatusNumber -lt 400
            ) -or
            $StatusNumber -eq 401 -or
            $StatusNumber -eq 403
        )
    )

    if ($IsValid) {
        $Passed++
        $Label = "PASS"
    }
    else {
        $Failed++
        $Label = "FAIL"
    }

    $Results += [PSCustomObject]@{
        Route = $Route
        Status = $Status
        Result = $Label
    }
}

$Results |
    Format-Table `
        -AutoSize `
        Route, Status, Result

Write-Host ""
Write-Host "Passed : $Passed"
Write-Host "Failed : $Failed"
Write-Host "Total  : $($Routes.Count)"

if ($SkippedDynamicRoutes.Count -gt 0) {
    Write-Host ""
    Write-Host "Dynamic page files skipped:"

    $SkippedDynamicRoutes |
        ForEach-Object {
            Write-Host "- $_"
        }
}

if ($Failed -gt 0) {
    throw "$Failed frontend route gagal, 404, 5xx, atau tidak dapat diakses."
}

Write-Host ""
Write-Host "Semua frontend route statis berhasil ditemukan."
