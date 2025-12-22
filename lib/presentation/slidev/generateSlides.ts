import { SlideDeckSpec, SlideSection, SlideStat } from "../../../types/presentation"

// Escape helpers keep Slidev frontmatter and markdown stable.
function escape(text: string): string {
  return text.replace(/`/g, "\\`").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;")
}

interface Palette {
  primary: string
  coverBackground: string
  backgrounds: string[]
}

const DEFAULT_PRIMARY = "#6366f1"
const backgroundTemplates: Array<(primary: string) => string> = [
  (primary) => `linear-gradient(135deg, ${primary}, #0f172a)`,
  (primary) => `linear-gradient(135deg, #0b1220, ${primary})`,
  () => "linear-gradient(135deg, #111827, #1f2937)",
  () => "linear-gradient(135deg, #0f172a, #1e1b4b)",
]

function buildPalette(brandColor?: string): Palette {
  const primary = brandColor || DEFAULT_PRIMARY
  return {
    primary,
    coverBackground: `linear-gradient(120deg, ${primary}, #0f172a)`,
    backgrounds: backgroundTemplates.map((fn) => fn(primary)),
  }
}

function pickLayout(section: SlideSection, index: number): string {
  if (section.layout) return section.layout
  if (section.quote) return "statement"
  if (section.stats?.length) return "two-cols"
  if (section.image) return "image-right"
  if (section.points && section.points.length > 4) return "two-cols"
  return index % 3 === 0 ? "center" : "default"
}

function renderNotesBlock(notes?: string): string[] {
  if (!notes) return []
  const lines = ["notes: |"]
  for (const line of notes.split("\n")) {
    lines.push(`  ${line}`)
  }
  return lines
}

function renderStats(stats?: SlideStat[]): string[] {
  if (!stats || stats.length === 0) return []
  const cols = Math.min(3, stats.length)
  const lines = [`::grid{cols=${cols} gap=1.25}`]
  for (const stat of stats) {
    lines.push("::: kpi-card")
    lines.push(`#### ${escape(stat.value)}`)
    lines.push(`**${escape(stat.label)}**`)
    if (stat.trend) {
      const arrow = stat.trend === "up" ? "▲" : stat.trend === "down" ? "▼" : "■"
      const tone = stat.trend === "up" ? "text-emerald-300" : stat.trend === "down" ? "text-rose-300" : "text-slate-200"
      lines.push(`<span class="text-xs ${tone}">${arrow} ${stat.trend}</span>`)
    }
    if (stat.caption) lines.push(`<p class="text-xs opacity-70">${escape(stat.caption)}</p>`)
    lines.push(":::")
  }
  lines.push("::")
  lines.push("")
  return lines
}

function renderCallout(callout?: string): string[] {
  if (!callout) return []
  return ["::: info", escape(callout), ":::", ""]
}

function renderQuote(quote?: SlideSection["quote"]): string[] {
  if (!quote) return []
  const lines = [`> ${escape(quote.text)}`, ">"]
  if (quote.author) {
    lines.push(`> — ${escape(quote.author)}${quote.role ? `, ${escape(quote.role)}` : ""}`)
  }
  lines.push("")
  return lines
}

function renderImage(image?: string): string[] {
  if (!image) return []
  return [`<img src="${image}" class="illustration" />`, ""]
}

function sectionToMarkdown(section: SlideSection, index: number, palette: Palette): string {
  const lines: string[] = []
  const layout = pickLayout(section, index)
  const background = section.background || palette.backgrounds[index % palette.backgrounds.length]
  const classes = ["content-slide"]
  if (!section.background) classes.push("text-white")
  if (section.className) classes.push(section.className)

  lines.push("---")
  lines.push(`layout: ${layout}`)
  if (background) lines.push(`background: "${background}"`)
  if (classes.length) lines.push(`class: ${classes.join(" ")}`)
  if (section.accentColor) {
    lines.push("css: |")
    lines.push(`  :root { --slidev-theme-primary: ${section.accentColor}; }`)
  }
  renderNotesBlock(section.notes).forEach((noteLine) => lines.push(noteLine))
  lines.push("---")
  lines.push("")
  if (section.title) {
    lines.push(`# ${escape(section.title)}`)
    lines.push("")
  }
  if (section.subtitle) {
    lines.push(`### ${escape(section.subtitle)}`)
    lines.push("")
  }
  renderImage(section.image).forEach((line) => lines.push(line))
  if (section.points && section.points.length) {
    for (const p of section.points) {
      lines.push(`- ${escape(p)}`)
    }
    lines.push("")
  }
  renderCallout(section.callout).forEach((line) => lines.push(line))
  renderStats(section.stats).forEach((line) => lines.push(line))
  renderQuote(section.quote).forEach((line) => lines.push(line))
  if (section.rawMarkdown) {
    lines.push(section.rawMarkdown)
    lines.push("")
  }
  return lines.join("\n")
}

