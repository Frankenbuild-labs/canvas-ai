import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import sql from "@/lib/database"

export async function GET() {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    
    // Check contacts in database
    const allContacts = await sql`SELECT id, name, email, user_id FROM contacts LIMIT 5`
    const userContacts = await sql`SELECT COUNT(*)::int as count FROM contacts WHERE user_id = ${userId}`
    
    return NextResponse.json({ 
      userId,
      allContactsCount: allContacts.length,
      userContactsCount: userContacts[0]?.count || 0,
      sampleContacts: allContacts.map((c: any) => ({
        id: c.id,
        name: c.name || '(empty)',
        email: c.email || '(empty)',
        user_id: c.user_id
      }))
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
