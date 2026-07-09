'use strict';

/**
 * Tests unitarios TDD — issue #32
 * Valida las funciones puras de ordenamiento de usuarios.
 *
 * Causa raíz: authController.js orderBy: { createdAt: 'desc' }
 * mostraba usuarios en orden de creación descendente.
 * Fix: orderBy nombre ASC + _sortByNombre en frontend como fallback.
 */

// ── Espejo de las funciones puras ─────────────────────────────────────────────

function _sortByNombre(lista) {
  return [...lista].sort((a, b) => {
    const na = (a.nombre || '').trim();
    const nb = (b.nombre || '').trim();
    if (!na && !nb) return 0;
    if (!na) return 1;
    if (!nb) return -1;
    const cmp = na.localeCompare(nb, 'es', { sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return (a.username || '').localeCompare(b.username || '', 'es', { sensitivity: 'base' });
  });
}

const SORT_WHITELIST = new Set(['nombre', 'username', 'correo', 'rol', 'activo', 'createdAt']);

function _validarSortBy(campo) {
  return SORT_WHITELIST.has(campo) ? campo : 'nombre';
}

// ── Tests: _sortByNombre ──────────────────────────────────────────────────────
describe('_sortByNombre — ordenamiento de usuarios', () => {

  test('ordena por nombre ASC básico', () => {
    const input = [
      { nombre: 'Ramiro', username: 'rrodelo' },
      { nombre: 'agmadm', username: 'agmadm' },
      { nombre: 'keila',  username: 'keila'  }
    ];
    const result = _sortByNombre(input);
    expect(result[0].nombre).toBe('agmadm');
    expect(result[1].nombre).toBe('keila');
    expect(result[2].nombre).toBe('Ramiro');
  });

  test('ignora mayúsculas/minúsculas (case-insensitive)', () => {
    const input = [
      { nombre: 'Super Administrador', username: 'superadmin' },
      { nombre: 'Administrador',       username: 'admin'      },
      { nombre: 'agmadm',              username: 'agmadm'     }
    ];
    const result = _sortByNombre(input);
    expect(result[0].nombre).toBe('Administrador');
    expect(result[1].nombre).toBe('agmadm');
    expect(result[2].nombre).toBe('Super Administrador');
  });

  test('ignora espacios iniciales/finales (trim)', () => {
    const input = [
      { nombre: '  Zebra', username: 'z' },
      { nombre: 'alfa  ',  username: 'a' }
    ];
    const result = _sortByNombre(input);
    expect(result[0].username).toBe('a');
    expect(result[1].username).toBe('z');
  });

  test('nombres vacíos van al final', () => {
    const input = [
      { nombre: '',        username: 'empty'  },
      { nombre: 'Andrés',  username: 'andres' },
      { nombre: null,      username: 'null'   }
    ];
    const result = _sortByNombre(input);
    expect(result[0].nombre).toBe('Andrés');
    expect(result[1].username).toBe('empty');
    expect(result[2].username).toBe('null');
  });

  test('nombres undefined van al final', () => {
    const input = [
      { username: 'b' },
      { nombre: 'Ana', username: 'ana' }
    ];
    const result = _sortByNombre(input);
    expect(result[0].nombre).toBe('Ana');
    expect(result[1].username).toBe('b');
  });

  test('nombres iguales se ordenan por username', () => {
    const input = [
      { nombre: 'Juan', username: 'juanz' },
      { nombre: 'Juan', username: 'juanA' }
    ];
    const result = _sortByNombre(input);
    expect(result[0].username.toLowerCase()).toBe('juana');
    expect(result[1].username.toLowerCase()).toBe('juanz');
  });

  test('no muta el array original', () => {
    const original = [
      { nombre: 'Zebra', username: 'z' },
      { nombre: 'Alfa',  username: 'a' }
    ];
    const copia = [...original];
    _sortByNombre(original);
    expect(original[0].nombre).toBe('Zebra');
    expect(original[1].nombre).toBe('Alfa');
    expect(original).toEqual(copia);
  });

  test('maneja lista vacía', () => {
    expect(_sortByNombre([])).toEqual([]);
  });

  test('maneja lista con un solo elemento', () => {
    const input = [{ nombre: 'Único', username: 'unico' }];
    expect(_sortByNombre(input)).toHaveLength(1);
  });

  test('orden del ejemplo del issue: y676,j,uy,yh,k,t → a,j,k,t,uy,y676,yh', () => {
    const input = [
      { nombre: 'y676', username: 'uy76'  },
      { nombre: 'j',    username: 'j'     },
      { nombre: 'uy',   username: 'uy'    },
      { nombre: 'yh',   username: 'y'     },
      { nombre: 'k',    username: 'k'     },
      { nombre: 't',    username: 't'     }
    ];
    const result = _sortByNombre(input);
    const nombres = result.map(u => u.nombre);
    expect(nombres).toEqual(['j', 'k', 't', 'uy', 'y676', 'yh']);
  });

  test('mantiene el orden después de búsqueda (filter preserva orden)', () => {
    const input = [
      { nombre: 'Zebra',    username: 'z' },
      { nombre: 'Arnaldo',  username: 'a' },
      { nombre: 'Bernardo', username: 'b' }
    ];
    const sorted = _sortByNombre(input);
    const filtered = sorted.filter(u => u.nombre.toLowerCase().includes('a'));
    expect(filtered[0].nombre).toBe('Arnaldo');
    expect(filtered[1].nombre).toBe('Bernardo');
  });
});

// ── Tests: _validarSortBy — whitelist anti-inyección ─────────────────────────
describe('_validarSortBy — validación de campo de ordenamiento', () => {

  test('acepta "nombre" (campo válido)', () => {
    expect(_validarSortBy('nombre')).toBe('nombre');
  });

  test('acepta "username" (campo válido)', () => {
    expect(_validarSortBy('username')).toBe('username');
  });

  test('acepta "correo" (campo válido)', () => {
    expect(_validarSortBy('correo')).toBe('correo');
  });

  test('acepta "rol" (campo válido)', () => {
    expect(_validarSortBy('rol')).toBe('rol');
  });

  test('acepta "activo" (campo válido)', () => {
    expect(_validarSortBy('activo')).toBe('activo');
  });

  test('acepta "createdAt" (campo válido)', () => {
    expect(_validarSortBy('createdAt')).toBe('createdAt');
  });

  test('rechaza campo no permitido → retorna "nombre" como default', () => {
    expect(_validarSortBy('password')).toBe('nombre');
  });

  test('rechaza intento de SQL injection → retorna default', () => {
    expect(_validarSortBy("nombre; DROP TABLE usuarios;--")).toBe('nombre');
  });

  test('rechaza campo con caracteres especiales → retorna default', () => {
    expect(_validarSortBy('nombre__proto__')).toBe('nombre');
  });

  test('rechaza undefined → retorna default', () => {
    expect(_validarSortBy(undefined)).toBe('nombre');
  });

  test('rechaza null → retorna default', () => {
    expect(_validarSortBy(null)).toBe('nombre');
  });

  test('rechaza campo vacío → retorna default', () => {
    expect(_validarSortBy('')).toBe('nombre');
  });

  test('el conjunto de campos permitidos tiene exactamente 6 campos', () => {
    expect(SORT_WHITELIST.size).toBe(6);
  });
});
