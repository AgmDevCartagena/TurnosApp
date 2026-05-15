# 🎯 Cómo Funciona el Sistema de Gestión Empresarial

**Versión:** 2.0.0  
**Última actualización:** 18 de febrero de 2026  
**Sistema:** UT PEREIRA AVANZA

---

## 📑 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Flujo de Usuarios](#flujo-de-usuarios)
3. [Módulo de Turnos](#módulo-de-turnos)
4. [Módulo de Nómina](#módulo-de-nómina)
5. [Integración entre Módulos](#integración-entre-módulos)
6. [Procesamiento de Datos](#procesamiento-de-datos)

---

## 🎯 Visión General

El sistema está diseñado como una **plataforma integrada** que une la **planificación de horarios** (Turnos) con el **cálculo de pagos** (Nómina).

### Flujo Principal

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO ACCEDE AL SISTEMA                │
│                   http://localhost:3001                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────────┐
              │   LOGIN / SESIÓN   │  (authController.js)
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
          │  - Turnos (selec.)   │
          │  - Nómina (selec.)   │
          └──────────────────────┘
```

---

## 👤 Flujo de Usuarios

### 1️⃣ Autenticación

**Archivo:** `backend/controllers/authController.js`  
**Ruta:** `POST /api/auth/login`

```javascript
// Proceso:
1. Usuario ingresa credenciales (username + password)
2. Sistema valida contra Base de Datos (colección 'usuarios')
3. Si es correcto: Crea sesión Express-Session
4. Si falla: Retorna error 401 Unauthorized

// Dato clave: Hash de contraseña usando bcrypt
// Sesión se mantiene por 24 horas (configurable)
```

**Roles y Permisos:**

| Rol | Acceso | Módulos | Áreas |
|-----|--------|---------|-------|
| `admin` | Total | Todos | Todas |
| `usuario` | Asignado | Módulos específicos | Asignadas |
| `consulta` | Solo lectura | Solo lectura de datos | Asignadas |

---

## 📅 Módulo de Turnos (Operacional)

El corazón del sistema. Gestiona **todos los horarios laborales** de los empleados.

### ¿Cómo Funciona?

#### **Paso 1: Importación de Empleados**

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
```

**Campos requeridos:**
- `documento` (único, clave primaria)
- `nombre`
- `área` (TAQUILLEROS, ADMINISTRATIVOS, CONDUCTORES, etc.)
- `cargo`
- `salario`

---

#### **Paso 2: Asignación de Turnos**

El sistema soporta **múltiples tipos de asignación** según el área:

##### **A) Taquilleros (Asignación Avanzada)**

```
┌─────────────────────────────────────────────┐
│   DATOS DE ENTRADA                          │
│  - Empleado                                 │
│  - Período de turnos (ej: Nov 1-30)         │
│  - Tabla de descanso (A, B, C, etc.)        │
│  - Subárea (MEGABUS, MEGACABLE)             │
│  - Horarios específicos por tipo (T100...)  │
└──────────────┬──────────────────────────────┘
               │
               ▼
    asignarTurnosTaquilleros() 
    (turnoController.js, línea ~1000)
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
   Cargar    Obtener
   Tabla de  Festivos
   Descanso  2025
        │     │
        └──┬──┘
           ▼
    Generar CRONOGRAMA DETALLADO
    (día por día durante el período)
           │
        ┌──┴──┬──────┬────────────┐
        ▼     ▼      ▼            ▼
     Área  Horario Festivo?   Descanso?
     └──┬──┘ └──┬──┘ └──┬──┘   └──┬──┘
        │       │       │        │
        └───────┼───────┼────────┘
                │
                ▼
    FOR CADA DÍA del período:
    ┌─────────────────────────────────┐
    │ Crear objeto CronogramaDetallado│
    │ {                               │
    │   fecha: "2025-11-16",         │
    │   diaSemana: "Domingo",        │
    │   tipoDay: "LABORABLE",        │
    │   horaInicio: "14:30",         │
    │   horaFin: "23:30",            │
    │   esFestivo: false,            │
    │   esDescanso: false,           │
    │   observaciones: "..."         │
    │ }                               │
    └─────────────────────────────────┘
           │
           ▼ (para todos los días)
    
    Guardar en MongoDB:
    Colección 'turnos'
    ├─ empleadoId (ref)
    ├─ turnoActual (estado actual)
    └─ historialTurnos[]
       └─ cronogramaDetallado[] ✅
```

**Características especiales:**
- ✅ Detecta automáticamente festivos de Colombia
- ✅ Aplica tablas de descanso según área
- ✅ Horarios diferentes por tipo de turno
- ✅ Historial completo de todos los turnos

---

##### **B) Administrativos (Asignación Automática)**

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
```

**Horario fijo:**
- Lunes a Viernes: 7:00 AM - 5:00 PM (10 horas)
- Sábado-Domingo: Descanso automático
- Festivos: Descanso automático

---

##### **C) Centro de Control (Rotativo Mañana/Tarde)**

```
DATO: Empleado + Período + Tabla de rotación

    ↓

    Alterna entre:
    - Turno Mañana: 05:00 - 14:30 (9.5 horas)
    - Turno Tarde: 14:30 - 23:30 (9 horas)

    ↓ Cada 7-15 días según configuración
    
    Guardar rotación + descansos
    
    ✅ Turnos rotativos aplicados
```

---

#### **Paso 3: Visualización de Turnos Asignados**

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

## 💰 Módulo de Nómina (Contable)

Calcula **automáticamente** la remuneración basada en turnos trabajados.

### ¿Cómo Funciona?

#### **Paso 1: Seleccionar Empleado y Período**

```
Usuario accede Módulo Nómina
         ↓
  Selecciona:
  - Empleado (de lista)
  - Mes (ej: Noviembre 2025)
  - Año (ej: 2025)
         ↓
  POST /api/nomina/calcular
```

---

#### **Paso 2: Lectura de Cronograma desde BD**

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

---

#### **Paso 3: Cálculo de Componentes de Nómina**

Para **cada día** en el cronograma:

```
┌─────────────────────────────────────────┐
│  Entrada: 1 Día de Turno                │
│  {                                      │
│    fecha: "2025-11-16",                │
│    horaInicio: "14:30",                │
│    horaFin: "23:30",                   │
│    esFestivo: false,                   │
│    tipoDay: "LABORABLE"                │
│  }                                      │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    ┌─────────┐ ┌────────┐ ┌──────────┐
    │ Horas   │ │¿Es     │ │¿Es       │
    │Normales │ │Noctr.? │ │Dominical?│
    │(14:30   │ │(21:00- │ │(Domingo) │
    │-23:30)  │ │ 06:00) │ │          │
    │= 9 hrs  │ │        │ │          │
    └────┬────┘ └───┬────┘ └────┬─────┘
         │          │           │
         ▼          ▼           ▼
         ┌──────────────────────────┐
         │  APLICAR TARIFA Y RECARGO│
         │                          │
         │ Horas normales:          │
         │  Salario / 240 * horas   │
         │                          │
         │ Recargo nocturno:        │
         │  +35% si 21:00-06:00    │
         │                          │
         │ Recargo dominical:       │
         │  +75% si domingo        │
         │                          │
         │ Recargo festivo:         │
         │  +100% si festival      │
         └────────────┬─────────────┘
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

---

#### **Paso 4: Generación de Reportes**

```
Backend genera objeto con cálculos
         ↓
    ┌────┴────┐
    ▼         ▼
  PDF      Excel
  │         │
  │ (PDFKit) (openpyxl)
  │         │
  └────┬────┘
       ▼
  Genera reportes
  descargables
       ▼
  ✅ Usuario descarga
```

**Datos en reporte:**
- Identificación del empleado
- Período laborado
- Horas trabajadas por concepto
- Valor de la hora
- Devengos
- Deducciones
- Neto a pagar

---

## 🔗 Integración entre Módulos

La integración es **directa y en tiempo real**:

```
MÓDULO TURNOS              MÓDULO NÓMINA
┌──────────────┐          ┌──────────────┐
│ Asigna Turno │          │              │
│   día 16     │──────►   │              │
│   7 turnos   │ MongoDB  │ Lee turnos   │
└──────────────┘          │ del empleado │
                          │   mes/año    │
                          │ Calcula......►
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

## ⚙️ Procesamiento de Datos

### Flujo de Persistencia (Guardado)

```
1. Frontend envía datos
          ↓
2. Express recibe (routes/turnos.js)
          ↓
3. Controlador procesa (controllers/turnoController.js)
          ↓
4. Servicio ejecuta lógica (services/*.js)
          ↓
5. Modelo valida Schema (models/Turno.js)
          ↓
6. Mongoose escribe en MongoDB
          ↓
✅ Dato guardado y persistido
```

---

### Estructura de Documento en BD

**Colección: `turnos` (un documento por empleado)**

```javascript
{
  _id: ObjectId("..."),
  empleadoId: ObjectId("51a..."),        // Referencia a empleado
  nombreEmpleado: "JUAN PÉREZ",
  documentoEmpleado: "80234567",
  
  // Turno actual/activo
  turnoActual: {
    area: "TAQUILLEROS",
    subarea: "MEGABUS",
    turno: "T100",
    fechaInicio: ISODate("2025-11-16"),
    fechaFin: ISODate("2025-11-30"),
    activo: true
  },
  
  // HISTORIAL: Array con todos los turnos anteriores + actuales
  historialTurnos: [
    {
      fechaInicio: ISODate("2025-11-16"),
      fechaFin: ISODate("2025-11-30"),
      area: "TAQUILLEROS",
      tablaDescanso: "A",
      
      // NUEVO EN v2.0: Cronograma DÍA por DÍA
      cronogramaDetallado: [
        {
          fecha: "2025-11-16",
          diaSemana: "Domingo",
          tipoDay: "LABORABLE",
          horaInicio: "14:30",
          horaFin: "23:30",
          esFestivo: false,
          esDescanso: false,
          observaciones: null
        },
        {
          fecha: "2025-11-17",
          diaSemana: "Lunes",
          tipoDay: "LABORABLE",
          horaInicio: "14:30",
          horaFin: "23:30",
          esFestivo: true,
          esDescanso: false,
          observaciones: "Festivo: Día de Independencia"
        },
        // ... más días
      ]
    }
    // ... más períodos anteriores
  ]
}
```

---

## 📊 Diagrama Completo de Interacciones

```
┌─────────────────────────────────────────────────────────────┐
│                       USUARIO FINAL                         │
│              (Administrador o Gerente RRHH)                 │
└────────────────⬆────────────────────────────┬───────────────┘
                 │ Accesa                      │ Ve reportes
                 │                             │
                 ▼                             ▼
        ┌─────────────────┐         ┌──────────────────┐
        │   FRONTEND      │         │   PDF/Excel      │
        │  HTML + React   │         │   Reportes       │
        └────────┬────────┘         └────────▲─────────┘
                 │                          │
         Request │                    Response
         (JSON)  │                    (Datos)
                 ▼                          │
        ┌─────────────────────────────────────┐
        │         EXPRESS SERVER              │
        │      (backend/server.js)            │
        │                                     │
        │  ┌─────────────────────┐           │
        │  │ Rutas               │           │
        │  ├─ /api/auth          │           │
        │  ├─ /api/turnos        │◄──────────┤
        │  └─ /api/nomina        │           │
        │                                     │
        │  ┌─────────────────────┐           │
        │  │ Controladores       │           │
        │  ├─ authController     │           │
        │  ├─ turnoController    │           │
        │  └─ nominaController   │           │
        │                                     │
        │  ┌─────────────────────┐           │
        │  │ Servicios           │           │
        │  ├─ turnosService      │           │
        │  ├─ festivosService    │           │
        │  ├─ tablasDescansoServ │           │
        │  └─ empleadosService   │           │
        │                                     │
        │  ┌─────────────────────┐           │
        │  │ Validadores         │           │
        │  └─ empleadoValidator  │           │
        │                                     │
        └────────────┬────────────────────────┘
                     │ Mongoose (ODM)
                     │ Queries
                     ▼
        ┌─────────────────────────────────────┐
        │     MONGODB (NoSQL Database)        │
        │                                     │
        │  Colecciones:                       │
        │  ├─ [usuarios]    ← Credenciales   │
        │  ├─ [empleados]   ← Personal       │
        │  ├─ [turnos]      ← Cronogramas   │
        │  └─ [otros]                        │
        │                                     │
        │  Índices: documento (único)        │
        │  Storage: turnos_app BD            │
        └─────────────────────────────────────┘
```

---

## 🔄 Ciclo de Vida de un Turno

```
ESTADO 1: CREACIÓN
    ↓
Usuario selecciona empleado y período

ESTADO 2: GENERACIÓN DE CRONOGRAMA
    ↓
Sistema calcula:
- Tabla de descanso
- Festivos
- Horarios específicos

ESTADO 3: VALIDACIÓN
    ↓
Verificar:
- Superpuestos (NO)
- Datos válidos (SÍ)
- Empleado existe (SÍ)

ESTADO 4: PERSISTENCIA
    ↓
Guardar en MongoDB

ESTADO 5: LECTURA EN NÓMINA
    ↓
Módulo nómina lee automáticamente

ESTADO 6: CÁLCULO DE PAGO
    ↓
Genera componentes salariales

ESTADO 7: REPORTE
    ↓
Usuario descarga desprendible PDF/Excel

✅ CICLO COMPLETADO
```

---

## 📝 Resumen de Componentes Clave

| Componente | Ubicación | Responsabilidad |
|-----------|-----------|-----------------|
| Server | `backend/server.js` | Punto de entrada, middleware |
| Auth | `routes/auth.js` | Autenticación y sesiones |
| Turnos | `routes/turnos.js` | Endpoints de turnos |
| Nómina | `routes/nominaRoutes.js` | Endpoints de nómina |
| TurnoCtrl | `controllers/turnoController.js` | Lógica de turnos (3624 líneas) |
| NominaCtrl | `controllers/nominaController.js` | Lógica de nómina |
| TurnoSvc | `services/turnosService.js` | Generación de turnos |
| Festivos | `services/festivosService.js` | Cálculo de festivos |
| Descanso | `services/tablasDescansoService.js` | Tablas de rotación |
| Turno | `models/Turno.js` | Schema MongoDB de turnos |
| Empleado | `models/Empleado.js` | Schema de empleados |
| Usuario | `models/Usuario.js` | Schema de usuarios |

---

## ✅ Conclusión

El sistema funciona como un **flujo integrado**:

1. **Usuario entra** → Auténtica
2. **Carga empleados** → Se guardan en BD
3. **Asigna turnos** → Sistema calcula cronograma día a día
4. **Visualiza en calendario** → Ve confirmación
5. **Accede a Nómina** → Lee automáticamente los turnos
6. **Genera reporte** → Calcula pago basado en turnos
7. **Descarga PDF/Excel** → Tiene desprendible de pago listo

Todo en **tiempo real**, sin pasos manuales entre módulos. 🎯

