import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
let puppeteer: any
import { marked } from "marked"
import { addToRegistry } from "@/lib/documents/registry"

const baseStyles = `
  body { font-family: Arial, sans-serif; color: #111; }
  .deck { width: 1120px; margin: 0 auto; }
  .slide { page-break-after: always; height: 630px; padding: 64px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; }
  .slide h1, .slide h2 { margin: 0 0 16px; }
  .slide ul { margin: 8px 0 0 24px; }
`

function slidesHtmlFromMarkdown(md: string) {
  const sections = md.split(/\n\s*---+\s*\n/)
  const slides = sections.map(sec => `<section class=\"slide\">${marked.parse(sec)}</section>`).join("\n")
  return `<div class=\"deck\">${slides}</div>`
}

export async function POST(req: NextRequest) {
  let browser: any = null
  try {
    const body = await req.json().catch(() => ({}))
    const title: string = body?.title || "slides"
    const markdown: string | undefined = body?.markdown
    const htmlDeck: string | undefined = body?.html
    const css: string | undefined = body?.css
    const theme: string | undefined = body?.theme

    // If a theme is provided, try to load it from public/templates/slides/themes/<theme>.css
    let themeCss = ""
    if (theme && /^[a-z0-9\-_.]+$/i.test(theme)) {
      try {
        const themePath = path.join(process.cwd(), "public", "templates", "slides", "themes", `${theme}.css`)
        themeCss = await fs.readFile(themePath, "utf8").catch(() => "")
      } catch {
        themeCss = ""
      }
    }

    const deckHtml = htmlDeck || (markdown ? slidesHtmlFromMarkdown(markdown) : "<div class='deck'><section class='slide'><h1>Untitled</h1></section></div>")
  const fullHtml = `<!doctype html><html><head><meta charset=\"utf-8\"><style>${baseStyles}${themeCss}${css || ""}</style></head><body>${deckHtml}</body></html>`

  puppeteer = puppeteer || (await import("puppeteer")).default
  browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"], headless: "new" })
    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: "networkidle0" })
    await page.emulateMediaType("print")
    const pdfBuf = await page.pdf({
      width: "1120px",
      height: "630px",
      printBackground: true,
    })

    const outDir = path.join(process.cwd(), "public", "generated")
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'slides'}-${ts}.pdf`
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
