'use strict';

/**
 * Tests unitarios: permisosService.js
 *
 * Cubre:
 *  - obtenerContextoEmpresa: cálculo correcto de permisos efectivos
 *  - listarEmpresasDeUsuario: listado y filtro de empresas activas
 *  - tienePermiso: verificación de permiso puntual
 */

jest.mock('../../lib/prisma', () => ({
  usuarioEmpresa: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
}));

const prisma          = require('../../lib/prisma');
const permisosService = require('../../services/permisosService');

// ── Fixtures ────────────────────────────────────────────────────────────────
const ID_USER = '00000000-0000-0000-0000-000000000001';
const ID_EMP  = '00000000-0000-0000-0000-000000000002';
const ID_ROL  = '00000000-0000-0000-0000-000000000003';
const ID_UE   = '00000000-0000-0000-0000-000000000004';

/**
 * Construye un registro de UsuarioEmpresa con sus relaciones.
 * @param {object} overrides - sobreescribir campos del fixture base
 */
function makeUE({
  estado = 'activo',
  empresaEstado = 'activa',
  rolesPermisos = ['turnos.ver', 'turnos.crear'],
  modulosEmpresa = ['turnos', 'nomina'],
  modulosUsuario = [],     // [] = sin restricción → hereda empresa
  areasUsuario = [],
  permisosDirectos = [],   // [{ codigo, permitido }]
} = {}) {
  return {
    id:       ID_UE,
    estado,
    empresa: {
      id:        ID_EMP,
      nombre:    'Empresa Demo',
      estado:    empresaEstado,
      logoUrl:   null,
      colorTema: '#667eea',
      modulos: modulosEmpresa.map(m => ({
        habilitado: true,
        modulo: { codigo: m }
      })),
    },
    rol: {
      id:     ID_ROL,
      codigo: 'ADMIN_EMPRESA',
      nombre: 'Admin Empresa',
      permisos: rolesPermisos.map(c => ({ permiso: { codigo: c } })),
    },
    modulos: modulosUsuario.map(m => ({
      activo: true,
      modulo: { codigo: m }
    })),
    areas: areasUsuario.map(a => ({
      area: { id: a.id, nombre: a.nombre }
    })),
    permisos: permisosDirectos.map(p => ({
      permitido: p.permitido,
      permiso:   { codigo: p.codigo }
    })),
  };
}

beforeEach(() => jest.clearAllMocks());

