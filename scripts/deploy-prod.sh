#!/usr/bin/env bash
#
# NJ Assistant Office — deploy de PRODUÇÃO, executado NA VPS pelo GitHub
# Actions (.github/workflows/deploy-prod.yml, somente disparo manual).
#
#   bash deploy-prod.sh <sha> <tarball-do-source>
#
# Garantias:
#   - só toca recursos da stack `njassistantoffice` (projeto Compose explícito);
#   - usa o .env que a produção JÁ usa — nunca cria, edita nem imprime;
#   - backup obrigatório (pg_dump + env + source + imagem) antes de qualquer
#     alteração; se o backup falhar, nada é alterado;
#   - só `prisma migrate deploy`, e só se TODAS as migrations pendentes
#     passarem na auditoria (sem DROP/TRUNCATE/DELETE/alteração de coluna);
#   - nunca executa db push, migrate reset, accept-data-loss, prune ou down -v;
#   - container legado (criado fora desta stack) é PARADO e RENOMEADO, nunca
#     apagado — o rollback o traz de volta;
#   - rollback automático de imagem/source/container se healthcheck ou smoke
#     test falharem. Migrations não são revertidas (por isso só as aditivas passam).
#
# Variáveis opcionais: PG_CONTAINER, PUBLIC_URL, HEALTH_TIMEOUT, MIN_FREE_MB.
set -euo pipefail
umask 077

DEPLOY_SHA="${1:?SHA não informado}"
TARBALL="${2:?tarball não informado}"

APP_DIR="/opt/njsistemas/apps/njassistantoffice"
SOURCE_DIR="$APP_DIR/source"
BACKUP_ROOT="/opt/njsistemas/backups/njassistantoffice"
COMPOSE_FILE="docker-compose.prod.yml"
COMPOSE_PROJECT="njassistantoffice"   # `name:` do docker-compose.prod.yml
APP_SERVICE="app"
APP_CONTAINER="njassistantoffice-app"
# Nome usado pelo docker-compose.yml antigo (scripts/vps/03-build-and-deploy.sh).
LEGACY_CONTAINERS="njassistantoffice-app njassistantoffice"
IMAGE="njassistantoffice:prod"
UPLOADS_VOLUME="njassistantoffice_prod_uploads"
REQUIRED_NETWORKS="njassistantoffice_network njsistemas_internal"
PG_CONTAINER="${PG_CONTAINER:-njsistemas-postgres}"
PUBLIC_URL="${PUBLIC_URL:-https://assistant.nevion.com.br}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"
MIN_FREE_MB="${MIN_FREE_MB:-5120}"
SCHEMA_ARG="--schema=./prisma/schema.prisma"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/github_actions_$STAMP"
ROLLBACK_TAG="njassistantoffice:rollback_$STAMP"
PREVIOUS_IMAGE_ID=""
PARKED=""          # "nome_original:nome_estacionado" dos containers legados parados
SOURCE_BACKED_UP=0

