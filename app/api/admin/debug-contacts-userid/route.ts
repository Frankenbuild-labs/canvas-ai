import { NextResponse } from "next/server"
import sql from "@/lib/database"

export async function GET() {
  try {
    const contacts = await sql`SELECT id, name, email, user_id FROM contacts LIMIT 5`
    return NextResponse.json({ contacts })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 })
  }
}
