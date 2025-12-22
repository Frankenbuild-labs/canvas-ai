import { NextRequest, NextResponse } from "next/server"
// Uses request.url/search params - avoid static prerender at build time
export const dynamic = 'force-dynamic'

// Mock media storage - replace with actual database
let mediaItems: any[] = []
let folders: string[] = ["Images", "Videos", "Documents"]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  // Handle folders request
  if (action === "folders") {
    return NextResponse.json({ folders })
  }

  // Handle media list request
  const limit = parseInt(searchParams.get("limit") || "24")
  const skip = parseInt(searchParams.get("skip") || "0")
  const sort = searchParams.get("sort") || "-created_at"
  const folder = searchParams.get("folder")
  const search = searchParams.get("search")

  let filteredItems = [...mediaItems]

  // Filter by folder
  if (folder) {
    filteredItems = filteredItems.filter((item) => item.folder === folder)
  }

  // Filter by search
  if (search) {
    const searchLower = search.toLowerCase()
    filteredItems = filteredItems.filter(
      (item) =>
        item.name.toLowerCase().includes(searchLower) ||
        item.alt?.toLowerCase().includes(searchLower)
    )
  }

  // Sort
  if (sort.startsWith("-")) {
    const field = sort.substring(1)
    filteredItems.sort((a, b) => (b[field] > a[field] ? 1 : -1))
  } else {
    filteredItems.sort((a, b) => (a[sort] > b[sort] ? 1 : -1))
  }

  // Paginate
  const paginatedItems = filteredItems.slice(skip, skip + limit)

  return NextResponse.json({
    items: paginatedItems,
    total: filteredItems.length,
    hasMore: skip + limit < filteredItems.length,
  })
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Generate ID
    const id = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const newMedia = {
      id,
      name: data.name || "Untitled",
      url: data.url || data.file,
      type: data.type || "image",
      size: data.size || 0,
      folder: data.folder || "Images",
      alt: data.alt || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mediaItems.push(newMedia)

    return NextResponse.json(newMedia, { status: 201 })
  } catch (error) {
    console.error("Error creating media:", error)
    return NextResponse.json({ error: "Failed to create media" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get("ids")?.split(",") || []

    if (ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 })
    }

    mediaItems = mediaItems.filter((item) => !ids.includes(item.id))

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error("Error deleting media:", error)
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 })
  }
}
