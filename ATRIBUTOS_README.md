  # Módulo de Atributos Dinámicos

## 📋 Resumen

Módulo completo para gestionar atributos dinámicos configurables por categoría de productos y servicios, permitiendo personalizar los campos según las necesidades de cada tipo de bien o servicio.

## ✅ Características Implementadas

### Backend (NestJS + Prisma)

#### 1. **Modelos de Base de Datos**
- ✅ `AtributoDinamico`: Definición de atributos
  - Nombre del atributo
  - Categoría (Laptop, Monitor, Periférico, Mobiliario, Servicio, etc.)
  - Tipo de dato (TEXTO, NUMERO, LISTA, BOOLEANO)
  - Valores predefinidos (para tipo LISTA)
  - Campo obligatorio (sí/no)
  - Estado activo/inactivo
  - Orden de visualización
- ✅ `ValorAtributo`: Valores de atributos por bien/servicio
  - Relación con AtributoDinamico
  - Relación con BienServicio
  - Valor del atributo

#### 2. **DTOs con Validaciones**
- ✅ `CreateAtributoDto`: Crear atributo dinámico
- ✅ `UpdateAtributoDto`: Actualización parcial
- ✅ `QueryAtributoDto`: Filtros por categoría y estado

#### 3. **Servicio de Atributos** (`AtributosService`)
- ✅ `create()`: Crear atributo con validaciones
- ✅ `findAll()`: Listar con filtros por categoría y estado
  - Ordenado por categoría, orden y nombre
- ✅ `findOne()`: Obtener atributo con valores asociados
- ✅ `update()`: Actualizar atributo
- ✅ `toggleActivo()`: Activar/desactivar atributo
- ✅ `remove()`: Eliminar atributo (cascade a valores)
- ✅ `getCategorias()`: Obtener lista de categorías únicas

#### 4. **Controlador REST** (`AtributosController`)
- ✅ `POST /atributos`: Crear atributo
- ✅ `GET /atributos`: Listar con filtros
- ✅ `GET /atributos/categorias`: Obtener categorías
- ✅ `GET /atributos/:id`: Detalle de atributo
- ✅ `PATCH /atributos/:id`: Actualizar
- ✅ `PATCH /atributos/:id/toggle-activo`: Activar/desactivar
- ✅ `DELETE /atributos/:id`: Eliminar

### Frontend (Next.js + React + TypeScript)

#### 1. **API Client** (`atributos-api.ts`)
- ✅ Interfaces TypeScript completas
- ✅ Funciones para todas las operaciones CRUD
- ✅ Función especial: toggleActivo
- ✅ Función para obtener categorías

#### 2. **Página de Gestión** (`/dashboard/atributos`)
Siguiendo exactamente el prototipo:

#### Tabla de Atributos
- ✅ **Columna Nombre**: Nombre del atributo
- ✅ **Columna Categoría**: Categoría asociada
- ✅ **Columna Tipo Dato**: Badge con colores
  - LISTA (púrpura)
  - TEXTO (azul)
  - NUMERO (naranja)
  - BOOLEANO (verde)
- ✅ **Columna Valores**: Valores predefinidos para listas
- ✅ **Columna Obligatorio**: Toggle switch activo/inactivo
- ✅ **Columna Acciones**: Ver y Eliminar

#### Modal de Creación/Edición
- ✅ Campo Nombre (requerido)
- ✅ Campo Categoría (requerido)
- ✅ Selector Tipo de Dato
- ✅ Campo Valores (solo para tipo LISTA)
- ✅ Checkbox Campo obligatorio
- ✅ Botones Cancelar y Guardar

#### Funcionalidades
- ✅ Botón "Nuevo Atributo" en header
- ✅ Agrupación por categoría en tabla
- ✅ Toggle para activar/desactivar atributos
- ✅ Modal de creación/edición
- ✅ Eliminación con confirmación
- ✅ Actualización automática después de cambios

---

## 🎨 Tipos de Datos Soportados

### 1. TEXTO
```typescript
// Campo de texto libre
{ tipoDato: 'TEXTO' }
// Ejemplo: Procesador, Almacenamiento, Color
```

