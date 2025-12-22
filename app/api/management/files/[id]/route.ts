import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/database"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET_NAME = "management-files"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get file from database
    const files = await sql`SELECT * FROM management_files WHERE id = ${id} LIMIT 1`

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const file = files[0]

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([file.storage_path])

    if (deleteError) {
      console.error("Failed to delete from storage:", deleteError)
    }

    // Delete from database
    await sql`DELETE FROM management_files WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Failed to delete file:", error)
    return NextResponse.json(
      { error: "Failed to delete file", details: error.message },
      { status: 500 }
    )
  }
}
