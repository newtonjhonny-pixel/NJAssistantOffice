#!/bin/bash
# ============================================================
# NJ Assistant Office — Validação Final de Deploy
# Executar na VPS após todas as fases anteriores
# ============================================================

DOMAIN="assistant.nevion.com.br"
CONTAINER="njassistantoffice"
DB_NAME="njassistantoffice_prod"
DB_USER="njassistantoffice_user"
LOCAL_PORT=3010
PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠️  $1"; }

echo "======================================================"
echo "  NJ Assistant Office — Validação Final"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

# ── 1. Container ─────────────────────────────────────────────
echo ""
echo "[ 1 ] Container Docker"

STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null)
if [ "$STATUS" = "running" ]; then
  ok "Container '$CONTAINER' está running"
else
  fail "Container '$CONTAINER' — status: ${STATUS:-não encontrado}"
fi

HEALTH=$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null)
case "$HEALTH" in
  healthy)   ok "Healthcheck: healthy" ;;
  starting)  warn "Healthcheck: ainda iniciando (aguarde 60s)" ;;
  unhealthy) fail "Healthcheck: unhealthy — verifique logs" ;;
  *)         warn "Healthcheck: $HEALTH" ;;
esac

# ── 2. Banco de dados ────────────────────────────────────────
echo ""
echo "[ 2 ] Banco de dados PostgreSQL"

if psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
  ok "Conexão com '$DB_NAME' OK"

  TABLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
  if [ "$TABLE_COUNT" -ge 19 ]; then
    ok "Tabelas criadas: $TABLE_COUNT (esperado ≥ 19)"
  else
    fail "Tabelas insuficientes: $TABLE_COUNT (esperado ≥ 19)"
  fi

  MIGRATION=$(psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;" 2>/dev/null || echo "0")
  if [ "$MIGRATION" -ge 1 ]; then
    ok "Migrations aplicadas: $MIGRATION"
  else
    fail "Nenhuma migration aplicada — execute: docker exec $CONTAINER npx prisma migrate deploy"
  fi
else
  fail "Não foi possível conectar ao banco '$DB_NAME' como '$DB_USER'"
fi

# ── 3. API local ──────────────────────────────────────────────
echo ""
echo "[ 3 ] API local (porta $LOCAL_PORT)"

LOCAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$LOCAL_PORT/api/health" 2>/dev/null)
if [ "$LOCAL_STATUS" = "200" ]; then
  ok "GET /api/health → $LOCAL_STATUS"
else
  fail "GET /api/health → $LOCAL_STATUS (esperado 200)"
fi

# ── 4. DNS ────────────────────────────────────────────────────
echo ""
echo "[ 4 ] DNS"

DNS_IP=$(dig +short "$DOMAIN" @8.8.8.8 2>/dev/null | head -1)
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

if [ -n "$DNS_IP" ]; then
  ok "$DOMAIN → $DNS_IP"
  if [ "$DNS_IP" = "$VPS_IP" ]; then
    ok "IP bate com a VPS ($VPS_IP)"
  else
    warn "IP da VPS: $VPS_IP — DNS aponta para: $DNS_IP"
  fi
else
  fail "DNS não resolveu $DOMAIN"
fi

# ── 5. HTTPS público ──────────────────────────────────────────
echo ""
echo "[ 5 ] HTTPS público"

HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 15 "https://$DOMAIN/api/health" 2>/dev/null)

if [ "$HTTPS_STATUS" = "200" ]; then
  ok "https://$DOMAIN/api/health → $HTTPS_STATUS"
else
  fail "https://$DOMAIN/api/health → $HTTPS_STATUS (esperado 200)"
fi

SSL_EXPIRY=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$SSL_EXPIRY" ]; then
  ok "Certificado SSL válido até: $SSL_EXPIRY"
else
  warn "Não foi possível verificar SSL (DNS pode ainda estar propagando)"
fi

# ── 6. Rede Docker ────────────────────────────────────────────
echo ""
echo "[ 6 ] Rede Docker"

if docker network inspect nevion_network &>/dev/null; then
  ok "Rede 'nevion_network' existe"
  IN_NETWORK=$(docker inspect "$CONTAINER" \
    --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null)
  if echo "$IN_NETWORK" | grep -q "nevion_network"; then
    ok "Container conectado à nevion_network"
  else
    fail "Container NÃO está na nevion_network"
  fi
else
  fail "Rede 'nevion_network' não encontrada"
fi

# ── Sumário ───────────────────────────────────────────────────
echo ""
echo "======================================================"
echo "  RESULTADO: $PASS OK  /  $FAIL FALHA(S)"
echo "======================================================"

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "  🎉 Deploy validado com sucesso!"
  echo "  URL: https://$DOMAIN"
else
  echo ""
  echo "  Corrija as falhas acima e rode novamente."
  exit 1
fi
