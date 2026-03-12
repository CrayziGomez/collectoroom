/**
 * Database Service - PostgreSQL
 * Replaces Firebase Firestore
 *
 * This module provides a clean abstraction over the database,
 * making it easy to swap implementations if needed.
 */

import { Pool, PoolClient } from 'pg';

// Singleton pool instance
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

/**
 * Execute a query with automatic connection handling
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/**
 * Execute a query and return single row or null
 */
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper to build INSERT statements
 */
export function buildInsert(
  table: string,
  data: Record<string, any>
): { text: string; values: any[] } {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.map(k => camelToSnake(k)).join(', ');

  return {
    text: `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
    values,
  };
}

/**
 * Helper to build UPDATE statements
 */
export function buildUpdate(
  table: string,
  data: Record<string, any>,
  whereColumn: string,
  whereValue: any
): { text: string; values: any[] } {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys
    .map((k, i) => `${camelToSnake(k)} = $${i + 1}`)
    .join(', ');

  values.push(whereValue);

  return {
    text: `UPDATE ${table} SET ${setClause} WHERE ${camelToSnake(whereColumn)} = $${values.length} RETURNING *`,
    values,
  };
}

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case row to camelCase object
 */
export function snakeToCamel<T>(row: Record<string, any>): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

/**
 * Convert array of snake_case rows to camelCase objects
 */
export function snakeToCamelArray<T>(rows: Record<string, any>[]): T[] {
  return rows.map(row => snakeToCamel<T>(row));
}

// Export pool for advanced use cases
export { getPool };
