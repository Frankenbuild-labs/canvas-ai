import { NextResponse } from "next/server"
import sql from "@/lib/database"
import { DatabaseService } from "@/lib/database"

export async function POST() {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    
    // Update all contacts to have the test user_id
    const result = await sql`UPDATE contacts SET user_id = ${userId} WHERE user_id IS NULL OR user_id != ${userId}`
    
    // Count contacts after update
    const count = await sql`SELECT COUNT(*)::int as count FROM contacts WHERE user_id = ${userId}`
    
    return NextResponse.json({ 
      success: true,
      userId,
      rowsUpdated: result.length,
      totalContactsForUser: count[0]?.count || 0
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 })
  }
}
