#!/bin/sh
# deploy.sh — Deploy controlado a producción
#
# Uso: sh scripts/deploy.sh
#
# PRERREQUISITOS:
#   1. .env.production existe con secretos reales
#   2. docker-compose.prod.yml existe
#   3. backup.sh corrió exitosamente
#   4. npm test pasó localmente
#
# NOTA: Este script NO hace backup — ejecutar backup.sh antes.

set -e

APP_URL="http://localhost:3001"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

echo "=============================="
echo " TurnosApp — Deploy a Producción"
echo "=============================="
echo ""
echo "Commit a desplegar:"
git log -1 --oneline
echo ""

# ── Validaciones pre-deploy ────────────────────────────────────────────────────
if [ ! -f ".env.production" ]; then
  echo "❌ No existe .env.production. Crear desde .env.production.example"
  exit 1
fi

if [ ! -f "docker-compose.prod.yml" ]; then
  echo "❌ No existe docker-compose.prod.yml"
  exit 1
fi

# Verificar que no hay secretos de ejemplo sin reemplazar
if grep -q "<CAMBIAR" .env.production 2>/dev/null; then
  echo "❌ .env.production tiene valores sin completar (<CAMBIAR...>)"
  exit 1
fi

echo "✅ Validaciones pre-deploy OK"
echo ""

# ── 1. Pull latest ─────────────────────────────────────────────────────────────
echo "📥 Descargando última versión..."
git fetch origin
echo "Rama actual: $(git branch --show-current)"

# ── 2. Build imagen ────────────────────────────────────────────────────────────
echo ""
echo "🔨 Construyendo imagen Docker..."
$COMPOSE build --no-cache app

# ── 3. Aplicar cambios ─────────────────────────────────────────────────────────
echo ""
echo "🔄 Levantando servicios..."
$COMPOSE up -d

# ── 4. Esperar healthcheck ────────────────────────────────────────────────────
echo ""
echo "⏳ Esperando que la app esté healthy (máx 90s)..."
RETRIES=0
MAX_RETRIES=9
until docker inspect --format='{{.State.Health.Status}}' turnos_app 2>/dev/null | grep -q "healthy"; do
  RETRIES=$((RETRIES + 1))
  if [ $RETRIES -ge $MAX_RETRIES ]; then
    echo "❌ App no alcanzó estado healthy después de 90s"
    echo "Últimos logs:"
    docker logs --tail=50 turnos_app
    exit 1
  fi
  echo "   Intento $RETRIES/$MAX_RETRIES — esperando 10s..."
  sleep 10
done
echo "✅ App healthy"

# ── 5. Smoke tests ────────────────────────────────────────────────────────────
echo ""
echo "🧪 Ejecutando smoke tests..."

check() {
  LABEL="$1"
  URL="$2"
  CODE=$(wget --server-response --spider "$URL" 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')
  if [ "$CODE" = "200" ] || [ "$CODE" = "302" ] || [ "$CODE" = "401" ]; then
    echo "  ✅ $LABEL ($CODE)"
  else
    echo "  ❌ $LABEL — HTTP $CODE"
    SMOKE_FAIL=1
  fi
}

SMOKE_FAIL=0
check "GET /login.html"               "${APP_URL}/login.html"
check "GET /api/auth/verificar-sesion" "${APP_URL}/api/auth/verificar-sesion"

if [ "$SMOKE_FAIL" = "1" ]; then
  echo ""
  echo "❌ Smoke tests fallaron. Revisar logs:"
  echo "   docker logs turnos_app"
  exit 1
fi

echo ""
echo "=============================="
echo " ✅ Deploy completado"
echo " Commit: $(git log -1 --oneline)"
echo " App: $APP_URL"
echo ""
echo "PRÓXIMOS PASOS MANUALES:"
echo "  1. Abrir $APP_URL/login.html y verificar login"
echo "  2. Verificar dashboard carga"
echo "  3. Verificar módulo transporte"
echo "  4. Verificar módulo turnos"
echo "  5. Verificar nómina"
echo "  6. Verificar selector de empresa (multiempresa)"
echo "=============================="
