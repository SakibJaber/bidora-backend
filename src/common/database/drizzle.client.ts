require('dotenv').config()
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not defined in drizzle.client.ts!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_USE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
