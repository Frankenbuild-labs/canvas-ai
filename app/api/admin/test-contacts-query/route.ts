import { NextRequest, NextResponse } from 'next/server'
import sql from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    // Direct raw query
    const contacts = await sql`SELECT * FROM contacts LIMIT 5`
    
    // Try with executeQuery style
    const contacts2 = await (sql as any)('SELECT * FROM contacts LIMIT 5', [])
    
    return NextResponse.json({
      success: true,
      method1_count: contacts.length,
      method1_sample: contacts[0],
      method2_count: contacts2.length,
      method2_sample: contacts2[0]
    })
  } catch (error) {
    return NextResponse.json({ error: String(error), stack: error.stack }, { status: 500 })
  }
}
