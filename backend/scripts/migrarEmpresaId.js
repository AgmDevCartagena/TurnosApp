/**
 * Script de migración: agrega empresaId a documentos existentes
 *
 * Crea (si no existe) la "Empresa Principal" y asigna su ID a:
 *   - Todos los Usuarios sin empresaId (excepto super_admin)
 *   - Todos los Empleados sin empresaId
 *   - Todos los Turnos sin empresaId
 *
 * Uso:
 *   node backend/scripts/migrarEmpresaId.js
 * o con MONGO_URI personalizada:
 *   MONGO_URI=mongodb://... node backend/scripts/migrarEmpresaId.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/turnos_app';

async function migrar() {
  console.log('🚀 Iniciando migración multiempresa...');
  console.log('📡 Conectando a:', MONGO_URI);

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('✅ MongoDB conectado\n');

  const Empresa = require('../models/Empresa');
  const Usuario = require('../models/Usuario');
  const Empleado = require('../models/Empleado');
  const Turno = require('../models/Turno');

  // ── 1. Empresa Principal ─────────────────────────────────────────────────
  let empresa = await Empresa.findOne({ nombre: 'Empresa Principal' });
  if (!empresa) {
    empresa = await Empresa.create({
      nombre: 'Empresa Principal',
      nit: '000000000-0',
      razonSocial: 'Empresa Principal S.A.S.',
      estado: 'activa',
      modulosHabilitados: ['turnos', 'nomina']
    });
    console.log('✅ Empresa Principal creada:', empresa._id);
  } else {
    console.log('ℹ️  Empresa Principal encontrada:', empresa._id);
  }

  const empresaId = empresa._id;

  // ── 2. Usuarios ──────────────────────────────────────────────────────────
  const usuariosSinEmpresa = await Usuario.countDocuments({
    empresaId: null,
    rol: { $ne: 'super_admin' }
  });
  if (usuariosSinEmpresa > 0) {
    const resultado = await Usuario.updateMany(
      { empresaId: null, rol: { $ne: 'super_admin' } },
      { $set: { empresaId } }
    );
    console.log(`✅ Usuarios migrados: ${resultado.modifiedCount} de ${usuariosSinEmpresa}`);
  } else {
    console.log('ℹ️  Todos los usuarios ya tienen empresaId');
  }

  // ── 3. Empleados ─────────────────────────────────────────────────────────
  const empleadosSinEmpresa = await Empleado.countDocuments({ empresaId: null });
  if (empleadosSinEmpresa > 0) {
    const resultado = await Empleado.updateMany(
      { empresaId: null },
      { $set: { empresaId } }
    );
    console.log(`✅ Empleados migrados: ${resultado.modifiedCount} de ${empleadosSinEmpresa}`);
  } else {
    console.log('ℹ️  Todos los empleados ya tienen empresaId');
  }

  // ── 4. Turnos ────────────────────────────────────────────────────────────
  const turnosSinEmpresa = await Turno.countDocuments({ empresaId: null });
  if (turnosSinEmpresa > 0) {
    const resultado = await Turno.updateMany(
      { empresaId: null },
      { $set: { empresaId } }
    );
    console.log(`✅ Turnos migrados: ${resultado.modifiedCount} de ${turnosSinEmpresa}`);
  } else {
    console.log('ℹ️  Todos los turnos ya tienen empresaId');
  }

  // ── Resumen ──────────────────────────────────────────────────────────────
  console.log('\n📊 Resumen de migración:');
  console.log(`   • Empresa Principal ID: ${empresaId}`);
  console.log(`   • Usuarios migrados: ${usuariosSinEmpresa}`);
  console.log(`   • Empleados migrados: ${empleadosSinEmpresa}`);
  console.log(`   • Turnos migrados: ${turnosSinEmpresa}`);

  await mongoose.disconnect();
  console.log('\n✅ Migración completada exitosamente');
}

migrar().catch(err => {
  console.error('❌ Error en migración:', err.message);
  process.exit(1);
});
