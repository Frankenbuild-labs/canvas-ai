import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import sql from "@/lib/database"
import { DatabaseService } from "@/lib/database"
import { randomUUID } from "crypto"

export async function POST() {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const filePath = path.join(process.cwd(), "data", "crm", "leads.jsonl")
    
    // Read file leads
    const raw = await fs.readFile(filePath, "utf-8")
    const fileLeads = raw
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
    
    console.log(`Found ${fileLeads.length} leads in file storage`)
    
    // Import each lead into database
    let imported = 0
    for (const lead of fileLeads) {
      const id = lead.id || randomUUID()
      try {
        await sql(
          `INSERT INTO contacts (id, user_id, name, email, phone, company, position, status, value, source, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO NOTHING`,
          [
            id,
            userId,
            lead.name || '',
            lead.email || '',
            lead.phone || null,
            lead.company || '',
            lead.position || null,
            lead.status || 'new',
            Number(lead.value || 0),
            lead.source || null,
            lead.notes || null,
            lead.created_at || new Date().toISOString(),
            new Date().toISOString()
          ]
        )
        imported++
      } catch (e) {
        console.error(`Failed to import lead ${id}:`, e)
      }
    }
    
    // Count final contacts
    const count = await sql(`SELECT COUNT(*)::int as count FROM contacts WHERE user_id = $1`, [userId])
    
    return NextResponse.json({ 
      success: true,
      fileLeads: fileLeads.length,
      imported,
      totalInDatabase: count[0]?.count || 0
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 })
  }
}
