'use strict';

const prisma = require('../lib/prisma');

// ─── helpers ───────────────────────────────────────────────────────────────

const pgEmpresaId = (req) => req.session?.usuario?.pgEmpresaId || null;
const isSA        = (req) => req.session?.usuario?.rol === 'super_admin';

function empresaFilter(req) {
  if (isSA(req) && req.query.empresaId) return req.query.empresaId;
  const eid = pgEmpresaId(req);
  if (!eid) throw Object.assign(new Error('Sin empresa activa'), { status: 403 });
  return eid;
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Clasifica el tipo de turno basado en hora inicio/fin y configuraciones de la empresa.
 * Si no hay configs cargadas, usa reglas por defecto (SPM defaults).
 */
function clasificarTurno(horaInicio, horaFin, configs = []) {
  const hiMin = timeToMinutes(horaInicio);
  const hfMin = timeToMinutes(horaFin);

  // Buscar en configuraciones de empresa
  for (const c of configs) {
    const cIni = timeToMinutes(c.horaInicio);
    const cFin = timeToMinutes(c.horaFin);
    const eIni = c.horaExtensionInicio ? timeToMinutes(c.horaExtensionInicio) : null;
    const eFin = c.horaExtensionFin   ? timeToMinutes(c.horaExtensionFin)   : null;

    const matchBase     = hiMin === cIni && hfMin === cFin;
    const matchExtended = eIni !== null && eFin !== null && hiMin === cIni && hfMin === eFin;

    if (matchExtended && c.esExtendido) {
      return { tipo: 'extendido', merienda: c.generaMerienda, cena: c.generaCena, requiereResponsable: c.requiereResponsable };
    }
    if (matchBase) {
      return { tipo: c.esTurnoNocturno ? 'turno_b' : 'normal', merienda: c.generaMerienda, cena: c.generaCena, requiereResponsable: c.requiereResponsable };
    }
  }

  // Reglas por defecto SPM
  const esNocturno  = hiMin >= 19 * 60 || (hiMin >= 23 * 60); // 19:00+ inicio
  const esExtendido = hiMin <= 8 * 60 && hfMin === 19 * 60;   // 07:00-19:00
  const hiHour      = Math.floor(hiMin / 60);
  const hfHour      = Math.floor(hfMin / 60);

  if (hiHour >= 19) {
    return { tipo: 'turno_b', merienda: false, cena: true, requiereResponsable: true };
  }
  if (esExtendido) {
    return { tipo: 'extendido', merienda: true, cena: false, requiereResponsable: true };
  }
  if (hiHour >= 6 && hiHour <= 8 && (hfHour === 16 || hfHour === 17)) {
    return { tipo: 'normal', merienda: false, cena: false, requiereResponsable: false };
  }
  return { tipo: 'otro', merienda: false, cena: false, requiereResponsable: false };
}

/**
 * Formatea una fecha YYYY-MM-DD como texto con día de semana en español.
 * Usa new Date(y, m-1, d) para evitar desfase UTC.
 * Exportada como _formatFechaConDia para tests unitarios.
 */
function formatFechaConDia(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!parts) return '';
  const [, y, mo, d] = parts.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return 'Fecha no válida';
  const fecha = new Date(y, mo - 1, d);
  if (isNaN(fecha.getTime())) return 'Fecha no válida';
  try {
    const s = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(fecha);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch (_) {
    const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  }
}
exports._formatFechaConDia = formatFechaConDia;

// ─────────────────────────────────────────────────────────────────────────────
// APROBACIÓN POR PERSONA — funciones puras exportadas para tests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida y sanitiza el motivo de rechazo.
 * @returns {{ valido:true, sanitized:string } | { valido:false, error:string }}
 */
function _validarMotivoRechazo(motivo) {
  if (!motivo || !String(motivo).trim()) {
    return { valido: false, error: 'Debe ingresar el motivo del rechazo' };
  }
  const raw = String(motivo);
  if (/<[^>]+>/.test(raw)) {
    return { valido: false, error: 'El motivo contiene caracteres no permitidos' };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 5)   return { valido: false, error: 'El motivo debe tener al menos 5 caracteres' };
  if (trimmed.length > 500) return { valido: false, error: 'El motivo no puede superar 500 caracteres' };
  return { valido: true, sanitized: trimmed };
}
exports._validarMotivoRechazo = _validarMotivoRechazo;

/**
 * Valida y sanitiza los campos de una programación de transporte.
 * Función pura — no tiene efectos secundarios.
 * @param {object} body — campos del formulario (parcial o completo)
 * @returns {object} errores por campo. Objeto vacío si todo es válido.
 */
const TIPOS_MOVIMIENTO_PERMITIDOS = ['salida', 'recogida', 'retorno'];
const HTML_RE = /<[^>]+>/;

function _validarCamposProgramacion(body) {
  const errors = {};

  // ── fecha (obligatoria, formato YYYY-MM-DD, fecha real) ─────────────────────
  const fechaRaw = body.fecha != null ? String(body.fecha).trim() : '';
  if (!fechaRaw) {
    errors.fecha = 'La fecha es obligatoria.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)) {
    errors.fecha = 'La fecha debe tener el formato YYYY-MM-DD.';
  } else {
    const [y, mo, d] = fechaRaw.split('-').map(Number);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) {
      errors.fecha = 'La fecha ingresada no es válida.';
    } else {
      const dt = new Date(y, mo - 1, d);
      if (isNaN(dt.getTime()) || dt.getFullYear() !== y || dt.getMonth() + 1 !== mo || dt.getDate() !== d) {
        errors.fecha = 'La fecha ingresada no es válida.';
      }
    }
  }

  // ── horaSalida (obligatoria, formato HH:mm, valores válidos) ────────────────
  const horaRaw = body.horaSalida != null ? String(body.horaSalida).trim() : '';
  if (!horaRaw) {
    errors.horaSalida = 'La hora de salida es obligatoria.';
  } else if (!/^\d{2}:\d{2}$/.test(horaRaw)) {
    errors.horaSalida = 'La hora debe tener el formato HH:mm (ej: 19:00).';
  } else {
    const [h, m] = horaRaw.split(':').map(Number);
    if (h > 23 || m > 59) errors.horaSalida = 'La hora ingresada no es válida.';
  }

  // ── tipoMovimiento (enum, opcional — usa default 'salida') ──────────────────
  if (body.tipoMovimiento !== undefined && body.tipoMovimiento !== null && body.tipoMovimiento !== '') {
    if (!TIPOS_MOVIMIENTO_PERMITIDOS.includes(String(body.tipoMovimiento))) {
      errors.tipoMovimiento = `Tipo de movimiento no permitido. Valores válidos: ${TIPOS_MOVIMIENTO_PERMITIDOS.join(', ')}.`;
    }
  }

  // ── conductorManual (opcional, 3-100 chars, sin HTML) ───────────────────────
  if (body.conductorManual !== undefined && body.conductorManual !== null) {
    const v = String(body.conductorManual).trim();
    if (v !== '') {
      if (HTML_RE.test(v)) {
        errors.conductorManual = 'El conductor manual contiene caracteres no permitidos.';
      } else if (v.length < 3) {
        errors.conductorManual = 'El conductor manual debe tener al menos 3 caracteres.';
      } else if (v.length > 100) {
        errors.conductorManual = 'El conductor manual no puede superar 100 caracteres.';
      }
    }
  }

  // ── placaManual (opcional, máx 20 chars, sin HTML) ──────────────────────────
  if (body.placaManual !== undefined && body.placaManual !== null) {
    const v = String(body.placaManual).trim();
    if (v !== '') {
      if (HTML_RE.test(v)) {
        errors.placaManual = 'La placa contiene caracteres no permitidos.';
      } else if (v.length > 20) {
        errors.placaManual = 'La placa no puede superar 20 caracteres.';
      }
    }
  }

  // ── titulo (opcional, máx 150 chars, sin HTML) ──────────────────────────────
  if (body.titulo !== undefined && body.titulo !== null) {
    const v = String(body.titulo).trim();
    if (v !== '') {
      if (HTML_RE.test(v)) {
        errors.titulo = 'El título contiene caracteres no permitidos.';
      } else if (v.length > 150) {
        errors.titulo = 'El título no puede superar 150 caracteres.';
      }
    }
  }

  // ── observaciones (opcional, máx 500 chars, sin HTML) ──────────────────────
  if (body.observaciones !== undefined && body.observaciones !== null) {
    const v = String(body.observaciones).trim();
    if (v !== '') {
      if (HTML_RE.test(v)) {
        errors.observaciones = 'Las observaciones contienen caracteres no permitidos.';
      } else if (v.length > 500) {
        errors.observaciones = 'Las observaciones no pueden superar 500 caracteres.';
      }
    }
  }

  return errors;
}
exports._validarCamposProgramacion = _validarCamposProgramacion;

