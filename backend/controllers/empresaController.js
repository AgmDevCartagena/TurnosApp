'use strict';

const fs       = require('fs');
const bcrypt   = require('bcryptjs');
const prisma   = require('../lib/prisma');
const Auditoria = require('../models/Auditoria'); // Auditoría permanece en MongoDB
const { sanitizeSvg, deleteLogo } = require('../utils/logoUtils');

/**
 * Registra una acción en el log de auditoría (MongoDB — intencional en arquitectura híbrida)
 */
async function registrarAuditoria(req, accion, entidad, entidadId, detalle = null) {
  try {
    await Auditoria.create({
      empresaId: req.session?.usuario?.pgEmpresaId || req.session?.usuario?.empresaId || null,
      usuarioId: req.session?.usuario?.pgId || req.session?.usuario?.id || null,
      usuarioUsername: req.session?.usuario?.username || 'sistema',
      accion,
      entidad,
      entidadId: entidadId ? entidadId.toString() : null,
      detalle,
      ip: req.ip
    });
  } catch (err) {
    console.error('⚠️ Error al registrar auditoría:', err.message);
  }
}

/**
 * Listar empresas
 * - super_admin: todas
 * - admin: solo la suya
 */
exports.listarEmpresas = async (req, res) => {
  try {
    const usuario = req.session.usuario;
    let empresas;

    if (usuario.rol === 'super_admin') {
      empresas = await prisma.empresa.findMany({
        include: { modulos: { include: { modulo: true } } },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      const pgEmpresaId = usuario.pgEmpresaId;
      if (!pgEmpresaId) {
        return res.status(403).json({ success: false, error: 'Sin empresa asignada' });
      }
      const empresa = await prisma.empresa.findUnique({
        where: { id: pgEmpresaId },
        include: { modulos: { include: { modulo: true } } }
      });
      empresas = empresa ? [empresa] : [];
    }

    // Normalizar modulosHabilitados para compatibilidad con frontend
    const resultado = empresas.map(e => ({
      ...e,
      modulosHabilitados: e.modulos?.filter(m => m.habilitado).map(m => m.modulo.codigo) || []
    }));

    res.json({ success: true, empresas: resultado });
  } catch (error) {
    console.error('Error listarEmpresas:', error);
    res.status(500).json({ success: false, error: 'Error al listar empresas' });
  }
};

/**
 * Obtener una empresa por ID
 */
exports.obtenerEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    const empresa = await prisma.empresa.findUnique({
      where: { id },
      include: { modulos: { include: { modulo: true } } }
    });
    if (!empresa) return res.status(404).json({ success: false, error: 'Empresa no encontrada' });

    if (usuario.rol !== 'super_admin' && empresa.id !== usuario.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    const resultado = {
      ...empresa,
      modulosHabilitados: empresa.modulos?.filter(m => m.habilitado).map(m => m.modulo.codigo) || []
    };
    res.json({ success: true, empresa: resultado });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener empresa' });
  }
};

/**
 * Crear empresa (solo super_admin)
 */
exports.crearEmpresa = async (req, res) => {
  try {
    const { nombre, nit, razonSocial, colorTema, dominio, modulosHabilitados, adminUsuario } = req.body;

    if (!nombre) return res.status(400).json({ success: false, error: 'El nombre es requerido' });

    const modulos = modulosHabilitados || ['turnos', 'nomina'];

    // Verificar NIT único si se provee
    if (nit) {
      const existeNit = await prisma.empresa.findUnique({ where: { nit } });
      if (existeNit) {
        return res.status(400).json({ success: false, error: `Ya existe una empresa con NIT ${nit}` });
      }
    }

    // Verificar usuario admin antes de crear empresa
    if (adminUsuario && adminUsuario.username && adminUsuario.password) {
      const usernameNorm = adminUsuario.username.toLowerCase().trim();
      const existe = await prisma.usuario.findUnique({ where: { username: usernameNorm } });
      if (existe) {
        return res.status(400).json({ success: false, error: `El usuario '${usernameNorm}' ya existe` });
      }
      if (adminUsuario.password.length < 4) {
        return res.status(400).json({ success: false, error: 'La contraseña del admin debe tener al menos 4 caracteres' });
      }
    }

    // Obtener módulos del catálogo
    const modulosCatalogo = await prisma.modulo.findMany({
      where: { codigo: { in: modulos } }
    });

    const empresa = await prisma.empresa.create({
      data: {
        nombre: nombre.trim(),
        nit:         nit         || null,
        razonSocial: razonSocial || null,
        colorTema:   colorTema   || '#667eea',
        dominio:     dominio     || null,
        estado:      'activa',
        modulos: {
          create: modulosCatalogo.map(m => ({
            moduloId:  m.id,
            habilitado: true
          }))
        }
      },
      include: { modulos: { include: { modulo: true } } }
    });

    await registrarAuditoria(req, 'CREAR_EMPRESA', 'Empresa', empresa.id, { nombre: empresa.nombre });

    let usuarioAdmin = null;
    if (adminUsuario && adminUsuario.username && adminUsuario.password) {
      const usernameNorm = adminUsuario.username.toLowerCase().trim();
      const passwordHash = await bcrypt.hash(adminUsuario.password, 12);
      const modulosPermitiodos = await prisma.modulo.findMany({ where: { codigo: { in: modulos } } });
      usuarioAdmin = await prisma.usuario.create({
        data: {
          username:     usernameNorm,
          passwordHash,
          nombre:       adminUsuario.nombre || `Admin ${nombre.trim()}`,
          rol:          'admin',
          empresaId:    empresa.id,
          activo:       true,
          modulosPermitidos: {
            create: modulosPermitiodos.map(m => ({ modulo: m.codigo }))
          }
        }
      });
      await registrarAuditoria(req, 'CREAR_USUARIO', 'Usuario', usuarioAdmin.id, {
        username: usuarioAdmin.username, empresaId: empresa.id
      });
    }

    const resultado = {
      ...empresa,
      modulosHabilitados: empresa.modulos?.filter(m => m.habilitado).map(m => m.modulo.codigo) || []
    };

    res.status(201).json({
      success: true,
      empresa: resultado,
      adminUsuario: usuarioAdmin
        ? { username: usuarioAdmin.username, nombre: usuarioAdmin.nombre, rol: usuarioAdmin.rol }
        : null
    });
  } catch (error) {
    console.error('Error al crear empresa:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Ya existe una empresa con ese NIT' });
    }
    res.status(500).json({ success: false, error: 'Error al crear empresa' });
  }
};

