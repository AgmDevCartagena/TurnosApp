'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de PostgreSQL...');

  // ── 1. Módulos ──────────────────────────────────────────────────────────────
  const MODULOS_DEF = [
    { codigo: 'turnos',     nombre: 'Turnos',      descripcion: 'Gestión de turnos y horarios' },
    { codigo: 'nomina',     nombre: 'Nómina',       descripcion: 'Gestión de nómina y liquidaciones' },
    { codigo: 'usuarios',   nombre: 'Usuarios',     descripcion: 'Administración de usuarios y permisos' },
    { codigo: 'parametros', nombre: 'Parámetros',   descripcion: 'Parámetros de nómina' },
    { codigo: 'reportes',   nombre: 'Reportes',     descripcion: 'Reportes y exportaciones' },
    { codigo: 'empresas',   nombre: 'Empresas',     descripcion: 'Administración de empresas' },
    { codigo: 'areas',      nombre: 'Áreas',        descripcion: 'Administración de áreas' },
    { codigo: 'transporte',              nombre: 'Transporte',              descripcion: 'Programación de transporte y rutas del personal' },
    { codigo: 'programacion_operativa',  nombre: 'Programación Operativa',  descripcion: 'Programación de alimentación, meriendas y cenas' },
    { codigo: 'ia',                      nombre: 'Asistente IA',            descripcion: 'Asistente Inteligente de Programación Operativa' },
  ];
  const modulosMap = {};
  for (const m of MODULOS_DEF) {
    const mod = await prisma.modulo.upsert({
      where: { codigo: m.codigo },
      update: { nombre: m.nombre, descripcion: m.descripcion },
      create: m
    });
    modulosMap[m.codigo] = mod;
  }
  console.log('✅ Módulos:', Object.keys(modulosMap).join(', '));

  // ── 2. Catálogo completo de permisos (con descripciones y orden) ─────────────
  const PERMISOS_DEF = [
    // ── Usuarios ──
    { orden: 10, codigo: 'usuarios.ver',              modulo: 'usuarios',   recurso: 'usuario',    accion: 'ver',              nombre: 'Ver usuarios',                    descripcion: 'Permite consultar el listado y detalle de usuarios del sistema.' },
    { orden: 11, codigo: 'usuarios.crear',            modulo: 'usuarios',   recurso: 'usuario',    accion: 'crear',            nombre: 'Crear usuarios',                  descripcion: 'Permite registrar nuevos usuarios y asignarlos a empresas.' },
    { orden: 12, codigo: 'usuarios.editar',           modulo: 'usuarios',   recurso: 'usuario',    accion: 'editar',           nombre: 'Editar usuarios',                 descripcion: 'Permite modificar datos básicos de usuarios existentes.' },
    { orden: 13, codigo: 'usuarios.eliminar',         modulo: 'usuarios',   recurso: 'usuario',    accion: 'eliminar',         nombre: 'Eliminar usuarios',               descripcion: 'Permite eliminar usuarios del sistema de forma permanente.' },
    { orden: 14, codigo: 'usuarios.cambiar_password', modulo: 'usuarios',   recurso: 'usuario',    accion: 'cambiar_password', nombre: 'Cambiar contraseña de usuario',   descripcion: 'Permite cambiar la contraseña de otro usuario del sistema.' },
    // ── Roles y Permisos ──
    { orden: 20, codigo: 'roles.ver',                 modulo: 'usuarios',   recurso: 'rol',        accion: 'ver',              nombre: 'Ver roles',                       descripcion: 'Permite consultar el listado de roles y sus permisos asignados.' },
    { orden: 21, codigo: 'roles.crear',               modulo: 'usuarios',   recurso: 'rol',        accion: 'crear',            nombre: 'Crear roles',                     descripcion: 'Permite crear nuevos roles en el sistema.' },
    { orden: 22, codigo: 'roles.editar',              modulo: 'usuarios',   recurso: 'rol',        accion: 'editar',           nombre: 'Editar roles',                    descripcion: 'Permite modificar el nombre y descripción de roles existentes.' },
    { orden: 23, codigo: 'roles.eliminar',            modulo: 'usuarios',   recurso: 'rol',        accion: 'eliminar',         nombre: 'Eliminar roles',                  descripcion: 'Permite eliminar o desactivar roles que no tengan usuarios asignados.' },
    { orden: 24, codigo: 'roles.asignar_permisos',    modulo: 'usuarios',   recurso: 'rol',        accion: 'asignar_permisos', nombre: 'Asignar permisos a roles',        descripcion: 'Permite agregar o quitar permisos de un rol existente.' },
    // ── Empresas ──
    { orden: 30, codigo: 'empresas.ver',              modulo: 'empresas',   recurso: 'empresa',    accion: 'ver',              nombre: 'Ver empresas',                    descripcion: 'Permite consultar el listado y detalle de las empresas registradas.' },
    { orden: 31, codigo: 'empresas.crear',            modulo: 'empresas',   recurso: 'empresa',    accion: 'crear',            nombre: 'Crear empresas',                  descripcion: 'Permite registrar nuevas empresas en el sistema.' },
    { orden: 32, codigo: 'empresas.editar',           modulo: 'empresas',   recurso: 'empresa',    accion: 'editar',           nombre: 'Editar empresa',                  descripcion: 'Permite modificar los datos de una empresa existente.' },
    { orden: 33, codigo: 'empresas.eliminar',         modulo: 'empresas',   recurso: 'empresa',    accion: 'eliminar',         nombre: 'Eliminar empresa',                descripcion: 'Permite eliminar o desactivar una empresa del sistema.' },
    { orden: 34, codigo: 'empresas.cambiar_logo',     modulo: 'empresas',   recurso: 'empresa',    accion: 'cambiar_logo',     nombre: 'Cambiar logo de empresa',         descripcion: 'Permite subir o cambiar el logo de una empresa.' },
    { orden: 35, codigo: 'empresas.cambiar_activa',   modulo: 'empresas',   recurso: 'empresa',    accion: 'cambiar_activa',   nombre: 'Activar / desactivar empresa',    descripcion: 'Permite cambiar el estado activo/inactivo de una empresa.' },
    // ── Áreas ──
    { orden: 40, codigo: 'areas.ver',                 modulo: 'areas',      recurso: 'area',       accion: 'ver',              nombre: 'Ver áreas',                       descripcion: 'Permite consultar las áreas registradas en la empresa.' },
    { orden: 41, codigo: 'areas.crear',               modulo: 'areas',      recurso: 'area',       accion: 'crear',            nombre: 'Crear áreas',                     descripcion: 'Permite registrar nuevas áreas dentro de la empresa.' },
    { orden: 42, codigo: 'areas.editar',              modulo: 'areas',      recurso: 'area',       accion: 'editar',           nombre: 'Editar áreas',                    descripcion: 'Permite modificar los datos de un área existente.' },
    { orden: 43, codigo: 'areas.eliminar',            modulo: 'areas',      recurso: 'area',       accion: 'eliminar',         nombre: 'Eliminar áreas',                  descripcion: 'Permite eliminar o desactivar áreas de la empresa.' },
    // ── Turnos ──
    { orden: 50, codigo: 'turnos.ver',                modulo: 'turnos',     recurso: 'turno',      accion: 'ver',              nombre: 'Ver turnos',                      descripcion: 'Permite consultar los turnos y cronogramas registrados.' },
    { orden: 51, codigo: 'turnos.crear',              modulo: 'turnos',     recurso: 'turno',      accion: 'crear',            nombre: 'Crear turnos',                    descripcion: 'Permite registrar nuevos turnos para empleados.' },
    { orden: 52, codigo: 'turnos.editar',             modulo: 'turnos',     recurso: 'turno',      accion: 'editar',           nombre: 'Editar turnos',                   descripcion: 'Permite modificar turnos existentes.' },
    { orden: 53, codigo: 'turnos.eliminar',           modulo: 'turnos',     recurso: 'turno',      accion: 'eliminar',         nombre: 'Eliminar turnos',                 descripcion: 'Permite eliminar turnos registrados en el sistema.' },
    { orden: 54, codigo: 'turnos.aprobar',            modulo: 'turnos',     recurso: 'turno',      accion: 'aprobar',          nombre: 'Aprobar turnos',                  descripcion: 'Permite aprobar o validar un cronograma de turnos.' },
    { orden: 55, codigo: 'turnos.exportar',           modulo: 'turnos',     recurso: 'turno',      accion: 'exportar',         nombre: 'Exportar turnos',                 descripcion: 'Permite exportar los cronogramas de turnos a Excel u otros formatos.' },
    // ── Nómina ──
    { orden: 60, codigo: 'nomina.ver',                modulo: 'nomina',     recurso: 'nomina',     accion: 'ver',              nombre: 'Ver nómina',                      descripcion: 'Permite consultar las liquidaciones y resúmenes de nómina.' },
    { orden: 61, codigo: 'nomina.calcular',           modulo: 'nomina',     recurso: 'nomina',     accion: 'calcular',         nombre: 'Calcular nómina',                 descripcion: 'Permite ejecutar el cálculo de nómina individual o grupal.' },
    { orden: 62, codigo: 'nomina.calcular_por_area',  modulo: 'nomina',     recurso: 'nomina',     accion: 'calcular_por_area',nombre: 'Calcular nómina por área',        descripcion: 'Permite calcular nómina filtrando por área específica.' },
    { orden: 63, codigo: 'nomina.ver_liquidaciones',  modulo: 'nomina',     recurso: 'liquidacion',accion: 'ver',              nombre: 'Ver liquidaciones',               descripcion: 'Permite consultar el detalle de las liquidaciones generadas.' },
    { orden: 64, codigo: 'nomina.aprobar',            modulo: 'nomina',     recurso: 'nomina',     accion: 'aprobar',          nombre: 'Aprobar liquidaciones',           descripcion: 'Permite aprobar liquidaciones de nómina para su pago.' },
    { orden: 65, codigo: 'nomina.anular',             modulo: 'nomina',     recurso: 'nomina',     accion: 'anular',           nombre: 'Anular liquidaciones',            descripcion: 'Permite anular o revertir liquidaciones ya generadas.' },
    { orden: 66, codigo: 'nomina.exportar',           modulo: 'nomina',     recurso: 'nomina',     accion: 'exportar',         nombre: 'Exportar nómina',                 descripcion: 'Permite exportar la nómina a PDF, Excel u otros formatos.' },
    // ── Parámetros de nómina ──
    { orden: 70, codigo: 'nomina.parametros.ver',     modulo: 'parametros', recurso: 'parametro',  accion: 'ver',              nombre: 'Ver parámetros de nómina',        descripcion: 'Permite consultar los parámetros y valores de cálculo de nómina.' },
    { orden: 71, codigo: 'nomina.parametros.crear',   modulo: 'parametros', recurso: 'parametro',  accion: 'crear',            nombre: 'Crear parámetros de nómina',      descripcion: 'Permite registrar nuevos parámetros de cálculo de nómina.' },
    { orden: 72, codigo: 'nomina.parametros.editar',  modulo: 'parametros', recurso: 'parametro',  accion: 'editar',           nombre: 'Editar parámetros de nómina',     descripcion: 'Permite modificar los valores de los parámetros de nómina.' },
    { orden: 73, codigo: 'nomina.parametros.desactivar', modulo: 'parametros', recurso: 'parametro', accion: 'desactivar',     nombre: 'Desactivar parámetros de nómina', descripcion: 'Permite desactivar parámetros de nómina que ya no aplican.' },
    // ── Conceptos de nómina ──
    { orden: 80, codigo: 'nomina.conceptos.ver',      modulo: 'parametros', recurso: 'concepto',   accion: 'ver',              nombre: 'Ver conceptos de nómina',         descripcion: 'Permite consultar los conceptos de devengados y deducciones.' },
    { orden: 81, codigo: 'nomina.conceptos.crear',    modulo: 'parametros', recurso: 'concepto',   accion: 'crear',            nombre: 'Crear conceptos de nómina',       descripcion: 'Permite registrar nuevos conceptos de nómina.' },
    { orden: 82, codigo: 'nomina.conceptos.editar',   modulo: 'parametros', recurso: 'concepto',   accion: 'editar',           nombre: 'Editar conceptos de nómina',      descripcion: 'Permite modificar conceptos de nómina existentes.' },
    { orden: 83, codigo: 'nomina.conceptos.desactivar', modulo: 'parametros', recurso: 'concepto', accion: 'desactivar',       nombre: 'Desactivar conceptos de nómina',  descripcion: 'Permite desactivar conceptos de nómina sin eliminarlos.' },
    // ── Reportes ──
    { orden: 90, codigo: 'reportes.ver',              modulo: 'reportes',   recurso: 'reporte',    accion: 'ver',              nombre: 'Ver reportes',                    descripcion: 'Permite consultar los reportes disponibles en el sistema.' },
    { orden: 91, codigo: 'reportes.exportar',         modulo: 'reportes',   recurso: 'reporte',    accion: 'exportar',         nombre: 'Exportar reportes',               descripcion: 'Permite descargar reportes en formato PDF o Excel.' },
    // ── Auditoría ──
    { orden: 99, codigo: 'auditoria.ver',             modulo: 'reportes',   recurso: 'auditoria',  accion: 'ver',              nombre: 'Ver auditoría',                   descripcion: 'Permite consultar el registro de acciones y eventos del sistema.' },
    // ── Transporte ──
    { orden:110, codigo: 'transporte.ver',                          modulo: 'transporte', recurso: 'transporte', accion: 'ver',              nombre: 'Ver programación de transporte',       descripcion: 'Permite consultar las programaciones de transporte de la empresa.' },
    { orden:111, codigo: 'transporte.crear',                        modulo: 'transporte', recurso: 'transporte', accion: 'crear',            nombre: 'Crear programación de transporte',     descripcion: 'Permite crear nuevas programaciones de transporte.' },
    { orden:112, codigo: 'transporte.editar',                       modulo: 'transporte', recurso: 'transporte', accion: 'editar',           nombre: 'Editar programación de transporte',    descripcion: 'Permite editar programaciones de transporte existentes.' },
    { orden:113, codigo: 'transporte.eliminar',                     modulo: 'transporte', recurso: 'transporte', accion: 'eliminar',         nombre: 'Eliminar programación de transporte',  descripcion: 'Permite eliminar programaciones en borrador.' },
    { orden:114, codigo: 'transporte.aprobar',                      modulo: 'transporte', recurso: 'transporte', accion: 'aprobar',          nombre: 'Aprobar programación de transporte',   descripcion: 'Permite aprobar y cambiar estado de las programaciones.' },
    { orden:115, codigo: 'transporte.exportar',                     modulo: 'transporte', recurso: 'transporte', accion: 'exportar',         nombre: 'Exportar programación de transporte',  descripcion: 'Permite exportar o generar formato de transporte.' },
    { orden:116, codigo: 'transporte.configurar_rutas',             modulo: 'transporte', recurso: 'transporte', accion: 'configurar_rutas', nombre: 'Configurar rutas y catálogos',          descripcion: 'Permite gestionar conductores, vehículos, ubicaciones y config de turnos.' },
    { orden:117, codigo: 'transporte.importar',                     modulo: 'transporte', recurso: 'transporte', accion: 'importar',         nombre: 'Importar listado desde WhatsApp',       descripcion: 'Permite parsear e importar listados de personal desde texto libre.' },
    { orden:118, codigo: 'transporte.registrar_novedad',            modulo: 'transporte', recurso: 'transporte', accion: 'registrar_novedad',nombre: 'Registrar novedades operativas',        descripcion: 'Permite registrar novedades en las programaciones de transporte.' },
    // ── IA ──
    { orden:120, codigo: 'ia.consultar',            modulo: 'ia', recurso: 'ia', accion: 'consultar',            nombre: 'Consultar Asistente IA',           descripcion: 'Permite utilizar el asistente conversacional y consultar indicadores autorizados.' },
    { orden:121, codigo: 'ia.validar_programacion', modulo: 'ia', recurso: 'ia', accion: 'validar_programacion', nombre: 'Validar programación con IA',      descripcion: 'Permite ejecutar validaciones determinísticas sobre una programación.' },
    { orden:122, codigo: 'ia.generar_propuesta',    modulo: 'ia', recurso: 'ia', accion: 'generar_propuesta',    nombre: 'Generar propuesta IA',             descripcion: 'Permite crear escenarios y propuestas de programación en estado borrador.' },
    { orden:123, codigo: 'ia.simular_cambios',      modulo: 'ia', recurso: 'ia', accion: 'simular_cambios',      nombre: 'Simular cambios de programación',  descripcion: 'Permite simular reemplazos o cambios sin persistirlos en el sistema.' },
    { orden:124, codigo: 'ia.ver_costos',           modulo: 'ia', recurso: 'ia', accion: 'ver_costos',           nombre: 'Ver impacto económico IA',         descripcion: 'Permite consultar el impacto económico estimado de una propuesta.' },
    { orden:125, codigo: 'ia.aprobar_propuesta',    modulo: 'ia', recurso: 'ia', accion: 'aprobar_propuesta',    nombre: 'Aprobar propuesta IA',             descripcion: 'Permite aprobar y aplicar una propuesta generada por el asistente.' },
    { orden:126, codigo: 'ia.ver_auditoria',        modulo: 'ia', recurso: 'ia', accion: 'ver_auditoria',        nombre: 'Ver auditoría IA',                 descripcion: 'Permite consultar el registro de ejecuciones, consumo y decisiones del módulo IA.' },
    { orden:127, codigo: 'ia.configurar',           modulo: 'ia', recurso: 'ia', accion: 'configurar',           nombre: 'Configurar módulo IA',             descripcion: 'Permite administrar la configuración del módulo IA de la empresa.' },
  ];

  const permisosMap = {};
  for (const p of PERMISOS_DEF) {
    const per = await prisma.permiso.upsert({
      where:  { codigo: p.codigo },
      update: { nombre: p.nombre, descripcion: p.descripcion, modulo: p.modulo, recurso: p.recurso, accion: p.accion, orden: p.orden },
      create: { ...p }
    });
    permisosMap[p.codigo] = per;
  }
  console.log('✅ Permisos:', Object.keys(permisosMap).length, 'registrados');

  // ── 3. Roles base ────────────────────────────────────────────────────────────
  const TODOS_PERMISOS = Object.keys(permisosMap);

  const ROLES_DEF = [
    {
      codigo: 'ADMIN_EMPRESA',
      nombre: 'Administrador de Empresa',
      descripcion: 'Acceso completo dentro de la empresa asignada. Puede gestionar usuarios, áreas, turnos, nómina y reportes.',
      tipo: 'empresa',
      permisos: TODOS_PERMISOS.filter(c => !c.startsWith('empresas.crear') && !c.startsWith('empresas.eliminar'))
    },
    {
      codigo: 'GESTOR_NOMINA',
      nombre: 'Gestor de Nómina',
      descripcion: 'Gestión completa del módulo de nómina: calcular, aprobar, anular y exportar liquidaciones.',
      tipo: 'empresa',
      permisos: [
        'nomina.ver', 'nomina.calcular', 'nomina.calcular_por_area',
        'nomina.ver_liquidaciones', 'nomina.aprobar', 'nomina.anular', 'nomina.exportar',
        'nomina.parametros.ver', 'nomina.parametros.editar',
        'nomina.conceptos.ver', 'nomina.conceptos.editar',
        'reportes.ver', 'reportes.exportar'
      ]
    },
    {
      codigo: 'GESTOR_TURNOS',
      nombre: 'Gestor de Turnos',
      descripcion: 'Gestión completa del módulo de turnos: crear, editar, aprobar y exportar cronogramas.',
      tipo: 'empresa',
      permisos: [
        'turnos.ver', 'turnos.crear', 'turnos.editar', 'turnos.eliminar',
        'turnos.aprobar', 'turnos.exportar',
        'areas.ver', 'reportes.ver'
      ]
    },
    {
      codigo: 'CONTADOR',
      nombre: 'Contador',
      descripcion: 'Acceso de consulta y aprobación en módulos de nómina y reportes. No puede calcular ni anular.',
      tipo: 'empresa',
      permisos: [
        'nomina.ver', 'nomina.ver_liquidaciones', 'nomina.aprobar',
        'nomina.parametros.ver', 'nomina.conceptos.ver',
        'reportes.ver', 'reportes.exportar',
        'auditoria.ver'
      ]
    },
    {
      codigo: 'CONSULTA',
      nombre: 'Usuario de Consulta',
      descripcion: 'Solo lectura en los módulos asignados. No puede crear ni modificar información.',
      tipo: 'empresa',
      permisos: [
        'turnos.ver', 'nomina.ver', 'nomina.ver_liquidaciones',
        'reportes.ver', 'areas.ver', 'usuarios.ver'
      ]
    },
    {
      codigo: 'USUARIO',
      nombre: 'Usuario Básico',
      descripcion: 'Acceso básico limitado a la consulta de su propia información.',
      tipo: 'empresa',
      permisos: ['turnos.ver', 'areas.ver']
    },
    {
      codigo: 'AUXILIAR_TALENTO_HUMANO',
      nombre: 'Auxiliar de Talento Humano',
      descripcion: 'Gestión operativa de programación de transporte y alimentación del personal.',
      tipo: 'empresa',
      permisos: [
        'turnos.ver', 'areas.ver',
        'transporte.ver', 'transporte.crear', 'transporte.editar',
        'transporte.aprobar', 'transporte.exportar', 'transporte.importar',
        'transporte.registrar_novedad', 'transporte.configurar_rutas'
      ]
    },
    {
      codigo: 'COORDINADOR_AREA',
      nombre: 'Coordinador de Área',
      descripcion: 'Puede registrar personal programado en su área y consultar su programación de transporte.',
      tipo: 'empresa',
      permisos: [
        'turnos.ver', 'turnos.crear', 'areas.ver',
        'transporte.ver', 'transporte.importar'
      ]
    },
  ];

  const rolesMap = {};
  for (const r of ROLES_DEF) {
    const rol = await prisma.rol.upsert({
      where:  { codigo: r.codigo },
      update: { nombre: r.nombre, descripcion: r.descripcion },
      create: { codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion, tipo: r.tipo }
    });
    rolesMap[r.codigo] = rol;

    // Reemplazar permisos del rol (idempotente)
    await prisma.rolPermiso.deleteMany({ where: { rolId: rol.id } });
    const permisosValidos = r.permisos.filter(c => permisosMap[c]);
    if (permisosValidos.length > 0) {
      await prisma.rolPermiso.createMany({
        data: permisosValidos.map(c => ({ rolId: rol.id, permisoId: permisosMap[c].id })),
        skipDuplicates: true
      });
    }
  }
  console.log('✅ Roles:', Object.keys(rolesMap).join(', '));

  const moduloTurnos = modulosMap['turnos'];
  const moduloNomina = modulosMap['nomina'];
  console.log('✅ Módulos base listos:', moduloTurnos.codigo, moduloNomina.codigo);

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

  // 2b. Sociedad Portuaria Mardique (empresa demo con módulo transporte)
  const moduloTransporte         = modulosMap['transporte'];
  const moduloProgOperativa      = modulosMap['programacion_operativa'];

  const spm = await prisma.empresa.upsert({
    where:  { nit: '800111222-3' },
    update: {},
    create: {
      nombre:      'Sociedad Portuaria Mardique',
      nit:         '800111222-3',
      razonSocial: 'Sociedad Portuaria Mardique S.A.',
      estado:      'activa',
      modulos: {
        create: [
          { moduloId: moduloTurnos.id,        habilitado: true },
          { moduloId: moduloNomina.id,         habilitado: true },
          { moduloId: moduloTransporte.id,     habilitado: true },
          { moduloId: moduloProgOperativa.id,  habilitado: true }
        ]
      }
    }
  });
  console.log('✅ Sociedad Portuaria Mardique:', spm.id);

  // Config turnos SPM (parametrizable — 3 turnos estándar)
  const SPM_TURNOS = [
    {
      codigo: 'TURNO_A', nombreTurno: 'Turno A Normal',
      horaInicio: '07:00', horaFin: '16:00',
      generaMerienda: false, generaCena: false,
      requiereResponsable: false, esExtendido: false, esTurnoNocturno: false
    },
    {
      codigo: 'TURNO_A_EXT', nombreTurno: 'Turno A Extendido',
      horaInicio: '07:00', horaFin: '19:00',
      horaExtensionInicio: '07:00', horaExtensionFin: '19:00',
      generaMerienda: true, generaCena: false,
      requiereResponsable: true, esExtendido: true, esTurnoNocturno: false
    },
    {
      codigo: 'TURNO_B', nombreTurno: 'Turno B Nocturno',
      horaInicio: '19:00', horaFin: '07:00',
      generaMerienda: false, generaCena: true,
      requiereResponsable: true, esExtendido: false, esTurnoNocturno: true
    }
  ];
  for (const cfg of SPM_TURNOS) {
    await prisma.configuracionTurnoOp.upsert({
      where:  { empresaId_codigo: { empresaId: spm.id, codigo: cfg.codigo } },
      update: {}, // No sobreescribir configs existentes — el usuario puede haberlas personalizado
      create: { empresaId: spm.id, ...cfg }
    });
  }
  console.log('✅ Config turnos SPM: TURNO_A, TURNO_A_EXT, TURNO_B');

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
