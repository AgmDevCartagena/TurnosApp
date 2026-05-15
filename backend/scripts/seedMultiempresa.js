/**
 * Seed de datos para arquitectura multiempresa
 *
 * Crea tres empresas de prueba con sus usuarios y empleados de ejemplo.
 * También crea un super_admin global.
 *
 * Uso:
 *   node backend/scripts/seedMultiempresa.js
 *
 * NOTA: Este script es destructivo para los datos de seed (los elimina y recrea).
 *       Los datos reales de Empresa Principal NO se tocan.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/turnos_app';

const EMPRESAS_SEED = [
  {
    nombre: 'Empresa Demo A',
    nit: '111111111-1',
    razonSocial: 'Demo Alpha S.A.S.',
    colorTema: '#e74c3c',
    modulosHabilitados: ['turnos', 'nomina']
  },
  {
    nombre: 'Empresa Demo B',
    nit: '222222222-2',
    razonSocial: 'Demo Beta Ltda.',
    colorTema: '#2ecc71',
    modulosHabilitados: ['turnos']
  },
  {
    nombre: 'Empresa Demo C',
    nit: '333333333-3',
    razonSocial: 'Demo Gamma S.A.',
    colorTema: '#3498db',
    modulosHabilitados: ['turnos', 'nomina']
  }
];

async function seed() {
  console.log('🌱 Iniciando seed multiempresa...');

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('✅ MongoDB conectado\n');

  const Empresa = require('../models/Empresa');
  const Usuario = require('../models/Usuario');
  const Empleado = require('../models/Empleado');

  // ── Super Admin Global ───────────────────────────────────────────────────
  const superAdminExiste = await Usuario.findOne({ username: 'superadmin' });
  if (!superAdminExiste) {
    await Usuario.create({
      username: 'superadmin',
      password: 'SuperAdmin2025!',
      nombre: 'Super Administrador Global',
      rol: 'super_admin',
      modulosPermitidos: ['turnos', 'nomina'],
      areasPermitidas: [],
      empresaId: null,
      activo: true
    });
    console.log('✅ superadmin creado (pass: SuperAdmin2025!)');
  }

  // ── Empresas Demo ────────────────────────────────────────────────────────
  for (const [i, datosEmpresa] of EMPRESAS_SEED.entries()) {
    const letraEmpresa = String.fromCharCode(65 + i); // A, B, C
    const sufijo = letraEmpresa.toLowerCase();

    // Eliminar datos previos de esta empresa demo para idempotencia
    const empresaExistente = await Empresa.findOne({ nit: datosEmpresa.nit });
    if (empresaExistente) {
      await Usuario.deleteMany({ empresaId: empresaExistente._id });
      await Empleado.deleteMany({ empresaId: empresaExistente._id });
      await empresaExistente.deleteOne();
      console.log(`🗑️  Datos anteriores de ${datosEmpresa.nombre} eliminados`);
    }

    const empresa = await Empresa.create({ ...datosEmpresa, estado: 'activa' });
    console.log(`✅ ${empresa.nombre} creada (ID: ${empresa._id})`);

    // Admin de empresa
    await Usuario.create({
      username: `admin_${sufijo}`,
      password: `admin${letraEmpresa}2025`,
      nombre: `Administrador Empresa ${letraEmpresa}`,
      rol: 'admin',
      modulosPermitidos: datosEmpresa.modulosHabilitados,
      areasPermitidas: [],
      empresaId: empresa._id,
      activo: true
    });
    console.log(`   👤 admin_${sufijo} (pass: admin${letraEmpresa}2025)`);

    // Usuario operativo
    await Usuario.create({
      username: `usuario_${sufijo}`,
      password: `user${letraEmpresa}2025`,
      nombre: `Operador Empresa ${letraEmpresa}`,
      rol: 'usuario',
      modulosPermitidos: datosEmpresa.modulosHabilitados,
      areasPermitidas: ['ADMINISTRACION'],
      empresaId: empresa._id,
      activo: true
    });
    console.log(`   👤 usuario_${sufijo} (pass: user${letraEmpresa}2025)`);

    // Empleados de ejemplo
    const empleadosEjemplo = [
      {
        nombre: `Juan Pérez ${letraEmpresa}`,
        documento: `10000${i}001`,
        cargo: 'Analista',
        area: 'ADMINISTRACION',
        salario: 2000000,
        empresaId: empresa._id
      },
      {
        nombre: `María López ${letraEmpresa}`,
        documento: `10000${i}002`,
        cargo: 'Coordinador',
        area: 'OPERACIONES',
        salario: 2500000,
        empresaId: empresa._id
      }
    ];
    for (const emp of empleadosEjemplo) {
      await Empleado.create(emp);
    }
    console.log(`   👥 2 empleados de ejemplo creados`);
    console.log('');
  }

  // ── Resumen ──────────────────────────────────────────────────────────────
  console.log('📊 Credenciales de acceso:');
  console.log('┌─────────────────┬──────────────────┬────────────────────────┐');
  console.log('│ Usuario         │ Contraseña       │ Rol / Empresa          │');
  console.log('├─────────────────┼──────────────────┼────────────────────────┤');
  console.log('│ superadmin      │ SuperAdmin2025!  │ SUPER_ADMIN (global)   │');
  console.log('│ admin_a         │ adminA2025       │ admin / Empresa Demo A │');
  console.log('│ usuario_a       │ userA2025        │ usuario / Demo A       │');
  console.log('│ admin_b         │ adminB2025       │ admin / Empresa Demo B │');
  console.log('│ usuario_b       │ userB2025        │ usuario / Demo B       │');
  console.log('│ admin_c         │ adminC2025       │ admin / Empresa Demo C │');
  console.log('│ usuario_c       │ userC2025        │ usuario / Demo C       │');
  console.log('└─────────────────┴──────────────────┴────────────────────────┘');

  await mongoose.disconnect();
  console.log('\n✅ Seed completado');
}

seed().catch(err => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
