import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('🔐 Creando usuario administrador...');

  // Verificar si ya existe el usuario admin
  const existingUser = await prisma.usuario.findUnique({
    where: { username: 'admin' },
  });

  if (existingUser) {
    console.log('✅ Usuario admin ya existe');
    return;
  }

  // Crear empresa por defecto
  let empresa = await prisma.empresa.findFirst();
  
  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nombre: 'Empresa Demo',
        nit: '900000000-1',
        razonSocial: 'Empresa Demo S.A.S.',
        direccion: 'Calle 123 #45-67',
        telefono: '6011234567',
        email: 'contacto@empresademo.com',
        activo: true,
      },
    });
    console.log('✅ Empresa demo creada');
  }

  // Hash de la contraseña
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Crear usuario administrador
  const adminUser = await prisma.usuario.create({
    data: {
      username: 'admin',
      email: 'admin@empresademo.com',
      password: hashedPassword,
      nombre: 'Administrador',
      apellido: 'Sistema',
      activo: true,
    },
  });

  console.log('✅ Usuario admin creado');

  // Crear rol de super_admin si no existe
  let superAdminRole = await prisma.rol.findUnique({
    where: { nombre: 'super_admin' },
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.rol.create({
      data: {
        codigo: 'SUPER_ADMIN',
        nombre: 'super_admin',
        descripcion: 'Super Administrador del Sistema',
        activo: true,
      },
    });
    console.log('✅ Rol super_admin creado');
  }

  // Asignar rol al usuario en la empresa
  await prisma.usuarioEmpresaRol.create({
    data: {
      usuarioId: adminUser.id,
      empresaId: empresa.id,
      rolId: superAdminRole.id,
      activo: true,
    },
  });

  console.log('✅ Rol asignado al usuario admin');
  console.log('\n📋 Credenciales de acceso:');
  console.log('   Usuario: admin');
  console.log('   Contraseña: admin123');
  console.log('   Empresa: Empresa Demo\n');
}

createAdminUser()
  .catch((e) => {
    console.error('❌ Error creando usuario admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
