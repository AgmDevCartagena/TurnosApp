import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as net from 'net';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const db = await this.checkDatabase();
    const redis = await this.checkRedis();

    const status = db.status === 'ok' && redis.status === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: db,
      redis,
    };
  }

  private async checkDatabase() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - start;
      const [paises, departamentos, ciudades] = await Promise.all([
        this.prisma.pais.count(),
        this.prisma.departamento.count(),
        this.prisma.ciudad.count(),
      ]);
      return {
        status: 'ok',
        duration: `${duration}ms`,
        counts: { paises, departamentos, ciudades },
      };
    } catch (error) {
      this.logger.error('Health check DB failed', error);
      return { status: 'error', error: (error as Error).message };
    }
  }

  private checkRedis(): Promise<{ status: string; duration?: string; error?: string }> {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const start = Date.now();

    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ status: 'error', error: 'Connection timeout' });
      }, 2000);

      socket.connect(port, host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ status: 'ok', duration: `${Date.now() - start}ms` });
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ status: 'error', error: err.message });
      });
    });
  }
}
