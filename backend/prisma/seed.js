'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de PostgreSQL...');

  // ── 1. Módulos ──────────────────────────────────────────────────────────────
  const MODULOS_DEF = [
    { codigo: 'turnos',     nombre: 'Turnos',      descripcion: 'Gestión de turnos y horarios' },
    { codigo: 'nomina',     nombre: 'Nómina',       descripcion: 'Gestión de nómina y liquidaciones' },
    { codigo: 'usuarios',   nombre: 'Usuarios',     descripcion: 'Administración de usuarios y permisos' },
    { codigo: 'parametros', nombre: 'Parámetros',   descripcion: 'Parámetros de nómina' },
    { codigo: 'reportes',   nombre: 'Reportes',     descripcion: 'Reportes y exportaciones' },
    { codigo: 'empresas',   nombre: 'Empresas',     descripcion: 'Administración de empresas' },
    { codigo: 'areas',      nombre: 'Áreas',        descripcion: 'Administración de áreas' },
  ];
  const modulosMap = {};
  for (const m of MODULOS_DEF) {
    const mod = await prisma.modulo.upsert({
      where: { codigo: m.codigo },
      update: { nombre: m.nombre, descripcion: m.descripcion },
      create: m
    });
    modulosMap[m.codigo] = mod;
  }
  console.log('✅ Módulos:', Object.keys(modulosMap).join(', '));

  // ── 2. Catálogo de permisos ──────────────────────────────────────────────────
  const PERMISOS_DEF = [
    { codigo: 'usuarios.ver',              modulo: 'usuarios',   recurso: 'usuario',    accion: 'ver',      nombre: 'Ver usuarios' },
    { codigo: 'usuarios.crear',            modulo: 'usuarios',   recurso: 'usuario',    accion: 'crear',    nombre: 'Crear usuarios' },
    { codigo: 'usuarios.editar',           modulo: 'usuarios',   recurso: 'usuario',    accion: 'editar',   nombre: 'Editar usuarios' },
    { codigo: 'usuarios.eliminar',         modulo: 'usuarios',   recurso: 'usuario',    accion: 'eliminar', nombre: 'Eliminar usuarios' },
    { codigo: 'empresas.ver',              modulo: 'empresas',   recurso: 'empresa',    accion: 'ver',      nombre: 'Ver empresas' },
    { codigo: 'empresas.editar',           modulo: 'empresas',   recurso: 'empresa',    accion: 'editar',   nombre: 'Editar empresa propia' },
    { codigo: 'areas.ver',                 modulo: 'areas',      recurso: 'area',       accion: 'ver',      nombre: 'Ver áreas' },
    { codigo: 'areas.crear',               modulo: 'areas',      recurso: 'area',       accion: 'crear',    nombre: 'Crear áreas' },
    { codigo: 'areas.editar',              modulo: 'areas',      recurso: 'area',       accion: 'editar',   nombre: 'Editar áreas' },
    { codigo: 'areas.eliminar',            modulo: 'areas',      recurso: 'area',       accion: 'eliminar', nombre: 'Eliminar áreas' },
    { codigo: 'turnos.ver',                modulo: 'turnos',     recurso: 'turno',      accion: 'ver',      nombre: 'Ver turnos' },
    { codigo: 'turnos.crear',              modulo: 'turnos',     recurso: 'turno',      accion: 'crear',    nombre: 'Crear turnos' },
    { codigo: 'turnos.editar',             modulo: 'turnos',     recurso: 'turno',      accion: 'editar',   nombre: 'Editar turnos' },
    { codigo: 'turnos.eliminar',           modulo: 'turnos',     recurso: 'turno',      accion: 'eliminar', nombre: 'Eliminar turnos' },
    { codigo: 'nomina.ver',                modulo: 'nomina',     recurso: 'nomina',     accion: 'ver',      nombre: 'Ver nómina' },
    { codigo: 'nomina.calcular',           modulo: 'nomina',     recurso: 'nomina',     accion: 'calcular', nombre: 'Calcular nómina' },
    { codigo: 'nomina.aprobar',            modulo: 'nomina',     recurso: 'nomina',     accion: 'aprobar',  nombre: 'Aprobar liquidaciones' },
    { codigo: 'nomina.anular',             modulo: 'nomina',     recurso: 'nomina',     accion: 'anular',   nombre: 'Anular liquidaciones' },
    { codigo: 'nomina.parametros.ver',     modulo: 'parametros', recurso: 'parametro',  accion: 'ver',      nombre: 'Ver parámetros de nómina' },
    { codigo: 'nomina.parametros.editar',  modulo: 'parametros', recurso: 'parametro',  accion: 'editar',   nombre: 'Editar parámetros de nómina' },
    { codigo: 'reportes.ver',              modulo: 'reportes',   recurso: 'reporte',    accion: 'ver',      nombre: 'Ver reportes' },
    { codigo: 'reportes.exportar',         modulo: 'reportes',   recurso: 'reporte',    accion: 'exportar', nombre: 'Exportar reportes' },
  ];
  const permisosMap = {};
  for (const p of PERMISOS_DEF) {
    const per = await prisma.permiso.upsert({
      where: { codigo: p.codigo },
      update: { nombre: p.nombre, modulo: p.modulo, recurso: p.recurso, accion: p.accion },
      create: { ...p }
    });
    permisosMap[p.codigo] = per;
  }
  console.log('✅ Permisos:', Object.keys(permisosMap).length, 'registrados');

  // ── 3. Roles base ────────────────────────────────────────────────────────────
  const ROLES_DEF = [
    {
      codigo: 'ADMIN_EMPRESA',
      nombre: 'Administrador de Empresa',
      descripcion: 'Acceso completo dentro de la empresa asignada',
      tipo: 'empresa',
      permisos: Object.keys(permisosMap)
    },
    {
      codigo: 'GESTOR_NOMINA',
      nombre: 'Gestor de Nómina',
      descripcion: 'Gestión completa del módulo de nómina',
      tipo: 'empresa',
      permisos: ['nomina.ver', 'nomina.calcular', 'nomina.aprobar', 'nomina.anular',
                 'nomina.parametros.ver', 'nomina.parametros.editar', 'reportes.ver', 'reportes.exportar']
    },
    {
      codigo: 'GESTOR_TURNOS',
      nombre: 'Gestor de Turnos',
      descripcion: 'Gestión completa del módulo de turnos',
      tipo: 'empresa',
      permisos: ['turnos.ver', 'turnos.crear', 'turnos.editar', 'turnos.eliminar',
                 'areas.ver', 'reportes.ver']
    },
    {
      codigo: 'CONSULTA',
      nombre: 'Usuario de Consulta',
      descripcion: 'Solo lectura en módulos asignados',
      tipo: 'empresa',
      permisos: ['turnos.ver', 'nomina.ver', 'reportes.ver', 'areas.ver', 'usuarios.ver']
    },
  ];

  const rolesMap = {};
  for (const r of ROLES_DEF) {
    const rol = await prisma.rol.upsert({
      where: { codigo: r.codigo },
      update: { nombre: r.nombre, descripcion: r.descripcion },
      create: { codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion, tipo: r.tipo }
    });
    rolesMap[r.codigo] = rol;

    for (const pCodigo of r.permisos) {
      if (permisosMap[pCodigo]) {
        await prisma.rolPermiso.upsert({
          where: { rolId_permisoId: { rolId: rol.id, permisoId: permisosMap[pCodigo].id } },
          update: {},
          create: { rolId: rol.id, permisoId: permisosMap[pCodigo].id }
        });
      }
    }
  }
  console.log('✅ Roles:', Object.keys(rolesMap).join(', '));

  const moduloTurnos = modulosMap['turnos'];
  const moduloNomina = modulosMap['nomina'];
  console.log('✅ Módulos base listos:', moduloTurnos.codigo, moduloNomina.codigo);

  // 2. Empresa Principal
  const empresaPrincipal = await prisma.empresa.upsert({
    where: { nit: '900000001' },
    update: {},
    create: {
      nombre: 'Empresa Principal',
      nit: '900000001',
      razonSocial: 'Empresa Principal S.A.S.',
      estado: 'activa',
      modulos: {
        create: [
          { moduloId: moduloTurnos.id, habilitado: true },
          { moduloId: moduloNomina.id, habilitado: true }
        ]
      }
    }
  });
  console.log('✅ Empresa Principal:', empresaPrincipal.id);

  // 3. Super Admin
  const passwordHash = await bcrypt.hash(process.env.ADMIN_INIT_PASSWORD || 'Admin2025!', 12);
  const superAdmin = await prisma.usuario.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      passwordHash,
      nombre: 'Super Administrador',
      rol: 'super_admin',
      activo: true,
      modulosPermitidos: {
        create: [
          { modulo: 'turnos' },
          { modulo: 'nomina' }
        ]
      }
    }
  });
  console.log('✅ Super Admin:', superAdmin.username);

  console.log('');
  console.log('🎉 Seed de PostgreSQL completado.');
}

main()
  .catch(e => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