export function generateSlideMarkdown(spec: SlideDeckSpec): string {
  const palette = buildPalette(spec.brandColor)
  const deck: string[] = []
  deck.push("---")
  deck.push(`title: ${escape(spec.title)}`)
  deck.push("layout: cover")
  deck.push(`theme: ${escape(spec.theme || "default")}`)
  deck.push("colorSchema: light")
  deck.push("fonts:")
  deck.push("  sans: \"Inter\"")
  deck.push("  serif: \"Playfair Display\"")
  deck.push("  mono: \"JetBrains Mono\"")
  deck.push("---")
  deck.push("")
  deck.push('<div class="cover-card">')
  deck.push(`# ${escape(spec.title)}`)
  if (spec.subtitle) {
    deck.push("")
    deck.push(`_${escape(spec.subtitle)}_`)
  }
  deck.push("</div>")
  deck.push("")
  deck.push("<style>")
  deck.push(`:root { --slidev-theme-primary: ${palette.primary}; }`)
  deck.push(".cover-card { padding: 5rem 6rem; color: #fff; border-radius: 32px;")
  deck.push(`background: ${palette.coverBackground}; box-shadow: 0 25px 90px rgba(15,23,42,0.55); }`)
  deck.push(".content-slide { padding: 3.5rem; backdrop-filter: blur(18px); background: rgba(4,7,18,0.60); border-radius: 28px; }")
  deck.push(".kpi-card { padding: 1.2rem; border-radius: 20px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); }")
  deck.push(".illustration { width: 55%; float: right; margin-left: 2.5rem; border-radius: 24px; box-shadow: 0 18px 50px rgba(0,0,0,0.35); }")
  deck.push("</style>")
  deck.push("")

  spec.sections.forEach((section, index) => {
    deck.push(sectionToMarkdown(section, index, palette))
    deck.push("")
  })

  if (spec.appendix && spec.appendix.length) {
    deck.push("---")
    deck.push("layout: center")
    deck.push("class: text-center")
    deck.push("---")
    deck.push("# Appendix")
    deck.push("")
    for (const item of spec.appendix) {
      deck.push(`- ${escape(item)}`)
    }
    deck.push("")
  }

  return deck.join("\n")
}

export function buildRoadmapDeck(): SlideDeckSpec {
  return {
    title: "Executive Agent Roadmap",
    subtitle: "High-quality multi-artifact intelligence system",
    theme: "default",
    brandColor: "#ec4899",
    sections: [
      {
        title: "Vision",
        points: [
          "Adaptive generation across DOCX / XLSX / PPTX / PDF",
          "Contextual memory graph + validation loop",
          "Safety guardrails and compliance enforcement",
        ],
        layout: "center",
        className: "text-center",
      },
      {
        title: "Phases",
        rawMarkdown: "```mermaid\\ntimeline\\n    title Implementation Phases\\n    Q1 : Pipeline Core / Validators\\n    Q2 : Semantic Graph / Patch Planner\\n    Q3 : Spreadsheet & Presentation Intelligence\\n    Q4 : Performance Scaling & Adaptive Learning\\n```",
      },
      {
        title: "Pipeline Stages",
        points: [
          "PLAN → RENDER → REVIEW → COMMIT → POSTLOG",
          "Iterative localized edits",
          "Multi-pass scoring & patch prioritization",
        ],
        callout: "Render → Review loop enforces multi-pass critique before committing to OnlyOffice APIs.",
      },
      {
        title: "Quality Dimensions",
        points: [
          "Structure / Style / Readability",
          "Semantic Coherence & KPI Accuracy",
          "Accessibility & Consistency",
        ],
        stats: [
          { label: "Docs QA", value: "92%", trend: "up", caption: "Automated checks" },
          { label: "Latency", value: "42s", trend: "down", caption: "Avg fulfillment" },
          { label: "Revisions", value: "1.4", trend: "flat", caption: "Per request" },
        ],
      },
      {
        title: "Safety Guardrails",
        points: [
          "Redaction & whitelist enforcement",
          "Schema drift monitoring",
          "Fallback matrix + rollback snapshots",
        ],
        callout: "Guardrails run before AND after OnlyOffice mutations to ensure compliance.",
      },
      {
        title: "Future Intelligence",
        points: [
          "Adaptive style learning",
          "Predictive suggestions",
          "Multi-agent orchestration",
        ],
        quote: {
          text: "We expect the agent to critique its own slides the same way a design lead would.",
          author: "Canvas AI Research",
          role: "2025 Vision"
        }
      },
    ],
    appendix: ["Risk register oversight", "Performance scaling tiers"],
  }
}

export function generateRoadmapMarkdown(): string {
  return generateSlideMarkdown(buildRoadmapDeck())
}