/**
 * Actualizar empresa (super_admin o admin de esa empresa)
 */
exports.actualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) return res.status(404).json({ success: false, error: 'Empresa no encontrada' });

    if (usuario.rol !== 'super_admin' && empresa.id !== usuario.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    const data = {};
    ['nombre', 'nit', 'razonSocial', 'colorTema', 'dominio'].forEach(c => {
      if (req.body[c] !== undefined) data[c] = req.body[c];
    });

    const actualizada = await prisma.empresa.update({ where: { id }, data });

    // Actualizar módulos si super_admin lo indica
    if (req.body.modulosHabilitados && usuario.rol === 'super_admin') {
      const codigos = req.body.modulosHabilitados;
      const modulosCatalogo = await prisma.modulo.findMany({ where: { codigo: { in: codigos } } });
      await Promise.all(modulosCatalogo.map(m =>
        prisma.empresaModulo.upsert({
          where: { empresaId_moduloId: { empresaId: id, moduloId: m.id } },
          update: { habilitado: true },
          create: { empresaId: id, moduloId: m.id, habilitado: true }
        })
      ));
      // Deshabilitar módulos no listados
      const modulosDeshabilitados = await prisma.modulo.findMany({ where: { codigo: { notIn: codigos } } });
      await Promise.all(modulosDeshabilitados.map(m =>
        prisma.empresaModulo.updateMany({
          where: { empresaId: id, moduloId: m.id },
          data: { habilitado: false }
        })
      ));
    }

    await registrarAuditoria(req, 'ACTUALIZAR_EMPRESA', 'Empresa', actualizada.id, { nombre: actualizada.nombre });
    res.json({ success: true, empresa: actualizada });
  } catch (error) {
    console.error('Error actualizarEmpresa:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar empresa' });
  }
};

