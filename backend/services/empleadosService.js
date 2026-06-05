'use strict';

/**
 * Servicio para gestión de empleados
 * PostgreSQL/Prisma como fuente de verdad; MongoDB como escritura secundaria
 * mientras turnoController no esté migrado.
 */

const prisma   = require('../lib/prisma');
const Empleado = require('../models/Empleado'); // sync legado

/**
 * Obtiene todos los empleados con filtros opcionales
 * @param {string|null} area     - nombre del área (string, retrocompat)
 * @param {string|null} mongoEmpresaId - MongoDB ObjectId (legado)
 * @param {string|null} pgEmpresaId   - PostgreSQL UUID (Prisma)
 */
async function obtenerEmpleados(area = null, mongoEmpresaId = null, pgEmpresaId = null) {
  // Si tenemos pgEmpresaId, usar Prisma
  if (pgEmpresaId || (!mongoEmpresaId && !pgEmpresaId)) {
    try {
      const where = {};
      if (pgEmpresaId) where.empresaId = pgEmpresaId;
      if (area) {
        // Buscar área por nombre para obtener su UUID
        const areaPg = await prisma.area.findFirst({
          where: pgEmpresaId
            ? { empresaId: pgEmpresaId, nombre: area.toUpperCase() }
            : { nombre: area.toUpperCase() }
        });
        if (areaPg) where.areaId = areaPg.id;
        else return []; // área no existe en esta empresa
      }
      const empleados = await prisma.empleado.findMany({
        where,
        include: { area: { select: { nombre: true } } },
        orderBy: { nombre: 'asc' }
      });
      return empleados.map(normalizar);
    } catch (err) {
      throw new Error(`Error al obtener empleados: ${err.message}`);
    }
  }
  // Fallback MongoDB (cuando sólo hay mongoEmpresaId)
  const filtros = {};
  if (area) filtros.area = area;
  if (mongoEmpresaId) filtros.empresaId = mongoEmpresaId;
  return Empleado.find(filtros);
}

/**
 * Obtiene un empleado por su ID.
 * Acepta tanto UUID de PostgreSQL como MongoDB ObjectId (período de migración).
 * Siempre devuelve el registro enriquecido con `_id` (MongoDB) para
 * compatibilidad con turnoController que opera sobre Turno (MongoDB).
 */
async function obtenerEmpleadoPorId(empleadoId, anyEmpresaId = null) {
  const isPgUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    .test(String(empleadoId || ''));
  const isPgEmpresa = anyEmpresaId && /^[0-9a-f]{8}-/.test(String(anyEmpresaId));

  if (isPgUuid) {
    try {
      const where = { id: empleadoId };
      if (isPgEmpresa) where.empresaId = anyEmpresaId;
      const emp = await prisma.empleado.findFirst({
        where,
        include: { area: { select: { nombre: true } } }
      });
      if (!emp) return null;
      const mongoEmp = await Empleado.findOne({ documento: emp.documento });
      return { ...normalizar(emp), _id: mongoEmp?._id || null };
    } catch (err) {
      throw new Error(`Error al obtener empleado (PG): ${err.message}`);
    }
  }

  // Fallback: MongoDB ObjectId
  try {
    const mongoEmp = await Empleado.findById(empleadoId);
    if (!mongoEmp) return null;
    const pgEmp = await prisma.empleado.findFirst({
      where: { documento: mongoEmp.documento },
      include: { area: { select: { nombre: true } } }
    });
    if (pgEmp) return { ...normalizar(pgEmp), _id: mongoEmp._id };
    return {
      id: empleadoId, _id: mongoEmp._id,
      nombre: mongoEmp.nombre, apellidos: mongoEmp.apellidos || '',
      documento: mongoEmp.documento, cargo: mongoEmp.cargo || '',
      area: mongoEmp.area || '', salario: mongoEmp.salario || 0,
      estado: mongoEmp.estado, empresaId: mongoEmp.empresaId?.toString() || null
    };
  } catch (err) {
    throw new Error(`Error al obtener empleado (Mongo): ${err.message}`);
  }
}

