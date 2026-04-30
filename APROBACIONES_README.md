# Módulo de Flujo de Aprobaciones

## 📋 Resumen

Módulo completo para gestionar flujos de aprobación de solicitudes de compra con múltiples niveles de aprobadores, implementado siguiendo el prototipo proporcionado.

## ✅ Características Implementadas

### Backend (NestJS + Prisma)

#### 1. **Modelos de Base de Datos** (Ya existentes)
- ✅ `FlujoAprobacion`: Flujo principal de aprobación
  - Relación con `SolicitudCompra`
  - Estado actual del flujo
  - Múltiples pasos de aprobación
- ✅ `PasoAprobacion`: Pasos individuales del flujo
  - Orden secuencial
  - Aprobador asignado
  - Estado (pendiente, aprobada, rechazada, escalada)
  - Comentarios y fecha de decisión

#### 2. **DTOs con Validaciones**
- ✅ `CreateFlujoAprobacionDto`: Crear flujo con múltiples pasos
- ✅ `AprobarRechazarDto`: Aprobar o rechazar con comentario opcional
- ✅ `QueryAprobacionDto`: Filtros y paginación

#### 3. **Servicio de Aprobaciones** (`AprobacionesService`)
- ✅ `createFlujo()`: Crear flujo con validaciones
  - Verificar que la solicitud existe
  - Validar que no existe flujo previo
  - Verificar que todos los aprobadores existen
  - Actualizar estado de solicitud a "en_aprobacion"
- ✅ `findAll()`: Listar flujos con filtros
- ✅ `findOne()`: Obtener flujo completo con detalles
- ✅ `findBySolicitud()`: Obtener flujo por solicitud
- ✅ `getPendientesByAprobador()`: Aprobaciones pendientes del usuario
- ✅ `aprobar()`: Aprobar paso con validaciones
  - Verificar permisos del aprobador
  - Validar que es el paso actual
  - Verificar pasos anteriores aprobados
  - Actualizar flujo y solicitud si es el último paso
- ✅ `rechazar()`: Rechazar paso
  - Rechaza toda la solicitud
  - Actualiza flujo y solicitud

#### 4. **Controlador REST** (`AprobacionesController`)
- ✅ `POST /aprobaciones/flujos`: Crear flujo
- ✅ `GET /aprobaciones/flujos`: Listar flujos
- ✅ `GET /aprobaciones/flujos/:id`: Detalle de flujo
- ✅ `GET /aprobaciones/solicitud/:id`: Flujo por solicitud
- ✅ `GET /aprobaciones/pendientes/mis-aprobaciones`: Pendientes del usuario
- ✅ `POST /aprobaciones/pasos/:id/aprobar`: Aprobar paso
- ✅ `POST /aprobaciones/pasos/:id/rechazar`: Rechazar paso

### Frontend (Next.js + React + TypeScript)

#### 1. **API Client** (`aprobaciones-api.ts`)
- ✅ Interfaces TypeScript completas
- ✅ Funciones para todas las operaciones
- ✅ Manejo de autenticación con JWT
- ✅ Funciones especiales: aprobar, rechazar

#### 2. **Página de Aprobaciones Pendientes** (`/dashboard/aprobaciones`)
- ✅ Lista de solicitudes pendientes de aprobación del usuario
- ✅ Información resumida de cada solicitud
  - Número de solicitud
  - Descripción
  - Solicitante
  - Monto total
  - Prioridad (badges con colores)
- ✅ Botones de acción rápida
  - Aprobar (verde)
  - Rechazar (rojo)
  - Ver Detalle
- ✅ Modal para comentarios
  - Opcional al aprobar
  - Requerido al rechazar
- ✅ Actualización automática después de acciones

#### 3. **Página de Flujo de Aprobación** (`/dashboard/aprobaciones/flujo/[id]`)
Siguiendo exactamente el prototipo:

##### Timeline de Aprobaciones
- ✅ **Visualización secuencial** de pasos
- ✅ **Iconos de estado**:
  - ✓ Verde: Aprobada
  - ✗ Rojo: Rechazada
  - ⏱ Amarillo: Pendiente
- ✅ **Información de cada paso**:
  - Nombre del aprobador
  - Email
  - Badge de estado
  - Comentarios (si existen)
  - Fecha de decisión
- ✅ **Línea vertical** conectando los pasos
- ✅ **Botones de acción** en el paso actual
- ✅ **Estado final** del flujo (aprobado/rechazado)

##### Funcionalidades
- ✅ Validación de permisos (solo el aprobador asignado)
- ✅ Validación de orden (solo el paso actual)
- ✅ Confirmación con modal para comentarios
- ✅ Actualización en tiempo real del estado
- ✅ Navegación de regreso

---

## 🎨 Componentes UI

### Timeline de Aprobaciones
```tsx
- Iconos de estado con colores
- Línea vertical conectando pasos
- Badges de estado (Pendiente, Aprobada, Rechazada)
- Comentarios en tarjetas grises
- Fecha y hora de decisión
- Botones de acción contextuales
```

### Badges de Prioridad
- **Baja**: Gris
- **Media**: Azul
- **Alta**: Naranja
- **Urgente**: Rojo