/**
 * Activar/desactivar empresa (solo super_admin)
 */
exports.cambiarEstadoEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['activa', 'inactiva'].includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado inválido: activa | inactiva' });
    }

    const empresa = await prisma.empresa.update({
      where: { id },
      data: { estado }
    });
    if (!empresa) return res.status(404).json({ success: false, error: 'Empresa no encontrada' });

    await registrarAuditoria(req, 'CAMBIAR_ESTADO_EMPRESA', 'Empresa', empresa.id, { estado });
    res.json({ success: true, empresa });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    res.status(500).json({ success: false, error: 'Error al cambiar estado' });
  }
};

/**
 * Listar usuarios de una empresa (super_admin o admin de esa empresa)
 */
exports.listarUsuariosEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    if (usuario.rol !== 'super_admin' && usuario.pgEmpresaId !== id) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    const usuarios = await prisma.usuario.findMany({
      where: { empresaId: id },
      select: {
        id: true, username: true, nombre: true, rol: true,
        activo: true, ultimoAcceso: true, createdAt: true,
        modulosPermitidos: true, areas: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, usuarios });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar usuarios de la empresa' });
  }
};

/**
 * Obtener estadísticas básicas de una empresa (super_admin)
 */
exports.estadisticasEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    const [totalUsuarios, totalEmpleados, totalTurnos] = await Promise.all([
      prisma.usuario.count({ where: { empresaId: id } }),
      prisma.empleado.count({ where: { empresaId: id } }),
      prisma.turno.count({ where: { empresaId: id } })
    ]);

    res.json({ success: true, estadisticas: { totalUsuarios, totalEmpleados, totalTurnos } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
  }
};

exports.registrarAuditoria = registrarAuditoria;

// ─────────────────────────────────────────────────────────────────────────────
// LOGO POR EMPRESA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/empresas/:id/logo
 * Carga o reemplaza el logo de una empresa.
 * El middleware de multer procesa el archivo ANTES de llegar aquí.
 */
exports.subirLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) return res.status(404).json({ success: false, error: 'Empresa no encontrada' });

    if (usuario.rol !== 'super_admin' && empresa.id !== usuario.pgEmpresaId) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se recibió ningún archivo' });
    }

    if (req.file.mimetype === 'image/svg+xml') {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      fs.writeFileSync(req.file.path, sanitizeSvg(content), 'utf-8');
    }

    if (empresa.logoPath) {
      await deleteLogo(empresa.logoPath);
    }

    const logoUrl = `/uploads/empresas/logos/${req.file.filename}`;

    const actualizada = await prisma.empresa.update({
      where: { id },
      data: {
        logoUrl,
        logoPath:         req.file.path,
        logoMimeType:     req.file.mimetype,
        logoOriginalName: req.file.originalname,
        logoSize:         req.file.size
      }
    });

    await registrarAuditoria(req, 'SUBIR_LOGO', 'Empresa', id, { logoUrl });

    if (req.session.usuario.pgEmpresaId === id) {
      req.session.usuario.logoUrl = logoUrl;
    }

    res.json({ success: true, logoUrl, empresa: { ...actualizada, modulosHabilitados: [] } });
  } catch (err) {
    console.error('Error subirLogo:', err);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, error: 'No se pudo cargar el logo. Intente nuevamente.' });
  }
};

