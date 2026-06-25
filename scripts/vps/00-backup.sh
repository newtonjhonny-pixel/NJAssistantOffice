#!/bin/bash
# ============================================================
# NJ Assistant Office — Backup pré-deploy
# Executar ANTES de qualquer alteração na VPS
# ============================================================
set -e

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_DIR="/opt/njsistemas/backups/njassistantoffice/$TIMESTAMP"
PG_CONTAINER="njsistemas-postgres"
DB_NAME="njassistantoffice_prod"
APP_DIR="/opt/njsistemas/apps/njassistantoffice"

echo "======================================================"
echo "  NJ Assistant Office — Backup pré-deploy"
echo "  $TIMESTAMP"
echo "======================================================"

mkdir -p "$BACKUP_DIR"

# ── 1. Banco de dados ─────────────────────────────────────────
echo ""
echo "[1/3] Backup do banco '$DB_NAME'..."

# Verifica se o banco já existe antes de tentar dump
DB_EXISTS=$(docker exec "$PG_CONTAINER" \
  psql -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
  docker exec "$PG_CONTAINER" \
    pg_dump -U postgres --no-password \
    --format=custom \
    --file="/tmp/${DB_NAME}_${TIMESTAMP}.dump" \
    "$DB_NAME"

  docker cp "$PG_CONTAINER:/tmp/${DB_NAME}_${TIMESTAMP}.dump" \
    "$BACKUP_DIR/${DB_NAME}.dump"

  # Remove dump temporário do container
  docker exec "$PG_CONTAINER" rm -f "/tmp/${DB_NAME}_${TIMESTAMP}.dump"

  echo "  ✅ Banco salvo: $BACKUP_DIR/${DB_NAME}.dump"
else
  echo "  ℹ️  Banco '$DB_NAME' ainda não existe — backup de banco ignorado (primeiro deploy)"
fi

# ── 2. docker-compose.yml atual ───────────────────────────────
echo ""
echo "[2/3] Backup do docker-compose.yml..."

if [ -f "$APP_DIR/docker-compose.yml" ]; then
  cp "$APP_DIR/docker-compose.yml" "$BACKUP_DIR/docker-compose.yml"
  echo "  ✅ docker-compose salvo: $BACKUP_DIR/docker-compose.yml"
else
  echo "  ℹ️  docker-compose.yml ainda não existe em $APP_DIR — ignorado (primeiro deploy)"
fi

# ── 3. Imagem Docker atual ────────────────────────────────────
echo ""
echo "[3/3] Backup da imagem Docker atual..."

IMAGE_EXISTS=$(docker images -q njassistantoffice:latest 2>/dev/null)
if [ -n "$IMAGE_EXISTS" ]; then
  docker tag njassistantoffice:latest "njassistantoffice:backup_$TIMESTAMP"
  echo "  ✅ Imagem anterior preservada como: njassistantoffice:backup_$TIMESTAMP"
else
  echo "  ℹ️  Imagem 'njassistantoffice:latest' ainda não existe — ignorado (primeiro deploy)"
fi

# ── Sumário ───────────────────────────────────────────────────
echo ""
echo "======================================================"
echo "  ✅ Backup concluído em: $BACKUP_DIR"
echo ""
echo "  Rollback se necessário:"
echo "    Banco:  pg_restore via docker exec (ver abaixo)"
echo "    Imagem: docker tag njassistantoffice:backup_$TIMESTAMP njassistantoffice:latest"
echo "    Compose: cp $BACKUP_DIR/docker-compose.yml $APP_DIR/"
echo ""
echo "  Rollback banco:"
echo "    docker exec -i $PG_CONTAINER pg_restore -U postgres \\"
echo "      --dbname=$DB_NAME --clean \\"
echo "      < $BACKUP_DIR/${DB_NAME}.dump"
echo "======================================================"
