import { NextResponse } from "next/server"
import sql from "@/lib/database"
import { DatabaseService } from "@/lib/database"

export async function GET() {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    console.log('[SIMPLE-TEST] userId:', userId)
    
    // Exact same query as CRM
    const contacts = await sql(`SELECT * FROM contacts WHERE user_id = $1 LIMIT 5`, [userId])
    
    console.log('[SIMPLE-TEST] Contacts found:', contacts.length)
    
    return NextResponse.json({ 
      userId,
      count: contacts.length,
      contacts: contacts.map((c: any) => ({ name: c.name, email: c.email, user_id: c.user_id }))
    })
  } catch (e: any) {
    console.error('[SIMPLE-TEST] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
