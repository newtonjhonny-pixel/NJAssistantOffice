#!/usr/bin/env bash
#
# NJ Assistant Office — deploy de HOMOLOGAÇÃO, executado NA VPS pelo GitHub
# Actions (.github/workflows/deploy-homolog.yml).
#
#   bash deploy-homolog.sh <sha> <tarball-do-source>
#
# Garantias:
#   - só toca recursos da stack `njassistantoffice-homolog` (projeto Compose,
#     container, imagem, volumes e banco próprios); nunca a produção;
#   - aborta se o .env.homolog apontar para o banco de produção;
#   - nunca imprime .env, DATABASE_URL, senha ou chave;
#   - schema via `prisma migrate deploy` (mesmas migrations da produção);
#   - nunca executa db push, migrate reset, accept-data-loss, prune ou down -v;
#   - rollback da imagem se o healthcheck falhar.
#
# Variáveis opcionais: PUBLIC_URL (URL pública da homologação; obrigatória só
# no primeiro deploy, para gerar o .env.homolog), HEALTH_TIMEOUT, MIN_FREE_MB.
set -euo pipefail
umask 077

DEPLOY_SHA="${1:?SHA não informado}"
TARBALL="${2:?tarball não informado}"

APP_DIR="/opt/njsistemas/apps/njassistantoffice-homolog"
SOURCE_DIR="$APP_DIR/source"
COMPOSE_FILE="docker-compose.homolog.yml"
COMPOSE_PROJECT="njassistantoffice-homolog"   # `name:` do docker-compose.homolog.yml
APP_SERVICE="app"
APP_CONTAINER="njassistantoffice-app-homolog"
DB_CONTAINER="njassistantoffice-homolog-db"
IMAGE="njassistantoffice-homolog:latest"
ENV_NAME=".env.homolog"
REQUIRED_NETWORKS="njsistemas_internal"
PUBLIC_URL="${PUBLIC_URL:-}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"
MIN_FREE_MB="${MIN_FREE_MB:-3072}"

STAMP="$(date +%Y%m%d_%H%M%S)"
ROLLBACK_TAG="njassistantoffice-homolog:rollback_$STAMP"
PREVIOUS_IMAGE_ID=""

log()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
fail() { printf '\n\033[31mERRO: %s\033[0m\n' "$*" >&2; exit 1; }
# Remove credenciais de qualquer texto antes de ir ao log.
redact() { sed -E -e 's#postgres(ql)?://[^[:space:]"]*#<URL-OMITIDA>#g' -e 's#sk-[A-Za-z0-9_-]{8,}#<CHAVE-OMITIDA>#g'; }
dc() { COMPOSE_IGNORE_ORPHANS=1 docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" "$@" </dev/null; }

# ---------------------------------------------------------------------------
log "1/9  Host"
command -v docker >/dev/null || fail "docker não encontrado no PATH"
docker compose version >/dev/null 2>&1 || fail "docker compose (v2) não disponível"
command -v rsync >/dev/null || fail "rsync não encontrado na VPS"
command -v openssl >/dev/null || fail "openssl não encontrado na VPS"

FREE_MB="$(df -Pm /var/lib/docker 2>/dev/null | awk 'NR==2 {print $4}' || true)"
[ -n "${FREE_MB:-}" ] || FREE_MB="$(df -Pm / | awk 'NR==2 {print $4}')"
info "espaço livre: ${FREE_MB} MB"
[ "$FREE_MB" -ge "$MIN_FREE_MB" ] || fail "espaço insuficiente (${FREE_MB} MB < ${MIN_FREE_MB} MB)"

for net in $REQUIRED_NETWORKS; do
  docker network inspect "$net" >/dev/null 2>&1 || fail "rede Docker externa '$net' não existe — nada foi alterado"
done
info "redes externas presentes: $REQUIRED_NETWORKS"

mkdir -p "$SOURCE_DIR" || fail "não foi possível criar $SOURCE_DIR"

if docker image inspect "$IMAGE" >/dev/null 2>&1; then
  PREVIOUS_IMAGE_ID="$(docker image inspect "$IMAGE" --format '{{.Id}}')"
  docker tag "$IMAGE" "$ROLLBACK_TAG"
  info "imagem atual marcada para rollback: $ROLLBACK_TAG"
else
  info "nenhuma imagem anterior (primeiro deploy)"
fi

# ---------------------------------------------------------------------------
log "2/9  Publicando source do commit $DEPLOY_SHA"
TMP_SRC="$(mktemp -d)"
trap 'rm -rf "$TMP_SRC"' EXIT
tar -xzf "$TARBALL" -C "$TMP_SRC" || fail "não foi possível extrair o tarball"

# Exclui só arquivos de credencial reais — nunca os `.example`, que o passo
# seguinte lê do source.
rsync -a --delete \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude="$ENV_NAME" \
  --exclude="$ENV_NAME.local" \
  "$TMP_SRC"/ "$SOURCE_DIR"/ || fail "rsync do source falhou"
cd "$SOURCE_DIR"

# ---------------------------------------------------------------------------
# .env.homolog: mora em $APP_DIR (fora do source sincronizado). Se já existe,
# nunca é editado. Só no primeiro deploy é gerado a partir do modelo, com os
# segredos criados aqui mesmo na VPS — nunca chegam ao log nem ao GitHub.
# ---------------------------------------------------------------------------
ENV_REAL="$APP_DIR/$ENV_NAME"
if [ ! -f "$ENV_REAL" ]; then
  info "nenhum $ENV_REAL — gerando a partir de $ENV_NAME.example"
  [ -f "$SOURCE_DIR/$ENV_NAME.example" ] || fail "$ENV_NAME.example não encontrado no source"
  case "$PUBLIC_URL" in
    https://*) ;;
    *) fail "primeiro deploy exige a URL pública da homologação (variável NJAO_HOMOLOG_URL no GitHub, começando com https://)" ;;
  esac
  SENHA_GERADA="$(openssl rand -hex 24)"
  SECRET_GERADO="$(openssl rand -hex 32)"
  [ -n "$SENHA_GERADA" ] && [ -n "$SECRET_GERADO" ] || fail "openssl rand não produziu valor — nada foi escrito"
  sed \
    -e "s#__GERAR_SENHA_HOMOLOG__#$SENHA_GERADA#g" \
    -e "s#__GERAR_SECRET_HOMOLOG__#$SECRET_GERADO#g" \
    -e "s#__URL_HOMOLOG__#$PUBLIC_URL#g" \
    "$SOURCE_DIR/$ENV_NAME.example" > "$ENV_REAL"
  unset SENHA_GERADA SECRET_GERADO
  chmod 600 "$ENV_REAL"
  info "$ENV_REAL gerado (segredos criados nesta execução, nunca impressos)"