log()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
fail() { printf '\n\033[31mERRO: %s\033[0m\n' "$*" >&2; exit 1; }
redact() { sed -E -e 's#postgres(ql)?://[^[:space:]"]*#<URL-OMITIDA>#g' -e 's#sk-[A-Za-z0-9_-]{8,}#<CHAVE-OMITIDA>#g'; }
dc() { COMPOSE_IGNORE_ORPHANS=1 docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" "$@" </dev/null; }
label() { docker inspect "$1" --format "{{index .Config.Labels \"$2\"}}" 2>/dev/null | sed 's/^<no value>$//' || true; }
# Container pertence a esta stack? (projeto E serviço — um compose antigo
# rodado a partir de $APP_DIR também teria projeto "njassistantoffice").
is_ours() { [ "$(label "$1" com.docker.compose.project)" = "$COMPOSE_PROJECT" ] && [ "$(label "$1" com.docker.compose.service)" = "$APP_SERVICE" ]; }

# ---------------------------------------------------------------------------
log "1/12  Host"
command -v docker >/dev/null || fail "docker não encontrado no PATH"
docker compose version >/dev/null 2>&1 || fail "docker compose (v2) não disponível"
command -v rsync >/dev/null || fail "rsync não encontrado na VPS"

FREE_MB="$(df -Pm /var/lib/docker 2>/dev/null | awk 'NR==2 {print $4}' || true)"
[ -n "${FREE_MB:-}" ] || FREE_MB="$(df -Pm / | awk 'NR==2 {print $4}')"
info "espaço livre: ${FREE_MB} MB"
[ "$FREE_MB" -ge "$MIN_FREE_MB" ] || fail "espaço insuficiente (${FREE_MB} MB < ${MIN_FREE_MB} MB)"

for net in $REQUIRED_NETWORKS; do
  docker network inspect "$net" >/dev/null 2>&1 || fail "rede Docker externa '$net' não existe — nada foi alterado"
done
docker inspect "$PG_CONTAINER" >/dev/null 2>&1 || fail "container PostgreSQL '$PG_CONTAINER' não encontrado — nada foi alterado"
info "redes e $PG_CONTAINER presentes"

# ---------------------------------------------------------------------------
# 2. Localizar o .env que a produção JÁ usa (só nomes de arquivo no log).
# ---------------------------------------------------------------------------
log "2/12  Arquivo de ambiente de produção"
mkdir -p "$SOURCE_DIR"
WORKDIRS=""
for c in $LEGACY_CONTAINERS; do
  wd="$(label "$c" com.docker.compose.project.working_dir)"
  [ -n "$wd" ] && { WORKDIRS="$WORKDIRS $wd"; info "container $c declara working_dir: $wd"; }
done

# Container legado publicando porta no host (docker-compose.yml antigo: 3010)
# indica que o NPM pode estar apontando para IP:porta, não para o nome do
# container. A nova stack não publica portas — trocar às cegas daria 502.
for c in $LEGACY_CONTAINERS; do
  docker inspect "$c" >/dev/null 2>&1 || continue
  is_ours "$c" && continue
  PORTAS="$(docker inspect "$c" --format '{{range $p, $b := .HostConfig.PortBindings}}{{$p}} {{end}}' 2>/dev/null || true)"
  [ -z "$PORTAS" ] || fail "o container legado '$c' publica portas no host ($PORTAS). A nova stack não publica portas; confirme no NPM para onde o proxy aponta (docs/DEPLOY-VPS.md). Nada foi alterado."
done

ENV_SOURCE=""
for candidato in "$SOURCE_DIR/.env.production" \
                 $(for wd in $WORKDIRS; do echo "$wd/.env.production $wd/.env"; done) \
                 "$APP_DIR/.env.production" "$APP_DIR/.env"; do
  if [ -f "$candidato" ]; then ENV_SOURCE="$(readlink -f "$candidato")"; break; fi
done
[ -n "$ENV_SOURCE" ] || fail "nenhum .env de produção encontrado (procurado em $APP_DIR e nos working_dir dos containers) — este workflow não cria credenciais"
case "$ENV_SOURCE" in "$SOURCE_DIR"/*) fail "o .env real não pode morar dentro de $SOURCE_DIR (é sincronizado a cada deploy)";; esac
info "env de produção: $ENV_SOURCE"

ENV_FILE="$SOURCE_DIR/.env.production"
ler_env() {
  grep -E "^[[:space:]]*(export[[:space:]]+)?$1=" "$ENV_SOURCE" | head -1 | cut -d= -f2- \
    | tr -d '\r' | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//'
}
DB_URL_CHECK="$(ler_env DATABASE_URL)"
case "$DB_URL_CHECK" in
  postgres://*|postgresql://*) ;;
  *) unset DB_URL_CHECK; fail "DATABASE_URL ausente ou não-PostgreSQL no env de produção" ;;
esac
unset DB_URL_CHECK
info "DATABASE_URL presente (PostgreSQL)"

# ---------------------------------------------------------------------------
# 3. Backup — obrigatório. Falhou, aborta sem alterar nada.
# ---------------------------------------------------------------------------
log "3/12  Backup em $BACKUP_DIR"
mkdir -p "$BACKUP_DIR" || fail "não foi possível criar o diretório de backup"
cp -L "$ENV_SOURCE" "$BACKUP_DIR/env.production.bak" || fail "backup do .env falhou"
for wd in $WORKDIRS; do
  for f in docker-compose.yml docker-compose.prod.yml; do
    [ -f "$wd/$f" ] && cp "$wd/$f" "$BACKUP_DIR/$(basename "$wd")__$f" || true
  done
done
for c in $LEGACY_CONTAINERS; do
  docker inspect "$c" > "$BACKUP_DIR/container-$c.json" 2>/dev/null || rm -f "$BACKUP_DIR/container-$c.json"
done
if docker image inspect "$IMAGE" >/dev/null 2>&1; then
  PREVIOUS_IMAGE_ID="$(docker image inspect "$IMAGE" --format '{{.Id}}')"
  echo "$PREVIOUS_IMAGE_ID" > "$BACKUP_DIR/previous-image-id.txt"
  docker tag "$IMAGE" "$ROLLBACK_TAG"
  info "imagem atual marcada para rollback: $ROLLBACK_TAG"
else
  info "nenhuma imagem $IMAGE anterior"
fi
if [ -n "$(ls -A "$SOURCE_DIR" 2>/dev/null)" ]; then
  tar -czf "$BACKUP_DIR/source.tar.gz" -C "$SOURCE_DIR" --exclude='./.env.production' . || fail "backup do source falhou"
  SOURCE_BACKED_UP=1
fi

# pg_dump dentro do container do Postgres. A URL vai por variável de ambiente
# herdada (`-e PGURL` sem valor), nunca na linha de comando. Parâmetros que o
# libpq não entende (?schema=public do Prisma) são removidos só para o dump.
sanitizar_url() {
  local url="$1" base query par chave mantidos=""
  base="${url%%\?*}"; [ "$base" = "$url" ] && { printf '%s' "$url"; return; }
  query="${url#*\?}"; local pares=(); IFS='&' read -ra pares <<< "$query"
  for par in "${pares[@]}"; do
    chave="${par%%=*}"
    case "$chave" in sslmode|sslrootcert|sslcert|sslkey|connect_timeout|application_name|options) mantidos="${mantidos:+$mantidos&}$par";; esac
  done
  printf '%s%s' "$base" "${mantidos:+?$mantidos}"
}
info "pg_dump do banco de produção..."
PGURL="$(sanitizar_url "$(ler_env DATABASE_URL)")"; export PGURL
if ! docker exec -e PGURL "$PG_CONTAINER" sh -c 'pg_dump --format=custom --no-owner --no-privileges --dbname="$PGURL"' \
     > "$BACKUP_DIR/database.dump" 2> "$BACKUP_DIR/pg_dump.err"; then
  unset PGURL
  redact < "$BACKUP_DIR/pg_dump.err" | head -20 | sed 's/^/    /'
  fail "pg_dump falhou — deploy abortado, nada foi alterado"
fi
unset PGURL
DUMP_BYTES="$(stat -c%s "$BACKUP_DIR/database.dump")"
info "dump: ${DUMP_BYTES} bytes"
[ "$DUMP_BYTES" -gt 1024 ] || fail "dump suspeito (muito pequeno) — deploy abortado"
echo "$DEPLOY_SHA" > "$BACKUP_DIR/target-commit.txt"
info "backup concluído"

# ---------------------------------------------------------------------------
log "4/12  Publicando source do commit $DEPLOY_SHA"
TMP_SRC="$(mktemp -d)"
trap 'rm -rf "$TMP_SRC"' EXIT
tar -xzf "$TARBALL" -C "$TMP_SRC" || fail "não foi possível extrair o tarball"
rsync -a --delete --exclude='.env' --exclude='.env.*' "$TMP_SRC"/ "$SOURCE_DIR"/ || fail "rsync do source falhou"
cp "$TMP_SRC/.env.example" "$SOURCE_DIR/.env.example" 2>/dev/null || true
ln -sfn "$ENV_SOURCE" "$ENV_FILE"
cd "$SOURCE_DIR"

restore_source() {
  if [ "$SOURCE_BACKED_UP" -eq 1 ]; then
    rm -rf "$TMP_SRC/restore" && mkdir -p "$TMP_SRC/restore"
    tar -xzf "$BACKUP_DIR/source.tar.gz" -C "$TMP_SRC/restore" \
      && rsync -a --delete --exclude='.env' --exclude='.env.*' "$TMP_SRC/restore"/ "$SOURCE_DIR"/ \
      && ln -sfn "$ENV_SOURCE" "$ENV_FILE" && info "source anterior restaurado" || true
  fi
}

# ---------------------------------------------------------------------------
log "5/12  Build da imagem $IMAGE"
if ! dc build "$APP_SERVICE"; then
  [ -n "$PREVIOUS_IMAGE_ID" ] && docker tag "$PREVIOUS_IMAGE_ID" "$IMAGE" || true
  restore_source
  fail "build falhou — produção intacta (container atual não foi tocado)"
fi

# ---------------------------------------------------------------------------
# 6. Migrations: lê sempre; escreve só se todas as pendentes passarem.
# ---------------------------------------------------------------------------
rollback_image_only() {
  [ -n "$PREVIOUS_IMAGE_ID" ] && docker tag "$PREVIOUS_IMAGE_ID" "$IMAGE" || true
  restore_source
}
migrate_status() {
  set +e; MIGRATE_STATUS="$(dc --profile migrate run --rm -T migrate migrate status "$SCHEMA_ARG" 2>&1)"; set -e
  printf '%s\n' "$MIGRATE_STATUS" | redact | sed -e '/^[[:space:]]*$/d' -e 's/^/    /'
}

log "6/12  Verificando migrations"
migrate_status
if printf '%s' "$MIGRATE_STATUS" | grep -qi 'missing from the local migrations directory'; then
  rollback_image_only; fail "há migrations aplicadas no banco que não existem neste commit — divergência de histórico. Nada aplicado."
fi
if printf '%s' "$MIGRATE_STATUS" | grep -qiE 'have failed|failed to apply'; then
  rollback_image_only; fail "há migration marcada como falha em _prisma_migrations — resolva manualmente. Nada aplicado."
fi
PENDENTES="$(printf '%s' "$MIGRATE_STATUS" | sed -n '/have not yet been applied/,/^[[:space:]]*$/p' | grep -E '^[0-9]{14}_[A-Za-z0-9_]+$' || true)"

if [ -z "$PENDENTES" ]; then
  printf '%s' "$MIGRATE_STATUS" | grep -qi 'up to date' \
    || { rollback_image_only; fail "não foi possível confirmar o estado das migrations — deploy abortado por segurança"; }
  info "schema em dia — nenhuma migration a aplicar"
else
  # Banco sem baseline (criado por db push, sem _prisma_migrations): a
  # migration inicial apareceria pendente e tentaria recriar tudo.
  if printf '%s\n' "$PENDENTES" | grep -q '_initial$'; then
    rollback_image_only
    fail "a migration inicial aparece PENDENTE — o banco de produção não tem baseline em _prisma_migrations. Veja docs/DEPLOY-VPS.md (baseline). Nada aplicado."
  fi
  log "6b/12  Auditando $(printf '%s\n' "$PENDENTES" | wc -l | tr -d ' ') migration(s) pendente(s)"
  REPROVADAS=""
  while IFS= read -r m; do
    [ -n "$m" ] || continue
    ARQ="prisma/migrations/$m/migration.sql"
    if [ ! -f "$ARQ" ]; then REPROVADAS="$REPROVADAS\n    $m — não existe neste commit"; continue; fi
    CORPO="$(sed 's/--.*$//' "$ARQ")"   # comentários fora (vários dizem "NAO contem DROP")
    if   printf '%s' "$CORPO" | grep -qiE '\bDROP[[:space:]]+(TABLE|COLUMN|DATABASE|SCHEMA|TYPE)\b'; then REPROVADAS="$REPROVADAS\n    $m — contém DROP"
    elif printf '%s' "$CORPO" | grep -qiE '\bTRUNCATE\b';                                      then REPROVADAS="$REPROVADAS\n    $m — contém TRUNCATE"
    elif printf '%s' "$CORPO" | grep -qiE '\bDELETE[[:space:]]+FROM\b';                        then REPROVADAS="$REPROVADAS\n    $m — contém DELETE FROM"
    elif printf '%s' "$CORPO" | grep -qiE 'ALTER[[:space:]]+COLUMN.*(SET[[:space:]]+NOT[[:space:]]+NULL|TYPE[[:space:]])'; then REPROVADAS="$REPROVADAS\n    $m — altera coluna existente (tipo/NOT NULL)"
    else info "aprovada  $m"; fi
  done <<< "$PENDENTES"
  if [ -n "$REPROVADAS" ]; then
    printf "    REPROVADAS:%b\n" "$REPROVADAS"
    rollback_image_only
    fail "migration pendente reprovada na auditoria — NENHUMA aplicada, produção intacta. Aplicação manual exige revisão humana."
  fi

  log "6c/12  prisma migrate deploy (backup do banco já feito: $BACKUP_DIR/database.dump)"
  set +e; SAIDA="$(dc --profile migrate run --rm -T migrate migrate deploy "$SCHEMA_ARG" 2>&1)"; RC=$?; set -e
  printf '%s\n' "$SAIDA" | redact | sed -e '/^[[:space:]]*$/d' -e 's/^/    /'
  if [ "$RC" -ne 0 ]; then
    rollback_image_only
    fail "migrate deploy falhou — container atual não foi tocado. Avalie restaurar $BACKUP_DIR/database.dump (ver docs/DEPLOY-VPS.md)."
  fi
  migrate_status
  printf '%s' "$MIGRATE_STATUS" | grep -qi 'up to date' || { rollback_image_only; fail "após migrate deploy o schema não está em dia"; }
  info "migrations aplicadas; schema em dia"
fi

# ---------------------------------------------------------------------------
# 7. Uploads: volume externo; na primeira adoção copia (nunca move) os
# arquivos do container legado. A cópia também fica no backup.
# ---------------------------------------------------------------------------
log "7/12  Uploads ($UPLOADS_VOLUME)"
docker volume inspect "$UPLOADS_VOLUME" >/dev/null 2>&1 || { docker volume create "$UPLOADS_VOLUME" >/dev/null; info "volume $UPLOADS_VOLUME criado"; }
VOL_FILES="$(docker run --rm --user 0 --entrypoint sh -v "$UPLOADS_VOLUME:/data" "$IMAGE" -c "find /data -type f ! -name .gitkeep | wc -l" | tr -d '[:space:]' || true)"
[ -n "$VOL_FILES" ] || { rollback_image_only; fail "não foi possível inspecionar o volume $UPLOADS_VOLUME — container atual intacto"; }
info "arquivos no volume: $VOL_FILES"
if [ "$VOL_FILES" = "0" ]; then
  for c in $LEGACY_CONTAINERS; do
    docker inspect "$c" >/dev/null 2>&1 || continue
    is_ours "$c" && continue
    mkdir -p "$BACKUP_DIR/uploads-$c"
    if docker cp "$c:/app/public/uploads/." "$BACKUP_DIR/uploads-$c/" 2>/dev/null; then
      N="$(find "$BACKUP_DIR/uploads-$c" -type f ! -name .gitkeep | wc -l | tr -d ' ')"
      info "container legado $c: $N arquivo(s) em /app/public/uploads (cópia salva no backup)"
      if [ "$N" -gt 0 ]; then
        chmod -R a+rX "$BACKUP_DIR/uploads-$c"
        docker run --rm --user 0 --entrypoint sh -v "$UPLOADS_VOLUME:/data" -v "$BACKUP_DIR/uploads-$c:/src:ro" "$IMAGE" \
          -c 'cp -a /src/. /data/ && chown -R 1001:1001 /data' || fail "cópia de uploads para o volume falhou — container atual intacto"
        info "uploads copiados para $UPLOADS_VOLUME"
      fi
    else
      info "container legado $c sem /app/public/uploads"
    fi
  done
fi

# ---------------------------------------------------------------------------
rollback() {
  printf '\n\033[33m>>> ROLLBACK\033[0m\n'
  [ -n "$PREVIOUS_IMAGE_ID" ] && docker tag "$PREVIOUS_IMAGE_ID" "$IMAGE" || true
  restore_source
  if [ -n "$PARKED" ]; then
    docker rm -f "$APP_CONTAINER" >/dev/null 2>&1 || true
    for par in $PARKED; do
      orig="${par%%:*}"; parked="${par#*:}"
      docker rename "$parked" "$orig" && docker start "$orig" >/dev/null && info "container legado restaurado: $orig" || info "FALHA ao restaurar $orig (está como $parked)"
    done
  elif [ -n "$PREVIOUS_IMAGE_ID" ]; then
    cd "$SOURCE_DIR" && dc up -d --no-deps "$APP_SERVICE" || true
    info "imagem anterior reativada"
  fi
  info "banco, uploads e backup preservados. Backup: $BACKUP_DIR"
}

# ---------------------------------------------------------------------------
# 8. Containers legados (criados fora desta stack): parar e renomear.
# ---------------------------------------------------------------------------
log "8/12  Containers existentes"
for c in $LEGACY_CONTAINERS; do
  docker inspect "$c" >/dev/null 2>&1 || continue
  if is_ours "$c"; then info "$c pertence a esta stack — será recriado pelo compose"; continue; fi
  info "container legado $c (projeto '$(label "$c" com.docker.compose.project)') — parando e renomeando (não é apagado)"
  docker stop "$c" >/dev/null || fail "não foi possível parar $c"
  docker rename "$c" "${c}_legacy_$STAMP" || { docker start "$c" >/dev/null || true; fail "não foi possível renomear $c"; }
  PARKED="$PARKED $c:${c}_legacy_$STAMP"
done

log "9/12  Subindo $APP_CONTAINER"
dc up -d --no-deps "$APP_SERVICE" || { rollback; fail "não foi possível subir o container"; }

# ---------------------------------------------------------------------------
log "10/12  Healthcheck (até ${HEALTH_TIMEOUT}s)"
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
log "11/12  Smoke tests"
smoke_fail=0
check() {
  if printf '%s' "$3" | grep -qE "^($2)$"; then printf '    OK    %-40s %s\n' "$1" "$3"
  else printf '    FALHA %-40s obtido=%s esperado=%s\n' "$1" "$3" "$2"; smoke_fail=1; fi
}
interno() {
  docker exec "$APP_CONTAINER" node -e "fetch('http://127.0.0.1:3000$1').then(r=>console.log(r.status)).catch(()=>console.log('000'))" 2>/dev/null | tr -d '[:space:]'
}
check "interno /api/health" "200" "$(interno /api/health)"
check "interno /"           "200" "$(interno /)"
check "interno /api/tasks (consulta ao banco)" "200" "$(interno /api/tasks)"
PUB="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL/api/health" 2>/dev/null || true)"
if [ -z "$PUB" ] || [ "$PUB" = "000" ]; then
  info "AVISO: $PUBLIC_URL sem resposta de dentro da VPS (DNS/hairpin) — valide pelo navegador"
else
  check "público $PUBLIC_URL/api/health" "200" "$PUB"
fi
if [ "$smoke_fail" -ne 0 ]; then
  docker logs --tail 60 "$APP_CONTAINER" 2>&1 | redact | sed 's/^/    /' || true
  rollback
  fail "smoke test falhou"
fi

# ---------------------------------------------------------------------------
log "12/12  Registrando commit implantado"
echo "$DEPLOY_SHA" > "$APP_DIR/DEPLOYED_COMMIT"
info "DEPLOYED_COMMIT = $(cat "$APP_DIR/DEPLOYED_COMMIT")"
[ -n "$PARKED" ] && info "containers legados parados e preservados:$PARKED (remova manualmente após validar)"

docker images --format '{{.Repository}}:{{.Tag}}' \
  | grep '^njassistantoffice:rollback_' | sort -r | tail -n +4 \
  | xargs -r -n1 docker rmi >/dev/null 2>&1 || true

printf '\n\033[32mDeploy de produção concluído — %s\033[0m\n' "$DEPLOY_SHA"
printf 'Backup: %s\n' "$BACKUP_DIR"
exit 0
