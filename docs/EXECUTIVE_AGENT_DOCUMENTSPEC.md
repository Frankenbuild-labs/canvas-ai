# Executive Agent Extended DocumentSpec Schema (v0.1)

## 1. Purpose
Provide a rich, structured intermediate representation that the agent produces in the RENDER stage before committing to OnlyOffice operations. It captures semantic, stylistic, and structural intent allowing validators and granular edits.

## 2. High-Level Object
```jsonc
DocumentSpec {
  version: string;                // Schema version
  artifactType: "docx" | "pdf";  // (Sheets/Slides use parallel specs)
  title: string;
  subtitle?: string;
  metadata: {
    tone: "formal" | "concise" | "persuasive" | "analytical" | string;
    audience?: string;            // e.g. "executive", "technical", "legal"
    styleProfile?: string;        // Refer to stored style set
    readingLevel?: "general" | "professional" | "legal";
    sourceOutlineVersion?: string;
    docPurpose?: string;          // e.g. "agreement", "status-report"
    classification?: string;      // sensitivity (public/internal/confidential)
  };
  numbering: {
    headingScheme?: "decimal" | "legal" | "none"; // (1, 1.1, etc.)
    listBulletSymbol?: "•" | "-" | "*";            // for normalization
  };
  styles: {
    headingFont?: string;
    bodyFont?: string;
    monoFont?: string;
    primaryColor?: string;        // brand color
    secondaryColor?: string;
    accentColors?: string[];
    spacing?: { paragraphAfter?: number; paragraphBefore?: number };
  };
  sections: Section[];            // ordered content units
  clauses?: Clause[];             // legal or standardized text blocks
  figures?: Figure[];             // images, diagrams, charts (logical refs)
  references?: CrossReference[];  // dynamic cross-links
  footnotes?: Footnote[];
  endnotes?: Endnote[];
  toc?: TableOfContentsConfig;    // instructions for TOC rendering
  assets?: AssetManifest;         // external files to embed later
  revisionDirectives?: RevisionDirective[]; // instructions for tracked changes
  diagnostics?: GenerationDiagnostics;      // optional hints from generator
}
```

## 3. Section Structure
```jsonc
Section {
  id: string;                    // stable identifier
  heading: string;               // rendered as heading level determined by outline
  level?: number;                // explicit level override (1..6)
  body?: string;                 // markdown-lite text body
  bullets?: string[];            // unordered list items
  numbered?: string[];           // ordered list items
  definitionList?: DefinitionItem[]; // term: definition pairs
  callouts?: Callout[];          // emphasis blocks (note, warning, risk, tip)
  table?: TableSpec;             // structured tabular data
  figures?: string[];            // figure IDs referenced inline
  clauses?: string[];            // clause IDs inserted here
  crossRefs?: string[];          // cross-reference IDs mentioned in this section
  tags?: string[];               // semantic tags ("timeline", "risk")
  summaryHint?: boolean;         // validator may require summary presence
  importanceScore?: number;      // for salience weighting (0-1)
}
```

### 3.1 Definition Items
```jsonc
DefinitionItem { term: string; definition: string; relatedTerms?: string[] }
```

### 3.2 Callouts
```jsonc
Callout {
  id?: string;
  kind: "note" | "warning" | "risk" | "tip" | "info";
  text: string;
  severity?: "low" | "medium" | "high"; // used for risk dashboards
}
```

### 3.3 Table Spec
```jsonc
TableSpec {
  id?: string;
  caption?: string;                 // required for validator if complex
  headers: string[];                // column names
  rows: (string | number | TableCellValue)[][];
  columnTypes?: string[];           // inferred types (text, number, date, currency)
  formats?: { [column: string]: string }; // e.g. { "Revenue": "$#,##0" }
  totals?: { [column: string]: number };  // expected summary values
  varianceColumns?: { base: string; compare: string; name: string }[]; // auto compute
  computed?: ComputedFormula[];     // formulas to be evaluated client side
  sourceRef?: string;               // link to dataset or prior sheet
  sort?: { column: string; order: "asc" | "desc" };
  filters?: { column: string; values: string[] }[];
}
```

```jsonc
TableCellValue {
  raw: string | number;                // original literal
  normalized?: string | number;        // cleaned form
  annotations?: string[];              // notes/warnings
}
```

```jsonc
ComputedFormula { column: string; formula: string; description?: string }
```

## 4. Clauses
```jsonc
Clause {
  id: string;                      // stable key (e.g. confidentiality)
  name: string;                    // human-friendly name
  text: string;                    // canonical clause text
  category?: string;               // legal, compliance, finance
  jurisdiction?: string[];         // applicable regions
  optional?: boolean;              // may be excluded
  version?: string;                // track updates
}
```

## 5. Figures
Figures are logical placeholders referencing images/charts to be materialized.
```jsonc
Figure {
  id: string;
  kind: "image" | "chart" | "diagram";
  title?: string;
  altText?: string;                 // accessibility
  source?: string;                  // URL or data reference
  dataBinding?: { tableId?: string; columns?: string[] }; // for charts
  style?: { widthPct?: number; float?: "left" | "right" | "center" };
}
```

