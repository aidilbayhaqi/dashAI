param(
    [switch]$SkipBuild
)

$ErrorActionPreference =
    "Stop"

$ProjectRoot =
    (Get-Location).Path

$FrontendPath =
    Join-Path `
      $ProjectRoot `
      "apps\frontend"

if (
  -not (
    Test-Path `
      (Join-Path `
        $ProjectRoot `
        "docker-compose.yml"
      )
  )
) {
  throw (
    "Jalankan dari root "
    + "project DashAI."
  )
}

function Run-Step {
  param(
    [string]$Title,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host (
    "================"
    + "================"
    + "================"
  )

  Write-Host $Title

  Write-Host (
    "================"
    + "================"
    + "================"
  )

  & $Command

  if (
    $LASTEXITCODE
    -ne 0
  ) {
    throw (
      "Step gagal: "
      + $Title
    )
  }
}

$FrontendMount =
  "${FrontendPath}:/frontend:ro"

Run-Step `
  "1. Frontend auth contract" `
  {
    docker compose run `
      --rm `
      --no-deps `
      -v $FrontendMount `
      -e `
      DASHAI_FRONTEND_ROOT=/frontend `
      api `
      pytest `
      src/tests/test_23_frontend_auth_contract_static.py `
      -q
  }

Run-Step `
  "2. Backend auth integration" `
  {
    docker compose exec api `
      pytest `
      src/tests/test_10_live_health_auth.py `
      -q
  }

Run-Step `
  "3. TypeScript" `
  {
    docker compose exec frontend `
      pnpm exec tsc `
      --noEmit
  }

if (
  -not $SkipBuild
) {
  docker compose stop frontend

  try {
    Run-Step `
      "4. Clean Next build cache" `
      {
        docker compose run `
          --rm `
          --no-deps `
          --entrypoint sh `
          frontend `
          -lc `
          'find /app/.next -mindepth 1 -maxdepth 1 -exec rm -rf {} +'
      }

    Run-Step `
      "5. Production build" `
      {
        docker compose run `
          --rm `
          --no-deps `
          --entrypoint sh `
          frontend `
          -lc `
          'NODE_ENV=production pnpm build'
      }
  }
  finally {
    docker compose up `
      -d frontend
  }
}

Write-Host ""
Write-Host "Problem 6 selesai diuji."
