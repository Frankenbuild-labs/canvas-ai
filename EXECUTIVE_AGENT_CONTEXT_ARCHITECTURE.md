# Executive Agent Context Architecture (v0.1)

## 1. Purpose & Goals
Provide a unified, queryable semantic context layer enabling the Executive Agent to:
- Plan with structural awareness (sections, clauses, tables, figures, KPIs).
- Retrieve prior high‑quality fragments for reuse/adaptation.
- Enforce consistency (terminology, numbering, styles, KPIs) across documents.
- Support granular edit operations with precise targeting and impact prediction.
- Enable evaluation loop scoring using rich structural + historical signals.

## 2. Core Components Overview
| Component | Description | Scope |
|-----------|-------------|-------|
| Semantic Graph | In-memory graph of current artifact (nodes + edges + attributes) | Per document run |
| Cross-Document Memory | Persisted index of prior nodes & artifacts (embeddings + metadata) | Global/shared |
| Clause Library | Curated reusable clause entities (legal, compliance, disclaimers) | Global/domain |
| KPI Registry | Structured definitions of metrics referenced in documents/spreadsheets | Domain/business |
| Style Profile | Learned style vectors & rules per user/org (tone, formality, brand) | User/org |
| User Profile | Persona, preferences, constraints, authorized data scopes | User |
| Terminology Glossary | Canonical term → preferred form + variants | Org/domain |
| Retrieval Service | Hybrid semantic + lexical search interface over memory graphs | Shared |
| Constraint Engine | Propagates numbering, styles, KPI accuracy, glossary enforcement | Per run |
| Salience Scorer | Computes weighted importance & selection priority for candidate nodes | Shared |
| Safety Filter | Screens retrieved nodes for restricted content before usage | Shared |

## 3. Semantic Graph Model
### 3.1 Node Types
| Node Type | Key Fields | Notes |
|-----------|------------|-------|
| Document | id, title, type, createdAt, version, styleProfileRef | Root container |
| Section | id, headingText, level, order, tags[], summary?, styleHints{} | Hierarchical backbone |
| Paragraph | id, text, sectionId, order, readabilityScores{}, styleHints{} | Base narrative unit |
| List | id, type(ordered/unordered/definition), sectionId, order | Container for list items |
| ListItem | id, parentListId, order, text, nestingLevel | Supports multi-level lists |
| Table | id, sectionId, caption?, rows, cols, headerMap[], columnTypes[], kpiBindings[] | Structured data |
| TableRow | id, tableId, index, isHeader | Row abstraction (optional) |
| TableCell | id, rowId/tableId, rowIndex, colIndex, text/value, formula?, kpiRef? | Fine-grain ops |
| Clause | id, clauseType, text, complianceTags[], jurisdiction?, version | Reusable / regulated |
| Figure | id, caption, type(chart/image/diagram), dataRef?, altText, accessibilityMeta{} | Visuals |
| DefinitionTerm | id, term, glossaryRef?, relatedTerms[] | For definition lists |
| DefinitionDef | id, termRef, text | Glossary mapping |
| CrossRef | id, sourceNodeId, targetNodeId, refType(section/table/figure/kpi) | Integrity checks |
| StyleSet | id, name, properties{fonts, sizes, spacing, paletteRefs} | Stylistic rules |
| KPI | id, name, formula?, targetValue?, sourceSystem?, unit, lastUpdated | Business metrics |
| Annotation | id, nodeId, type(issue/suggestion/info), severity, message, originStage | Review loop |
| Patch | id, appliesToNodeId[], operations[], diffHash, impactScore | Edit tracking |

### 3.2 Edge Types
| Edge | From | To | Semantics |
|------|------|----|----------|
| contains | Document/Section/List/Table | Section/Paragraph/ListItem/TableRow/TableCell/Figure | Structural hierarchy |
| precedes | Paragraph/ListItem/Section | Paragraph/ListItem/Section | Ordering |
| references | CrossRef source | CrossRef target | Citation / dependency |
| defines | DefinitionTerm | DefinitionDef | Terminological binding |
| cites | Section/Paragraph | Clause/KPI/Figure | Explicit mention |
| revisionOf | Patch | Node | Historical lineage |
| derivedFrom | Node | Node | Generated adaptation (e.g., summary) |
| versionOf | Clause/KPI | Clause/KPI | Version chain |
| kpiMentions | Paragraph/TableCell | KPI | Metric usage |

