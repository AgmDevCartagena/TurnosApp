# 🔌 Referencia Rápida de API REST

**Versión:** 2.0.0  
**Base URL:** `http://localhost:3001/api`

---

## 📑 Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Empleados](#empleados)
3. [Turnos](#turnos)
4. [Nómina](#nómina)
5. [Códigos de Estado HTTP](#códigos-de-estado-http)
6. [Ejemplos cURL](#ejemplos-curl)

---

## 🔐 Autenticación

Todos los endpoints requieren **autenticación por sesión** excepto `/api/auth/login`.

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
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "username": "admin",
    "nombre": "Administrador",
    "rol": "admin"
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "message": "Usuario o contraseña incorrectos"
}
```

---

### POST `/api/auth/logout`

Cerrar sesión y destruir sesión.

**Request:** (No requiere body)

**Response (200):**
```json
{
  "success": true,
  "message": "Logout exitoso"
}
```

---

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

**Response (401):**
```json
{
  "autenticado": false,
  "message": "No hay sesión activa"
}
```

---

## 👥 Empleados

### GET `/api/turnos/empleados`

Obtener lista de **todos** los empleados.

**Query Parameters:**
```
?area=TAQUILLEROS     # Filtrar por área
?estado=activo        # Filtrar por estado
?search=Juan          # Buscar por nombre/documento
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
    },
    {
      "_id": "65a1b2c3d4e5f6g8",
      "documento": "80234568",
      "nombre": "MARÍA GARCÍA",
      "area": "ADMINISTRATIVOS",
      "cargo": "AUXILIAR",
      "salario": 1200000,
      "estado": "activo"
    }
  ]
}
```

---

### POST `/api/turnos/empleados`

Crear un **nuevo** empleado.

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
  "empleado": {
    "_id": "65a1b2c3d4e5f6g9",
    "documento": "80234570",
    "nombre": "CARLOS LÓPEZ",
    "area": "CONDUCTORES",
    ...
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "El documento 80234570 ya existe"
}
```

---

### POST `/api/turnos/empleados/csv`

Importar **múltiples** empleados desde CSV.

**Request:** (multipart/form-data)
```
Content-Type: multipart/form-data
file: [employees.csv archive]
```

**CSV Format:**
```csv
documento,nombre,area,cargo,salario
80234567,JUAN PÉREZ,TAQUILLEROS,OPERADOR,1500000
80234568,MARÍA GARCÍA,ADMINISTRATIVOS,AUXILIAR,1200000
```

**Response (200):**
```json
{
  "success": true,
  "importados": 2,
  "rechazados": 0,
  "mensaje": "Import completado exitosamente"
}
```

---

### POST `/api/turnos/empleados/carga-masiva`

Carga masiva con validación detallada.

**Request:** (multipart/form-data)
```
file: [employees.csv archive]
```

**Response (200):**
```json
{
  "exitosos": 45,
  "errors": [],
  "duplicados": [],
  "importResume": {
    "total": 45,
    "areas": {
      "TAQUILLEROS": 15,
      "ADMINISTRATIVOS": 12,
      "CONDUCTORES": 18
    }
  }
}
```

---

## 📅 Turnos

### POST `/api/turnos/asignar-taquilleros`

Asignar turno **avanzado** con cronograma día-a-día para taquilleros.

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
    "fechaInicio": "2025-11-16",
    "fechaFin": "2025-11-30",
    "cronogramaDetallado": [
      {
        "fecha": "2025-11-16",
        "diaSemana": "Domingo",
        "tipoDay": "LABORABLE",
        "horaInicio": "14:30",
        "horaFin": "23:30",
        "esFestivo": false,
        "esDescanso": false
      },
      ...
    ],
    "diasGenerados": 15
  }
}
```

---

### POST `/api/turnos/asignar-administrativos`

Asignar turno **automático** para administrativos (7am-5pm Lun-Vie).

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
    "empleadoId": "65a1b2c3d4e5f6g7",
    "tipo": "ADMINISTRATIVO",
    "horarioFijo": "07:00 - 17:00",
    "diasAsignados": 22,
    "diasDescanso": 8
  }
}
```

