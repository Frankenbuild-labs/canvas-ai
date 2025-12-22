# Executive Agent Multi-Stage Pipeline Spec (v0.1)

## 1. Objective
Improve output quality and reliability by decomposing generation into discrete, inspectable stages: PLAN → RENDER → REVIEW (QA) → COMMIT → POSTLOG. Each stage produces a structured artifact enabling validation, repair, and traceability.

## 2. Stage Overview
| Stage | Purpose | Input | Output | Failure Handling |
|-------|---------|-------|--------|------------------|
| PLAN | Transform user intent + context into structured outline & data requirements | User prompt, active doc context, memory, templates catalog | `PlanningOutline` JSON | Retry w/ simplified constraints; escalate if repeated failure |
| RENDER | Produce rich `documentSpec` (or sheet/presentation spec) from outline | `PlanningOutline`, style profile, template params | `DocumentSpec` (or `SheetSpec`, `PresentationSpec`) | Fallback to markdown generation; annotate missing sections |
| REVIEW | Validate structure, style, readability, consistency; generate fixes | Spec artifact, validators config | `ReviewReport` + optional `PatchSet` | Apply patch subset; if critical errors remain, request model refinement |
| COMMIT | Execute granular or create tool calls to materialize artifact | Approved spec & patches | Tool execution results (URLs, ids) | Downgrade features (e.g., omit charts) if exec errors |
| POSTLOG | Persist metadata, semantic nodes, diff, metrics | All prior outputs + final document | `ArtifactRecord`, embeddings | Log subset if full persist fails |

## 3. Data Contracts
### 3.1 `PlanningOutline`
```jsonc
{
  "version": "0.1",
  "artifactType": "docx" | "xlsx" | "pptx" | "pdf",
  "purpose": "High-level intent of the artifact",
  "audience": "Primary reader",
  "tone": "formal" | "concise" | "persuasive" | "analytical",
  "styleProfile": { "brand": "default", "readingLevel": "professional" },
  "sections": [
    { "id": "sec-1", "title": "Executive Summary", "goal": "Summarize ask", "sectionType": "narrative", "required": true },
    { "id": "sec-2", "title": "Timeline", "goal": "Visual schedule", "sectionType": "table", "dependencies": ["sec-1"] }
  ],
  "dataNeeds": [ { "name": "tasks", "kind": "table", "columns": ["Task","Start","End","Status"] } ],
  "templateSuggestion": { "templateId": "project-plan", "confidence": 0.74 },
  "constraints": { "maxPages": 4, "includeClauses": ["confidentiality"], "exclude": ["marketing fluff"] }
}
```

### 3.2 `DocumentSpec` (excerpt – full extension later)
```jsonc
{
  "version": "0.2",
  "title": "Project Manager Gantt Chart",
  "subtitle": "Phase breakdown",
  "metadata": { "tone": "analytical", "styleProfile": "corporate-standard", "sourceOutlineVersion": "0.1" },
  "sections": [
    {
      "id": "sec-1",
      "heading": "Executive Summary",
      "body": "This project spans Q4 with staged deployment...",
      "bullets": ["Goals clarified","Stakeholders mapped"],
      "callouts": [ { "kind": "risk", "text": "Holiday freeze may extend timeline." } ]
    },
    {
      "id": "sec-2",
      "heading": "Timeline Overview",
      "table": {
        "caption": "Project Phases",
        "headers": ["Task","Start Date","End Date","Duration (days)","Status"],
        "rows": [
          ["Project Planning","2025-11-01","2025-11-05",5,"Completed"],
          ["Design Phase","2025-11-06","2025-11-15",10,"In Progress"]
        ],
        "totals": { "Duration (days)": 15 }
      }
    }
  ],
  "clauses": [ { "name": "confidentiality", "text": "All information..." } ],
  "figures": [],
  "styles": { "headingFont": "Calibri", "bodyFont": "Calibri", "primaryColor": "#1E4D8D" }
}
```

### 3.3 `ReviewReport`
```jsonc
{
  "specVersion": "0.2",
  "checks": {
    "structure": { "ok": true, "warnings": ["No figure captions"], "errors": [] },
    "readability": { "score": 58.2, "target": 55, "ok": true },
    "consistency": { "duplicateHeadings": 0, "entityMismatches": [] },
    "style": { "violations": ["Heading capitalization variance"] },
    "tables": { "missingCaptions": 0, "numericFormatIssues": [] }
  },
  "severity": "warn",
  "recommendedPatches": [
    { "id": "patch-1", "target": "sections[1].table.headers[3]", "action": "rename", "value": "Duration" },
    { "id": "patch-2", "target": "sections[0].callouts", "action": "append", "value": { "kind": "note", "text": "Budget approvals pending." } }
  ],
  "blockCommit": false
}
```

