# 🏢 Sistema Integrado de Gestión Empresarial

**Desarrollado para:** UT PEREIRA AVANZA  
**Versión:** 2.0.0 | **Fecha:** 18 de febrero de 2026

---

## ⚡ Descripción Rápida

Sistema empresarial integrado que unifica la gestión de **turnos** y **nómina** en una plataforma web única:

| Módulo | Responsabilidad | Entrada | Salida |
|--------|-----------------|---------|--------|
| **📅 Turnos** | Asignación de horarios y cronogramas | Empleados + Período | Cronogramas día-a-día |
| **💰 Nómina** | Cálculo de salarios y prestaciones | Turnos trabajados | Desprendibles PDF/Excel |

**Integración:** Los turnos se leen automáticamente para calcular la nómina ✅

---

## 🚀 Comienza Aquí

### Para Instalación (Primera vez)
👉 **[GUIA_INSTALACION.md](GUIA_INSTALACION.md)** - Guía paso a paso
- Requisitos del sistema
- Instalación local o Docker
- Configuración inicial
- Primeros pasos

### Para Entender Cómo Funciona
👉 **[COMO_FUNCIONA.md](COMO_FUNCIONA.md)** - Flujos y procesos
- Visión general del sistema
- Módulo de Turnos detallado
- Módulo de Nómina detallado
- Cómo se integran

### Para Entender la Estructura
👉 **[COMPOSICION_SISTEMA.md](COMPOSICION_SISTEMA.md)** - Arquitectura técnica
- Backend (Node.js, controllers, services)
- Frontend (React + HTML)
- Base de datos (MongoDB)
- Capas y flujos de datos

### Para Desarrolladores
👉 **[API_REFERENCE.md](API_REFERENCE.md)** - Endpoints y ejemplos
- Autenticación
- Empleados
- Turnos
- Nómina
- Ejemplos cURL

### Índice Completo de Documentación
👉 **[INDICE_DOCUMENTACION.md](INDICE_DOCUMENTACION.md)**
- Todos los documentos
- Guías por rol
- Búsqueda por tema
- Casos de uso

---

## 📊 Características Principales

### ✅ Módulo de Turnos

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

### ✅ Módulo de Nómina

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

## 🌍 Acceso al sistema

Una vez instalado:

```
🌐 Acceso Principal:      http://localhost:3001
📅 Módulo de Turnos:      http://localhost:3001/turnos
💰 Módulo de Nómina:      http://localhost:3001/nomina
👤 Panel de Usuarios:     http://localhost:3001/usuarios (solo admin)
```

**Credenciales de prueba:**
```
Usuario: admin
Contraseña: admin123
⚠️ Cambiar en producción
```

---

## 🏗️ Estructura del Proyecto

```
turnos_app/
├── 📄 GUIA_INSTALACION.md         ← Instala aquí
├── 📄 COMO_FUNCIONA.md             ← Entiende aquí
├── 📄 COMPOSICION_SISTEMA.md       ← Aprende aquí
├── 📄 API_REFERENCE.md             ← API endpoints
├── 📄 INDICE_DOCUMENTACION.md      ← Índice completo
├── 📄 DOCUMENTACION_TECNICA_COMPLETA.md
├── 📄 LIMPIEZA_REALIZADA.md
│
├── ⚙️ Docker
│   ├── Dockerfile                  ← Imagen aplicación
│   ├── docker-compose.yml          ← Orquestación
│   ├── docker-start.ps1            ← Iniciar (Windows)
│   └── docker-stop.ps1             ← Detener (Windows)
│
├── 📁 backend/
│   ├── 📄 server.js                ← Punto entrada
│   ├── 📂 controllers/             ← Lógica de negocio
│   ├── 📂 routes/                  ← Endpoints API
│   ├── 📂 models/                  ← Esquemas MongoDB
│   ├── 📂 services/                ← Servicios modulares
│   ├── 📂 middlewares/             ← Autenticación
│   ├── 📂 validators/              ← Validación datos
│   ├── 📂 utils/                   ← Utilidades
│   ├── 📂 scripts/                 ← Scripts útiles
│   ├── 📂 docs/                    ← Documentación interna
│   ├── 📄 package.json
│   └── 📄 .env                     ← Variables secretas
│
├── 📁 frontend/
│   ├── 📄 login.html               ← Formulario login
│   ├── 📄 dashboard.html           ← Panel principal
│   ├── 📄 usuarios.html            ← Gestión usuarios (admin)
│   ├── 📂 turnos-react/            ← App React Turnos
│   ├── 📂 nomina-react/            ← App React Nómina
│   ├── 📂 turnos-build/            ← Build compilado (Turnos)
│   └── 📂 nomina-build/            ← Build compilado (Nómina)
│
└── 📁 uploads/                     ← Archivos subidos
    └── (CSVs importados)
```

