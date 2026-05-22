/**
 * Script de inicialización de la base de datos
 * Crea la empresa principal y el usuario super_admin si no existen.
 * Ejecutado automáticamente por docker-entrypoint.sh al iniciar el contenedor.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/turnos_app';

async function initDB() {
  console.log('🔧 Inicializando base de datos...');

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('✅ MongoDB conectado');

  // Importar modelos
  const Empresa = require('./models/Empresa');
  const Usuario = require('./models/Usuario');

  // ── 1. Crear empresa principal si no existe ──────────────────────────────
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
    console.log('ℹ️  Empresa Principal ya existe:', empresa._id);
  }

  // ── 2. Crear super_admin global si no existe ─────────────────────────────
  const superAdmin = await Usuario.findOne({ username: 'superadmin' });
  if (!superAdmin) {
    await Usuario.create({
      username: 'superadmin',
      password: 'SuperAdmin2025!',
      nombre: 'Super Administrador',
      rol: 'super_admin',
      modulosPermitidos: ['turnos', 'nomina'],
      areasPermitidas: [],
      empresaId: null,
      activo: true
    });
    console.log('✅ Usuario superadmin creado (contraseña: SuperAdmin2025!)');
  } else {
    console.log('ℹ️  Usuario superadmin ya existe');
  }

  // ── 3. Crear admin de empresa si no existe ───────────────────────────────
  const adminInitPassword = process.env.ADMIN_INIT_PASSWORD || 'Admin2025!';
  const admin = await Usuario.findOne({ username: 'admin' });
  if (!admin) {
    await Usuario.create({
      username: 'admin',
      password: adminInitPassword,
      nombre: 'Administrador',
      rol: 'admin',
      modulosPermitidos: ['turnos', 'nomina'],
      areasPermitidas: [],
      empresaId: empresa._id,
      activo: true
    });
    console.log('✅ Usuario admin creado (empresa: Empresa Principal)');
  } else {
    if (!admin.empresaId) {
      admin.empresaId = empresa._id;
      await admin.save();
      console.log('✅ Usuario admin actualizado con empresaId');
    } else {
      console.log('ℹ️  Usuario admin ya existe');
    }
  }

  // ── 4. Asociar usuarios sin empresa a la Empresa Principal ───────────────
  const sinEmpresa = await Usuario.countDocuments({
    empresaId: null,
    rol: { $ne: 'super_admin' }
  });
  if (sinEmpresa > 0) {
    await Usuario.updateMany(
      { empresaId: null, rol: { $ne: 'super_admin' } },
      { $set: { empresaId: empresa._id } }
    );
    console.log(`✅ ${sinEmpresa} usuarios sin empresa asignados a Empresa Principal`);
  }

  await mongoose.disconnect();
  console.log('✅ Inicialización completada');
}

initDB().catch(err => {
  console.error('❌ Error en init-db:', err.message);
  process.exit(1);
});
