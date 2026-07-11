#!/bin/sh
# rollback.sh — Rollback controlado de producción
#
# Uso: sh scripts/rollback.sh <commit_anterior> <timestamp_backup>
#
# Ejemplo:
#   sh scripts/rollback.sh 8f9788d 20260711_1020
#
# CRITERIOS para activar rollback:
#   - La app no levanta o healthcheck falla
#   - Errores 500 generalizados en producción
#   - Migración de BD falló o corrompió datos
#   - Login no funciona
#   - Multiempresa filtra datos incorrectos

set -e

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
TARGET_COMMIT="$1"
BACKUP_TS="$2"

if [ -z "$TARGET_COMMIT" ] || [ -z "$BACKUP_TS" ]; then
  echo "Uso: sh scripts/rollback.sh <commit_anterior> <timestamp_backup>"
  echo "Ejemplo: sh scripts/rollback.sh 8f9788d 20260711_1020"
  echo ""
  echo "Backups disponibles:"
  ls backups/ 2>/dev/null || echo "(ninguno)"
  exit 1
fi

echo "=============================="
echo " TurnosApp — ROLLBACK"
echo " Commit destino: $TARGET_COMMIT"
echo " Backup: $BACKUP_TS"
echo "=============================="
echo ""
echo "⚠️  ESTO VA A:"
echo "   1. Detener la app"
echo "   2. Restaurar PostgreSQL desde backup"
echo "   3. Restaurar MongoDB desde backup"
echo "   4. Volver al commit $TARGET_COMMIT"
echo "   5. Reconstruir y levantar la app"
echo ""
printf "¿Continuar? (escribir 'SI' para confirmar): "
read CONFIRM
if [ "$CONFIRM" != "SI" ]; then
  echo "Rollback cancelado."
  exit 0
fi

PG_BACKUP="backups/pg_${BACKUP_TS}.sql"
MONGO_BACKUP="backups/mongo_${BACKUP_TS}.archive"

# ── Validar backups ───────────────────────────────────────────────────────────
if [ ! -f "$PG_BACKUP" ]; then
  echo "❌ No se encontró backup PostgreSQL: $PG_BACKUP"
  exit 1
fi
if [ ! -f "$MONGO_BACKUP" ]; then
  echo "❌ No se encontró backup MongoDB: $MONGO_BACKUP"
  exit 1
fi

# ── 1. Detener app ────────────────────────────────────────────────────────────
echo ""
echo "🛑 Deteniendo app..."
$COMPOSE stop app

# ── 2. Restaurar PostgreSQL ───────────────────────────────────────────────────
echo ""
echo "🐘 Restaurando PostgreSQL desde $PG_BACKUP..."
# Terminar conexiones activas
docker exec turnos_postgres psql -U turnos_user -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='turnos_app_pg' AND pid <> pg_backend_pid();" 2>/dev/null || true
# Drop y recrear base
docker exec turnos_postgres psql -U turnos_user -d postgres \
  -c "DROP DATABASE IF EXISTS turnos_app_pg;"
docker exec turnos_postgres psql -U turnos_user -d postgres \
  -c "CREATE DATABASE turnos_app_pg;"
# Restaurar dump
docker exec -i turnos_postgres psql -U turnos_user -d turnos_app_pg < "$PG_BACKUP"
echo "✅ PostgreSQL restaurado"

# ── 3. Restaurar MongoDB ──────────────────────────────────────────────────────
echo ""
echo "🍃 Restaurando MongoDB desde $MONGO_BACKUP..."
docker cp "$MONGO_BACKUP" "turnos_mongodb:/tmp/restore.archive"
docker exec turnos_mongodb mongorestore --archive=/tmp/restore.archive --drop --quiet
docker exec turnos_mongodb rm -f /tmp/restore.archive
echo "✅ MongoDB restaurado"

# ── 4. Volver al commit anterior ─────────────────────────────────────────────
echo ""
echo "⏪ Volviendo a commit $TARGET_COMMIT..."
git checkout "$TARGET_COMMIT"
echo "✅ Commit: $(git log -1 --oneline)"

# ── 5. Rebuild y levantar ────────────────────────────────────────────────────
echo ""
echo "🔨 Reconstruyendo imagen..."
$COMPOSE build --no-cache app

echo ""
echo "🔄 Levantando servicios..."
$COMPOSE up -d

echo ""
echo "⏳ Esperando healthcheck..."
sleep 30
docker ps | grep turnos_app

echo ""
echo "=============================="
echo " ✅ Rollback completado"
echo " Commit activo: $(git log -1 --oneline)"
echo "=============================="
echo ""
echo "VERIFICAR MANUALMENTE:"
echo "  - Login funciona"
echo "  - Dashboard carga"
echo "  - Transporte carga"
echo "  - Nómina carga"