---

## 🔌 API Principal - Endpoints

### Autenticación
```
POST   /api/auth/login              ← Login
POST   /api/auth/logout             ← Logout
GET    /api/auth/verificar-sesion   ← Verificar sesión
```

### Empleados
```
GET    /api/turnos/empleados        ← Listar empleados
POST   /api/turnos/empleados        ← Crear empleado
POST   /api/turnos/empleados/csv    ← Importar CSV masivo
```

### Turnos
```
POST   /api/turnos/asignar-taquilleros             ← Turnos avanzados
POST   /api/turnos/asignar-administrativos         ← Turnos automáticos
POST   /api/turnos/asignar-centro-control          ← Turnos rotativos
POST   /api/turnos/asignar-operaciones             ← Operaciones
POST   /api/turnos/asignar-conductores             ← Conductores
POST   /api/turnos/asignar-mantenimiento           ← Mantenimiento
GET    /api/turnos/empleado/:id/historial          ← Historial turnos
GET    /api/turnos/empleado/:id/turno-actual       ← Turno actual
```

### Nómina
```
POST   /api/nomina/calcular                        ← Calcular 1 empleado
POST   /api/nomina/calcular-masiva-desde-turnos    ← Calcular múltiples
```

**Para detalle completo:** [API_REFERENCE.md](API_REFERENCE.md)

---

## 💾 Base de Datos

### MongoDB Collections

```javascript
// usuarios - Credenciales y permisos
{
  username: "admin",
  password: "hash",
  rol: "admin",
  modulosPermitidos: ["turnos", "nomina"]
}

// empleados - Información de personal
{
  documento: "80234567" (único),
  nombre: "Juan Pérez",
  area: "TAQUILLEROS",
  cargo: "Operador",
  salario: 1500000
}

// turnos - UN documento por empleado + historial completo
{
  empleadoId: ObjectId,
  turnoActual: { ... },
  historialTurnos: [{
    cronogramaDetallado: [{
      fecha: "2025-11-16",
      horaInicio: "14:30",
      horaFin: "23:30",
      esFestivo: false,
      esDescanso: false
    }]
  }]
}
```

---

## 🛠️ Stack Tecnológico

### Backend
- **Runtime:** Node.js 14+ (v18 recomendado)
- **Framework:** Express.js
- **Base Datos:** MongoDB 4.4+
- **ODM:** Mongoose
- **Autenticación:** express-session
- **Validación:** Joi
- **PDF:** PDFKit, jsPDF
- **Reportes:** Excel, CSV

### Frontend
- **Principal:** HTML5 + CSS3 + Vanilla JavaScript
- **Módulos Complejos:** React 19.2
- **Build Tool:** Vite
- **Descarga Reportes:** jsPDF, html2canvas

### Infraestructura
- **Containerización:** Docker + Docker Compose
- **Base Datos:** MongoDB
- **Puertos:** Aplicación (3001), MongoDB (27017/27018)

---

## 📚 Flujo de Datos

```
┌─────────────────────────────┐
│   Usuario (Navegador)       │
└──────────────┬──────────────┘
               │
        Request HTTP (JSON)
               │
               ▼
┌─────────────────────────────────────┐
│   Express Server (Node.js)          │
│  - Routes (endpoints)               │
│  - Controllers (lógica)             │
│  - Services (negocio)               │
│  - Validators (validación)          │
└──────────────┬──────────────────────┘
               │
         Mongoose (ODM)
               │
               ▼
┌─────────────────────────────┐
│   MongoDB Database          │
│  - usuarios                 │
│  - empleados                │
│  - turnos (+ historial)     │
└─────────────────────────────┘
```

**Resultado:** Nómina calculada automáticamente ✅

---

## ⚡ Inicio Rápido (5 minutos)

### 1. Instalación
```bash
# Clonar/descargar proyecto
cd turnos_app

# Instalar dependencias
cd backend
npm install

# Crear archivo .env
# (Copiar backend/.env.example si existe)

# Iniciar
npm start
```

