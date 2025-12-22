import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell } from "docx"
import ExcelJS from "exceljs"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { addToRegistry } from "@/lib/documents/registry"
import { marked, TokensList, type Tokens } from "marked"

// NOTE: This is a minimal scaffold that produces simple files for demo.
// Replace with real LLM+template pipeline later.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const prompt: string = body?.prompt || "Untitled"
    const kind: "docx" | "xlsx" | "pdf" = (body?.kind || "docx").toLowerCase() as any
    const template: string | undefined = body?.template
    const templateUrl: string | undefined = body?.templateUrl
    const content: any = body?.content // MCP tool data

    // If a template URL or id is provided, just return that file's URL for immediate loading.
    if (templateUrl && typeof templateUrl === 'string') {
      return NextResponse.json({ url: templateUrl })
    }

    // Special case: rental_agreement needs dynamic generation, not a template file
    if (template && typeof template === 'string' && (template === 'rental_agreement' || template === 'rental-agreement') && content) {
      // Skip template mapping and continue to dynamic generation below
    } else if (template && typeof template === 'string') {
      // Map template id to file within public/templates
      const map: Record<string, string> = {
        'nda': '/templates/docx/nda.docx',
        'invoice': '/templates/docx/invoice.docx',
        'budget-planner': '/templates/xlsx/budget-planner.xlsx',
        'sales-analysis': '/templates/xlsx/sales-analysis.xlsx',
        'project-plan': '/templates/xlsx/project-plan.xlsx',
        'simple-form': '/templates/pdf/simple-form.pdf',
        'waiver': '/templates/pdf/waiver.pdf',
      }
      const relativeUrl = map[template]
      if (relativeUrl) {
        const baseUrl = (process.env.ONLYOFFICE_FILE_BASE_URL || "http://host.docker.internal:3002").replace(/\/$/, "")
        const absoluteUrl = `${baseUrl}${relativeUrl}`
        return NextResponse.json({ url: absoluteUrl, relativeUrl })
      }
    }

  const outDir = path.join(process.cwd(), "public", "generated")
  await fs.mkdir(outDir, { recursive: true })
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "document"
  const filename = `${slug}.${kind}`
  const filePath = path.join(outDir, filename)

    let buffer: Buffer

    if (kind === "docx") {
      // If a full documentSpec is provided, prefer it for faithful rendering
      const spec = content?.documentSpec
      if (spec && typeof spec === "object") {
        const children: any[] = []

        // Title
        const titleText = spec.title || prompt || "Generated Document"
        children.push(new Paragraph({ text: titleText, heading: HeadingLevel.HEADING_1 }))

        // Optional subtitle
        if (spec.subtitle && typeof spec.subtitle === "string") {
          children.push(new Paragraph({ text: spec.subtitle }))
        }

        // Sections
        if (Array.isArray(spec.sections)) {
          for (const section of spec.sections) {
            if (!section || typeof section !== "object") continue
            const heading: string = section.heading || ""
            if (heading) {
              children.push(new Paragraph({ text: heading, heading: HeadingLevel.HEADING_2 }))
            }

            // Body text (markdown-ish minimal handling)
            if (section.body && typeof section.body === "string") {
              const lines = section.body.replace(/\r\n/g, "\n").split("\n")
              for (const raw of lines) {
                const line = raw.trimEnd()
                if (line.trim().length === 0) {
                  children.push(new Paragraph({ text: "" }))
                  continue
                }
                if (line.startsWith("### ")) {
                  children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }))
                  continue
                }
                if (line.startsWith("## ")) {
                  children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }))
                  continue
                }
                if (line.startsWith("# ")) {
                  children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }))
                  continue
                }
                if (line.startsWith("- ") || line.startsWith("* ")) {
                  children.push(new Paragraph({ children: [new TextRun({ text: `• ${line.slice(2)}` })] }))
                  continue
                }
                children.push(new Paragraph({ text: line }))
              }
            }

            // Bullets
            if (Array.isArray(section.bullets)) {
              for (const b of section.bullets) {
                if (typeof b === "string" && b.trim().length) {
                  children.push(new Paragraph({ children: [new TextRun({ text: `• ${b}` })] }))
                }
              }
            }

            // Numbered (naive numbering)
            if (Array.isArray(section.numbered)) {
              let i = 1
              for (const n of section.numbered) {
                if (typeof n === "string" && n.trim().length) {
                  children.push(new Paragraph({ text: `${i}. ${n}` }))
                  i++
                }
              }
            }

            // Table
            if (section.table && typeof section.table === "object" && Array.isArray(section.table.rows)) {
              const rows: TableRow[] = []
              // Headers
              if (Array.isArray(section.table.headers) && section.table.headers.length) {
                rows.push(
                  new TableRow({
                    children: section.table.headers.map((h: any) => new TableCell({ children: [new Paragraph(String(h))] })),
                  })
                )
              }
              // Data rows
              for (const row of section.table.rows) {
                if (!Array.isArray(row)) continue
                rows.push(
                  new TableRow({
                    children: row.map((cell: any) => new TableCell({ children: [new Paragraph(String(cell))] })),
                  })
                )
              }
              children.push(new Table({ rows }))
            }
          }
        }

        const doc = new Document({ sections: [{ properties: {}, children }] })
        const buf = await Packer.toBuffer(doc)
        buffer = Buffer.from(buf)
      } else {
      // Check if this is a rental agreement with content
      if (template === "rental_agreement" && content) {
        const doc = new Document({
          sections: [
            {
              properties: {},
              children: [
                new Paragraph({ 
                  text: "RESIDENTIAL LEASE AGREEMENT", 
                  heading: HeadingLevel.HEADING_1,
                  alignment: "center" as any,
                  spacing: { after: 400 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "This Lease Agreement", bold: false }),
                    new TextRun({ text: ` is entered into on ${content.date || new Date().toLocaleDateString()}` }),
                  ],
                  spacing: { after: 200 }
                }),
                new Paragraph({ 
                  text: "PARTIES", 
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 300, after: 200 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Tenant: ", bold: true }),
                    new TextRun({ text: content.tenant || "_______________" }),
                  ],
                  spacing: { after: 100 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Property Address: ", bold: true }),
                    new TextRun({ text: content.address || "_______________" }),
                  ],
                  spacing: { after: 100 }
                }),
                new Paragraph({ 
                  text: "TERMS", 
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 300, after: 200 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Monthly Rent: ", bold: true }),
                    new TextRun({ text: `$${content.rent || "_______________"}` }),
                  ],
                  spacing: { after: 100 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Lease Term: ", bold: true }),
                    new TextRun({ text: content.term || "12 months" }),
                  ],
                  spacing: { after: 100 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Security Deposit: ", bold: true }),
                    new TextRun({ text: content.deposit === "no deposit" ? "None" : `$${content.deposit || content.rent || "_______________"}` }),
                  ],
                  spacing: { after: 100 }
                }),
                new Paragraph({ 
                  text: "SIGNATURES", 
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 400, after: 200 }
                }),
                new Paragraph({
                  text: "Tenant Signature: _____________________________ Date: __________",
                  spacing: { after: 200 }
                }),
                new Paragraph({
                  text: "Landlord Signature: ___________________________ Date: __________",
                  spacing: { after: 200 }
                }),
              ],
            },
          ],
        })
        const buf = await Packer.toBuffer(doc)
        buffer = Buffer.from(buf)
      } else {
        // Build a DOCX from markdown/plaintext with strong styles
        const md: string | undefined = content?.text
        const children: (Paragraph | Table)[] = []

        // Title
        children.push(new Paragraph({ text: prompt || "Generated Document", heading: HeadingLevel.HEADING_1 }))

        if (md && typeof md === "string") {
          const tokens = marked.lexer(md)
          const renderInline = (inlines: any) => {
            const runs: TextRun[] = []
            for (const t of inlines) {
              if (t.type === "text") {
                runs.push(new TextRun(String((t as any).text)))
              } else if (t.type === "strong") {
                runs.push(new TextRun({ text: (t as any).text || (t as any).raw || "", bold: true }))
              } else if (t.type === "em") {
                runs.push(new TextRun({ text: (t as any).text || "", italics: true }))
              } else if (t.type === "codespan") {
                runs.push(new TextRun({ text: (t as any).text || "", font: "Courier New" }))
              } else if (t.type === "link") {
                const lt = t as Tokens.Link
                runs.push(new TextRun({ text: lt.text || lt.href, color: "0000FF" }))
                if (lt.href && lt.href !== lt.text) runs.push(new TextRun({ text: ` (${lt.href})`, color: "888888" }))
              } else if (t.type === "escape") {
                runs.push(new TextRun(String((t as any).text)))
              }
            }
            return runs
          }

                const walk = (list: any, indent = 0) => {
            for (const tk of list) {
              if (tk.type === "heading") {
                const h = tk as Tokens.Heading
                const level = Math.max(1, Math.min(6, h.depth))
                const map: Record<number, any> = {
                  1: HeadingLevel.HEADING_1,
                  2: HeadingLevel.HEADING_2,
                  3: HeadingLevel.HEADING_3,
                  4: HeadingLevel.HEADING_4,
                  5: HeadingLevel.HEADING_5,
                  6: HeadingLevel.HEADING_6,
                }
                children.push(new Paragraph({
                  text: h.text,
                  heading: map[level],
                }))
              } else if (tk.type === "paragraph") {
                const p = tk as Tokens.Paragraph
                children.push(new Paragraph({ children: renderInline(p.tokens as any) }))
              } else if (tk.type === "list") {
                const l = tk as Tokens.List
                let idx = 1
                for (const it of l.items) {
                  const prefix = l.ordered ? `${(it as any).index || idx}. ` : "• "
                  const runs = [new TextRun({ text: " ".repeat(indent) + prefix })].concat(renderInline((it as any).tokens))
                  children.push(new Paragraph({ children: runs }))
                  if (it.tokens && (it as any).loose === false && it.checked !== undefined) {
                    // Could add checkbox rendering later
                  }
                  if ((it as any).tasks && (it as any).tasks.length) {
                    // nested tasks
                  }
                  if ((it as any) && (it as any).items) {
                    walk((it as any).items as any, indent + 2)
                  }
                  idx++
                }
              } else if (tk.type === "blockquote") {
                const bq = tk as Tokens.Blockquote
                for (const sub of bq.tokens) {
                  if (sub.type === "paragraph") {
                    const runs = (sub as Tokens.Paragraph).tokens.map((t) => new TextRun({ text: (t as any).raw || (t as any).text || "", italics: true, color: "666666" }))
                    children.push(new Paragraph({ children: runs }))
                  }
                }
              } else if (tk.type === "hr") {
                children.push(new Paragraph({ text: "" }))
              } else if (tk.type === "code") {
                const c = tk as Tokens.Code
                const lines = (c.text || "").split("\n")
                for (const ln of lines) {
                  children.push(new Paragraph({ children: [new TextRun({ text: ln, font: "Courier New" })] }))
                }
              } else if (tk.type === "table") {
                const t = tk as Tokens.Table
                const rows: TableRow[] = []
                if (t.header && t.header.length) {
                  rows.push(new TableRow({ children: t.header.map((h) => new TableCell({ children: [new Paragraph(h.text)] })) }))
                }
                for (const row of t.rows) {
                  rows.push(new TableRow({ children: row.map((cell) => new TableCell({ children: [new Paragraph(cell.text)] })) }))
                }
                children.push(new Table({ rows }))
              }
            }
          }

          walk(tokens as unknown as TokensList)
        } else {
          // Fallback content if no body provided
          children.push(new Paragraph({
            children: [new TextRun({ text: "Prompt:", bold: true }), new TextRun({ text: ` ${prompt}` })],
          }))
          children.push(new Paragraph({ text: "\nYou can continue editing this in the Documents panel.", spacing: { before: 200 } }))
        }

        const doc = new Document({ sections: [{ properties: {}, children }] })
        const buf = await Packer.toBuffer(doc)
        buffer = Buffer.from(buf)
      }
      }
    } else if (kind === "xlsx") {
      // Create a workbook with richer structure
      const wb = new ExcelJS.Workbook()

      const makeSafeName = (s: string) => (s || "Sheet1").slice(0, 31).replace(/[\\\/:\*\?\[\]]/g, " ")
      const columnLetter = (n: number) => {
        let s = ""
        while (n > 0) {
          const m = (n - 1) % 26
          s = String.fromCharCode(65 + m) + s
          n = Math.floor((n - 1) / 26)
        }
        return s
      }
      const coerceNumber = (v: any) => {
        if (typeof v === "number") return v
        if (typeof v !== "string") return v
        const t = v.trim()
        // Parse 75M, 1.2M, 3K etc
        const m = t.match(/^([0-9]+(?:\.[0-9]+)?)\s*([kKmMbB])?$/)
        if (m) {
          const n = parseFloat(m[1])
          const unit = (m[2] || "").toUpperCase()
          const mult = unit === "K" ? 1_000 : unit === "M" ? 1_000_000 : unit === "B" ? 1_000_000_000 : 1
          return n * mult
        }
        // currency like $430.50
        const cur = t.replace(/[^0-9.\-]/g, "")
        if (cur && !isNaN(Number(cur))) return Number(cur)
        return v
      }

      const columnSpecs: any[] = Array.isArray(content?.columns) ? content.columns : []
      const columnSpecByHeader = new Map<string, any>()
      columnSpecs.forEach((spec) => {
        if (spec?.header) {
          columnSpecByHeader.set(spec.header, spec)
        }
      })
      const toArgb = (hex?: string) => {
        if (!hex || typeof hex !== "string") return undefined
        let h = hex.replace(/[^0-9a-fA-F]/g, "")
        if (h.length === 3) {
          h = h.split("").map((c) => c + c).join("")
        }
        if (h.length === 6) {
          return `FF${h.toUpperCase()}`
        }
        if (h.length === 8) return h.toUpperCase()
        return undefined
      }

      const validationRowBudget = Math.max((content?.data?.length || 0) + 25, 80)

      const writeSheet = (name: string, headers: string[], rows: any[][]) => {
        const ws = wb.addWorksheet(makeSafeName(name))
        ws.mergeCells(1, 1, 1, Math.max(1, headers.length))
        const titleCell = ws.getCell(1, 1)
        titleCell.value = prompt
        titleCell.font = { bold: true, size: 14 }

        const headerRowIdx = 3
        const headerRow = ws.getRow(headerRowIdx)
        headerRow.values = headers
        headerRow.font = { bold: true }
        headerRow.alignment = { vertical: "middle", horizontal: "left" }

        const startRow = headerRowIdx + 1
        rows.forEach((r, i) => {
          const row = ws.getRow(startRow + i)
          const values = r.map(coerceNumber)
          row.values = [undefined, ...values]
        })

        ws.columns = headers.map((h: string) => {
          const spec = columnSpecByHeader.get(h)
          const width = spec?.width ?? Math.min(Math.max(h.length + 4, 14), 42)
          const style: any = { width }
          if (spec?.format) style.numFmt = spec.format
          return style
        })

        const fz = content?.freeze
        ws.views = [{ state: "frozen", xSplit: fz?.column || 0, ySplit: fz?.row ?? startRow - 1 }]

        if (content?.autoFilter !== false) {
          ws.autoFilter = {
            from: { row: headerRowIdx, column: 1 },
            to: { row: headerRowIdx, column: headers.length },
          } as any
        }

        const fmts: Record<string, string> = content?.formats || {}
        headers.forEach((h, idx) => {
          const fmt = fmts[h]
          if (fmt) {
            ws.getColumn(idx + 1).numFmt = fmt
          }
        })

        headers.forEach((h, idx) => {
          const spec = columnSpecByHeader.get(h)
          if (!spec) return
          const colLetterStr = columnLetter(idx + 1)
          const ref = `${colLetterStr}${startRow}:${colLetterStr}${startRow + validationRowBudget}`

          if (Array.isArray(spec.options) && spec.options.length) {
            try {
              const list = spec.options.map((opt: string) => opt.replace(/"/g, ""))
              const dv = (ws as any).dataValidations
              if (dv?.add) {
                dv.add(ref, {
                type: "list",
                allowBlank: true,
                formulae: [`"${list.join(",")}"`],
                showErrorMessage: true,
                })
              }
            } catch {}
          }

          if (Array.isArray(spec.colorRules) && spec.colorRules.length) {
            try {
              ws.addConditionalFormatting({
                ref,
                rules: spec.colorRules
                  .filter((rule: any) => rule?.match)
                  .map((rule: any) => {
                    const match = rule.match || {}
                    const mode = (match.mode || "equals").toLowerCase()
                    const style: any = {}
                    const fillColor = toArgb(rule?.style?.fill)
                    const fontColor = toArgb(rule?.style?.fontColor)
                    if (fillColor) {
                      style.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor }, bgColor: { argb: fillColor } }
                    }
                    if (fontColor || rule?.style?.bold) {
                      style.font = {
                        color: fontColor ? { argb: fontColor } : undefined,
                        bold: rule?.style?.bold,
                      }
                    }
                    if (mode === "expression") {
                      return { type: "expression", formulae: [match.formula || "TRUE"], style }
                    }
                    if (mode === "contains") {
                      return {
                        type: "containsText",
                        operator: "containsText",
                        text: String(match.value ?? ""),
                        style,
                      }
                    }
                    return {
                      type: "cellIs",
                      operator: "equal",
                      formulae: [typeof match.value === "number" ? String(match.value) : `"${match.value ?? ""}"`],
                      style,
                    }
                  }),
              })
            } catch {}
          }
        })

        try {
          const tableName = content?.tableStyle ? content.tableStyle : "TableStyleMedium9"
          const tableId = makeSafeName((prompt || "Table").replace(/\s+/g, "")).replace(/[^A-Za-z0-9_]/g, "")
          ws.addTable({
            name: tableId || "DataTable",
            ref: `A${headerRowIdx}`,
            headerRow: true,
            style: { theme: tableName, showRowStripes: true },
            columns: headers.map((h) => ({ name: h })),
            rows,
          } as any)
        } catch {}

        return { ws, headerRowIdx, startRow }
      }

      if (content && Array.isArray(content.headers) && Array.isArray(content.data)) {
        const dataSheetInfo = writeSheet("Sheet1", content.headers, content.data)
        const { ws: dataSheet, startRow: dataStartRow } = dataSheetInfo

        // Named ranges
        if (Array.isArray(content?.namedRanges)) {
          for (const nr of content.namedRanges) {
            if (nr?.name && nr?.range) {
              wb.definedNames.add(nr.name, nr.range)
            }
          }
        }

        // Optional Summary sheet with basic stats for numeric columns
        if (content?.summary) {
          const headers: string[] = content.headers
          const summary = wb.addWorksheet("Summary")
          summary.getCell("A1").value = "Summary"
          summary.getCell("A1").font = { bold: true, size: 14 }
          summary.getRow(3).values = ["Field", "Min", "Max", "Avg"]
          summary.getRow(3).font = { bold: true }
          let r = 4
          headers.forEach((h, idx) => {
            const colLetterStr = (dataSheet.getColumn(idx + 1) as any).letter || columnLetter(idx + 1)
            // data range from row 4 to last
            const lastRow = Math.max(dataStartRow, dataSheet.rowCount)
            const range = `${dataSheet.name}!${colLetterStr}${dataStartRow}:${colLetterStr}${lastRow}`
            summary.getCell(`A${r}`).value = h
            summary.getCell(`B${r}`).value = { formula: `MIN(${range})` }
            summary.getCell(`C${r}`).value = { formula: `MAX(${range})` }
            summary.getCell(`D${r}`).value = { formula: `AVERAGE(${range})` }
            r++
          })
          summary.columns = [{ width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }]
        }

        // Additional sheets
        if (Array.isArray(content?.sheets)) {
          for (const s of content.sheets) {
            if (!s?.name) continue
            writeSheet(s.name, s.headers || [], s.data || [])
          }
        }

        // Charts: not directly supported by exceljs — prepare a Charts sheet with instructions and ranges
        if (Array.isArray(content?.charts) && content.charts.length) {
          const chartsWs = wb.addWorksheet("Charts")
          chartsWs.getCell("A1").value = "Charts Requested"
          chartsWs.getCell("A1").font = { bold: true, size: 14 }
          chartsWs.getRow(3).values = ["Type", "Title", "X Range", "Y Ranges"]
          chartsWs.getRow(3).font = { bold: true }
          let r = 4
          for (const ch of content.charts) {
            chartsWs.getRow(r).values = [ch.type || "", ch.title || "", ch.x || "", Array.isArray(ch.ys) ? ch.ys.join(", ") : ""]
            r++
          }
          chartsWs.columns = [{ width: 18 }, { width: 28 }, { width: 26 }, { width: 40 }]
        }
      } else {
        // Fallback: Create a simple template
        const ws = wb.addWorksheet("Sheet1")
        ws.getCell("A1").value = "Generated Spreadsheet"
        ws.getCell("A1").font = { bold: true, size: 14 }
        ws.getCell("A3").value = "Prompt:"
        ws.getCell("B3").value = prompt
        ws.getRow(5).values = ["Item", "Qty", "Price", "Total"]
        ws.getRow(5).font = { bold: true }
        const base = 6
        const rows = [
          ["Alpha", 2, 10],
          ["Beta", 3, 12.5],
          ["Gamma", 1, 20],
        ]
        rows.forEach((r, i) => {
          const row = ws.getRow(base + i)
          row.values = [r[0], r[1], r[2], { formula: `B${base + i}*C${base + i}` }]
        })
        ws.columns = [
          { width: 18 },
          { width: 8 },
          { width: 10 },
          { width: 12 },
        ]
      }

      const ab = (await wb.xlsx.writeBuffer()) as ArrayBuffer
      buffer = Buffer.from(ab)
    } else if (kind === "pdf") {
      // Render markdown to a styled PDF
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([595.28, 841.89]) // A4
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const fontMono = await pdfDoc.embedFont(StandardFonts.Courier)

      const margin = 50
      const maxWidth = page.getWidth() - margin * 2
      let y = page.getHeight() - margin

      const drawTextWrap = (txt: string, size = 12, color = rgb(0, 0, 0), f = fontRegular) => {
        const words = txt.split(/\s+/)
        let line = ""
        const lineHeight = size * 1.4
        for (const w of words) {
          const test = line ? line + " " + w : w
          const width = f.widthOfTextAtSize(test, size)
          if (width > maxWidth) {
            page.drawText(line, { x: margin, y: y - lineHeight, size, font: f, color })
            y -= lineHeight
            line = w
          } else {
            line = test
          }
        }
        if (line) {
          page.drawText(line, { x: margin, y: y - lineHeight, size, font: f, color })
          y -= lineHeight
        }
      }

      // Title
      drawTextWrap(prompt || "Generated PDF", 20, rgb(0.2, 0.2, 0.8), fontBold)

      const md = content?.text as string | undefined
      if (md) {
        const tokens = marked.lexer(md)
        const walk = (list: TokensList) => {
          for (const tk of list) {
            if (y < margin + 80) {
              // naive: new page when space is low
              const np = pdfDoc.addPage([595.28, 841.89])
              y = np.getHeight() - margin
            }
            if (tk.type === "heading") {
              const h = tk as Tokens.Heading
              const size = 22 - (h.depth - 1) * 2
              drawTextWrap(h.text, size, rgb(0.2, 0.2, 0.8), fontBold)
            } else if (tk.type === "paragraph") {
              const p = tk as Tokens.Paragraph
              const text = p.text || p.tokens?.map((t: any) => t.raw || t.text).join("") || ""
              drawTextWrap(text, 12, rgb(0, 0, 0), fontRegular)
            } else if (tk.type === "list") {
              const l = tk as Tokens.List
              let i = 1
              for (const it of l.items) {
                const prefix = l.ordered ? `${(it as any).index || i}. ` : "• "
                drawTextWrap(prefix + (it.text || it.tokens?.map((t: any) => t.raw || t.text).join("") || ""), 12)
                i++
              }
            } else if (tk.type === "blockquote") {
              const bq = tk as Tokens.Blockquote
              for (const sub of bq.tokens) {
                if (sub.type === "paragraph") {
                  const p = sub as Tokens.Paragraph
                  const text = p.text || p.tokens?.map((t: any) => t.raw || t.text).join("") || ""
                  drawTextWrap(text, 12, rgb(0.4, 0.4, 0.4), fontRegular)
                }
              }
            } else if (tk.type === "code") {
              const c = tk as Tokens.Code
              const lines = (c.text || "").split("\n")
              for (const ln of lines) {
                drawTextWrap(ln, 11, rgb(0.2, 0.2, 0.2), fontMono)
              }
            } else if (tk.type === "hr") {
              y -= 6
            }
          }
        }
        walk(tokens as unknown as TokensList)
      } else {
        drawTextWrap("Prompt: " + (prompt || ""))
      }

      const pdfBytes = await pdfDoc.save()
      buffer = Buffer.from(pdfBytes)
    } else {
      return NextResponse.json({ error: "Unsupported kind" }, { status: 400 })
    }

    await fs.writeFile(filePath, buffer)

    const relativeUrl = `/generated/${encodeURIComponent(filename)}`
    await addToRegistry({
      id: filename,
      url: relativeUrl,
      kind,
      title: prompt,
      createdAt: new Date().toISOString(),
    })

  const baseUrl = (process.env.ONLYOFFICE_FILE_BASE_URL || "http://host.docker.internal:3002").replace(/\/$/, "")
  const absoluteUrl = `${baseUrl}${relativeUrl}`
  // Add a cache-busting version so OnlyOffice treats each generation as a fresh document
  const absoluteUrlWithVersion = `${absoluteUrl}?v=${Date.now()}`
  // Remember document creation
  try {
    await fetch(new URL("/api/memory/remember", req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "document",
        docId: filename,
        title: prompt,
        docType: kind,
        url: absoluteUrlWithVersion,
        version: String(Date.now()),
      }),
      cache: "no-store",
    })
  } catch {}

  return NextResponse.json({ url: absoluteUrlWithVersion, relativeUrl, filename })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
