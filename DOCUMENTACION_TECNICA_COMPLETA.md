# 📘 Documentación Técnica Completa - Sistema de Gestión Empresarial

**Versión:** 2.0.0
**Fecha de Actualización:** 26 de Noviembre de 2025
**Desarrollado para:** INNOVAR

---

## 1. 🎯 Visión General

El **Sistema de Gestión Empresarial** es una plataforma web integrada diseñada para administrar eficientemente los recursos humanos de la empresa. Unifica dos procesos críticos en una sola interfaz:

1.  **Gestión de Turnos**: Planificación, asignación y seguimiento de horarios laborales para diferentes áreas operativas (Taquilleros, Conductores, Administrativos, etc.).
2.  **Gestión de Nómina**: Cálculo automatizado de salarios, horas extras, recargos y deducciones basado en la información de turnos.

El sistema permite la coexistencia de múltiples tipos de asignación de turnos (simple, avanzada y automática) y garantiza la integridad de los datos entre los módulos operativos y contables.

---

## 2. 🏗️ Arquitectura del Sistema

El proyecto sigue una arquitectura **Monolítica Modular** basada en el stack **MERN** (MongoDB, Express, React*, Node.js), aunque el frontend principal utiliza tecnologías web estándar (HTML5, CSS3, Vanilla JS) y algunas secciones específicas están migrando a React.

### Tecnologías Principales
*   **Backend**: Node.js con Express Framework.
*   **Base de Datos**: MongoDB (NoSQL) con Mongoose ODM.
*   **Frontend**: HTML5, CSS3, JavaScript (ES6+), y componentes React para módulos complejos.
*   **Autenticación**: Express-Session (Stateful).
*   **Reportes**: PDFKit, jsPDF.
*   **Contenedorización**: Docker y Docker Compose.

### Estructura de Directorios
```
turnos_app/
├── backend/                # Lógica del servidor y API
│   ├── controllers/        # Lógica de negocio (Turnos, Nómina, Auth)
│   ├── models/             # Esquemas de base de datos (Mongoose)
│   ├── routes/             # Definición de endpoints API
│   ├── middlewares/        # Autenticación y validación
│   ├── utils/              # Utilidades (Festivos, PDF, CSV)
│   └── server.js           # Punto de entrada del servidor
├── frontend/               # Interfaz de usuario
│   ├── dashboard.html      # Panel principal
│   ├── js/                 # Lógica del frontend
│   ├── css/                # Estilos
│   ├── turnos-react/       # App React para módulo de turnos
│   └── nomina-react/       # App React para módulo de nómina
└── docker-compose.yml      # Orquestación de contenedores
```

---

## 3. 📦 Módulos del Sistema

### 3.1 🔐 Gestión de Usuarios y Seguridad
Controla el acceso al sistema mediante autenticación basada en sesiones.

*   **Roles**:
    *   `admin`: Acceso total a todos los módulos y gestión de usuarios.
    *   `usuario`: Acceso operativo (lectura/escritura) a módulos asignados.
    *   `consulta`: Acceso de solo lectura.
*   **Permisos**:
    *   `modulosPermitidos`: Restringe acceso a 'turnos' o 'nomina'.
    *   `areasPermitidas`: Restringe visualización de empleados por área.

### 3.2 👥 Gestión de Empleados
Repositorio central de información del personal.

*   **Funcionalidades**:
    *   Creación, edición y listado de empleados.
    *   Carga masiva mediante archivos CSV.
    *   Clasificación por áreas: TAQUILLEROS, CONDUCTORES, MANTENIMIENTO, OPERACIONES, ADMINISTRACION, CENTRO DE CONTROL.
*   **Datos Clave**: Documento (único), Nombre, Cargo, Salario Base.

### 3.3 📅 Gestión de Turnos
El núcleo operativo del sistema. Soporta tres modalidades de asignación:

1.  **Asignación Simple**: Para turnos eventuales o sin estructura compleja. Define fecha inicio/fin y horas.
2.  **Asignación Avanzada (Taquilleros)**:
    *   Genera un **cronograma detallado día por día**.
    *   Integra **Tablas de Descanso** (A, B, C, etc.) para rotación automática.
    *   Maneja horarios específicos para subáreas (MEGABUS, MEGACABLE) y tipos de turno (T100, T300, T400).
    *   Detecta automáticamente festivos y domingos.
