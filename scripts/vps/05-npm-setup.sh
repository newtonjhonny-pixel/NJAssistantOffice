#!/bin/bash
# ============================================================
# NJ Assistant Office — Configuração Nginx Proxy Manager via API
# Executar APÓS DNS propagado e container rodando.
#
# O proxy aponta para o nome do container na rede Docker:
#   forward_host: njassistantoffice
#   forward_port: 3000  (porta interna, não a do host)
#
# NPM e o container devem estar na mesma rede Docker.
# ============================================================
set -e

NPM_URL="http://localhost:81"
DOMAIN="assistant.nevion.com.br"
FORWARD_CONTAINER="njassistantoffice"
FORWARD_PORT=3000          # porta INTERNA do container, não 3010
LETSENCRYPT_EMAIL="newtonjhonny@gmail.com"

echo "======================================================"
echo "  Nginx Proxy Manager — Configurando $DOMAIN"
echo "======================================================"

# ── Pré-verificação: NPM acessível ───────────────────────────
echo ""
echo "[PRÉ] Verificando NPM em $NPM_URL..."
NPM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$NPM_URL" 2>/dev/null || echo "000")
if [ "$NPM_STATUS" = "000" ]; then
  echo "  ❌ NPM não responde em $NPM_URL"
  echo "     Verifique se o container do NPM está rodando."
  exit 1
fi
echo "  ✅ NPM acessível (HTTP $NPM_STATUS)"

# ── Pré-verificação: container na mesma rede que o NPM ───────
echo ""
echo "[PRÉ] Verificando rede compartilhada entre NPM e app..."
CONTAINER_NETWORKS=$(docker inspect "$FORWARD_CONTAINER" \
  --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || echo "")
NPM_CONTAINER=$(docker ps --filter "name=nginx-proxy-manager" \
  --filter "name=npm" --format "{{.Names}}" 2>/dev/null | head -1)

if [ -n "$NPM_CONTAINER" ]; then
  NPM_NETWORKS=$(docker inspect "$NPM_CONTAINER" \
    --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || echo "")
  echo "  Container app ($FORWARD_CONTAINER) — redes: $CONTAINER_NETWORKS"
  echo "  Container NPM ($NPM_CONTAINER) — redes: $NPM_NETWORKS"
  echo ""
  echo "  ⚠️  Confirme visualmente que ambos compartilham ao menos uma rede."
  echo "     Se não, adicione o $FORWARD_CONTAINER à rede do NPM antes de continuar."
else
  echo "  ⚠️  Container do NPM não identificado automaticamente."
  echo "     Verifique manualmente: docker network inspect <rede> | grep -E 'njassistantoffice|npm'"
fi

echo ""
read -r -p "  Continuar mesmo assim? (s/N): " CONFIRM
if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
  echo "  Abortado. Corrija a rede e tente novamente."
  exit 0
fi

# ── Credenciais NPM via read -s (oculto) ─────────────────────
echo ""
echo "[1/4] Credenciais do Nginx Proxy Manager"
read -r -p "  E-mail NPM: " NPM_EMAIL
read -r -s -p "  Senha NPM:  " NPM_PASSWORD
echo ""

if [ -z "$NPM_EMAIL" ] || [ -z "$NPM_PASSWORD" ]; then
  echo "  ❌ E-mail e senha são obrigatórios."
  exit 1
fi

# ── Autenticar ────────────────────────────────────────────────
echo ""
echo "[1/4] Autenticando no NPM..."
AUTH_RESPONSE=$(curl -s -X POST "$NPM_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$NPM_EMAIL\",\"secret\":\"$NPM_PASSWORD\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "  ❌ Falha na autenticação. Verifique e-mail e senha."
  echo "     Resposta: $AUTH_RESPONSE"
  exit 1
fi
echo "  ✅ Autenticado com sucesso"

# ── Certificado SSL ───────────────────────────────────────────
echo ""
echo "[2/4] Solicitando certificado SSL Let's Encrypt para $DOMAIN..."
echo "      (Requer DNS propagado e porta 80 acessível externamente)"

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
  echo "  ⚠️  Certificado não criado via API."
  echo "     Erro: $(echo $CERT_RESPONSE | grep -o '"message":"[^"]*"' | head -1)"
  echo "     Crie manualmente: NPM → SSL Certificates → Add → Let's Encrypt"
  echo "     Domínio: $DOMAIN  |  E-mail: $LETSENCRYPT_EMAIL"
  CERT_ID=0
else
  echo "  ✅ Certificado SSL criado (ID: $CERT_ID)"
fi

# ── Proxy host ────────────────────────────────────────────────
echo ""
echo "[3/4] Criando proxy host..."
echo "      $DOMAIN → http://$FORWARD_CONTAINER:$FORWARD_PORT (rede Docker interna)"

PROXY_RESPONSE=$(curl -s -X POST "$NPM_URL/api/nginx/proxy-hosts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"domain_names\": [\"$DOMAIN\"],
    \"forward_scheme\": \"http\",
    \"forward_host\": \"$FORWARD_CONTAINER\",
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
  echo "  ❌ Falha ao criar proxy host."
  echo "     Erro: $(echo $PROXY_RESPONSE | grep -o '"message":"[^"]*"' | head -1)"
  echo "     Resposta completa: $PROXY_RESPONSE"
  exit 1
fi

echo "  ✅ Proxy host criado (ID: $PROXY_ID)"

# ── Verificação ───────────────────────────────────────────────
echo ""
echo "[4/4] Verificação de acesso HTTPS..."
sleep 5

HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 15 "https://$DOMAIN/api/health" 2>/dev/null || echo "000")

echo ""
echo "======================================================"
if [ "$HTTPS_STATUS" = "200" ]; then
  echo "  ✅ https://$DOMAIN responde 200 OK"
  echo "  Execute: bash 06-validate.sh para validação completa"
else
  echo "  ⚠️  https://$DOMAIN retornou: $HTTPS_STATUS"
  echo "     Aguarde propagação SSL (até 2 min) e tente:"
  echo "     curl -I https://$DOMAIN/api/health"
fi
echo "======================================================"
