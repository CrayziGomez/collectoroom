/**
 * Database Service - PostgreSQL
 * Replaces Firebase Firestore
 *
 * This module provides a clean abstraction over the database,
 * making it easy to swap implementations if needed.
 */

import prisma from './prisma';

/**
 * Query helper using Prisma's raw query API.
 * Note: This keeps the old `query(text, params)` signature for compatibility,
 * but uses simple parameter escaping for substitution. For new code prefer
 * using the generated Prisma client methods (e.g. `prisma.user.findMany`).
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  let sql = text;
  if (params && params.length) {
    // Basic escaping for strings; not intended for untrusted SQL construction.
    params.forEach((p, i) => {
      const idx = `$${i + 1}`;
      const val = p === null || p === undefined ? 'NULL' : (typeof p === 'string' ? `'${String(p).replace(/'/g, "''")}'` : JSON.stringify(p));
      sql = sql.split(idx).join(val);
    });
  }

  // Use Prisma's unsafe raw API to run the final SQL string.
  // Prefer `prisma.$queryRaw` with template literals in new code.
  // @ts-ignore
  const res = await prisma.$queryRawUnsafe(sql);
  return res as T[];
}

/**
 * Return single row or null
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Transaction helper using `prisma.$transaction`.
 * The callback receives a transactional Prisma client.
 */
export async function transaction<T>(callback: (tx: typeof prisma) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => callback(tx as typeof prisma));
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

// Export prisma client for advanced use cases
export { default as getPool } from './prisma';