/**
 * DELETE /api/empresas/:id/logo
 * Elimina el logo de una empresa y restaura el valor por defecto.
 */
exports.eliminarLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) return res.status(404).json({ success: false, error: 'Empresa no encontrada' });

    if (usuario.rol !== 'super_admin' && empresa.id !== usuario.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    if (!empresa.logoUrl && !empresa.logoPath) {
      return res.status(404).json({ success: false, error: 'La empresa no tiene logo cargado' });
    }

    await deleteLogo(empresa.logoPath);

    await prisma.empresa.update({
      where: { id },
      data: { logoUrl: null, logoPath: null, logoMimeType: null, logoOriginalName: null, logoSize: null }
    });

    await registrarAuditoria(req, 'ELIMINAR_LOGO', 'Empresa', id, {});

    if (req.session.usuario.pgEmpresaId === id) {
      req.session.usuario.logoUrl = null;
    }

    res.json({ success: true, message: 'Logo eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al eliminar logo' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MIS EMPRESAS / EMPRESA ACTIVA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/me/empresas
 * Lista las empresas accesibles por el usuario autenticado.
 * super_admin: todas las empresas.
 * Otros: solo la empresa asignada.
 */
exports.listarMisEmpresas = async (req, res) => {
  try {
    const usuario = req.session.usuario;
    let empresas;

    if (usuario.rol === 'super_admin') {
      const filas = await prisma.empresa.findMany({
        select: { id: true, nombre: true, logoUrl: true, estado: true, colorTema: true },
        orderBy: { nombre: 'asc' }
      });
      empresas = filas.map(e => ({ ...e, activa: e.id === (usuario.pgEmpresaId || null) }));
    } else {
      const pgEmpresaId = usuario.pgEmpresaId;
      if (!pgEmpresaId) return res.json({ success: true, empresas: [] });
      const e = await prisma.empresa.findUnique({
        where:  { id: pgEmpresaId },
        select: { id: true, nombre: true, logoUrl: true, estado: true, colorTema: true }
      });
      empresas = e ? [{ ...e, activa: true }] : [];
    }

    res.json({ success: true, empresas });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al listar empresas' });
  }
};

/**
 * POST /api/me/empresa-activa
 * Cambia la empresa activa en sesión.
 * super_admin: puede seleccionar cualquier empresa activa.
 * Otros: solo pueden confirmar su propia empresa.
 */
exports.setEmpresaActiva = async (req, res) => {
  try {
    const usuario    = req.session.usuario;
    const { empresaId } = req.body;

    if (!empresaId) {
      return res.status(400).json({ success: false, error: 'empresaId es requerido' });
    }

    if (usuario.rol !== 'super_admin' && usuario.pgEmpresaId !== empresaId) {
      return res.status(403).json({ success: false, error: 'No tienes acceso a esa empresa' });
    }

    const empresa = await prisma.empresa.findUnique({
      where:   { id: empresaId },
      include: { modulos: { include: { modulo: true } } }
    });

    if (!empresa) return res.status(404).json({ success: false, error: 'Empresa no encontrada' });

    if (empresa.estado !== 'activa' && usuario.rol !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'La empresa está inactiva' });
    }

    const modulosHabilitados = empresa.modulos
      .filter(m => m.habilitado)
      .map(m => m.modulo.codigo);

    req.session.usuario.pgEmpresaId    = empresa.id;
    req.session.usuario.nombreEmpresa  = empresa.nombre;
    req.session.usuario.logoUrl        = empresa.logoUrl || null;
    if (usuario.rol === 'super_admin') {
      req.session.usuario.modulosPermitidos = modulosHabilitados;
    }

    res.json({
      success: true,
      empresa: {
        id:               empresa.id,
        nombre:           empresa.nombre,
        logoUrl:          empresa.logoUrl || null,
        colorTema:        empresa.colorTema,
        estado:           empresa.estado,
        modulosHabilitados
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al cambiar empresa activa' });
  }
};