/**
 * Pura: calcula el nuevo estado de la programación basándose en los estados
 * individuales de los detalles. Retorna null cuando no debe haber cambio
 * (hay pendientes, o el estado actual protege la programación).
 * @param {string[]} estadosDetalles  — valores 'pendiente'|'aprobado'|'rechazado'
 * @param {string}   estadoActualProg — estado actual de ProgramacionTransporte
 */
function _recalcularEstadoLogic(estadosDetalles, estadoActualProg) {
  if (!estadosDetalles || estadosDetalles.length === 0) return null;
  if (['enviada', 'cerrada', 'anulada'].includes(estadoActualProg)) return null;
  const pendientes = estadosDetalles.filter(e => e === 'pendiente').length;
  if (pendientes > 0) return null;
  const rechazados = estadosDetalles.filter(e => e === 'rechazado').length;
  if (rechazados > 0) return 'aprobada_con_rechazos';
  return 'aprobada';
}
exports._recalcularEstadoLogic = _recalcularEstadoLogic;

// ─── helpers privados (permiso + área + recálculo) ────────────────────────────

async function tienePermiso(req, eid, codigoPermiso) {
  if (req.esSuperAdmin) return true;
  const pgId = req.pgId || req.session?.usuario?.pgId;
  if (!pgId || !eid) return false;
  const ue = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId: pgId, empresaId: eid } }
  });
  if (!ue || ue.estado !== 'activo') return false;
  const rolPerm = await prisma.rolPermiso.findFirst({
    where: { rolId: ue.rolId, permiso: { codigo: codigoPermiso, estado: 'activo' } }
  });
  if (rolPerm) return true;
  const userPerm = await prisma.usuarioEmpresaPermiso.findFirst({
    where: { usuarioEmpresaId: ue.id, permiso: { codigo: codigoPermiso, estado: 'activo' }, permitido: true }
  });
  return Boolean(userPerm);
}

async function tieneAreaAsignada(req, areaId, eid) {
  if (req.esSuperAdmin) return true;
  if (!areaId) return true;
  const pgId = req.pgId || req.session?.usuario?.pgId;
  if (!pgId) return false;
  const ue = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId: pgId, empresaId: eid } }
  });
  if (!ue) return false;
  const ua = await prisma.usuarioEmpresaArea.findUnique({
    where: { usuarioEmpresaId_areaId: { usuarioEmpresaId: ue.id, areaId } }
  });
  return Boolean(ua);
}

async function recalcularEstadoProgramacion(programacionId) {
  const prog = await prisma.programacionTransporte.findUnique({
    where: { id: programacionId },
    include: { detalles: { select: { estadoAprobacion: true } } }
  });
  if (!prog) return null;
  const estados = prog.detalles.map(d => d.estadoAprobacion);
  const nuevo   = _recalcularEstadoLogic(estados, prog.estado);
  if (nuevo && nuevo !== prog.estado) {
    await prisma.programacionTransporte.update({ where: { id: programacionId }, data: { estado: nuevo } });
  }
  return nuevo || prog.estado;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGOS: Conductores
// ─────────────────────────────────────────────────────────────────────────────

exports.listarConductores = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const where = { empresaId: eid };
    if (req.query.estado) where.estado = req.query.estado;
    const conductores = await prisma.conductorTransporte.findMany({ where, orderBy: { nombre: 'asc' } });
    res.json({ success: true, conductores });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.crearConductor = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const { nombre, documento, telefono } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ success: false, error: 'Nombre requerido' });
    const c = await prisma.conductorTransporte.create({
      data: { empresaId: eid, nombre: nombre.trim(), documento: documento?.trim() || null, telefono: telefono?.trim() || null }
    });
    res.status(201).json({ success: true, conductor: c });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.actualizarConductor = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const c = await prisma.conductorTransporte.findUnique({ where: { id: req.params.id } });
    if (!c || c.empresaId !== eid) return res.status(404).json({ success: false, error: 'Conductor no encontrado' });
    const { nombre, documento, telefono, estado } = req.body;
    const data = {};
    if (nombre)    data.nombre    = nombre.trim();
    if (documento) data.documento = documento.trim();
    if (telefono)  data.telefono  = telefono.trim();
    if (estado)    data.estado    = estado;
    const updated = await prisma.conductorTransporte.update({ where: { id: req.params.id }, data });
    res.json({ success: true, conductor: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.cambiarEstadoConductor = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const c = await prisma.conductorTransporte.findUnique({ where: { id: req.params.id } });
    if (!c || c.empresaId !== eid) return res.status(404).json({ success: false, error: 'Conductor no encontrado' });
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) return res.status(400).json({ success: false, error: 'Estado inválido' });
    const updated = await prisma.conductorTransporte.update({ where: { id: req.params.id }, data: { estado } });
    res.json({ success: true, conductor: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGOS: Vehículos
// ─────────────────────────────────────────────────────────────────────────────

exports.listarVehiculos = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const where = { empresaId: eid };
    if (req.query.estado) where.estado = req.query.estado;
    const vehiculos = await prisma.vehiculoTransporte.findMany({ where, orderBy: { placa: 'asc' } });
    res.json({ success: true, vehiculos });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.crearVehiculo = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const { placa, descripcion, capacidad } = req.body;
    if (!placa?.trim()) return res.status(400).json({ success: false, error: 'Placa requerida' });
    const v = await prisma.vehiculoTransporte.create({
      data: { empresaId: eid, placa: placa.trim().toUpperCase(), descripcion: descripcion?.trim() || null, capacidad: capacidad ? Number(capacidad) : null }
    });
    res.status(201).json({ success: true, vehiculo: v });
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ success: false, error: 'Ya existe un vehículo con esa placa' });
    res.status(e.status || 500).json({ success: false, error: e.message });
  }
};

