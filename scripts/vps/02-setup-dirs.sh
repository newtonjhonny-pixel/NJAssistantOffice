#!/bin/bash
# ============================================================
# NJ Assistant Office — Estrutura de diretórios na VPS
# Executar como root ou usuário com sudo
# VPS: Hostinger Ubuntu 24.04
# ============================================================
set -e

APP_DIR="/opt/njsistemas/apps/njassistantoffice"

echo "[setup] Criando estrutura de diretórios..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"

echo "[setup] Definindo permissões..."
# Usuário que rodará o container (UID 1001 = nextjs definido no Dockerfile)
chown -R 1001:1001 "$APP_DIR/logs"

echo "[setup] Copiando arquivos de deploy..."
# Execute este script a partir do repositório clonado:
# cp scripts/vps/docker-compose.yml $APP_DIR/docker-compose.yml
# cp scripts/vps/.env.production     $APP_DIR/.env

echo ""
echo "✅ Estrutura criada em: $APP_DIR"
echo ""
echo "Próximos passos:"
echo "  1. Copiar docker-compose.yml para $APP_DIR/"
echo "  2. Criar $APP_DIR/.env com as variáveis de produção"
echo "  3. Rodar: cd $APP_DIR && docker compose up -d"
