// Apply email marketing schema migration using Neon serverless client
// Usage: node scripts/apply-email-migration.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { neon } from '@neondatabase/serverless';
import { Client as PgClient } from 'pg';

async function loadDatabaseUrl() {
  let { DATABASE_URL } = process.env;
  if (DATABASE_URL) return DATABASE_URL;
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = await readFile(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/i);
      if (m) return m[1].replace(/^"|"$/g, '');
    }
  } catch {}
  return '';
}

async function main() {
  const DATABASE_URL = await loadDatabaseUrl();
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set. Set env var or add it to .env.local');
    process.exit(1);
  }

  // Decide driver based on host
  const url = new URL(DATABASE_URL);
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const isNeon = /neon\.tech$/i.test(url.hostname);

  const sqlPath = path.resolve(process.cwd(), 'scripts', '004_create_email_marketing_tables.sql');
  const ddl = await readFile(sqlPath, 'utf8');

  console.log('Applying email marketing migration from', sqlPath);

  try {
    if (isLocal || !isNeon) {
      // Use pg for local or non-Neon standard Postgres
      const client = new PgClient({ connectionString: DATABASE_URL });
      await client.connect();
      try {
        await client.query(ddl);
      } finally {
        await client.end();
      }
    } else {
      // Use Neon serverless for Neon-hosted DBs
      const sql = neon(DATABASE_URL);
      await sql.query(ddl);
    }
    console.log('Email marketing migration applied successfully');
  } catch (err) {
    console.error('Failed to apply migration:', err?.message || err);
    process.exit(1);
  }
}

main();
