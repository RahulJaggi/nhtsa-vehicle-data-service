import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('database.url');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in configuration');
    }

    // using the pg adapter so Prisma shares the same connection pool as the rest of the app
    const pool = new Pool({ connectionString: databaseUrl });
    pool.on('error', (err) => {
      console.error('PG Connection Pool Error:', err);
    });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    // disconnect Prisma first, then drain the pool
    await this.$disconnect();
    await this.pool.end();
  }
}
