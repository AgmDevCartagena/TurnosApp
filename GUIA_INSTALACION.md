# 🚀 Guía de Instalación, Configuración y Primeros Pasos

**Versión:** 2.0.0  
**Para:** INNOVAR

---

## 📑 Tabla de Contenidos

1. [Requisitos del Sistema](#requisitos-del-sistema)
2. [Instalación Local](#instalación-local)
3. [Configuración](#configuración)
4. [Ejecución](#ejecución)
5. [Primeros Pasos](#primeros-pasos)
6. [Instalación con Docker](#instalación-con-docker)
7. [Troubleshooting](#troubleshooting)

---

## 💻 Requisitos del Sistema

### Requisitos Mínimos

```
OPCIÓN 1: Ejecución Local
├─ Node.js 14+ (v18 recomendado)
├─ MongoDB 4.4+ (local o Atlas)
└─ npm 6+

OPCIÓN 2: Con Docker (Recomendado Producción)
├─ Docker 20.10+
├─ Docker Compose 2.0+
└─ 4GB RAM disponibles
```

### Verificar Versiones Instaladas

```bash
# Node.js y npm
node --version          # Debe ser v14+
npm --version          # Debe ser 6+

# MongoDB (si es local)
mongod --version       # Debe ser 4.4+

# Docker (si lo usarás)
docker --version
docker-compose --version
```

---

## 🆕 Instalación Local

### Paso 1: Descargar el Proyecto

```bash
cd tu_directorio_trabajo
# OPCIÓN A: Clonar desde Git (si tienes repositorio)
git clone <URL_REPOSITORIO> turnos_app
cd turnos_app

# OPCIÓN B: Extraer ZIP (si descargaste)
# unzip turnos_app.zip
# cd turnos_app
```

---

### Paso 2: Instalar Dependencias del Backend

```bash
cd backend
npm install
```

**Si tienes errores:**
```bash
# Limpiar caché de npm
npm cache clean --force

# Reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

### Paso 3: Instalar Dependencias del Frontend (Opcional)

Si quieres modificar React apps:

```bash
# Módulo Turnos
cd ../frontend/turnos-react
npm install

# O Módulo Nómina
cd ../frontend/nomina-react
npm install
```

---

## ⚙️ Configuración

### Paso 1: Configurar Variables de Entorno

**Crear archivo:** `backend/.env`

```env
# ════════════════════════════════════
# CONFIGURACIÓN LOCAL
# ════════════════════════════════════

# Servidor
PORT=3001
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/turnos_app
# O usar MongoDB Atlas (cloud):
# MONGO_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/turnos_app

# Sesiones
SESSION_SECRET=tu_secreto_muy_seguro_aqui_123

# Aplicación
APP_NAME=Sistema de Gestión Empresarial
APP_VERSION=2.0.0
```

### Paso 2: Configurar MongoDB

#### **OPCIÓN A: MongoDB Local**

```bash
# En Windows
mongod

# En macOS/Linux
mongod --dbpath /usr/local/var/mongodb
```

Verifica que esté corriendo:
```bash
mongo
# Si ves el prompt ">" está listo

# Crear usuario admin (opcional)
use admin
db.createUser({
  user: "admin",
  pwd: "tu_contraseña",
  roles: ["root"]
})
exit
```

#### **OPCIÓN B: MongoDB Atlas (Cloud)**

1. Ir a https://www.mongodb.com/cloud/atlas
2. Crear cuenta gratis
3. Crear cluster (free tier)
4. Obtener connection string:
   ```
   mongodb+srv://usuario:contraseña@cluster0.xxxxx.mongodb.net/turnos_app
   ```
5. Copiar en `backend/.env` en `MONGO_URI`

---

## ▶️ Ejecución

### Opción A: Modo Desarrollo

```bash
cd backend
npm start

# O con nodemon (recarga automática)
npm run dev
```

**Salida esperada:**
```
✅ MongoDB conectado
🚀 Servidor ejecutando en puerto 3001
```

**Acceder a:**
- 🌐 http://localhost:3001 → Login
- 📅 http://localhost:3001/turnos → Módulo Turnos
- 💰 http://localhost:3001/nomina → Módulo Nómina

---

### Opción B: Modo Producción

```bash
cd backend
# Sin nodemon, con optimizaciones
node server.js

# Con compilación mínima
npm start
```

---

## 🎯 Primeros Pasos en la Aplicación

### 1️⃣ Crear Usuario Administrador

Al **primera vez**, necesitas crear el admin:

**Opción A: Manualmente (desarrollo)**

```javascript
// Abrir Node.js REPL en backend/
node

> const mongoose = require('mongoose');
> const Usuario = require('./models/Usuario');
> mongoose.connect('mongodb://localhost:27017/turnos_app');

> Usuario.create({
    username: 'admin',
    password: 'admin123',  // ⚠️ Cambiar en producción
    nombre: 'Administrador',
    rol: 'admin',
    modulosPermitidos: ['turnos', 'nomina'],
    areasPermitidas: ['all']
  });

> // Aparecerá: { _id: ..., username: 'admin', ... }
> process.exit();
```

**Opción B: Script (si existe)**

```bash
cd backend
node scripts/crearUsuarioAdmin.js
```

---

### 2️⃣ Primera vez: Login

1. Acceder a http://localhost:3001
2. Usuario: `admin`
3. Contraseña: `admin123` (cambiar después)
4. Presionar **Login**

---

### 3️⃣ Crear Empleados

#### **Opción A: Individual**

1. Usuario admin → Módulo Turnos
2. Click en **"Gestion de Empleados"**
3. Btn **"Crear Nuevo"**
4. Rellenar:
   - Documento: `1234567` (único)
   - Nombre: `Juan Pérez`
   - Área: `TAQUILLEROS`
   - Cargo: `Operador`
   - Salario: `1500000`
5. Guardar

#### **Opción B: Importar CSV**

**Formato de archivo: `empleados.csv`**

```csv
documento,nombre,area,cargo,salario
80234567,JUAN PÉREZ,TAQUILLEROS,OPERADOR,1500000
80234568,MARÍA GARCÍA,ADMINISTRATIVOS,AUXILIAR,1200000
80234569,CARLOS López,CONDUCTORES,CONDUCTOR,1800000
```

**Importar:**

1. Módulo Turnos → Gestion Empleados
2. Click **"Cargar CSV"**
3. Seleccionar archivo
4. Click **"Importar"**
5. Sistema validará y guardará

---

### 4️⃣ Asignar el Primer Turno

#### **Para Taquilleros (Avanzado)**

1. Módulo Turnos → **"Asignación Turnos"**
2. Seleccionar Empleado: `JUAN PÉREZ`
3. Seleccionar Período:
   - Desde: `16 de noviembre de 2025`
   - Hasta: `30 de noviembre de 2025`
4. Seleccionar Tabla Descanso: `A`
5. Seleccionar Subárea: `MEGABUS`
6. Seleccionar Tipo Turno: `T100`
7. Click **"GENERAR CRONOGRAMA"**
8. Ver vista previa (días generados)
9. Click **"GUARDAR"**

**Resultado:** Se crean 15 días de turnos automáticos

---

#### **Para Administrativos (Automático)**

1. Módulo Turnos → **"Asignación Por Áreas"**
2. Seleccionar Área: `ADMINISTRATIVOS`
3. Seleccionar Período: (ej: Nov 1-30)
4. Click **"GENERAR AUTOMÁTICO"**
5. Click **"GUARDAR"**

**Resultado:** Turnos 7am-5pm automático lunes-viernes

---

### 5️⃣ Ver Turnos Asignados

1. Módulo Turnos → **"Consulta Turnos"**
2. Buscar empleado: `JUAN PÉREZ`
3. Click en empleado
4. Ver calendario con turnos asignados
5. Cada día muestra:
   - Horario (14:30-23:30)
   - Si es festivo
   - Si es descanso

---

### 6️⃣ Calcular Nómina

1. Módulo Nómina → **"Cálculo Individual"**
2. Seleccionar Empleado: `JUAN PÉREZ`
3. Seleccionar Mes: `Noviembre`
4. Seleccionar Año: `2025`
5. Click **"CALCULAR"**

**Se mostrará:**
```
JUAN PÉREZ - Nómina Noviembre 2025

Horas Normales: 120 hrs × $7,750 = $930,000
Recargo Nocturno: 30 hrs × $10,462 = $313,860
Recargo Dominical: 10 hrs × $13,562 = $135,620

Devengado: $1,379,480
Desct. Salud: -$55,179
Desct. Pensión: -$55,179
Auxilio Trp: +$140,000

NETO A PAGAR: $1,409,122
```

---

### 7️⃣ Descargar Reportes

**Desde Nómina:**

1. Junto al cálculo, botones:
   - 📄 **PDF** → Descarga desprendible
   - 📊 **EXCEL** → Abre en Excel

**Desde Turnos:**

1. Consulta → Empleado → Click 📊
   - Descarga cronograma completo

---

## 🐳 Instalación con Docker

### Requisitos

```
Docker 20.10+
Docker Compose 2.0+
```

### Step 1: Build y Run

```bash
cd turnos_app

# Construir imágenes y levantar contenedores
docker-compose up --build

# Si ya están construidas (más rápido)
docker-compose up
```

**Salida esperada:**
```
turnos_api | ✅ MongoDB conectado
turnos_api | 🚀 Servidor ejecutando en puerto 3001
```

### Step 2: Acceder

```
🌐 http://localhost:3001
📅 http://localhost:3001/turnos
💰 http://localhost:3001/nomina
```

### Step 3: Ver Logs

```bash
# Logs en vivo
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f app
docker-compose logs -f mongodb
```

### Step 4: Detener

```bash
docker-compose down

# O con PowerShell en Windows
.\docker-stop.ps1
```

---

## 🔧 Troubleshooting

### Problema: "MongoDB está en puerto 27017"

```
Error: EADDRINUSE :::27017
```

**Solución:**

```bash
# Matar proceso en puerto 27017
lsof -ti:27017 | xargs kill -9  # macOS/Linux

# Windows (como administrador)
netstat -ano | findstr :27017
taskkill /PID [PID] /F
```

---

### Problema: "Port 3001 en uso"

```
Error: listen EADDRINUSE :::3001
```

**Solución:**

```bash
# Cambiar en backend/.env
PORT=3002  # Usar otro puerto

# O matar proceso:
lsof -ti:3001 | xargs kill -9    # macOS/Linux
netstat -ano | findstr :3001     # Windows
```

---

### Problema: "Cannot find module"

```
Error: Cannot find module 'express'
```

**Solución:**

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

---

### Problema: "MongoDB connection refused"

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solución:**

```bash
# Verificar MongoDB está corriendo
mongod --version

# Si no está instalado:
# macOS: brew install mongodb-community
# Windows: Descargar desde mongodb.com
# Linux: apt-get install mongodb

# Iniciar MongoDB
mongod
```

---

### Problema: "Sesión no válida"

Usuario login falla o sesión se pierde

**Solución:**

```env
# Verificar en backend/.env:
SESSION_SECRET=algo_único_y_seguro  # Cambiar de default

# Aumentar duración sesión:
# En backend/server.js (línea ~25)
maxAge: 24 * 60 * 60 * 1000  // 1 día
```

---

### Problema: "CORS error"

```
Access-Control-Allow-Origin not allowed
```

**Solución:**

Verificar `backend/server.js` línea 15:
```javascript
app.use(cors());  // ✅ Debe estar habilitado
```

---

### Problema: "React app no carga en navegador"

Acceso a `/turnos` o `/nomina` en blanco

**Solución:**

```bash
# Reconstruir React apps
cd frontend/turnos-react
npm run build

cd ../nomina-react
npm run build

# Luego reiniciar backend
cd ../../backend
npm start
```

---

## ✅ Verificación Final

Si todo está bien, deberías ver:

```
✅ MongoDB conectado
✅ Servidor corriendo en puerto 3001
✅ Frontend cargando sin errores
✅ Puedes login con admin:admin123
✅ Puedes crear empleados
✅ Puedes asignar turnos
✅ Puedes calcular nómina
✅ Puedes descargar reportes
```

---

## 📞 Soporte

Si tienes problemas:

1. **Revisar logs:**
   ```bash
   npm run dev        # Ver errores en desarrollo
   docker compose logs  # Si usas Docker
   ```

2. **Verificar conexión BD:**
   ```bash
   mongo              # Conectar a MongoDB
   show dbs           # Ver bases de datos
   use turnos_app
   db.usuarios.findOne()  # Ver si hay datos
   ```

3. **Limpiar caché:**
   ```bash
   npm cache clean --force
   rm -rf node_modules
   npm install
   ```

4. **Reiniciar servicios:**
   ```bash
   # Docker
   docker-compose down
   docker system prune
   docker-compose up --build
   ```

---

## 🚀 ¡Listo!

Tu sistema está **completamente operacional**. Procede a:
- 📚 Leer [COMO_FUNCIONA.md](COMO_FUNCIONA.md) para entender flujos
- 📁 Leer [COMPOSICION_SISTEMA.md](COMPOSICION_SISTEMA.md) para estructura
- 📋 Revisar [DOCUMENTACION_TECNICA_COMPLETA.md](DOCUMENTACION_TECNICA_COMPLETA.md) para API

