import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUbicacionesColombia() {
  console.log('🌎 Iniciando seed de ubicaciones de Colombia...');

  // Upsert Colombia
  let colombia = await prisma.pais.findUnique({ where: { codigo: 'CO' } });

  if (!colombia) {
    colombia = await prisma.pais.create({
      data: {
        codigo: 'CO',
        nombre: 'Colombia',
        nombreOficial: 'República de Colombia',
        activo: true,
      },
    });
    console.log('✅ País Colombia creado');
  } else {
    console.log('✅ País Colombia ya existe');
  }

  // Si ya hay departamentos no hace falta repetir el seed
  const deptosExistentes = await prisma.departamento.count({ where: { paisId: colombia.id } });
  if (deptosExistentes > 0) {
    console.log(`✅ Ya existen ${deptosExistentes} departamentos. Seed omitido.`);
    return;
  }

  // Departamentos principales de Colombia
  const departamentos = [
    { codigo: 'ANT', nombre: 'Antioquia' },
    { codigo: 'ATL', nombre: 'Atlántico' },
    { codigo: 'BOL', nombre: 'Bolívar' },
    { codigo: 'BOY', nombre: 'Boyacá' },
    { codigo: 'CAL', nombre: 'Caldas' },
    { codigo: 'CAQ', nombre: 'Caquetá' },
    { codigo: 'CAS', nombre: 'Casanare' },
    { codigo: 'CAU', nombre: 'Cauca' },
    { codigo: 'CES', nombre: 'Cesar' },
    { codigo: 'COR', nombre: 'Córdoba' },
    { codigo: 'CUN', nombre: 'Cundinamarca' },
    { codigo: 'CHO', nombre: 'Chocó' },
    { codigo: 'HUI', nombre: 'Huila' },
    { codigo: 'LAG', nombre: 'La Guajira' },
    { codigo: 'MAG', nombre: 'Magdalena' },
    { codigo: 'MET', nombre: 'Meta' },
    { codigo: 'NAR', nombre: 'Nariño' },
    { codigo: 'NSA', nombre: 'Norte de Santander' },
    { codigo: 'QUI', nombre: 'Quindío' },
    { codigo: 'RIS', nombre: 'Risaralda' },
    { codigo: 'SAN', nombre: 'Santander' },
    { codigo: 'SUC', nombre: 'Sucre' },
    { codigo: 'TOL', nombre: 'Tolima' },
    { codigo: 'VAC', nombre: 'Valle del Cauca' },
    { codigo: 'ARA', nombre: 'Arauca' },
    { codigo: 'PUT', nombre: 'Putumayo' },
    { codigo: 'AMA', nombre: 'Amazonas' },
    { codigo: 'GUA', nombre: 'Guainía' },
    { codigo: 'GUV', nombre: 'Guaviare' },
    { codigo: 'VAU', nombre: 'Vaupés' },
    { codigo: 'VIC', nombre: 'Vichada' },
    { codigo: 'SAP', nombre: 'San Andrés y Providencia' },
  ];

  for (const dept of departamentos) {
    await prisma.departamento.create({
      data: {
        paisId: colombia.id,
        codigo: dept.codigo,
        nombre: dept.nombre,
        activo: true,
      },
    });
  }

  console.log(`✅ ${departamentos.length} departamentos creados`);

  // Ciudades principales por departamento
  const ciudadesPrincipales = [
    // Antioquia
    { deptCodigo: 'ANT', codigo: '05001', nombre: 'Medellín' },
    { deptCodigo: 'ANT', codigo: '05088', nombre: 'Bello' },
    { deptCodigo: 'ANT', codigo: '05360', nombre: 'Itagüí' },
    { deptCodigo: 'ANT', codigo: '05266', nombre: 'Envigado' },
    
    // Atlántico
    { deptCodigo: 'ATL', codigo: '08001', nombre: 'Barranquilla' },
    { deptCodigo: 'ATL', codigo: '08758', nombre: 'Soledad' },
    { deptCodigo: 'ATL', codigo: '08520', nombre: 'Malambo' },
    
    // Bolívar
    { deptCodigo: 'BOL', codigo: '13001', nombre: 'Cartagena' },
    { deptCodigo: 'BOL', codigo: '13244', nombre: 'El Carmen de Bolívar' },
    { deptCodigo: 'BOL', codigo: '13430', nombre: 'Magangué' },
    
    // Cundinamarca
    { deptCodigo: 'CUN', codigo: '11001', nombre: 'Bogotá D.C.' },
    { deptCodigo: 'CUN', codigo: '25754', nombre: 'Soacha' },
    { deptCodigo: 'CUN', codigo: '25175', nombre: 'Chía' },
    { deptCodigo: 'CUN', codigo: '25290', nombre: 'Facatativá' },
    { deptCodigo: 'CUN', codigo: '25899', nombre: 'Zipaquirá' },
    
    // Valle del Cauca
    { deptCodigo: 'VAC', codigo: '76001', nombre: 'Cali' },
    { deptCodigo: 'VAC', codigo: '76520', nombre: 'Palmira' },
    { deptCodigo: 'VAC', codigo: '76111', nombre: 'Buenaventura' },
    { deptCodigo: 'VAC', codigo: '76892', nombre: 'Yumbo' },
    
    // Santander
    { deptCodigo: 'SAN', codigo: '68001', nombre: 'Bucaramanga' },
    { deptCodigo: 'SAN', codigo: '68276', nombre: 'Floridablanca' },
    { deptCodigo: 'SAN', codigo: '68307', nombre: 'Girón' },
    { deptCodigo: 'SAN', codigo: '68547', nombre: 'Piedecuesta' },
    
    // Otras ciudades principales
    { deptCodigo: 'CAL', codigo: '17001', nombre: 'Manizales' },
    { deptCodigo: 'RIS', codigo: '66001', nombre: 'Pereira' },
    { deptCodigo: 'QUI', codigo: '63001', nombre: 'Armenia' },
    { deptCodigo: 'TOL', codigo: '73001', nombre: 'Ibagué' },
    { deptCodigo: 'HUI', codigo: '41001', nombre: 'Neiva' },
    { deptCodigo: 'NAR', codigo: '52001', nombre: 'Pasto' },
    { deptCodigo: 'NSA', codigo: '54001', nombre: 'Cúcuta' },
    { deptCodigo: 'CES', codigo: '20001', nombre: 'Valledupar' },
    { deptCodigo: 'MAG', codigo: '47001', nombre: 'Santa Marta' },
    { deptCodigo: 'MET', codigo: '50001', nombre: 'Villavicencio' },
  ];

  for (const ciudad of ciudadesPrincipales) {
    const departamento = await prisma.departamento.findFirst({
      where: {
        paisId: colombia.id,
        codigo: ciudad.deptCodigo,
      },
    });

    if (departamento) {
      await prisma.ciudad.create({
        data: {
          departamentoId: departamento.id,
          codigo: ciudad.codigo,
          nombre: ciudad.nombre,
          activo: true,
        },
      });
    }
  }

  console.log(`✅ ${ciudadesPrincipales.length} ciudades principales creadas`);
  console.log('🎉 Seed de ubicaciones de Colombia completado');
}

seedUbicacionesColombia()
  .catch((e) => {
    console.error('❌ Error en seed de ubicaciones:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
