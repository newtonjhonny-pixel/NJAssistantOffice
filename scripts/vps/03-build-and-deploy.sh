#!/bin/bash
# ============================================================
# NJ Assistant Office — Build da imagem e deploy na VPS
# Executar como root ou usuário docker na VPS
# ============================================================
set -e

APP_DIR="/opt/njsistemas/apps/njassistantoffice"
REPO_URL="https://github.com/newtonjhonny-pixel/NJAssistantOffice.git"
IMAGE_NAME="njassistantoffice"
IMAGE_TAG="latest"

echo "======================================================"
echo "  NJ Assistant Office — Deploy"
echo "======================================================"

# 1. Clonar ou atualizar repositório
if [ -d "/tmp/njassistantoffice-build" ]; then
  echo "[1/4] Atualizando repositório..."
  cd /tmp/njassistantoffice-build
  git pull origin main
else
  echo "[1/4] Clonando repositório..."
  git clone "$REPO_URL" /tmp/njassistantoffice-build
  cd /tmp/njassistantoffice-build
fi

# 2. Build da imagem Docker
echo "[2/4] Buildando imagem Docker..."
docker build -t "$IMAGE_NAME:$IMAGE_TAG" .

echo "  ✅ Imagem gerada: $IMAGE_NAME:$IMAGE_TAG"

# 3. Copiar docker-compose para o diretório de deploy
echo "[3/4] Copiando docker-compose..."
cp docker-compose.yml "$APP_DIR/docker-compose.yml"

# 4. Subir container
echo "[4/4] Subindo container..."
cd "$APP_DIR"
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d

echo ""
echo "======================================================"
echo "  ✅ Deploy concluído!"
echo "  Container: njassistantoffice"
echo "  Porta local: 3010"
echo "  Logs: docker logs -f njassistantoffice"
echo "======================================================"
