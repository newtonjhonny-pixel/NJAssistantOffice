#!/bin/bash
# ============================================================
# NJ Assistant Office — Configuração Nginx Proxy Manager via API
# Executar na VPS após DNS propagado e container rodando
# Uso: bash 05-npm-setup.sh <NPM_ADMIN_EMAIL> <NPM_ADMIN_PASSWORD>
# ============================================================
set -e

NPM_URL="http://localhost:81"
NPM_EMAIL="${1:-admin@example.com}"
NPM_PASSWORD="${2:-}"
DOMAIN="assistant.nevion.com.br"
FORWARD_PORT=3010
LETSENCRYPT_EMAIL="newtonjhonny@gmail.com"

if [ -z "$NPM_PASSWORD" ]; then
  echo "Uso: bash 05-npm-setup.sh <email> <senha>"
  exit 1
fi

echo "======================================================"
echo "  Nginx Proxy Manager — Configurando $DOMAIN"
echo "======================================================"

# 1. Autenticar e obter token
echo "[1/4] Autenticando no NPM..."
TOKEN=$(curl -s -X POST "$NPM_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$NPM_EMAIL\",\"secret\":\"$NPM_PASSWORD\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Falha na autenticação. Verifique email/senha do NPM."
  exit 1
fi
echo "  ✅ Token obtido"

# 2. Solicitar certificado SSL Let's Encrypt
echo "[2/4] Solicitando certificado SSL para $DOMAIN..."
CERT_RESPONSE=$(curl -s -X POST "$NPM_URL/api/nginx/certificates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"provider\": \"letsencrypt\",
    \"domain_names\": [\"$DOMAIN\"],
    \"meta\": {
      \"letsencrypt_email\": \"$LETSENCRYPT_EMAIL\",
      \"letsencrypt_agree\": true,
      \"dns_challenge\": false
    }
  }")

CERT_ID=$(echo "$CERT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$CERT_ID" ]; then
  echo "⚠️  Não foi possível criar certificado via API."
  echo "    Crie manualmente no NPM: SSL Certificates → Add → Let's Encrypt"
  echo "    Domínio: $DOMAIN | E-mail: $LETSENCRYPT_EMAIL"
  CERT_ID=0
else
  echo "  ✅ Certificado SSL criado (ID: $CERT_ID)"
fi

# 3. Criar proxy host
echo "[3/4] Criando proxy host..."
PROXY_RESPONSE=$(curl -s -X POST "$NPM_URL/api/nginx/proxy-hosts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"domain_names\": [\"$DOMAIN\"],
    \"forward_scheme\": \"http\",
    \"forward_host\": \"127.0.0.1\",
    \"forward_port\": $FORWARD_PORT,
    \"access_list_id\": 0,
    \"certificate_id\": $CERT_ID,
    \"ssl_forced\": true,
    \"hsts_enabled\": true,
    \"hsts_subdomains\": false,
    \"http2_support\": true,
    \"block_exploits\": true,
    \"caching_enabled\": false,
    \"allow_websocket_upgrade\": true,
    \"locations\": [],
    \"meta\": {\"letsencrypt_agree\": true, \"dns_challenge\": false},
    \"advanced_config\": \"\"
  }")

PROXY_ID=$(echo "$PROXY_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$PROXY_ID" ]; then
  echo "❌ Falha ao criar proxy host. Resposta NPM:"
  echo "$PROXY_RESPONSE"
  exit 1
fi

echo "  ✅ Proxy host criado (ID: $PROXY_ID)"

# 4. Verificar
echo "[4/4] Verificando acesso..."
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" 2>/dev/null || echo "000")

echo ""
echo "======================================================"
if [ "$HTTP_STATUS" = "200" ]; then
  echo "  ✅ Deploy completo!"
  echo "  URL: https://$DOMAIN"
  echo "  Health: $HTTP_STATUS OK"
else
  echo "  ⚠️  Proxy configurado. Health check retornou: $HTTP_STATUS"
  echo "     Aguarde o SSL propagar ou verifique os logs:"
  echo "     docker logs -f njassistantoffice"
fi
echo "======================================================"