### 3.4 `PatchSet`
```json
{ "patches": [ { "target": "sections[0].body", "action": "replace", "value": "Updated summary ..." } ] }
```

### 3.5 `ArtifactRecord`
```jsonc
{
  "artifactId": "project-manager-gantt-chart.docx",
  "url": "/generated/project-manager-gantt-chart.docx?v=1731682200000",
  "kind": "docx",
  "outlineHash": "sha256:...",
  "specHash": "sha256:...",
  "reviewMetrics": { "readability": 58.2, "structureWarnings": 1 },
  "semanticNodes": 24,
  "createdAt": "2025-11-15T15:10:00Z"
}
```

## 4. Stage Transitions & Messaging
- System sends `tools` event listing capability snapshot.
- PLAN stage requests: model produces `PlanningOutline` as JSON (enforced by system prompt + JSON schema). If parse fails twice, fallback to minimal outline.
- RENDER stage: model transforms outline → spec. Must cite outline `id` mapping in each section for traceability.
- REVIEW stage: deterministic validators run first; model receives spec + validator findings to produce `ReviewReport`. If `blockCommit=true`, a refinement loop re-enters RENDER with patch suggestions applied.
- COMMIT stage: choose granular operations: if >5 structural elements changed vs existing doc → create; else sequence of `insert_section` / `replace_paragraph` tool calls.
- POSTLOG: background; never blocks user; failures logged separately.

## 5. Failure Handling Strategy
| Failure | Detection | Response |
|---------|-----------|----------|
| Invalid JSON (PLAN/RENDER) | Parse error | Regenerate with stricter schema hint; max 2 retries |
| Critical validator errors | `blockCommit=true` | Apply auto patches, re-run REVIEW |
| Tool execution error | Non-200 response | Fallback: downgrade feature (omit charts), retry once |
| Memory/registry write failure | Exception in POSTLOG | Queue retry; do not affect response |

## 6. Validator Categories (Initial Set)
- Structural: heading level jumps (>1), missing captions, empty sections.
- Readability: Flesch score, average sentence length, jargon density.
- Consistency: duplicate headings, mismatched entity spelling (company name variants).
- Style: font families, color constraints, banned phrase list.
- Numeric: table column totals vs computed sums, date range coherence.

## 7. Patch Semantics
Actions: `replace`, `append`, `remove`, `rename`, `move`, `normalize`.
Targets: JSON pointer or dot-notation with array indices (e.g. `sections[2].table.rows[5][3]`). Patches applied sequentially; invalid target aborts that patch only.

## 8. Granular vs Bulk Commit Decision
Compute `changeRatio = changedNodes / totalNodes`. Thresholds:
- `changeRatio > 0.4` → bulk generate with create tool.
- Else granular edit operations.
Allows efficient small edits without regenerating entire document.

## 9. Context Assembly Inputs
- Active document semantic summary (outline + key tables).
- Recent memory (last N research + edits).
- Template inventory filtered by category and outline purpose.
- User style profile & preferences.
- Clause library subset relevant to domain (legal, finance, etc.).

## 10. Security & Guardrails
- Clause library whitelist: legal clauses only from approved list; validator flags unknown patterns.
- Size limits: max sections 50, max table rows 2000 in initial version.
- Rate limiting: PLAN/RENDER loops capped at 3 cycles per request.

## 11. Metrics for Monitoring
| Metric | Source | Use |
|--------|--------|-----|
| Planning parse success rate | PLAN logs | Prompt robustness |
| Average review severity | ReviewReport | Quality trend |
| Change ratio distribution | COMMIT decisions | Edit efficiency |
| Patch application success | PatchSet logs | Reliability |
| Rework edits (user manual) | User interaction logs | Adaptive improvement |

## 12. Next Specs to Derive
1. Extended `DocumentSpec` full schema (with callouts, figures, styles).  
2. Granular edit operations tool contract definitions.  
3. Validator rule JSON format.  
4. Template metadata manifest and ingestion steps.  
5. Spreadsheet & presentation spec parallels.

## 13. Open Questions
- Do we need multimodal (images) in Phase 1 spec or defer to Phase 2?  
- Preferred readability target per category (legal vs marketing)?  
- How to handle user-provided partial patch suggestions?  

---
End of pipeline spec v0.1.
