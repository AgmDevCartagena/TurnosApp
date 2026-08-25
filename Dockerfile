# Dockerfile para el Backend Node.js
FROM node:20-alpine

# Dependencias del sistema necesarias para Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar manifiesto de dependencias
COPY backend/package.json ./

# Instalar dependencias de producción con npm
# (npm ejecuta postinstall por defecto, necesario para que Prisma genere sus binarios)
RUN npm install --no-package-lock

# Copiar el código del backend (incluye prisma/schema.prisma)
COPY backend/ ./

# Generar Prisma Client (no requiere conexión a BD)
RUN npx prisma generate

# Hacer ejecutable el script de entrada
RUN chmod +x docker-entrypoint.sh

# Crear directorios necesarios
RUN mkdir -p ./public/lib ./uploads/empresas/logos

# Copiar bundle tsParticles al directorio estático (evita servir desde node_modules)
RUN cp node_modules/tsparticles-slim/tsparticles.slim.bundle.min.js ./public/lib/

# Copiar los builds de React (estos se construyen antes de hacer docker build)
COPY frontend/nomina-build/ ./public/nomina-build/
COPY frontend/turnos-build/ ./public/turnos-build/

# Copiar páginas HTML estáticas
COPY frontend/login.html ./public/
COPY frontend/dashboard.html ./public/
COPY frontend/usuarios.html ./public/
COPY frontend/empresas.html ./public/
COPY frontend/areas.html ./public/
COPY frontend/nomina.html ./public/
COPY frontend/transporte.html ./public/
COPY frontend/ia.html ./public/
COPY frontend/index.html ./public/

# Exponer el puerto
EXPOSE 3001

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

# Comando para iniciar la aplicación (usa el script de entrada)
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
