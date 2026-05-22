#!/bin/sh
# Script de entrada para Docker
# Inicializa la BD, migra contraseñas a bcrypt y arranca el servidor

echo "🚀 Iniciando Sistema de Gestión Empresarial..."
echo ""

# Esperar a que MongoDB esté disponible
echo "⏳ Esperando a que MongoDB esté disponible..."
sleep 5

# Inicialización de BD (crea usuarios y empresa principal si no existen)
echo "🔧 Inicializando base de datos..."
node init-db.js

# Migración de contraseñas a bcrypt (idempotente — omite las ya hasheadas)
echo "🔐 Migrando contraseñas a bcrypt (si hay en plaintext)..."
node scripts/hashPasswords.js

# Iniciar el servidor principal
echo ""
echo "🌐 Iniciando servidor Node.js..."
exec node server.js
