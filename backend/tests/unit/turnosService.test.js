/**
 * Tests unitarios: turnosService.js
 * Verifica filtros de empresa en crearTurno y obtenerTurnos.
 */

jest.mock('../../models/Turno');

const Turno = require('../../models/Turno');
const turnosService = require('../../services/turnosService');

describe('crearTurno', () => {
  beforeEach(() => jest.clearAllMocks());

  test('si no existe documento, crea nuevo Turno con empresaId', async () => {
    const mockSave = jest.fn().mockResolvedValue({ _id: 'turno1' });
    Turno.findOne = jest.fn().mockResolvedValue(null);
    Turno.mockImplementation(() => ({ save: mockSave }));

    const empresaId = '507f1f77bcf86cd799439011';
    const datos = {
      empleadoId: 'emp1',
      nombreEmpleado: 'Juan',
      documentoEmpleado: '123456',
      cargo: 'Analista',
      salario: 2000000,
      area: 'ADMINISTRACION',
      fechaInicio: '2025-01-01',
      fechaFin: '2025-01-31'
    };

    await turnosService.crearTurno(datos, empresaId);

    expect(Turno.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ empleadoId: 'emp1', empresaId })
    );
    expect(Turno).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId })
    );
  });

  test('sin empresaId: busca sin filtro de empresa', async () => {
    Turno.findOne = jest.fn().mockResolvedValue(null);
    const mockSave = jest.fn().mockResolvedValue({ _id: 'turno1' });
    Turno.mockImplementation(() => ({ save: mockSave }));

    const datos = {
      empleadoId: 'emp1',
      nombreEmpleado: 'Ana',
      documentoEmpleado: '654321',
      cargo: 'Jefe',
      salario: 3000000,
      area: 'OPERACIONES',
      fechaInicio: '2025-01-01',
      fechaFin: '2025-01-31'
    };

    await turnosService.crearTurno(datos);

    expect(Turno.findOne).toHaveBeenCalledWith(
      expect.not.objectContaining({ empresaId: expect.anything() })
    );
  });
});

describe('obtenerTurnos', () => {
  beforeEach(() => jest.clearAllMocks());

  test('con empresaId: agrega filtro al query', async () => {
    Turno.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    const empresaId = '507f1f77bcf86cd799439011';
    await turnosService.obtenerTurnos({}, empresaId);
    expect(Turno.find).toHaveBeenCalledWith(expect.objectContaining({ empresaId }));
  });

  test('sin empresaId: no agrega filtro', async () => {
    Turno.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    await turnosService.obtenerTurnos({});
    const llamada = Turno.find.mock.calls[0][0];
    expect(llamada.empresaId).toBeUndefined();
  });
});
