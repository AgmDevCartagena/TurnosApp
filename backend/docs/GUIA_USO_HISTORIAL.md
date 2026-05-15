# 🚀 GUÍA RÁPIDA: Sistema de Historial de Turnos

## ✅ ¿Qué ha cambiado?

### ANTES ❌
```
Base de Datos: turnos/
  ├── Documento 1: Juan - Turno Nov 1-15
  ├── Documento 2: Juan - Turno Nov 16-30  ← DUPLICADO
  ├── Documento 3: Juan - Turno Dic 1-31   ← DUPLICADO
  ├── Documento 4: María - Turno Nov 1-15
  └── Documento 5: María - Turno Nov 16-30 ← DUPLICADO
```
**Problema**: Múltiples documentos por empleado

### AHORA ✅
```
Base de Datos: turnos/
  ├── Documento Juan:
  │   ├── empleadoId: 123
  │   ├── turnoActual: Dic 1-31 (FIJO)
  │   └── historialTurnos: [
  │       Nov 1-15 (MAÑANA),
  │       Nov 16-30 (TARDE),
  │       Dic 1-31 (FIJO)  ← ACTUAL
  │     ]
  └── Documento María:
      ├── empleadoId: 456
      ├── turnoActual: Nov 16-30 (TARDE)
      └── historialTurnos: [
          Nov 1-15 (MAÑANA),
          Nov 16-30 (TARDE)  ← ACTUAL
        ]
```
**Solución**: Un documento por empleado con historial completo

## 🎯 ¿Necesitas cambiar algo en tu código?

### ❌ NO, el código sigue igual:

```javascript
// Tu código de asignación de turnos NO cambia
exports.asignarTurnosTaquilleros = async (req, res) => {
  // ... validaciones ...
  
  // Esto sigue funcionando EXACTAMENTE igual
  const turnoCreado = await turnosService.crearTurno({
    empleadoId: empleado._id,
    nombreEmpleado: empleado.nombre,
    area: 'TAQUILLEROS',
    turno: 'TURNO_100',
    // ... resto de datos
  });
  
  // El sistema automáticamente:
  // ✅ Busca si el empleado ya tiene turnos
  // ✅ Si SÍ: agrega al historial existente
  // ✅ Si NO: crea nuevo documento
};
```

## 📦 Archivos Creados/Modificados

### ✏️ Modificados:
1. **backend/models/Turno.js** - Nuevo esquema con historial
2. **backend/services/turnosService.js** - Lógica de historial
3. **backend/controllers/turnoController.js** - Nuevos endpoints
4. **backend/routes/turnos.js** - Nuevas rutas

### ➕ Creados:
1. **backend/migrations/migrarTurnosAHistorial.js** - Script de migración
2. **backend/tests/probarHistorial.js** - Script de prueba
3. **backend/HISTORIAL_TURNOS.md** - Documentación completa
4. **backend/RESUMEN_CAMBIOS_HISTORIAL.md** - Resumen de cambios
5. **backend/GUIA_USO_HISTORIAL.md** - Esta guía

## 🧪 Probar el Sistema

### Opción 1: Script de Prueba Automatizado
```bash
# Ejecutar prueba completa (crea empleado, asigna 3 turnos, verifica historial)
cd backend
node tests/probarHistorial.js
```

**El script automáticamente**:
- ✅ Crea un empleado de prueba
- ✅ Asigna 3 turnos diferentes al mismo empleado
- ✅ Verifica que se guarden en 1 solo documento
- ✅ Muestra el historial completo
- ✅ Limpia los datos de prueba

### Opción 2: Prueba Manual

#### Paso 1: Asignar primer turno
```http
POST http://localhost:3001/api/asignar-taquilleros
Content-Type: application/json

{
  "asignaciones": [{
    "empleadoId": "TU_EMPLEADO_ID",
    "nombre": "Juan Pérez",
    "subarea": "MEGABUS",
    "turno": "T100",
    "tablaDescanso": "A",
    "fechaInicio": "2025-11-01",
    "fechaFin": "2025-11-15"
  }]
}
```

#### Paso 2: Asignar segundo turno (mismo empleado)
```http
POST http://localhost:3001/api/asignar-taquilleros
Content-Type: application/json

{
  "asignaciones": [{
    "empleadoId": "TU_EMPLEADO_ID",  ← MISMO ID
    "nombre": "Juan Pérez",
    "subarea": "MEGABUS",
    "turno": "T300",
    "tablaDescanso": "B",
    "fechaInicio": "2025-11-16",
    "fechaFin": "2025-11-30"
  }]
}
```

#### Paso 3: Consultar historial
```http
GET http://localhost:3001/api/empleado/TU_EMPLEADO_ID/historial
```

