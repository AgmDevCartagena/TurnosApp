import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SessionData } from '../interfaces/session-data.interface';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly redis: Redis;
  private readonly sessionTTL: number;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.sessionDb', 1),
    });

    this.sessionTTL = this.configService.get<number>('session.ttl', 86400);
  }

  async createSession(sessionId: string, data: Partial<SessionData>): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const sessionData: SessionData = {
      userId: data.userId!,
      email: data.email!,
      authProvider: data.authProvider!,
      activeCompanyId: data.activeCompanyId || null,
      companies: data.companies || [],
      activeRoles: data.activeRoles || [],
      activePermissions: data.activePermissions || [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    await this.redis.setex(key, this.sessionTTL, JSON.stringify(sessionData));
    this.logger.log(`Sesión creada: ${sessionId} para usuario ${data.userId}`);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = this.getSessionKey(sessionId);
    const data = await this.redis.get(key);
    
    if (!data) {
      return null;
    }

    const session = JSON.parse(data) as SessionData;
    
    await this.redis.setex(
      key,
      this.sessionTTL,
      JSON.stringify({
        ...session,
        lastActivity: Date.now(),
      }),
    );

    return session;
  }

  async destroySession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.redis.del(key);
    this.logger.log(`Sesión destruida: ${sessionId}`);
  }

  async destroyAllUserSessions(userId: string): Promise<void> {
    const pattern = `session:*`;
    const keys = await this.redis.keys(pattern);
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data) as SessionData;
        if (session.userId === userId) {
          await this.redis.del(key);
        }
      }
    }
    
    this.logger.log(`Todas las sesiones destruidas para usuario: ${userId}`);
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Sesión no encontrada');
    }

    const updatedSession = {
      ...session,
      ...updates,
      lastActivity: Date.now(),
    };

    const key = this.getSessionKey(sessionId);
    await this.redis.setex(key, this.sessionTTL, JSON.stringify(updatedSession));
    this.logger.log(`Sesión actualizada: ${sessionId}`);
  }

  async setActiveCompany(
    sessionId: string,
    companyId: string,
    roles: string[],
    permissions: string[],
  ): Promise<void> {
    await this.updateSession(sessionId, {
      activeCompanyId: companyId,
      activeRoles: roles,
      activePermissions: permissions,
    });
  }

  async extendSession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.redis.expire(key, this.sessionTTL);
  }

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