## 6. Cross References
```jsonc
CrossReference {
  id: string;
  targetId: string;            // section/table/figure/footnote id
  displayText?: string;        // override label
  refType: "section" | "table" | "figure" | "clause" | "footnote";
}
```

## 7. Footnotes / Endnotes
```jsonc
Footnote { id: string; text: string }
Endnote  { id: string; text: string }
```

## 8. TOC Configuration
```jsonc
TableOfContentsConfig {
  includeLevels?: number[];          // e.g. [1,2,3]
  maxDepth?: number;                 // cutoff
  includeFigures?: boolean;
  includeTables?: boolean;
  headingNormalization?: boolean;    // enforce consistent casing
}
```

## 9. Asset Manifest
```jsonc
AssetManifest {
  images?: { id: string; url: string; license?: string; width?: number; height?: number }[];
  fonts?: { name: string; source: string }[];
  attachments?: { id: string; filename: string; url: string }[];
}
```

## 10. Revision Directives
```jsonc
RevisionDirective {
  id?: string;
  target: string;                  // JSON pointer or path
  intent: "refactor" | "condense" | "expand" | "tone-adjust" | "localize";
  params?: { wordLimit?: number; tone?: string };
  rationale?: string;              // why change is proposed
}
```

## 11. Diagnostics
```jsonc
GenerationDiagnostics {
  issues?: { code: string; message: string; severity: "info" | "warn" | "error" }[];
  tokensUsed?: number;              // planning/render tokens estimate
  planningLatencyMs?: number;
}
```

## 12. Minimal vs Rich Spec
| Tier | Required Fields | Optional Fields | Typical Use |
|------|-----------------|-----------------|-------------|
| Minimal | title, sections[{heading, body}] | bullets | Fast drafting / fallback |
| Standard | + metadata, styles, tables w/ headers | callouts, clauses | Normal generation |
| Rich | full schema incl. figures, crossRefs, footnotes, diagnostics | endnotes, revisionDirectives | High-fidelity professional output |

## 13. Validation Hooks (Mapping)
| Rule | Target | Logic |
|------|--------|-------|
| Heading Hierarchy | sections.level | Must not jump by >1 | 
| Table Caption Presence | table.caption | Required when rows > 10 or varianceColumns defined |
| Clause Whitelist | clauses.id | Must exist in clause library |
| Figure Alt Text | figures.altText | Required for kind=image |
| Bullet Length | bullets[] | < 160 chars each |
| Callout Density | sections.callouts | Max 3 per section (warn otherwise) |
| Footnote Target | crossRefs.refType=footnote | Must reference existing footnote |

## 14. Diffing Strategy
Diff operations between prior and new spec consider section `id`. Additions: new id; deletions: missing id; modifications: property-level changes hashed. Enables granular editing decisions via `changeRatio`.

## 15. Extensibility Notes
- Future: multilingual text segments (`bodyLocales:{en:..., es:...}`)
- Accessibility scoring: track altText coverage and heading structure compliance.
- Security classification: integrate with export gating (e.g., restrict external sharing if classification=confidential and missing disclaimers).

## 16. Example (Rich)
```jsonc
{
  "version": "0.2",
  "artifactType": "docx",
  "title": "Q4 Product Launch Plan",
  "metadata": { "tone": "persuasive", "audience": "executive", "styleProfile": "corp-a", "docPurpose": "status-report" },
  "styles": { "headingFont": "Calibri", "bodyFont": "Calibri", "primaryColor": "#004A7C" },
  "sections": [
    { "id": "sec-exec", "heading": "Executive Summary", "level": 1, "body": "Launch targets ...", "callouts": [{"kind":"risk","text":"Supply chain delay potential","severity":"medium"}], "tags":["summary"], "importanceScore":0.95 },
    { "id": "sec-timeline", "heading": "Timeline", "level": 1, "table": { "headers": ["Phase","Start","End","Owner"], "rows": [["Design","2025-11-01","2025-11-10","UX"],["Development","2025-11-11","2025-12-20","Eng"]], "caption": "Launch Schedule" } }
  ],
  "clauses": [{"id":"confidentiality","name":"Confidentiality","text":"All information is confidential."}],
  "figures": [{"id":"fig-burndown","kind":"chart","title":"Burndown","dataBinding":{"tableId":"sec-timeline","columns":["Start","End"]}}],
  "references": [{"id":"ref-sched","targetId":"sec-timeline","refType":"section"}],
  "toc": {"includeLevels":[1,2],"includeFigures":true},
  "footnotes": [{"id":"fn1","text":"Dates subject to regulatory review."}],
  "diagnostics": {"issues":[{"code":"table-no-variance","message":"Timeline table lacks duration column","severity":"info"}],"tokensUsed": 1800}
}
```

## 17. Next Steps
- Finalize JSON Schema draft for enforcement in PLAN→RENDER.
- Integrate validator rule mapping.
- Prepare example fixtures for unit tests.

---
End spec v0.1.
