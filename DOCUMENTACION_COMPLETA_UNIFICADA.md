# 📚 DOCUMENTACIÓN COMPLETA - Sistema de Gestión Empresarial v2.0.0

**Desarrollado para:** UT PEREIRA AVANZA  
**Versión:** 2.0.0  
**Fecha:** 18 de febrero de 2026  
**Tamaño:** Documento unificado completo

---

## 🎯 TABLA DE CONTENIDOS PRINCIPAL

1. [Introducción General](#introducción-general)
2. [Guía Rápida de Inicio](#guía-rápida-de-inicio)
3. [Instalación Completa](#instalación-completa)
4. [Cómo Funciona el Sistema](#cómo-funciona-el-sistema)
5. [Composición y Estructura](#composición-y-estructura)
6. [Referencia de API](#referencia-de-api)
7. [Guías por Rol](#guías-por-rol)
8. [Troubleshooting](#troubleshooting)

---

# 📖 INTRODUCCIÓN GENERAL

## ¿Qué es este Sistema?

Sistema empresarial integrado que gestiona eficientemente los recursos humanos combinando:

- **📅 Módulo de Turnos**: Gestión integral de horarios, asignación de turnos con cronogramas automáticos y manejo de tablas de descanso
- **💰 Módulo de Nómina**: Cálculo automatizado de nómina con prestaciones, recargos y deducciones basados en turnos trabajados

Ambos módulos comparten la misma base de datos MongoDB y funcionan en **tiempo real e integrados**.

### Características Principales

#### ✅ Módulo de Turnos

```
✅ Gestión de empleados (CRUD)
✅ Importación masiva desde CSV/Excel
✅ Asignación de turnos con cronogramas automáticos
✅ Múltiples tipos de asignación:
   - Taquilleros: Avanzada con tablas de descanso
   - Administrativos: Automática (7am-5pm Lun-Vie)
   - Centro de Control: Rotativa (Mañana/Tarde)
   - Conductores: Flexible con descansos personalizados
   - Mantenimiento: Flexible con descansos personalizados
✅ Detección automática de festivos
✅ Visualización en calendario
✅ Historial completo de turnos
✅ Exportación a Excel/PDF
```

#### ✅ Módulo de Nómina

```
✅ Cálculo automático basado en turnos
✅ Cálculo de componentes:
   - Horas normales
   - Horas extras (diurnas, nocturnas)
   - Recargos nocturnos (+35%)
   - Recargos dominicales (+75%)
   - Recargos festivos (+100%)
   - Auxilio de transporte
✅ Deducciones automáticas:
   - Afiliación salud (4%)
   - Afiliación pensión (4%)
✅ Cálculo individual y masivo
✅ Desprendibles en PDF y Excel
✅ Reportes por área o período
```

---

# 🚀 GUÍA RÁPIDA DE INICIO

## Para los Impacientes (5 minutos)

### 1. Acceso Inmediato

```
🌐 Aplicación:        http://localhost:3001
📅 Módulo Turnos:     http://localhost:3001/turnos  
💰 Módulo Nómina:     http://localhost:3001/nomina
👤 Panel Usuarios:    http://localhost:3001/usuarios (solo admin)

Usuario: admin
Contraseña: admin123
⚠️ Cambiar en producción
```

### 2. Primeros Pasos en la Aplicación

**Paso 1: Login**
- Accede a http://localhost:3001
- Username: `admin`
- Password: `admin123`
- Click "Login"

**Paso 2: Crear Empleados**
- Módulo Turnos → Gestión Empleados
- Click "Crear Nuevo" o "Importar CSV"
- Rellenar campos

**Paso 3: Asignar Turno**
- Módulo Turnos → Asignación
- Seleccionar empleado + período
- "Generar Cronograma"

**Paso 4: Calcular Nómina**
- Módulo Nómina → Cálculo Individual
- Seleccionar empleado + mes
- "Descargar PDF"

---

# 🔧 INSTALACIÓN COMPLETA

## Requisitos del Sistema

### Opción 1: Ejecución Local (Desarrollo)

```
✅ Node.js 14+ (v18 recomendado)
✅ MongoDB 4.4+ (local o cloud)
✅ npm 6+
✅2 GB RAM mínimo
```

### Opción 2: Con Docker (Producción)

```
✅ Docker 20.10+
✅ Docker Compose 2.0+
✅ 4 GB RAM disponibles
```

### Verificar Versiones

```bash
node --version          # Debe ser v14+
npm --version          # Debe ser 6+
mongod --version       # Si es local
docker --version       # Si usarás Docker
```

---

## Instalación Paso a Paso (Local)

### Paso 1: Descargar el Proyecto

```bash
cd tu_directorio_trabajo

# OPCIÓN A: Clonar desde Git
git clone <URL_REPOSITORIO> turnos_app
cd turnos_app

# OPCIÓN B: Extraer ZIP
# unzip turnos_app.zip
# cd turnos_app
```

### Paso 2: Instalar Dependencias del Backend

```bash
cd backend
npm install
```

Si hay errores:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Paso 3: Configurar Variables de Entorno

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
# O si usas cloud:
# MONGO_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/turnos_app

# Sesiones
SESSION_SECRET=tu_secreto_muy_seguro_aqui_123

# Aplicación
APP_NAME=Sistema de Gestión Empresarial
APP_VERSION=2.0.0
```

### Paso 4: Configurar MongoDB

#### Opción A: MongoDB Local

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
exit
```

#### Opción B: MongoDB Atlas (Cloud)

1. Ir a https://www.mongodb.com/cloud/atlas
2. Crear cuenta gratis
3. Crear cluster (free tier)
4. Obtener connection string:
   ```
   mongodb+srv://usuario:contraseña@cluster0.xxxxx.mongodb.net/turnos_app
   ```
5. Copiar en `backend/.env` en `MONGO_URI`

### Paso 5: Crear Usuario Administrador

```javascript
// Abrir Node.js REPL
node

> const mongoose = require('mongoose');
> const Usuario = require('./models/Usuario');
> mongoose.connect('mongodb://localhost:27017/turnos_app');

> Usuario.create({
    username: 'admin',
    password: 'admin123',  // ⚠️ Cambiar en prod
    nombre: 'Administrador',
    rol: 'admin',
    modulosPermitidos: ['turnos', 'nomina'],
    areasPermitidas: ['all']
  });

> // Aparecerá: { _id: ..., username: 'admin', ... }
> process.exit();
```

### Paso 6: Iniciar el Servidor

```bash
# Modo desarrollo (con nodemon)
npm run dev

# O modo producción
npm start
```

**Salida esperada:**
```
✅ MongoDB conectado
🚀 Servidor ejecutando en puerto 3001
```

### Paso 7: Acceder a la Aplicación

- Abrir navegador en http://localhost:3001
- Username: `admin`
- Password: `admin123`
- Click Login

---

## Instalación con Docker (Producción)

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

# ⚙️ CÓMO FUNCIONA EL SISTEMA

## Visión General del Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO ACCEDE AL SISTEMA                │
│                   http://localhost:3001                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────────┐
              │   LOGIN / SESIÓN   │
              │  Express-Session   │
              └────────┬───────────┘
                       │
          ┌────────────┼───────────────┐
          │            │               │
          ▼            ▼               ▼
    ┌─────────┐   ┌────────┐    ┌─────────────┐
    │ ADMIN   │   │USUARIO │    │ CONSULTA    │
    │ Total   │   │Módulos │    │ Solo lectura│
    │acceso   │   │permit. │    │             │
    └────┬────┘   └───┬────┘    └──────┬──────┘
         │            │                │
         └────────────┼────────────────┘
                      │ AUTORIZADO
                      ▼
          ┌──────────────────────┐
          │  MENÚ PRINCIPAL      │
          │  - Usuarios          │
          │  - Empleados         │
          │  - Turnos            │
          │  - Nómina            │
          └──────────────────────┘
```

## Módulo de Turnos (Completo)

### ¿Cómo Funciona?

#### Paso 1: Importación de Empleados

```
Archivo CSV/Excel
    ↓
turnoController.cargaMasivaEmpleados()
    ↓
Validación de datos (empleadoValidator.js)
    ↓
Guardado en BD en colección 'empleados'
    ↓
✅ Lista de empleados lista para turnos

Campos requeridos:
- documento (único)
- nombre
- área
- cargo
- salario
```

#### Paso 2: Asignación de Turnos

El sistema soporta **múltiples tipos**:

##### A) Taquilleros (Asignación Avanzada)

```
DATO: Empleado + Período + Tabla descanso + Horarios

    ↓ asignarTurnosTaquilleros()
    
    FOR cada día en período:
      ├─ Cargar tabla de descanso
      ├─ Obtener festivos
      ├─ Determinar tipo de día
      ├─ Asignar horario específico
      └─ Crear cronograma día

    ↓
    
    Guardar en MongoDB
    Colección 'turnos'
    ├─ empleadoId
    ├─ turnoActual
    └─ historialTurnos[]
       └─ cronogramaDetallado[] ✅

✅ 15 dias de cronograma generados automáticamente
```

**Características:**
- ✅ Detecta automáticamente festivos
- ✅ Aplica tablas de descanso
- ✅ Horarios diferentes por tipo de turno
- ✅ Historial completo

##### B) Administrativos (Asignación Automática)

```
DATO: Empleado administrativo + Período

    ↓ asignarTurnosAdministrativos()
    
    FOR CADA DÍA en período:
      ├─ ¿Es Lunes-Viernes? SÍ → Turno 7am-5pm
      ├─ ¿Es fin de semana?   SÍ → Descanso
      └─ ¿Es festivo?         SÍ → Descanso

    ↓
    
    Guardar cronograma en BD
    
    ✅ Turnos automáticos aplicados
    
Horario fijo:
- Lunes a Viernes: 7:00 AM - 5:00 PM
- Sábado-Domingo: Descanso automático
- Festivos: Descanso automático
```

##### C) Centro de Control (Rotativo)

```
DATO: Empleado + Período + Tabla rotación

    ↓

    Alterna entre:
    - Turno Mañana: 05:00 - 14:30 (9.5 horas)
    - Turno Tarde: 14:30 - 23:30 (9 horas)

    ↓ Cada 7-15 días según configuración
    
    Incluye descansos automáticos
    
    ✅ Turnos rotativos aplicados
```

#### Paso 3: Visualización

```
Usuario abre: Módulo Turnos → Empleado específico
                    ↓
         turnoController.obtenerHistorialEmpleado()
                    ↓
         Busca en BD documento 'turnos'
         con ese empleadoId
                    ↓
         Extrae historialTurnos[]
                    ↓
         Frontend muestra cronograma
         en calendario visual
                    ↓
         ✅ Usuario ve todos sus turnos
```

---

## Módulo de Nómina (Completo)

### ¿Cómo Funciona?

#### Paso 1: Seleccionar Período

```
Usuario accede Módulo Nómina
         ↓
  Selecciona:
  - Empleado (de lista)
  - Mes (ej: Noviembre)
  - Año (ej: 2025)
         ↓
  POST /api/nomina/calcular
```

#### Paso 2: Lectura de Cronograma desde BD

```
nominaController.calcularNomina(empleadoId, mes, año)
         ↓
Busca documento en colección 'turnos'
         ↓
Extrae historialTurnos[] que coincidan
con mes/año solicitado
         ↓
Saca su cronogramaDetallado[] día por día
         ↓
Lee cada día:
├─ Fecha
├─ Horas trabajadas (horaInicio - horaFin)
├─ Si fue festivo
├─ Si fue dominical
└─ Si incluyó horas nocturnas
```

#### Paso 3: Cálculo de Componentes

Para **cada día** en el cronograma:

```
┌──────────────────────────────────────────┐
│  Entrada: 1 Día de Turno                 │
│  {                                       │
│    fecha: "2025-11-16",                 │
│    horaInicio: "14:30",                 │
│    horaFin: "23:30",                    │
│    esFestivo: false,                    │
│    tipoDay: "LABORABLE"                 │
│  }                                       │
└──────────────┬───────────────────────────┘
               │
      ┌────────┼──────────┐
      ▼        ▼          ▼
  ┌────────┐ ┌────────┐ ┌──────────┐
  │Horas   │ │¿Es     │ │¿Es       │
  │Normales│ │Noctr.? │ │Dominical?│
  │(14:30  │ │(21:00- │ │(Domingo) │
  │-23:30) │ │ 06:00) │ │          │
  │= 9 hrs │ │        │ │          │
  └───┬────┘ └───┬────┘ └────┬─────┘
      │          │           │
      ▼          ▼           ▼
  ┌──────────────────────────────┐
  │  APLICAR TARIFA Y RECARGO    │
  │                              │
  │ Horas normales:              │
  │  Salario / 240 * horas       │
  │                              │
  │ Recargo nocturno: +35%       │
  │ Recargo dominical: +75%      │
  │ Recargo festivo: +100%       │
  └────────────┬─────────────────┘
               │
               ▼
       ┌──────────────────────┐
       │ SUMA POR CONCEPTO    │
       │                      │
       │ Total Horas Normales │
       │ Total Recargo Noct.  │
       │ Total Rec. Dominical │
       │ Total Rec. Festivo   │
       └──────────┬───────────┘
                  │
                  ▼
       ┌──────────────────────┐
       │ OTROS CONCEPTOS      │
       │                      │
       │ + Auxilio Transporte │
       │ - Deducción Salud    │
       │ - Deducción Pensión  │
       │ - Otros descuentos   │
       └──────────┬───────────┘
                  │
                  ▼
       ┌──────────────────────┐
       │ NÓMINA FINAL         │
       │                      │
       │ Total Devengado      │
       │ Total Deducciones    │
       │ Neto a Pagar         │
       └──────────────────────┘
```

#### Paso 4: Generación de Reportes

```
Backend genera objeto con cálculos
         ↓
    ┌────┴────┐
    ▼         ▼
  PDF      Excel
  (PDFKit) (jsPDF)
    │       │
    └───┬───┘
        ▼
   Genera reportes
   descargables
        ▼
   ✅ Usuario descarga
```

### Integración Turnos → Nómina

```
MÓDULO TURNOS              MÓDULO NÓMINA
┌──────────────┐          ┌──────────────┐
│ Asigna Turno │          │              │
│   día 16     │──────►   │              │
│   9 horas    │ MongoDB  │ Lee turnos   │
└──────────────┘          │ del empleado │
                          │   mes/año    │
                          │ Calcula......→
                          └──────────────┘
                               │
                               ▼
                         Nómina CALCULADA
                         AUTOMÁTICAMENTE

     NO necesita sincronización manual
     ✅ Todo en la misma BD
     ✅ Real-time
```

---

# 🏗️ COMPOSICIÓN Y ESTRUCTURA

## Estructura General del Proyecto

```
turnos_app/
├── 📄 README.md
├── 📄 DOCUMENTACION_TECNICA_COMPLETA.md
├── 📄 GUIA_INSTALACION.md
├── 📄 COMO_FUNCIONA.md
├── 📄 COMPOSICION_SISTEMA.md
├── 📄 API_REFERENCE.md
│
├── ⚙️ CONFIGURACIÓN DOCKER
│   ├── Dockerfile                     # Imagen de contenedor
│   ├── docker-compose.yml             # Orquestación
│   ├── .dockerignore                  # Exclusiones
│   └── .env.docker                    # Variables env producción
│
├── 🚀 SCRIPTS AUTOMATIZACIÓN
│   ├── docker-start.ps1               # Iniciar en Windows
│   └── docker-stop.ps1                # Detener en Windows
│
├── 📁 backend/                        # API REST y Lógica
│   ├── 📄 package.json                (Node.js 14+)
│   ├── 📄 server.js                   (Punto entrada)
│   ├── 📄 docker-entrypoint.sh        (Init Docker)
│   ├── 📄 .env                        (Variables secretas)
│   │
│   ├── 📂 controllers/                (Lógica de negocio)
│   │   ├── authController.js          (Auth, login/logout)
│   │   ├── turnoController.js         (Gestión de turnos) [3,624 líneas]
│   │   └── nominaController.js        (Cálculo de nómina)
│   │
│   ├── 📂 routes/                     (Endpoints API)
│   │   ├── auth.js                    (POST /api/auth/*)
│   │   ├── turnos.js                  (GET/POST /api/turnos/*)
│   │   └── nominaRoutes.js            (GET/POST /api/nomina/*)
│   │
│   ├── 📂 models/                     (Esquemas MongoDB)
│   │   ├── Usuario.js                 (Usuarios/Sesiones)
│   │   ├── Empleado.js                (Empleados)
│   │   ├── Turno.js                   (Turnos + Historial)
│   │   └── turnoModel.js              (Funciones auxiliares)
│   │
│   ├── 📂 services/                   (Lógica modular)
│   │   ├── turnosService.js           (Generación de turnos)
│   │   ├── empleadosService.js        (CRUD empleados)
│   │   ├── festivosService.js         (Festivos Colombia)
│   │   ├── tablasDescansoService.js   (Rotaciones A/B/C)
│   │   └── horariosService.js         (Configuración horarios)
│   │
│   ├── 📂 middlewares/                (Express middlewares)
│   │   └── auth.js                    (Verificar sesión + permisos)
│   │
│   ├── 📂 validators/                 (Validación de datos)
│   │   └── empleadoValidator.js       (Schema validation)
│   │
│   ├── 📂 utils/                      (Utilidades compartidas)
│   │   ├── constants.js               (Constantes globales)
│   │   ├── helpers.js                 (Funciones helper)
│   │   ├── calculoNomina.js           (Fórmulas de cálculo)
│   │   ├── calculoNominaMongo.js      (Integración MongoDB)
│   │   ├── festivos2025.json          (Festivos 2025)
│   │   ├── festivos2026.json          (Festivos 2026)
│   │   ├── tablasDescanso2025.json    (Tablas A/B/C)
│   │   └── tablasCentroControl2025.json
│   │
│   ├── 📂 scripts/                    (Scripts útiles)
│   │   └── importarEmpleados.js       (Import CSV)
│   │
│   ├── 📂 docs/                       (Documentación interna)
│   │   ├── REFACTORIZACION.md
│   │   ├── HISTORIAL_TURNOS.md
│   │   └── GUIA_USO_HISTORIAL.md
│   │
│   └── README.md                      (Backend específico)
│
├── 📁 frontend/                       (Interfaz de Usuario)
│   │
│   ├── 📄 login.html                  (Formulario login)
│   ├── 📄 dashboard.html              (Panel principal)
│   ├── 📄 usuarios.html               (Gestión de usuarios)
│   ├── 📄 index.html                  (Home/inicio)
│   │
│   ├── 📂 turnos-react/               (App React Turnos)
│   │   ├── 📄 package.json
│   │   ├── 📄 vite.config.js
│   │   ├── 📄 index.html
│   │   ├── 📂 src/
│   │   │   ├── App.jsx
│   │   │   ├── main.jsx
│   │   │   ├── index.css
│   │   │   └── 📂 components/
│   │   │       ├── GestionEmpleados.jsx
│   │   │       ├── AsignacionTurnos.jsx
│   │   │       ├── AsignacionPorAreas.jsx
│   │   │       ├── CalendarioSemanal.jsx
│   │   │       └── ConsultaTurnos.jsx
│   │   └── 📂 utils/
│   │       ├── excelGenerator.js
│   │       └── pdfGenerator.js
│   │
│   ├── 📂 nomina-react/               (App React Nómina)
│   │   ├── 📄 package.json
│   │   ├── 📄 vite.config.js
│   │   ├── 📂 src/
│   │   │   ├── App.jsx
│   │   │   ├── components/
│   │   │   │   ├── CalculoIndividual.jsx
│   │   │   │   └── CalculoPorAreas.jsx
│   │   │   └── utils/
│   │   │       ├── excelGenerator.js
│   │   │       ├── pdfGenerator.js
│   │   │       └── tablePdfGenerator.js
│   │
│   ├── 📂 turnos-build/               (Build compilado)
│   │   └── 📂 assets/
│   │
│   └── 📂 nomina-build/               (Build compilado)
│       └── 📂 assets/
│
├── 📁 uploads/                        (Archivos subidos)
│   └── (CSV/Excel importados)
│
└── 📁 node_modules/                  (Dependencias)
    └── (librerías Node.js)
```

## Arquitectura de Capas

```
              REQUEST / RESPONSE
             ↓              ↑
    ╔════════════════════════════╗
    ║   EXPRESS ROUTES           ║  (Definición de endpoints)
    ║  routes/*.js               ║
    ╚════════════════════════════╝
             ↓              ↑
    ╔════════════════════════════╗
    ║   MIDDLEWARES              ║  (Auth, validación, CORS)
    ║  middlewares/*.js          ║
    ╚════════════════════════════╝
             ↓              ↑
    ╔════════════════════════════╗
    ║   CONTROLLERS              ║  (Orquestar servicios)
    ║  controllers/*.js          ║
    ╚════════════════════════════╝
             ↓              ↑
    ╔════════════════════════════╗
    ║   SERVICES                 ║  (Lógica de negocio)
    ║  services/*.js             ║
    ╚════════════════════════════╝
             ↓              ↑
    ╔════════════════════════════╗
    ║   VALIDATORS               ║  (Validar datos entrada)
    ║  validators/*.js           ║
    ╚════════════════════════════╝
             ↓              ↑
    ╔════════════════════════════╗
    ║   MODELS                   ║  (Esquemas MongoDB)
    ║  models/*.js (Mongoose)    ║
    ╚════════════════════════════╝
             ↓              ↑
    ╔════════════════════════════╗
    ║   MONGODB                  ║  (Persistencia)
    ║  Base de datos             ║
    ╚════════════════════════════╝
```

## Backend Detallado

### Controllers

#### authController.js
- `login()` - Validar credenciales, crear sesión
- `logout()` - Destruir sesión
- `verificarSesion()` - Retornar estado actual
- `me()` - Datos del usuario actual

#### turnoController.js (3,624 líneas)

**Secciones:**
```
1. HELPERS (200 líneas)
   - clonarFechaLocal()
   - eliminarDiasSolapados()
   - construirCronograma()

2. EMPLEADOS (300 líneas)
   - obtenerEmpleados()
   - crearEmpleado()
   - crearEmpleadosCSV()
   - cargaMasivaEmpleados()

3. CONSULTAS (200 líneas)
   - obtenerTurnosEmpleado()
   - obtenerHistorialEmpleado()
   - obtenerTurnoActualEmpleado()

4. ASIGNACIÓN TURNOS (1,500 líneas)
   - asignarTurnosTaquilleros() ← Avanzado
   - asignarTurnosAdministrativos() ← Simple
   - asignarTurnosCentroControl() ← Rotativo
   - asignarTurnosOperaciones()
   - asignarTurnosConductores()
   - asignarTurnosMantenimiento()

5. GENERACIÓN CONFIG (400 líneas)
   - generarTurnosPorArea()
   - generarTablasDescansoAño()
   - generarFestivosAño()
```

#### nominaController.js
- Validación sesión + módulo
- `calcularNomina()` - Calcula para 1 empleado
- `calcularNominaMasiva()` - Calcula múltiples
- `generarReporte()` - Genera PDF/Excel

### Services

#### turnosService.js (517 líneas)
```javascript
generarTurnosAdministrativos()
generarTurnosRotativos()
generarTurnosCentroPorTerreno()
```

#### empleadosService.js
```javascript
obtenerEmpleados(filtros)
crearEmpleado(datos)
procesarEmpleadosCSV(empleados)
completarDatosTaquillero()
buscarEmpleados(termino)
```

#### festivosService.js
```javascript
esFestivo(fecha)
obtenerFestivosAño(year)
generarFestivosAño(year)
```

#### tablasDescansoService.js
```javascript
obtenerTablaDescanso(tabla)
getDiasDescansoEnPeriodo(tabla, inicio, fin)
aplicarTablaDescanso(cronograma, tabla)
```

### Models

#### Turno.js (Schema completo)

```javascript
{
  empleadoId: ObjectId (ref),
  nombreEmpleado: String,
  documentoEmpleado: String,
  
  turnoActual: {
    area: String,
    subarea: String,
    turno: String,
    fechaInicio: Date,
    fechaFin: Date,
    activo: Boolean
  },
  
  historialTurnos: [{
    fechaInicio: Date,
    fechaFin: Date,
    area: String,
    tablaDescanso: String,
    
    cronogramaDetallado: [{
      fecha: String,
      diaSemana: String,
      tipoDay: String,
      horaInicio: String,
      horaFin: String,
      esFestivo: Boolean,
      esDescanso: Boolean,
      observaciones: String
    }]
  }]
}
```

#### Empleado.js

```javascript
{
  documento: String (unique),
  nombre: String,
  area: Enum,
  cargo: String,
  salario: Number,
  subarea: String,
  estado: String
}
```

#### Usuario.js

```javascript
{
  username: String (unique),
  password: String (hash),
  nombre: String,
  rol: Enum ['admin','usuario','consulta'],
  modulosPermitidos: [String],
  areasPermitidas: [String],
  activo: Boolean
}
```

## Frontend

### React Apps

#### turnos-react/
- GestionEmpleados.jsx → CRUD empleados
- AsignacionTurnos.jsx → Asignar turnos
- AsignacionPorAreas.jsx → Masivo
- CalendarioSemanal.jsx → Visualización
- ConsultaTurnos.jsx → Búsqueda + historial

#### nomina-react/
- CalculoIndividual.jsx → Nómina 1 empleado
- CalculoPorAreas.jsx → Nómina múltiples

### Utils Frontend
- excelGenerator.js → Export Excel
- pdfGenerator.js → Export PDF
- tablePdfGenerator.js → Tablas PDF

## Base de Datos - MongoDB

### Collections

```javascript
// usuarios - Credenciales
{
  username: String (unique),
  password: String (hash bcrypt),
  rol: Enum,
  modulosPermitidos: [String],
  areasPermitidas: [String]
}

// empleados - Personal
{
  documento: String (unique),
  nombre: String,
  area: Enum,
  cargo: String,
  salario: Number
}

// turnos - Turnos + Historial
{
  empleadoId: ObjectId,
  turnoActual: {},
  historialTurnos: [{
    cronogramaDetallado: [...]
  }]
}
```

### Índices

```javascript
db.usuarios.createIndex({ username: 1 }, { unique: true });
db.empleados.createIndex({ documento: 1 }, { unique: true });
db.empleados.createIndex({ area: 1 });
db.turnos.createIndex({ empleadoId: 1 });
db.turnos.createIndex({ 'historialTurnos.fechaInicio': 1 });
```

## Stack Tecnológico

### Backend
- **Runtime:** Node.js 14+ (v18 recomendado)
- **Framework:** Express.js
- **BD:** MongoDB 4.4+
- **ODM:** Mongoose
- **Auth:** express-session
- **Validación:** Joi
- **PDF:** PDFKit, jsPDF
- **Reportes:** Excel, CSV

### Frontend
- **Principal:** HTML5 + CSS3 + Vanilla JavaScript
- **Complejos:** React 19.2
- **Build:** Vite
- **Reportes:** jsPDF, html2canvas

### Infraestructura
- **Containers:** Docker + Docker Compose
- **Puertos:** App (3001), MongoDB (27017/27018)

---

# 🔌 REFERENCIA DE API

## Autenticación

### POST `/api/auth/login`

Login e iniciar sesión.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "usuario": {
    "id": "65a1b2c3d4e5f6g7",
    "username": "admin",
    "nombre": "Administrador",
    "rol": "admin"
  }
}
```

### POST `/api/auth/logout`

Cerrar sesión.

**Response (200):**
```json
{
  "success": true,
  "message": "Logout exitoso"
}
```

### GET `/api/auth/verificar-sesion`

Verificar si el usuario tiene sesión activa.

**Response (200):**
```json
{
  "autenticado": true,
  "usuario": {
    "username": "admin",
    "rol": "admin",
    "modulosPermitidos": ["turnos", "nomina"]
  }
}
```

---

## Empleados

### GET `/api/turnos/empleados`

Obtener lista de empleados.

**Query Parameters:**
```
?area=TAQUILLEROS
?estado=activo
?search=Juan
```

**Response (200):**
```json
{
  "total": 45,
  "empleados": [
    {
      "_id": "65a1b2c3d4e5f6g7",
      "documento": "80234567",
      "nombre": "JUAN PÉREZ",
      "area": "TAQUILLEROS",
      "cargo": "OPERADOR",
      "salario": 1500000,
      "estado": "activo"
    }
  ]
}
```

### POST `/api/turnos/empleados`

Crear nuevo empleado.

**Request:**
```json
{
  "documento": "80234570",
  "nombre": "CARLOS LÓPEZ",
  "area": "CONDUCTORES",
  "cargo": "CONDUCTOR",
  "salario": 1800000,
  "estado": "activo"
}
```

**Response (201):**
```json
{
  "success": true,
  "empleado": { ... }
}
```

### POST `/api/turnos/empleados/csv`

Importar empleados desde CSV.

**Request:** (multipart/form-data)
```
file: [archivo.csv]
```

**CSV Format:**
```csv
documento,nombre,area,cargo,salario
80234567,JUAN PÉREZ,TAQUILLEROS,OPERADOR,1500000
```

---

## Turnos

### POST `/api/turnos/asignar-taquilleros`

Asignar turno avanzado con cronograma.

**Request:**
```json
{
  "empleadoId": "65a1b2c3d4e5f6g7",
  "fechaInicio": "2025-11-16",
  "fechaFin": "2025-11-30",
  "tablaDescanso": "A",
  "subarea": "MEGABUS",
  "tipoTurno": "T100"
}
```

**Response (201):**
```json
{
  "success": true,
  "turno": {
    "empleadoId": "65a1b2c3d4e5f6g7",
    "cronogramaDetallado": [...],
    "diasGenerados": 15
  }
}
```

### POST `/api/turnos/asignar-administrativos`

Asignar turno automático administrativo.

**Request:**
```json
{
  "empleadoId": "65a1b2c3d4e5f6g7",
  "fechaInicio": "2025-11-01",
  "fechaFin": "2025-11-30"
}
```

**Response (201):**
```json
{
  "success": true,
  "turno": {
    "tipo": "ADMINISTRATIVO",
    "horarioFijo": "07:00 - 17:00",
    "diasAsignados": 22
  }
}
```

### GET `/api/turnos/empleado/:id/historial`

Obtener historial completo de turnos.

**Response (200):**
```json
{
  "empleadoId": "65a1b2c3d4e5f6g7",
  "nombreEmpleado": "JUAN PÉREZ",
  "turnoActual": { ... },
  "historialTurnos": [
    {
      "cronogramaDetallado": [
        {
          "fecha": "2025-11-16",
          "horaInicio": "14:30",
          "horaFin": "23:30",
          "esFestivo": false
        }
      ]
    }
  ]
}
```

---

## Nómina

### POST `/api/nomina/calcular`

Calcular nómina para un empleado.

**Request:**
```json
{
  "empleadoId": "65a1b2c3d4e5f6g7",
  "mes": 11,
  "anio": 2025
}
```

**Response (200):**
```json
{
  "empleado": { ... },
  "periodo": "Noviembre 2025",
  "detalle": {
    "horasNormales": 120,
    "recargoNocturno": 30,
    "recargoDominical": 10
  },
  "devengos": 1704470,
  "deducciones": 136358,
  "netoPagar": 1568112
}
```

### POST `/api/nomina/calcular-masiva-desde-turnos`

Calcular nómina para múltiples empleados.

**Request:**
```json
{
  "area": "TAQUILLEROS",
  "mes": 11,
  "anio": 2025
}
```

**Response (200):**
```json
{
  "success": true,
  "area": "TAQUILLEROS",
  "empleadosCalculados": 15,
  "totalDevengado": 25567050,
  "totalDeducciones": 2045073,
  "totalNetoPagar": 23521977
}
```

---

## Códigos de Estado HTTP

| Código | Significado | Cuándo |
|--------|------------|--------|
| **200** | OK | Solicitud exitosa |
| **201** | Created | Recurso creado |
| **400** | Bad Request | Datos inválidos |
| **401** | Unauthorized | No autenticado |
| **403** | Forbidden | Sin permisos |
| **404** | Not Found | Recurso no existe |
| **409** | Conflict | Datos duplicados |
| **500** | Server Error | Error servidor |

---

## Ejemplos cURL

### Ejemplo 1: Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### Ejemplo 2: Crear Empleado

```bash
curl -X POST http://localhost:3001/api/turnos/empleados \
  -H "Content-Type: application/json" \
  -d '{
    "documento": "80234567",
    "nombre": "JUAN PÉREZ",
    "area": "TAQUILLEROS",
    "cargo": "OPERADOR",
    "salario": 1500000
  }'
```

### Ejemplo 3: Asignar Turno

```bash
curl -X POST http://localhost:3001/api/turnos/asignar-taquilleros \
  -H "Content-Type: application/json" \
  -d '{
    "empleadoId": "65a1b2c3d4e5f6g7",
    "fechaInicio": "2025-11-16",
    "fechaFin": "2025-11-30",
    "tablaDescanso": "A",
    "subarea": "MEGABUS",
    "tipoTurno": "T100"
  }'
```

### Ejemplo 4: Calcular Nómina

```bash
curl -X POST http://localhost:3001/api/nomina/calcular \
  -H "Content-Type: application/json" \
  -d '{
    "empleadoId": "65a1b2c3d4e5f6g7",
    "mes": 11,
    "anio": 2025
  }'
```

---

# 👥 GUÍAS POR ROL

## Para Gerentes/Supervisores

### Tiempo: 1 hora

1. **Lee:** Secciones de "Cómo Funciona el Sistema"
   - Módulo de Turnos
   - Módulo de Nómina
   - Integración

2. **Accede a:** http://localhost:3001
   - Username: `admin`
   - Password: `admin123`

3. **Experimenta:**
   - Crea algunos empleados
   - Asigna turnos
   - Calcula nómina

**Resultado:** Entenderás flujo completo del negocio

---

## Para Desarrolladores

### Tiempo: 4+ horas

1. **Instala:** Sigue GUIA_INSTALACION.md
   - Local o Docker

2. **Lee:** COMPOSICION_SISTEMA.md
   - Backend detallado
   - Frontend detallado
   - Models de BD

3. **Lee:** Referencia de API
   - Endpoints
   - Ejemplos cURL

4. **Desarrolla:**
   - Crea un nuevo endpoint
   - O modifica un componente existente

**Resultado:** Estarás listo para contribuir

---

## Para DevOps/Infraestructura

### Tiempo: 30 minutos

1. **Lee:** GUIA_INSTALACION.md → Sección Docker

2. **Configura:**
   - Variables `backend/.env`
   - Docker secrets (en producción)

3. **Deploy:**
   - `docker-compose up --build`
   - Verifica logs
   - Configura backups

**Resultado:** Sistema en producción

---

## Para QA/Testing

### Tiempo: 2 horas

1. **Instala:** Sistema local
   - GUIA_INSTALACION.md

2. **Lee:** Referencia de API
   - Endpoints
   - Validaciones

3. **Testa:**
   - CRUD empleados
   - Asignación turnos
   - Cálculo nómina

4. **Crea casos de prueba:**
   - Positivos
   - Negativos
   - Edge cases

**Resultado:** Casos de prueba documentados

---

# 🔧 TROUBLESHOOTING

## Problema: "MongoDB está en puerto 27017"

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

## Problema: "Port 3001 en uso"

```
Error: EADDRINUSE :::3001
```

**Solución:**

```bash
# Cambiar en backend/.env
PORT=3002

# O matar proceso:
lsof -ti:3001 | xargs kill -9
```

---

## Problema: "Cannot find module 'express'"

```
Error: Cannot find module 'express'
```

**Solución:**

```bash
cd backend
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## Problema: "MongoDB connection refused"

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solución:**

```bash
# Iniciar MongoDB
mongod

# O verificar que esté corriendo
mongosh
```

---

## Problema: "CORS error"

```
Access-Control-Allow-Origin not allowed
```

**Solución:**

Verificar `backend/server.js`:
```javascript
app.use(cors());  // ✅ Debe estar
```

---

## Problema: "React app no carga"

Acceso a `/turnos` en blanco

**Solución:**

```bash
# Reconstruir React apps
cd frontend/turnos-react
npm run build

# Luego reiniciar backend
cd ../../backend
npm start
```

---

## Problema: "Sesión no válida"

Login falla o sesión se pierde

**Solución:**

```env
# backend/.env
SESSION_SECRET=algo_único_y_seguro

# Aumentar duración:
maxAge: 24 * 60 * 60 * 1000
```

---

## Verificación Final

Si todo está bien:

```
✅ MongoDB conectado
✅ Servidor corriendo en puerto 3001
✅ Frontend cargando
✅ Login funciona
✅ Puedo crear empleados
✅ Puedo asignar turnos
✅ Puedo calcular nómina
✅ Puedo descargar reportes
```

---

# 📊 ESTADÍSTICAS DEL PROYECTO

```
Backend:
├── Controllers: 3,624 líneas (turnoController)
├── Services: 1,100+ líneas
├── Models: 300+ líneas
└── Total Backend: 5,000+ líneas

Frontend:
├── React Components: 6 componentes
├── HTML Estático: 4 páginas
└── Total Frontend: 2,000+ líneas

Documentación:
└── 40,000+ palabras completas

Base de Datos:
└── 3 colecciones principales
```

---

# 🎉 CONCLUSIÓN

Tienes un **sistema completo** listo para:

✅ **Instalar** - Sigue GUIA_INSTALACION  
✅ **Entender** - Lee COMO_FUNCIONA  
✅ **Desarrollar** - Consulta COMPOSICION_SISTEMA  
✅ **Usar API** - Ve REFERENCIA_API  

**¡Comienza ahora con http://localhost:3001! 🚀**