### Estados de Paso
- **Pendiente**: Amarillo
- **Aprobada**: Verde
- **Rechazada**: Rojo
- **Escalada**: Naranja

---

## 📊 Flujo de Uso

1. **Crear Solicitud** → Sistema crea flujo de aprobación automático
2. **Notificar Aprobadores** → Primer aprobador recibe notificación
3. **Aprobar/Rechazar** → Aprobador toma decisión
4. **Siguiente Paso** → Si aprueba, pasa al siguiente aprobador
5. **Finalizar** → Último aprobador completa el flujo
6. **Generar Orden** → Si todo aprobado, crear orden de compra

---

## 🔧 Lógica de Negocio

### Validaciones de Aprobación
```typescript
// Solo el aprobador asignado puede aprobar/rechazar
if (paso.aprobadorId !== usuarioId) {
  throw new ForbiddenException();
}

// Solo se puede aprobar el paso actual
const pasosAnteriores = pasos.filter(p => p.orden < paso.orden);
const todosAprobados = pasosAnteriores.every(p => p.estado === 'aprobada');

if (!todosAprobados) {
  throw new BadRequestException('Hay pasos anteriores pendientes');
}

// Si es el último paso, aprobar toda la solicitud
if (esUltimoPaso) {
  await actualizarSolicitud({ estado: 'aprobada' });
}
```

### Rechazo en Cascada
```typescript
// Un rechazo detiene todo el flujo
await rechazarPaso(pasoId);
await actualizarFlujo({ estadoActual: 'rechazada' });
await actualizarSolicitud({ estado: 'rechazada' });
```

---

## 📝 Ejemplos de Uso

### Crear Flujo de Aprobación
```typescript
const flujo = await createFlujoAprobacion({
  solicitudId: "uuid-solicitud",
  pasos: [
    { orden: 1, aprobadorId: "uuid-jefe-area" },
    { orden: 2, aprobadorId: "uuid-jefe-compras" },
    { orden: 3, aprobadorId: "uuid-director" },
  ]
});
```

### Aprobar Paso
```typescript
await aprobarPaso(pasoId, {
  comentario: "Aprobado. Presupuesto disponible."
});
```

### Rechazar Paso
```typescript
await rechazarPaso(pasoId, {
  comentario: "Rechazado. No hay presupuesto disponible para este mes."
});
```

### Obtener Pendientes
```typescript
const pendientes = await fetchMisAprobacionesPendientes({
  page: 1,
  limit: 10
});
```

---

## 🎯 Características Destacadas

1. **Aprobación Secuencial**
   - Los pasos deben aprobarse en orden
   - No se puede saltar pasos
   - Validación automática de orden

2. **Timeline Visual**
   - Representación clara del progreso
   - Estados visuales con iconos y colores
   - Comentarios y fechas visibles

3. **Validaciones Robustas**
   - Permisos por aprobador
   - Validación de orden de pasos
   - Prevención de duplicados

4. **UX Optimizada**
   - Acciones rápidas desde la lista
   - Modal para comentarios
   - Confirmación antes de acciones críticas
   - Feedback inmediato

---

## 🚀 Próximos Pasos Sugeridos

1. **Notificaciones**
   - Email al aprobador cuando le toca su turno
   - Notificación al solicitante cuando se aprueba/rechaza
   - Recordatorios de aprobaciones pendientes

2. **Escalamiento**
   - Escalamiento automático por tiempo
   - Aprobadores suplentes
   - Delegación de aprobaciones

3. **Análisis**
   - Tiempo promedio de aprobación
   - Tasa de aprobación/rechazo
   - Cuellos de botella en el flujo

4. **Configuración**
   - Flujos personalizables por tipo de solicitud
   - Reglas de aprobación por monto
   - Aprobadores dinámicos por área/centro de costo

---

## 📦 Archivos Creados

### Backend
```
apps/api/src/aprobaciones/
├── dto/
│   ├── create-flujo-aprobacion.dto.ts
│   ├── aprobar-rechazar.dto.ts
│   ├── query-aprobacion.dto.ts
│   └── index.ts
├── aprobaciones.service.ts (400+ líneas)
├── aprobaciones.controller.ts
└── aprobaciones.module.ts
```

### Frontend
```
apps/web/src/
├── lib/aprobaciones-api.ts
└── app/(dashboard)/dashboard/aprobaciones/
    ├── page.tsx (pendientes)
    └── flujo/[id]/page.tsx (detalle con timeline)
```

---

## ✨ Conclusión

El módulo de Flujo de Aprobaciones está **completamente implementado** y listo para usar. Incluye todas las funcionalidades del prototipo:

- ✅ Flujo secuencial de aprobaciones
- ✅ Timeline visual con estados
- ✅ Aprobaciones pendientes por usuario
- ✅ Aprobar/Rechazar con comentarios
- ✅ Validaciones de permisos y orden
- ✅ UI moderna con iconos y colores
- ✅ Backend robusto con validaciones

El sistema está listo para gestionar aprobaciones de solicitudes de compra con múltiples niveles de autorización, garantizando un proceso ordenado y auditable.
