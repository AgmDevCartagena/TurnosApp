/**
 * seedParametrosNomina.js
 * Crea parámetros y conceptos de nómina para todas las empresas activas.
 * Idempotente: no duplica si ya existen para la vigencia.
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const Empresa        = require('../models/Empresa');
const ParametroNomina = require('../models/ParametroNomina');
const ConceptoNomina  = require('../models/ConceptoNomina');

const VIGENCIA_2025 = new Date('2025-01-01');
const VIGENCIA_2026 = new Date('2026-01-01');

// ── Parámetros legales Colombia 2025 ─────────────────────────────────────────
const PARAMETROS_2025 = [
  { codigo: 'SMLV',                        nombre: 'Salario Mínimo Legal Vigente 2025',          valor: 1750905,  tipoValor: 'valor_fijo', descripcion: 'Decreto 2473 de 2024' },
  { codigo: 'AUX_TRANSPORTE',              nombre: 'Auxilio de Transporte Mensual 2025',          valor: 249095,   tipoValor: 'valor_fijo', descripcion: 'Decreto 2474 de 2024' },
  { codigo: 'PORCENTAJE_SALUD_EMPLEADO',   nombre: 'Porcentaje Salud a cargo Empleado',           valor: 0.04,     tipoValor: 'porcentaje', descripcion: 'CST Art. 204 – 4%' },
  { codigo: 'PORCENTAJE_PENSION_EMPLEADO', nombre: 'Porcentaje Pensión a cargo Empleado',         valor: 0.04,     tipoValor: 'porcentaje', descripcion: 'Ley 100/93 Art. 20 – 4%' },
  { codigo: 'PORCENTAJE_SALUD_EMPRESA',    nombre: 'Porcentaje Salud a cargo Empresa',            valor: 0.085,    tipoValor: 'porcentaje', descripcion: 'CST – 8.5%' },
  { codigo: 'PORCENTAJE_PENSION_EMPRESA',  nombre: 'Porcentaje Pensión a cargo Empresa',          valor: 0.12,     tipoValor: 'porcentaje', descripcion: 'Ley 100/93 – 12%' },
  { codigo: 'RECARGO_NOCTURNO',            nombre: 'Recargo Nocturno (19h - 06h)',                valor: 0.35,     tipoValor: 'porcentaje', descripcion: 'CST Art. 168 – 35%' },
  { codigo: 'RECARGO_DOMINICAL_FESTIVO',   nombre: 'Recargo Dominical/Festivo – Ley 2466/2025',  valor: 0.80,     tipoValor: 'porcentaje', descripcion: 'Ley 2466/2025 – 80% (→90% en 2026, →100% en 2027)' },
  { codigo: 'HE_DIURNA',                   nombre: 'Hora Extra Diurna',                           valor: 0.25,     tipoValor: 'porcentaje', descripcion: 'CST Art. 168 – 25%' },
  { codigo: 'HE_NOCTURNA',                 nombre: 'Hora Extra Nocturna',                         valor: 0.75,     tipoValor: 'porcentaje', descripcion: 'CST Art. 168 – 75%' },
  { codigo: 'HE_DOM_FESTIVA_DIURNA',       nombre: 'Hora Extra Dominical/Festiva Diurna',         valor: 0.80,     tipoValor: 'porcentaje', descripcion: 'CST + Ley 2466/2025' },
  { codigo: 'HE_DOM_FESTIVA_NOCTURNA',     nombre: 'Hora Extra Dominical/Festiva Nocturna',       valor: 0.80,     tipoValor: 'porcentaje', descripcion: 'CST + Ley 2466/2025' },
  { codigo: 'HORAS_MES',                   nombre: 'Horas Laborales Estándar Mensuales',          valor: 220,      tipoValor: 'horas',      descripcion: 'Estándar Colombia: 220h/mes' },
  { codigo: 'DIAS_MES_CALCULO',            nombre: 'Días Base de Cálculo Mensual',                valor: 30,       tipoValor: 'dias',       descripcion: 'Base 30 días para prorrateo' }
];

// Parámetros 2026 - Ley 2466 aumenta recargo dominical a 90%
const PARAMETROS_2026 = [
  { codigo: 'SMLV',                      nombre: 'SMLV 2026 (pendiente decreto)',              valor: 1850000, tipoValor: 'valor_fijo', descripcion: 'Actualizar con decreto oficial' },
  { codigo: 'AUX_TRANSPORTE',            nombre: 'Auxilio Transporte 2026 (pendiente)',        valor: 263000,  tipoValor: 'valor_fijo', descripcion: 'Actualizar con decreto oficial' },
  { codigo: 'RECARGO_DOMINICAL_FESTIVO', nombre: 'Recargo Dominical/Festivo – Ley 2466/2026', valor: 0.90,    tipoValor: 'porcentaje', descripcion: 'Ley 2466/2025 – 90% desde 2026' }
];

// ── Conceptos estándar ────────────────────────────────────────────────────────
const CONCEPTOS_BASE = [
  { codigo: 'SALARIO_BASE',       nombre: 'Salario Base Devengado',        tipo: 'devengado',  afectaTotal: true, orden: 1,  base: 'salarioBase' },
  { codigo: 'AUX_TRANSPORTE',     nombre: 'Auxilio de Transporte',         tipo: 'devengado',  afectaTotal: true, orden: 2,  base: 'salarioBase' },
  { codigo: 'RECARGO_NOCTURNO',   nombre: 'Recargo Nocturno',              tipo: 'devengado',  afectaTotal: true, orden: 3,  referenciaParametro: 'RECARGO_NOCTURNO' },
  { codigo: 'RECARGO_DOMINICAL',  nombre: 'Recargo Dominical/Festivo',     tipo: 'devengado',  afectaTotal: true, orden: 4,  referenciaParametro: 'RECARGO_DOMINICAL_FESTIVO' },
  { codigo: 'HE_DIURNA',         nombre: 'Hora Extra Diurna',             tipo: 'devengado',  afectaTotal: true, orden: 5,  referenciaParametro: 'HE_DIURNA' },
  { codigo: 'HE_NOCTURNA',       nombre: 'Hora Extra Nocturna',           tipo: 'devengado',  afectaTotal: true, orden: 6,  referenciaParametro: 'HE_NOCTURNA' },
  { codigo: 'HE_DOM_FESTIVA_DIURNA',   nombre: 'HE Dominical/Festiva Diurna',  tipo: 'devengado', afectaTotal: true, orden: 7,  referenciaParametro: 'HE_DOM_FESTIVA_DIURNA' },
  { codigo: 'HE_DOM_FESTIVA_NOCTURNA', nombre: 'HE Dominical/Festiva Nocturna',tipo: 'devengado', afectaTotal: true, orden: 8,  referenciaParametro: 'HE_DOM_FESTIVA_NOCTURNA' },
  { codigo: 'DEDUCCION_SALUD',    nombre: 'Deducción Salud 4%',           tipo: 'deduccion',  afectaTotal: true, orden: 10, referenciaParametro: 'PORCENTAJE_SALUD_EMPLEADO',   base: 'salarioBase' },
  { codigo: 'DEDUCCION_PENSION',  nombre: 'Deducción Pensión 4%',         tipo: 'deduccion',  afectaTotal: true, orden: 11, referenciaParametro: 'PORCENTAJE_PENSION_EMPLEADO', base: 'salarioBase' }
];

async function seedParaEmpresa(empresa) {
  const empresaId = empresa._id;
  let paramNuevos = 0, conceptosNuevos = 0;

  // ── Parámetros 2025
  for (const p of PARAMETROS_2025) {
    const existe = await ParametroNomina.findOne({ empresaId, codigo: p.codigo, vigenciaDesde: VIGENCIA_2025 });
    if (!existe) {
      await ParametroNomina.create({ ...p, empresaId, vigenciaDesde: VIGENCIA_2025, estado: 'activo' });
      paramNuevos++;
    }
  }

  // ── Parámetros 2026
  for (const p of PARAMETROS_2026) {
    const existe = await ParametroNomina.findOne({ empresaId, codigo: p.codigo, vigenciaDesde: VIGENCIA_2026 });
    if (!existe) {
      await ParametroNomina.create({ ...p, empresaId, vigenciaDesde: VIGENCIA_2026, estado: 'activo' });
      paramNuevos++;
    }
  }

  // ── Conceptos
  for (const c of CONCEPTOS_BASE) {
    const existe = await ConceptoNomina.findOne({ empresaId, codigo: c.codigo });
    if (!existe) {
      await ConceptoNomina.create({ ...c, empresaId, vigenciaDesde: VIGENCIA_2025, estado: 'activo' });
      conceptosNuevos++;
    }
  }

  console.log(`  ✅ ${empresa.nombre}: +${paramNuevos} parámetros, +${conceptosNuevos} conceptos`);
}

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/turnos_app';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('🌱 Seed parámetros nómina iniciado...');

  const empresas = await Empresa.find({ estado: 'activa' });
  console.log(`📋 Empresas activas encontradas: ${empresas.length}`);

  for (const empresa of empresas) {
    await seedParaEmpresa(empresa);
  }

  console.log('✅ Seed parámetros nómina completado.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
