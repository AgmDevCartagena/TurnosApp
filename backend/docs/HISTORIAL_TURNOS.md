# Sistema de Historial de Turnos

## 📋 Descripción

El sistema ahora mantiene **un solo documento por empleado** en la colección de turnos, con un **historial completo** de todos los turnos asignados.

## 🔄 Cambios Principales

### Antes (Sistema Antiguo)
```
turnos/
  ├── documento_1 (empleadoId: 123, turno del 01-11 al 15-11)
  ├── documento_2 (empleadoId: 123, turno del 16-11 al 30-11)
  ├── documento_3 (empleadoId: 456, turno del 01-11 al 15-11)
  └── documento_4 (empleadoId: 456, turno del 16-11 al 30-11)
```
❌ **Problema**: Múltiples documentos por empleado, difícil consultar historial

### Ahora (Sistema Nuevo)
```
turnos/
  ├── documento_empleado_123
  │   ├── turnoActual: {turno del 16-11 al 30-11}
  │   └── historialTurnos: [
  │       {turno del 01-11 al 15-11},
  │       {turno del 16-11 al 30-11}
  │     ]
  └── documento_empleado_456
      ├── turnoActual: {turno del 16-11 al 30-11}
      └── historialTurnos: [
          {turno del 01-11 al 15-11},
          {turno del 16-11 al 30-11}
        ]
```
✅ **Ventaja**: Un solo documento por empleado, historial completo accesible

## 🏗️ Estructura del Modelo

```javascript
{
  _id: ObjectId,
  empleadoId: ObjectId (único, indexado),
  nombreEmpleado: String,
  documentoEmpleado: String,
  cargo: String,
  salario: Number,
  
  // Turno actual (para consultas rápidas)
  turnoActual: {
    area: String,
    subarea: String,
    turno: String,
    fechaInicio: Date,
    fechaFin: Date,
    activo: Boolean
  },
  
  // Historial completo de turnos
  historialTurnos: [
    {
      _id: ObjectId,
      fechaInicio: Date,
      fechaFin: Date,
      area: String,
      turno: String,
      cronogramaDetallado: [...],
      activo: Boolean,
      fechaCreacion: Date
    }
  ],
  
  fechaCreacion: Date,
  ultimaActualizacion: Date
}
```

## 🔧 Uso en el Código

### Asignar Turno (Automático)
El servicio `turnosService.crearTurno()` ahora:
1. Busca si existe documento para el empleado
2. Si existe: agrega al historial
3. Si no existe: crea nuevo documento

```javascript
// Código existente sigue funcionando igual
const nuevoTurno = await turnosService.crearTurno({
  empleadoId: '123abc',
  nombreEmpleado: 'Juan Pérez',
  area: 'TAQUILLEROS',
  turno: 'TURNO_100',
  // ... resto de datos
});
```

### Consultar Historial Completo
```javascript
// GET /api/empleado/:id/historial
const historial = await turnosService.obtenerHistorialEmpleado(empleadoId);

// Respuesta:
{
  empleadoId: '123abc',
  nombreEmpleado: 'Juan Pérez',
  turnoActual: { ... },
  historialTurnos: [
    { turno más reciente },
    { turno anterior },
    { turno más antiguo }
  ],
  totalTurnos: 3
}
```

### Consultar Turno Actual
```javascript
// GET /api/empleado/:id/turno-actual
const turnoActual = await turnosService.obtenerTurnoActual(empleadoId);

// Respuesta:
{
  empleadoId: '123abc',
  nombreEmpleado: 'Juan Pérez',
  turnoActual: { resumen rápido },
  detalleCompleto: { cronograma completo }
}
```

## 🚀 Migración de Datos Existentes

### Script de Migración
Se incluye un script automático: `migrations/migrarTurnosAHistorial.js`

```bash
# Ejecutar migración
node backend/migrations/migrarTurnosAHistorial.js
```

### Pasos de la Migración
1. ✅ Lee todos los turnos existentes
2. ✅ Agrupa por empleadoId
3. ✅ Crea nuevos documentos en colección temporal `turnos_nuevo`
4. ⚠️ Verifica los datos
5. ⚠️ Hace backup de colección original
6. ⚠️ Renombra colecciones:
   ```javascript
   // En MongoDB shell:
   db.turnos.renameCollection("turnos_backup")
   db.turnos_nuevo.renameCollection("turnos")
   ```

## 📊 Ventajas del Nuevo Sistema

### ✅ Ventajas
1. **Consulta rápida de historial**: Un solo query para todo el historial
2. **Menos documentos**: Un documento por empleado en lugar de múltiples
3. **Integridad referencial**: No hay turnos huérfanos
4. **Performance mejorado**: Índice único en empleadoId
5. **Auditoría completa**: Historial completo con fechas de creación
6. **Turno actual indexado**: Campo `turnoActual` para búsquedas rápidas

### 🎯 Casos de Uso
- ✅ Ver todos los turnos asignados a un empleado
- ✅ Saber cuántas veces cambió de turno
- ✅ Consultar qué turno tenía en una fecha específica
- ✅ Generar reportes de historial laboral
- ✅ Auditoría de asignaciones

## 🔍 Consultas Útiles

### MongoDB Shell

```javascript
// Ver historial de un empleado
db.turnos.findOne({ empleadoId: ObjectId("...") })

// Contar turnos por empleado
db.turnos.aggregate([
  { $project: { 
      nombreEmpleado: 1, 
      totalTurnos: { $size: "$historialTurnos" } 
  }}
])

// Empleados con turno activo
db.turnos.find({ "turnoActual.activo": true })

// Historial en rango de fechas
db.turnos.aggregate([
  { $unwind: "$historialTurnos" },
  { $match: { 
      "historialTurnos.fechaInicio": { $gte: ISODate("2025-11-01") },
      "historialTurnos.fechaFin": { $lte: ISODate("2025-11-30") }
  }}
])
```

## ⚠️ Consideraciones

1. **Backup obligatorio**: Siempre hacer backup antes de migrar
2. **Testing**: Probar en ambiente de desarrollo primero
3. **Índices**: Los índices se crean automáticamente
4. **Tamaño de documento**: MongoDB soporta hasta 16MB por documento
5. **Performance**: Si un empleado tiene >1000 turnos, considerar archivado

## 🛠️ Troubleshooting

### Error: "E11000 duplicate key error"
**Causa**: Intentar crear dos documentos con el mismo empleadoId  
**Solución**: El sistema ahora actualiza automáticamente, no debería ocurrir

### No se ve el historial
**Causa**: Migración no completada  
**Solución**: Ejecutar script de migración

### Consultas lentas
**Causa**: Falta de índices  
**Solución**: Los índices se crean automáticamente, verificar con:
```javascript
db.turnos.getIndexes()
```

## 📞 Soporte

Para dudas o problemas, revisar:
1. Logs del servidor: Buscar mensajes con 🆕 o ✅
2. Colección `turnos_nuevo` si migración falla
3. Backup en `turnos_backup` para rollback
