// Apply studio schema migration using Neon serverless client
// Usage: node scripts/apply-studio-migration.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { neon } from '@neondatabase/serverless';

async function main() {
  let { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    // Try to read from .env.local
    try {
      const envPath = path.resolve(process.cwd(), '.env.local');
      const envContent = await readFile(envPath, 'utf8');
      for (const line of envContent.split(/\r?\n/)) {
        const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/i);
        if (m) {
          DATABASE_URL = m[1].replace(/^"|"$/g, '');
          break;
        }
      }
    } catch {}
  }
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set. Set env var or add it to .env.local');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);
  const sqlPath = path.resolve(process.cwd(), 'scripts', '005_create_studio_tables.sql');
  const ddl = await readFile(sqlPath, 'utf8');

  console.log('Applying studio migration from', sqlPath);

  // Split on semicolons while preserving statements that may contain $$ ... $$ blocks
  // Simple approach: execute entire file in one go as Neon supports multiple statements.
  try {
    await sql.query(ddl);
    console.log('Studio migration applied successfully');
  } catch (err) {
    console.error('Failed to apply migration:', err?.message || err);
    process.exit(1);
  }
}

main();
