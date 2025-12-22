import { NextRequest, NextResponse } from "next/server"
// Uses request.url and may fetch external services (OnlyOffice) — treat as dynamic
export const dynamic = 'force-dynamic'
import { promises as fs } from "fs"
import path from "path"

/**
 * Generate thumbnail preview for templates using OnlyOffice Document Server
 * OnlyOffice has a conversion API that can generate thumbnails from documents
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const templatePath = searchParams.get("path")
    
    if (!templatePath) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 })
    }

    // Get the file from the filesystem
    const filePath = templatePath.replace(/^\//, "") // Remove leading slash
    const fullPath = path.join(process.cwd(), "public", filePath)
    
    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      // File doesn't exist, return placeholder
      return generatePlaceholder(templatePath)
    }

    // Use OnlyOffice Document Server to generate thumbnail
    const onlyofficeUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_DOCSERVER_URL || "http://localhost:8082"
    const fileUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${templatePath}`
    
    const ext = templatePath.split(".").pop()?.toLowerCase()
    const fileType = ext === "xlsx" ? "spreadsheet" : 
                     ext === "pptx" ? "presentation" : 
                     ext === "pdf" ? "pdf" : "word"

    // OnlyOffice conversion request
    const conversionRequest = {
      async: false,
      filetype: ext,
      key: `thumbnail_${Date.now()}_${Math.random()}`,
      outputtype: "png",
      thumbnail: {
        aspect: 1, // Keep aspect ratio
        first: true, // Only first page
        height: 400,
        width: 300
      },
      title: path.basename(templatePath),
      url: fileUrl
    }

    try {
      const response = await fetch(`${onlyofficeUrl}/ConvertService.ashx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conversionRequest)
      })

      if (!response.ok) {
        console.error("OnlyOffice conversion failed:", response.status)
        return generatePlaceholder(templatePath)
      }

      const result = await response.json()
      
      if (result.fileUrl) {
        // Fetch the generated thumbnail and return it
        const thumbnailResponse = await fetch(result.fileUrl)
        const thumbnailBuffer = await thumbnailResponse.arrayBuffer()
        
        return new NextResponse(thumbnailBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable"
          }
        })
      }
    } catch (error) {
      console.error("Error generating OnlyOffice thumbnail:", error)
    }

    // Fallback to placeholder
    return generatePlaceholder(templatePath)
    
  } catch (error) {
    console.error("Error in preview endpoint:", error)
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 })
  }
}

function generatePlaceholder(templatePath: string) {
  const ext = templatePath.split(".").pop()?.toLowerCase()
  const fileName = templatePath.split("/").pop()?.replace(/\.[^/.]+$/, "") || "Document"
  
  const colors: Record<string, { bg: string; bg2: string; text: string; icon: string }> = {
    docx: { bg: "#4A90E2", bg2: "#357ABD", text: "#FFFFFF", icon: "W" },
    xlsx: { bg: "#28A745", bg2: "#1E7E34", text: "#FFFFFF", icon: "X" },
    pptx: { bg: "#FF6B35", bg2: "#E85A2B", text: "#FFFFFF", icon: "P" },
    pdf: { bg: "#DC3545", bg2: "#BD2130", text: "#FFFFFF", icon: "PDF" }
  }

  const color = colors[ext || "docx"] || colors.docx
  
  // Create a more sophisticated document preview similar to OnlyOffice
  const svg = `
    <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${color.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color.bg2};stop-opacity:1" />
        </linearGradient>
        <linearGradient id="paperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#F8F9FA;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="300" height="400" fill="url(#grad1)" rx="8"/>
      
      <!-- Paper effect -->
      <rect x="30" y="40" width="240" height="320" fill="url(#paperGrad)" rx="4" stroke="${color.bg2}" stroke-width="2" opacity="0.95"/>
      
      <!-- Document lines/content -->
      <rect x="50" y="70" width="200" height="8" fill="${color.bg}" opacity="0.2" rx="2"/>
      <rect x="50" y="95" width="180" height="8" fill="${color.bg}" opacity="0.2" rx="2"/>
      <rect x="50" y="120" width="190" height="8" fill="${color.bg}" opacity="0.2" rx="2"/>
      <rect x="50" y="145" width="170" height="8" fill="${color.bg}" opacity="0.2" rx="2"/>
      <rect x="50" y="170" width="185" height="8" fill="${color.bg}" opacity="0.2" rx="2"/>
      <rect x="50" y="195" width="200" height="8" fill="${color.bg}" opacity="0.2" rx="2"/>
      <rect x="50" y="220" width="160" height="8" fill="${color.bg}" opacity="0.2" rx="2"/>
      <rect x="50" y="245" width="195" height="8" fill="${color.bg}" opacity="0.2" rx="2"/>
      
      <!-- Icon badge at bottom -->
      <circle cx="150" y="330" r="28" fill="${color.bg}" opacity="0.95"/>
      <text x="150" y="342" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${color.text}" text-anchor="middle">
        ${color.icon}
      </text>
      
      <!-- Subtle shadow -->
      <rect x="30" y="360" width="240" height="4" fill="#000000" opacity="0.1" rx="2"/>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  })
}
