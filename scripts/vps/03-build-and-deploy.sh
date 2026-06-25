#!/bin/bash
# ============================================================
# NJ Assistant Office — Build e deploy seguro (sem downtime desnecessário)
# Estratégia: build com tag temporária → só troca após sucesso
# NÃO usa --volumes no down → dados preservados
# ============================================================
set -e

APP_DIR="/opt/njsistemas/apps/njassistantoffice"
REPO_URL="https://github.com/newtonjhonny-pixel/NJAssistantOffice.git"
REPO_DIR="/tmp/njassistantoffice-build"
IMAGE_NAME="njassistantoffice"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

echo "======================================================"
echo "  NJ Assistant Office — Deploy Seguro"
echo "  $TIMESTAMP"
echo "======================================================"

# ── Pré-verificações ──────────────────────────────────────────
echo ""
echo "[PRÉ] Verificando pré-requisitos..."

if [ ! -f "$APP_DIR/.env" ]; then
  echo "  ❌ Arquivo .env não encontrado em $APP_DIR/.env"
  echo "     Crie-o antes de continuar (baseado em .env.example)"
  exit 1
fi
echo "  ✅ .env encontrado"

if [ ! -f "$APP_DIR/docker-compose.yml" ]; then
  echo "  ⚠️  docker-compose.yml não encontrado em $APP_DIR — será copiado do repositório"
fi

# ── 1. Clonar ou atualizar repositório ───────────────────────
echo ""
echo "[1/5] Obtendo código-fonte..."
if [ -d "$REPO_DIR/.git" ]; then
  echo "  Atualizando repositório existente..."
  git -C "$REPO_DIR" fetch origin main
  git -C "$REPO_DIR" reset --hard origin/main
else
  echo "  Clonando repositório..."
  rm -rf "$REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
fi
echo "  ✅ Código atualizado: $(git -C $REPO_DIR log -1 --format='%h %s')"

# ── 2. Build com tag temporária ───────────────────────────────
echo ""
echo "[2/5] Buildando imagem (tag: ${IMAGE_NAME}:new)..."
docker build -t "${IMAGE_NAME}:new" "$REPO_DIR"
echo "  ✅ Imagem '${IMAGE_NAME}:new' criada com sucesso"

# ── 3. Copiar docker-compose (após build bem-sucedido) ────────
echo ""
echo "[3/5] Atualizando docker-compose.yml..."
cp "$REPO_DIR/docker-compose.yml" "$APP_DIR/docker-compose.yml"
echo "  ✅ docker-compose.yml atualizado"

# ── 4. Trocar container (só aqui derrubamos o anterior) ───────
echo ""
echo "[4/5] Trocando container..."

# Para o container atual sem remover volumes
CONTAINER_RUNNING=$(docker ps -q -f name=njassistantoffice 2>/dev/null || true)
if [ -n "$CONTAINER_RUNNING" ]; then
  echo "  Parando container anterior..."
  docker stop njassistantoffice 2>/dev/null || true
  docker rm njassistantoffice 2>/dev/null || true
  echo "  ✅ Container anterior removido (volumes preservados)"
else
  echo "  ℹ️  Nenhum container anterior em execução"
fi

# Promove a imagem nova para :latest
docker tag "${IMAGE_NAME}:new" "${IMAGE_NAME}:latest"
docker rmi "${IMAGE_NAME}:new" 2>/dev/null || true
echo "  ✅ Imagem promovida: ${IMAGE_NAME}:new → ${IMAGE_NAME}:latest"

# Sobe o novo container
cd "$APP_DIR"
docker compose up -d
echo "  ✅ Container iniciado"

# ── 5. Verificação rápida ─────────────────────────────────────
echo ""
echo "[5/5] Aguardando inicialização (30s)..."
sleep 30

STATUS=$(docker inspect -f '{{.State.Status}}' njassistantoffice 2>/dev/null || echo "não encontrado")
HEALTH=$(docker inspect -f '{{.State.Health.Status}}' njassistantoffice 2>/dev/null || echo "sem healthcheck")

echo ""
echo "======================================================"
if [ "$STATUS" = "running" ]; then
  echo "  ✅ Deploy concluído!"
  echo "  Container: njassistantoffice ($STATUS)"
  echo "  Healthcheck: $HEALTH"
  echo "  Logs: docker logs -f njassistantoffice"
  echo ""
  echo "  Se healthcheck ainda estiver 'starting', aguarde mais 30s"
  echo "  e execute: bash 06-validate.sh"
else
  echo "  ❌ Container não está running (status: $STATUS)"
  echo "  Verifique: docker logs njassistantoffice"
  echo ""
  echo "  Rollback rápido:"
  echo "    docker stop njassistantoffice && docker rm njassistantoffice"
  echo "    docker tag ${IMAGE_NAME}:backup_TIMESTAMP ${IMAGE_NAME}:latest"
  echo "    cd $APP_DIR && docker compose up -d"
  exit 1
fi
echo "======================================================"