exports.actualizarVehiculo = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const v = await prisma.vehiculoTransporte.findUnique({ where: { id: req.params.id } });
    if (!v || v.empresaId !== eid) return res.status(404).json({ success: false, error: 'Vehículo no encontrado' });
    const { placa, descripcion, capacidad, estado } = req.body;
    const data = {};
    if (placa)       data.placa       = placa.trim().toUpperCase();
    if (descripcion) data.descripcion = descripcion.trim();
    if (capacidad)   data.capacidad   = Number(capacidad);
    if (estado)      data.estado      = estado;
    const updated = await prisma.vehiculoTransporte.update({ where: { id: req.params.id }, data });
    res.json({ success: true, vehiculo: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.cambiarEstadoVehiculo = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const v = await prisma.vehiculoTransporte.findUnique({ where: { id: req.params.id } });
    if (!v || v.empresaId !== eid) return res.status(404).json({ success: false, error: 'Vehículo no encontrado' });
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) return res.status(400).json({ success: false, error: 'Estado inválido' });
    const updated = await prisma.vehiculoTransporte.update({ where: { id: req.params.id }, data: { estado } });
    res.json({ success: true, vehiculo: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGOS: Ubicaciones
// ─────────────────────────────────────────────────────────────────────────────

exports.listarUbicaciones = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const where = { empresaId: eid };
    if (req.query.estado) where.estado = req.query.estado;
    const ubicaciones = await prisma.ubicacionRuta.findMany({ where, orderBy: { nombre: 'asc' } });
    res.json({ success: true, ubicaciones });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.crearUbicacion = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const { nombre, descripcion } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ success: false, error: 'Nombre requerido' });
    const u = await prisma.ubicacionRuta.create({
      data: { empresaId: eid, nombre: nombre.trim().toUpperCase(), descripcion: descripcion?.trim() || null }
    });
    res.status(201).json({ success: true, ubicacion: u });
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ success: false, error: 'Ya existe esa ubicación' });
    res.status(e.status || 500).json({ success: false, error: e.message });
  }
};

exports.actualizarUbicacion = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const u = await prisma.ubicacionRuta.findUnique({ where: { id: req.params.id } });
    if (!u || u.empresaId !== eid) return res.status(404).json({ success: false, error: 'Ubicación no encontrada' });
    const { nombre, descripcion, estado } = req.body;
    const data = {};
    if (nombre)      data.nombre      = nombre.trim().toUpperCase();
    if (descripcion) data.descripcion = descripcion.trim();
    if (estado)      data.estado      = estado;
    const updated = await prisma.ubicacionRuta.update({ where: { id: req.params.id }, data });
    res.json({ success: true, ubicacion: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.cambiarEstadoUbicacion = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const u = await prisma.ubicacionRuta.findUnique({ where: { id: req.params.id } });
    if (!u || u.empresaId !== eid) return res.status(404).json({ success: false, error: 'Ubicación no encontrada' });
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) return res.status(400).json({ success: false, error: 'Estado inválido' });
    const updated = await prisma.ubicacionRuta.update({ where: { id: req.params.id }, data: { estado } });
    res.json({ success: true, ubicacion: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE TURNOS (parametrizable)
// ─────────────────────────────────────────────────────────────────────────────

exports.listarConfigTurnos = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const configs = await prisma.configuracionTurnoOp.findMany({
      where: { empresaId: eid },
      orderBy: { codigo: 'asc' }
    });
    res.json({ success: true, configs });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.crearConfigTurno = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const { codigo, nombreTurno, horaInicio, horaFin, horaExtensionInicio, horaExtensionFin,
            generaMerienda, generaCena, requiereResponsable, esExtendido, esTurnoNocturno } = req.body;
    if (!codigo || !horaInicio || !horaFin)
      return res.status(400).json({ success: false, error: 'codigo, horaInicio y horaFin son requeridos' });
    const c = await prisma.configuracionTurnoOp.create({
      data: {
        empresaId: eid, codigo: codigo.toUpperCase().trim(), nombreTurno: nombreTurno || codigo,
        horaInicio, horaFin,
        horaExtensionInicio: horaExtensionInicio || null,
        horaExtensionFin:    horaExtensionFin    || null,
        generaMerienda:      Boolean(generaMerienda),
        generaCena:          Boolean(generaCena),
        requiereResponsable: Boolean(requiereResponsable),
        esExtendido:         Boolean(esExtendido),
        esTurnoNocturno:     Boolean(esTurnoNocturno)
      }
    });
    res.status(201).json({ success: true, config: c });
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ success: false, error: 'Ya existe configuración con ese código' });
    res.status(e.status || 500).json({ success: false, error: e.message });
  }
};

