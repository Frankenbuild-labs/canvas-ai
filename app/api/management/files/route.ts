import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import sql from "@/lib/database"
import { randomUUID } from "crypto"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET_NAME = "management-files"

// GET /api/management/files - List all files
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId") || "demo-user"
    const category = url.searchParams.get("category")

    let files
    if (category && category !== "all") {
      files = await sql`SELECT * FROM management_files WHERE user_id = ${userId} AND file_category = ${category} ORDER BY created_at DESC`
    } else {
      files = await sql`SELECT * FROM management_files WHERE user_id = ${userId} ORDER BY created_at DESC`
    }

    const serialized = files.map((f: any) => ({
      id: f.id,
      userId: f.user_id,
      fileName: f.file_name,
      fileType: f.file_type,
      fileCategory: f.file_category,
      fileSize: Number(f.file_size),
      storagePath: f.storage_path,
      storageUrl: f.storage_url,
      tags: f.tags || [],
      metadata: f.metadata,
      createdAt: f.created_at?.toISOString(),
      updatedAt: f.updated_at?.toISOString(),
    }))

    return NextResponse.json({ files: serialized })
  } catch (error: any) {
    console.error("Failed to list files:", error)
    return NextResponse.json(
      { error: "Failed to list files", details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/management/files - Upload a file
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string || "demo-user" // TODO: Get from auth
    const category = formData.get("category") as string || "other"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)
    
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      })
    }

    // Upload to Supabase Storage
    const timestamp = Date.now()
    const fileName = file.name
    const storagePath = `${userId}/${timestamp}-${fileName}`
    
    const arrayBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)

    // Determine category from file type if not provided
    let fileCategory = category
    if (category === "other") {
      if (file.type.startsWith("image/")) fileCategory = "images"
      else if (file.type.startsWith("video/")) fileCategory = "videos"
      else if (file.type.startsWith("audio/")) fileCategory = "audio"
      else if (file.type.includes("pdf") || file.type.includes("document")) fileCategory = "documents"
    }

    // Save to database
    const id = randomUUID()
    await sql`
      INSERT INTO management_files (
        id, user_id, file_name, file_type, file_category, 
        file_size, storage_path, storage_url, tags, metadata
      ) VALUES (
        ${id}, ${userId}, ${fileName}, ${file.type}, ${fileCategory},
        ${file.size}, ${storagePath}, ${urlData.publicUrl}, 
        ARRAY[]::TEXT[], ${JSON.stringify({ originalName: fileName, uploadedAt: new Date().toISOString() })}::JSONB
      )
    `

    return NextResponse.json({ 
      file: {
        id,
        userId,
        fileName,
        fileType: file.type,
        fileCategory,
        fileSize: file.size,
        storagePath,
        storageUrl: urlData.publicUrl,
        tags: [],
        metadata: { originalName: fileName, uploadedAt: new Date().toISOString() },
      }
    })
  } catch (error: any) {
    console.error("Failed to upload file:", error)
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
      { status: 500 }
    )
  }
}
