import { NextResponse } from 'next/server'

// This route previously imported leads from a local JSONL file into the database.
// For production, file-based CRM fallbacks are disabled and Supabase is the sole source of truth.
// We keep this route as a no-op stub to avoid 404s if anything still calls it.

export async function POST() {
  return NextResponse.json({ ok: false, error: 'crm-file-import-disabled' }, { status: 410 })
}
