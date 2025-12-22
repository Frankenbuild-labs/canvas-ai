// Generate local sample templates for DOCX/XLSX/PDF under public/templates
import path from 'path'
import { fileURLToPath } from 'url'
import { promises as fs } from 'fs'
import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType } from 'docx'
import ExcelJS from 'exceljs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true })
}

async function writeBuffer(filePath, buffer) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, Buffer.from(buffer))
  console.log('Wrote', filePath)
}

async function makeDocxTemplates(base) {
  // rental-agreement.docx
  {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Rental Agreement', heading: HeadingLevel.TITLE }),
          new Paragraph({ text: 'This Rental Agreement is made between {{LandlordName}} and {{TenantName}} for the property at {{PropertyAddress}}.' }),
          new Paragraph({ text: 'Term: {{StartDate}} to {{EndDate}}. Monthly Rent: ${{MonthlyRent}}.' }),
          new Paragraph({ text: 'Security Deposit: ${{SecurityDeposit}}. Utilities: {{Utilities}}.' }),
          new Paragraph({ text: 'Signature: ______________________   Date: ___________' }),
        ]
      }]
    })
    const buf = await Packer.toBuffer(doc)
    await writeBuffer(path.join(base, 'docx', 'rental-agreement.docx'), buf)
  }

  // nda.docx
  {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Non-Disclosure Agreement (NDA)', heading: HeadingLevel.TITLE }),
          new Paragraph({ text: 'This NDA is entered into between {{DisclosingParty}} and {{ReceivingParty}}.' }),
          new Paragraph({ text: 'Definition of Confidential Information: {{ConfidentialDefinition}}.' }),
          new Paragraph({ text: 'Obligations of Receiving Party: {{Obligations}}.' }),
          new Paragraph({ text: 'Term: {{Term}}. Governing Law: {{Law}}.' }),
          new Paragraph({ text: 'Signature: ______________________   Date: ___________' }),
        ]
      }]
    })
    const buf = await Packer.toBuffer(doc)
    await writeBuffer(path.join(base, 'docx', 'nda.docx'), buf)
  }

  // invoice.docx
  {
    const header = new TableRow({
      children: ['Item', 'Qty', 'Price', 'Total'].map(h => new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
      }))
    })
    const rows = [['Service A', '2', '$100', '$200'], ['Service B', '1', '$250', '$250']]
      .map(r => new TableRow({ children: r.map(c => new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph(c)] })) }))
    const table = new Table({ rows: [header, ...rows] })
    const doc = new Document({ sections: [{ children: [
      new Paragraph({ text: 'Invoice', heading: HeadingLevel.TITLE }),
      new Paragraph({ text: 'Bill To: {{ClientName}}' }),
      new Paragraph({ text: 'Date: {{InvoiceDate}}   Invoice #: {{InvoiceNumber}}' }),
      table,
      new Paragraph({ text: 'Notes: {{Notes}}' }),
    ] }] })
    const buf = await Packer.toBuffer(doc)
    await writeBuffer(path.join(base, 'docx', 'invoice.docx'), buf)
  }
}

async function makeXlsxTemplates(base) {
  // budget-planner.xlsx
  {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Budget')
    ws.addRow(['Category', 'Planned', 'Actual', 'Difference'])
    ws.getRow(1).font = { bold: true }
    const data = [
      ['Rent', 1200, 1200],
      ['Utilities', 250, 220],
      ['Groceries', 500, 540],
      ['Transport', 150, 130],
    ]
    data.forEach((r, i) => ws.addRow([...r, { formula: `B${i + 2}-C${i + 2}` }]))
    ws.columns = [{ width: 20 }, { width: 12 }, { width: 12 }, { width: 14 }]
    const buf = await wb.xlsx.writeBuffer()
    await writeBuffer(path.join(base, 'xlsx', 'budget-planner.xlsx'), buf)
  }
  // sales-analysis.xlsx
  {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Sales')
    ws.addRow(['Month', 'Units', 'Price', 'Revenue'])
    ws.getRow(1).font = { bold: true }
    const months = [['Jan', 120, 25], ['Feb', 140, 24], ['Mar', 160, 26]]
    months.forEach((m, i) => ws.addRow([...m, { formula: `B${i + 2}*C${i + 2}` }]))
    const buf = await wb.xlsx.writeBuffer()
    await writeBuffer(path.join(base, 'xlsx', 'sales-analysis.xlsx'), buf)
  }
  // project-plan.xlsx
  {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Plan')
    ws.addRow(['Task', 'Start', 'End', 'Duration (days)'])
    ws.getRow(1).font = { bold: true }
    ws.addRow(['Design', new Date(2025, 0, 1), new Date(2025, 0, 10), { formula: 'DATEDIF(B2,C2,"d")' }])
    ws.addRow(['Build', new Date(2025, 0, 11), new Date(2025, 0, 25), { formula: 'DATEDIF(B3,C3,"d")' }])
    ws.columns = [{ width: 20 }, { width: 14 }, { width: 14 }, { width: 18 }]
    ws.getColumn(2).numFmt = 'yyyy-mm-dd'
    ws.getColumn(3).numFmt = 'yyyy-mm-dd'
    const buf = await wb.xlsx.writeBuffer()
    await writeBuffer(path.join(base, 'xlsx', 'project-plan.xlsx'), buf)
  }
}

async function makePdfTemplates(base) {
  // simple-form.pdf
  {
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([595.28, 841.89])
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    page.drawText('Simple Form', { x: 50, y: 780, size: 20, font, color: rgb(0.2, 0.2, 0.8) })
    const labels = ['Name', 'Email', 'Date']
    labels.forEach((label, i) => {
      const y = 730 - i * 40
      page.drawText(label + ':', { x: 50, y, size: 12, font })
      page.drawRectangle({ x: 120, y: y - 5, width: 300, height: 18, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 })
    })
    const bytes = await pdf.save()
    await writeBuffer(path.join(base, 'pdf', 'simple-form.pdf'), bytes)
  }
  // waiver.pdf
  {
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([595.28, 841.89])
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    page.drawText('Waiver & Release', { x: 50, y: 780, size: 20, font, color: rgb(0.8, 0.2, 0.2) })
    const text = 'I, {{ParticipantName}}, acknowledge the risks involved in {{Activity}} and agree to the terms set forth herein.'
    page.drawText(text, { x: 50, y: 740, size: 12, font, color: rgb(0, 0, 0), maxWidth: 495 })
    page.drawText('Signature: ______________________   Date: ___________', { x: 50, y: 680, size: 12, font })
    const bytes = await pdf.save()
    await writeBuffer(path.join(base, 'pdf', 'waiver.pdf'), bytes)
  }
}

async function main() {
  const base = path.join(process.cwd(), 'public', 'templates')
  await ensureDir(path.join(base, 'docx'))
  await ensureDir(path.join(base, 'xlsx'))
  await ensureDir(path.join(base, 'pdf'))

  await makeDocxTemplates(base)
  await makeXlsxTemplates(base)
  await makePdfTemplates(base)

  console.log('Templates seeded under /public/templates')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
