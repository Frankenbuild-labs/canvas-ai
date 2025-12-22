import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/prisma"

const prisma = getPrisma()

export async function POST(req: NextRequest) {
  try {
    console.log('Starting database migration...')
    
    // Create management_files table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS management_files (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_category TEXT NOT NULL,
          file_size BIGINT NOT NULL,
          storage_path TEXT NOT NULL,
          storage_url TEXT NOT NULL,
          tags TEXT[] DEFAULT ARRAY[]::TEXT[],
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    console.log('✓ Created management_files table')

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_management_files_user_id ON management_files(user_id)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_management_files_file_category ON management_files(file_category)`)
    console.log('✓ Created management_files indexes')

    // Create memory_items table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS memory_items (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          title TEXT,
          content TEXT,
          file_url TEXT,
          file_name TEXT,
          file_type TEXT,
          metadata JSONB,
          tags TEXT[] DEFAULT ARRAY[]::TEXT[],
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    console.log('✓ Created memory_items table')

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_memory_items_user_id ON memory_items(user_id)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_memory_items_kind ON memory_items(kind)`)
    console.log('✓ Created memory_items indexes')
    
    console.log('Migration completed successfully!')

    return NextResponse.json({
      success: true,
      message: "Database migration completed successfully",
      tables: ["management_files", "memory_items"]
    })

  } catch (error: any) {
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