/**
 * Crea un nuevo empleado
 * @param {object} datos
 * @param {string|null} mongoEmpresaId  - MongoDB ObjectId (legado)
 * @param {string|null} pgEmpresaId     - PostgreSQL UUID (Prisma)
 */
async function crearEmpleado(datos, mongoEmpresaId = null, pgEmpresaId = null) {
  const eid = pgEmpresaId || mongoEmpresaId;
  if (!eid) throw new Error('Debe especificar una empresa para crear el empleado');

  // Resolver areaId por nombre si se provee como string
  let areaId = datos.areaId || null;
  if (!areaId && datos.area && pgEmpresaId) {
    const areaPg = await prisma.area.findFirst({
      where: { empresaId: pgEmpresaId, nombre: datos.area.toString().toUpperCase() }
    });
    areaId = areaPg?.id || null;
  }

  try {
    // ── PostgreSQL (fuente de verdad) ─────────────────────────────────────────
    const pgEmp = await prisma.empleado.create({
      data: {
        empresaId:       pgEmpresaId || datos._pgEmpresaId,
        areaId:          areaId,
        documento:       datos.documento?.toString().trim(),
        nombre:          datos.nombre?.toString().trim(),
        apellidos:       datos.apellidos?.toString().trim() || null,
        cargo:           datos.cargo?.toString().trim()     || null,
        salario:         parseFloat(datos.salario) || 0,
        tipoContrato:    datos.tipoContrato || 'indefinido',
        estado:          datos.estado       || 'activo',
        fechaIngreso:    datos.fechaIngreso    ? new Date(datos.fechaIngreso)    : null,
        fechaRetiro:     datos.fechaRetiro     ? new Date(datos.fechaRetiro)     : null,
        fechaCumpleanos: datos.fechaCumpleanos ? new Date(datos.fechaCumpleanos) : null
      },
      include: { area: { select: { nombre: true } } }
    });

    // ── MongoDB sync (para turnoController legado) ──────────────────────
    try {
      await Empleado.create({
        empresaId:       mongoEmpresaId || null,
        documento:       pgEmp.documento,
        nombre:          pgEmp.nombre,
        apellidos:       pgEmp.apellidos || '',
        cargo:           pgEmp.cargo    || '',
        area:            pgEmp.area?.nombre || datos.area || '',
        salario:         Number(pgEmp.salario),
        tipoContrato:    pgEmp.tipoContrato,
        estado:          pgEmp.estado,
        fechaIngreso:    pgEmp.fechaIngreso    || null,
        fechaRetiro:     pgEmp.fechaRetiro     || null,
        fechaCumpleanos: pgEmp.fechaCumpleanos || null
      });
    } catch (syncErr) {
      if (syncErr.code !== 11000) console.warn('⚠️ Sync Mongo empleado fallida:', syncErr.message);
    }

    return normalizar(pgEmp);
  } catch (err) {
    if (err.code === 'P2002') throw new Error('Ya existe un empleado con esa cédula en esta empresa');
    throw new Error(`Error al crear empleado: ${err.message}`);
  }
}

/**
 * Procesa array de empleados (CSV) y los crea en batch
 * @param {Array}  empleados      - array de objetos empleado
 * @param {string} mongoEmpresaId - MongoDB ObjectId (legado)
 * @param {string} pgEmpresaId    - PostgreSQL UUID
 */
