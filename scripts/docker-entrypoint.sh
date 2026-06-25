#!/bin/sh
set -e

echo "[entrypoint] Executando migrations Prisma..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Iniciando servidor Next.js..."
exec node server.js
