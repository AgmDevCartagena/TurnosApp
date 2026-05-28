'use strict';

/**
 * Script de migración de datos MongoDB → PostgreSQL
 * Ejecutar SOLO después de que prisma migrate deploy haya corrido.
 * Orden: empresas → modulos → usuarios → areas → empleados → turnos → parámetros → conceptos → novedades → liquidaciones
 *
 * Uso: node scripts/migrarMongoAPostgres.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');

// Modelos MongoDB
const EmpresaMongo    = require('../models/Empresa');
const UsuarioMongo    = require('../models/Usuario');
const AreaMongo       = require('../models/Area');
const EmpleadoMongo   = require('../models/Empleado');
const TurnoMongo      = require('../models/Turno');
const ParamMongo      = require('../models/ParametroNomina');
const ConceptoMongo   = require('../models/ConceptoNomina');
const NovedadMongo    = require('../models/NovedadNomina');
const LiqMongo        = require('../models/LiquidacionNomina');

const prisma = new PrismaClient();

// Mapas de IDs MongoDB → UUID PostgreSQL
const mapaEmpresas  = new Map();
const mapaUsuarios  = new Map();
const mapaAreas     = new Map();
const mapaEmpleados = new Map();
const mapaConceptos = new Map();

async function conectarMongo() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/turnos_app';
  await mongoose.connect(uri);
  console.log('✅ MongoDB conectado');
}

async function migrarEmpresas() {
  console.log('\n📦 Migrando empresas...');
  const empresas = await EmpresaMongo.find({});
  let ok = 0;

  for (const e of empresas) {
    const creada = await prisma.empresa.upsert({
      where: { nit: e.nit || `MIGRADO_${e._id}` },
      update: {},
      create: {
        nombre:      e.nombre,
        nit:         e.nit || `MIGRADO_${e._id}`,
        razonSocial: e.razonSocial || null,
        dominio:     e.dominio || null,
        colorTema:   e.colorTema || '#667eea',
        logo:        e.logo || null,
        estado:      e.estado === 'activa' ? 'activa' : 'inactiva',
        createdAt:   e.createdAt || new Date(),
        updatedAt:   e.updatedAt || new Date()
      }
    });
    mapaEmpresas.set(e._id.toString(), creada.id);
    ok++;
  }
  console.log(`   ✅ ${ok} empresas migradas`);
}

async function migrarModulosDeEmpresas() {
  console.log('\n📦 Migrando módulos por empresa...');
  const [moduloTurnos, moduloNomina] = await Promise.all([
    prisma.modulo.findUnique({ where: { codigo: 'turnos' } }),
    prisma.modulo.findUnique({ where: { codigo: 'nomina' } })
  ]);

  const empresas = await EmpresaMongo.find({});
  for (const e of empresas) {
    const pgId = mapaEmpresas.get(e._id.toString());
    if (!pgId) continue;
    const habilitados = e.modulosHabilitados || [];
    for (const cod of habilitados) {
      const modulo = cod === 'turnos' ? moduloTurnos : moduloNomina;
      if (!modulo) continue;
      await prisma.empresaModulo.upsert({
        where: { empresaId_moduloId: { empresaId: pgId, moduloId: modulo.id } },
        update: {},
        create: { empresaId: pgId, moduloId: modulo.id, habilitado: true }
      });
    }
  }
  console.log('   ✅ Módulos de empresa migrados');
}

async function migrarUsuarios() {
  console.log('\n📦 Migrando usuarios...');
  const usuarios = await UsuarioMongo.find({});
  let ok = 0, omitidos = 0;

  for (const u of usuarios) {
    const empresaPgId = u.empresaId ? mapaEmpresas.get(u.empresaId.toString()) : null;
    try {
      const creado = await prisma.usuario.upsert({
        where: { username: u.username },
        // Sincronizar passwordHash desde MongoDB (MongoDB es fuente de verdad durante migración)
        update: { passwordHash: u.password, nombre: u.nombre, activo: u.activo !== false },
        create: {
          username:     u.username,
          passwordHash: u.password, // ya está hasheado en bcrypt
          nombre:       u.nombre,
          empresaId:    empresaPgId || null,
          rol:          u.rol || 'usuario',
          activo:       u.activo !== false,
          ultimoAcceso: u.ultimoAcceso || null,
          createdAt:    u.createdAt || new Date(),
          updatedAt:    u.updatedAt || new Date()
        }
      });
      mapaUsuarios.set(u._id.toString(), creado.id);

      // Módulos permitidos
      for (const mod of (u.modulosPermitidos || [])) {
        await prisma.usuarioModulo.upsert({
          where: { usuarioId_modulo: { usuarioId: creado.id, modulo: mod } },
          update: {},
          create: { usuarioId: creado.id, modulo: mod }
        }).catch(() => {});
      }
      ok++;
    } catch (err) {
      console.warn(`   ⚠️ Usuario ${u.username} omitido: ${err.message}`);
      omitidos++;
    }
  }
  console.log(`   ✅ ${ok} usuarios migrados, ${omitidos} omitidos`);
}

async function migrarAreas() {
  console.log('\n📦 Migrando áreas...');
  const areas = await AreaMongo.find({});
  let ok = 0, omitidas = 0;

  for (const a of areas) {
    const empresaPgId = mapaEmpresas.get(a.empresaId.toString());
    if (!empresaPgId) { omitidas++; continue; }
    try {
      const creada = await prisma.area.upsert({
        where: { empresaId_nombre: { empresaId: empresaPgId, nombre: a.nombre } },
        update: {},
        create: {
          empresaId:   empresaPgId,
          nombre:      a.nombre,
          codigo:      a.codigo || null,
          descripcion: a.descripcion || null,
          estado:      a.estado === 'activa' ? 'activo' : 'inactivo',
          createdAt:   a.createdAt || new Date(),
          updatedAt:   a.updatedAt || new Date()
        }
      });
      mapaAreas.set(a._id.toString(), creada.id);
      ok++;
    } catch (err) {
      console.warn(`   ⚠️ Área ${a.nombre} omitida: ${err.message}`);
      omitidas++;
    }
  }

  // Migrar areasPermitidas de usuarios (strings → tabla usuario_areas)
  const usuarios = await UsuarioMongo.find({ areasPermitidas: { $exists: true, $ne: [] } });
  for (const u of usuarios) {
    const pgUsuarioId = mapaUsuarios.get(u._id.toString());
    if (!pgUsuarioId) continue;
    const empresaPgId = u.empresaId ? mapaEmpresas.get(u.empresaId.toString()) : null;
    if (!empresaPgId) continue;
    for (const nombreArea of (u.areasPermitidas || [])) {
      const areaPg = await prisma.area.findUnique({
        where: { empresaId_nombre: { empresaId: empresaPgId, nombre: nombreArea } }
      });
      if (!areaPg) continue;
      await prisma.usuarioArea.upsert({
        where: { usuarioId_areaId: { usuarioId: pgUsuarioId, areaId: areaPg.id } },
        update: {},
        create: { usuarioId: pgUsuarioId, areaId: areaPg.id }
      }).catch(() => {});
    }
  }

  console.log(`   ✅ ${ok} áreas migradas, ${omitidas} omitidas. Permisos usuario-área migrados.`);
}

async function migrarEmpleados() {
  console.log('\n📦 Migrando empleados...');
  const empleados = await EmpleadoMongo.find({});
  let ok = 0, omitidos = 0;

  for (const emp of empleados) {
    const empresaPgId = emp.empresaId ? mapaEmpresas.get(emp.empresaId.toString()) : null;
    if (!empresaPgId) { omitidos++; continue; }
    // Resolver areaId: primero por ObjectId mapeado, luego por nombre del campo legacy
    let areaPgId = emp.areaId ? mapaAreas.get(emp.areaId.toString()) : null;
    if (!areaPgId && emp.area && empresaPgId) {
      const areaPg = await prisma.area.findFirst({
        where: { empresaId: empresaPgId, nombre: emp.area.toUpperCase() }
      });
      areaPgId = areaPg?.id || null;
    }
    try {
      const creado = await prisma.empleado.upsert({
        where: { documento_empresaId: { documento: emp.documento, empresaId: empresaPgId } },
        update: { areaId: areaPgId || null },
        create: {
          empresaId:       empresaPgId,
          areaId:          areaPgId || null,
          documento:       emp.documento,
          nombre:          emp.nombre,
          apellidos:       emp.apellidos || null,
          cargo:           emp.cargo || null,
          salario:         emp.salario || 0,
          tipoContrato:    emp.tipoContrato || 'indefinido',
          estado:          emp.estado === 'activo' ? 'activo' : 'inactivo',
          fechaIngreso:    emp.fechaIngreso || null,
          fechaRetiro:     emp.fechaRetiro || null,
          fechaCumpleanos: emp.fechaCumpleanos || null,
          createdAt:       emp.createdAt || new Date(),
          updatedAt:       emp.updatedAt || new Date()
        }
      });
      mapaEmpleados.set(emp._id.toString(), creado.id);
      ok++;
    } catch (err) {
      console.warn(`   ⚠️ Empleado ${emp.documento} omitido: ${err.message}`);
      omitidos++;
    }
  }
  console.log(`   ✅ ${ok} empleados migrados, ${omitidos} omitidos`);
}

async function migrarTurnos() {
  console.log('\n📦 Migrando turnos (registros sin cronograma embebido)...');
  const turnos = await TurnoMongo.find({});
  let ok = 0, omitidos = 0;

  for (const t of turnos) {
    const empresaPgId = t.empresaId ? mapaEmpresas.get(t.empresaId.toString()) : null;
    const empleadoPgId = mapaEmpleados.get(t.empleadoId.toString());
    if (!empresaPgId || !empleadoPgId) { omitidos++; continue; }

    for (const ht of (t.historialTurnos || [])) {
      try {
        let areaPgId = null;
        if (empresaPgId && ht.area) {
          const areaPg = await prisma.area.findUnique({
            where: { empresaId_nombre: { empresaId: empresaPgId, nombre: ht.area } }
          });
          areaPgId = areaPg?.id || null;
        }

        await prisma.turno.create({
          data: {
            empresaId:         empresaPgId,
            empleadoId:        empleadoPgId,
            areaId:            areaPgId,
            turno:             ht.turno || 'SIN_TIPO',
            tipoTurno:         ht.tipoTurno || null,
            tablaDescanso:     ht.tablaDescanso || null,
            fechaInicio:       new Date(ht.fechaInicio),
            fechaFin:          new Date(ht.fechaFin),
            horaInicio:        ht.horaInicio || null,
            horaFin:           ht.horaFin || null,
            esTurnoPartido:    ht.esTurnoPartido || false,
            horaInicio2:       ht.horaInicio2 || null,
            horaFin2:          ht.horaFin2 || null,
            activo:            ht.activo !== false,
            cronogramaMongoId: t._id.toString()
          }
        });
        ok++;
      } catch (err) {
        omitidos++;
      }
    }
  }
  console.log(`   ✅ ${ok} turnos migrados, ${omitidos} omitidos`);
}

async function migrarParametros() {
  console.log('\n📦 Migrando parámetros de nómina...');
  const params = await ParamMongo.find({});
  let ok = 0, omitidos = 0;

  for (const p of params) {
    const empresaPgId = mapaEmpresas.get(p.empresaId.toString());
    if (!empresaPgId) { omitidos++; continue; }
    try {
      await prisma.parametroNomina.upsert({
        where: { empresaId_codigo_vigenciaDesde: { empresaId: empresaPgId, codigo: p.codigo, vigenciaDesde: new Date(p.vigenciaDesde) } },
        update: {},
        create: {
          empresaId:     empresaPgId,
          codigo:        p.codigo,
          nombre:        p.nombre,
          descripcion:   p.descripcion || null,
          valor:         p.valor,
          tipoValor:     p.tipoValor || 'valor_fijo',
          vigenciaDesde: new Date(p.vigenciaDesde),
          vigenciaHasta: p.vigenciaHasta ? new Date(p.vigenciaHasta) : null,
          estado:        p.estado === 'activo' ? 'activo' : 'inactivo',
          createdAt:     p.createdAt || new Date(),
          updatedAt:     p.updatedAt || new Date()
        }
      });
      ok++;
    } catch (err) {
      console.warn(`   ⚠️ Parámetro ${p.codigo} omitido: ${err.message}`);
      omitidos++;
    }
  }
  console.log(`   ✅ ${ok} parámetros migrados, ${omitidos} omitidos`);
}

async function migrarConceptos() {
  console.log('\n📦 Migrando conceptos de nómina...');
  const conceptos = await ConceptoMongo.find({});
  let ok = 0, omitidos = 0;

  for (const c of conceptos) {
    const empresaPgId = mapaEmpresas.get(c.empresaId.toString());
    if (!empresaPgId) { omitidos++; continue; }
    try {
      const creado = await prisma.conceptoNomina.upsert({
        where: { empresaId_codigo: { empresaId: empresaPgId, codigo: c.codigo } },
        update: {},
        create: {
          empresaId:          empresaPgId,
          codigo:             c.codigo,
          nombre:             c.nombre,
          descripcion:        c.descripcion || null,
          tipo:               c.tipo,
          referenciaParametro: c.referenciaParametro || null,
          base:               c.base || 'salarioBase',
          formula:            c.formula || null,
          afectaTotal:        c.afectaTotal !== false,
          orden:              c.orden || 0,
          vigenciaDesde:      new Date(c.vigenciaDesde),
          vigenciaHasta:      c.vigenciaHasta ? new Date(c.vigenciaHasta) : null,
          estado:             c.estado === 'activo' ? 'activo' : 'inactivo',
          createdAt:          c.createdAt || new Date(),
          updatedAt:          c.updatedAt || new Date()
        }
      });
      mapaConceptos.set(c._id.toString(), creado.id);
      ok++;
    } catch (err) {
      console.warn(`   ⚠️ Concepto ${c.codigo} omitido: ${err.message}`);
      omitidos++;
    }
  }
  console.log(`   ✅ ${ok} conceptos migrados, ${omitidos} omitidos`);
}

async function migrarNovedades() {
  console.log('\n📦 Migrando novedades de nómina...');
  const novedades = await NovedadMongo.find({});
  let ok = 0, omitidos = 0;

  for (const n of novedades) {
    const empresaPgId  = mapaEmpresas.get(n.empresaId.toString());
    const empleadoPgId = mapaEmpleados.get(n.empleadoId.toString());
    if (!empresaPgId || !empleadoPgId) { omitidos++; continue; }
    const registradoPorPgId = n.registradoPor ? mapaUsuarios.get(n.registradoPor.toString()) : null;
    try {
      await prisma.novedadNomina.create({
        data: {
          empresaId:       empresaPgId,
          empleadoId:      empleadoPgId,
          tipo:            n.tipo,
          descripcion:     n.descripcion || null,
          fechaInicio:     new Date(n.fechaInicio),
          fechaFin:        new Date(n.fechaFin),
          cantidad:        n.cantidad || 0,
          valor:           n.valor || 0,
          observacion:     n.observacion || null,
          estado:          n.estado || 'activa',
          registradoPorId: registradoPorPgId || null,
          createdAt:       n.createdAt || new Date(),
          updatedAt:       n.updatedAt || new Date()
        }
      });
      ok++;
    } catch (err) {
      omitidos++;
    }
  }
  console.log(`   ✅ ${ok} novedades migradas, ${omitidos} omitidas`);
}

async function migrarLiquidaciones() {
  console.log('\n📦 Migrando liquidaciones de nómina...');
  const liqs = await LiqMongo.find({});
  let ok = 0, omitidos = 0;

  for (const l of liqs) {
    const empresaPgId   = mapaEmpresas.get(l.empresaId.toString());
    const empleadoPgId  = mapaEmpleados.get(l.empleadoId.toString());
    if (!empresaPgId || !empleadoPgId) { omitidos++; continue; }
    const calculadoPgId = l.calculadoPor ? mapaUsuarios.get(l.calculadoPor.toString()) : null;
    const aprobadoPgId  = l.aprobadoPor  ? mapaUsuarios.get(l.aprobadoPor.toString())  : null;
    try {
      const liqPg = await prisma.liquidacionNomina.create({
        data: {
          empresaId:       empresaPgId,
          empleadoId:      empleadoPgId,
          periodoInicio:   new Date(l.periodoInicio),
          periodoFin:      new Date(l.periodoFin),
          salarioBase:     l.salarioBase,
          diasTrabajados:  l.diasTrabajados || 0,
          totalDevengado:  l.totalDevengado || 0,
          totalDeducciones: l.totalDeducciones || 0,
          netoPagar:       l.netoPagar || 0,
          estado:          l.estado || 'borrador',
          calculadoPorId:  calculadoPgId || null,
          aprobadoPorId:   aprobadoPgId  || null,
          fechaAprobacion: l.fechaAprobacion || null,
          observaciones:   l.observaciones || null,
          createdAt:       l.createdAt || new Date(),
          updatedAt:       l.updatedAt || new Date()
        }
      });

      // Detalles
      for (const d of (l.detalles || [])) {
        const conceptoPgId = d.conceptoId ? mapaConceptos.get(d.conceptoId.toString()) : null;
        await prisma.detalleLiquidacion.create({
          data: {
            liquidacionId:  liqPg.id,
            conceptoId:     conceptoPgId || null,
            codigoConcepto: d.codigoConcepto,
            nombreConcepto: d.nombreConcepto,
            tipo:           d.tipo,
            cantidad:       d.cantidad || 0,
            base:           d.base || 0,
            porcentaje:     d.porcentaje || 0,
            valor:          d.valor || 0,
            observacion:    d.observacion || null
          }
        });
      }
      ok++;
    } catch (err) {
      console.warn(`   ⚠️ Liquidación omitida: ${err.message}`);
      omitidos++;
    }
  }
  console.log(`   ✅ ${ok} liquidaciones migradas, ${omitidos} omitidas`);
}

async function validarConteos() {
  console.log('\n📊 Validación de conteos:');
  const [empMongo, usrMongo, areaMongo, emplMongo] = await Promise.all([
    EmpresaMongo.countDocuments(),
    UsuarioMongo.countDocuments(),
    AreaMongo.countDocuments(),
    EmpleadoMongo.countDocuments()
  ]);
  const [empPg, usrPg, areaPg, emplPg] = await Promise.all([
    prisma.empresa.count(),
    prisma.usuario.count(),
    prisma.area.count(),
    prisma.empleado.count()
  ]);
  console.log(`   Empresas  — MongoDB: ${empMongo}  | PostgreSQL: ${empPg}  ${empMongo === empPg ? '✅' : '⚠️'}`);
  console.log(`   Usuarios  — MongoDB: ${usrMongo}  | PostgreSQL: ${usrPg}  ${usrMongo === usrPg ? '✅' : '⚠️'}`);
  console.log(`   Áreas     — MongoDB: ${areaMongo} | PostgreSQL: ${areaPg} ${areaMongo === areaPg ? '✅' : '⚠️'}`);
  console.log(`   Empleados — MongoDB: ${emplMongo} | PostgreSQL: ${emplPg} ${emplMongo === emplPg ? '✅' : '⚠️'}`);
}

async function main() {
  console.log('🚀 Migración MongoDB → PostgreSQL\n');
  await conectarMongo();
  await migrarEmpresas();
  await migrarModulosDeEmpresas();
  await migrarUsuarios();
  await migrarAreas();
  await migrarEmpleados();
  await migrarTurnos();
  await migrarParametros();
  await migrarConceptos();
  await migrarNovedades();
  await migrarLiquidaciones();
  await validarConteos();
  console.log('\n✅ Migración completada.');
}

main()
  .catch(err => { console.error('❌ Error en migración:', err); process.exit(1); })
  .finally(async () => {
    await mongoose.disconnect();
    await prisma.$disconnect();
  });
