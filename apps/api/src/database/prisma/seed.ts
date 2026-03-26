import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Permisos base ──
  const recursos = [
    'usuarios',
    'roles',
    'proveedores',
    'catalogo',
    'solicitudes',
    'aprobaciones',
    'compras',
    'inventarios',
    'documentos',
    'reportes',
    'configuracion',
  ];
  const acciones = ['crear', 'leer', 'actualizar', 'eliminar'];

  const permisos = [];
  for (const recurso of recursos) {
    for (const accion of acciones) {
      const permiso = await prisma.permiso.upsert({
        where: { recurso_accion: { recurso, accion } },
        update: {},
        create: { recurso, accion },
      });
      permisos.push(permiso);
    }
  }
  console.log(`  ✅ ${permisos.length} permisos creados`);

  // ── Roles ──
  const rolSuperAdmin = await prisma.rol.upsert({
    where: { nombre: 'super_admin' },
    update: {},
    create: { nombre: 'super_admin', descripcion: 'Super Administrador del sistema' },
  });

  await prisma.rol.upsert({
    where: { nombre: 'admin' },
    update: {},
    create: { nombre: 'admin', descripcion: 'Administrador' },
  });

  await prisma.rol.upsert({
    where: { nombre: 'jefe_compras' },
    update: {},
    create: { nombre: 'jefe_compras', descripcion: 'Jefe de Compras' },
  });

  await prisma.rol.upsert({
    where: { nombre: 'comprador' },
    update: {},
    create: { nombre: 'comprador', descripcion: 'Comprador' },
  });

  await prisma.rol.upsert({
    where: { nombre: 'aprobador' },
    update: {},
    create: { nombre: 'aprobador', descripcion: 'Aprobador de solicitudes' },
  });

  await prisma.rol.upsert({
    where: { nombre: 'solicitante' },
    update: {},
    create: { nombre: 'solicitante', descripcion: 'Solicitante de compras' },
  });

  const rolAuditor = await prisma.rol.upsert({
    where: { nombre: 'auditor' },
    update: {},
    create: { nombre: 'auditor', descripcion: 'Auditor (solo lectura)' },
  });

  console.log('  ✅ 7 roles creados');

  // ── Asignar todos los permisos al super_admin ──
  for (const permiso of permisos) {
    await prisma.permisoRol.upsert({
      where: { rolId_permisoId: { rolId: rolSuperAdmin.id, permisoId: permiso.id } },
      update: {},
      create: { rolId: rolSuperAdmin.id, permisoId: permiso.id },
    });
  }
  console.log('  ✅ Permisos asignados a super_admin');

  // ── Asignar permisos de lectura al auditor ──
  const permisosLectura = permisos.filter((p) => p.accion === 'leer');
  for (const permiso of permisosLectura) {
    await prisma.permisoRol.upsert({
      where: { rolId_permisoId: { rolId: rolAuditor.id, permisoId: permiso.id } },
      update: {},
      create: { rolId: rolAuditor.id, permisoId: permiso.id },
    });
  }
  console.log('  ✅ Permisos de lectura asignados a auditor');

  // ── Usuario admin por defecto ──
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  await prisma.usuario.upsert({
    where: { email: 'admin@gestion-compras.com' },
    update: {},
    create: {
      email: 'admin@gestion-compras.com',
      password: hashedPassword,
      nombre: 'Administrador',
      apellido: 'Sistema',
      rolId: rolSuperAdmin.id,
    },
  });
  console.log('  ✅ Usuario admin creado (admin@gestion-compras.com / Admin123!)');

  // ── Centros de costo de ejemplo ──
  await prisma.centroCosto.upsert({
    where: { codigo: 'CC-001' },
    update: {},
    create: { nombre: 'Operaciones', codigo: 'CC-001', descripcion: 'Centro de costo de operaciones' },
  });

  await prisma.centroCosto.upsert({
    where: { codigo: 'CC-002' },
    update: {},
    create: { nombre: 'Administración', codigo: 'CC-002', descripcion: 'Centro de costo administrativo' },
  });

  await prisma.centroCosto.upsert({
    where: { codigo: 'CC-003' },
    update: {},
    create: { nombre: 'Tecnología', codigo: 'CC-003', descripcion: 'Centro de costo de TI' },
  });

  console.log('  ✅ 3 centros de costo creados');

  // ── Proveedores de ejemplo ──
  const admin = await prisma.usuario.findUnique({ where: { email: 'admin@gestion-compras.com' } });

  await prisma.proveedor.upsert({
    where: { nit: '900.123.456-7' },
    update: {},
    create: {
      razonSocial: 'Suministros Industriales S.A.S.',
      nit: '900.123.456-7',
      tipoProveedor: 'nacional',
      tipoPersona: 'juridica',
      tipoIdentificacion: 'nit',
      direccion: 'Cra 45 #26-85 Bodega 12',
      departamento: 'Antioquia',
      ciudad: 'Medellín',
      telefono: '(604) 444 5566',
      emailCorporativo: 'ventas@suministrosindustriales.com',
      tipoEmpresa: 'sas',
      codigoCiiu: '4659',
      descripcionActividad: 'Comercio al por mayor de otros tipos de maquinaria y equipo',
      certificaciones: ['ISO 9001', 'ISO 14001'],
      repLegalNombres: 'Carlos Alberto',
      repLegalApellidos: 'Gómez Restrepo',
      repLegalTipoDoc: 'cc',
      repLegalNumDoc: '71.234.567',
      repLegalTelefono: '(604) 444 5567',
      repLegalEmail: 'cgomez@suministrosindustriales.com',
      estado: 'activo',
      creadoPorId: admin?.id,
    },
  });

  await prisma.proveedor.upsert({
    where: { nit: '800.987.654-3' },
    update: {},
    create: {
      razonSocial: 'Tecnología & Redes Ltda.',
      nit: '800.987.654-3',
      tipoProveedor: 'nacional',
      tipoPersona: 'juridica',
      tipoIdentificacion: 'nit',
      direccion: 'Calle 100 #19-61 Of. 801',
      departamento: 'Cundinamarca',
      ciudad: 'Bogotá',
      telefono: '(601) 601 2233',
      emailCorporativo: 'comercial@tecnoredes.co',
      tipoEmpresa: 'ltda',
      codigoCiiu: '6201',
      descripcionActividad: 'Actividades de desarrollo de sistemas informáticos',
      certificaciones: ['ISO 27001'],
      repLegalNombres: 'María Fernanda',
      repLegalApellidos: 'López Díaz',
      repLegalTipoDoc: 'cc',
      repLegalNumDoc: '52.876.543',
      estado: 'activo',
      creadoPorId: admin?.id,
    },
  });

  await prisma.proveedor.upsert({
    where: { nit: '901.555.888-1' },
    update: {},
    create: {
      razonSocial: 'Papelería y Oficina Express S.A.',
      nit: '901.555.888-1',
      tipoProveedor: 'nacional',
      tipoPersona: 'juridica',
      tipoIdentificacion: 'nit',
      direccion: 'Av. El Dorado #68C-61',
      departamento: 'Cundinamarca',
      ciudad: 'Bogotá',
      telefono: '(601) 745 8900',
      emailCorporativo: 'pedidos@papeleriaexpress.com',
      tipoEmpresa: 'sa',
      codigoCiiu: '4761',
      descripcionActividad: 'Comercio al por menor de libros, periódicos, materiales y artículos de papelería',
      certificaciones: [],
      estado: 'en_evaluacion',
      creadoPorId: admin?.id,
    },
  });

  console.log('  ✅ 3 proveedores de ejemplo creados');

  // ── Solicitudes de compra de ejemplo ──
  const ccTech = await prisma.centroCosto.findUnique({ where: { codigo: 'CC-003' } });
  const ccAdmin = await prisma.centroCosto.findUnique({ where: { codigo: 'CC-002' } });
  const ccOps = await prisma.centroCosto.findUnique({ where: { codigo: 'CC-001' } });

  const existingSol1 = await prisma.solicitudCompra.findUnique({ where: { numero: 'SOL-2026-0001' } });
  if (!existingSol1 && admin) {
    await prisma.solicitudCompra.create({
      data: {
        numero: 'SOL-2026-0001',
        titulo: 'Compra de equipos de cómputo para oficina',
        solicitante: { connect: { id: admin.id } },
        estado: 'aprobada',
        departamento: 'Tecnología',
        categoria: 'Equipos y Tecnología',
        prioridad: 'alta',
        ...(ccTech ? { centroCosto: { connect: { id: ccTech.id } } } : {}),
        fechaRequerida: new Date('2026-03-15'),
        tiempoEntrega: 15,
        moneda: 'COP',
        descripcion: 'Se requieren 5 laptops para el equipo de desarrollo que ingresa en marzo.',
        justificacion: 'El equipo de desarrollo necesita equipos actualizados para los nuevos proyectos.',
        totalEstimado: 17500000,
        lineas: {
          create: [
            { descripcion: 'Laptop Dell Latitude 5540', cantidad: 5, unidadMedida: 'Unidad', especificaciones: 'Core i7, 16GB RAM, 512GB SSD', precioEstimado: 3500000 },
          ],
        },
      } as any,
    });
  }

  const existingSol2 = await prisma.solicitudCompra.findUnique({ where: { numero: 'SOL-2026-0002' } });
  if (!existingSol2 && admin) {
    await prisma.solicitudCompra.create({
      data: {
        numero: 'SOL-2026-0002',
        titulo: 'Suministros de oficina trimestre Q1',
        solicitante: { connect: { id: admin.id } },
        estado: 'enviada',
        departamento: 'Administración',
        categoria: 'Suministros de Oficina',
        prioridad: 'media',
        ...(ccAdmin ? { centroCosto: { connect: { id: ccAdmin.id } } } : {}),
        fechaRequerida: new Date('2026-02-28'),
        tiempoEntrega: 5,
        moneda: 'COP',
        descripcion: 'Reposición trimestral de suministros de oficina.',
        justificacion: 'Inventario de suministros por debajo del mínimo requerido.',
        totalEstimado: 1850000,
        lineas: {
          create: [
            { descripcion: 'Resma papel carta', cantidad: 50, unidadMedida: 'Unidad', precioEstimado: 15000 },
            { descripcion: 'Tóner HP LaserJet', cantidad: 10, unidadMedida: 'Unidad', precioEstimado: 85000 },
            { descripcion: 'Kit útiles de escritorio', cantidad: 20, unidadMedida: 'Paquete', precioEstimado: 25000 },
          ],
        },
      } as any,
    });
  }

  const existingSol3 = await prisma.solicitudCompra.findUnique({ where: { numero: 'SOL-2026-0003' } });
  if (!existingSol3 && admin) {
    await prisma.solicitudCompra.create({
      data: {
        numero: 'SOL-2026-0003',
        titulo: 'Servicio de mantenimiento aires acondicionados',
        solicitante: { connect: { id: admin.id } },
        estado: 'borrador',
        departamento: 'Operaciones',
        categoria: 'Mantenimiento',
        prioridad: 'baja',
        ...(ccOps ? { centroCosto: { connect: { id: ccOps.id } } } : {}),
        moneda: 'COP',
        descripcion: 'Mantenimiento preventivo semestral de 12 unidades de aire acondicionado.',
        justificacion: 'Mantenimiento programado según plan anual de mantenimiento.',
        totalEstimado: 3600000,
        lineas: {
          create: [
            { descripcion: 'Mantenimiento preventivo A/C', cantidad: 12, unidadMedida: 'Servicio', especificaciones: 'Incluye limpieza, recarga de gas y revisión eléctrica', precioEstimado: 300000 },
          ],
        },
      } as any,
    });
  }

  const existingSol4 = await prisma.solicitudCompra.findUnique({ where: { numero: 'SOL-2026-0004' } });
  if (!existingSol4 && admin) {
    await prisma.solicitudCompra.create({
      data: {
        numero: 'SOL-2026-0004',
        titulo: 'Licencias Microsoft 365 Business Premium',
        solicitante: { connect: { id: admin.id } },
        estado: 'en_aprobacion',
        departamento: 'Tecnología',
        categoria: 'Software y Licencias',
        prioridad: 'alta',
        ...(ccTech ? { centroCosto: { connect: { id: ccTech.id } } } : {}),
        fechaRequerida: new Date('2026-03-01'),
        tiempoEntrega: 3,
        moneda: 'USD',
        descripcion: 'Renovación anual de licencias Microsoft 365 para toda la organización.',
        justificacion: 'Las licencias actuales vencen el 1 de marzo. Sin renovación se pierde acceso a correo y herramientas.',
        totalEstimado: 6000,
        lineas: {
          create: [
            { descripcion: 'Microsoft 365 Business Premium (anual)', cantidad: 50, unidadMedida: 'Unidad', especificaciones: 'Licencia por usuario, incluye Teams, OneDrive, Exchange', precioEstimado: 120 },
          ],
        },
      } as any,
    });
  }

  console.log('  ✅ 4 solicitudes de compra de ejemplo creadas');

  console.log('\n🎉 Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
