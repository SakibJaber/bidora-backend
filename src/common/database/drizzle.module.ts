import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE_CONNECTION');

@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<NodePgDatabase<typeof schema>> => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const useSSL = configService.get<string>('DB_USE_SSL') === 'true';

        if (!databaseUrl) {
          throw new Error('❌ DATABASE_URL is not defined!');
        }

        const isNeon = databaseUrl.includes('neon.tech');

        const pool = new Pool({
          connectionString: databaseUrl,
          ssl: useSSL || isNeon ? { rejectUnauthorized: false } : false,
        });

        console.log('[Drizzle] PostgreSQL Pool initialized ');
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
