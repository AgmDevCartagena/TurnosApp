import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface ConsultaDto {
  pregunta: string;
  empresaId?: string;
}

interface Respuesta {
  pregunta: string;
  respuesta: string;
  datos: unknown[];
  intent: string;
}

@Injectable()
export class AsistenteService {
  private readonly logger = new Logger(AsistenteService.name);

  constructor(private readonly prisma: PrismaService) {}

  async consultar(dto: ConsultaDto): Promise<Respuesta> {
    const { pregunta, empresaId } = dto;
    const texto = pregunta.toLowerCase();
    this.logger.log(`Consulta asistente: "${pregunta}" empresaId=${empresaId}`);

    const intent = this.detectIntent(texto);

    switch (intent) {
      case 'menor_precio':
        return this.proveedorMenorPrecio(pregunta, empresaId);
      case 'mas_rapido':
        return this.proveedorMasRapido(pregunta, empresaId);
      case 'mas_vendido':
        return this.proveedorMasVendido(pregunta, empresaId);
      case 'mas_confiable':
        return this.proveedoresMasConfiables(pregunta, empresaId);
      default:
        return {
          pregunta,
          intent: 'desconocido',
          respuesta:
            'No pude entender tu consulta. Puedes preguntarme sobre: precios de proveedores, velocidad de entrega, volumen de compras o confiabilidad de proveedores.',
          datos: [],
        };
    }
  }

  private detectIntent(texto: string): string {
    if (/menor precio|precio m[aá]s bajo|m[aá]s barato|precio menor/.test(texto)) return 'menor_precio';
    if (/m[aá]s r[aá]pido|entrega r[aá]pida|tiempo de entrega|entrega m[aá]s/.test(texto)) return 'mas_rapido';
    if (/m[aá]s vendido|vendido m[aá]s|m[aá]s a la empresa|mayor volumen|m[aá]s compras/.test(texto)) return 'mas_vendido';
    if (/confiable|confiables|confiabilidad|mejores proveedores/.test(texto)) return 'mas_confiable';
    return 'desconocido';
  }

  private async proveedorMenorPrecio(pregunta: string, empresaId?: string): Promise<Respuesta> {
    const where: any = { estado: { in: ['aceptada', 'seleccionada'] } };
    if (empresaId) where.empresaId = empresaId;

    const cotizaciones = await this.prisma.cotizacion.findMany({
      where,
      include: {
        proveedor: { select: { id: true, codigoProveedor: true, razonSocial: true, nombreCompleto: true } },
        lineas: { select: { precioUnitario: true, cantidad: true } },
      },
    });

    const resumenMap = new Map<string, { proveedor: any; totalCompras: number; totalValor: number; precioPromedio: number }>();

    for (const cot of cotizaciones) {
      const prov = cot.proveedor;
      const key = prov.id;
      const precioPromLinea =
        cot.lineas.length > 0
          ? cot.lineas.reduce((s, l) => s + Number(l.precioUnitario), 0) / cot.lineas.length
          : 0;
      if (!resumenMap.has(key)) {
        resumenMap.set(key, { proveedor: prov, totalCompras: 0, totalValor: 0, precioPromedio: 0 });
      }
      const r = resumenMap.get(key)!;
      r.totalCompras++;
      r.totalValor += Number(cot.total);
      r.precioPromedio = (r.precioPromedio * (r.totalCompras - 1) + precioPromLinea) / r.totalCompras;
    }

    const datos = [...resumenMap.values()]
      .sort((a, b) => a.precioPromedio - b.precioPromedio)
      .slice(0, 5)
      .map((r, i) => ({
        posicion: i + 1,
        proveedor: r.proveedor.razonSocial || r.proveedor.nombreCompleto,
        codigo: r.proveedor.codigoProveedor,
        precioPromedio: Math.round(r.precioPromedio),
        totalCompras: r.totalCompras,
      }));

    if (!datos.length) {
      return { pregunta, intent: 'menor_precio', respuesta: 'No hay cotizaciones registradas para comparar precios.', datos: [] };
    }

    const top = datos[0];
    return {
      pregunta,
      intent: 'menor_precio',
      respuesta: `El proveedor con menor precio promedio es **${top.proveedor}** (${top.codigo}) con un precio promedio de $${top.precioPromedio.toLocaleString('es-CO')} COP, basado en ${top.totalCompras} cotizaci${top.totalCompras === 1 ? 'ón' : 'ones'}.`,
      datos,
    };
  }

  private async proveedorMasRapido(pregunta: string, empresaId?: string): Promise<Respuesta> {
    const where: any = { tiempoEntrega: { not: null } };
    if (empresaId) where.empresaId = empresaId;

    const cotizaciones = await this.prisma.cotizacion.findMany({
      where,
      select: {
        tiempoEntrega: true,
        proveedor: { select: { id: true, codigoProveedor: true, razonSocial: true, nombreCompleto: true } },
      },
    });

    const mapaEntrega = new Map<string, { proveedor: any; sumaEntrega: number; count: number }>();

    for (const cot of cotizaciones) {
      const key = cot.proveedor.id;
      if (!mapaEntrega.has(key)) mapaEntrega.set(key, { proveedor: cot.proveedor, sumaEntrega: 0, count: 0 });
      const r = mapaEntrega.get(key)!;
      r.sumaEntrega += cot.tiempoEntrega!;
      r.count++;
    }

    const datos = [...mapaEntrega.values()]
      .map((r) => ({
        proveedor: r.proveedor.razonSocial || r.proveedor.nombreCompleto,
        codigo: r.proveedor.codigoProveedor,
        promedioEntregaDias: Math.round(r.sumaEntrega / r.count),
        totalCotizaciones: r.count,
      }))
      .sort((a, b) => a.promedioEntregaDias - b.promedioEntregaDias)
      .slice(0, 5)
      .map((r, i) => ({ posicion: i + 1, ...r }));

    if (!datos.length) {
      return { pregunta, intent: 'mas_rapido', respuesta: 'No hay datos de tiempo de entrega registrados.', datos: [] };
    }

    const top = datos[0];
    return {
      pregunta,
      intent: 'mas_rapido',
      respuesta: `El proveedor que entrega más rápido es **${top.proveedor}** (${top.codigo}) con un promedio de ${top.promedioEntregaDias} día${top.promedioEntregaDias === 1 ? '' : 's'} de entrega.`,
      datos,
    };
  }

