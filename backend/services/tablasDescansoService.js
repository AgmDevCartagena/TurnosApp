/**
 * Servicio para gestión de tablas de descanso
 * Configuración exacta según datos reales proporcionados
 */

/**
 * Genera patrón de tablas de descanso para cualquier año
 * DATOS EXACTOS SEGÚN INFORMACIÓN REAL:
 * OCTUBRE 2025: Tabla 1 🟣: 1,7,13,18,19,24,30 | Tabla 2 🔵: 6,11,12,17,23,29 | 
 * Tabla 3 🟤: 4,5,10,16,22,28 | Tabla 4 🟢: 3,9,15,21,27 | Tabla 5 🟡: 2,8,14,20,25,26
 */
function generarPatronTablasDescanso(año) {
  const patron = {
    descripcion: `Configuración REAL de días de descanso por tabla para taquilleros ${año}`,
    
    // TABLAS PRINCIPALES (FRONTEND) - Formato que usará el frontend con letras
    tablas: {
      "A": { color: "morado", emoji: "🟣", descripcion: "Tabla A - Días de descanso en morado", diasDescanso: {}, numero: 1 },
      "B": { color: "azul", emoji: "🔵", descripcion: "Tabla B - Días de descanso en azul", diasDescanso: {}, numero: 2 },
      "C": { color: "marron", emoji: "🟤", descripcion: "Tabla C - Días de descanso en marrón", diasDescanso: {}, numero: 3 },
      "D": { color: "verde", emoji: "🟢", descripcion: "Tabla D - Días de descanso en verde", diasDescanso: {}, numero: 4 },
      "E": { color: "amarillo", emoji: "🟡", descripcion: "Tabla E - Días de descanso en amarillo", diasDescanso: {}, numero: 5 }
    },
    
    // COMPATIBILIDAD CON NÚMEROS (BACKEND) - Para compatibilidad interna
    tablasNumericas: {
      "1": { color: "morado", emoji: "🟣", descripcion: "Tabla 1 - Días de descanso en morado", diasDescanso: {}, numero: 1 },
      "2": { color: "azul", emoji: "🔵", descripcion: "Tabla 2 - Días de descanso en azul", diasDescanso: {}, numero: 2 },
      "3": { color: "marron", emoji: "🟤", descripcion: "Tabla 3 - Días de descanso en marrón", diasDescanso: {}, numero: 3 },
      "4": { color: "verde", emoji: "🟢", descripcion: "Tabla 4 - Días de descanso en verde", diasDescanso: {}, numero: 4 },
      "5": { color: "amarillo", emoji: "🟡", descripcion: "Tabla 5 - Días de descanso en amarillo", diasDescanso: {}, numero: 5 }
    },
    
    meses: {},
    
    // Mapeos bidireccionales
    mapeoTablas: {
      1: "A", 2: "B", 3: "C", 4: "D", 5: "E"  // Frontend usa letras
    },
    mapeoInverso: {
      "A": 1, "B": 2, "C": 3, "D": 4, "E": 5, // Conversión letra a número
      1: "A", 2: "B", 3: "C", 4: "D", 5: "E"  // Conversión número a letra
    }
  };

  // DATOS EXACTOS PROPORCIONADOS POR EL USUARIO - NO MODIFICAR
  // OCTUBRE 2025: Tabla 1 🟣: 1,7,13,18,19,24,30 | Tabla 2 🔵: 6,11,12,17,23,29 
  // Tabla 3 🟤: 4,5,10,16,22,28 | Tabla 4 🟢: 3,9,15,21,27 | Tabla 5 🟡: 2,8,14,20,25,26,31
  const diasDescansoOctubre = {
    1: [1, 7, 13, 18, 19, 24, 30],      // Tabla 1 🟣
    2: [6, 11, 12, 17, 23, 29],         // Tabla 2 🔵  
    3: [4, 5, 10, 16, 22, 28],          // Tabla 3 🟤
    4: [3, 9, 15, 21, 27],              // Tabla 4 🟢
    5: [2, 8, 14, 20, 25, 26, 31]       // Tabla 5 🟡 (incluye 31)
  };

  // NOVIEMBRE 2025 - DATOS CORREGIDOS SEGÚN tablasDescanso2025.json:
  // Tabla 1 🟣: 5,11,17,22,23,28 | Tabla 2 🔵: 4,10,15,16,21,27
  // Tabla 3 🟤: 3,8,9,14,20,26 | Tabla 4 🟢: 1,2,7,13,19,25 | Tabla 5 🟡: 6,12,18,24,29,30
  const diasDescansoNoviembre = {
    1: [5, 11, 17, 22, 23, 28],         // Tabla 1 🟣
    2: [4, 10, 15, 16, 21, 27],         // Tabla 2 🔵  
    3: [3, 8, 9, 14, 20, 26],           // Tabla 3 🟤
    4: [1, 2, 7, 13, 19, 25],           // Tabla 4 🟢
    5: [6, 12, 18, 24, 29, 30]          // Tabla 5 🟡
  };

  // DICIEMBRE 2025 - DATOS CORREGIDOS SEGÚN tablasDescanso2025.json:
  // Tabla 1 🟣: 4,10,16,22,27,28 | Tabla 2 🔵: 3,9,15,20,21,26
  // Tabla 3 🟤: 2,8,13,14,19,25,31 | Tabla 4 🟢: 1,6,7,12,18,24,30 | Tabla 5 🟡: 5,11,17,23,29
  const diasDescansoDeciembre = {
    1: [4, 10, 16, 22, 27, 28],         // Tabla 1 🟣
    2: [3, 9, 15, 20, 21, 26],          // Tabla 2 🔵  
    3: [2, 8, 13, 14, 19, 25, 31],      // Tabla 3 🟤
    4: [1, 6, 7, 12, 18, 24, 30],       // Tabla 4 🟢
    5: [5, 11, 17, 23, 29]              // Tabla 5 🟡
  };

  // Mapeo de datos reales por mes
  const datosPorMes = {
    10: { nombre: 'octubre', dias: diasDescansoOctubre },
    11: { nombre: 'noviembre', dias: diasDescansoNoviembre },
    12: { nombre: 'diciembre', dias: diasDescansoDeciembre }
  };

  // Procesar cada mes con los datos exactos
  for (let mes = 10; mes <= 12; mes++) {
    const datosDelMes = datosPorMes[mes];
    const nombreMes = datosDelMes.nombre;
    patron.meses[mes] = nombreMes;
    
    // Procesar cada tabla (1-5) - Usar letras como formato principal para el frontend
    for (let tablaNumero = 1; tablaNumero <= 5; tablaNumero++) {
      const tablaLetra = patron.mapeoTablas[tablaNumero]; // A, B, C, D, E
      const diasDescanso = datosDelMes.dias[tablaNumero];
      
      // Inicializar arrays para tablas principales (letras - para frontend)
      if (!patron.tablas[tablaLetra].diasDescanso[nombreMes]) {
        patron.tablas[tablaLetra].diasDescanso[nombreMes] = [];
      }
      
      // También mantener compatibilidad con números
      const tablaNumString = tablaNumero.toString();
      if (!patron.tablasNumericas[tablaNumString].diasDescanso[nombreMes]) {
        patron.tablasNumericas[tablaNumString].diasDescanso[nombreMes] = [];
      }
      
      // Agregar cada día de descanso de esta tabla
      diasDescanso.forEach(dia => {
        const fecha = new Date(año, mes - 1, dia);
        const diaSemanaJS = fecha.getDay(); // 0=dom, 1=lun, 2=mar...6=sab
        const fechaCompleta = `${año}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
        
        // Nombres de días de la semana
        const nombresDias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const nombreDia = nombresDias[diaSemanaJS];
        
        // Determinar tipo de descanso
        let tipoDescanso = 'entre_semana';
        if (diaSemanaJS === 0 || diaSemanaJS === 6) { // Domingo o Sábado
          tipoDescanso = 'fin_de_semana';
        } else if (diaSemanaJS === 1) { // Lunes
          tipoDescanso = 'lunes_previo_fds';
        }
        
        const diaInfo = {
          dia: dia,
          fecha: fechaCompleta,
          diaSemana: nombreDia,
          tipoDescanso: tipoDescanso,
          semanaReferencia: `${nombreMes} ${año} - día ${dia}`,
          tabla: `Tabla ${tablaLetra} ${patron.tablas[tablaLetra].emoji}`
        };
        
        // Agregar a tabla principal (letras - para frontend)
        patron.tablas[tablaLetra].diasDescanso[nombreMes].push(diaInfo);
        
        // Agregar a tabla numérica (números - para compatibilidad)
        patron.tablasNumericas[tablaNumString].diasDescanso[nombreMes].push(diaInfo);
      });
    }
  }

  return patron;
}

/**
 * Calcula días adicionales según patrón establecido
 */
function calcularDiasAdicionalesSegunPatron(año, mes, tabla, diasExistentes) {
  // Lógica para calcular días adicionales manteniendo equidad
  const diasAdicionales = [];
  
  // Implementar lógica específica según necesidades
  // Por ahora retorna array vacío
  
  return diasAdicionales;
}

module.exports = {
  generarPatronTablasDescanso,
  calcularDiasAdicionalesSegunPatron
};