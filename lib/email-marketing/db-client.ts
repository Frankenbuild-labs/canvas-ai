// Database client that works with both Neon (production) and local PostgreSQL (development)
import { Pool } from "pg";

// Check if we're using Neon (has specific URL pattern) or local PostgreSQL
const isNeonDatabase = process.env.DATABASE_URL?.includes("neon.tech");

let pool: Pool | null = null;

// Create PostgreSQL pool for local development
if (!isNeonDatabase && process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

/**
 * Execute SQL query with parameters
 * Works with both Neon (@neondatabase/serverless) and local PostgreSQL (pg)
 */
export async function query(text: string, params?: any[]) {
  if (isNeonDatabase) {
    // Use Neon serverless for production
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    // Neon expects tagged template calls. Provide a minimal adapter:
    if (!params || params.length === 0) {
      // Best-effort: call as a single-part template
      return await sql([text] as unknown as TemplateStringsArray);
    }
    // For simple positional params, perform a safe-ish interpolation for Neon
    // WARNING: This is a limited adapter; for production, prefer refactoring callers to use tagged templates
    const interpolated = text.replace(/\$(\d+)/g, (_, idx) => {
      const i = Number(idx) - 1;
      const v = params[i];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    return await sql([interpolated] as unknown as TemplateStringsArray);
  } else {
    // Use regular PostgreSQL pool for local development
    if (!pool) {
      throw new Error("Database pool not initialized");
    }
    const result = await pool.query(text, params);
    return result.rows;
  }
}

/**
 * Close database connections
 */
export async function closeConnections() {
  if (pool) {
    await pool.end();
  }
}