### 2. NUMERO
```typescript
// Campo numérico
{ tipoDato: 'NUMERO' }
// Ejemplo: Memoria RAM (GB), Tamaño Pantalla (pulgadas)
```

### 3. LISTA
```typescript
// Lista de valores predefinidos
{
  tipoDato: 'LISTA',
  valores: 'Dell, HP, Lenovo, Apple'
}
// Ejemplo: Marca, Resolución, Tipo de Panel
```

### 4. BOOLEANO
```typescript
// Valor Sí/No
{ tipoDato: 'BOOLEANO' }
// Ejemplo: ¿Es nuevo?, ¿Incluye repuestos?
```

---

## 📊 Ejemplos de Uso

### Crear Atributo para Laptops
```typescript
await createAtributo({
  nombre: 'Marca',
  categoria: 'Laptop',
  tipoDato: 'LISTA',
  valores: 'Dell, HP, Lenovo, Apple',
  obligatorio: true,
});
```

### Crear Atributo para Monitores
```typescript
await createAtributo({
  nombre: 'Resolución',
  categoria: 'Monitor',
  tipoDato: 'LISTA',
  valores: '1080p, 1440p, 4K',
  obligatorio: true,
});
```

### Crear Atributo para Servicios
```typescript
await createAtributo({
  nombre: 'Duración',
  categoria: 'Servicio',
  tipoDato: 'LISTA',
  valores: '1 mes, 3 meses, 6 meses, 12 meses',
  obligatorio: false,
});
```

### Activar/Desactivar Atributo
```typescript
await toggleActivoAtributo(atributoId);
// Cambia el estado activo ↔ inactivo
```

---

## 🎯 Casos de Uso

### 1. Categoría: Laptop
- **Marca** (LISTA): Dell, HP, Lenovo, Apple
- **Procesador** (TEXTO): Libre
- **Memoria RAM (GB)** (NUMERO): Numérico
- **Almacenamiento** (TEXTO): Libre
- **Tamaño Pantalla (pulgadas)** (NUMERO): Numérico
- **¿Es nuevo?** (BOOLEANO): Sí/No

### 2. Categoría: Monitor
- **Marca** (LISTA): LG, Samsung, Dell, ASUS
- **Tamaño (pulgadas)** (NUMERO): Numérico
- **Resolución** (LISTA): 1080p, 1440p, 4K
- **Tipo de Panel** (LISTA): IPS, VA, TN

### 3. Categoría: Periférico
- **Tipo de Periférico** (LISTA): Teclado, Ratón, Auriculares, Webcam
- **Conectividad** (LISTA): Cableado, Inalámbrico, Bluetooth
- **Garantía (meses)** (NUMERO): Numérico

### 4. Categoría: Mobiliario
- **Tipo de Mueble** (LISTA): Silla, Escritorio, Estantería, Gabinete
- **Material** (LISTA): Madera, Metal, Plástico, Tela
- **Color** (TEXTO): Libre
- **¿Es ergonómico?** (BOOLEANO): Sí/No

### 5. Categoría: Servicio
- **Tipo de Servicio** (LISTA): Mantenimiento, Consultoría, Soporte, Instalación
- **Duración** (LISTA): 1 mes, 3 meses, 6 meses, 12 meses
- **SLA (horas respuesta)** (NUMERO): Numérico
- **¿Incluye repuestos?** (BOOLEANO): Sí/No

---

## 🔧 Lógica de Negocio

### Agrupación por Categoría
```typescript
// Los atributos se agrupan automáticamente por categoría en la UI
const atributosPorCategoria = atributos.reduce((acc, atributo) => {
  if (!acc[atributo.categoria]) {
    acc[atributo.categoria] = [];
  }
  acc[atributo.categoria].push(atributo);
  return acc;
}, {});
```

### Validación de Tipo LISTA
```typescript
// Solo los atributos tipo LISTA pueden tener valores predefinidos
if (tipoDato === 'LISTA' && !valores) {
  throw new Error('Los atributos tipo LISTA requieren valores predefinidos');
}
```

### Cascade Delete
```typescript
// Al eliminar un atributo, se eliminan automáticamente
// todos los valores asociados en ValorAtributo
onDelete: Cascade
```