### 3.3 Node Attribute Conventions
- Stable IDs: ULID or UUIDv7 for chronological ordering.
- contentHash: SHA256 normalized text for deduplication.
- embeddings: Vector(s) per node (semantic + domain-specific).
- qualityScores: {structure:0-1, style:0-1, readability:FK, compliance:0-1, freshness:0-1}.
- accessLevel: public | internal | confidential (for retrieval filtering).

### 3.4 Graph Snapshot Format (JSON)
```json
{
  "documentId": "...",
  "version": "2025-11-15T10:32:11Z",
  "nodes": [{"id":"sec_01","type":"Section","headingText":"Introduction","level":1,"order":0}],
  "edges": [{"type":"contains","from":"doc_root","to":"sec_01"}],
  "metrics": {"nodeCount": 128, "sectionDepth": 3, "avgReadability": 52.1},
  "styleProfileRef": "style_org_default",
  "glossaryRefs": ["gloss_main"],
  "kpiRefs": ["kpi_mrr"],
  "buildDiagnostics": []
}
```

## 4. Cross-Document Memory Layer
### 4.1 ArtifactIndex
| Field | Description |
|-------|-------------|
| artifactId | Document unique id |
| artifactType | docx | xlsx | pptx | pdf |
| createdAt | Timestamp |
| tags[] | Domain/category labels |
| embeddings{} | Global + section-level aggregated vectors |
| sectionSummaries[] | Compressed semantic abstracts |
| styleProfileRef | Link to style profile |
| qualityAggregate | Composite quality score |

### 4.2 ClauseLibrary
- Canonical JSON entries, versioned; each clause links compliance tags & allowed jurisdictions.
- Validation ensures only latest approved versions used when compliance-critical.

### 4.3 KPI Registry
- Standardize metric semantics (name, definition, formula, unit, recalc cadence, source system).
- Enables detection of inconsistent KPI usage & drift.

### 4.4 Style Profile
```json
{
  "id": "style_org_default",
  "tone": "professional",
  "formality": "high",
  "sentenceLengthTarget": {"avg": 18, "max": 32},
  "disallowedPhrases": ["synergy"],
  "preferredTerms": {"customer":"client"},
  "fontFamilies": {"body":"Inter","heading":"Inter"},
  "colorPalette": {"primary":"#1A3D6E"},
  "spacing": {"paragraphSpacing": "1.1em"}
}
```

### 4.5 Glossary
- Term canonicalization with alias sets; supports enforcement & retrieval expansion.

## 5. Retrieval & Salience
### 5.1 Hybrid Query Pipeline
1. Parse intent (entity extraction: KPIs, clause types, section goal).
2. Build lexical query (BM25) + vectors (semantic, style-specific).
3. Merge results; compute salience score S.

### 5.2 Salience Score Formula
```
S = w_recency*R + w_frequency*F + w_similarity*Sim + w_quality*Q + w_priority*P - w_conflict*C
```
- R: Recency decay (e^{-Δt/τ})
- F: Usage frequency normalized
- Sim: Cosine similarity (semantic)
- Q: Node quality aggregate
- P: Explicit user/org priority weight
- C: Conflict penalty (style or compliance mismatches)

### 5.3 Selection Thresholds
| Stage | Min S | Max Candidates |
|-------|-------|----------------|
| PLAN | 0.55 | 12 |
| RENDER | 0.60 | 8 |
| REVIEW (augment) | 0.50 | 6 |

## 6. Constraint Propagation Rules
| Rule | Trigger | Action |
|------|---------|--------|
| Heading Numbering | Section insertion/move | Renumber siblings & crossRefs |
| Table Column Consistency | Similar tables (schema hash match) | Align column widths & types |
| KPI Accuracy | KPI referenced; value stale | Refresh value or mark annotation |
| Glossary Enforcement | New paragraph nodes | Replace terms with preferred variants |
| Style Drift | Average sentence length > tolerance | Suggest sentence splits patch |

## 7. User Profile Schema
```json
{
  "userId": "user_123",
  "persona": "Legal Analyst",
  "preferences": {"tone": "formal", "includeAppendix": true},
  "authorizedScopes": ["finance","compliance"],
  "restrictedContent": ["PII"],
  "kpiFocus": ["mrr","churn"],
  "brandConstraints": {"logoUsage": "primary-only"}
}
```

## 8. Safety Filters
| Filter | Method | Outcome |
|--------|--------|---------|
| Confidential Leakage | accessLevel + restrictedContent scan | Remove node / redact snippet |
| Clause Jurisdiction Mismatch | clause.jurisdiction vs user scope | Block insertion + annotation |
| KPI Staleness | lastUpdated > allowed age | Mark refresh needed |
| Disallowed Phrase | styleProfile.disallowedPhrases match | Suggest replacement |