---

### POST `/api/turnos/asignar-centro-control`

Asignar turno **rotativo** para Centro de Control.

**Request:**
```json
{
  "empleadoId": "65a1b2c3d4e5f6g7",
  "fechaInicio": "2025-11-01",
  "fechaFin": "2025-11-30",
  "tablaRotacion": "CC_MANUAL"
}
```

**Response (201):**
```json
{
  "success": true,
  "turno": {
    "tipo": "ROTATIVO_MORNING_EVENING",
    "turnoMañana": "05:00 - 14:30",
    "turnoTarde": "14:30 - 23:30",
    "rotacionCada": "7 días"
  }
}
```

---

### GET `/api/turnos/empleado/:id/historial`

Obtener **historial completo** de turnos del empleado.

**Response (200):**
```json
{
  "empleadoId": "65a1b2c3d4e5f6g7",
  "nombreEmpleado": "JUAN PÉREZ",
  "turnoActual": {
    "area": "TAQUILLEROS",
    "fechaInicio": "2025-11-16",
    "fechaFin": "2025-11-30",
    "activo": true
  },
  "historialTurnos": [
    {
      "fechaInicio": "2025-11-16",
      "fechaFin": "2025-11-30",
      "cronogramaDetallado": [
        {
          "fecha": "2025-11-16",
          "horaInicio": "14:30",
          "horaFin": "23:30",
          "esFestivo": false,
          "esDescanso": false
        }
      ]
    }
  ]
}
```

---

### GET `/api/turnos/empleado/:id/turno-actual`

Obtener **solo** el turno actual activo.

**Response (200):**
```json
{
  "empleadoId": "65a1b2c3d4e5f6g7",
  "turnoActual": {
    "area": "TAQUILLEROS",
    "fechaInicio": "2025-11-16T00:00:00.000Z",
    "fechaFin": "2025-11-30T00:00:00.000Z",
    "activo": true,
    "diasTotales": 15
  }
}
```

---

### POST `/api/turnos/generar-turnos-area`

Generar turnos para **múltiples empleados** de un área.

**Request:**
```json
{
  "area": "ADMINISTRATIVOS",
  "fechaInicio": "2025-11-01",
  "fechaFin": "2025-11-30"
}
```

**Response (200):**
```json
{
  "success": true,
  "area": "ADMINISTRATIVOS",
  "turnosGenerados": 45,
  "empleadosAfectados": 45,
  "fechaInicio": "2025-11-01",
  "fechaFin": "2025-11-30"
}
```

---

## 💰 Nómina

### POST `/api/nomina/calcular`

Calcular nómina para **un empleado** en un período.

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
  "empleado": {
    "nombre": "JUAN PÉREZ",
    "documento": "80234567",
    "area": "TAQUILLEROS"
  },
  "periodo": "Noviembre 2025",
  "detalle": {
    "horasNormales": 120,
    "horasExtras": 5,
    "recargoNocturno": 30,
    "recargoDominical": 10,
    "recargoFestivo": 8
  },
  "montos": {
    "salarioBase": 1500000,
    "horasNormales": 750000,
    "horasExtras": 93750,
    "recargoNocturno": 313860,
    "recargoDominical": 135620,
    "recargoFestivo": 271240,
    "auxilioTransporte": 140000
  },
  "devengos": 1704470,
  "deducciones": {
    "salud": 68179,
    "pension": 68179
  },
  "deduccionTotal": 136358,
  "netoPagar": 1568112
}
```

---

### POST `/api/nomina/calcular-masiva-desde-turnos`

Calcular nómina para **múltiples empleados**.

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
  "mes": 11,
  "anio": 2025,
  "empleadosCalculados": 15,
  "nominas": [
    {
      "nombreEmpleado": "JUAN PÉREZ",
      "devengado": 1704470,
      "deducciones": 136358,
      "netoPagar": 1568112
    }
  ],
  "totalDevengado": 25567050,
  "totalDeducciones": 2045073,
  "totalNetoPagar": 23521977
}
```

