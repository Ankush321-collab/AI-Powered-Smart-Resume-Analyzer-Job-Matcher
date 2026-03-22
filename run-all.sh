#!/usr/bin/env bash
set -euo pipefail

MIGRATE=false
if [[ "${1:-}" == "--migrate" ]]; then
  MIGRATE=true
fi

echo "[1/4] Checking Docker services..."
docker compose ps

if [[ ! -d "node_modules" ]]; then
  echo "[2/4] Installing dependencies..."
  npm install
else
  echo "[2/4] Dependencies already installed."
fi

echo "[3/4] Generating Prisma client..."
npm --workspace @resume-analyser/db run generate

if [[ "$MIGRATE" == "true" ]]; then
  echo "[3.5/4] Running Prisma migration..."
  npm --workspace @resume-analyser/db run migrate -- --name local_boot
fi

echo "[4/4] Starting all dev services with Turbo..."
npm run dev