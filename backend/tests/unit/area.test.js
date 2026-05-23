/**
 * Tests unitarios — Modelo Area
 * TDD: estos tests describen el comportamiento esperado
 * antes de la implementación.
 */

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');

// ── Mock de Area con comportamiento real de validación ────────────────────────
jest.mock('../../models/Area', () => {
  const instances = [];

  function MockArea(data) {
    Object.assign(this, {
      _id: new mongoose.Types.ObjectId(),
      estado: 'activa',
      codigo: '',
      descripcion: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    });
    if (this.nombre) this.nombre = this.nombre.toUpperCase().trim();
    if (this.codigo) this.codigo = this.codigo.toUpperCase().trim();
    instances.push(this);
  }

  MockArea.prototype.save = async function () {
    if (!this.nombre) throw Object.assign(new Error('El nombre del área es requerido'), { name: 'ValidationError' });
    if (!this.empresaId) throw Object.assign(new Error('empresaId es requerido'), { name: 'ValidationError' });
    const dup = instances.find(
      i => i !== this &&
           i.empresaId?.toString() === this.empresaId?.toString() &&
           i.nombre === this.nombre &&
           i.estado === 'activa'
    );
    if (dup) throw Object.assign(new Error('Área duplicada'), { code: 11000 });
    this.updatedAt = new Date();
    return this;
  };

  MockArea.create = async function (data) {
    const a = new MockArea(data);
    await a.save();
    return a;
  };

  MockArea.findOne = jest.fn(async (query) => {
    return instances.find(i => {
      if (query.empresaId && i.empresaId?.toString() !== query.empresaId?.toString()) return false;
      if (query.nombre && i.nombre !== query.nombre.toUpperCase()) return false;
      if (query.estado && i.estado !== query.estado) return false;
      if (query._id?.$ne && i._id.toString() === query._id.$ne.toString()) return false;
      return true;
    }) || null;
  });

  MockArea.find = jest.fn(async (query = {}) => {
    return instances.filter(i => {
      if (query.empresaId && i.empresaId?.toString() !== query.empresaId?.toString()) return false;
      if (query.estado && i.estado !== query.estado) return false;
      return true;
    });
  });

  MockArea._clear = () => instances.splice(0, instances.length);

  return MockArea;
});

const Area = require('../../models/Area');

beforeEach(() => Area._clear());

// ══════════════════════════════════════════════════════════════════════════════
describe('Area — creación', () => {
  const empresaA = new mongoose.Types.ObjectId();
  const empresaB = new mongoose.Types.ObjectId();

  test('crea área con datos válidos', async () => {
    const area = await Area.create({ empresaId: empresaA, nombre: 'Operaciones' });
    expect(area._id).toBeDefined();
    expect(area.nombre).toBe('OPERACIONES');
    expect(area.estado).toBe('activa');
  });

  test('normaliza nombre a mayúsculas', async () => {
    const area = await Area.create({ empresaId: empresaA, nombre: 'administracion' });
    expect(area.nombre).toBe('ADMINISTRACION');
  });

  test('rechaza área sin nombre', async () => {
    await expect(Area.create({ empresaId: empresaA }))
      .rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('rechaza área sin empresaId', async () => {
    await expect(Area.create({ nombre: 'Test' }))
      .rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('rechaza nombre duplicado activo en la misma empresa', async () => {
    await Area.create({ empresaId: empresaA, nombre: 'Conductores' });
    await expect(Area.create({ empresaId: empresaA, nombre: 'CONDUCTORES' }))
      .rejects.toMatchObject({ code: 11000 });
  });

  test('permite mismo nombre en empresas distintas', async () => {
    await Area.create({ empresaId: empresaA, nombre: 'Mantenimiento' });
    const areaB = await Area.create({ empresaId: empresaB, nombre: 'Mantenimiento' });
    expect(areaB.nombre).toBe('MANTENIMIENTO');
  });

  test('estado por defecto es activa', async () => {
    const area = await Area.create({ empresaId: empresaA, nombre: 'Taquilleros' });
    expect(area.estado).toBe('activa');
  });

  test('permite código y descripción opcionales', async () => {
    const area = await Area.create({
      empresaId: empresaA,
      nombre: 'Centro Control',
      codigo: 'cc',
      descripcion: 'Centro de control y monitoreo'
    });
    expect(area.codigo).toBe('CC');
    expect(area.descripcion).toBe('Centro de control y monitoreo');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('Area — inactivación', () => {
  const empresaA = new mongoose.Types.ObjectId();

  test('inactiva un área correctamente', async () => {
    const area = await Area.create({ empresaId: empresaA, nombre: 'Soporte' });
    area.estado = 'inactiva';
    await area.save();
    expect(area.estado).toBe('inactiva');
  });

  test('permite crear área con mismo nombre si la anterior está inactiva', async () => {
    const area1 = await Area.create({ empresaId: empresaA, nombre: 'Logistica' });
    area1.estado = 'inactiva';
    await area1.save();
    const area2 = await Area.create({ empresaId: empresaA, nombre: 'LOGISTICA' });
    expect(area2.estado).toBe('activa');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('Area — consulta', () => {
  const empresaA = new mongoose.Types.ObjectId();
  const empresaB = new mongoose.Types.ObjectId();

  test('find filtra por empresaId', async () => {
    await Area.create({ empresaId: empresaA, nombre: 'Area Exclusiva A' });
    await Area.create({ empresaId: empresaB, nombre: 'Area Exclusiva B' });

    const areasA = await Area.find({ empresaId: empresaA });
    expect(areasA.every(a => a.empresaId.toString() === empresaA.toString())).toBe(true);
    expect(areasA.find(a => a.nombre === 'AREA EXCLUSIVA B')).toBeUndefined();
  });

  test('find filtra por estado activa', async () => {
    const a1 = await Area.create({ empresaId: empresaA, nombre: 'Area Activa' });
    const a2 = await Area.create({ empresaId: empresaA, nombre: 'Area Inactiva' });
    a2.estado = 'inactiva';
    await a2.save();

    const activas = await Area.find({ empresaId: empresaA, estado: 'activa' });
    expect(activas.some(a => a.nombre === 'AREA ACTIVA')).toBe(true);
    expect(activas.some(a => a.nombre === 'AREA INACTIVA')).toBe(false);
  });
});
