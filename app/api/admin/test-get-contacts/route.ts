import { NextResponse } from "next/server"
import { getEmailContacts } from "@/lib/email-marketing/database"
import { DatabaseService } from "@/lib/database"

export async function GET() {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    console.log('[TEST] Getting contacts for userId:', userId)
    
    const result = await getEmailContacts(userId, {
      limit: 5,
      skip: 0
    })
    
    console.log('[TEST] Result:', { contactsCount: result.contacts.length, total: result.total })
    
    return NextResponse.json({ 
      success: true,
      userId,
      contactsCount: result.contacts.length,
      total: result.total,
      contacts: result.contacts
    })
  } catch (e: any) {
    console.error('[TEST] Error:', e)
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 })
  }
}
