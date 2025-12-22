import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/database"

export async function POST(req: NextRequest) {
  try {
    console.log("Adding missing columns to crm_leads table...")
    
    await sql`ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS document_id TEXT`
    console.log("✓ Added document_id column")
    
    await sql`ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS document_answers JSONB`
    console.log("✓ Added document_answers column")
    
    await sql`ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS last_contact TIMESTAMP`
    console.log("✓ Added last_contact column")
    
    return NextResponse.json({
      success: true,
      message: "CRM migration completed successfully",
      columns: ["document_id", "document_answers", "last_contact"]
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
