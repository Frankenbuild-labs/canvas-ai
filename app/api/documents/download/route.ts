import { type NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get("file")

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    // Security: Only allow files from the documents directory
    const documentsDir = path.join(process.cwd(), "documents")
    const filePath = path.join(documentsDir, filename)

    // Ensure the file path is within the documents directory
    if (!filePath.startsWith(documentsDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 403 })
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath)

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase()
    let contentType = "application/octet-stream"

    switch (ext) {
      case ".pdf":
        contentType = "application/pdf"
        break
      case ".docx":
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        break
      case ".xlsx":
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        break
      case ".pptx":
        contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        break
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
