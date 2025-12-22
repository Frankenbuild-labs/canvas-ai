import { NextResponse } from "next/server"
import sql from "@/lib/database"
import { DatabaseService } from "@/lib/database"

export async function GET() {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    
    // Test 1: Template literal style
    const test1 = await sql`SELECT COUNT(*)::int as count FROM contacts WHERE user_id = ${userId}`
    
    // Test 2: Function call style
    const test2 = await sql(`SELECT COUNT(*)::int as count FROM contacts WHERE user_id = $1`, [userId])
    
    return NextResponse.json({ 
      userId,
      templateStyle: test1[0],
      functionStyle: test2[0]
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 })
  }
}
