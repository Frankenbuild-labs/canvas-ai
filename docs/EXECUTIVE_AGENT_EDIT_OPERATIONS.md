# Executive Agent Granular Edit Operations Spec (v0.1)

## 1. Purpose
Enable precise, low-latency modifications to existing artifacts (DOCX, XLSX, PPTX, PDF derivatives) without full regeneration. Operations consume semantic references (section ids, table cell coordinates, paragraph indices) derived from the `DocumentSpec` or live OnlyOffice state. They allow iterative refinement, patch application from validators, and user-driven micro-edits.

## 2. Design Principles
- **Idempotent:** Same operation applied twice yields identical final state (or safe noop).
- **Atomic:** Each tool call modifies a single logical target; failures do not cascade.
- **Traceable:** All ops appended to a revision log with delta snapshot (before/after hash).
- **Composable:** Complex changes are sequences orchestrated by the agent (plan edits set).
- **Validating:** Operation preflight checks ensure target exists and patch is sane.

## 3. Core Operations (DOCX Focus Phase 1)
| Tool Name | Intent | Input Summary | Output Summary | Preflight Checks |
|-----------|--------|---------------|----------------|------------------|
| insert_section | Add new section at position | { afterSectionId?, positionIndex?, sectionSpec } | { sectionId, status } | Duplicate heading? max sections? |
| replace_paragraph | Replace paragraph text in section | { sectionId, paragraphIndex, newText } | { status, oldText } | Paragraph index exists |
| append_paragraph | Append paragraph to section end | { sectionId, newText } | { status, paragraphIndex } | Section exists |
| update_table_cell | Modify a table cell value | { sectionId, tableId?, rowIndex, colIndex, newValue } | { status, oldValue } | Table + indices valid |
| insert_table_row | Add data row to table | { sectionId, tableId?, rowData, position? } | { status, rowIndex } | Matching column length |
| delete_table_row | Remove row from table | { sectionId, tableId?, rowIndex } | { status } | Row index valid |
| apply_style_set | Apply style profile to document or section | { scope: "document"|"section", sectionId?, styleProfileId } | { status, changesApplied } | Style profile exists |
| move_section | Reorder section | { sectionId, beforeSectionId? afterSectionId? newIndex? } | { status } | All ids exist; no cycle |
| summarize_section | Condense section body to length/ratio | { sectionId, targetWordCount?, strategy? } | { status, oldBody, newBody } | Body > threshold length |
| expand_section | Expand terse section with richer detail | { sectionId, hints?, minWordCount } | { status, oldBody, newBody } | Section body below density threshold |
| add_callout | Insert callout into section | { sectionId, kind, text, severity? } | { status, calloutId } | Max callouts per section |
| remove_section | Delete section entirely | { sectionId } | { status } | Section exists; not protected |
| diff_document | Produce structural + textual diff vs latest spec | { baselineSpecHash?, includeTables?, includeFigures? } | { diff, changeRatio } | Baseline retrievable |
| patch_document | Apply batched patches (validator output) | { patches[] } | { applied:[], failed:[] } | Each target exists |
| rename_heading | Change heading text with normalization | { sectionId, newHeading } | { oldHeading, newHeading } | No duplicate conflict |
| replace_clause | Swap out clause text by id | { clauseId, newText, version? } | { status, oldText } | Clause exists |
| insert_footnote | Add footnote and crossRef | { sectionId?, text, refPosition? } | { footnoteId } | Footnote count limit |
| remove_footnote | Remove footnote + dangling refs | { footnoteId } | { status, removedRefs } | Footnote exists |
| adjust_numbering_scheme | Normalize heading numbering | { scheme: "decimal"|"legal"|"none" } | { status, changes } | Scheme recognized |

## 4. Extended Spreadsheet Operations (Phase 2)
| Tool Name | Intent |
|-----------|-------|
| sheet_update_cell | Set cell content & optional formula { sheetName, cellRef, value, formula? }
| sheet_apply_formula_range | Bulk apply formula pattern { sheetName, range, formulaTemplate }
| sheet_create_named_range | Define named range { sheetName, range, name }
| sheet_insert_chart | Request chart insertion { sheetName, type, title, xRange, yRanges[] }
| sheet_create_pivot | Create pivot table { sourceRange, destSheet, rows[], cols[], values[] }
| sheet_conditional_format | Apply rule { sheetName, range, ruleType, params }
| sheet_add_validation | Data validation { sheetName, range, type, params }

