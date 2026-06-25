#!/bin/bash
# ============================================================
# NJ Assistant Office — Estrutura de diretórios na VPS
# Executar como root ou usuário com sudo
# ============================================================
set -e

APP_DIR="/opt/njsistemas/apps/njassistantoffice"
BACKUP_ROOT="/opt/njsistemas/backups/njassistantoffice"

echo "======================================================"
echo "  NJ Assistant Office — Setup de diretórios"
echo "======================================================"

# ── Verificar rede Docker existente ──────────────────────────
echo ""
echo "[PRÉ] Verificando redes Docker disponíveis..."
echo ""
docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
echo ""
echo "  ⚠️  ATENÇÃO: confirme qual rede é compartilhada com o NPM e o njsistemas-postgres."
echo "  O docker-compose.yml atual referencia: nevion_network"
echo "  Edite docker-compose.yml se a rede correta for diferente."
echo ""

# ── Criar diretórios ──────────────────────────────────────────
echo "[1/2] Criando diretórios de aplicação..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"
mkdir -p "$BACKUP_ROOT"

echo "  ✅ $APP_DIR"
echo "  ✅ $APP_DIR/logs"
echo "  ✅ $BACKUP_ROOT"

# ── Permissões ────────────────────────────────────────────────
echo ""
echo "[2/2] Definindo permissões..."
# UID 1001 = usuário nextjs definido no Dockerfile (não-root)
chown -R 1001:1001 "$APP_DIR/logs"
echo "  ✅ logs/ → owner 1001:1001 (nextjs)"

echo ""
echo "======================================================"
echo "  ✅ Diretórios prontos."
echo ""
echo "  Próximos passos ANTES de continuar:"
echo "  1. Confirmar rede Docker acima e ajustar docker-compose.yml se necessário"
echo "  2. Criar $APP_DIR/.env (baseado em .env.example)"
echo "  3. Em especial: definir DATABASE_URL com host=njsistemas-postgres"
echo "======================================================"