3.  **Asignación Automática (Administrativos)**:
    *   Aplica reglas de negocio fijas: Lunes a Viernes, 7am-5pm.
    *   Excluye automáticamente fines de semana y festivos.

### 3.4 💰 Gestión de Nómina
Automatiza el cálculo de pagos.

*   **Integración**: Lee directamente el historial de turnos para calcular horas trabajadas.
*   **Cálculos**:
    *   Salario Devengado.
    *   Auxilio de Transporte.
    *   Horas Extras (Diurnas, Nocturnas, Dominicales).
    *   Recargos Nocturnos.
    *   Deducciones (Salud, Pensión).
*   **Salidas**: Generación de desprendibles de pago en PDF y reportes en Excel.

---

## 4. 💾 Modelo de Datos (MongoDB)

### Colección: `usuarios`
Almacena credenciales y permisos de acceso.
*   `username`: String (Único)
*   `password`: String (Hash)
*   `rol`: Enum ['admin', 'usuario', 'consulta']
*   `modulosPermitidos`: Array ['turnos', 'nomina']

### Colección: `empleados`
Información maestra del personal.
*   `documento`: String (Indexado, Único)
*   `nombre`: String
*   `area`: Enum [Areas Operativas]
*   `salario`: Number

### Colección: `turnos`
Documento complejo que almacena el historial laboral de un empleado.
*   `empleadoId`: Reference (Empleado)
*   `turnoActual`: Objeto con el estado del último turno activo.
*   `historialTurnos`: Array de objetos con el registro histórico. Cada elemento contiene:
    *   `fechaInicio`, `fechaFin`.
    *   `tipoTurno`, `tablaDescanso`.
    *   `cronogramaDetallado`: Array de objetos día por día con:
        *   `fecha`, `diaSemana`.
        *   `tipoDay`: ['LABORABLE', 'DESCANSO', 'FESTIVO'].
        *   `horaInicio`, `horaFin`.

---

## 5. 🔌 API Reference (Principales Endpoints)

### Autenticación
*   `POST /api/auth/login`: Iniciar sesión.
*   `POST /api/auth/logout`: Cerrar sesión.
*   `GET /api/auth/verificar-sesion`: Verificar estado actual.

### Empleados
*   `GET /api/turnos/empleados`: Listar todos.
*   `POST /api/turnos/empleados`: Crear nuevo.
*   `POST /api/turnos/empleados/csv`: Carga masiva.

### Turnos
*   `POST /api/turnos/asignar`: Asignación simple.
*   `POST /api/turnos/asignar-taquilleros`: Asignación avanzada con cronograma.
*   `POST /api/turnos/asignar-administrativos`: Asignación automática administrativa.
*   `GET /api/turnos/empleado/:id/historial`: Obtener historial de un empleado.

### Nómina
*   `POST /api/nomina/calcular`: Calcular nómina individual.
*   `POST /api/nomina/calcular-masiva-desde-turnos`: Cálculo masivo basado en turnos.

---

## 6. 🚀 Guía de Despliegue

### Requisitos Previos
*   Node.js v14+
*   MongoDB v4.4+
*   Docker (Opcional)

### Ejecución Local
1.  **Instalar dependencias**:
    ```bash
    cd backend
    npm install
    ```
2.  **Configurar entorno**:
    Crear archivo `.env` en `backend/` con:
    ```env
    PORT=3001
    MONGO_URI=mongodb://localhost:27017/turnos_app
    SESSION_SECRET=tu_secreto_seguro
    ```
3.  **Iniciar servidor**:
    ```bash
    npm start
    ```
4.  **Acceder**: Abrir navegador en `http://localhost:3001`.

### Ejecución con Docker
1.  Construir y levantar contenedores:
    ```bash
    docker-compose up --build
    ```
2.  El sistema estará disponible en `http://localhost:3001`.

---

## 7. 🛠️ Mantenimiento y Soporte

*   **Logs**: El servidor emite logs detallados en consola sobre cada operación.
*   **Festivos**: Actualizar `backend/utils/festivos2025.json` anualmente.
*   **Tablas de Descanso**: Configurable en `backend/services/tablasDescansoService.js`.
