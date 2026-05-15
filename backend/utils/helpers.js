// -------------------------------------------------------------
// Módulo de funciones auxiliares para procesamiento de nómina
// -------------------------------------------------------------

function normalizarClave(str) {
    return str
        .toLowerCase()
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/[^a-z0-9]/g, '');
}

function normalizarHora(h) {
    if (!h) return h;
    if (h.includes(':')) return h;
    const match = h.match(/^([0-9]{1,2})([0-9]{2})$/);
    if (match) {
        let horas = match[1].padStart(2, '0');
        let minutos = match[2];
        return `${horas}:${minutos}`;
    }
    if (/^[0-9]{1,2}$/.test(h)) {
        return h.padStart(2, '0') + ':00';
    }
    return h;
}

module.exports = { normalizarClave, normalizarHora };