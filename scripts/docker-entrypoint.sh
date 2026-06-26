#!/bin/sh
set -e

echo "[entrypoint] Executando migrations Prisma..."
node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Iniciando servidor Next.js..."
exec node server.js
