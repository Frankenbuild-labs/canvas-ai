import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/database"

export async function POST(req: NextRequest) {
  try {
    console.log("Creating CRM tables...")
    
    // Create crm_leads table with all necessary columns
    await sql`
      CREATE TABLE IF NOT EXISTS crm_leads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        position TEXT,
        status TEXT DEFAULT 'new',
        value NUMERIC DEFAULT 0,
        source TEXT,
        notes TEXT,
        last_contact TIMESTAMP,
        document_id TEXT,
        document_answers JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log("✓ Created crm_leads table")
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_crm_leads_company ON crm_leads(company)`
    console.log("✓ Created indexes")
    
    // Create crm_lists table
    await sql`
      CREATE TABLE IF NOT EXISTS crm_lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log("✓ Created crm_lists table")
    
    // Create crm_list_members junction table
    await sql`
      CREATE TABLE IF NOT EXISTS crm_list_members (
        list_id TEXT NOT NULL,
        lead_id TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (list_id, lead_id)
      )
    `
    console.log("✓ Created crm_list_members table")
    
    await sql`CREATE INDEX IF NOT EXISTS idx_crm_list_members_list ON crm_list_members(list_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_crm_list_members_lead ON crm_list_members(lead_id)`
    console.log("✓ Created list member indexes")
    
    return NextResponse.json({
      success: true,
      message: "CRM tables created successfully",
      tables: ["crm_leads", "crm_lists", "crm_list_members"]
    })

  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error.message
      },
      { status: 500 }
    )
  }
}
