import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET(req: NextRequest) {
  try {
    const templateDataPath = path.join(process.cwd(), "public", "templates", "templates.json")
    const fileContent = await fs.readFile(templateDataPath, "utf-8")
    const data = JSON.parse(fileContent)
    
    // Update counts
    const categoryCounts: Record<string, number> = {}
    data.templates.forEach((template: any) => {
      categoryCounts[template.category] = (categoryCounts[template.category] || 0) + 1
    })
    
    data.categories = data.categories.map((cat: any) => ({
      ...cat,
      count: cat.id === "all" ? data.templates.length : (categoryCounts[cat.id] || 0)
    }))
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error loading templates:", error)
    return NextResponse.json(
      { error: "Failed to load templates" },
      { status: 500 }
    )
  }
}