---

### GET `/api/nomina/empleado/:id/:mes/:anio`

Obtener nómina **previamente calculada**.

**Response (200):**
```json
{
  "id": "65a1b2c3d4e5f6g7",
  "empleado": "Juan Pérez",
  "periodo": "Noviembre 2025",
  "devengado": 1704470,
  "neto": 1568112
}
```

---

## 📊 Configuración

### POST `/api/turnos/generar-festivos`

Generar **todos** los festivos de un año.

**Request:**
```json
{
  "anio": 2026
}
```

**Response (200):**
```json
{
  "success": true,
  "anio": 2026,
  "festivos": [
    {
      "fecha": "2026-01-01",
      "nombre": "Año Nuevo"
    },
    {
      "fecha": "2026-01-12",
      "nombre": "San Vicente de Paúl"
    }
  ],
  "total": 18
}
```

---

### POST `/api/turnos/generar-tablas-descanso`

Generar **tablas de descanso** (A, B, C) para un año.

**Request:**
```json
{
  "anio": 2026,
  "tablas": ["A", "B", "C"]
}
```

**Response (200):**
```json
{
  "success": true,
  "anio": 2026,
  "tablasGeneradas": {
    "A": [
      "2026-01-01",
      "2026-01-02"
    ],
    "B": [...],
    "C": [...]
  }
}
```

---

## 🔄 Códigos de Estado HTTP

| Código | Significado | Cuando ocurre |
|--------|-------------|--------------|
| **200** | OK | Solicitud exitosa |
| **201** | Created | Recurso creado exitosamente |
| **400** | Bad Request | Datos inválidos o incompletos |
| **401** | Unauthorized | No autenticado o sesión expirada |
| **403** | Forbidden | No tiene permisos |
| **404** | Not Found | Recurso no existe |
| **409** | Conflict | Datos duplicados/conflictivos |
| **500** | Server Error | Error interno del servidor |

---

## 📡 Ejemplos cURL

### Ejemplo 1: Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

---

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

---

### Ejemplo 3: Asignar Turno Taquilleros

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

---

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

### Ejemplo 5: Obtener Historial Empleado

```bash
curl -X GET http://localhost:3001/api/turnos/empleado/65a1b2c3d4e5f6g7/historial \
  -H "Content-Type: application/json"
```

---

## 🔑 Headers Requeridos

Todos los requests (excepto login) deben incluir:

```
Content-Type: application/json
Cookie: connect.sid=[SESSION_ID]  # Automático si usas navegador
```

---

## 📚 Estructura Completa de Respuesta

Todas las respuestas siguen este formato:

```json
{
  "success": true,              // Booleano
  "message": "Operación exitosa",
  "data": {},                   // Datos específicos
  "timestamp": "2025-11-18T...",
  "error": null                 // null si success=true
}
```

---

## ⚠️ Manejo de Errores

Si algo falla:

```json
{
  "success": false,
  "error": "El documento ya existe",
  "code": "DUPLICATE_ENTRY",
  "details": {
    "field": "documento",
    "value": "80234567"
  }
}
```

---

## ✅ Validaciones Automáticas

El sistema valida automáticamente:

- ✅ Email válido (si aplica)
- ✅ Documento único
- ✅ Área válida
- ✅ Salario > 0
- ✅ Fechas coherentes
- ✅ Usuario autenticado

---

## 🚀 Próximos Pasos

Para más detalles:
- 📚 [DOCUMENTACION_TECNICA_COMPLETA.md](DOCUMENTACION_TECNICA_COMPLETA.md)
- 🔄 [COMO_FUNCIONA.md](COMO_FUNCIONA.md)
- 🏗️ [COMPOSICION_SISTEMA.md](COMPOSICION_SISTEMA.md)

