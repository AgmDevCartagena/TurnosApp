#!/bin/sh
# Script de entrada para Docker
# Inicializa la BD, migra contraseñas a bcrypt y arranca el servidor

echo "🚀 Iniciando Sistema de Gestión Empresarial..."
echo ""

# Garantizar que el directorio de logos exista (el volumen puede montarse vacío)
mkdir -p /app/uploads/empresas/logos

# Esperar a que MongoDB y PostgreSQL estén disponibles
echo "⏳ Esperando a que los servicios de BD estén disponibles..."
sleep 5

# Aplicar migraciones de PostgreSQL (idempotente)
echo "🐘 Aplicando migraciones de PostgreSQL..."
npx prisma migrate deploy

# Seed inicial de PostgreSQL (módulos base — idempotente)
echo "🌱 Inicializando datos base de PostgreSQL..."
node prisma/seed.js

# Inicialización de BD MongoDB (crea usuarios y empresa principal si no existen)
echo "🔧 Inicializando base de datos MongoDB..."
node init-db.js

# Migración de contraseñas a bcrypt (idempotente — omite las ya hasheadas)
echo "🔐 Migrando contraseñas a bcrypt (si hay en plaintext)..."
node scripts/hashPasswords.js

# Sincronizar datos MongoDB → PostgreSQL (idempotente: upsert seguro de re-ejecutar)
# Debe correr DESPUÉS de init-db para que existan los datos de Mongo a migrar
echo "🔄 Sincronizando datos MongoDB → PostgreSQL..."
node scripts/migrarMongoAPostgres.js

# Seed de áreas por empresa (idempotente — solo crea si no existen áreas)
echo "🏢 Inicializando áreas por empresa..."
node scripts/seedAreas.js

# Seed de parámetros y conceptos de nómina en MongoDB (idempotente)
echo "💰 Inicializando parámetros de nómina en MongoDB..."
node scripts/seedParametrosNomina.js

# Seed de parámetros y conceptos de nómina en PostgreSQL/Prisma (idempotente)
echo "💰 Inicializando parámetros de nómina en PostgreSQL..."
node scripts/seedParametrosNominaPrisma.js

# Iniciar el servidor principal
echo ""
echo "🌐 Iniciando servidor Node.js..."
exec node server.js