else
  info "env de homologação encontrado: $ENV_REAL (preservado)"
fi

ln -sfn "$ENV_REAL" "$SOURCE_DIR/$ENV_NAME"

ler_env() { # nome -> valor (sem aspas nem \r); nunca impresso
  grep -E "^[[:space:]]*(export[[:space:]]+)?$1=" "$ENV_REAL" | head -1 | cut -d= -f2- \
    | tr -d '\r' | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//'
}

faltando=""
for var in DATABASE_URL NEXTAUTH_SECRET NEXTAUTH_URL POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB; do
  [ -n "$(ler_env "$var")" ] || faltando="$faltando $var"
done
[ -z "$faltando" ] || fail "variáveis obrigatórias ausentes/vazias em $ENV_REAL:$faltando"
grep -q '__GERAR_\|__URL_HOMOLOG__' "$ENV_REAL" && fail "$ENV_REAL ainda contém placeholders do modelo"

# Trava de isolamento: homologação só pode usar o banco desta stack.
DB_URL_CHECK="$(ler_env DATABASE_URL)"
case "$DB_URL_CHECK" in
  *"@$DB_CONTAINER:"*) ;;
  *) unset DB_URL_CHECK; fail "DATABASE_URL de homologação não aponta para $DB_CONTAINER — abortado para proteger a produção" ;;
esac
case "$DB_URL_CHECK" in
  *njsistemas-postgres*|*njassistantoffice_prod*)
    unset DB_URL_CHECK; fail "DATABASE_URL de homologação referencia recurso de produção — abortado" ;;
esac
unset DB_URL_CHECK
[ -z "$PUBLIC_URL" ] && PUBLIC_URL="$(ler_env NEXTAUTH_URL)"
info "variáveis obrigatórias presentes; banco = $DB_CONTAINER"

# ---------------------------------------------------------------------------
log "3/9  Build da imagem $IMAGE"
dc build "$APP_SERVICE" || fail "build da imagem falhou — homologação atual intacta"

# ---------------------------------------------------------------------------
log "4/9  Banco de homologação"
dc up -d db || fail "não foi possível subir o banco de homologação"
ELAPSED=0; DB_STATUS="starting"
while [ "$ELAPSED" -lt 90 ]; do
  DB_STATUS="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}sem-healthcheck{{end}}' "$DB_CONTAINER" 2>/dev/null || echo desconhecido)"
  [ "$DB_STATUS" = "healthy" ] && break
  sleep 3; ELAPSED=$((ELAPSED + 3))
done
[ "$DB_STATUS" = "healthy" ] || fail "banco de homologação não ficou healthy em ${ELAPSED}s (status: $DB_STATUS)"
info "banco healthy (${ELAPSED}s)"

# ---------------------------------------------------------------------------
log "5/9  Migrations (prisma migrate deploy — mesmas da produção)"
set +e
STATUS_ANTES="$(dc --profile migrate run --rm -T migrate migrate status --schema=./prisma/schema.prisma 2>&1)"
set -e
printf '%s\n' "$STATUS_ANTES" | redact | sed -e '/^[[:space:]]*$/d' -e 's/^/    /'

if printf '%s' "$STATUS_ANTES" | grep -qi 'missing from the local migrations directory'; then
  fail "banco de homologação tem migrations que não existem neste commit — verifique o histórico"
