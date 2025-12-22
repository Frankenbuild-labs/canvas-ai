import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/database"

export async function POST(req: NextRequest) {
  try {
    console.log("Adding user_id column to crm tables...")
    
    // Add user_id to crm_leads
    await sql`ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS user_id TEXT`
    console.log("✓ Added user_id to crm_leads")
    
    // Create index on user_id
    await sql`CREATE INDEX IF NOT EXISTS idx_crm_leads_user_id ON crm_leads(user_id)`
    console.log("✓ Created index on user_id")
    
    // Add user_id to crm_lists
    await sql`ALTER TABLE crm_lists ADD COLUMN IF NOT EXISTS user_id TEXT`
    console.log("✓ Added user_id to crm_lists")
    
    return NextResponse.json({
      success: true,
      message: "Added user_id columns successfully"
    })

  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: String(error)
      },
      { status: 500 }
    )
  }
}
