/**
 * Migración: hashear contraseñas en plaintext existentes con bcrypt.
 * Detecta automáticamente si una contraseña ya está hasheada ($2b$) y la omite.
 * Ejecutar UNA SOLA VEZ después de desplegar la versión con bcrypt.
 *
 *   npm run hash-passwords
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27018/turnos_app';
const SALT_ROUNDS = 12;

async function hashPasswords() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✅ MongoDB conectado');

  const Usuario = require('../models/Usuario');

  // Buscar usuarios cuya contraseña NO esté ya hasheada con bcrypt
  const usuarios = await Usuario.find({
    password: { $not: /^\$2[ab]\$/ }
  }).select('+password');

  if (usuarios.length === 0) {
    console.log('ℹ️  No hay contraseñas en plaintext. Nada que migrar.');
    await mongoose.disconnect();
    return;
  }

  console.log(`🔐 Hasheando contraseñas de ${usuarios.length} usuario(s)...`);

  let migrados = 0;
  let errores = 0;

  for (const usuario of usuarios) {
    try {
      const hash = await bcrypt.hash(usuario.password, SALT_ROUNDS);
      // Usar updateOne directo para evitar que el pre-save hook vuelva a hashear
      await Usuario.updateOne({ _id: usuario._id }, { $set: { password: hash } });
      console.log(`  ✅ ${usuario.username}`);
      migrados++;
    } catch (err) {
      console.error(`  ❌ Error con ${usuario.username}: ${err.message}`);
      errores++;
    }
  }

  console.log(`\nResumen: ${migrados} migrados, ${errores} errores.`);
  await mongoose.disconnect();
  console.log('✅ Conexión cerrada.');
}

hashPasswords().catch(err => {
  console.error('❌ Error en migración:', err.message);
  process.exit(1);
});