exports.actualizarConfigTurno = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const c = await prisma.configuracionTurnoOp.findUnique({ where: { id: req.params.id } });
    if (!c || c.empresaId !== eid) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    const updated = await prisma.configuracionTurnoOp.update({
      where: { id: req.params.id },
      data: { ...req.body }
    });
    res.json({ success: true, config: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.cambiarEstadoConfigTurno = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const c = await prisma.configuracionTurnoOp.findUnique({ where: { id: req.params.id } });
    if (!c || c.empresaId !== eid) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    const updated = await prisma.configuracionTurnoOp.update({
      where: { id: req.params.id },
      data: { activo: !c.activo }
    });
    res.json({ success: true, config: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMACIÓN DE TRANSPORTE — CRUD principal
// ─────────────────────────────────────────────────────────────────────────────

exports.listarProgramaciones = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const where = { empresaId: eid };
    if (req.query.fecha)  where.fecha  = new Date(req.query.fecha);
    if (req.query.estado) where.estado = req.query.estado;

    const rows = await prisma.programacionTransporte.findMany({
      where,
      include: {
        conductor: true,
        vehiculo:  true,
        _count: { select: { detalles: true, novedades: true } }
      },
      orderBy: [{ fecha: 'desc' }, { horaSalida: 'asc' }]
    });
    const programaciones = rows.map(p => ({
      ...p,
      fechaStr: p.fecha instanceof Date ? p.fecha.toISOString().split('T')[0] : null
    }));
    res.json({ success: true, programaciones });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.obtenerProgramacion = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const p = await prisma.programacionTransporte.findUnique({
      where: { id: req.params.id },
      include: {
        conductor: true,
        vehiculo:  true,
        detalles: { include: { ubicacion: true, area: true }, orderBy: { orden: 'asc' } },
        serviciosAlimentacion: true,
        novedades: true
      }
    });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });

    // Calcular flags de permiso una sola vez
    const canAprobar  = await tienePermiso(req, eid, 'transporte.programacion.aprobar_area');
    const canRechazar = await tienePermiso(req, eid, 'transporte.programacion.rechazar_area');
    let userAreaIds = [];
    if ((canAprobar || canRechazar) && !req.esSuperAdmin) {
      const pgId = req.pgId || req.session?.usuario?.pgId;
      if (pgId) {
        const ue = await prisma.usuarioEmpresa.findUnique({
          where: { usuarioId_empresaId: { usuarioId: pgId, empresaId: eid } },
          include: { areas: { select: { areaId: true } } }
        });
        userAreaIds = ue?.areas.map(a => a.areaId) || [];
      }
    }

    const detallesConFlags = p.detalles.map(d => ({
      ...d,
      puedeAprobar:  canAprobar  && (req.esSuperAdmin || !d.areaId || userAreaIds.includes(d.areaId)),
      puedeRechazar: canRechazar && (req.esSuperAdmin || !d.areaId || userAreaIds.includes(d.areaId))
    }));

    const fechaStr = p.fecha instanceof Date ? p.fecha.toISOString().split('T')[0] : null;
    res.json({ success: true, programacion: { ...p, detalles: detallesConFlags, fechaStr } });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.crearProgramacion = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const { fecha, horaSalida, tipoMovimiento, titulo, conductorId, vehiculoId, placaManual, conductorManual, observaciones } = req.body;

    const fieldErrors = _validarCamposProgramacion(req.body);
    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({ success: false, error: 'Datos inválidos', fields: fieldErrors });
    }

    if (conductorId) {
      const cond = await prisma.conductorTransporte.findUnique({ where: { id: conductorId } });
      if (!cond || cond.empresaId !== eid) return res.status(400).json({ success: false, error: 'Conductor inactivo o no pertenece a la empresa' });
      if (cond.estado !== 'activo') return res.status(400).json({ success: false, error: 'El conductor está inactivo' });
    }
    if (vehiculoId) {
      const veh = await prisma.vehiculoTransporte.findUnique({ where: { id: vehiculoId } });
      if (!veh || veh.empresaId !== eid) return res.status(400).json({ success: false, error: 'Vehículo no pertenece a la empresa' });
      if (veh.estado !== 'activo') return res.status(400).json({ success: false, error: 'El vehículo está inactivo' });
    }

    const p = await prisma.programacionTransporte.create({
      data: {
        empresaId: eid,
        fecha:     new Date(fecha),
        horaSalida,
        tipoMovimiento: tipoMovimiento || 'salida',
        titulo:         titulo?.trim() || null,
        conductorId:    conductorId    || null,
        vehiculoId:     vehiculoId     || null,
        placaManual:    placaManual?.trim().toUpperCase() || null,
        conductorManual: conductorManual?.trim() || null,
        observaciones:  observaciones?.trim() || null,
        creadoPorId:    req.session?.usuario?.pgId || null
      }
    });
    res.status(201).json({ success: true, programacion: p });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.actualizarProgramacion = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const p = await prisma.programacionTransporte.findUnique({ where: { id: req.params.id } });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });
    if (['cerrada', 'anulada'].includes(p.estado)) return res.status(400).json({ success: false, error: 'No se puede editar una programación cerrada o anulada' });

    const fieldErrors = _validarCamposProgramacion(req.body);
    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({ success: false, error: 'Datos inválidos', fields: fieldErrors });
    }

    const { fecha, horaSalida, tipoMovimiento, titulo, conductorId, vehiculoId, placaManual, conductorManual, observaciones } = req.body;
    const data = {};
    if (fecha)           data.fecha           = new Date(fecha);
    if (horaSalida)      data.horaSalida      = horaSalida;
    if (tipoMovimiento)  data.tipoMovimiento  = tipoMovimiento;
    if (titulo !== undefined) data.titulo     = titulo?.trim() || null;
    if (conductorId !== undefined) data.conductorId    = conductorId || null;
    if (vehiculoId  !== undefined) data.vehiculoId     = vehiculoId  || null;
    if (placaManual !== undefined) data.placaManual    = placaManual?.trim().toUpperCase() || null;
    if (conductorManual !== undefined) data.conductorManual = conductorManual?.trim() || null;
    if (observaciones !== undefined)   data.observaciones   = observaciones?.trim() || null;

    const updated = await prisma.programacionTransporte.update({ where: { id: req.params.id }, data });
    res.json({ success: true, programacion: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.cambiarEstadoProgramacion = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const p = await prisma.programacionTransporte.findUnique({
      where: { id: req.params.id },
      include: { detalles: true }
    });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });

    const { estado } = req.body;
    const estadosValidos = ['borrador', 'validada', 'aprobada', 'enviada', 'cerrada', 'anulada'];
    if (!estadosValidos.includes(estado)) return res.status(400).json({ success: false, error: 'Estado inválido' });

    if (estado === 'aprobada') {
      if (p.detalles.length === 0) return res.status(400).json({ success: false, error: 'No puede aprobar una programación vacía' });
      if (!p.conductorId && !p.conductorManual) return res.status(400).json({ success: false, error: 'Debe asignar un conductor antes de aprobar' });
      if (!p.vehiculoId && !p.placaManual) return res.status(400).json({ success: false, error: 'Debe asignar placa del vehículo antes de aprobar' });
    }

    const data = { estado };
    if (estado === 'aprobada') data.aprobadoPorId  = req.session?.usuario?.pgId || null;
    if (estado === 'validada') data.revisadoPorId  = req.session?.usuario?.pgId || null;

    const updated = await prisma.programacionTransporte.update({ where: { id: req.params.id }, data });
    res.json({ success: true, programacion: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.eliminarProgramacion = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const p = await prisma.programacionTransporte.findUnique({ where: { id: req.params.id } });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });
    if (['aprobada', 'enviada', 'cerrada'].includes(p.estado))
      return res.status(400).json({ success: false, error: 'Solo se pueden eliminar programaciones en borrador o anuladas' });
    await prisma.programacionTransporte.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Programación eliminada' });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DETALLES (personas en la programación)
// ─────────────────────────────────────────────────────────────────────────────