### 2. Acceder
- Abrir http://localhost:3001
- Username: `admin`
- Password: `admin123`

### 3. Crear empleados
- Módulo Turnos → Gestión Empleados
- "Crear Nuevo" o "Importar CSV"

### 4. Asignar turno
- Módulo Turnos → Asignación
- Seleccionar empleado + período
- "Generar Cronograma"

### 5. Calcular nómina
- Módulo Nómina → Cálculo Individual
- Seleccionar empleado + mes
- "Descargar PDF"

**Para guía detallada:** [GUIA_INSTALACION.md](GUIA_INSTALACION.md)

---

## ✅ Verificación de Instalación

Si todo está bien, verás:

```
✅ MongoDB conectado
✅ Servidor corriendo en puerto 3001
✅ Frontend cargando
✅ Puedes hacer login
✅ Puedes crear empleados
✅ Puedes asignar turnos
✅ Puedes calcular nómina
✅ Puedes descargar reportes
```

---

## 🆘 Problemas Comunes

### No puedo conectar a MongoDB
→ [GUIA_INSTALACION.md - Troubleshooting](GUIA_INSTALACION.md#-troubleshooting)

### Puerto 3001 está en uso
→ Cambiar en `backend/.env`: `PORT=3002`

### Login no funciona
→ Crear usuario admin: `node` → Script en [GUIA_INSTALACION.md](GUIA_INSTALACION.md)

### Módulo React no carga
→ Reconstruir: `npm run build` en `frontend/turnos-react/`

**Para más:** [GUIA_INSTALACION.md - Troubleshooting](GUIA_INSTALACION.md#-troubleshooting)

---

## 📖 Documentation Roadmap

| Para | Documento | Tiempo |
|-----|-----------|--------|
| Instalar el sistema | [GUIA_INSTALACION.md](GUIA_INSTALACION.md) | 15 min |
| Entender flujos | [COMO_FUNCIONA.md](COMO_FUNCIONA.md) | 30 min |
| Entender código | [COMPOSICION_SISTEMA.md](COMPOSICION_SISTEMA.md) | 40 min |
| Usar API | [API_REFERENCE.md](API_REFERENCE.md) | 20 min |
| Referencia rápida | [DOCUMENTACION_TECNICA_COMPLETA.md](DOCUMENTACION_TECNICA_COMPLETA.md) | 10 min |

**Índice completo:** [INDICE_DOCUMENTACION.md](INDICE_DOCUMENTACION.md) ← **Empieza aquí si estás perdido**

---

## 🎯 Casos de Uso Típicos

### Caso 1: Soy gerente, necesito entender el sistema
1. Lee: [COMO_FUNCIONA.md](COMO_FUNCIONA.md) (30 min)
2. Accede a: http://localhost:3001
3. Crea algunos empleados y turnos

### Caso 2: Soy desarrollador, debo agregar una característica
1. Lee: [COMPOSICION_SISTEMA.md](COMPOSICION_SISTEMA.md) (40 min)
2. Lee: [API_REFERENCE.md](API_REFERENCE.md) (20 min)
3. Modifica archivos en `backend/`
4. Prueba con cURL o Postman

### Caso 3: Es mi primer día y no sé nada
1. Lee: [GUIA_INSTALACION.md](GUIA_INSTALACION.md) (15 min)
2. Instala el sistema
3. Lee: [COMO_FUNCIONA.md](COMO_FUNCIONA.md) (30 min)
4. Experimenta con la app

### Caso 4: Necesito desplegar en producción
1. Lee: [GUIA_INSTALACION.md - Docker](GUIA_INSTALACION.md#-instalación-con-docker)
2. Configura variables `backend/.env`
3. Ejecuta: `docker-compose up --build`

---

## 🔒 Seguridad

- ✅ Variables sensibles en `.env` (no en código)
- ✅ Sesiones seguras con httpOnly cookies
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Validación de datos con Joi
- ✅ CORS habilitado para desarrollo
- ⚠️ **Recuerda:** Cambiar SESSION_SECRET y contraseña admin en producción

---

## 📊 Estadísticas del Proyecto

```
Backend:
├── Controllers: 3,624 líneas (turnoController)
├── Services: 1,100+ líneas (turnosService, etc.)
├── Models: 300+ líneas (Turno, Empleado, Usuario)
└── Total Backend: 5,000+ líneas

Frontend:
├── React Components: 6 componentes principales
├── HTML Estático: 4 páginas (login, dashboard, etc.)
└── Total Frontend: 2,000+ líneas

Documentación:
└── 6 documentos técnicos completos (30,000+ palabras)

Base de Datos:
└── 3 colecciones principales (usuarios, empleados, turnos)
```

---

## 🚀 Mejoras Futuras

- [ ] Dashboard con gráficos y estadísticas
- [ ] Notificaciones por email
- [ ] Integración con nómina empresarial (nomina-oficial)
- [ ] Mobile app (React Native)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Tests automatizados (Jest, MongoDB Server)
- [ ] CI/CD pipeline (GitHub Actions)

---

## 👥 Equipo

**Desarrollado para:** UT PEREIRA AVANZA  
**Versión:** 2.0.0  
**Fecha de Actualización:** 18 de febrero de 2026  
**Estado:** ✅ Producción

---

## 📞 Soporte

**Si tienes problemas:**

1. Revisa [GUIA_INSTALACION.md - Troubleshooting](GUIA_INSTALACION.md#-troubleshooting)
2. Verifica los logs: `npm run dev` o `docker-compose logs`
3. Consulta [INDICE_DOCUMENTACION.md](INDICE_DOCUMENTACION.md) por tema
4. Contacta al equipo de desarrollo

---

## 📄 Licencia

Uso exclusivo - UT PEREIRA AVANZA

---

## �️ Arquitectura Multiempresa (Multitenant)

### Decisión arquitectónica
**Base de datos compartida con separación lógica por `empresaId`** — cada documento en MongoDB incluye un campo `empresaId` que lo vincula a una empresa específica.

### Entidad Empresa
```
Empresa { nombre, nit, razonSocial, estado, colorTema, dominio, modulosHabilitados }
```

### Roles y permisos

| Rol | Acceso |
|-----|--------|
| `super_admin` | Global — todas las empresas, sin filtro de empresa |
| `admin` | Solo su empresa — puede crear/editar usuarios de su empresa |
| `usuario` | Solo su empresa — acceso operativo |
| `consulta` | Solo su empresa — solo lectura |

### Aislamiento de datos

- Middleware `requireTenant` inyecta `req.empresaId` en cada request
- Todos los servicios (`empleadosService`, `turnosService`, `turnoModel`) aceptan `empresaId` como parámetro de filtro
- Los controladores pasan `req.empresaId` automáticamente
- `super_admin` bypassa el filtro (`req.empresaId = null`)

### Módulos por empresa
Cada empresa tiene `modulosHabilitados: ['turnos', 'nomina']`. En el login, los módulos efectivos son la intersección entre los módulos del usuario y los de la empresa.

### Comandos

```bash
# Instalar dependencias (incluye jest y supertest)
cd backend && npm install

# Migrar datos existentes a Empresa Principal
npm run migrate

# Crear datos de prueba (3 empresas demo)
npm run seed

# Ejecutar tests unitarios
npm test

# Ejecutar tests con cobertura
npm run test:coverage
```

### Usuarios de prueba (después de `npm run seed`)

| Usuario | Contraseña | Rol | Empresa |
|---------|-----------|-----|---------|
| `superadmin` | `SuperAdmin2025!` | super_admin | Global |
| `admin_a` | `adminA2025` | admin | Empresa Demo A |
| `usuario_a` | `userA2025` | usuario | Empresa Demo A |
| `admin_b` | `adminB2025` | admin | Empresa Demo B |
| `admin_c` | `adminC2025` | admin | Empresa Demo C |

### Nuevas rutas API

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/empresas` | auth | Listar empresas |
| POST | `/api/empresas` | super_admin | Crear empresa |
| PUT | `/api/empresas/:id` | admin | Actualizar empresa |
| PATCH | `/api/empresas/:id/estado` | super_admin | Activar/desactivar |
| GET | `/api/empresas/:id/usuarios` | admin | Usuarios de empresa |

---

## �🎉 ¡Listo para Empezar!

### Próximos pasos:

1. **Primero:** [GUIA_INSTALACION.md](GUIA_INSTALACION.md) ← Instala
2. **Luego:** [COMO_FUNCIONA.md](COMO_FUNCIONA.md) ← Aprende
3. **Después:** [COMPOSICION_SISTEMA.md](COMPOSICION_SISTEMA.md) ← Desarrolla
4. **Si necesitas:** [API_REFERENCE.md](API_REFERENCE.md) ← Consulta

**¡Accede a http://localhost:3001 y comienza ahora! 🚀**