fi

set +e
SAIDA_DEPLOY="$(dc --profile migrate run --rm -T migrate migrate deploy --schema=./prisma/schema.prisma 2>&1)"
RC_DEPLOY=$?
set -e
printf '%s\n' "$SAIDA_DEPLOY" | redact | sed -e '/^[[:space:]]*$/d' -e 's/^/    /'
[ "$RC_DEPLOY" -eq 0 ] || fail "prisma migrate deploy falhou em homologação — NÃO promova este commit para produção"
info "migrations aplicadas; schema de homologação em dia"

# ---------------------------------------------------------------------------
rollback() {
  printf '\n\033[33m>>> ROLLBACK (homologação)\033[0m\n'
  if [ -n "$PREVIOUS_IMAGE_ID" ]; then
    docker tag "$PREVIOUS_IMAGE_ID" "$IMAGE" || true
    dc up -d --no-deps "$APP_SERVICE" || true
    info "imagem anterior restaurada"
  else
    info "sem imagem anterior (primeiro deploy) — nada a restaurar"
  fi
}

# ---------------------------------------------------------------------------
log "6/9  Recriando $APP_CONTAINER"
if docker inspect "$APP_CONTAINER" >/dev/null 2>&1; then
  DONO="$(docker inspect "$APP_CONTAINER" --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null || true)"
  [ "$DONO" = "$COMPOSE_PROJECT" ] || fail "já existe um container '$APP_CONTAINER' do projeto '${DONO:-nenhum}' — não é desta stack; nada foi alterado"
fi
dc up -d --no-deps "$APP_SERVICE" || { rollback; fail "não foi possível subir o container"; }

# ---------------------------------------------------------------------------
log "7/9  Healthcheck (até ${HEALTH_TIMEOUT}s)"
ELAPSED=0; STATUS="starting"
while [ "$ELAPSED" -lt "$HEALTH_TIMEOUT" ]; do
  STATUS="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}sem-healthcheck{{end}}' "$APP_CONTAINER" 2>/dev/null || echo desconhecido)"
  [ "$STATUS" = "healthy" ] && break
  [ "$STATUS" = "unhealthy" ] && break
  sleep 5; ELAPSED=$((ELAPSED + 5))
done
info "status: $STATUS (${ELAPSED}s)"
if [ "$STATUS" != "healthy" ]; then
  printf '\n--- últimos logs do container (credenciais omitidas) ---\n'
  docker logs --tail 80 "$APP_CONTAINER" 2>&1 | redact | sed 's/^/    /' || true
  rollback
  fail "container não ficou healthy"
fi

# ---------------------------------------------------------------------------
log "8/9  Smoke tests"
smoke_fail=0
check() { # nome, esperado(regex), obtido
  if printf '%s' "$3" | grep -qE "^($2)$"; then
    printf '    OK    %-40s %s\n' "$1" "$3"
  else
    printf '    FALHA %-40s obtido=%s esperado=%s\n' "$1" "$3" "$2"; smoke_fail=1
  fi
}
interno() { # caminho -> http status, de dentro do container
  docker exec "$APP_CONTAINER" node -e "fetch('http://127.0.0.1:3000$1').then(r=>console.log(r.status)).catch(()=>console.log('000'))" 2>/dev/null | tr -d '[:space:]'
}
check "interno /api/health" "200" "$(interno /api/health)"
check "interno /"           "200" "$(interno /)"
check "interno /api/tasks (consulta ao banco)" "200" "$(interno /api/tasks)"

if [ -n "$PUBLIC_URL" ]; then
  PUB="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL/api/health" 2>/dev/null || true)"
  if [ -z "$PUB" ] || [ "$PUB" = "000" ]; then
    info "AVISO: $PUBLIC_URL sem resposta de dentro da VPS (DNS/NPM/hairpin) — valide pelo navegador"
  else
    check "público $PUBLIC_URL/api/health" "200" "$PUB"
  fi
fi

if [ "$smoke_fail" -ne 0 ]; then
  docker logs --tail 60 "$APP_CONTAINER" 2>&1 | redact | sed 's/^/    /' || true
  rollback
  fail "smoke test falhou"
fi

# ---------------------------------------------------------------------------
log "9/9  Registrando commit implantado"
echo "$DEPLOY_SHA" > "$APP_DIR/DEPLOYED_COMMIT"
info "DEPLOYED_COMMIT = $(cat "$APP_DIR/DEPLOYED_COMMIT")"

# Mantém só as 3 marcações de rollback mais recentes DESTA stack.
docker images --format '{{.Repository}}:{{.Tag}}' \
  | grep '^njassistantoffice-homolog:rollback_' | sort -r | tail -n +4 \
  | xargs -r -n1 docker rmi >/dev/null 2>&1 || true

printf '\n\033[32mDeploy de homologação concluído — %s\033[0m\n' "$DEPLOY_SHA"
[ -n "$PUBLIC_URL" ] && printf 'URL: %s\n' "$PUBLIC_URL"
exit 0