## 5. Presentation Operations (Phase 2)
| Tool Name | Intent |
|-----------|-------|
| slides_insert_slide | Add slide with layout { position?, layoutType, title, bullets?, chartSpec?, tableSpec? }
| slides_replace_content | Replace slide body { slideId, blocks[] }
| slides_reorder | Move slide { slideId, newIndex }
| slides_apply_theme | Apply theme pack { themeId }
| slides_add_image | Embed image { slideId, url, altText, widthPct? }

## 6. PDF Operations (Phase 3)
| Tool Name | Intent |
|-----------|-------|
| pdf_insert_annotation | Add annotation { page, type, text, rect }
| pdf_add_watermark | Apply watermark { text|imageUrl, opacity }
| pdf_attach_signature_block | Reserve signature area { page, position }

## 7. Input Schemas (Representative)
```jsonc
insert_section.args.schema = {
  "type":"object",
  "properties":{
    "afterSectionId":{"type":"string"},
    "positionIndex":{"type":"number"},
    "sectionSpec":{
      "type":"object",
      "properties":{
        "heading":{"type":"string"},
        "body":{"type":"string"},
        "bullets":{"type":"array","items":{"type":"string"}},
        "table":{"type":"object"},
        "callouts":{"type":"array"}
      },
      "required":["heading"]
    }
  },
  "oneOf":[{"required":["afterSectionId","sectionSpec"]},{"required":["positionIndex","sectionSpec"]}],
  "additionalProperties":false
}
```
(If provider disallows top-level combinators, enforce runtime mutual exclusion instead.)

```jsonc
update_table_cell.args.schema = {
  "type":"object",
  "properties":{
    "sectionId":{"type":"string"},
    "tableId":{"type":"string"},
    "rowIndex":{"type":"number"},
    "colIndex":{"type":"number"},
    "newValue":{}
  },
  "required":["sectionId","rowIndex","colIndex","newValue"]
}
```

## 8. Revision Logging
Each successful operation emits a revision entry:
```jsonc
RevisionEntry {
  id: string;                // uuid
  op: string;                // tool name
  timestamp: string;         // ISO
  userId?: string;           // actor
  targets: string[];         // spec paths
  beforeHash?: string;       // optional content hash
  afterHash?: string;        // hash post-change
  diffSummary?: string;      // brief description
  meta?: any;                // operation-specific metrics
}
```
Stored in memory store + optional append-only log for auditing.

## 9. Conflict Handling
- If target path not found → return { status:"conflict", reason:"missing_target" }.
- For concurrent edits: compare `beforeHash`; if mismatch, require `diff_document` then reapply.
- Multi-patch tool (`patch_document`) returns granular success/failure arrays.

## 10. Change Ratio Guidance
Agent calculates `changeRatio` after sequences:
- If projected changeRatio > 0.4 before executing a batch → consider bulk regenerate.
- Otherwise proceed granularly.

## 11. Safety Constraints
| Constraint | Rationale | Enforcement |
|------------|-----------|-------------|
| Max sections 200 | Avoid runaway insertion | insert_section preflight |
| Max table rows per edit 200 | Performance | insert_table_row / delete_table_row |
| Summarize only >150 words | Avoid loss of meaning | summarize_section preflight |
| Expand only <80 words | Ensure growth target | expand_section preflight |
| Protected sections list | Prevent accidental deletion | remove_section checks |

## 12. Tone & Style Adjust Operations (Phase 2)
| Tool Name | Intent |
|-----------|--------|
| tone_adjust_section | Modify tone (formal, concise, persuasive) for section | { sectionId, tone } |
| normalize_terminology | Replace synonyms with canonical terms | { termsMap } |
| elevate_readability | Rewrite sentences exceeding threshold | { sectionId, targetScore } |

## 13. Integration with Validators
Validator-generated patches routed through `patch_document`; agent may split large patch sets into safe groups (numeric first, structural second, style last). Post-application: re-run subset of validators that were affected.

## 14. Example Workflow (Section Summarize)
1. Agent identifies section body length=620 words; user asks "condense to executive summary."  
2. Call `summarize_section` with targetWordCount=200.  
3. Operation returns oldBody/newBody; revision logged.  
4. Run readability + structure validators on modified section only.  
5. If Flesch < target → second pass using `tone_adjust_section`.

## 15. Open Questions
- Should `move_section` accept relative offsets vs absolute indices?  
- Merge behavior for consecutive paragraph replacements (batch vs separate revisions)?  
- Multi-table updates: interim commit or aggregate patch?  

## 16. Next Steps
- Finalize JSON schemas (remove top-level oneOf for provider compatibility; enforce runtime logic).  
- Define protected sections config format.  
- Implement revision log store adapters.  
- Create diff algorithm for `diff_document` (structure + text, ignoring style ephemeral fields).  

---
End edit operations spec v0.1.
