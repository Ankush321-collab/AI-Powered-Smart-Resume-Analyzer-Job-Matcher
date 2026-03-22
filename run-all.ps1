param(
    [switch]$Migrate
)

$ErrorActionPreference = "Stop"

Write-Host "[1/4] Checking Docker services..."
docker compose ps

if (-not (Test-Path "node_modules")) {
    Write-Host "[2/4] Installing dependencies..."
    npm install
} else {
    Write-Host "[2/4] Dependencies already installed."
}

Write-Host "[3/4] Generating Prisma client..."
npm --workspace @resume-analyser/db run generate

if ($Migrate) {
    Write-Host "[3.5/4] Running Prisma migration..."
    npm --workspace @resume-analyser/db run migrate -- --name local_boot
}

Write-Host "[4/4] Starting all dev services with Turbo..."
npm run dev