# Módulo de Cotizaciones y Comparativo

## 📋 Resumen

Módulo completo para gestionar cotizaciones de proveedores y realizar comparativos de precios, implementado siguiendo el prototipo proporcionado.

## ✅ Características Implementadas

### Backend (NestJS + Prisma)

#### 1. **Modelos de Base de Datos**
- ✅ `Cotizacion`: Modelo principal con todos los campos necesarios
  - Información básica (número, estado, fechas)
  - Datos comerciales (precios, tiempos, condiciones)
  - Calificación e histórico del proveedor
  - Documentos adjuntos
  - Estado de selección
- ✅ `LineaCotizacion`: Líneas de detalle de cada cotizacion
  - Relación con líneas de solicitud
  - Cálculo automático de totales
  - Descuentos e impuestos

#### 2. **DTOs con Validaciones**
- ✅ `CreateCotizacionDto`: Validaciones completas para creación
- ✅ `UpdateCotizacionDto`: Actualización parcial
- ✅ `QueryCotizacionDto`: Filtros y paginación

#### 3. **Servicio de Cotizaciones** (`CotizacionesService`)
- ✅ `create()`: Crear cotización con cálculo automático de totales
- ✅ `findAll()`: Listar con filtros, búsqueda y paginación
- ✅ `findOne()`: Obtener cotización completa con relaciones
- ✅ `findBySolicitud()`: Obtener todas las cotizaciones de una solicitud (comparativo)
- ✅ `update()`: Actualizar cotización y recalcular totales
- ✅ `seleccionarCotizacion()`: Marcar cotización ganadora
- ✅ `rechazarCotizacion()`: Rechazar con motivo
- ✅ `remove()`: Eliminar cotización

#### 4. **Controlador REST** (`CotizacionesController`)
- ✅ `POST /cotizaciones`: Crear cotización
- ✅ `GET /cotizaciones`: Listar con filtros
- ✅ `GET /cotizaciones/solicitud/:id`: Comparativo por solicitud
- ✅ `GET /cotizaciones/:id`: Detalle de cotización
- ✅ `PATCH /cotizaciones/:id`: Actualizar
- ✅ `POST /cotizaciones/:id/seleccionar`: Seleccionar ganadora
- ✅ `POST /cotizaciones/:id/rechazar`: Rechazar
- ✅ `DELETE /cotizaciones/:id`: Eliminar

### Frontend (Next.js + React + TypeScript)

#### 1. **API Client** (`cotizaciones-api.ts`)
- ✅ Interfaces TypeScript completas
- ✅ Funciones para todas las operaciones CRUD
- ✅ Manejo de autenticación con JWT
- ✅ Funciones especiales: seleccionar, rechazar

#### 2. **Página de Listado** (`/dashboard/cotizaciones`)
- ✅ Tabla con todas las cotizaciones
- ✅ Filtros por estado y búsqueda
- ✅ Paginación
- ✅ Badges de estado con colores
- ✅ Formato de moneda colombiana
- ✅ Navegación a detalles

#### 3. **Página de Comparativo** (`/dashboard/cotizaciones/comparativo/[solicitudId]`)
- ✅ Tabla comparativa de proveedores
- ✅ Columnas: Proveedor, Precio, Tiempo Entrega, Calificación, Histórico, Acción
- ✅ Indicador visual del mejor precio
- ✅ Sistema de calificación con estrellas (1-5)
- ✅ Histórico de compras previas
- ✅ Botón para seleccionar cotización ganadora
- ✅ Confirmación antes de seleccionar
- ✅ Indicador visual de cotización seleccionada
- ✅ Tarjetas con información adicional (condiciones de pago, garantía, validez)
- ✅ Botón "Consultar Precios"
- ✅ Diseño responsive

## 🎨 Componentes UI

### Tabla Comparativa
```tsx
- Avatar circular con iniciales del proveedor
- Precio destacado con formato de moneda
- Badge "Mejor precio" para la cotización más económica
- Estrellas de calificación (componente reutilizable)
- Contador de compras históricas
- Botón "Seleccionar" con estados
- Indicador "Seleccionada" con ícono de check
```

### Estados de Cotización
- **Borrador**: Gris
- **Enviada**: Azul
- **Recibida**: Púrpura
- **Aceptada**: Verde
- **Rechazada**: Rojo
- **Vencida**: Naranja

