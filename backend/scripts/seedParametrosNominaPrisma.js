/**
 * seedParametrosNominaPrisma.js
 * Crea parámetros y conceptos de nómina para todas las empresas activas en PostgreSQL.
 * Idempotente: usa upsert por (empresaId, codigo, vigenciaDesde).
 * Ejecutar: node scripts/seedParametrosNominaPrisma.js
 */

'use strict';

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VIGENCIA_2025 = new Date('2025-01-01');
const VIGENCIA_2026 = new Date('2026-01-01');

// ── Parámetros legales Colombia 2025 ──────────────────────────────────────────
const PARAMETROS_2025 = [
  { codigo: 'SMLV',                        nombre: 'Salario Mínimo Legal Vigente 2025',        valor: 1750905,  tipoValor: 'valor_fijo', descripcion: 'Decreto 2473 de 2024' },
  { codigo: 'AUX_TRANSPORTE',              nombre: 'Auxilio de Transporte Mensual 2025',        valor: 249095,   tipoValor: 'valor_fijo', descripcion: 'Decreto 2474 de 2024' },
  { codigo: 'PORCENTAJE_SALUD_EMPLEADO',   nombre: 'Porcentaje Salud a cargo del Empleado',    valor: 0.04,     tipoValor: 'porcentaje', descripcion: 'CST Art. 204 – 4%' },
  { codigo: 'PORCENTAJE_PENSION_EMPLEADO', nombre: 'Porcentaje Pensión a cargo del Empleado',  valor: 0.04,     tipoValor: 'porcentaje', descripcion: 'Ley 100/93 Art. 20 – 4%' },
  { codigo: 'PORCENTAJE_SALUD_EMPRESA',    nombre: 'Porcentaje Salud a cargo de la Empresa',   valor: 0.085,    tipoValor: 'porcentaje', descripcion: 'CST – 8.5%' },
  { codigo: 'PORCENTAJE_PENSION_EMPRESA',  nombre: 'Porcentaje Pensión a cargo de la Empresa', valor: 0.12,     tipoValor: 'porcentaje', descripcion: 'Ley 100/93 – 12%' },
  { codigo: 'RECARGO_NOCTURNO',            nombre: 'Recargo Nocturno (19h–06h)',               valor: 0.35,     tipoValor: 'porcentaje', descripcion: 'CST Art. 168 – 35%' },
  { codigo: 'RECARGO_DOMINICAL_FESTIVO',   nombre: 'Recargo Dominical/Festivo Ley 2466/2025',  valor: 0.80,     tipoValor: 'porcentaje', descripcion: 'Ley 2466/2025 – 80%' },
  { codigo: 'HE_DIURNA',                   nombre: 'Hora Extra Diurna',                        valor: 0.25,     tipoValor: 'porcentaje', descripcion: 'CST Art. 168 – 25%' },
  { codigo: 'HE_NOCTURNA',                 nombre: 'Hora Extra Nocturna',                      valor: 0.75,     tipoValor: 'porcentaje', descripcion: 'CST Art. 168 – 75%' },
  { codigo: 'HE_DOM_FESTIVA_DIURNA',       nombre: 'Hora Extra Dominical/Festiva Diurna',      valor: 0.80,     tipoValor: 'porcentaje', descripcion: 'CST + Ley 2466/2025' },
  { codigo: 'HE_DOM_FESTIVA_NOCTURNA',     nombre: 'Hora Extra Dominical/Festiva Nocturna',    valor: 0.80,     tipoValor: 'porcentaje', descripcion: 'CST + Ley 2466/2025' },
  { codigo: 'HORAS_MES',                   nombre: 'Horas Laborales Estándar Mensuales',       valor: 220,      tipoValor: 'valor_fijo', descripcion: 'Estándar Colombia: 220h/mes' },
  { codigo: 'DIAS_MES_CALCULO',            nombre: 'Días Base de Cálculo Mensual',             valor: 30,       tipoValor: 'valor_fijo', descripcion: 'Base 30 días para prorrateo' }
];

// ── Parámetros legales Colombia 2026 ──────────────────────────────────────────
const PARAMETROS_2026 = [
  { codigo: 'SMLV',                      nombre: 'Salario Mínimo Legal Vigente 2026',        valor: 1850000, tipoValor: 'valor_fijo', descripcion: 'Pendiente decreto oficial – actualizar' },
  { codigo: 'AUX_TRANSPORTE',            nombre: 'Auxilio de Transporte Mensual 2026',       valor: 263000,  tipoValor: 'valor_fijo', descripcion: 'Pendiente decreto oficial – actualizar' },
  { codigo: 'RECARGO_DOMINICAL_FESTIVO', nombre: 'Recargo Dominical/Festivo Ley 2466/2026',  valor: 0.90,    tipoValor: 'porcentaje', descripcion: 'Ley 2466/2025 – 90% desde 2026' }
];

