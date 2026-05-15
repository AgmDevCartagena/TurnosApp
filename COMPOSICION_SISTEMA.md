# 🏗️ Estructura y Composición del Sistema

**Versión:** 2.0.0  
**Fecha:** 18 de febrero de 2026

---

## 📑 Tabla de Contenidos

1. [Estructura General](#estructura-general)
2. [Backend - Node.js](#backend---nodejs)
3. [Frontend - React + HTML](#frontend---react--html)
4. [Base de Datos - MongoDB](#base-de-datos---mongodb)
5. [Tecnologías y Dependencias](#tecnologías-y-dependencias)
6. [Arquitectura de Capas](#arquitectura-de-capas)

---

## 🌳 Estructura General

```
turnos_app/
├── 📄 package.json                    # Configuración raíz
├── 📄 README.md                       # Principal
├── 📄 DOCUMENTACION_TECNICA_COMPLETA.md
├── 📄 COMO_FUNCIONA.md               # Este nivel
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
│   │   ├── REFACTORIZACION.md         (Historial refactor)
│   │   ├── HISTORIAL_TURNOS.md        (Sistema historial)
│   │   └── GUIA_USO_HISTORIAL.md      (Uso de historial)
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
│   │   ├── 📄 package.json            (Dependencias React)
│   │   ├── 📄 vite.config.js          (Configuración Vite)
│   │   ├── 📄 index.html              (Punto entrada)
│   │   │
│   │   ├── 📂 public/
│   │   │   └── assets/
│   │   │       └── (Imágenes, íconos)
│   │   │
│   │   ├── 📂 src/
│   │   │   ├── 📄 App.jsx             (Componente principal)
│   │   │   ├── 📄 main.jsx            (Bootstrap)
│   │   │   ├── 📄 index.css           (Estilos globales)
│   │   │   │
│   │   │   └── 📂 components/         (Componentes React)
│   │   │       ├── GestionEmpleados.jsx
│   │   │       ├── AsignacionTurnos.jsx
│   │   │       ├── AsignacionPorAreas.jsx
│   │   │       ├── CalendarioSemanal.jsx
│   │   │       └── ConsultaTurnos.jsx
│   │   │
│   │   └── 📂 utils/
│   │       ├── excelGenerator.js      (Genera Excel)
│   │       └── pdfGenerator.js        (Genera PDF)
│   │
│   ├── 📂 nomina-react/               (App React Nómina)
│   │   ├── 📄 package.json            (Dependencias React)
│   │   ├── 📄 vite.config.js          (Configuración Vite)
│   │   ├── 📄 index.html              (Punto entrada)
│   │   │
│   │   ├── 📂 src/
│   │   │   ├── 📄 App.jsx             (Componente principal)
│   │   │   ├── 📄 main.jsx            (Bootstrap)
│   │   │   ├── 📄 index.css           (Estilos)
│   │   │   │
│   │   │   └── 📂 components/         (Componentes)
│   │   │       ├── CalculoIndividual.jsx
│   │   │       └── CalculoPorAreas.jsx
│   │   │
│   │   └── 📂 utils/
│   │       ├── excelGenerator.js      (Export Excel)
│   │       ├── pdfGenerator.js        (Export PDF)
│   │       └── tablePdfGenerator.js   (Tablas PDF)
│   │
│   ├── 📂 turnos-build/               (Build compilado)
│   │   └── 📂 assets/
│   │       ├── index-BCRtvFv0.js
│   │       └── index-DeP5LCk-.css
│   │
│   └── 📂 nomina-build/               (Build compilado)
│       └── 📂 assets/
│           ├── index-cj0BkCgb.js
│           ├── index-MtY9Js9P.css
│           └── (otros assets)
│
├── 📁 uploads/                        (Archivos subidos)
│   └── (CSV/Excel importados)
│
└── 📁 node_modules/                  (Dependencias)
    └── (librerías Node.js)
```

---

## ⚙️ Backend - Node.js

### Estructura de Capas

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

---

### Detalles de Controllers

#### **authController.js**

| Función | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `login()` | ~50 | Validar creds, crear sesión |
| `logout()` | ~10 | Destruir sesión |
| `verificarSesion()` | ~10 | Retornar estado actual |
| `me()` | ~10 | Datos del usuario actual |
| Helper validators | ~30 | Validaciones internas |

**Exports:**
```javascript
module.exports = {
  login,
  logout,
  verificarSesion,
  me
};
```

---

#### **turnoController.js** (3,624 líneas totales)

**Secciones principales:**

```
1. HELPERS (200 líneas)
   - clonarFechaLocal()
   - eliminarDiasSolapados()
   - construirCronograma()
   - etc.

2. EMPLEADOS (300 líneas)
   - obtenerEmpleados()
   - crearEmpleado()
   - crearEmpleadosCSV()
   - cargaMasivaEmpleados()
   - completarDatosTaquillero()

3. CONSULTAS (200 líneas)
   - obtenerTurnosEmpleado()
   - obtenerHistorialEmpleado()
   - obtenerTurnoActualEmpleado()
   - obtenerTurnosSemana()

4. ASIGNACIÓN TURNOS (1,500 líneas)
   🟡 asignarTurnosTaquilleros()        (Avanzado con cronograma)
   🔵 asignarTurnosAdministrativos()   (Simple automático)
   🟢 asignarTurnosCentroControl()     (Rotativo)
   ⚫ asignarTurnosOperaciones()       (Rotativo)
   🟣 asignarTurnosConductores()      (Libre)
   🟠 asignarTurnosMantenimiento()    (Libre)

5. GENERACIÓN CONFIGURACIÓN (400 líneas)
   - generarTurnosPorArea()
   - generarTablasDescansoAño()
   - generarFestivosAño()
   - obtenerConfiguracionHorarios()
   - validarHorarioTurno()

6. HELPERS CONSULTA (100 líneas)
   - obtenerDiasDescansoTabla()
   - otras funciones auxiliares
```

**Función más importante:**
```javascript
async function asignarTurnosTaquilleros(req, res) {
  // 1. Validar datos entrada
  // 2. Cargar empleado
  // 3. Cargar tabla de descanso
  // 4. Cargar festivos
  // 5. FOR cada día en período:
  //    a. Calcular tipo de día
  //    b. Asignar horario
  //    c. Detectar festivos/domingos
  //    d. Crear cronograma día
  // 6. Guardar en BD
  // 7. Retornar resultado
}
```

---

#### **nominaController.js**

| Sección | Líneas | Qué hace |
|---------|--------|----------|
| Validación | 50 | Verificar sesión + módulo nómina |
| Importar utils | 30 | Carga funciones de cálculo |
| calcularNomina() | 200 | Calcula para 1 empleado |
| calcularNominaMasiva() | 150 | Calcula múltiples empleados |
| generarReporte() | 100 | Genera PDF/Excel |
| Helpers | 50 | Funciones auxiliares |

---

### Detalles de Services

#### **turnosService.js** (517 líneas)

```javascript
// Generación automática de turnos

generarTurnosAdministrativos()
├─ Itera días del período
├─ Excluye fines de semana
├─ Excluye festivos
└─ Crea turno 8am-5pm para los demás

generarTurnosRotativos()
├─ Itera días del período
├─ Alterna entre Mañana/Tarde
├─ Aplica descansos automáticos
└─ Retorna cronograma

generarTurnosCentroPorTerreno()
├─ Específico para Centro de Control
├─ Define horarios específicos
├─ Tablas de rotación configuradas
└─ Incluye festividades
```

---

#### **empleadosService.js**

```javascript
// CRUD de empleados + Importación

obtenerEmpleados(filtros)
├─ Busca en BD
├─ Filtra por área
└─ Retorna lista

crearEmpleado(datos)
├─ Valida documento único
├─ Hash datos sensibles
├─ Crea documento
└─ Retorna empleado creado

procesarEmpleadosCSV(empleados)
├─ Parsea CSV
├─ Valida cada fila
├─ Detecta duplicados
└─ Retorna reporte de errores

completarDatosTaquillero()
├─ Rellena campos específicos
├─ Asigna área automática
└─ Valida contra reglas de negocio
```

---

#### **festivosService.js**

```javascript
// Gestión de fechas festivas

esFestivo(fecha)
├─ Carga festivos2025.json / 2026.json
├─ Verifica si fecha está en listado
└─ Retorna boolean

obtenerFestivosAño(year)
├─ Lee archivo festivos[year].json
└─ Retorna array de fechas

generarFestivosAño(year)
├─ Calcula TODAS las fechas festivas
├─ Incluye Pascua (cálculo lunisolar)
├─ Guarda en archivos JSON
└─ Retorna reporte
```

---

#### **tablasDescansoService.js**

```javascript
// Rotación de descansos (A, B, C)

obtenerTablaDescanso(tabla)
├─ Lee tablasDescanso2025.json
├─ Busca tabla solicitada (A/B/C)
└─ Retorna días de descanso

getDiasDescansoEnPeriodo(tabla, inicio, fin)
├─ Obtiene tabla descanso
├─ Filtra días entre inicio y fin
└─ Retorna array de fechas de descanso

aplicarTablaDescanso(cronograma, tabla)
├─ Toma array de días
├─ Aplica tabla especificada
├─ Marca días de descanso
└─ Retorna cronograma modificado
```

---

### Detalles de Models

#### **Turno.js** (Schema completo)

```javascript
const TurnoSchema = new Schema({
  empleadoId: { type: Schema.Types.ObjectId, ref: 'Empleado', required: true },
  nombreEmpleado: String,
  documentoEmpleado: String,
  cargo: String,
  salario: Number,
  
  // TURNO ACTUAL
  turnoActual: {
    area: String,
    subarea: String,
    turno: String,
    fechaInicio: Date,
    fechaFin: Date,
    activo: Boolean
  },
  
  // HISTORIAL COMPLETO (Array de turnos históricos)
  historialTurnos: [{
    fechaInicio: Date,
    fechaFin: Date,
    area: String,
    subarea: String,
    tablaDescanso: String,
    tipoTurno: String,
    activo: Boolean,
    
    // CRONOGRAMA DETALLADO
    cronogramaDetallado: [{
      fecha: String,           // "2025-11-16"
      diaSemana: String,      // "Domingo"
      tipoDay: String,        // "LABORABLE"
      horaInicio: String,     // "14:30"
      horaFin: String,        // "23:30"
      esFestivo: Boolean,
      esDescanso: Boolean,
      observaciones: String
    }]
  }],
  
  timestamps: true
});
```

**Índices:**
```javascript
// Búsqueda rápida por empleado
TurnoSchema.index({ empleadoId: 1 });

// Búsqueda histórica
TurnoSchema.index({ 'historialTurnos.fechaInicio': 1 });
```

---

#### **Empleado.js**

```javascript
const EmpleadoSchema = new Schema({
  documento: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  apellido: String,
  area: {
    type: String,
    enum: [
      'TAQUILLEROS',
      'CONDUCTORES',
      'ADMINISTRATIVOS',
      'OPERACIONES',
      'CENTRO DE CONTROL',
      'MANTENIMIENTO'
    ]
  },
  cargo: String,
  salario: Number,
  subarea: String,
  tiposDescanso: [String],  // Para empleados con múltiples tipos
  estado: { type: String, default: 'activo' },
  timestamps: true
});
```

---

#### **Usuario.js**

```javascript
const UsuarioSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hash bcrypt
  nombre: String,
  rol: {
    type: String,
    enum: ['admin', 'usuario', 'consulta'],
    default: 'usuario'
  },
  modulosPermitidos: [String],  // ['turnos', 'nomina']
  areasPermitidas: [String],     // Áreas que puede ver
  activo: { type: Boolean, default: true },
  timestamps: true
});
```

---

### Utilidades Compartidas

#### **constants.js**

```javascript
// Constantes de configuración global

const AREAS = ['TAQUILLEROS', 'CONDUCTORES', 'ADMINISTRATIVOS', ...];
const HORARIOS = { AM: '05:00', PM: '14:30', ... };
const TARIFA_HORARIA = { NORMAL: 1.0, NOCTURNA: 1.35, ... };
const DEDUCCIONES = { SALUD: 0.04, PENSION: 0.04, ... };
```

---

#### **calculoNomina.js**

```javascript
// Fórmulas de cálculo de nómina

getValorHora(salario)
├─ Divide salario / 240 (horas mensuales)
└─ Retorna valor unitario

calcularHorasExtras(horasTrabajadas)
├─ Si > 240: (extras * 1.25)
└─ Retorna valor pago

calcularRecargosNocturnos(horasNocturnas)
├─ Horas 21:00-06:00
├─ Recargo 35%
└─ Retorna valor

calcularRecargos(turnos, periodo)
├─ Nocturnos
├─ Dominicales (+75%)
├─ Festivos (+100%)
└─ Retorna suma

calcularBruto(salario, extras, recargos, auxilio)
└─ Total devengado
```

---

## 🎨 Frontend - React + HTML

### Estructura HTML Estática

| Archivo | Propósito | Protección |
|---------|-----------|-----------|
| `login.html` | Login inicial | Pública |
| `dashboard.html` | Panel principal | Protegida (requiere sesión) |
| `usuarios.html` | Gestión de usuarios | Protegida (solo admin) |
| `index.html` | Home/redirect | Setup |

---

### React Apps

#### **turnos-react/** (Gestión de Turnos)

**Componentes:**

```
App.jsx (Principal)
├─ Estado global (módulo actual)
├─ Navbar con opciones
└─ Switch entre componentes

GestionEmpleados.jsx
├─ Listar empleados
├─ Crear nuevo
├─ Importar CSV
└─ Completar datos taquilleros

AsignacionTurnos.jsx
├─ Formulario para asignar
├─ Seleccionar empleado
├─ Seleccionar período
└─ Generar y guardar

AsignacionPorAreas.jsx
├─ Asignación masiva
├─ Seleccionar área
├─ Configure turnos automáticos
└─ Guardar múltiples

CalendarioSemanal.jsx
├─ Vista semanal
├─ Mostrar turnos asignados
├─ Colores por tipo
└─ Interactivo

ConsultaTurnos.jsx
├─ Buscar empleado
├─ Ver historial
├─ Exportar a Excel
└─ Genera reportes
```

**Utils:**
```javascript
excelGenerator.js
├─ Convierte datos a Excel
├─ Formato profesional
└─ Descarga automática

pdfGenerator.js
├─ Genera PDF
├─ Headers/footers
└─ Descarga automática
```

---

#### **nomina-react/** (Gestión de Nómina)

**Componentes:**

```
App.jsx (Principal)
├─ Estado global
├─ Selecciona modo
└─ Switch entre calcular

CalculoIndividual.jsx
├─ Seleccionar empleado
├─ Seleccionar mes/año
├─ Ver cálculo
├─ Descargar desprendible
└─ Guardar reporte

CalculoPorAreas.jsx
├─ Seleccionar área
├─ Mes/año
├─ Tabla de resumen
├─ Exportar Excel
└─ Guarda reporte grupal
```

**Utils:**
```javascript
excelGenerator.js     → Export a Excel masivo
pdfGenerator.js       → Desprendible individual
tablePdfGenerator.js  → Tabla PDF (múltiples)
```

---

## 💾 Base de Datos - MongoDB

### Estructura de Datos

```
Database: turnos_app

Collections:

┌─ usuarios
│  ├─ username (unique)
│  ├─ password (hash)
│  ├─ rol
│  └─ permisos

├─ empleados
│  ├─ documento (unique)
│  ├─ nombre
│  ├─ área
│  └─ salario

├─ turnos
│  ├─ empleadoId (ref Empleado)
│  ├─ turnoActual
│  └─ historialTurnos[] ← CRONOGRAMAS DÍA x DÍA

└─ (otras colecciones según necesidad)
```

---

### Índices Principales

```javascript
// usuarios
db.usuarios.createIndex({ username: 1 }, { unique: true });

// empleados
db.empleados.createIndex({ documento: 1 }, { unique: true });
db.empleados.createIndex({ area: 1 });

// turnos
db.turnos.createIndex({ empleadoId: 1 });
db.turnos.createIndex({ 'historialTurnos.fechaInicio': 1 });
```

---

## 📦 Tecnologías y Dependencias

### Backend Dependencies

```json
{
  "cors": "^2.8.5",                    // CORS headers
  "csv-parser": "^3.2.0",              // Parse CSV files
  "dayjs": "^1.11.19",                 // Date handling
  "dotenv": "^17.2.3",                 // Env variables
  "express": "^4.18.2",                // HTTP server
  "express-session": "^1.18.2",        // Session management
  "joi": "^18.0.1",                    // Data validation
  "jspdf": "^3.0.3",                   // PDF generation
  "mongodb": "^6.20.0",                // Driver directo (fallback)
  "mongoose": "^7.0.0",                // ODM para MongoDB
  "multer": "^2.0.2",                  // File upload
  "pdfkit": "^0.17.2",                 // PDF generation
  "bcryptjs": "(implicit)",            // Password hashing
  "helmet": "(implicit)",              // Security headers
}
```

### Frontend Dependencies

**turnos-react:**
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "vite": "^7.2.2",
  "@vitejs/plugin-react": "^5.1.1",
  "html2canvas": "^1.4.1",
  "jspdf": "^3.0.4",
  "jspdf-autotable": "^3.8.4"
}
```

**nomina-react:**
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "vite": "^7.2.2",
  "@vitejs/plugin-react": "^5.1.1",
  "html2canvas": "^1.4.1",
  "jspdf": "^3.0.4",
  "jspdf-autotable": "^3.8.4"
}
```

---

## 🏛️ Arquitectura de Capas

### Capa de Presentación (Frontend)

```
┌─────────────────────────────┐
│   HTML Estática             │
│  (login, dashboard, html)   │
└──────────────┬──────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
   ┌────────┐   ┌──────────┐
   │ Turnos │   │ Nómina   │
   │ React  │   │ React    │
   └────────┘   └──────────┘
        │             │
        └──────┬──────┘
               ▼
    Local State + API Calls
```

---

### Capa de Aplicación (Backend)

```
┌──────────────────────────┐
│  Express Routes          │ ← Define endpoints
├──────────────────────────┤
│  Middlewares Auth        │ ← Verifica sesión
├──────────────────────────┤
│  Controllers             │ ← Orquesta flujo
├──────────────────────────┤
│  Services                │ ← Lógica negocio
├──────────────────────────┤
│  Validators              │ ← Valida entrada
└──────────────────────────┘
```

---

### Capa de Datos (MongoDB)

```
┌──────────────────────────┐
│  Mongoose Models         │ ← Esquemas
├──────────────────────────┤
│  MongoDB Driver          │ ← Conexión
├──────────────────────────┤
│  Collections             │ ← Tablas
│  - usuarios              │
│  - empleados             │
│  - turnos (+ historial)  │
└──────────────────────────┘
```

---

## 📊 Flujo de Datos End-to-End

```
Usuario escribe en Frontend
         ↓
React captura evento
         ↓
Valida datos locally
         ↓
POST /api/[endpoint]
         ↓
Express recibe en route
         ↓
Middleware verifica sesión
         ↓
Controller ejecuta lógica
         ↓
Service procesa datos
         ↓
Validator verifica schema
         ↓
Mongoose conecta MongoDB
         ↓
MongoDB guarda documento
         ↓
Mongoose retorna resultado
         ↓
Service transforma resultado
         ↓
Controller formatea response
         ↓
Express envía JSON
         ↓
React recibe datos
         ↓
Actualiza UI
         ↓
✅ Usuario ve cambios
```

---

## ✅ Resumen Composición

| Layer | Tecnología | Propósito |
|-------|-----------|----------|
| **Presentation** | HTML5 + React + Vite | Interfaz usuario |
| **API** | Express.js | HTTP Endpoints |
| **Business Logic** | Node.js Services | Reglas negocio |
| **Data Access** | Mongoose + MongoDB | Persistencia |
| **Infrastructure** | Docker + Docker-Compose | Containerización |

El sistema está **totalmente modularizado**, permitiendo:
- ✅ Escalabilidad horizontal
- ✅ Testearidad
- ✅ Mantenibilidad
- ✅ Separación de concerns