async function procesarEmpleadosCSV(empleados, mongoEmpresaId = null, pgEmpresaId = null) {
  if (!empleados || !Array.isArray(empleados)) {
    throw new Error('Se requiere un array de empleados');
  }

  // Pre-cargar mapa nombre→id de áreas de la empresa en PG
  const areasMap = new Map();
  if (pgEmpresaId) {
    const areas = await prisma.area.findMany({ where: { empresaId: pgEmpresaId } });
    areas.forEach(a => areasMap.set(a.nombre, a.id));
  }

  const resultados = { exitosos: [], errores: [], duplicados: [] };

  for (let i = 0; i < empleados.length; i++) {
    const emp = empleados[i];
    const filaNumero = i + 2;
    try {
      if (!emp.nombre || !emp.documento) {
        resultados.errores.push({ fila: filaNumero, datos: emp, error: 'Nombre y documento son requeridos' });
        continue;
      }
      const nombreLimpio   = emp.nombre.toString().trim();
      const documentoLimpio = emp.documento.toString().trim();
      const cargoLimpio    = emp.cargo ? emp.cargo.toString().trim() : '';
      const salarioNum     = emp.salario ? parseInt(emp.salario) : 0;

      let areaStr = emp.area ? emp.area.toString().trim().toUpperCase() : '';
      if (!areaStr) areaStr = determinarAreaPorCargo(cargoLimpio);

      const validacion = validarDatosEmpleado(nombreLimpio, documentoLimpio);
      if (!validacion.valido) {
        resultados.errores.push({ fila: filaNumero, datos: emp, error: validacion.error });
        continue;
      }

      // Verificar duplicado en PostgreSQL
      if (pgEmpresaId) {
        const dup = await prisma.empleado.findUnique({
          where: { documento_empresaId: { documento: documentoLimpio, empresaId: pgEmpresaId } }
        });
        if (dup) {
          resultados.duplicados.push({ fila: filaNumero, datos: emp, empleadoExistente: dup.nombre });
          continue;
        }
      }

      const areaId = areasMap.get(areaStr) || null;
      const creado = await crearEmpleado(
        { documento: documentoLimpio, nombre: nombreLimpio, cargo: cargoLimpio,
          area: areaStr, areaId, salario: salarioNum,
          fechaIngreso: emp.fechaIngreso || null, fechaCumpleanos: emp.fechaCumpleanos || null },
        mongoEmpresaId, pgEmpresaId
      );
      resultados.exitosos.push({ fila: filaNumero, empleado: creado, area: areaStr });
    } catch (error) {
      resultados.errores.push({ fila: filaNumero, datos: emp, error: error.message });
    }
  }
  return resultados;
}

/**
 * Determina el área de un empleado basado en su cargo
 */
function determinarAreaPorCargo(cargo) {
  const cargoLower = cargo.toLowerCase();
  
  if (cargoLower.includes('vendedores de taquilla') || cargoLower.includes('supervisor de taquilla') || 
      cargoLower.includes('taquillero') || cargoLower.includes('cajero') || cargoLower.includes('recaudador')) {
    return 'TAQUILLEROS';
  } else if (cargoLower.includes('tecnico de mantenimiento') || cargoLower.includes('coordinador de mantenimiento') ||
             cargoLower.includes('tecnico') || cargoLower.includes('mecanico') || cargoLower.includes('electricista')) {
    return 'MANTENIMIENTO';
  } else if (cargoLower.includes('operador de centro de control') || cargoLower.includes('coordinador de centro de control') ||
             cargoLower.includes('operador') || cargoLower.includes('controlador') || cargoLower.includes('despachador')) {
    return 'CENTRO DE CONTROL';
  } else if (cargoLower.includes('conductor') || cargoLower.includes('chofer') || cargoLower.includes('piloto')) {
    return 'CONDUCTORES';
  } else {
    return 'ADMINISTRACION';
  }
}

/**
 * Valida los datos básicos de un empleado
 */
function validarDatosEmpleado(nombre, documento) {
  if (nombre.length < 2) {
    return { valido: false, error: 'El nombre debe tener al menos 2 caracteres' };
  }

  if (documento.length < 5) {
    return { valido: false, error: 'El documento debe tener al menos 5 caracteres' };
  }

  return { valido: true };
}

/**
 * Procesa datos específicos para taquilleros
 */
