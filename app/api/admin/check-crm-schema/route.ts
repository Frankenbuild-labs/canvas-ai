import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/database"

export async function GET(req: NextRequest) {
  try {
    // Check current table structure
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'crm_leads'
      ORDER BY ordinal_position
    `
    
    return NextResponse.json({
      success: true,
      columns: columns
    })

  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