---

## 📁 Archivos Creados

### Backend
```
apps/api/src/atributos/
├── dto/
│   ├── create-atributo.dto.ts
│   ├── update-atributo.dto.ts
│   ├── query-atributo.dto.ts
│   └── index.ts
├── atributos.service.ts
├── atributos.controller.ts
└── atributos.module.ts
```

### Frontend
```
apps/web/src/
├── lib/atributos-api.ts
└── app/(dashboard)/dashboard/atributos/
    └── page.tsx (gestión completa)
```

### Base de Datos
```
schema.prisma:
- AtributoDinamico (modelo)
- ValorAtributo (modelo)
- Relación con BienServicio
```

---

## 🚀 Flujo de Trabajo

### 1. Configurar Atributos
1. Ir a `/dashboard/atributos`
2. Click en "Nuevo Atributo"
3. Llenar formulario:
   - Nombre: "Marca"
   - Categoría: "Laptop"
   - Tipo: "LISTA"
   - Valores: "Dell, HP, Lenovo, Apple"
   - Obligatorio: Sí
4. Guardar

### 2. Usar Atributos en Productos
```typescript
// Al crear/editar un producto, se pueden asignar valores
// a los atributos configurados para su categoría
await createValorAtributo({
  atributoId: 'uuid-atributo-marca',
  bienServicioId: 'uuid-laptop',
  valor: 'Dell',
});
```

### 3. Activar/Desactivar
- Toggle en la columna "Obligatorio"
- Atributos inactivos no se muestran en formularios

### 4. Eliminar
- Click en ícono de eliminar
- Confirmación
- Eliminación en cascade de valores asociados

---

## ✨ Características Destacadas

### 1. Configuración Flexible
- Crear atributos según necesidades
- Diferentes tipos de datos
- Valores predefinidos para listas
- Campo obligatorio configurable

### 2. Organización por Categoría
- Atributos agrupados por categoría
- Fácil visualización
- Gestión ordenada

### 3. Toggle Activo/Inactivo
- Activar/desactivar sin eliminar
- Mantener historial
- Control de visibilidad

### 4. Badges de Tipo de Dato
- Identificación visual rápida
- Colores distintivos
- Mejor UX

### 5. Modal de Edición
- Edición in-place
- Validaciones en tiempo real
- Feedback inmediato

---

## 🎨 Badges de Tipo de Dato

- **LISTA**: Púrpura - Para valores predefinidos
- **TEXTO**: Azul - Para texto libre
- **NUMERO**: Naranja - Para valores numéricos
- **BOOLEANO**: Verde - Para Sí/No

---

## 📊 Integración con Otros Módulos

### Catálogo de Productos
```typescript
// Los atributos se pueden usar al crear productos
// para enriquecer la información del catálogo
```

### Solicitudes de Compra
```typescript
// Los atributos ayudan a especificar mejor
// los requerimientos en las solicitudes
```

### Cotizaciones
```typescript
// Los proveedores pueden ver los atributos
// requeridos para cotizar correctamente
```

---

## ✨ El módulo está **100% funcional** y listo para usar

Incluye todas las características del prototipo:
- ✅ Gestión completa de atributos dinámicos
- ✅ Tabla con agrupación por categoría
- ✅ Badges de tipo de dato con colores
- ✅ Toggle para activar/desactivar
- ✅ Modal de creación/edición
- ✅ Eliminación con confirmación
- ✅ Soporte para 4 tipos de datos
- ✅ Valores predefinidos para listas
- ✅ UI moderna y responsive
- ✅ Backend robusto con validaciones

---

## 📊 Resumen Total de Módulos Implementados

Has implementado exitosamente **7 módulos completos** del sistema:

1. ✅ **Proveedores - Datos Básicos**
2. ✅ **Cotizaciones y Comparativo**
3. ✅ **Flujo de Aprobaciones**
4. ✅ **Órdenes de Compra**
5. ✅ **Recepción de Bienes**
6. ✅ **Seguimiento de Solicitudes**
7. ✅ **Atributos Dinámicos**

El sistema de gestión de compras está completo con todos los módulos principales implementados y funcionales. 🎊