**Respuesta esperada**:
```json
{
  "success": true,
  "data": {
    "empleadoId": "TU_EMPLEADO_ID",
    "nombreEmpleado": "Juan Pérez",
    "turnoActual": {
      "turno": "T300",
      "fechaInicio": "2025-11-16",
      "fechaFin": "2025-11-30",
      "activo": true
    },
    "historialTurnos": [
      {
        "turno": "T300",
        "fechaInicio": "2025-11-16",
        "fechaFin": "2025-11-30",
        "activo": true
      },
      {
        "turno": "T100",
        "fechaInicio": "2025-11-01",
        "fechaFin": "2025-11-15",
        "activo": false
      }
    ],
    "totalTurnos": 2
  }
}
```

#### Paso 4: Verificar en MongoDB
```javascript
// MongoDB Shell o Compass:
db.turnos.find({ empleadoId: ObjectId("TU_EMPLEADO_ID") })

// Deberías ver:
// - 1 solo documento
// - historialTurnos[] con 2 items
```

## 🔄 Migrar Datos Existentes

### Si ya tienes turnos en la base de datos:

```bash
# 1. HACER BACKUP (IMPORTANTE!)
mongodump --db turnos_db --out backup_antes_migracion

# 2. Ejecutar migración
cd backend
node migrations/migrarTurnosAHistorial.js

# 3. Verificar datos migrados
# Los datos nuevos estarán en colección "turnos_nuevo"
# Los datos originales siguen en "turnos" (sin modificar)

# 4. En MongoDB Shell, aplicar migración:
use turnos_db
db.turnos.renameCollection("turnos_backup")
db.turnos_nuevo.renameCollection("turnos")

# 5. Reiniciar servidor
# Los nuevos datos ahora están activos
```

## 📊 Endpoints Disponibles

### 1. Consultar Historial Completo
```http
GET /api/empleado/:id/historial
```
Devuelve todos los turnos asignados al empleado

### 2. Consultar Turno Actual
```http
GET /api/empleado/:id/turno-actual
```
Devuelve solo el turno activo del empleado

### 3. Asignar Turnos (sin cambios)
```http
POST /api/asignar-taquilleros
POST /api/asignar-administrativos
POST /api/asignar-centro-control
POST /api/asignar-operaciones
POST /api/asignar-conductores
POST /api/asignar-mantenimiento
```
Siguen funcionando igual, ahora guardan en historial automáticamente

## ❓ FAQ

### ¿Qué pasa si asigno un turno a un empleado que ya tiene turnos?
✅ Se agrega al historial del documento existente. NO se crea un documento nuevo.

### ¿Se pierden los turnos anteriores?
❌ No. Todos quedan guardados en el array `historialTurnos[]`.

### ¿Necesito modificar mi frontend?
❌ No. Los endpoints de asignación siguen funcionando igual.

### ¿Puedo consultar el historial desde el frontend?
✅ Sí. Usa los nuevos endpoints:
- `/api/empleado/:id/historial` - Historial completo
- `/api/empleado/:id/turno-actual` - Solo el actual

### ¿Qué pasa con los turnos que ya tengo en la BD?
⚠️ Debes ejecutar el script de migración para convertirlos al nuevo formato.

### ¿Es segura la migración?
✅ Sí. El script crea una colección temporal `turnos_nuevo` sin tocar los datos originales.

### ¿Puedo revertir la migración si algo sale mal?
✅ Sí. Los datos originales quedan en `turnos_backup` para rollback.

## 🎯 Verificar que Todo Funciona

### Checklist:
- [ ] Servidor iniciado sin errores
- [ ] Asignar turno a empleado → éxito
- [ ] Asignar otro turno al MISMO empleado → éxito
- [ ] Consultar historial → muestra 2 turnos
- [ ] Verificar en MongoDB → 1 solo documento con array de 2 items

### Comandos Útiles:
```bash
# Ver logs del servidor
cd backend
node server.js

# Ejecutar prueba automática
node tests/probarHistorial.js

# Consultar BD directamente
mongo
use turnos_db
db.turnos.find().pretty()
```

## 🎉 Beneficios Inmediatos

1. ✅ **Menos documentos**: 100 empleados = 100 documentos (antes: miles)
2. ✅ **Consultas más rápidas**: 1 query para todo el historial
3. ✅ **Auditoría completa**: Ver todos los cambios de turno
4. ✅ **No duplicados**: Imposible tener múltiples turnos activos
5. ✅ **Código más limpio**: No cambios en controladores

## 📞 Soporte

Documentación completa en:
- `backend/HISTORIAL_TURNOS.md` - Documentación técnica
- `backend/RESUMEN_CAMBIOS_HISTORIAL.md` - Resumen de cambios
- `backend/GUIA_USO_HISTORIAL.md` - Esta guía

---

**¡El sistema está listo para usar!** 🚀
