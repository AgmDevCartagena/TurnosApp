/**
 * seedAreas.js
 * Crea áreas iniciales para cada empresa existente que no tenga áreas registradas.
 * Idempotente: puede ejecutarse múltiples veces sin duplicar datos.
 *
 * Uso: node scripts/seedAreas.js
 * O desde docker-entrypoint.sh al iniciar el contenedor.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Empresa  = require('../models/Empresa');
const Area     = require('../models/Area');

const AREAS_DEFAULT = [
  { nombre: 'ADMINISTRACION', codigo: 'ADM', descripcion: 'Área administrativa' },
  { nombre: 'CENTRO DE CONTROL', codigo: 'CC',  descripcion: 'Centro de control y monitoreo' },
  { nombre: 'OPERACIONES',     codigo: 'OPE', descripcion: 'Área de operaciones' },
  { nombre: 'CONDUCTORES',     codigo: 'CON', descripcion: 'Área de conductores' },
  { nombre: 'MANTENIMIENTO',   codigo: 'MAN', descripcion: 'Área de mantenimiento' },
  { nombre: 'TAQUILLEROS',     codigo: 'TAQ', descripcion: 'Área de taquilleros' }
];

async function seedAreas() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/turnos_app';

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB conectado para seedAreas');

    // Solo seedear la empresa de bootstrap (Empresa Principal).
    // Las empresas creadas desde la UI deben gestionar sus propias áreas.
    const empresas = await Empresa.find({ nombre: 'Empresa Principal', estado: 'activa' });
    console.log(`📋 Empresas de bootstrap a inicializar: ${empresas.length}`);

    let creadas = 0;
    let omitidas = 0;

    for (const empresa of empresas) {
      const areasExistentes = await Area.countDocuments({ empresaId: empresa._id });

      if (areasExistentes > 0) {
        console.log(`  ℹ️  Empresa "${empresa.nombre}" ya tiene ${areasExistentes} área(s) — omitiendo`);
        omitidas += areasExistentes;
        continue;
      }

      console.log(`  📌 Creando áreas para empresa "${empresa.nombre}"...`);
      for (const areaDef of AREAS_DEFAULT) {
        try {
          await Area.create({
            empresaId: empresa._id,
            nombre:      areaDef.nombre,
            codigo:      areaDef.codigo,
            descripcion: areaDef.descripcion,
            estado:      'activa'
          });
          creadas++;
        } catch (err) {
          if (err.code === 11000) {
            omitidas++;
          } else {
            console.error(`    ❌ Error creando área ${areaDef.nombre}:`, err.message);
          }
        }
      }
      console.log(`     ✅ ${AREAS_DEFAULT.length} áreas creadas para "${empresa.nombre}"`);
    }

    console.log(`\n✅ seedAreas completado: ${creadas} creadas, ${omitidas} omitidas (ya existían).`);
  } catch (err) {
    console.error('❌ Error en seedAreas:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedAreas();
