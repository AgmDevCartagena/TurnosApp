import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UbicacionesService } from './ubicaciones.service';

const mockPrisma = {
  pais: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  departamento: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  ciudad: {
    findMany: vi.fn(),
  },
};

const mockColombia = { id: 'pais-co-id', codigo: 'CO', nombre: 'Colombia', activo: true };
const mockDeptAnt = { id: 'dept-ant-id', codigo: 'ANT', nombre: 'Antioquia' };
const mockDeptCun = { id: 'dept-cun-id', codigo: 'CUN', nombre: 'Cundinamarca' };
const mockCiudadMed = { id: 'ciudad-med-id', codigo: '05001', nombre: 'Medellín' };

describe('UbicacionesService', () => {
  let service: UbicacionesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UbicacionesService(mockPrisma as any);
  });

  // ── findAllPaises ──────────────────────────────────────
  describe('findAllPaises', () => {
    it('devuelve lista de países activos', async () => {
      mockPrisma.pais.findMany.mockResolvedValue([mockColombia]);
      const result = await service.findAllPaises();
      expect(result).toEqual([mockColombia]);
      expect(mockPrisma.pais.findMany).toHaveBeenCalledWith({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
        select: { id: true, codigo: true, nombre: true, nombreOficial: true },
      });
    });

    it('devuelve array vacío cuando no hay países', async () => {
      mockPrisma.pais.findMany.mockResolvedValue([]);
      const result = await service.findAllPaises();
      expect(result).toEqual([]);
    });

    it('propaga errores de Prisma', async () => {
      mockPrisma.pais.findMany.mockRejectedValue(new Error('DB connection failed'));
      await expect(service.findAllPaises()).rejects.toThrow('DB connection failed');
    });
  });

  // ── findDepartamentosByPais ────────────────────────────
  describe('findDepartamentosByPais', () => {
    it('devuelve departamentos cuando el país existe', async () => {
      mockPrisma.pais.findUnique.mockResolvedValue(mockColombia);
      mockPrisma.departamento.findMany.mockResolvedValue([mockDeptAnt, mockDeptCun]);

      const result = await service.findDepartamentosByPais('pais-co-id');

      expect(result).toEqual([mockDeptAnt, mockDeptCun]);
      expect(mockPrisma.departamento.findMany).toHaveBeenCalledWith({
        where: { paisId: 'pais-co-id', activo: true },
        orderBy: { nombre: 'asc' },
        select: { id: true, codigo: true, nombre: true },
      });
    });

    it('lanza NotFoundException cuando el país no existe', async () => {
      mockPrisma.pais.findUnique.mockResolvedValue(null);
      await expect(service.findDepartamentosByPais('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve array vacío si el país existe pero no tiene departamentos', async () => {
      mockPrisma.pais.findUnique.mockResolvedValue(mockColombia);
      mockPrisma.departamento.findMany.mockResolvedValue([]);

      const result = await service.findDepartamentosByPais('pais-co-id');
      expect(result).toEqual([]);
    });

    it('lanza error cuando paisId es cadena vacía', async () => {
      mockPrisma.pais.findUnique.mockResolvedValue(null);
      await expect(service.findDepartamentosByPais('')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findCiudadesByDepartamento ─────────────────────────
  describe('findCiudadesByDepartamento', () => {
    it('devuelve ciudades cuando el departamento existe', async () => {
      mockPrisma.departamento.findUnique.mockResolvedValue(mockDeptAnt);
      mockPrisma.ciudad.findMany.mockResolvedValue([mockCiudadMed]);

      const result = await service.findCiudadesByDepartamento('dept-ant-id');

      expect(result).toEqual([mockCiudadMed]);
      expect(mockPrisma.ciudad.findMany).toHaveBeenCalledWith({
        where: { departamentoId: 'dept-ant-id', activo: true },
        orderBy: { nombre: 'asc' },
        select: { id: true, codigo: true, nombre: true },
      });
    });

    it('lanza NotFoundException cuando el departamento no existe', async () => {
      mockPrisma.departamento.findUnique.mockResolvedValue(null);
      await expect(service.findCiudadesByDepartamento('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve array vacío si el departamento no tiene ciudades', async () => {
      mockPrisma.departamento.findUnique.mockResolvedValue(mockDeptAnt);
      mockPrisma.ciudad.findMany.mockResolvedValue([]);

      const result = await service.findCiudadesByDepartamento('dept-ant-id');
      expect(result).toEqual([]);
    });

    it('filtra sólo ciudades activas', async () => {
      mockPrisma.departamento.findUnique.mockResolvedValue(mockDeptAnt);
      mockPrisma.ciudad.findMany.mockResolvedValue([mockCiudadMed]);

      await service.findCiudadesByDepartamento('dept-ant-id');

      expect(mockPrisma.ciudad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ activo: true }) }),
      );
    });
  });
});