  private async proveedorMasVendido(pregunta: string, empresaId?: string): Promise<Respuesta> {
    const where: any = { estado: { not: 'cancelada' } };
    if (empresaId) where.empresaId = empresaId;

    const ordenes = await this.prisma.ordenCompra.findMany({
      where,
      select: {
        totalOrden: true,
        proveedor: { select: { id: true, codigoProveedor: true, razonSocial: true, nombreCompleto: true } },
      },
    });

    const mapa = new Map<string, { proveedor: any; totalOrdenes: number; totalValor: number }>();

    for (const ord of ordenes) {
      const key = ord.proveedor.id;
      if (!mapa.has(key)) mapa.set(key, { proveedor: ord.proveedor, totalOrdenes: 0, totalValor: 0 });
      const r = mapa.get(key)!;
      r.totalOrdenes++;
      r.totalValor += Number(ord.totalOrden);
    }

    const datos = [...mapa.values()]
      .sort((a, b) => b.totalValor - a.totalValor)
      .slice(0, 5)
      .map((r, i) => ({
        posicion: i + 1,
        proveedor: r.proveedor.razonSocial || r.proveedor.nombreCompleto,
        codigo: r.proveedor.codigoProveedor,
        totalOrdenes: r.totalOrdenes,
        totalValorCOP: Math.round(r.totalValor),
      }));

    if (!datos.length) {
      return { pregunta, intent: 'mas_vendido', respuesta: 'No hay órdenes de compra registradas aún.', datos: [] };
    }

    const top = datos[0];
    return {
      pregunta,
      intent: 'mas_vendido',
      respuesta: `El proveedor que más ha vendido a la empresa es **${top.proveedor}** (${top.codigo}) con ${top.totalOrdenes} orden${top.totalOrdenes === 1 ? '' : 'es'} por un total de $${top.totalValorCOP.toLocaleString('es-CO')} COP.`,
      datos,
    };
  }

  private async proveedoresMasConfiables(pregunta: string, empresaId?: string): Promise<Respuesta> {
    const whereCot: any = {};
    if (empresaId) whereCot.empresaId = empresaId;

    const cotizaciones = await this.prisma.cotizacion.findMany({
      where: whereCot,
      select: {
        calificacion: true,
        historico: true,
        tiempoEntrega: true,
        total: true,
        proveedor: { select: { id: true, codigoProveedor: true, razonSocial: true, nombreCompleto: true } },
      },
    });

    const mapa = new Map<string, { proveedor: any; sumaCal: number; countCal: number; historico: number; sumaEntrega: number; countEntrega: number }>();

    for (const cot of cotizaciones) {
      const key = cot.proveedor.id;
      if (!mapa.has(key)) mapa.set(key, { proveedor: cot.proveedor, sumaCal: 0, countCal: 0, historico: 0, sumaEntrega: 0, countEntrega: 0 });
      const r = mapa.get(key)!;
      if (cot.calificacion) { r.sumaCal += Number(cot.calificacion); r.countCal++; }
      r.historico = Math.max(r.historico, cot.historico);
      if (cot.tiempoEntrega) { r.sumaEntrega += cot.tiempoEntrega; r.countEntrega++; }
    }

    const datos = [...mapa.values()]
      .map((r) => {
        const calProm = r.countCal > 0 ? r.sumaCal / r.countCal : 3;
        const entregaProm = r.countEntrega > 0 ? r.sumaEntrega / r.countEntrega : 30;
        const entregaScore = Math.max(0, 5 - entregaProm / 10);
        const historicalScore = Math.min(5, r.historico / 2);
        const score = calProm * 0.5 + entregaScore * 0.3 + historicalScore * 0.2;
        return {
          proveedor: r.proveedor.razonSocial || r.proveedor.nombreCompleto,
          codigo: r.proveedor.codigoProveedor,
          calificacionPromedio: Math.round(calProm * 10) / 10,
          comprasPrevias: r.historico,
          puntuacion: Math.round(score * 10) / 10,
        };
      })
      .sort((a, b) => b.puntuacion - a.puntuacion)
      .slice(0, 3)
      .map((r, i) => ({ posicion: i + 1, ...r }));

    if (!datos.length) {
      return { pregunta, intent: 'mas_confiable', respuesta: 'No hay datos suficientes para calcular confiabilidad de proveedores.', datos: [] };
    }

    const lista = datos.map((d) => `${d.posicion}. **${d.proveedor}** — puntuación ${d.puntuacion}/5`).join('\n');
    return {
      pregunta,
      intent: 'mas_confiable',
      respuesta: `Los 3 proveedores más confiables basados en calificación, historial y velocidad de entrega son:\n${lista}`,
      datos,
    };
  }
}
