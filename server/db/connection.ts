import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config: PoolConfig = {
  host: process.env['DB_HOST'] || '127.0.0.1',
  port: parseInt(process.env['DB_PORT'] || '5432', 10),
  user: process.env['DB_USER'] || 'postgres',
  password: process.env['DB_PASSWORD'] || 'postgres',
  database: process.env['DB_NAME'] || 'rental_car_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Database Connection Pool
export const pool = new Pool(
  process.env['DATABASE_URL'] ? { connectionString: process.env['DATABASE_URL'] } : config
);

// Drizzle ORM instance with attached schema
export const db = drizzle(pool, { schema });

/**
 * Tests connection to the PostgreSQL database server and returns server version & current db
 */
export async function testConnection(): Promise<{ success: boolean; database?: string; version?: string; schema?: string; error?: string }> {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT current_database() AS db, version() AS version, current_schema() AS schema');
    return {
      success: true,
      database: res.rows[0].db,
      version: res.rows[0].version,
      schema: res.rows[0].schema,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || String(err),
    };
  } finally {
    if (client) client.release();
  }
}

export * from './schema';
