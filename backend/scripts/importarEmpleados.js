const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Empleado = require('../models/Empleado');

// Conexión a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27018/turnos_db';

async function importarEmpleados() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Leer archivo CSV
    const csvPath = path.join(__dirname, '../../Personal_activo_organizado_compatible.csv');
    console.log(`📄 Leyendo archivo: ${csvPath}`);
    
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvData.split('\n');
    
    // Saltar la primera línea (encabezados)
    const empleadosData = lines.slice(1).filter(line => line.trim() !== '');
    
    console.log(`📊 Total de líneas a procesar: ${empleadosData.length}`);
    
    let importados = 0;
    let errores = 0;
    let duplicados = 0;

    for (let i = 0; i < empleadosData.length; i++) {
      const line = empleadosData[i];
      const parts = line.split(',');
      
      if (parts.length < 5) {
        console.log(`⚠️  Línea ${i + 2} incompleta, saltando...`);
        errores++;
        continue;
      }

      const nombre = parts[0].trim();
      const documento = parts[1].trim();
      const cargo = parts[2].trim();
      const area = parts[3].trim();
      const salario = parseFloat(parts[4].trim()) || 0;

      if (!nombre || !documento || !area) {
        console.log(`⚠️  Línea ${i + 2} con datos faltantes, saltando...`);
        errores++;
        continue;
      }

      try {
        // Verificar si el empleado ya existe
        const empleadoExiste = await Empleado.findOne({ documento });
        
        if (empleadoExiste) {
          console.log(`⏭️  Empleado ${nombre} (${documento}) ya existe, saltando...`);
          duplicados++;
          continue;
        }

        // Crear nuevo empleado
        const nuevoEmpleado = new Empleado({
          nombre,
          documento,
          cargo,
          area,
          salario,
          estado: 'ACTIVO'
        });

        await nuevoEmpleado.save();
        importados++;
        
        if (importados % 10 === 0) {
          console.log(`✅ Importados: ${importados}`);
        }
      } catch (error) {
        console.error(`❌ Error procesando ${nombre}: ${error.message}`);
        errores++;
      }
    }

    console.log('\n📊 RESUMEN DE IMPORTACIÓN:');
    console.log(`✅ Importados exitosamente: ${importados}`);
    console.log(`⏭️  Duplicados (ya existían): ${duplicados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📋 Total procesado: ${empleadosData.length}`);

    // Mostrar áreas únicas
    const areasUnicas = await Empleado.distinct('area');
    console.log('\n🏢 Áreas disponibles:', areasUnicas);

  } catch (error) {
    console.error('❌ Error en importación:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

importarEmpleados();