## 9. Performance & Scaling
- Incremental Graph Build: Stream nodes as produced; maintain adjacency lists.
- Lazy Embeddings: Compute embeddings only after initial text stabilization (post-RENDER, pre-REVIEW).
- Tiered Caches:
  - L1 in-memory (recent artifacts)
  - L2 vector store (persistent)
  - L3 cold storage (archived snapshots)
- Parallel Validators: Partition nodes by type (structure vs style).
- Graph Diffing: Maintain node contentHash; patch calculations operate on modified subsets.

## 10. Persistence Model (Relational Sketch)
Tables:
- nodes(node_id PK, doc_id, type, jsonb_attributes, content_hash, embeddings_vector, quality_scores_json)
- edges(edge_id PK, from_id, to_id, type)
- artifacts(artifact_id PK, type, created_at, style_profile_ref, tags_json)
- clauses(clause_id PK, text, clause_type, jurisdiction, version, compliance_tags_json)
- kpis(kpi_id PK, name, formula, unit, target_value, last_updated, source_system)
Indexes:
- GIN on jsonb_attributes for attributes queries.
- Vector index (HNSW or IVF) on embeddings_vector.
- BTree composite (doc_id, type, content_hash) for dedupe.

## 11. API Surface (Tool Layer Proposals)
| Tool | Params | Returns | Purpose |
|------|--------|---------|---------|
| get_semantic_context | {documentId, scope?} | {graphSnapshot} | Fetch current graph subset |
| query_memory | {query, limit?, filters?} | {results[]} | Hybrid retrieval |
| register_artifact | {artifactMeta} | {artifactId} | Add new artifact to index |
| get_similar_sections | {sectionId, limit} | {sections[]} | Reuse detection |
| resolve_kpi | {kpiName} | {kpi} | Ensure KPI accuracy |
| glossary_lookup | {term} | {canonical, variants[]} | Terminology enforcement |
| style_profile_get | {profileId} | {styleProfile} | Retrieve style rules |
| annotate_node | {nodeId, annotation} | {annotationId} | Add review annotation |

## 12. Integration With Pipeline Stages
| Stage | Graph Interaction |
|-------|-------------------|
| PLAN | Retrieve high-salience candidate sections/clauses; build outline referencing node prototypes |
| RENDER | Instantiate sections/paragraphs; create nodes; partial embeddings deferred |
| REVIEW | Populate annotations; run validators using graph structure |
| COMMIT | Finalize patches; update derivedFrom & revisionOf edges |
| POSTLOG | Persist snapshot; update cross-document memory indexes |

## 13. Quality Evaluation Loop Hooks
Metrics aggregated from graph:
- Structural Balance: variance of section lengths.
- Clause Compliance Ratio.
- KPI Freshness Score.
- Terminology Consistency Rate.
- Readability Distribution (target style profile bandwidth).
These feed scoring → patch recommendations prioritized by impactScore.

## 14. Implementation Phases
| Phase | Scope | Output |
|-------|-------|--------|
| P1 Minimal | Nodes: Section, Paragraph; Edges: contains, precedes | Basic retrieval reuse |
| P2 Extended | Add Table, Clause, KPI, CrossRef | Structural validators aware |
| P3 Enriched | Add embeddings, salience scorer, glossary enforcement | Quality loop powered |
| P4 Advanced | Constraint engine, safety filters, incremental diff caching | High-fidelity adaptive edits |

## 15. Open Questions / Future Extensions
- Multi-artifact linking (doc ↔ sheet ↔ slide) via shared KPI or theme nodes.
- Temporal evolution graph (tracking node lineage over months).
- Style vector continual learning & drift monitoring.

## 16. Risks & Mitigations (Context Scope)
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Graph size growth | Memory pressure | Node attr pruning + snapshot compression |
| Embedding drift | Retrieval degradation | Periodic recalibration & benchmark set |
| Compliance clause stale | Legal risk | Version checks + scheduled audit job |
| KPI mismatch | Decision errors | Source sync + freshness annotations |
| Style overfitting | Loss of diversity | Diversity penalty in learning loop |

## 17. Versioning
- v0.1 (current): Initial schema & flow.
- v0.2: Add multi-artifact linkage & constraint engine.
- v0.3: Adaptive style learning integration.

## 18. Acceptance Criteria (Phase P1 → P2)
- Can build graph with ≥95% node coverage for generated document types (docx primary).
- Retrieval returns relevant prior sections with precision@8 ≥ 0.7 on test set.
- Validator integration leverages graph to reduce structural errors by ≥ 40% vs baseline.

---
Status: Draft complete (v0.1).