// ────────────────────────────────────────────────────────────────────────────
describe('obtenerContextoEmpresa', () => {

  test('retorna null cuando el usuario no está asignado a la empresa', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(null);
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx).toBeNull();
  });

  test('retorna null cuando la asignación está inactiva', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(makeUE({ estado: 'inactivo' }));
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx).toBeNull();
  });

  test('retorna null cuando la empresa está inactiva', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(makeUE({ empresaEstado: 'inactiva' }));
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx).toBeNull();
  });

  test('retorna permisos del rol correctamente', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({ rolesPermisos: ['turnos.ver', 'nomina.ver'] })
    );
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx.permisosEfectivos).toContain('turnos.ver');
    expect(ctx.permisosEfectivos).toContain('nomina.ver');
  });

  test('permiso revocado directamente NO aparece en efectivos', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({
        rolesPermisos: ['turnos.ver', 'turnos.crear'],
        permisosDirectos: [{ codigo: 'turnos.crear', permitido: false }]
      })
    );
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx.permisosEfectivos).toContain('turnos.ver');
    expect(ctx.permisosEfectivos).not.toContain('turnos.crear');
  });

  test('permiso extra directo (no en rol) SÍ aparece en efectivos', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({
        rolesPermisos: ['turnos.ver'],
        permisosDirectos: [{ codigo: 'nomina.ver', permitido: true }]
      })
    );
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx.permisosEfectivos).toContain('turnos.ver');
    expect(ctx.permisosEfectivos).toContain('nomina.ver');
  });

  test('permiso de módulo NO habilitado en empresa es filtrado', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({
        rolesPermisos:  ['turnos.ver', 'reportes.ver'],
        modulosEmpresa: ['turnos'],           // reportes NO habilitado
      })
    );
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx.permisosEfectivos).toContain('turnos.ver');
    expect(ctx.permisosEfectivos).not.toContain('reportes.ver');
  });

  test('usuario sin restricción de módulo hereda todos los de la empresa', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({
        modulosEmpresa: ['turnos', 'nomina'],
        modulosUsuario: [],                   // sin restricción
        rolesPermisos: ['turnos.ver', 'nomina.ver'],
      })
    );
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx.modulosActivos).toContain('turnos');
    expect(ctx.modulosActivos).toContain('nomina');
  });

  test('usuario con módulos restringidos solo ve permisos de esos módulos', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({
        modulosEmpresa: ['turnos', 'nomina'],
        modulosUsuario: ['turnos'],           // solo turnos
        rolesPermisos: ['turnos.ver', 'nomina.ver'],
      })
    );
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx.modulosActivos).toEqual(['turnos']);
    expect(ctx.permisosEfectivos).toContain('turnos.ver');
    expect(ctx.permisosEfectivos).not.toContain('nomina.ver');
  });

  test('retorna áreas del usuario', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({
        areasUsuario: [
          { id: 'area-1', nombre: 'Producción' },
          { id: 'area-2', nombre: 'Ventas' },
        ]
      })
    );
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx.areasPermitidas).toHaveLength(2);
    expect(ctx.areasPermitidas.map(a => a.nombre)).toContain('Producción');
  });

  test('retorna datos de empresa y rol', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(makeUE());
    const ctx = await permisosService.obtenerContextoEmpresa(ID_USER, ID_EMP);
    expect(ctx.empresa.id).toBe(ID_EMP);
    expect(ctx.empresa.nombre).toBe('Empresa Demo');
    expect(ctx.rol.codigo).toBe('ADMIN_EMPRESA');
    expect(ctx.usuarioEmpresaId).toBe(ID_UE);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('listarEmpresasDeUsuario', () => {

  test('retorna arreglo vacío si el usuario no tiene empresas', async () => {
    prisma.usuarioEmpresa.findMany.mockResolvedValue([]);
    const result = await permisosService.listarEmpresasDeUsuario(ID_USER);
    expect(result).toEqual([]);
  });

  test('filtra empresas inactivas del resultado', async () => {
    prisma.usuarioEmpresa.findMany.mockResolvedValue([
      {
        empresaActivaDefault: true,
        createdAt: new Date(),
        empresa: { id: 'e1', nombre: 'Activa', estado: 'activa', logoUrl: null, colorTema: '#667eea' },
        rol: { codigo: 'ADMIN_EMPRESA', nombre: 'Admin Empresa' }
      },
      {
        empresaActivaDefault: false,
        createdAt: new Date(),
        empresa: { id: 'e2', nombre: 'Inactiva', estado: 'inactiva', logoUrl: null, colorTema: '#667eea' },
        rol: { codigo: 'CONSULTA', nombre: 'Consulta' }
      }
    ]);
    const result = await permisosService.listarEmpresasDeUsuario(ID_USER);
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Activa');
  });

  test('mapea correctamente los campos de empresa y rol', async () => {
    prisma.usuarioEmpresa.findMany.mockResolvedValue([
      {
        empresaActivaDefault: true,
        createdAt: new Date(),
        empresa: { id: ID_EMP, nombre: 'Mi Empresa', estado: 'activa', logoUrl: 'logo.png', colorTema: '#123456' },
        rol: { codigo: 'GESTOR_TURNOS', nombre: 'Gestor Turnos' }
      }
    ]);
    const result = await permisosService.listarEmpresasDeUsuario(ID_USER);
    expect(result[0]).toMatchObject({
      id:        ID_EMP,
      nombre:    'Mi Empresa',
      logoUrl:   'logo.png',
      colorTema: '#123456',
      rol:       'GESTOR_TURNOS',
      rolNombre: 'Gestor Turnos',
      esDefault: true
    });
  });

  test('retorna múltiples empresas activas', async () => {
    prisma.usuarioEmpresa.findMany.mockResolvedValue([
      {
        empresaActivaDefault: false, createdAt: new Date(),
        empresa: { id: 'e1', nombre: 'Emp A', estado: 'activa', logoUrl: null, colorTema: '#aaa' },
        rol: { codigo: 'ADMIN_EMPRESA', nombre: 'Admin' }
      },
      {
        empresaActivaDefault: false, createdAt: new Date(),
        empresa: { id: 'e2', nombre: 'Emp B', estado: 'activa', logoUrl: null, colorTema: '#bbb' },
        rol: { codigo: 'CONSULTA', nombre: 'Consulta' }
      }
    ]);
    const result = await permisosService.listarEmpresasDeUsuario(ID_USER);
    expect(result).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('tienePermiso', () => {

  test('retorna false si el usuario no está en la empresa (contexto null)', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(null);
    const result = await permisosService.tienePermiso(ID_USER, ID_EMP, 'turnos.ver');
    expect(result).toBe(false);
  });

  test('retorna false si la empresa está inactiva', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({ empresaEstado: 'inactiva' })
    );
    const result = await permisosService.tienePermiso(ID_USER, ID_EMP, 'turnos.ver');
    expect(result).toBe(false);
  });

  test('retorna true si el permiso está en los efectivos del rol', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({ rolesPermisos: ['turnos.ver', 'turnos.crear'] })
    );
    const result = await permisosService.tienePermiso(ID_USER, ID_EMP, 'turnos.ver');
    expect(result).toBe(true);
  });

  test('retorna false si el permiso NO está en los efectivos', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({ rolesPermisos: ['turnos.ver'] })
    );
    const result = await permisosService.tienePermiso(ID_USER, ID_EMP, 'nomina.calcular');
    expect(result).toBe(false);
  });

  test('retorna false si el permiso fue revocado directamente', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({
        rolesPermisos: ['turnos.ver'],
        permisosDirectos: [{ codigo: 'turnos.ver', permitido: false }]
      })
    );
    const result = await permisosService.tienePermiso(ID_USER, ID_EMP, 'turnos.ver');
    expect(result).toBe(false);
  });

  test('retorna true si el permiso fue agregado directamente (no está en rol)', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(
      makeUE({
        rolesPermisos: [],
        modulosEmpresa: ['turnos', 'nomina', 'areas'],  // areas debe estar habilitado en empresa
        permisosDirectos: [{ codigo: 'areas.ver', permitido: true }]
      })
    );
    const result = await permisosService.tienePermiso(ID_USER, ID_EMP, 'areas.ver');
    expect(result).toBe(true);
  });
});
