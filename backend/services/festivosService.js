/**
 * Servicio para gestión de festivos colombianos
 * Maneja cálculo automático de fechas festivas según normativa
 */
const festivos2025 = require('../utils/festivos2025.json');
const festivos2026 = require('../utils/festivos2026.json');

/**
 * Calcula la fecha de Pascua para un año específico
 * Utiliza el algoritmo gregoriano
 */
function calcularPascua(año) {
  const a = año % 19;
  const b = Math.floor(año / 100);
  const c = año % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = Math.floor((h + l - 7 * m + 114) / 31);
  const p = (h + l - 7 * m + 114) % 31;
  
  return new Date(año, n - 1, p + 1);
}

/**
 * Mueve una fecha al lunes siguiente si cae entre martes y sábado
 */
function moverALunes(fecha) {
  const nuevaFecha = new Date(fecha);
  const diaSemana = nuevaFecha.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
  
  if (diaSemana >= 2 && diaSemana <= 6) { // Martes a sábado
    const diasHastaLunes = 8 - diaSemana; // Días hasta el próximo lunes
    nuevaFecha.setDate(nuevaFecha.getDate() + diasHastaLunes);
  }
  
  return nuevaFecha;
}

/**
 * Formatea fecha a string ISO (YYYY-MM-DD)
 */
function formatearFechaISO(fecha) {
  return fecha.toISOString().split('T')[0];
}

/**
 * Genera todos los festivos de Colombia para un año específico
 */
function generarFestivosColombiaAño(año) {
  const pascua = calcularPascua(año);
  const festivos = [];

  // FESTIVOS FIJOS (no se trasladan)
  const festivosFijos = [
    { mes: 1, dia: 1, nombre: "Año Nuevo" },
    { mes: 5, dia: 1, nombre: "Día del Trabajo" },
    { mes: 7, dia: 20, nombre: "Día de la Independencia" },
    { mes: 8, dia: 7, nombre: "Batalla de Boyacá" },
    { mes: 12, dia: 8, nombre: "Día de la Inmaculada Concepción" },
    { mes: 12, dia: 25, nombre: "Navidad" }
  ];

  festivosFijos.forEach(({ mes, dia, nombre }) => {
    festivos.push({
      date: formatearFechaISO(new Date(año, mes - 1, dia)),
      name: nombre,
      tipo: 'fijo'
    });
  });

  // FESTIVOS TRASLADABLES AL LUNES
  const festivosTransferibles = [
    { mes: 1, dia: 6, nombre: "Día de los Reyes Magos" },
    { mes: 3, dia: 19, nombre: "Día de San José" },
    { mes: 6, dia: 29, nombre: "San Pedro y San Pablo" },
    { mes: 8, dia: 15, nombre: "Asunción de la Virgen" },
    { mes: 10, dia: 12, nombre: "Día de la Raza" },
    { mes: 11, dia: 1, nombre: "Todos los Santos" },
    { mes: 11, dia: 11, nombre: "Independencia de Cartagena" }
  ];

  festivosTransferibles.forEach(({ mes, dia, nombre }) => {
    const fechaOriginal = new Date(año, mes - 1, dia);
    const fechaTrasladada = moverALunes(fechaOriginal);
    festivos.push({
      date: formatearFechaISO(fechaTrasladada),
      name: nombre,
      tipo: 'trasladado'
    });
  });

  // FESTIVOS BASADOS EN PASCUA
  const festivosPascua = [
    { offset: -3, nombre: "Jueves Santo", trasladar: false },
    { offset: -2, nombre: "Viernes Santo", trasladar: false },
    { offset: 39, nombre: "Ascensión del Señor", trasladar: true },
    { offset: 60, nombre: "Cuerpo y Sangre de Cristo", trasladar: true },
    { offset: 68, nombre: "Sagrado Corazón de Jesús", trasladar: true }
  ];

  festivosPascua.forEach(({ offset, nombre, trasladar }) => {
    const fechaFestivo = new Date(pascua);
    fechaFestivo.setDate(pascua.getDate() + offset);
    
    const fechaFinal = trasladar ? moverALunes(fechaFestivo) : fechaFestivo;
    
    festivos.push({
      date: formatearFechaISO(fechaFinal),
      name: nombre,
      tipo: trasladar ? 'pascua-trasladado' : 'pascua'
    });
  });

  return festivos.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Verifica si una fecha es festivo
 */
function esFestivo(fecha) {
  const año = fecha.getFullYear();
  const iso = fecha.toISOString().slice(0, 10);
  
  // Para 2025 usar el archivo JSON existente
  if (año === 2025) {
    return festivos2025.some(f => f.date === iso);
  }
  // Para 2026 usar el archivo JSON recién agregado
  if (año === 2026) {
    return festivos2026.some(f => f.date === iso);
  }
  
  // Para otros años, generar automáticamente
  const festivosAño = generarFestivosColombiaAño(año);
  return festivosAño.some(f => f.date === iso);
}

module.exports = {
  calcularPascua,
  moverALunes,
  formatearFechaISO,
  generarFestivosColombiaAño,
  esFestivo
};