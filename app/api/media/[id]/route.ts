import { NextRequest, NextResponse } from "next/server"

// Mock media storage - in production, use a database
let mediaItems: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const item = mediaItems.find((m) => m.id === params.id)

  if (!item) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 })
  }

  return NextResponse.json(item)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    const index = mediaItems.findIndex((m) => m.id === params.id)

    if (index === -1) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    // Update media item
    mediaItems[index] = {
      ...mediaItems[index],
      ...data,
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json(mediaItems[index])
  } catch (error) {
    console.error("Error updating media:", error)
    return NextResponse.json({ error: "Failed to update media" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const index = mediaItems.findIndex((m) => m.id === params.id)

    if (index === -1) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    mediaItems.splice(index, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting media:", error)
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 })
  }
}
