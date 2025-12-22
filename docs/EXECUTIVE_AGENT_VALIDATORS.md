# Executive Agent Structural & Style Validators (v0.1)

## 1. Purpose
Formalize validation rules applied during the REVIEW stage to assess and improve generated artifacts (DOCX, XLSX, PPTX, PDF). Validators produce machine-readable findings enabling automated patch proposals prior to COMMIT. They provide: (1) deterministic structural checks, (2) heuristic style compliance, (3) numeric integrity verification, (4) semantic consistency.

## 2. Output Contract
Each validator emits entries aggregated into a `ReviewReport.checks` section:
```jsonc
ValidatorResult {
  id: string;                 // unique rule id e.g. "heading.jump"
  category: "structure" | "style" | "readability" | "numeric" | "consistency" | "accessibility";
  severity: "info" | "warn" | "error";
  message: string;            // human readable
  targets?: string[];         // JSON pointer paths or spec ids
  metrics?: Record<string, number | string>; // rule-specific stats
  autoPatch?: PatchSuggestion; // optional direct patch
}

PatchSuggestion {
  patches: Array<{ target: string; action: "replace" | "append" | "remove" | "rename" | "normalize"; value?: any }>;
  rationale: string;
}
```

## 3. Scoring Model
Aggregate quality score (0–100) with weighted buckets:
| Bucket | Weight | Components |
|--------|--------|-----------|
| Structure | 30 | heading hierarchy, section completeness, table captions |
| Style | 20 | capitalization, bullet style, font profile adherence |
| Readability | 15 | Flesch, sentence length, passive rate |
| Numeric | 15 | table totals, variance column correctness |
| Consistency | 10 | duplicate headings, entity spelling uniformity |
| Accessibility | 10 | alt text coverage, footnote link validity |

`blockCommit` triggered if: any error severity OR overall score < 65.

## 4. Rule Catalog (Initial Set)
### 4.1 Structural Rules
| ID | Description | Logic | Severity | Auto Patch |
|----|-------------|-------|----------|-----------|
| heading.jump | Heading level jumps by >1 (e.g. H2 → H4) | Traverse sections; compute level diff | warn | Normalize levels based on prior heading |
| heading.empty | Empty heading text | length(trim(heading)) == 0 | error | Remove section or set placeholder |
| section.minBody | Section flagged summaryHint but body < 40 chars | summaryHint && len(body)<40 | warn | Append guidance sentence |
| table.caption.required | Large/complex table missing caption | rows>10 OR varianceColumns defined & no caption | warn | Insert caption "Table: <inferred heading>" |
| table.numeric.totals | Declared totals mismatch actual sum | compare declared vs sum(column) | error | Replace totals value |
| table.column.type.infer | Type mismatch (e.g. date column with non-date values) | infer majority type; outliers > threshold | info | Normalize offending cells |
| figure.orphan | Figure referenced but missing from figures array | crossRefs refType=figure not found | error | Remove crossRef or add figure stub |
| toc.depth | TOC config depth exceeds available levels | maxDepth > existing max | info | Lower maxDepth |

### 4.2 Style Rules
| ID | Description | Logic | Severity | Auto Patch |
|----|-------------|-------|----------|-----------|
| style.heading.capitalization | Inconsistent heading capitalization | majority pattern vs outliers | warn | Normalize heading text |
| style.bullet.prefix | Mixed bullet symbols in one list set | detect symbols | info | Replace with configured symbol |
| style.spacing.paragraph | Paragraph spacing outside configured bounds | spacing diff vs styleProfile | warn | Adjust spacing values |
| style.font.profile | Font mismatch from styleProfile | headingFont/bodyFont mismatch | warn | Replace font entries |
| style.color.contrast | Primary color low contrast vs background | contrast ratio < threshold | warn | Suggest new hex color |

### 4.3 Readability Rules (DOCX/PDF narrative sections)
| ID | Description | Logic | Severity | Auto Patch |
|----|-------------|-------|----------|-----------|
| readability.flesch | Flesch score below target | compute Flesch | warn (<target) | Add directive patch: condense or simplify |
| readability.long.sentences | Sentences > 35 words exceed ratio threshold | count long / total > 0.15 | info | Split sentences (patch suggestions) |
| readability.passive.voice | Passive voice density high | shallow regex heuristics | info | Highlight sentences for rewrite |

### 4.4 Numeric Rules (Tables/Sheets)
| ID | Description | Logic | Severity | Auto Patch |
|----|-------------|-------|----------|-----------|
| numeric.currency.format | Currency column lacks format | header matches patterns & no formats entry | info | Add format "$#,##0.00" |
| numeric.variance.column | Variance columns computed incorrectly | expected = compare - base | error | Recompute values |
| numeric.date.range | End Date precedes Start Date | parse dates; end < start | error | Swap or flag cells |
| numeric.blank.cell | Numeric column has blank cell in non-empty row set | detect blanks | warn | Fill with 0 or placeholder |

