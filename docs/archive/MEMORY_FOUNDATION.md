# Memory Foundation Plan (SuperMemory-aligned)

This document outlines a pragmatic path to evolve the current file-based memory into a SuperMemory-compatible foundation while keeping the app stable and shippable.

## Current State (as implemented)
- Storage: JSONL file at `data/memory/memory.jsonl` via `lib/memory/fileStore.ts`.
- Schema: `lib/memory/schema.ts` types for memory kinds: `research | document | edit | image | open | note | file`.
- API Routes:
  - `GET /api/memory/list?kind=&limit=` – list user memories (latest first)
  - `POST /api/memory/remember` – append a memory entry
  - `POST /api/memory/upload` – save uploaded file to `/public/memory-uploads` and remember it
  - `DELETE /api/memory/delete?id=` – remove entry (and file if applicable)
  - `GET /api/memory/last-research` – last research entry for user
  - `GET /api/memory/current-document` – heuristics for the active doc
  - `GET /api/memory/images?docId=` – images for a doc or last research
  - `GET /api/memory/search?q=&kind=` – simple full-text search (JSON substring)
- New fields (added): `containerTags?: string[]`, `metadata?: Record<string, unknown>`.

## Target Shape (inspired by SuperMemory)
- Concepts:
  - Documents (ingested items; can be URLs, files, text notes)
  - Memories (semantic chunks extracted from documents)
  - Containers (aka `containerTags`) to group by user/project/space
- Core operations:
  - Add document: POST `/v3/documents` (content/url/file, metadata, containerTags)
  - Search: POST `/v3/search` (q, filters, thresholds, includeFullDocs)
  - List: POST `/v3/documents/list` (pagination, containerTags)
  - Fetch memory/document by id

## Phased Migration Plan

### Phase 1: Interface + Backward Compatibility (Low Risk)
- Introduce a `MemoryStore` interface (`lib/memory/store.ts`):
  - `append(entry)`, `list({ userId, kind, limit, containerTags })`, `search({ userId, q, kind, containerTags })`, `delete(id, userId)`
  - Provide `fileStore` adapter using existing JSONL implementation.
- Keep existing routes but refactor to call `MemoryStore` under the hood.
- Align payloads with optional `containerTags` & `metadata`.

### Phase 2: Database + Embeddings (Postgres/pgvector)
- Schema (Postgres, pgvector):
  - `documents(id, user_id, custom_id, title, url, type, status, metadata jsonb, container_tags text[], created_at, updated_at)`
  - `memory_entries(id, document_id, user_id, content, summary, metadata jsonb, embedding vector, created_at)`
- Implement `PgMemoryStore` using `pg` or `drizzle-orm`.
- Embeddings: pluggable provider (OpenAI, local, Azure). Env-driven.
- Routes: add `/api/memory/vectors/search` mirroring SuperMemory `POST /v3/search`.

### Phase 3: Agent Tools Integration
- Provide agent tools (AI SDK-style) wrappers:
  - `searchMemories`, `addMemory`, `fetchMemory`
- Agent headers convention:
  - `x-sm-user-id` → `userId`
  - `x-sm-conversation-id` → `sessionId`
- Prompting: prepend retrieved memories when relevant.

### Phase 4: Connectors & Ingestion
- Add connectors (Drive/Notion) via background jobs to ingest docs → chunk → embed.
- Processing pipeline states: queued → extracting → chunking → embedding → indexing → done.

## Env + Config
- `MEMORY_BACKEND=file|postgres` (default: `file`)
- `DATABASE_URL=postgresql://...` (if postgres)
- `EMBEDDING_PROVIDER=openai|azure|local`
- `OPENAI_API_KEY=...` (if needed)

## Minimal API Contract (to keep)
- Input shapes:
  - Add: `{ kind, content|url|file?, containerTags?, metadata?, docId? }`
  - Search: `{ q, kind?, containerTags?, limit?, includeFullDocs? }`
- Output shapes:
  - List/Search: `{ items|results: MemoryEntry[], pagination? }`

## Edge Cases & Notes
- Corrupted JSONL lines: guard parsing; skip bad lines instead of failing the route.
- Large uploads: stream to disk, cap sizes, mime validation.
- Access control: filter by `userId` at store-level.
- Dedupe: optional content hash for documents.

## Next Steps
1. Add `lib/memory/store.ts` interface + file adapter (no behavior change).
2. Switch existing routes to use store.
3. Add `/api/memory/vectors/search` with a feature flag; return 501 until configured.
4. Add basic embeddings provider module.
5. Migrate to Postgres when ready; add DB migrations and `PgMemoryStore`.
