import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Ensure .env is loaded before PrismaClient reads DATABASE_URL
// Try multiple locations to handle Turborepo (cwd=root) and direct run (cwd=apps/api)
const envPaths = [
  resolve(process.cwd(), 'apps', 'api', '.env'),  // turborepo root
  resolve(process.cwd(), '.env'),                   // direct run or root .env
  resolve(process.cwd(), '..', '..', '.env'),       // from apps/api/ to root
  resolve(__dirname, '..', '..', '..', '.env'),     // from dist/database/ to apps/api/
];

for (const envPath of envPaths) {
  if (!process.env.DATABASE_URL && existsSync(envPath)) {
    config({ path: envPath });
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasourceUrl: process.env.DATABASE_URL,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