### 4.5 Consistency Rules
| ID | Description | Logic | Severity | Auto Patch |
|----|-------------|-------|----------|-----------|
| consistency.duplicate.heading | Same heading appears >2 times at same level | count occurrences | warn | Append qualifier (e.g. "(2)") |
| consistency.entity.spelling | Entity spelled multiple ways | NER or simple dictionary; variant count >1 | warn | Normalize to dominant form |
| consistency.clause.version | Mixed clause versions | clause id same but version differs | warn | Align to latest version |

### 4.6 Accessibility Rules
| ID | Description | Logic | Severity | Auto Patch |
|----|-------------|-------|----------|-----------|
| accessibility.figure.alt | Image figure missing altText | figure.kind=image && !altText | error | Insert placeholder altText |
| accessibility.table.header | Table lacks headers row | headers empty but rows present | error | Infer headers from first row |
| accessibility.footnote.ref | Footnote reference target missing | crossRef.refType=footnote not found | warn | Remove reference or add footnote placeholder |
| accessibility.list.structure | Nested list incorrectly flattened | pattern detection | info | Rebuild structured bullet hierarchy |

## 5. Rule Configuration JSON
Rules configurable via `validators-config.json`:
```jsonc
{
  "targets": { "minFlesch": 55, "maxLongSentenceRatio": 0.15, "contrastThreshold": 4.5 },
  "enabled": ["heading.jump","table.caption.required","readability.flesch","numeric.date.range","accessibility.figure.alt"],
  "disabled": ["style.color.contrast"],
  "severityOverrides": { "heading.jump": "info" },
  "autoPatch": { "numeric.date.range": true, "heading.empty": true }
}
```

## 6. Execution Order
1. Structural pass (establish baseline & map ids)  
2. Numeric integrity (dependent on resolved table structures)  
3. Style normalization (may reduce subsequent readability issues)  
4. Readability analysis (post-normalization)  
5. Consistency sweep (needs full content snapshot)  
6. Accessibility check (final resource completeness)  

## 7. Performance Considerations
- Run heavy readability metrics only if document word count < 50k or in batch mode.
- Cache heading normalization patterns per session.
- Parallelize table numeric checks across tables > 5.

## 8. Patch Application Strategy
- Collect all `autoPatch` suggestions; filter conflicting patches (same target).
- Apply deterministic patches first (numeric corrections), then stylistic.
- Recompute affected metrics (e.g. totals, readability) after patching.

## 9. Sheet-Specific Extensions (Preview)
Additional rules for XLSX (later phase):
- `sheet.formula.missing`: recommended formula absent (e.g. SUM in total row).  
- `sheet.namedrange.unused`: named range declared but never referenced.  
- `sheet.pivot.outdated`: pivot table not refreshed after data change (requires metadata).  

## 10. Presentation-Specific Extensions (Preview)
- `slides.title.missing`: slide without a title.  
- `slides.layout.inconsistent`: mismatch between declared slide type and content.  
- `slides.bullet.length`: bullet exceeds length threshold.  

## 11. PDF-Specific Extensions (Preview)
- `pdf.heading.sequence`: heading numbering sequence jump.  
- `pdf.page.overflow`: text exceeding bottom margin (detected via approximate layout metrics).  

## 12. Future Enhancements
- ML-based readability & clarity scoring.  
- Semantic coherence rule (section transitions).  
- Terminology enforcement (industry-specific glossary).  
- Bias detection (flag certain loaded terms).  

## 13. Example Aggregated Output
```jsonc
{
  "checks": {
    "structure": { "ok": false, "errors": ["heading.empty"], "warnings": ["table.caption.required"] },
    "style": { "warnings": ["style.heading.capitalization"], "ok": true },
    "readability": { "score": 52.3, "target": 55, "ok": false },
    "numeric": { "errors": ["numeric.date.range"], "ok": false },
    "consistency": { "warnings": ["consistency.duplicate.heading"], "ok": true },
    "accessibility": { "errors": ["accessibility.figure.alt"], "ok": false }
  },
  "validators": [
    { "id": "heading.empty", "category": "structure", "severity": "error", "message": "Empty heading at section sec-5", "targets": ["/sections/5/heading"], "autoPatch": { "patches": [{"target":"/sections/5","action":"remove"}], "rationale": "Remove unused empty section" } },
    { "id": "numeric.date.range", "category": "numeric", "severity": "error", "message": "End Date precedes Start Date in row 3", "targets": ["/sections/2/table/rows/2"], "autoPatch": { "patches": [{"target":"/sections/2/table/rows/2/2","action":"replace","value":"2025-11-15"}], "rationale": "Correct inverted dates" } }
  ],
  "score": 61,
  "blockCommit": true
}
```

## 14. Next Steps
- Implement JSON schema for `ValidatorResult`.  
- Draft deterministic algorithms (heading sequence, totals check).  
- Integrate with REVIEW stage orchestrator.  
- Unit tests: craft fixtures for each rule.

---
End validators spec v0.1.
