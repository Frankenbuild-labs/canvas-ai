import { NextResponse } from "next/server"
import sql from "@/lib/database"

export async function GET() {
  try {
    // Check if old tables exist and have data
    let oldCrmLeads = []
    let oldEmailContacts = []
    
    try {
      oldCrmLeads = await sql`SELECT COUNT(*)::int as count FROM crm_leads`
    } catch (e) {
      console.log('crm_leads table does not exist')
    }
    
    try {
      oldEmailContacts = await sql`SELECT COUNT(*)::int as count FROM email_contacts`
    } catch (e) {
      console.log('email_contacts table does not exist')
    }
    
    // Check unified contacts table
    const unifiedContacts = await sql`SELECT COUNT(*)::int as count FROM contacts`
    
    return NextResponse.json({ 
      oldCrmLeads: oldCrmLeads[0]?.count || 0,
      oldEmailContacts: oldEmailContacts[0]?.count || 0,
      unifiedContacts: unifiedContacts[0]?.count || 0
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
