import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
// Render HTML to PDF endpoint (headless Puppeteer, dynamic import to avoid TS types)
// We'll lazy import puppeteer at runtime and type as any to avoid TS env issues
let puppeteer: any
import { addToRegistry } from "@/lib/documents/registry"

export async function POST(req: NextRequest) {
  let browser: any = null
  try {
    const body = await req.json().catch(() => ({}))
    const html: string = body?.html || "<html><body><h1>Untitled</h1></body></html>"
    const css: string | undefined = body?.css
    const title: string = body?.title || "html-export"
    const baseUrl: string | undefined = body?.baseUrl || process.env.NEXT_PUBLIC_BASE_URL

    const fullHtml = `<!doctype html><html><head><meta charset=\"utf-8\">${css ? `<style>${css}</style>` : ""}</head><body>${html}</body></html>`

  puppeteer = puppeteer || (await import("puppeteer")).default
  browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: "new",
    })
    const page = await browser.newPage()
    if (baseUrl) await page.goto(baseUrl).catch(() => {})
    await page.setContent(fullHtml, { waitUntil: "networkidle0" })
    await page.emulateMediaType("print")
    const pdfBuf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    })

    const outDir = path.join(process.cwd(), "public", "generated")
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'html-export'}-${ts}.pdf`
    const dest = path.join(outDir, filename)
    await fs.writeFile(dest, Buffer.from(pdfBuf))
    const url = `/generated/${encodeURIComponent(filename)}`
    await addToRegistry({ id: filename, url, kind: "pdf", title, createdAt: new Date().toISOString() })
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  } finally {
    try { await browser?.close() } catch {}
  }
}
