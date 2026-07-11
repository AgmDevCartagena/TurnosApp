#!/bin/sh
# backup.sh — Backup completo antes de cada deploy
# Uso: sh scripts/backup.sh
#
# Genera:
#   backups/pg_YYYYMMDD_HHMM.sql
#   backups/mongo_YYYYMMDD_HHMM.archive
#   backups/uploads_YYYYMMDD_HHMM.tar.gz

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M")
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

echo "=============================="
echo " TurnosApp — Backup $TIMESTAMP"
echo "=============================="

# ── 1. PostgreSQL ──────────────────────────────────────────────────────────────
PG_FILE="$BACKUP_DIR/pg_${TIMESTAMP}.sql"
echo ""
echo "🐘 Backup PostgreSQL → $PG_FILE"
docker exec turnos_postgres pg_dump -U turnos_user turnos_app_pg > "$PG_FILE"
echo "   Tamaño: $(wc -c < "$PG_FILE") bytes"
if [ ! -s "$PG_FILE" ]; then
  echo "❌ ERROR: El backup de PostgreSQL está vacío. Abortando."
  exit 1
fi
echo "✅ PostgreSQL backup OK"

# ── 2. MongoDB ────────────────────────────────────────────────────────────────
MONGO_FILE="$BACKUP_DIR/mongo_${TIMESTAMP}.archive"
echo ""
echo "🍃 Backup MongoDB → $MONGO_FILE"
docker exec turnos_mongodb mongodump --archive="/tmp/mongo_${TIMESTAMP}.archive" --quiet
docker cp "turnos_mongodb:/tmp/mongo_${TIMESTAMP}.archive" "$MONGO_FILE"
docker exec turnos_mongodb rm -f "/tmp/mongo_${TIMESTAMP}.archive"
echo "   Tamaño: $(wc -c < "$MONGO_FILE") bytes"
if [ ! -s "$MONGO_FILE" ]; then
  echo "❌ ERROR: El backup de MongoDB está vacío. Abortando."
  exit 1
fi
echo "✅ MongoDB backup OK"

# ── 3. Uploads ────────────────────────────────────────────────────────────────
UPLOADS_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
echo ""
echo "📁 Backup uploads → $UPLOADS_FILE"
if [ -d "backend/uploads" ]; then
  tar -czf "$UPLOADS_FILE" backend/uploads/
  echo "   Tamaño: $(wc -c < "$UPLOADS_FILE") bytes"
  echo "✅ Uploads backup OK"
else
  echo "⚠️  Directorio backend/uploads no encontrado. Omitiendo."
fi

echo ""
echo "=============================="
echo " Backups completados en: $BACKUP_DIR/"
ls -lh "$BACKUP_DIR/"*"${TIMESTAMP}"* 2>/dev/null
echo ""
echo "COMMIT actual:"
git log -1 --oneline
echo ""
echo "➡️  Puedes continuar con el deploy."
echo "=============================="