exports.agregarDetalle = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const p = await prisma.programacionTransporte.findUnique({ where: { id: req.params.id } });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });

    const { nombreEmpleado, documentoEmpleado, areaNombre: areaNombreRaw, coordinadorNombre, cargo, fecha,
            horaInicio, horaFin, ubicacionId, ubicacionTexto, requiereRuta, observacion, orden,
            esResponsableAlimentacion, tipoResponsabilidad, areaId, tipoPersona, crearComoEmpleado } = req.body;
    let empleadoId        = req.body.empleadoId || null;
    let areaNombreResuelto = areaNombreRaw?.trim() || null;

    if (!nombreEmpleado?.trim()) return res.status(400).json({ success: false, error: 'nombreEmpleado requerido' });
    if (!horaInicio || !horaFin) return res.status(400).json({ success: false, error: 'horaInicio y horaFin son requeridos' });

    const fechaDetalle = fecha ? new Date(fecha) : p.fecha;

    // Validar duplicado
    const existe = await prisma.detalleProgramTransporte.findFirst({
      where: { programacionId: p.id, nombreEmpleado: nombreEmpleado.trim(), fecha: fechaDetalle, horaInicio }
    });
    if (existe) return res.status(400).json({ success: false, error: 'La persona ya está incluida en esta programación con el mismo horario' });

    // Validar empleado de otra empresa
    if (empleadoId) {
      const emp = await prisma.empleado.findUnique({ where: { id: empleadoId } });
      if (!emp || emp.empresaId !== eid) return res.status(400).json({ success: false, error: 'No puede incluir empleados de otra empresa' });
    }

    // Validar área y resolver nombre canónico
    if (areaId) {
      const area = await prisma.area.findUnique({ where: { id: areaId } });
      if (!area || area.empresaId !== eid) {
        return res.status(400).json({ success: false, error: 'El área seleccionada no pertenece a esta empresa' });
      }
      if (area.estado !== 'activo') {
        return res.status(400).json({ success: false, error: 'El área seleccionada está inactiva' });
      }
      areaNombreResuelto = area.nombre;
    }

    // Crear empleado si se solicita y no existe ya
    if (crearComoEmpleado && tipoPersona === 'empleado_nuevo' && !empleadoId) {
      if (!documentoEmpleado?.trim()) {
        return res.status(400).json({ success: false, error: 'Documento es requerido para crear empleado' });
      }
      try {
        const nuevoEmp = await prisma.empleado.create({
          data: {
            empresaId: eid,
            areaId:    areaId || null,
            documento: documentoEmpleado.trim(),
            nombre:    nombreEmpleado.trim(),
            cargo:     cargo?.trim() || null,
            estado:    'activo'
          }
        });
        empleadoId = nuevoEmp.id;
      } catch (err) {
        if (err.code === 'P2002') {
          return res.status(400).json({ success: false, error: 'Ya existe un empleado con ese documento en esta empresa' });
        }
        throw err;
      }
    }

    // Cargar configs de turno de la empresa
    const configs = await prisma.configuracionTurnoOp.findMany({ where: { empresaId: eid, activo: true } });
    const clasificacion = clasificarTurno(horaInicio, horaFin, configs);

    const maxOrden = await prisma.detalleProgramTransporte.count({ where: { programacionId: p.id } });

    const detalle = await prisma.detalleProgramTransporte.create({
      data: {
        programacionId:    p.id,
        empresaId:         eid,
        empleadoId:        empleadoId        || null,
        nombreEmpleado:    nombreEmpleado.trim(),
        documentoEmpleado: documentoEmpleado?.trim() || null,
        areaId:            areaId            || null,
        areaNombre:        areaNombreResuelto,
        coordinadorNombre: coordinadorNombre?.trim()  || null,
        cargo:             cargo?.trim()              || null,
        fecha:             fechaDetalle,
        horaInicio,
        horaFin,
        tipoProgramacion:  clasificacion.tipo,
        requiereMerienda:  clasificacion.merienda,
        requiereCena:      clasificacion.cena,
        requiereRuta:      requiereRuta !== undefined ? Boolean(requiereRuta) : true,
        ubicacionId:       ubicacionId  || null,
        ubicacionTexto:    ubicacionTexto?.trim().toUpperCase() || null,
        esResponsableAlimentacion: Boolean(esResponsableAlimentacion),
        tipoResponsabilidad: tipoResponsabilidad || null,
        orden:             orden !== undefined ? Number(orden) : maxOrden,
        observacion:       observacion?.trim() || null
      },
      include: { ubicacion: true }
    });
    res.status(201).json({ success: true, detalle });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.actualizarDetalle = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const d = await prisma.detalleProgramTransporte.findUnique({ where: { id: req.params.detalleId } });
    if (!d || d.empresaId !== eid) return res.status(404).json({ success: false, error: 'Detalle no encontrado' });
    const { ubicacionId, ubicacionTexto, requiereMerienda, requiereCena, requiereRuta,
            esResponsableAlimentacion, tipoResponsabilidad, observacion, orden, areaNombre } = req.body;
    const data = {};
    if (ubicacionId  !== undefined) data.ubicacionId  = ubicacionId  || null;
    if (ubicacionTexto !== undefined) data.ubicacionTexto = ubicacionTexto?.trim().toUpperCase() || null;
    if (requiereMerienda !== undefined) data.requiereMerienda = Boolean(requiereMerienda);
    if (requiereCena    !== undefined) data.requiereCena     = Boolean(requiereCena);
    if (requiereRuta    !== undefined) data.requiereRuta     = Boolean(requiereRuta);
    if (esResponsableAlimentacion !== undefined) data.esResponsableAlimentacion = Boolean(esResponsableAlimentacion);
    if (tipoResponsabilidad !== undefined) data.tipoResponsabilidad = tipoResponsabilidad || null;
    if (observacion !== undefined) data.observacion = observacion?.trim() || null;
    if (orden       !== undefined) data.orden       = Number(orden);
    if (areaNombre  !== undefined) data.areaNombre  = areaNombre?.trim() || null;
    const updated = await prisma.detalleProgramTransporte.update({ where: { id: req.params.detalleId }, data, include: { ubicacion: true } });
    res.json({ success: true, detalle: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.eliminarDetalle = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const d = await prisma.detalleProgramTransporte.findUnique({ where: { id: req.params.detalleId } });
    if (!d || d.empresaId !== eid) return res.status(404).json({ success: false, error: 'Detalle no encontrado' });
    await prisma.detalleProgramTransporte.delete({ where: { id: req.params.detalleId } });
    res.json({ success: true, message: 'Eliminado' });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTAR TEXTO (parser WhatsApp / texto libre)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Intenta parsear texto libre tipo WhatsApp y extraer:
 * fecha, área, nombre empleado, horaInicio, horaFin, tipoProgramacion
 *
 * Formatos detectados:
 * - "Nombre HH:MM a HH:MM"
 * - "Nombre HH:MM-HH:MM"
 * - "HH:MM a HH:MM Nombre"
 * - "HH:MM-HH:MM Nombre"
 * - Líneas de fecha: "SABADO 30/05", "30-05-2026", "Sábado 30 de mayo"
 * - Líneas de área: todo-en-mayúsculas o precedidas por ✓/✔
 * - Labels de turno: "Turno a", "Turno b", "Turno A extendido"
 */
function parsearTextoWhatsApp(texto, empresaId, configs = []) {
  const lineas   = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const resultado = [];
  const errores   = [];

  let fechaActual     = null;
  let areaActual      = null;
  let labelTurno      = null;
  const MESES = { enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12 };

  const rFechaSlash = /^(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)?\s*(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/i;
  const rFechaGuion = /^(\d{2})-(\d{2})-(\d{4})/;
  const rFechaTexto = /(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)?\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de\s+)?(\d{4})/i;
  const rHora       = /(\d{1,2}[:h]\d{2})/g;
  const rHoraPar    = /(\d{1,2}[:h]\d{2})\s*(?:a|al?|-)\s*(\d{1,2}[:h]\d{2})/i;
  const rTurnoLabel = /turno\s*([aAbBnNoc]+(?:\s+extendido)?)/i;
  const rAreaMarca  = /^[✓✔☑]\s*(.+)/;

  function normHora(h) { return h.replace('h', ':').replace(/^(\d):/, '0$1:'); }

  function esFecha(linea) {
    return rFechaGuion.test(linea) || rFechaSlash.test(linea) || rFechaTexto.test(linea);
  }

  function parseFecha(linea) {
    let m;
    m = linea.match(rFechaGuion);
    if (m) return new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);
    m = linea.match(rFechaSlash);
    if (m) {
      const anio = m[3] || new Date().getFullYear();
      return new Date(`${anio}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);
    }
    m = linea.match(rFechaTexto);
    if (m) {
      const mes = MESES[(m[2] || '').toLowerCase()];
      if (mes) return new Date(`${m[3]}-${String(mes).padStart(2,'0')}-${m[1].padStart(2,'0')}`);
    }
    return null;
  }

  function esAreaLabel(linea) {
    // Precedida por ✓ o toda en mayúsculas sin hora
    if (rAreaMarca.test(linea)) return true;
    if (/^[A-ZÁÉÍÓÚÑ\s]{3,}$/.test(linea) && !rHora.test(linea)) return true;
    return false;
  }

  function esLabelTurno(linea) { return rTurnoLabel.test(linea); }

  function parsearLabelTurno(linea) {
    const m = linea.match(rTurnoLabel);
    if (!m) return null;
    const t = m[1].trim().toLowerCase();
    if (t.includes('b')) return 'B';
    if (t.includes('extendido')) return 'A_EXT';
    if (t.includes('a')) return 'A';
    if (t.includes('noc')) return 'B';
    return null;
  }

  for (const linea of lineas) {
    // Fecha
    if (esFecha(linea)) {
      const f = parseFecha(linea);
      if (f && !isNaN(f)) { fechaActual = f; labelTurno = null; continue; }
    }

    // Label de turno
    if (esLabelTurno(linea)) {
      labelTurno = parsearLabelTurno(linea);
      continue;
    }

    // Área
    if (esAreaLabel(linea)) {
      const m = linea.match(rAreaMarca);
      areaActual = m ? m[1].trim() : linea.trim();
      labelTurno = null;
      continue;
    }

    // Detectar línea de persona con horario
    const matchHora = linea.match(rHoraPar);
    if (matchHora) {
      const horaInicio = normHora(matchHora[1]);
      const horaFin    = normHora(matchHora[2]);

      // Nombre: todo lo que no es el horario
      let nombre = linea.replace(rHoraPar, '').replace(/\(.*?\)/g, '').replace(/[✓✔☑]/g, '').trim();
      nombre = nombre.replace(/\s+/g, ' ').trim();

      if (!nombre) {
        errores.push({ linea, razon: 'No se pudo extraer nombre' });
        continue;
      }

      const clasificacion = clasificarTurno(horaInicio, horaFin, configs);

      // Si hay label de turno activo, puede sobreescribir clasificación
      if (labelTurno === 'B') {
        clasificacion.tipo    = 'turno_b';
        clasificacion.merienda = false;
        clasificacion.cena     = true;
        clasificacion.requiereResponsable = true;
      } else if (labelTurno === 'A_EXT') {
        clasificacion.tipo    = 'extendido';
        clasificacion.merienda = true;
        clasificacion.cena     = false;
        clasificacion.requiereResponsable = true;
      }

      resultado.push({
        nombreEmpleado:   nombre,
        areaNombre:       areaActual || '',
        fecha:            fechaActual ? fechaActual.toISOString().split('T')[0] : null,
        horaInicio,
        horaFin,
        tipoProgramacion: clasificacion.tipo,
        requiereMerienda: clasificacion.merienda,
        requiereCena:     clasificacion.cena,
        requiereRuta:     true,
        ubicacionTexto:   '',
        observacion:      ''
      });
      continue;
    }

    // Si la línea solo tiene nombre (turno B sin hora en la línea actual)
    if (labelTurno === 'B' && linea.length > 2 && !esFecha(linea)) {
      const nombre = linea.replace(/[✓✔☑()]/g, '').trim();
      if (nombre && !/^\d/.test(nombre)) {
        resultado.push({
          nombreEmpleado:   nombre,
          areaNombre:       areaActual || '',
          fecha:            fechaActual ? fechaActual.toISOString().split('T')[0] : null,
          horaInicio:       '19:00',
          horaFin:          '07:00',
          tipoProgramacion: 'turno_b',
          requiereMerienda: false,
          requiereCena:     true,
          requiereRuta:     true,
          ubicacionTexto:   '',
          observacion:      ''
        });
      }
    }
  }

  return { personas: resultado, errores, totalPersonas: resultado.length, totalErrores: errores.length };
}

exports.importarTexto = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const { texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ success: false, error: 'texto es requerido' });
    const configs = await prisma.configuracionTurnoOp.findMany({ where: { empresaId: eid, activo: true } });
    const resultado = parsearTextoWhatsApp(texto, eid, configs);
    res.json({ success: true, ...resultado });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.confirmarImportacion = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const p = await prisma.programacionTransporte.findUnique({ where: { id: req.params.id } });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });

    const { personas } = req.body;
    if (!Array.isArray(personas) || personas.length === 0)
      return res.status(400).json({ success: false, error: 'personas es requerido y no puede estar vacío' });

    const configs = await prisma.configuracionTurnoOp.findMany({ where: { empresaId: eid, activo: true } });
    const creados = [];
    const omitidos = [];

    for (let i = 0; i < personas.length; i++) {
      const item = personas[i];
      if (!item.nombreEmpleado || !item.horaInicio || !item.horaFin) {
        omitidos.push({ index: i, razon: 'Faltan campos requeridos' });
        continue;
      }
      const fechaDetalle = item.fecha ? new Date(item.fecha) : p.fecha;
      const existe = await prisma.detalleProgramTransporte.findFirst({
        where: { programacionId: p.id, nombreEmpleado: item.nombreEmpleado.trim(), fecha: fechaDetalle, horaInicio: item.horaInicio }
      });
      if (existe) { omitidos.push({ nombre: item.nombreEmpleado, razon: 'Duplicado' }); continue; }

      const clasificacion = clasificarTurno(item.horaInicio, item.horaFin, configs);
      const detalle = await prisma.detalleProgramTransporte.create({
        data: {
          programacionId:    p.id,
          empresaId:         eid,
          nombreEmpleado:    item.nombreEmpleado.trim(),
          documentoEmpleado: item.documentoEmpleado?.trim() || null,
          areaNombre:        item.areaNombre?.trim()         || null,
          coordinadorNombre: item.coordinadorNombre?.trim()  || null,
          fecha:             fechaDetalle,
          horaInicio:        item.horaInicio,
          horaFin:           item.horaFin,
          tipoProgramacion:  item.tipoProgramacion || clasificacion.tipo,
          requiereMerienda:  item.requiereMerienda !== undefined ? Boolean(item.requiereMerienda) : clasificacion.merienda,
          requiereCena:      item.requiereCena     !== undefined ? Boolean(item.requiereCena)     : clasificacion.cena,
          requiereRuta:      item.requiereRuta     !== undefined ? Boolean(item.requiereRuta)     : true,
          ubicacionTexto:    item.ubicacionTexto?.trim().toUpperCase() || null,
          observacion:       item.observacion?.trim() || null,
          orden:             i
        }
      });
      creados.push(detalle);
    }
    res.json({ success: true, creados: creados.length, omitidos, total: personas.length });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR SERVICIOS DE ALIMENTACIÓN (automático)
// ─────────────────────────────────────────────────────────────────────────────

exports.calcularServicios = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const p = await prisma.programacionTransporte.findUnique({
      where: { id: req.params.id },
      include: { detalles: true }
    });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });

    // Eliminar servicios anteriores calculados
    await prisma.servicioAlimentacion.deleteMany({ where: { programacionId: p.id } });

    const meriendas = p.detalles.filter(d => d.requiereMerienda);
    const cenas     = p.detalles.filter(d => d.requiereCena);

    const servicios = [];

    if (meriendas.length > 0) {
      const responsable = meriendas.find(d => d.esResponsableAlimentacion);
      const s = await prisma.servicioAlimentacion.create({
        data: {
          programacionId:    p.id,
          empresaId:         eid,
          fecha:             p.fecha,
          tipoServicio:      'merienda',
          cantidadPersonas:  meriendas.length,
          responsableNombre: responsable?.nombreEmpleado || null,
          estado:            responsable ? 'asignado' : 'pendiente'
        }
      });
      servicios.push(s);
    }

    if (cenas.length > 0) {
      const responsable = cenas.find(d => d.esResponsableAlimentacion);
      const s = await prisma.servicioAlimentacion.create({
        data: {
          programacionId:    p.id,
          empresaId:         eid,
          fecha:             p.fecha,
          tipoServicio:      'cena',
          cantidadPersonas:  cenas.length,
          responsableNombre: responsable?.nombreEmpleado || null,
          estado:            responsable ? 'asignado' : 'pendiente'
        }
      });
      servicios.push(s);
    }

    res.json({
      success: true,
      servicios,
      resumen: { meriendas: meriendas.length, cenas: cenas.length, total: servicios.length }
    });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.asignarResponsableServicio = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const s = await prisma.servicioAlimentacion.findUnique({ where: { id: req.params.servicioId } });
    if (!s || s.empresaId !== eid) return res.status(404).json({ success: false, error: 'Servicio no encontrado' });
    const { responsableNombre, responsableDoc, observacion } = req.body;
    if (!responsableNombre?.trim()) return res.status(400).json({ success: false, error: 'responsableNombre requerido' });
    const updated = await prisma.servicioAlimentacion.update({
      where: { id: req.params.servicioId },
      data: { responsableNombre: responsableNombre.trim(), responsableDoc: responsableDoc?.trim() || null, observacion: observacion?.trim() || null, estado: 'asignado' }
    });
    res.json({ success: true, servicio: updated });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// NOVEDADES
// ─────────────────────────────────────────────────────────────────────────────

exports.listarNovedades = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const p = await prisma.programacionTransporte.findUnique({ where: { id: req.params.id } });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });
    const novedades = await prisma.novedadOperativa.findMany({
      where: { programacionId: p.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, novedades });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

exports.registrarNovedad = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const p = await prisma.programacionTransporte.findUnique({ where: { id: req.params.id } });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });
    const { tipoNovedad, descripcion, empleadoNombre, areaNombre } = req.body;
    if (!tipoNovedad || !descripcion?.trim())
      return res.status(400).json({ success: false, error: 'tipoNovedad y descripcion son requeridos' });
    const novedad = await prisma.novedadOperativa.create({
      data: {
        programacionId:   p.id,
        empresaId:        eid,
        fecha:            p.fecha,
        tipoNovedad,
        descripcion:      descripcion.trim(),
        empleadoNombre:   empleadoNombre?.trim()  || null,
        areaNombre:       areaNombre?.trim()       || null,
        registradoPorId:  req.session?.usuario?.pgId || null
      }
    });
    res.status(201).json({ success: true, novedad });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// FORMATO WHATSAPP
// ─────────────────────────────────────────────────────────────────────────────

exports.formatoWhatsApp = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const p = await prisma.programacionTransporte.findUnique({
      where: { id: req.params.id },
      include: {
        conductor: true,
        vehiculo:  true,
        detalles:  { include: { ubicacion: true }, orderBy: { orden: 'asc' } },
        serviciosAlimentacion: true,
        novedades: true,
        empresa:   { select: { nombre: true } }
      }
    });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });

    const pFechaStr = p.fecha instanceof Date ? p.fecha.toISOString().split('T')[0] : null;
    const fechaStr = pFechaStr ? formatFechaConDia(pFechaStr).toUpperCase() : 'FECHA NO DISPONIBLE';
    const conductor = p.conductor ? `${p.conductor.nombre}` : (p.conductorManual || 'SIN ASIGNAR');
    const placa     = p.vehiculo  ? p.vehiculo.placa : (p.placaManual || 'SIN ASIGNAR');

    let texto = `*PROGRAMACIÓN TALENTO HUMANO - ${p.empresa?.nombre?.toUpperCase() || 'SPM'}*\n`;
    texto += `📅 ${p.tipoMovimiento.toUpperCase()} ${p.horaSalida} - ${fechaStr}\n`;
    texto += `🚌 Conductor: ${conductor} | Placa: ${placa}\n\n`;

    // Detalles de transporte
    if (p.detalles.length > 0) {
      texto += `*PERSONAL PROGRAMADO*\n`;
      p.detalles.filter(d => d.requiereRuta).forEach((d, i) => {
        const ubicacion = d.ubicacionTexto || d.ubicacion?.nombre || '—';
        texto += `${i + 1}. ${d.nombreEmpleado} - ${ubicacion}\n`;
        if (d.areaNombre) texto += `   📌 Área: ${d.areaNombre}\n`;
      });
      texto += '\n';
    }

    // Meriendas
    const meriendas = p.detalles.filter(d => d.requiereMerienda);
    if (meriendas.length > 0) {
      const srvMerienda = p.serviciosAlimentacion.find(s => s.tipoServicio === 'merienda');
      texto += `*🍱 MERIENDAS - TURNO EXTENDIDO*\n`;
      if (srvMerienda?.responsableNombre) texto += `Responsable: ${srvMerienda.responsableNombre}\n`;
      meriendas.forEach((d, i) => { texto += `${i + 1}. ${d.nombreEmpleado} - ${d.areaNombre || '—'} - ${d.horaInicio} a ${d.horaFin}\n`; });
      texto += '\n';
    }

    // Cenas
    const cenas = p.detalles.filter(d => d.requiereCena);
    if (cenas.length > 0) {
      const srvCena = p.serviciosAlimentacion.find(s => s.tipoServicio === 'cena');
      texto += `*🌙 CENAS - TURNO B*\n`;
      if (srvCena?.responsableNombre) texto += `Responsable: ${srvCena.responsableNombre}\n`;
      cenas.forEach((d, i) => { texto += `${i + 1}. ${d.nombreEmpleado} - ${d.areaNombre || '—'} - ${d.horaInicio} a ${d.horaFin}\n`; });
      texto += '\n';
    }

    // Novedades
    texto += `*📋 NOVEDADES*\n`;
    if (p.novedades.length === 0) {
      texto += `- Sin novedades registradas.\n`;
    } else {
      p.novedades.forEach(n => { texto += `- ${n.tipoNovedad.toUpperCase()}: ${n.descripcion}${n.empleadoNombre ? ' (' + n.empleadoNombre + ')' : ''}\n`; });
    }

    res.json({ success: true, texto, programacion: { fecha: fechaStr, conductor, placa } });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERAR DESDE TURNOS REGISTRADOS EN EL SISTEMA
// ─────────────────────────────────────────────────────────────────────────────

exports.generarDesdeTurnos = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const { fecha, horaSalida, tipoMovimiento } = req.body;
    if (!fecha || !horaSalida) return res.status(400).json({ success: false, error: 'fecha y horaSalida son requeridos' });

    const configs = await prisma.configuracionTurnoOp.findMany({ where: { empresaId: eid, activo: true } });

    const fechaDate = new Date(fecha);
    const turnos = await prisma.turno.findMany({
      where: {
        empresaId:   eid,
        activo:      true,
        fechaInicio: { lte: fechaDate },
        fechaFin:    { gte: fechaDate }
      },
      include: { empleado: true, area: true }
    });

    // Filtrar los que tienen hora de fin = horaSalida o son turno nocturno
    const relevantes = turnos.filter(t => {
      if (!t.horaInicio || !t.horaFin) return false;
      const clasificacion = clasificarTurno(t.horaInicio, t.horaFin, configs);
      return clasificacion.tipo !== 'normal';
    });

    const personas = relevantes.map(t => {
      const clasificacion = clasificarTurno(t.horaInicio, t.horaFin, configs);
      return {
        empleadoId:       t.empleadoId,
        nombreEmpleado:   `${t.empleado.nombre}${t.empleado.apellidos ? ' ' + t.empleado.apellidos : ''}`,
        documentoEmpleado: t.empleado.documento,
        areaNombre:        t.area?.nombre || '',
        fecha:             fecha,
        horaInicio:        t.horaInicio,
        horaFin:           t.horaFin,
        tipoProgramacion:  clasificacion.tipo,
        requiereMerienda:  clasificacion.merienda,
        requiereCena:      clasificacion.cena,
        requiereRuta:      true
      };
    });

    res.json({ success: true, personas, totalTurnos: turnos.length, totalRelevantes: personas.length });
  } catch (e) { res.status(e.status || 500).json({ success: false, error: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// APROBACIÓN / RECHAZO INDIVIDUAL POR PERSONA
// ─────────────────────────────────────────────────────────────────────────────

exports.aprobarDetalle = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const { id: programacionId, detalleId } = req.params;

    const p = await prisma.programacionTransporte.findUnique({ where: { id: programacionId } });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });

    const det = await prisma.detalleProgramTransporte.findUnique({ where: { id: detalleId } });
    if (!det || det.programacionId !== programacionId || det.empresaId !== eid)
      return res.status(404).json({ success: false, error: 'Persona no encontrada en esta programación' });

    const puedeAprobar = await tienePermiso(req, eid, 'transporte.programacion.aprobar_area');
    if (!puedeAprobar) return res.status(403).json({ success: false, error: 'No tiene permiso para aprobar personas en programaciones' });

    const puedeArea = await tieneAreaAsignada(req, det.areaId, eid);
    if (!puedeArea) return res.status(403).json({ success: false, error: 'No está asignado al área de esta persona' });

    const pgId = req.pgId || req.session?.usuario?.pgId || null;
    const updated = await prisma.detalleProgramTransporte.update({
      where: { id: detalleId },
      data: {
        estadoAprobacion: 'aprobado',
        motivoRechazo:    null,
        aprobadoPorId:    pgId,
        aprobadoEn:       new Date(),
        rechazadoPorId:   null,
        rechazadoEn:      null
      }
    });

    const estadoProgramacion = await recalcularEstadoProgramacion(programacionId);
    res.json({ success: true, detalle: updated, estadoProgramacion });
  } catch (e) {
    console.error('Error aprobarDetalle:', e);
    res.status(e.status || 500).json({ success: false, error: e.message });
  }
};

exports.rechazarDetalle = async (req, res) => {
  try {
    const eid = empresaFilter(req);
    const { id: programacionId, detalleId } = req.params;

    const validacion = _validarMotivoRechazo(req.body?.motivoRechazo);
    if (!validacion.valido) return res.status(400).json({ success: false, error: validacion.error });

    const p = await prisma.programacionTransporte.findUnique({ where: { id: programacionId } });
    if (!p || p.empresaId !== eid) return res.status(404).json({ success: false, error: 'Programación no encontrada' });

    const det = await prisma.detalleProgramTransporte.findUnique({ where: { id: detalleId } });
    if (!det || det.programacionId !== programacionId || det.empresaId !== eid)
      return res.status(404).json({ success: false, error: 'Persona no encontrada en esta programación' });

    const puedeRechazar = await tienePermiso(req, eid, 'transporte.programacion.rechazar_area');
    if (!puedeRechazar) return res.status(403).json({ success: false, error: 'No tiene permiso para rechazar personas en programaciones' });

    const puedeArea = await tieneAreaAsignada(req, det.areaId, eid);
    if (!puedeArea) return res.status(403).json({ success: false, error: 'No está asignado al área de esta persona' });

    const pgId = req.pgId || req.session?.usuario?.pgId || null;
    const updated = await prisma.detalleProgramTransporte.update({
      where: { id: detalleId },
      data: {
        estadoAprobacion: 'rechazado',
        motivoRechazo:    validacion.sanitized,
        rechazadoPorId:   pgId,
        rechazadoEn:      new Date(),
        aprobadoPorId:    null,
        aprobadoEn:       null
      }
    });

    const estadoProgramacion = await recalcularEstadoProgramacion(programacionId);
    res.json({ success: true, detalle: updated, estadoProgramacion });
  } catch (e) {
    console.error('Error rechazarDetalle:', e);
    res.status(e.status || 500).json({ success: false, error: e.message });
  }
};

// Export parser for testing
exports._clasificarTurno    = clasificarTurno;
exports._parsearTextoWhatsApp = parsearTextoWhatsApp;
