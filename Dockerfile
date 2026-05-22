# Dockerfile para el Backend Node.js
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY backend/package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el código del backend
COPY backend/ ./

# Hacer ejecutable el script de entrada
RUN chmod +x docker-entrypoint.sh

# Crear directorio public si no existe
RUN mkdir -p ./public

# Copiar los builds de React (estos se construyen antes de hacer docker build)
COPY frontend/nomina-build/ ./public/nomina-build/
COPY frontend/turnos-build/ ./public/turnos-build/

# Copiar páginas HTML estáticas
COPY frontend/login.html ./public/
COPY frontend/dashboard.html ./public/
COPY frontend/usuarios.html ./public/
COPY frontend/empresas.html ./public/
COPY frontend/index.html ./public/

# Exponer el puerto
EXPOSE 3001

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

# Comando para iniciar la aplicación (usa el script de entrada)
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