// ── Conceptos estándar ────────────────────────────────────────────────────────
const CONCEPTOS_BASE = [
  { codigo: 'SALARIO_BASE',           nombre: 'Salario Base Devengado',          tipo: 'devengado',  afectaTotal: true, orden: 1,  base: 'salarioBase',  referenciaParametro: null },
  { codigo: 'AUX_TRANSPORTE',         nombre: 'Auxilio de Transporte',           tipo: 'devengado',  afectaTotal: true, orden: 2,  base: 'salarioBase',  referenciaParametro: null },
  { codigo: 'RECARGO_NOCTURNO',       nombre: 'Recargo Nocturno',                tipo: 'devengado',  afectaTotal: true, orden: 3,  base: 'salarioBase',  referenciaParametro: 'RECARGO_NOCTURNO' },
  { codigo: 'RECARGO_DOMINICAL',      nombre: 'Recargo Dominical/Festivo',       tipo: 'devengado',  afectaTotal: true, orden: 4,  base: 'salarioBase',  referenciaParametro: 'RECARGO_DOMINICAL_FESTIVO' },
  { codigo: 'HE_DIURNA',             nombre: 'Hora Extra Diurna',               tipo: 'devengado',  afectaTotal: true, orden: 5,  base: 'salarioBase',  referenciaParametro: 'HE_DIURNA' },
  { codigo: 'HE_NOCTURNA',           nombre: 'Hora Extra Nocturna',             tipo: 'devengado',  afectaTotal: true, orden: 6,  base: 'salarioBase',  referenciaParametro: 'HE_NOCTURNA' },
  { codigo: 'HE_DOM_FESTIVA_DIURNA', nombre: 'HE Dominical/Festiva Diurna',    tipo: 'devengado',  afectaTotal: true, orden: 7,  base: 'salarioBase',  referenciaParametro: 'HE_DOM_FESTIVA_DIURNA' },
  { codigo: 'HE_DOM_FESTIVA_NOCTURNA',nombre: 'HE Dominical/Festiva Nocturna', tipo: 'devengado',  afectaTotal: true, orden: 8,  base: 'salarioBase',  referenciaParametro: 'HE_DOM_FESTIVA_NOCTURNA' },
  { codigo: 'DEDUCCION_SALUD',       nombre: 'Deducción Salud 4%',             tipo: 'deduccion',  afectaTotal: true, orden: 10, base: 'salarioBase',  referenciaParametro: 'PORCENTAJE_SALUD_EMPLEADO' },
  { codigo: 'DEDUCCION_PENSION',     nombre: 'Deducción Pensión 4%',           tipo: 'deduccion',  afectaTotal: true, orden: 11, base: 'salarioBase',  referenciaParametro: 'PORCENTAJE_PENSION_EMPLEADO' }
];

async function seedParaEmpresa(empresa) {
  let paramNuevos = 0, paramActualizados = 0, conceptosNuevos = 0;
  const empresaId = empresa.id;

  // Parámetros 2025
  for (const p of PARAMETROS_2025) {
    const existente = await prisma.parametroNomina.findFirst({
      where: { empresaId, codigo: p.codigo, vigenciaDesde: VIGENCIA_2025 }
    });
    if (!existente) {
      await prisma.parametroNomina.create({
        data: { ...p, empresaId, vigenciaDesde: VIGENCIA_2025, vigenciaHasta: new Date('2025-12-31'), estado: 'activo' }
      });
      paramNuevos++;
    }
  }

  // Parámetros 2026 (vigencia abierta = indefinida hasta nuevo decreto)
  for (const p of PARAMETROS_2026) {
    const existente = await prisma.parametroNomina.findFirst({
      where: { empresaId, codigo: p.codigo, vigenciaDesde: VIGENCIA_2026 }
    });
    if (!existente) {
      await prisma.parametroNomina.create({
        data: { ...p, empresaId, vigenciaDesde: VIGENCIA_2026, vigenciaHasta: null, estado: 'activo' }
      });
      paramNuevos++;
    }
  }

  // Parámetros 2026 que no tienen 2026 pero deben completarse con los de 2025 base
  const codigosFaltantes2026 = PARAMETROS_2025
    .filter(p => !PARAMETROS_2026.find(p2 => p2.codigo === p.codigo))
    .map(p => p.codigo);

  for (const codigo of codigosFaltantes2026) {
    const existente = await prisma.parametroNomina.findFirst({
      where: { empresaId, codigo, vigenciaDesde: VIGENCIA_2026 }
    });
    if (!existente) {
      const base = PARAMETROS_2025.find(p => p.codigo === codigo);
      await prisma.parametroNomina.create({
        data: { ...base, empresaId, vigenciaDesde: VIGENCIA_2026, vigenciaHasta: null, estado: 'activo' }
      });
      paramNuevos++;
    }
  }

  // Conceptos base
  for (const c of CONCEPTOS_BASE) {
    const existente = await prisma.conceptoNomina.findFirst({ where: { empresaId, codigo: c.codigo } });
    if (!existente) {
      await prisma.conceptoNomina.create({
        data: { ...c, empresaId, vigenciaDesde: VIGENCIA_2025, vigenciaHasta: null, estado: 'activo', formula: null }
      });
      conceptosNuevos++;
    }
  }

  console.log(`  ✅ ${empresa.nombre}: +${paramNuevos} params nuevos, ${paramActualizados} actualizados, +${conceptosNuevos} conceptos`);
}

async function main() {
  console.log('🌱 Seed Prisma – Parámetros y Conceptos de Nómina\n');

  const empresas = await prisma.empresa.findMany({ where: { estado: 'activa' } });
  console.log(`📋 Empresas activas: ${empresas.length}`);

  for (const empresa of empresas) {
    await seedParaEmpresa(empresa);
  }

  const totalParams   = await prisma.parametroNomina.count();
  const totalConceptos = await prisma.conceptoNomina.count();
  console.log(`\n✅ Seed completado. Total en BD: ${totalParams} parámetros, ${totalConceptos} conceptos.`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
