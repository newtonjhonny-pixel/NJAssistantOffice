#!/bin/bash
# ============================================================
# NJ Assistant Office — Verificação de DNS
# Executar APÓS configurar o registro A no painel Hostinger
# ============================================================

DOMAIN="assistant.nevion.com.br"
EXPECTED_IP="${1:-}"   # passe o IP da VPS como argumento

echo "======================================================"
echo "  DNS Check: $DOMAIN"
echo "======================================================"

# Resolve o domínio via DNS público
RESOLVED=$(dig +short "$DOMAIN" @8.8.8.8 2>/dev/null || nslookup "$DOMAIN" 8.8.8.8 | awk '/Address/ && !/8.8.8.8/{print $2}' | tail -1)

if [ -z "$RESOLVED" ]; then
  echo "❌ DNS ainda não propagou. Aguarde e tente novamente."
  exit 1
fi

echo "  Resolvido para: $RESOLVED"

if [ -n "$EXPECTED_IP" ] && [ "$RESOLVED" != "$EXPECTED_IP" ]; then
  echo "⚠️  IP esperado: $EXPECTED_IP — Ainda propagando ou registro incorreto."
  exit 1
fi

echo "✅ DNS OK: $DOMAIN → $RESOLVED"
echo ""
echo "Registro A necessário no painel Hostinger:"
echo "  Tipo:  A"
echo "  Nome:  assistant"
echo "  Valor: IP_DA_VPS"
echo "  TTL:   300"
