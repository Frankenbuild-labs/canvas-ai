import fs from "fs"
import path from "path"
import mammoth from "mammoth"

export async function extractTextFromDocx(publicUrl: string): Promise<string> {
  const rel = publicUrl.replace(/^\/+/, "")
  const filePath = path.join(process.cwd(), "public", rel)
  const buf = await fs.promises.readFile(filePath)
  const result = await mammoth.extractRawText({ buffer: buf })
  return (result?.value || "").toString()
}
