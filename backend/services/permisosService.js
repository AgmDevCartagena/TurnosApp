'use strict';

/**
 * Servicio central de permisos efectivos por empresa activa.
 *
 * Los permisos efectivos se calculan de la siguiente forma (por empresa):
 *  1. Permisos del Rol asignado en UsuarioEmpresa (via RolPermiso).
 *  2. Permisos adicionales/overrides directos en UsuarioEmpresaPermiso
 *     (permitido=true suma, permitido=false resta).
 *  3. Los módulos de la empresa actúan como filtro final:
 *     si la empresa no tiene un módulo habilitado, sus permisos no aplican.
 */

const prisma = require('../lib/prisma');

/**
 * Obtiene el contexto completo de un usuario para una empresa dada.
 *
 * @param {string} usuarioId   UUID del usuario en PostgreSQL
 * @param {string} empresaId   UUID de la empresa activa
 * @returns {Promise<{
 *   usuarioEmpresa: object,
 *   rol: object,
 *   modulosActivos: string[],
 *   areasPermitidas: string[],
 *   permisosEfectivos: string[]
 * }>}
 */
async function obtenerContextoEmpresa(usuarioId, empresaId) {
  const ue = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    include: {
      rol: {
        include: {
          permisos: { include: { permiso: true } }
        }
      },
      modulos: {
        where: { activo: true },
        include: { modulo: true }
      },
      areas: {
        include: { area: { select: { id: true, nombre: true } } }
      },
      permisos: {
        include: { permiso: true }
      },
      empresa: {
        select: {
          id: true, nombre: true, estado: true, logoUrl: true, colorTema: true,
          modulos: {
            where: { habilitado: true },
            include: { modulo: true }
          }
        }
      }
    }
  });

  if (!ue) return null;
  if (ue.estado !== 'activo') return null;
  if (ue.empresa.estado !== 'activa') return null;

  // Módulos activos para la empresa (habilitados a nivel empresa)
  const modulosEmpresa = new Set(
    ue.empresa.modulos.map(em => em.modulo.codigo)
  );

  // Módulos permitidos para el usuario en esta empresa
  const modulosUsuario = ue.modulos.length > 0
    ? ue.modulos.map(m => m.modulo.codigo)
    : [...modulosEmpresa]; // Si no tiene restricción, hereda todos los de la empresa

  // Intersección: solo módulos que la empresa tenga habilitados Y el usuario tenga asignados
  const modulosActivos = modulosUsuario.filter(m => modulosEmpresa.has(m));

  // Permisos del rol
  const permisosRol = new Set(
    ue.rol.permisos.map(rp => rp.permiso.codigo)
  );

  // Overrides directos del usuario
  const permisosExtra = new Set();
  const permisosRevocados = new Set();
  for (const up of ue.permisos) {
    if (up.permitido) {
      permisosExtra.add(up.permiso.codigo);
    } else {
      permisosRevocados.add(up.permiso.codigo);
    }
  }

  // Unión de rol + extras, menos revocados
  const todosPosibles = new Set([...permisosRol, ...permisosExtra]);
  for (const r of permisosRevocados) todosPosibles.delete(r);

  // Filtrar solo permisos cuyos módulos estén activos para el usuario
  const permisosEfectivos = [...todosPosibles].filter(codigo => {
    const moduloDelPermiso = codigo.split('.')[0]; // e.g. 'nomina' de 'nomina.ver'
    return modulosActivos.some(m => m === moduloDelPermiso || moduloDelPermiso === m);
  });

  const areasPermitidas = ue.areas.map(ua => ({
    id:     ua.area.id,
    nombre: ua.area.nombre
  }));

  return {
    usuarioEmpresaId: ue.id,
    empresa: {
      id:        ue.empresa.id,
      nombre:    ue.empresa.nombre,
      logoUrl:   ue.empresa.logoUrl || null,
      colorTema: ue.empresa.colorTema
    },
    rol: {
      id:     ue.rol.id,
      codigo: ue.rol.codigo,
      nombre: ue.rol.nombre
    },
    modulosActivos,
    areasPermitidas,
    permisosEfectivos
  };
}

/**
 * Lista todas las empresas asignadas y activas de un usuario.
 *
 * @param {string} usuarioId
 * @returns {Promise<Array<{id, nombre, logoUrl, colorTema, rolCodigo, esDefault}>>}
 */
async function listarEmpresasDeUsuario(usuarioId) {
  const asignaciones = await prisma.usuarioEmpresa.findMany({
    where: { usuarioId, estado: 'activo' },
    include: {
      empresa: {
        select: { id: true, nombre: true, logoUrl: true, colorTema: true, estado: true }
      },
      rol: { select: { codigo: true, nombre: true } }
    },
    orderBy: [
      { empresaActivaDefault: 'desc' },
      { createdAt: 'asc' }
    ]
  });

  return asignaciones
    .filter(a => a.empresa.estado === 'activa')
    .map(a => ({
      id:        a.empresa.id,
      nombre:    a.empresa.nombre,
      logoUrl:   a.empresa.logoUrl || null,
      colorTema: a.empresa.colorTema,
      rol:       a.rol.codigo,
      rolNombre: a.rol.nombre,
      esDefault: a.empresaActivaDefault
    }));
}

/**
 * Verifica si un usuario tiene un permiso específico en la empresa activa.
 *
 * @param {string} usuarioId
 * @param {string} empresaId
 * @param {string} codigoPermiso  e.g. 'nomina.calcular'
 * @returns {Promise<boolean>}
 */
async function tienePermiso(usuarioId, empresaId, codigoPermiso) {
  const ctx = await obtenerContextoEmpresa(usuarioId, empresaId);
  if (!ctx) return false;
  return ctx.permisosEfectivos.includes(codigoPermiso);
}

module.exports = { obtenerContextoEmpresa, listarEmpresasDeUsuario, tienePermiso };