function procesarDatosTaquillero(emp) {
  const datos = {};
  
  // Subárea - Corregido para usar valores válidos del modelo
  if (emp.subarea) {
    const subarea = emp.subarea.toString().trim().toUpperCase();
    const subareasValidas = ['MEGABUS', 'MEGACABLE'];
    datos.subarea = subareasValidas.includes(subarea) ? subarea : 'MEGABUS';
  } else {
    datos.subarea = 'MEGABUS'; // Valor por defecto válido
  }
  
  // Turno asignado - Corregido para usar valores válidos del modelo
  if (emp.turnoAsignado || emp.turno) {
    const turno = (emp.turnoAsignado || emp.turno).toString().trim().toUpperCase();
    const turnosValidos = ['TURNO_100', 'TURNO_300', 'TURNO_400'];
    datos.turnoAsignado = turnosValidos.includes(turno) ? turno : 'TURNO_100';
  } else {
    datos.turnoAsignado = 'TURNO_100'; // Valor por defecto válido
  }
  
  // Tabla de descanso - Convertir a número
  if (emp.tabla) {
    const tabla = parseInt(emp.tabla.toString().trim());
    datos.tabla = [1, 2, 3, 4, 5].includes(tabla) ? tabla : 1;
  } else {
    datos.tabla = 1; // Valor por defecto válido
  }
  
  return datos;
}

/**
 * Completa datos específicos de taquilleros (busca por documento/cédula)
 */
async function completarDatosTaquillero(cedula, datos) {
  try {
    const emp = await prisma.empleado.findFirst({
      where: { documento: cedula },
      include: { area: { select: { nombre: true } } }
    });
    if (!emp) throw new Error('Empleado no encontrado');
    if (emp.area?.nombre !== 'TAQUILLEROS') throw new Error('Solo se pueden actualizar datos de taquilleros');

    const actualizado = await prisma.empleado.update({
      where: { id: emp.id },
      data: {
        cargo:           datos.cargo           || emp.cargo,
        salario:         datos.salario !== undefined ? parseFloat(datos.salario) : emp.salario,
        tipoContrato:    datos.tipoContrato    || emp.tipoContrato,
        fechaIngreso:    datos.fechaIngreso    ? new Date(datos.fechaIngreso)    : emp.fechaIngreso,
        fechaCumpleanos: datos.fechaCumpleanos ? new Date(datos.fechaCumpleanos) : emp.fechaCumpleanos
      },
      include: { area: { select: { nombre: true } } }
    });

    // Sync MongoDB
    await Empleado.findOneAndUpdate({ documento: cedula }, {
      cargo: actualizado.cargo, salario: Number(actualizado.salario)
    }).catch(() => {});

    return normalizar(actualizado);
  } catch (error) {
    throw new Error(`Error al completar datos: ${error.message}`);
  }
}

/**
 * Busca empleados por nombre o documento (cédula)
 */
async function buscarEmpleados(termino, pgEmpresaId = null) {
  try {
    const where = {
      OR: [
        { nombre:    { contains: termino, mode: 'insensitive' } },
        { apellidos: { contains: termino, mode: 'insensitive' } },
        { documento: { contains: termino } }
      ]
    };
    if (pgEmpresaId) where.empresaId = pgEmpresaId;
    const empleados = await prisma.empleado.findMany({
      where,
      include: { area: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' }
    });
    return empleados.map(normalizar);
  } catch (err) {
    throw new Error(`Error en búsqueda: ${err.message}`);
  }
}

/**
 * Normaliza un registro Prisma al shape esperado por el frontend/legado.
 * Agrega campo `area` (string) para compatibilidad con turnoController.
 */
function normalizar(emp) {
  return {
    ...emp,
    _id:     emp.id,          // alias so frontend code using emp._id gets the PG UUID
    area:    emp.area?.nombre || '',
    salario: Number(emp.salario)
  };
}

module.exports = {
  obtenerEmpleados,
  obtenerEmpleadoPorId,
  crearEmpleado,
  procesarEmpleadosCSV,
  completarDatosTaquillero,
  buscarEmpleados,
  normalizar,
  determinarAreaPorCargo,
  validarDatosEmpleado,
  procesarDatosTaquillero
};