## 📊 Flujo de Uso

1. **Crear Solicitud de Compra** → Generar cotizaciones
2. **Solicitar Cotizaciones** → Enviar a múltiples proveedores
3. **Recibir Respuestas** → Proveedores envían sus cotizaciones
4. **Comparar** → Vista comparativa con todos los criterios
5. **Seleccionar** → Elegir la mejor cotización
6. **Generar Orden de Compra** → A partir de la cotización seleccionada

## 🔧 Configuración

### Base de Datos
```bash
# Aplicar migración
cd apps/api
npx prisma db push
```

### Variables de Entorno
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="tu-secreto-jwt"
```

## 📝 Ejemplos de Uso

### Crear Cotización
```typescript
const cotizacion = await createCotizacion({
  solicitudId: "uuid-solicitud",
  proveedorId: "uuid-proveedor",
  tiempoEntrega: 5,
  condicionesPago: "30 días",
  garantia: "12 meses",
  validezOferta: 15,
  calificacion: 4.5,
  historico: 20,
  lineas: [
    {
      descripcion: "Laptop Dell Latitude 5540",
      cantidad: 10,
      unidadMedida: "Unidad",
      precioUnitario: 2350000,
      descuento: 5,
      impuesto: 19,
    }
  ]
});
```

### Obtener Comparativo
```typescript
const cotizaciones = await fetchCotizacionesBySolicitud(solicitudId);
// Retorna array ordenado por precio (menor a mayor)
```

### Seleccionar Ganadora
```typescript
await seleccionarCotizacion(cotizacionId);
// Marca como seleccionada y deselecciona las demás
```

## 🎯 Características Destacadas

1. **Cálculo Automático de Totales**
   - Subtotal, descuentos, impuestos calculados automáticamente
   - Soporte para múltiples líneas de cotización

2. **Comparativo Inteligente**
   - Ordenamiento automático por precio
   - Indicador visual del mejor precio
   - Calificación y histórico del proveedor

3. **Validaciones Robustas**
   - DTOs con class-validator
   - Verificación de permisos por empresa
   - Validación de existencia de solicitud y proveedor

4. **UX Optimizada**
   - Confirmación antes de acciones críticas
   - Estados visuales claros
   - Feedback inmediato
   - Diseño responsive

## 🚀 Próximos Pasos Sugeridos

1. **Notificaciones**
   - Notificar a proveedores cuando se solicita cotización
   - Alertar cuando se recibe una cotización
   - Notificar selección/rechazo

2. **Documentos**
   - Upload de archivos adjuntos
   - Generación de PDF del comparativo
   - Exportar a Excel

3. **Análisis**
   - Gráficos de comparación de precios
   - Histórico de precios por proveedor
   - Análisis de tiempos de entrega

4. **Automatización**
   - Selección automática basada en criterios
   - Recordatorios de vencimiento de ofertas
   - Integración con órdenes de compra

## 📦 Archivos Creados

### Backend
```
apps/api/src/cotizaciones/
├── dto/
│   ├── create-cotizacion.dto.ts
│   ├── update-cotizacion.dto.ts
│   ├── query-cotizacion.dto.ts
│   └── index.ts
├── cotizaciones.service.ts
├── cotizaciones.controller.ts
└── cotizaciones.module.ts
```

### Frontend
```
apps/web/src/
├── lib/
│   └── cotizaciones-api.ts
└── app/(dashboard)/dashboard/cotizaciones/
    ├── page.tsx (listado)
    └── comparativo/[solicitudId]/
        └── page.tsx (comparativo)
```

### Base de Datos
```
schema.prisma
├── model Cotizacion
└── model LineaCotizacion
```

## ✨ Conclusión

El módulo de Cotizaciones y Comparativo está **completamente implementado** y listo para usar. Incluye todas las funcionalidades del prototipo:

- ✅ Gestión completa de cotizaciones
- ✅ Comparativo visual de proveedores
- ✅ Selección de cotización ganadora
- ✅ Calificaciones y histórico
- ✅ Tiempos de entrega
- ✅ Condiciones comerciales
- ✅ UI moderna y responsive
- ✅ Backend robusto con validaciones

El sistema está listo para recibir cotizaciones de proveedores y facilitar la toma de decisiones de compra basada en criterios objetivos.
