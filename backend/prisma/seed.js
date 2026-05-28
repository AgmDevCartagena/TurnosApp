'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de PostgreSQL...');

  // 1. Módulos base
  const moduloTurnos = await prisma.modulo.upsert({
    where: { codigo: 'turnos' },
    update: {},
    create: { codigo: 'turnos', nombre: 'Módulo de Turnos', descripcion: 'Gestión de turnos y horarios' }
  });
  const moduloNomina = await prisma.modulo.upsert({
    where: { codigo: 'nomina' },
    update: {},
    create: { codigo: 'nomina', nombre: 'Módulo de Nómina', descripcion: 'Gestión de nómina y liquidaciones' }
  });
  console.log('✅ Módulos creados:', moduloTurnos.codigo, moduloNomina.codigo);

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
