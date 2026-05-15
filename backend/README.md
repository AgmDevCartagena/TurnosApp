# Sistema de Gestión de Turnos - Backend

Sistema completo para la gestión de turnos de empleados en diferentes áreas operativas.

## 🚀 Características

- ✅ **Gestión de Empleados**: CRUD completo con carga masiva desde CSV
- ✅ **Turnos por Área**: Administrativos, Centro de Control, Operaciones, Conductores, Mantenimiento
- ✅ **Historial de Turnos**: Un documento por empleado con historial completo
- ✅ **Cronogramas Detallados**: Día por día con horarios, festivos y descansos
- ✅ **API RESTful**: Endpoints organizados y documentados
- ✅ **MongoDB**: Base de datos optimizada con índices

## 📋 Requisitos

- Node.js >= 14
- MongoDB (local o remoto)
- npm o yarn

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start

# Modo desarrollo (con nodemon)
npm run dev
```

## 🌐 Endpoints Principales

### Empleados
- `GET /api/turnos/empleados` - Listar todos los empleados
- `POST /api/turnos/empleados` - Crear empleado individual
- `POST /api/turnos/empleados/csv` - Carga masiva desde CSV
- `GET /api/turnos/empleado/:id/historial` - Historial de turnos de un empleado

### Asignación de Turnos
- `POST /api/turnos/asignar-administrativos` - Turnos administrativos (Lun-Vie 8am-4pm)
- `POST /api/turnos/asignar-centro-control` - Turnos rotativos mañana/tarde
- `POST /api/turnos/asignar-operaciones` - Turnos rotativos mañana/tarde
- `POST /api/turnos/asignar-conductores` - Horarios personalizados
- `POST /api/turnos/asignar-mantenimiento` - Horarios personalizados

### Utilidades
- `GET /api/turnos/festivos` - Festivos de Colombia 2025
- `POST /api/turnos/generar-festivos` - Generar festivos para cualquier año
- `POST /api/turnos/generar-tablas-descanso` - Generar tablas de descanso

## 🏢 Áreas de Trabajo

### 1. **ADMINISTRACIÓN**
- **Horario**: Lunes a Viernes 8:00am - 4:00pm (8 horas diurnas)
- **Descanso**: Sábados, domingos y festivos
- **Tipo**: Turno fijo

### 2. **CENTRO DE CONTROL**
- **Turnos**: Mañana (4:30-12:30) / Tarde (15:30-23:30)
- **Rotación**: Semanal o quincenal
- **Horarios especiales**: Sábados, domingos y festivos

### 3. **OPERACIONES**
- **Turnos**: Mañana (5:00-13:00) / Tarde (13:00-21:00)
- **Rotación**: Semanal o quincenal
- **Horarios especiales**: Sábados, domingos y festivos

### 4. **CONDUCTORES**
- **Horario**: Personalizado con días de descanso
- **Configuración**: Flexible por empleado

### 5. **MANTENIMIENTO**
- **Horario**: Personalizado con días de descanso
- **Configuración**: Flexible por empleado

## 📁 Estructura del Proyecto

```
backend/
├── controllers/        # Lógica de controladores
│   └── turnoController.js
├── models/            # Modelos de MongoDB
│   ├── Empleado.js
│   └── Turno.js
├── services/          # Lógica de negocio
│   ├── empleadosService.js
│   ├── turnosService.js
│   ├── festivosService.js
│   └── tablasDescansoService.js
├── routes/            # Definición de rutas
│   └── turnos.js
├── utils/             # Utilidades y helpers
│   └── festivos2025.json
├── scripts/           # Scripts de mantenimiento
│   ├── limpiezaCompleta.js
│   ├── consolidarTurnos.js
│   └── migrarTurnosAHistorial.js
├── docs/              # Documentación
├── server.js          # Punto de entrada
└── package.json       # Dependencias
```

## 🗄️ Modelo de Datos

### Empleado
```javascript
{
  nombre: String,
  documento: String (único),
  cargo: String,
  area: String [TAQUILLEROS, CONDUCTORES, MANTENIMIENTO, OPERACIONES, ADMINISTRACION, CENTRO DE CONTROL],
  salario: Number
}
```

### Turno (Un documento por empleado)
```javascript
{
  empleadoId: ObjectId,
  nombreEmpleado: String,
  documentoEmpleado: String,
  turnoActual: {
    area: String,
    turno: String,
    fechaInicio: Date,
    fechaFin: Date,
    activo: Boolean
  },
  historialTurnos: [{
    area: String,
    turno: String,
    fechaInicio: Date,
    fechaFin: Date,
    cronogramaDetallado: [{
      fecha: String,
      diaSemana: String,
      tipoDay: String,
      horaInicio: String,
      horaFin: String,
      observaciones: String
    }],
    activo: Boolean,
    fechaCreacion: Date
  }]
}
```

## 🔧 Scripts de Mantenimiento

### Limpieza Completa
```bash
node scripts/limpiezaCompleta.js
```
Verifica:
- Conexión a MongoDB
- Estado de colecciones
- Índices
- Duplicados
- Archivos del sistema

### Consolidar Turnos
```bash
node scripts/consolidarTurnos.js
```
Consolida múltiples documentos de turno de un mismo empleado en uno solo.

### Migrar Turnos
```bash
node scripts/migrarTurnosAHistorial.js
```
Migra turnos antiguos al nuevo formato con historial.

## 🌍 Variables de Entorno

```bash
# Opcional - por defecto usa localhost
MONGO_URI=mongodb://localhost:27017/turnos_app
PORT=3001
```

## 📊 Estado del Sistema

Después de la limpieza:
- ✅ Conexión MongoDB: Funcional
- ✅ Base de datos: turnos_app (limpia)
- ✅ Colecciones: empleados, turnos
- ✅ Índices: Optimizados
- ✅ Código: Limpio y comentado
- ✅ Documentación: Organizada en /docs

## 🆘 Solución de Problemas

### Servidor no inicia
```bash
# Verificar que MongoDB esté corriendo
# Detener procesos de Node existentes
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
```

### Base de datos vacía
```bash
# Cargar empleados desde la interfaz web
# O usar el endpoint POST /api/turnos/empleados/csv
```

### Errores de índices
```bash
# Ejecutar limpieza completa
node scripts/limpiezaCompleta.js
```

## 📝 Changelog

### v1.0.0 (13/11/2025)
- ✅ Limpieza completa del código
- ✅ Horario administrativo actualizado a 8 horas (8am-4pm)
- ✅ Índices optimizados y habilitados
- ✅ Manejo de errores activado
- ✅ Documentación organizada
- ✅ Estructura de archivos limpia

## 👥 Autor

Sistema desarrollado para UT PEREIRA AVANZA

## 📄 Licencia

Uso interno - UT PEREIRA AVANZA
