import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx"
import { readRegistry, findLatestByKind, addToRegistry } from "@/lib/documents/registry"
import { extractTextFromDocx } from "@/lib/documents/docx-text"

type Rubric = {
  criteria: Array<{ name: string; weight?: number; description?: string }>
}

function defaultRubric(): Rubric {
  return {
    criteria: [
      { name: "Thesis/Clarity", weight: 0.25, description: "Clear purpose and thesis with cohesive structure" },
      { name: "Evidence/Support", weight: 0.25, description: "Relevant evidence, examples, and citations" },
      { name: "Organization", weight: 0.2, description: "Logical flow, transitions, and sectioning" },
      { name: "Style/Tone", weight: 0.15, description: "Professional tone, readability, and engagement" },
      { name: "Grammar/Mechanics", weight: 0.15, description: "Spelling, grammar, and punctuation" },
    ],
  }
}

function scoreWithHeuristics(text: string, rubric: Rubric) {
  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length
  const sentences = (text.match(/[.!?](\s|$)/g) || []).length
  const paragraphs = text.split(/\n{2,}/).filter(Boolean).length
  const hasHeadings = /\n[A-Z][A-Za-z\d\s]{3,}\n/.test(text)

  const details: Array<{ name: string; weight: number; score: number; notes?: string }> = []
  for (const c of rubric.criteria) {
    const w = c.weight ?? 1 / rubric.criteria.length
    let s = 0.7 // base
    let notes = ""
    if (/thesis|purpose|summary|introduction/i.test(text)) s += 0.1
    if (wordCount > 600) s += 0.05
    if (sentences > 10) s += 0.05
    if (paragraphs > 2) s += 0.05
    if (hasHeadings) s += 0.05
    s = Math.min(1, Math.max(0.3, s))
    details.push({ name: c.name, weight: w, score: s, notes })
  }
  const total = details.reduce((acc, d) => acc + d.score * d.weight, 0)
  const grade = Math.round(total * 100)
  return { grade, wordCount, sentences, paragraphs, details }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const rubric: Rubric = body?.rubric || defaultRubric()
    const list = await readRegistry()
    const latest = findLatestByKind(list, "docx")
    if (!latest?.url) return NextResponse.json({ error: "no docx found" }, { status: 404 })

    const text = await extractTextFromDocx(latest.url)
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "document appears empty" }, { status: 400 })
    }

    const result = scoreWithHeuristics(text, rubric)

    // Build feedback document
    const outDir = path.join(process.cwd(), "public", "generated")
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `grade-feedback-${ts}.docx`
    const dest = path.join(outDir, filename)

    const sections: Paragraph[] = []
    sections.push(new Paragraph({ text: "Document Grading Report", heading: HeadingLevel.HEADING_1 }))
    sections.push(new Paragraph({ text: `Overall Score: ${result.grade}/100` }))
    sections.push(new Paragraph({ text: `Words: ${result.wordCount} | Sentences: ${result.sentences} | Paragraphs: ${result.paragraphs}` }))
    sections.push(new Paragraph({ text: "" }))
    sections.push(new Paragraph({ text: "Criteria Scores", heading: HeadingLevel.HEADING_2 }))
    for (const d of result.details) {
      sections.push(new Paragraph({ text: `${d.name}: ${(d.score * 100).toFixed(0)}/100 (weight ${(d.weight * 100).toFixed(0)}%)` }))
    }
    if (body?.comments) {
      sections.push(new Paragraph({ text: "" }))
      sections.push(new Paragraph({ text: "Instructor Comments", heading: HeadingLevel.HEADING_2 }))
      sections.push(new Paragraph({ text: String(body.comments) }))
    }

    const doc = new Document({ sections: [{ properties: {}, children: sections }] })
    const buf = await Packer.toBuffer(doc)
    await fs.writeFile(dest, Buffer.from(buf))
    const url = `/generated/${encodeURIComponent(filename)}`
    await addToRegistry({ id: filename, url, kind: "docx", title: `Grading Report`, createdAt: new Date().toISOString() })

    return NextResponse.json({ score: result.grade, url, details: result.details })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
