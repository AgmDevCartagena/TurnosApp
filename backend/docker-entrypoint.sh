#!/bin/sh
# Script de entrada para Docker
# Inicializa la BD con el usuario admin y luego inicia el servidor

echo "🚀 Iniciando Sistema de Gestión Empresarial..."
echo ""

# Esperar a que MongoDB esté disponible
echo "⏳ Esperando a que MongoDB esté disponible..."
sleep 3

# Ejecutar script de inicialización de BD (crea usuario admin si no existe)
echo "🔧 Ejecutando inicialización de base de datos..."
node init-db.js

# Iniciar el servidor principal
echo ""
echo "🌐 Iniciando servidor Node.js..."
exec node server.js
