#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Executando migrations Prisma..."
  node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma
else
  echo "[entrypoint] Migrations Prisma ignoradas (RUN_MIGRATIONS=false)."
fi

echo "[entrypoint] Iniciando servidor Next.js..."
exec node server.js
