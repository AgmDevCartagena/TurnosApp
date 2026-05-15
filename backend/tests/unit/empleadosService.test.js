/**
 * Tests unitarios: empleadosService.js
 * Verifica que los filtros de empresa se aplican correctamente.
 */

jest.mock('../../models/Empleado');

const Empleado = require('../../models/Empleado');
const empleadosService = require('../../services/empleadosService');

describe('obtenerEmpleados', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sin filtros: llama Empleado.find con {}', async () => {
    Empleado.find = jest.fn().mockResolvedValue([]);
    await empleadosService.obtenerEmpleados();
    expect(Empleado.find).toHaveBeenCalledWith({});
  });

  test('con area: incluye filtro de area', async () => {
    Empleado.find = jest.fn().mockResolvedValue([]);
    await empleadosService.obtenerEmpleados('ADMINISTRACION');
    expect(Empleado.find).toHaveBeenCalledWith({ area: 'ADMINISTRACION' });
  });

  test('con empresaId: incluye filtro de empresaId', async () => {
    Empleado.find = jest.fn().mockResolvedValue([]);
    const empresaId = '507f1f77bcf86cd799439011';
    await empleadosService.obtenerEmpleados(null, empresaId);
    expect(Empleado.find).toHaveBeenCalledWith({ empresaId });
  });

  test('con area y empresaId: incluye ambos filtros', async () => {
    Empleado.find = jest.fn().mockResolvedValue([]);
    const empresaId = '507f1f77bcf86cd799439011';
    await empleadosService.obtenerEmpleados('OPERACIONES', empresaId);
    expect(Empleado.find).toHaveBeenCalledWith({ area: 'OPERACIONES', empresaId });
  });
});

describe('crearEmpleado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('agrega empresaId a los datos del empleado antes de guardar', async () => {
    const mockSave = jest.fn().mockResolvedValue({ _id: 'emp1', nombre: 'Juan' });
    Empleado.mockImplementation(() => ({ save: mockSave }));

    const empresaId = '507f1f77bcf86cd799439011';
    await empleadosService.crearEmpleado({ nombre: 'Juan', documento: '123456' }, empresaId);
    expect(Empleado).toHaveBeenCalledWith(expect.objectContaining({ empresaId }));
  });

  test('sin empresaId: no modifica los datos', async () => {
    const mockSave = jest.fn().mockResolvedValue({ _id: 'emp1' });
    Empleado.mockImplementation(() => ({ save: mockSave }));

    await empleadosService.crearEmpleado({ nombre: 'Ana', documento: '654321' });
    expect(Empleado).toHaveBeenCalledWith(expect.not.objectContaining({ empresaId: expect.anything() }));
  });
});

describe('obtenerEmpleadoPorId', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sin empresaId: busca solo por _id', async () => {
    Empleado.findOne = jest.fn().mockResolvedValue(null);
    await empleadosService.obtenerEmpleadoPorId('emp1');
    expect(Empleado.findOne).toHaveBeenCalledWith({ _id: 'emp1' });
  });

  test('con empresaId: agrega filtro de empresa', async () => {
    Empleado.findOne = jest.fn().mockResolvedValue(null);
    const empresaId = '507f1f77bcf86cd799439011';
    await empleadosService.obtenerEmpleadoPorId('emp1', empresaId);
    expect(Empleado.findOne).toHaveBeenCalledWith({ _id: 'emp1', empresaId });
  });
});
