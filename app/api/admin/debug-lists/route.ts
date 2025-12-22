import { NextRequest, NextResponse } from 'next/server'
import sql from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const lists = await sql`SELECT * FROM contact_lists ORDER BY created_at DESC LIMIT 10`
    
    return NextResponse.json({
      success: true,
      count: lists.length,
      lists
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
