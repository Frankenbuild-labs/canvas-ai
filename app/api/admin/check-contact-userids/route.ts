import { NextResponse } from "next/server"
import sql from "@/lib/database"
import { DatabaseService } from "@/lib/database"

export async function GET() {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    
    // Get ALL contacts regardless of user_id
    const allContacts = await sql`SELECT id, name, email, user_id FROM contacts LIMIT 20`
    
    // Get contacts with test user_id
    const testUserContacts = await sql`SELECT id, name, email, user_id FROM contacts WHERE user_id = ${userId} LIMIT 20`
    
    return NextResponse.json({ 
      testUserId: userId,
      allContactsCount: allContacts.length,
      testUserContactsCount: testUserContacts.length,
      allContacts: allContacts.map((c: any) => ({ 
        id: c.id, 
        name: c.name || '(empty)', 
        email: c.email || '(empty)', 
        user_id: c.user_id 
      })),
      testUserContacts: testUserContacts.map((c: any) => ({ 
        id: c.id, 
        name: c.name || '(empty)', 
        email: c.email || '(empty)', 
        user_id: c.user_id 
      }))
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 })
  }
}
