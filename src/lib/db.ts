import { Pool, PoolClient } from 'pg';

// Create a singleton connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'portyfoul',
      user: process.env.POSTGRES_USER || 'portyfoul',
      password: process.env.POSTGRES_PASSWORD || 'portyfoul',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not established
    });

    // Error handler for the pool
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

/**
 * Execute a query and return the number of affected rows
 * Useful for DELETE, UPDATE operations where you need to know how many rows were affected
 */
export async function execute(
  text: string,
  params?: any[]
): Promise<number> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rowCount ?? 0;
}

// For graceful shutdown
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
